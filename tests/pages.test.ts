import { describe, expect, it } from "vitest";
import {
  handleCreatePage,
  handleDeletePage,
  handleGetPage,
  handleListPages,
  handlePublicPage,
  handleUpdatePage,
} from "../worker/pages";
import { hashPassword, hashToken } from "../worker/auth";
import { FakeD1, makeEnv } from "./helpers/fake-d1";

async function seedUser(env: ReturnType<typeof makeEnv>, role: string) {
  const fake = env.DB as FakeD1;
  const passwordHash = await hashPassword("correct-password");
  fake.users.push({
    id: 1,
    email: "user@codivio.online",
    password_hash: passwordHash,
    role,
    status: "active",
  });
  const token = "test-token";
  const tokenHash = await hashToken(token);
  fake.sessions.push({
    id: tokenHash,
    user_id: 1,
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  });
  return token;
}

function withCookie(path: string, token?: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...(token ? { Cookie: `codivio_session=${token}` } : {}) },
  });
}

function listPages(env: ReturnType<typeof makeEnv>, token?: string): Promise<Response> {
  return handleListPages(withCookie("/api/admin/pages", token), env);
}

function createPage(env: ReturnType<typeof makeEnv>, token: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<Response> {
  return handleCreatePage(
    withCookie("/api/admin/pages", token, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    }),
    env
  );
}

function updatePage(
  env: ReturnType<typeof makeEnv>,
  token: string,
  id: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  return handleUpdatePage(
    withCookie(`/api/admin/pages/${id}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    }),
    env,
    String(id)
  );
}

function deletePage(env: ReturnType<typeof makeEnv>, token: string, id: number): Promise<Response> {
  return handleDeletePage(withCookie(`/api/admin/pages/${id}`, token, { method: "DELETE" }), env, String(id));
}

function publicPage(env: ReturnType<typeof makeEnv>, slug: string): Promise<Response> {
  return handlePublicPage(new Request(`http://localhost/api/pages/${slug}`), env, slug);
}

const VALID_PAGE = { title: "About Codivio", slug: "about-codivio", content: "Some real content." };

// --- 1: migration validated against real SQLite ----------------------------

describe("pages migration against a real SQLite engine", () => {
  it("applies cleanly, adds the expected columns, and enforces the created_by/updated_by foreign keys", async () => {
    const { DatabaseSync } = await import("node:sqlite");
    const fs = await import("node:fs");
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(fs.readFileSync(new URL("../database/schema.sql", import.meta.url), "utf8"));

    const cols = db
      .prepare("PRAGMA table_info(pages)")
      .all()
      .map((c: unknown) => (c as { name: string }).name);
    expect(cols).toEqual(
      expect.arrayContaining([
        "id",
        "title",
        "slug",
        "content",
        "status",
        "description",
        "meta_title",
        "meta_description",
        "canonical_url",
        "is_indexable",
        "created_by",
        "updated_by",
      ])
    );

    expect(() => db.exec("INSERT INTO pages (title, slug, created_by) VALUES ('T', 's-1', 999)")).toThrow();
  });
});

// --- 2: unique slug constraint ----------------------------------------------

describe("pages.slug uniqueness", () => {
  it("rejects a second row with the same slug at the database level", async () => {
    const { DatabaseSync } = await import("node:sqlite");
    const fs = await import("node:fs");
    const db = new DatabaseSync(":memory:");
    db.exec(fs.readFileSync(new URL("../database/schema.sql", import.meta.url), "utf8"));
    db.exec("INSERT INTO pages (title, slug) VALUES ('One', 'dup-slug')");
    expect(() => db.exec("INSERT INTO pages (title, slug) VALUES ('Two', 'dup-slug')")).toThrow();
  });
});

// --- 3/4/5: authenticated/unauthenticated/unauthorized read ----------------

describe("GET /api/admin/pages authorization", () => {
  it("returns the page list for a role with pages.view", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await listPages(env, token);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pages).toEqual([]);
  });

  it("returns 401 for no session at all", async () => {
    const env = makeEnv();
    const response = await listPages(env);
    expect(response.status).toBe(401);
  });

  it("returns 403 for an authenticated role without pages.view", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst"); // analyst lacks pages.view
    const response = await listPages(env, token);
    expect(response.status).toBe(403);
  });
});

// --- 6/7: authorized/unauthorized write -------------------------------------

describe("POST /api/admin/pages authorization", () => {
  it("creates a page for a role with pages.manage", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createPage(env, token, VALID_PAGE);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.page.slug).toBe("about-codivio");
    expect(body.page.status).toBe("draft");
  });

  it("returns 403 for an authenticated role without pages.manage", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst"); // lacks pages.manage (and pages.view)
    const response = await createPage(env, token, VALID_PAGE);
    expect(response.status).toBe(403);
  });
});

// --- 8: validation rejection --------------------------------------------------

describe("page write validation (fail closed)", () => {
  it("rejects a missing title", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createPage(env, token, { slug: "no-title" });
    expect(response.status).toBe(400);
  });

  it("rejects a malformed slug (uppercase / path-like)", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createPage(env, token, { title: "X", slug: "Not_A-Valid/Slug" });
    expect(response.status).toBe(400);
  });

  it("rejects a reserved slug that would collide with an existing system route", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createPage(env, token, { title: "X", slug: "admin" });
    expect(response.status).toBe(400);
  });

  it("rejects an unsafe canonical URL scheme", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createPage(env, token, {
      title: "X",
      slug: "x",
      canonicalUrl: "javascript:alert(1)",
    });
    expect(response.status).toBe(400);
  });
});

// --- 9: duplicate slug rejection ---------------------------------------------

describe("duplicate slug rejection at the API layer", () => {
  it("returns 409 when creating a second page with an already-used slug", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    await createPage(env, token, VALID_PAGE);
    const response = await createPage(env, token, { ...VALID_PAGE, title: "Different title" });
    expect(response.status).toBe(409);
  });
});

// --- 10/11: publication safety -----------------------------------------------

describe("public page visibility is enforced server-side", () => {
  it("never exposes a draft page through the public endpoint", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    await createPage(env, token, VALID_PAGE); // defaults to status "draft"
    const response = await publicPage(env, "about-codivio");
    expect(response.status).toBe(404);
  });

  it("exposes a published page through the public endpoint", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    await createPage(env, token, { ...VALID_PAGE, status: "published" });
    const response = await publicPage(env, "about-codivio");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.page.title).toBe("About Codivio");
    expect(body.page.id).toBeUndefined(); // public payload never leaks internal id
  });
});

// --- 12: mass-assignment protection -------------------------------------------

describe("mass-assignment protection", () => {
  it("ignores id/created_by/created_at fields forged in the request body", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createPage(env, token, {
      ...VALID_PAGE,
      id: 9999,
      created_by: 9999,
      createdBy: 9999,
      created_at: "2000-01-01T00:00:00.000Z",
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.page.id).toBe(1); // server-assigned, not the forged 9999
    expect(body.page.createdBy).toBe(1); // the real session user, not the forged value
  });
});

// --- 13: stored XSS safety ----------------------------------------------------

describe("XSS / content safety", () => {
  it("rejects angle brackets in short metadata fields (title/description/meta fields)", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createPage(env, token, { title: "<script>alert(1)</script>", slug: "xss-title" });
    expect(response.status).toBe(400);
  });

  it("stores freeform content verbatim — safety comes from rendering, not input filtering", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const payload = "<script>alert(1)</script>";
    const response = await createPage(env, token, { title: "Safe title", slug: "xss-content", content: payload });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.page.content).toBe(payload); // not stripped — never parsed as HTML on render
  });

  it("the public page renderer never uses dangerouslySetInnerHTML as a JSX prop", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    // Checks for real *usage* (the JSX prop assignment), not just the bare
    // word — the file legitimately documents in a comment why this API is
    // never used, which a plain substring check would misfire on.
    expect(source).not.toMatch(/dangerouslySetInnerHTML\s*=/);
  });
});

// --- 14: audit logging ---------------------------------------------------------

describe("page mutations are audited", () => {
  it("logs PAGE_CREATED, then PAGE_PUBLISHED and PAGE_ARCHIVED on status transitions, then PAGE_DELETED", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const fake = env.DB as FakeD1;

    const created = await (await createPage(env, token, VALID_PAGE)).json();
    expect(fake.auditLogs.some((e) => e.action === "PAGE_CREATED" && e.entity_id === created.page.id)).toBe(true);

    await updatePage(env, token, created.page.id, { status: "published" });
    expect(fake.auditLogs.some((e) => e.action === "PAGE_PUBLISHED")).toBe(true);

    await updatePage(env, token, created.page.id, { status: "archived" });
    expect(fake.auditLogs.some((e) => e.action === "PAGE_ARCHIVED")).toBe(true);

    await updatePage(env, token, created.page.id, { status: "draft" });
    const deleteResponse = await deletePage(env, token, created.page.id);
    expect(deleteResponse.status).toBe(200);
    expect(fake.auditLogs.some((e) => e.action === "PAGE_DELETED")).toBe(true);
  });

  it("blocks deleting a published page until it is archived first", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const created = await (await createPage(env, token, { ...VALID_PAGE, status: "published" })).json();
    const response = await deletePage(env, token, created.page.id);
    expect(response.status).toBe(409);
  });
});

// --- 15: actor spoofing protection ---------------------------------------------

describe("actor identity cannot be forged", () => {
  it("ignores a forged updatedBy/X-User-Id and records the real session user everywhere", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const fake = env.DB as FakeD1;
    const created = await (await createPage(env, token, VALID_PAGE)).json();

    const response = await updatePage(
      env,
      token,
      created.page.id,
      { title: "Updated title", updatedBy: 999, actorUserId: 999 },
      { "X-User-Id": "999" }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.page.updatedBy).toBe(1);

    const entry = fake.auditLogs.find((e) => e.action === "PAGE_UPDATED");
    expect(entry?.user_id).toBe(1);
    expect(entry?.actor_email).toBe("user@codivio.online");
  });
});

// --- 16: parameterized SQL (static check) ---------------------------------------

describe("pages writer uses parameterized SQL", () => {
  it("worker/pages.ts never string-interpolates a value into a SQL string", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../worker/pages.ts", import.meta.url), "utf8");
    // ${PAGE_COLUMNS} is a fixed, code-level column list, never user input —
    // strip that one known-safe interpolation before checking that no other
    // ${...} appears inside a template literal passed to .prepare().
    const sanitized = source.replace(/\$\{PAGE_COLUMNS\}/g, "PAGE_COLUMNS_LITERAL");
    expect(/prepare\(\s*`[^`]*\$\{/.test(sanitized)).toBe(false);
    expect(source).toContain(".bind(");
  });
});
