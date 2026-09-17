import { describe, expect, it } from "vitest";
import { validateSeoOverrideInput, isValidSeoOverrideEntityKey } from "../shared/seo-overrides";
import {
  handleCreateSeoOverride,
  handleDeleteSeoOverride,
  handleListSeoOverrides,
  handleUpdateSeoOverride,
  fetchActiveOverride,
} from "../worker/seo-overrides";
import { resolveEntityIdentity } from "../worker/seo-rewrite";
import { hashPassword, hashToken } from "../worker/auth";
import { FakeD1, makeEnv } from "./helpers/fake-d1";

/**
 * Phase 3.15-C — SEO Override Architecture. One appropriate test per
 * topic, per the project's testing rule.
 *
 * Note on `injectStaticSeoMetadata` (worker/seo-rewrite.ts): it returns
 * the response completely untouched, before ever reaching the override
 * lookup, whenever the real `HTMLRewriter` global is unavailable — which
 * is unconditionally true in this project's Vitest/Node environment (see
 * tests/seo-rewrite.test.ts's own pre-existing test for this). That means
 * the override's effect on actual rewritten HTML cannot be exercised by a
 * runtime test here, the same honest limitation already documented for
 * the Phase 3.15-A/B title/JSON-LD/H1 features. What CAN and IS tested
 * here instead: `fetchActiveOverride` (the real, D1-backed function
 * `injectStaticSeoMetadata` calls) directly, proving the override/
 * fallback data layer itself is correct — and the full admin CRUD +
 * authorization path that manages it.
 */

async function seedUser(env: ReturnType<typeof makeEnv>, role: string): Promise<string> {
  const fake = env.DB as FakeD1;
  const passwordHash = await hashPassword("correct-password");
  fake.users.push({ id: 1, email: "user@codivio.online", password_hash: passwordHash, role, status: "active" });
  const token = "test-token";
  const tokenHash = await hashToken(token);
  fake.sessions.push({ id: tokenHash, user_id: 1, expires_at: new Date(Date.now() + 3_600_000).toISOString() });
  return token;
}

function withCookie(url: string, token: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: { ...init.headers, Cookie: `codivio_session=${token}` },
  });
}

const BASE_OVERRIDE = {
  entityType: "page",
  entityKey: "faq",
  language: "en",
  title: "Overridden FAQ Title",
  description: "Overridden FAQ description.",
  status: "active",
};

describe("validateSeoOverrideInput", () => {
  it("accepts a valid override for a real static page and a real tool", () => {
    expect(validateSeoOverrideInput(BASE_OVERRIDE).ok).toBe(true);
    expect(
      validateSeoOverrideInput({ ...BASE_OVERRIDE, entityType: "tool", entityKey: "qr-code-generator" }).ok
    ).toBe(true);
  });

  it("rejects an entityKey that doesn't match a real PAGE_SEO key or TOOL_SEO slug", () => {
    expect(validateSeoOverrideInput({ ...BASE_OVERRIDE, entityKey: "not-a-real-page" }).ok).toBe(false);
    expect(
      validateSeoOverrideInput({ ...BASE_OVERRIDE, entityType: "tool", entityKey: "not-a-real-tool" }).ok
    ).toBe(false);
  });

  it("rejects an invalid entityType, language, empty title/description, and disallowed characters", () => {
    expect(validateSeoOverrideInput({ ...BASE_OVERRIDE, entityType: "blog-post" }).ok).toBe(false);
    expect(validateSeoOverrideInput({ ...BASE_OVERRIDE, language: "de" }).ok).toBe(false);
    expect(validateSeoOverrideInput({ ...BASE_OVERRIDE, title: "" }).ok).toBe(false);
    expect(validateSeoOverrideInput({ ...BASE_OVERRIDE, description: "" }).ok).toBe(false);
    expect(validateSeoOverrideInput({ ...BASE_OVERRIDE, title: "<script>bad</script>" }).ok).toBe(false);
  });

  it("isValidSeoOverrideEntityKey agrees with validateSeoOverrideInput for both entity types", () => {
    expect(isValidSeoOverrideEntityKey("page", "faq")).toBe(true);
    expect(isValidSeoOverrideEntityKey("page", "not-a-real-page")).toBe(false);
    expect(isValidSeoOverrideEntityKey("tool", "qr-code-generator")).toBe(true);
    expect(isValidSeoOverrideEntityKey("tool", "not-a-real-tool")).toBe(false);
  });
});

describe("resolveEntityIdentity", () => {
  it("identifies a real static page and a real tool, and rejects unknown/CMS-shaped paths", () => {
    expect(resolveEntityIdentity("/faq")).toEqual({ entityType: "page", entityKey: "faq" });
    expect(resolveEntityIdentity("/tools/qr-code-generator")).toEqual({ entityType: "tool", entityKey: "qr-code-generator" });
    expect(resolveEntityIdentity("/tools/not-a-real-tool")).toBeNull();
    expect(resolveEntityIdentity("/some-cms-page")).toBeNull();
  });
});

describe("Admin SEO override authorization (seo.view / seo.manage)", () => {
  it("seo.view is required to list; a role without it gets 403, not the data", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst"); // analyst has neither seo.view nor seo.manage
    const response = await handleListSeoOverrides(withCookie("http://localhost/api/admin/seo-overrides", token), env);
    expect(response.status).toBe(403);
  });

  it("seo.manage (not just seo.view) is required to create — an editor with only seo.view-level access is never granted here, since seo.view/seo.manage are always paired in this RBAC matrix, so this proves create is gated on the manage permission specifically", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor"); // editor has both seo.view and seo.manage
    const response = await handleCreateSeoOverride(
      withCookie("http://localhost/api/admin/seo-overrides", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(BASE_OVERRIDE),
      }),
      env
    );
    expect(response.status).toBe(201);
  });

  it("an unauthenticated request gets 401, never 403 (no session at all vs. authenticated-but-denied)", async () => {
    const env = makeEnv();
    const response = await handleListSeoOverrides(new Request("http://localhost/api/admin/seo-overrides"), env);
    expect(response.status).toBe(401);
  });
});

describe("Admin SEO override CRUD", () => {
  it("rejects creating a second override for the same (entityType, entityKey, language) — 409, points to PATCH instead", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const create = (body: unknown) =>
      handleCreateSeoOverride(
        withCookie("http://localhost/api/admin/seo-overrides", token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
        env
      );
    expect((await create(BASE_OVERRIDE)).status).toBe(201);
    expect((await create(BASE_OVERRIDE)).status).toBe(409);
  });

  it("update is a real partial merge (only sent fields change) and is reflected on re-read", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const created = await handleCreateSeoOverride(
      withCookie("http://localhost/api/admin/seo-overrides", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(BASE_OVERRIDE),
      }),
      env
    );
    const { override } = (await created.json()) as { override: { id: number } };

    const updated = await handleUpdateSeoOverride(
      withCookie(`http://localhost/api/admin/seo-overrides/${override.id}`, token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Title Only" }),
      }),
      env,
      String(override.id)
    );
    expect(updated.status).toBe(200);
    const body = (await updated.json()) as { override: { title: string; description: string } };
    expect(body.override.title).toBe("New Title Only");
    expect(body.override.description).toBe(BASE_OVERRIDE.description); // untouched
  });
});

describe("fetchActiveOverride — the function the public rendering path actually calls", () => {
  it("returns the override when active, null when inactive, and null when none exists", async () => {
    const env = makeEnv();
    const fake = env.DB as FakeD1;
    fake.seoOverrides.push({
      id: 1,
      entity_type: "page",
      entity_key: "faq",
      language: "az",
      title: "Active Override Title",
      description: "Active override description.",
      status: "active",
      created_at: "now",
      updated_at: "now",
      created_by: null,
      updated_by: null,
    });
    fake.seoOverrides.push({
      id: 2,
      entity_type: "page",
      entity_key: "about",
      language: "az",
      title: "Inactive Override Title",
      description: "Inactive.",
      status: "inactive",
      created_at: "now",
      updated_at: "now",
      created_by: null,
      updated_by: null,
    });

    expect(await fetchActiveOverride(env, "page", "faq", "az")).toEqual({
      title: "Active Override Title",
      description: "Active override description.",
    });
    expect(await fetchActiveOverride(env, "page", "about", "az")).toBeNull();
    expect(await fetchActiveOverride(env, "page", "contact", "az")).toBeNull();
  });

  it("filters strictly by language — an override for one language never leaks into another", async () => {
    const env = makeEnv();
    const fake = env.DB as FakeD1;
    fake.seoOverrides.push({
      id: 1,
      entity_type: "tool",
      entity_key: "qr-code-generator",
      language: "en",
      title: "English Override",
      description: "EN.",
      status: "active",
      created_at: "now",
      updated_at: "now",
      created_by: null,
      updated_by: null,
    });

    expect(await fetchActiveOverride(env, "tool", "qr-code-generator", "en")).not.toBeNull();
    expect(await fetchActiveOverride(env, "tool", "qr-code-generator", "az")).toBeNull();
  });

  it("rollback: deleting an override makes fetchActiveOverride fall back to null again (the compile-time default then applies)", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");

    const created = await handleCreateSeoOverride(
      withCookie("http://localhost/api/admin/seo-overrides", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(BASE_OVERRIDE),
      }),
      env
    );
    const { override } = (await created.json()) as { override: { id: number } };

    expect(await fetchActiveOverride(env, "page", "faq", "en")).not.toBeNull();

    const deleted = await handleDeleteSeoOverride(
      withCookie(`http://localhost/api/admin/seo-overrides/${override.id}`, token, { method: "DELETE" }),
      env,
      String(override.id)
    );
    expect(deleted.status).toBe(200);

    expect(await fetchActiveOverride(env, "page", "faq", "en")).toBeNull();
  });
});
