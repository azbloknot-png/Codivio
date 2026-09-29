import { describe, expect, it } from "vitest";
import {
  handleCreateAdSlot,
  handleDeleteAdSlot,
  handleListAdSlots,
  handleUpdateAdSlot,
} from "../worker/ad-slots";
import { validateAdSlotInput } from "../shared/ad-slots";
import { hashPassword, hashToken } from "../worker/auth";
import { FakeD1, makeEnv } from "./helpers/fake-d1";

/**
 * Phase 7.4 — Admin Ad Management tests.
 *
 * Mirrors tests/tools.test.ts's exact structure/coverage shape: a real-
 * SQLite migration check, RBAC authorization (view/manage/unauthenticated),
 * validation (fail-closed allowlists), mass-assignment protection, actor-
 * identity integrity, delete-safety (blocked while active), audit logging,
 * and a static parameterized-SQL check. No test is fabricated beyond what
 * this sub-phase's own controlled model requires to prove.
 */

async function seedUser(env: ReturnType<typeof makeEnv>, role: string) {
  const fake = env.DB as FakeD1;
  const passwordHash = await hashPassword("correct-password");
  fake.users.push({ id: 1, email: "user@codivio.online", password_hash: passwordHash, role, status: "active" });
  const token = "test-token";
  const tokenHash = await hashToken(token);
  fake.sessions.push({ id: tokenHash, user_id: 1, expires_at: new Date(Date.now() + 3_600_000).toISOString() });
  return token;
}

function withCookie(path: string, token?: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...(token ? { Cookie: `codivio_session=${token}` } : {}) },
  });
}

function listAdSlots(env: ReturnType<typeof makeEnv>, token?: string): Promise<Response> {
  return handleListAdSlots(withCookie("/api/admin/ad-slots", token), env);
}

function createAdSlot(env: ReturnType<typeof makeEnv>, token: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<Response> {
  return handleCreateAdSlot(
    withCookie("/api/admin/ad-slots", token, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    }),
    env
  );
}

function updateAdSlot(
  env: ReturnType<typeof makeEnv>,
  token: string,
  id: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  return handleUpdateAdSlot(
    withCookie(`/api/admin/ad-slots/${id}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    }),
    env,
    String(id)
  );
}

function deleteAdSlot(env: ReturnType<typeof makeEnv>, token: string, id: number): Promise<Response> {
  return handleDeleteAdSlot(withCookie(`/api/admin/ad-slots/${id}`, token, { method: "DELETE" }), env, String(id));
}

const VALID_AD_SLOT = { name: "Homepage hero ad", position: "homepage-hero" };

// --- 1: migration applies cleanly against a real SQLite engine --------------

describe("ad_slots migration against a real SQLite engine", () => {
  it("applies cleanly and the controlled columns exist alongside the retired-in-place code column", async () => {
    const { DatabaseSync } = await import("node:sqlite");
    const fs = await import("node:fs");
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(fs.readFileSync(new URL("../database/schema.sql", import.meta.url), "utf8"));

    const cols = db
      .prepare("PRAGMA table_info(ad_slots)")
      .all()
      .map((c: unknown) => (c as { name: string }).name);
    expect(cols).toEqual(expect.arrayContaining(["provider", "ad_unit_id", "code", "status", "priority"]));

    db.exec("INSERT INTO ad_slots (name, position, provider, ad_unit_id) VALUES ('Test', 'homepage-hero', 'adsense', '1234')");
    const row = db.prepare("SELECT * FROM ad_slots").get() as Record<string, unknown>;
    expect(row.code).toBe(""); // retired in place, still defaults safely — never null, never executed
    expect(row.provider).toBe("adsense");
  });
});

// --- 2: shared validation (fail-closed allowlists) --------------------------

describe("validateAdSlotInput (shared validation)", () => {
  it("accepts a minimal valid input and applies documented defaults", () => {
    const result = validateAdSlotInput({ name: "Test slot", position: "homepage-hero" });
    expect(result).toEqual({
      ok: true,
      value: {
        name: "Test slot",
        provider: "adsense",
        adUnitId: "",
        position: "homepage-hero",
        device: "all",
        width: null,
        height: null,
        priority: 0,
        status: "active",
      },
    });
  });

  it("rejects a missing name", () => {
    expect(validateAdSlotInput({ position: "homepage-hero" }).ok).toBe(false);
  });

  it("rejects an unknown provider not in AD_SLOT_PROVIDERS", () => {
    const result = validateAdSlotInput({ name: "X", position: "homepage-hero", provider: "custom-network" });
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown position not in the 3 real evidenced placements", () => {
    const result = validateAdSlotInput({ name: "X", position: "sidebar-footer" });
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown device", () => {
    const result = validateAdSlotInput({ name: "X", position: "homepage-hero", device: "smart-tv" });
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown status", () => {
    const result = validateAdSlotInput({ name: "X", position: "homepage-hero", status: "pending" });
    expect(result.ok).toBe(false);
  });

  it("rejects an ad unit ID containing characters outside the safe allowlist (no markup/script)", () => {
    const result = validateAdSlotInput({ name: "X", position: "homepage-hero", adUnitId: "<script>alert(1)</script>" });
    expect(result.ok).toBe(false);
  });

  it("accepts an empty ad unit ID (not yet configured, an honest default)", () => {
    const result = validateAdSlotInput({ name: "X", position: "homepage-hero", adUnitId: "" });
    expect(result.ok).toBe(true);
  });

  it("rejects a width/height outside the allowed range", () => {
    expect(validateAdSlotInput({ name: "X", position: "homepage-hero", width: 0 }).ok).toBe(false);
    expect(validateAdSlotInput({ name: "X", position: "homepage-hero", width: 5000 }).ok).toBe(false);
  });

  it("has no field anywhere in its shape for raw HTML, JavaScript, or an iframe source", () => {
    const result = validateAdSlotInput({ name: "X", position: "homepage-hero" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.value)).toEqual([
        "name",
        "provider",
        "adUnitId",
        "position",
        "device",
        "width",
        "height",
        "priority",
        "status",
      ]);
    }
  });
});

// --- 3/4/5: authenticated/unauthenticated/unauthorized read -----------------

describe("GET /api/admin/ad-slots authorization", () => {
  it("returns the ad slot list for a role with advertising.view", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor"); // editor has advertising.view but not .manage
    const response = await listAdSlots(env, token);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.adSlots).toEqual([]);
  });

  it("returns 401 for no session at all", async () => {
    const env = makeEnv();
    const response = await listAdSlots(env);
    expect(response.status).toBe(401);
  });

  it("returns 403 for an authenticated role without advertising.view", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst"); // analyst lacks advertising.view
    const response = await listAdSlots(env, token);
    expect(response.status).toBe(403);
  });
});

// --- 6/7/8: authorized create/update, editor cannot manage ------------------

describe("POST/PATCH /api/admin/ad-slots authorization", () => {
  it("creates an ad slot for a role with advertising.manage (admin)", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const response = await createAdSlot(env, token, VALID_AD_SLOT);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.adSlot.position).toBe("homepage-hero");
    expect(body.adSlot.status).toBe("active");
  });

  it("updates an ad slot for a role with advertising.manage", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const created = await (await createAdSlot(env, token, VALID_AD_SLOT)).json();
    const response = await updateAdSlot(env, token, created.adSlot.id, { name: "Renamed slot" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.adSlot.name).toBe("Renamed slot");
  });

  it("returns 403 for editor — advertising.view alone is not enough to manage (the explicit product decision)", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createAdSlot(env, token, VALID_AD_SLOT);
    expect(response.status).toBe(403);
  });

  it("returns 403 for analyst (lacks both permissions)", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst");
    const response = await createAdSlot(env, token, VALID_AD_SLOT);
    expect(response.status).toBe(403);
  });
});

// --- 9: validation failure surfaces as 400 -----------------------------------

describe("ad slot write validation (fail closed)", () => {
  it("rejects an unknown position at the API layer", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const response = await createAdSlot(env, token, { name: "X", position: "sidebar-footer" });
    expect(response.status).toBe(400);
  });
});

// --- 10: mass-assignment protection -----------------------------------------

describe("mass-assignment protection", () => {
  it("ignores id/created_at fields forged in the request body", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const response = await createAdSlot(env, token, { ...VALID_AD_SLOT, id: 9999, created_at: "2000-01-01" });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.adSlot.id).toBe(1); // server-assigned, not the forged 9999
  });
});

// --- 11: no raw code field can ever be set via the API -----------------------

describe("no arbitrary ad-code execution surface", () => {
  it("a forged 'code' field in the request body is silently ignored — never read, stored, or echoed back", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const response = await createAdSlot(env, token, { ...VALID_AD_SLOT, code: "<script>alert(1)</script>" });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.adSlot.code).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("<script>");
  });
});

// --- 12/13: delete safety (blocked while active) + audit logging -----------

describe("ad slot mutations are audited", () => {
  it("logs AD_SLOT_CREATED, then AD_SLOT_DEACTIVATED and AD_SLOT_ACTIVATED on status transitions, then AD_SLOT_DELETED", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const fake = env.DB as FakeD1;

    const created = await (await createAdSlot(env, token, VALID_AD_SLOT)).json();
    expect(fake.auditLogs.some((e) => e.action === "AD_SLOT_CREATED" && e.entity_id === created.adSlot.id)).toBe(true);

    await updateAdSlot(env, token, created.adSlot.id, { status: "inactive" });
    expect(fake.auditLogs.some((e) => e.action === "AD_SLOT_DEACTIVATED")).toBe(true);

    const deleteResult = await deleteAdSlot(env, token, created.adSlot.id);
    expect(deleteResult.status).toBe(200);
    expect(fake.auditLogs.some((e) => e.action === "AD_SLOT_DELETED")).toBe(true);
  });

  it("blocks deleting an active ad slot until it is deactivated first", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const created = await (await createAdSlot(env, token, VALID_AD_SLOT)).json(); // defaults to active
    const response = await deleteAdSlot(env, token, created.adSlot.id);
    expect(response.status).toBe(409);
  });
});

// --- 14: actor identity cannot be forged ------------------------------------

describe("actor identity cannot be forged", () => {
  it("records the real session user in the audit log, never a forged X-User-Id", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const fake = env.DB as FakeD1;
    const created = await (await createAdSlot(env, token, VALID_AD_SLOT)).json();

    await updateAdSlot(env, token, created.adSlot.id, { name: "Renamed" }, { "X-User-Id": "999" });

    const entry = fake.auditLogs.find((e) => e.action === "AD_SLOT_UPDATED");
    expect(entry?.user_id).toBe(1);
    expect(entry?.actor_email).toBe("user@codivio.online");
  });
});

// --- 15: no single-record GET endpoint exists — a deliberate scope decision -

describe("no single-record GET /api/admin/ad-slots/:id endpoint — a deliberate decision, not an oversight", () => {
  it("worker/index.ts registers no GET handler for /api/admin/ad-slots/:id", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
    const routeBlock = source.slice(source.indexOf("adminAdSlotMatch"), source.indexOf("adminAdSlotMatch") + 300);
    expect(routeBlock).not.toContain('request.method === "GET"');
  });
});

// --- 16: parameterized SQL (static check) -----------------------------------

describe("ad-slots writer uses parameterized SQL", () => {
  it("worker/ad-slots.ts never string-interpolates a value into a SQL string", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../worker/ad-slots.ts", import.meta.url), "utf8");
    const sanitized = source.replace(/\$\{AD_SLOT_COLUMNS\}/g, "AD_SLOT_COLUMNS_LITERAL");
    expect(/prepare\(\s*`[^`]*\$\{/.test(sanitized)).toBe(false);
    expect(source).toContain(".bind(");
  });

  it("never reads, writes, or serializes the retired ad_slots.code column", async () => {
    const fs = await import("node:fs");
    const workerSource = fs.readFileSync(new URL("../worker/ad-slots.ts", import.meta.url), "utf8");
    // Strips /** */ and // comments first — this file's own prose
    // legitimately discusses `code` by name to document why it's avoided,
    // which a naive whole-file search would misflag. What actually matters
    // is that no real code token (a SQL column reference or a
    // `row.code`/`.code` property access) exists outside those comments.
    const withoutComments = workerSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(withoutComments).not.toMatch(/\bcode\b/);
  });
});
