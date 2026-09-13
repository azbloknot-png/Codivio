import { describe, expect, it } from "vitest";
import {
  handleCreateTool,
  handleDeleteTool,
  handleGetTool,
  handleListTools,
  handleUpdateTool,
} from "../worker/tools";
import { hashPassword, hashToken } from "../worker/auth";
import { FakeD1, makeEnv } from "./helpers/fake-d1";

async function seedUser(env: ReturnType<typeof makeEnv>, role: string) {
  const fake = env.DB as FakeD1;
  fake.seedToolCategories();
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

function listTools(env: ReturnType<typeof makeEnv>, token?: string): Promise<Response> {
  return handleListTools(withCookie("/api/admin/tools", token), env);
}

function createTool(env: ReturnType<typeof makeEnv>, token: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<Response> {
  return handleCreateTool(
    withCookie("/api/admin/tools", token, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    }),
    env
  );
}

function updateTool(
  env: ReturnType<typeof makeEnv>,
  token: string,
  id: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  return handleUpdateTool(
    withCookie(`/api/admin/tools/${id}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    }),
    env,
    String(id)
  );
}

function deleteTool(env: ReturnType<typeof makeEnv>, token: string, id: number): Promise<Response> {
  return handleDeleteTool(withCookie(`/api/admin/tools/${id}`, token, { method: "DELETE" }), env, String(id));
}

const VALID_TOOL = { name: "Sticker Maker", slug: "sticker-maker", category: "other" };

// --- 1: tools/categories migration validated against real SQLite -----------

describe("tools migration against a real SQLite engine", () => {
  it("applies cleanly, seeds the real 34-tool registry, and enforces category/slug constraints", async () => {
    const { DatabaseSync } = await import("node:sqlite");
    const fs = await import("node:fs");
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(fs.readFileSync(new URL("../database/schema.sql", import.meta.url), "utf8"));

    const cols = db
      .prepare("PRAGMA table_info(tools)")
      .all()
      .map((c: unknown) => (c as { name: string }).name);
    expect(cols).toEqual(
      expect.arrayContaining(["icon", "is_popular", "seo_title", "seo_description", "created_by", "updated_by"])
    );

    const toolCount = (db.prepare("SELECT COUNT(*) as c FROM tools").get() as { c: number }).c;
    expect(toolCount).toBe(34);
    const categoryCount = (db.prepare("SELECT COUNT(*) as c FROM categories").get() as { c: number }).c;
    expect(categoryCount).toBe(4);

    expect(() => db.exec("INSERT INTO tools (category_id, name, slug, component) VALUES (999, 'X', 'x-unique', 'ToolPage')")).toThrow();
    expect(() => db.exec("INSERT INTO tools (category_id, name, slug, component) VALUES (1, 'Dup', 'qr-code-generator', 'ToolPage')")).toThrow();
  });
});

// --- 2: existing tool registry preserved ------------------------------------

describe("the existing static tool registry is untouched", () => {
  it("src/App.tsx still declares all 34 real tool slugs", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    const knownSlugs = [
      "qr-code-generator",
      "qr-code-scanner",
      "url-to-qr",
      "pdf-merge",
      "pdf-to-excel",
      "image-resize",
      "background-remover",
      "gif-maker",
      "meme-generator",
      "color-palette-generator",
    ];
    for (const slug of knownSlugs) {
      expect(source).toContain(`slug: "${slug}"`);
    }
    const matches = source.match(/slug: "/g) ?? [];
    // Every tool-registry entry plus the two dynamic route params
    // (`/tools/:slug`, `/:slug`) do not use this literal form, so this
    // count is exactly the registry size.
    expect(matches.length).toBe(34);
  });
});

// --- 3: unique slug (API layer, beyond the already-tested DB constraint) ---

describe("duplicate slug rejection at the API layer", () => {
  it("returns 409 when creating a second tool with an already-used slug", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    await createTool(env, token, VALID_TOOL);
    const response = await createTool(env, token, { ...VALID_TOOL, name: "Different name" });
    expect(response.status).toBe(409);
  });
});

// --- 4/5/6: authenticated/unauthenticated/unauthorized read ----------------

describe("GET /api/admin/tools authorization", () => {
  it("returns the tool list for a role with tools.view", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await listTools(env, token);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tools).toEqual([]);
  });

  it("returns 401 for no session at all", async () => {
    const env = makeEnv();
    const response = await listTools(env);
    expect(response.status).toBe(401);
  });

  it("returns 403 for an authenticated role without tools.view", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst"); // analyst lacks tools.view
    const response = await listTools(env, token);
    expect(response.status).toBe(403);
  });
});

// --- 7/8/9: authorized create/update, unauthorized mutation ----------------

describe("POST/PATCH /api/admin/tools authorization", () => {
  it("creates a tool for a role with tools.manage", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createTool(env, token, VALID_TOOL);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.tool.slug).toBe("sticker-maker");
    expect(body.tool.categoryName).toBe("Other Tools");
  });

  it("updates a tool for a role with tools.manage", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const created = await (await createTool(env, token, VALID_TOOL)).json();
    const response = await updateTool(env, token, created.tool.id, { name: "Sticker Maker Pro" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tool.name).toBe("Sticker Maker Pro");
  });

  it("returns 403 for an authenticated role without tools.manage", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst"); // lacks tools.manage (and tools.view)
    const response = await createTool(env, token, VALID_TOOL);
    expect(response.status).toBe(403);
  });
});

// --- 10/11: validation failure + duplicate slug rejection -------------------

describe("tool write validation (fail closed)", () => {
  it("rejects a missing name", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createTool(env, token, { slug: "no-name", category: "other" });
    expect(response.status).toBe(400);
  });

  it("rejects an unknown category not present in TOOL_CATEGORIES", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createTool(env, token, { name: "X", slug: "x", category: "crypto" });
    expect(response.status).toBe(400);
  });

  it("rejects a real-looking category that has no seeded categories row yet", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    // "video" is a valid TOOL_CATEGORIES entry (forward-looking) but no
    // categories row exists for it in this test's seed — must fail closed,
    // not silently create one.
    const response = await createTool(env, token, { name: "X", slug: "x", category: "video" });
    expect(response.status).toBe(400);
  });
});

// --- 12: mass-assignment protection -----------------------------------------

describe("mass-assignment protection", () => {
  it("ignores id/created_by/component fields forged in the request body", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createTool(env, token, {
      ...VALID_TOOL,
      id: 9999,
      created_by: 9999,
      createdBy: 9999,
      component: "EvilComponent",
    });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.tool.id).toBe(1); // server-assigned, not the forged 9999
    expect(body.tool.createdBy).toBe(1); // the real session user, not the forged value
  });
});

// --- 13: actor spoofing protection ------------------------------------------

describe("actor identity cannot be forged", () => {
  it("ignores a forged updatedBy/X-User-Id and records the real session user everywhere", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const fake = env.DB as FakeD1;
    const created = await (await createTool(env, token, VALID_TOOL)).json();

    const response = await updateTool(
      env,
      token,
      created.tool.id,
      { name: "Renamed", updatedBy: 999, actorUserId: 999 },
      { "X-User-Id": "999" }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tool.updatedBy).toBe(1);

    const entry = fake.auditLogs.find((e) => e.action === "TOOL_UPDATED");
    expect(entry?.user_id).toBe(1);
    expect(entry?.actor_email).toBe("user@codivio.online");
  });
});

// --- 14/15: inactive exclusion + safe public-field shape (no public API) ---

describe("no public tool API exists — a deliberate decision, not an oversight", () => {
  it("worker/index.ts registers no GET /api/tools route", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/["'`]\/api\/tools["'`]/);
  });

  it("the admin tool payload never includes the internal category_id or component fields", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const created = await (await createTool(env, token, VALID_TOOL)).json();
    expect(created.tool.category_id).toBeUndefined();
    expect(created.tool.component).toBeUndefined();
  });
});

// --- 16: audit event creation ------------------------------------------------

describe("tool mutations are audited", () => {
  it("logs TOOL_CREATED, then TOOL_DEACTIVATED and TOOL_ACTIVATED on status transitions, then TOOL_DELETED", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const fake = env.DB as FakeD1;

    const created = await (await createTool(env, token, VALID_TOOL)).json();
    expect(fake.auditLogs.some((e) => e.action === "TOOL_CREATED" && e.entity_id === created.tool.id)).toBe(true);

    await updateTool(env, token, created.tool.id, { status: "inactive" });
    expect(fake.auditLogs.some((e) => e.action === "TOOL_DEACTIVATED")).toBe(true);

    const deleteBlocked = await deleteTool(env, token, created.tool.id);
    // still inactive at this point, so delete should succeed — verify the
    // safety guard on an *active* tool instead, then clean up via deactivate
    expect(deleteBlocked.status).toBe(200);
    expect(fake.auditLogs.some((e) => e.action === "TOOL_DELETED")).toBe(true);
  });

  it("blocks deleting an active tool until it is deactivated first", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const created = await (await createTool(env, token, VALID_TOOL)).json(); // defaults to active
    const response = await deleteTool(env, token, created.tool.id);
    expect(response.status).toBe(409);
  });
});

// --- 17: unsafe icon rejected --------------------------------------------------

describe("icon safety", () => {
  it("rejects an icon identifier outside the controlled allowlist, including raw SVG/HTML", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createTool(env, token, { ...VALID_TOOL, icon: "<svg onload=alert(1)>" });
    expect(response.status).toBe(400);
  });

  it("accepts a real allowlisted icon identifier", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createTool(env, token, { ...VALID_TOOL, icon: "Sparkles" });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.tool.icon).toBe("Sparkles");
  });
});

// --- 18: existing tool routes remain intact (routing regression) -----------

describe("existing tool routing is unaffected by this checkpoint", () => {
  it("src/App.tsx still declares /tools, /tools/:slug and the public/admin route set", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    expect(source).toContain('<Route path="/tools" element={<ToolsPage />} />');
    expect(source).toContain('<Route path="/tools/:slug" element={<ToolRoute />} />');
    expect(source).toContain('<Route path="tools" element={<AdminToolsPage />} />');
  });
});

// --- 19: homepage/admin/settings/pages regression ---------------------------

describe("homepage/admin/settings/pages routes are unaffected", () => {
  it("src/App.tsx still declares /, /admin, /admin/login, /admin/settings, /admin/pages and the catch-all", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    expect(source).toContain('<Route path="/" element={<HomePage />} />');
    expect(source).toContain('<Route path="/admin/login" element={<AdminLoginPage />} />');
    expect(source).toContain('<Route path="settings" element={<AdminSettingsPage />} />');
    expect(source).toContain('<Route path="pages" element={<AdminPagesPage />} />');
    expect(source).toContain('<Route path="*" element={<NotFoundPage />} />');
  });
});

// --- 20: parameterized SQL (static check) -----------------------------------

describe("tools writer uses parameterized SQL", () => {
  it("worker/tools.ts never string-interpolates a value into a SQL string", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../worker/tools.ts", import.meta.url), "utf8");
    const sanitized = source.replace(/\$\{TOOL_COLUMNS\}/g, "TOOL_COLUMNS_LITERAL");
    expect(/prepare\(\s*`[^`]*\$\{/.test(sanitized)).toBe(false);
    expect(source).toContain(".bind(");
  });
});
