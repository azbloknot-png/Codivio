import { describe, expect, it } from "vitest";
import { displayName, getPermissions, hasPermission, isValidRole } from "../shared/rbac";
import { hashPassword, hashToken } from "../worker/auth";
import { authorize } from "../worker/rbac";
import { FakeD1, makeEnv } from "./helpers/fake-d1";

// --- Pure permission matrix -------------------------------------------------

describe("isValidRole", () => {
  it("accepts exactly the four known roles", () => {
    for (const role of ["super_admin", "admin", "editor", "analyst"]) {
      expect(isValidRole(role)).toBe(true);
    }
  });

  it("rejects unknown, malformed, or differently-cased role strings", () => {
    for (const role of ["Super Admin", "superadmin", "Admin", "root", "", "null", "undefined"]) {
      expect(isValidRole(role)).toBe(false);
    }
  });
});

describe("hasPermission", () => {
  it("grants super_admin every permission", () => {
    for (const permission of getPermissions("super_admin")) {
      expect(hasPermission("super_admin", permission)).toBe(true);
    }
    // Spot-check against a permission not in every other role, to make sure
    // super_admin isn't just "has whatever admin has".
    expect(hasPermission("super_admin", "users.manage")).toBe(true);
    expect(hasPermission("super_admin", "settings.manage")).toBe(true);
  });

  it("grants admin content management but not user/settings management", () => {
    expect(hasPermission("admin", "pages.manage")).toBe(true);
    expect(hasPermission("admin", "tools.manage")).toBe(true);
    expect(hasPermission("admin", "users.view")).toBe(true);
    expect(hasPermission("admin", "users.manage")).toBe(false);
    expect(hasPermission("admin", "settings.manage")).toBe(false);
  });

  it("grants editor content management but not users/settings/analytics/audit visibility", () => {
    expect(hasPermission("editor", "pages.manage")).toBe(true);
    expect(hasPermission("editor", "tools.manage")).toBe(true);
    expect(hasPermission("editor", "users.view")).toBe(false);
    expect(hasPermission("editor", "settings.view")).toBe(false);
    expect(hasPermission("editor", "analytics.view")).toBe(false);
    expect(hasPermission("editor", "audit.view")).toBe(false);
  });

  it("grants analyst only dashboard/analytics, nothing content- or user-related", () => {
    expect(hasPermission("analyst", "analytics.view")).toBe(true);
    expect(hasPermission("analyst", "dashboard.view")).toBe(true);
    expect(hasPermission("analyst", "pages.view")).toBe(false);
    expect(hasPermission("analyst", "tools.view")).toBe(false);
    expect(hasPermission("analyst", "users.view")).toBe(false);
  });

  it("every role has admin.access (all four can reach the shell) but no role gets it implicitly beyond what's listed", () => {
    for (const role of ["super_admin", "admin", "editor", "analyst"]) {
      expect(hasPermission(role, "admin.access")).toBe(true);
    }
  });

  it("fails closed for an unrecognized role — zero permissions, never a default", () => {
    for (const permission of getPermissions("super_admin")) {
      expect(hasPermission("totally-made-up-role", permission)).toBe(false);
    }
    expect(getPermissions("totally-made-up-role")).toEqual([]);
  });
});

describe("displayName", () => {
  it("maps each role to its approved display name", () => {
    expect(displayName("super_admin")).toBe("Super Admin");
    expect(displayName("admin")).toBe("Admin");
    expect(displayName("editor")).toBe("Editor");
    expect(displayName("analyst")).toBe("Analyst");
  });

  it("falls back to the raw string for an unknown role rather than throwing", () => {
    expect(() => displayName("mystery-role")).not.toThrow();
    expect(displayName("mystery-role")).toBe("mystery-role");
  });
});

// --- Server-side enforcement (authorize()) ----------------------------------

async function seedUser(env: ReturnType<typeof makeEnv>, role: string) {
  const fake = env.DB as FakeD1;
  const passwordHash = await hashPassword("correct-password");
  fake.users.push({ id: 1, email: "user@codivio.online", password_hash: passwordHash, role, status: "active" });
  const token = "test-token";
  const tokenHash = await hashToken(token);
  fake.sessions.push({
    id: tokenHash,
    user_id: 1,
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  });
  return token;
}

function withCookie(token: string): Request {
  return new Request("http://localhost/api/whatever", {
    headers: { Cookie: `codivio_session=${token}` },
  });
}

describe("authorize (server-side authorization pipeline)", () => {
  it("returns 401 (not 403) when there is no session at all", async () => {
    const env = makeEnv();
    const result = await authorize(new Request("http://localhost/api/whatever"), env, "dashboard.view");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("returns 403 (not 401) when authenticated but lacking the required permission", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor"); // editor lacks users.manage
    const result = await authorize(withCookie(token), env, "users.manage");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("succeeds and returns the user when authenticated and authorized", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const result = await authorize(withCookie(token), env, "pages.manage");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.role).toBe("admin");
  });

  it("never grants a permission based on a role claimed in the request body or headers", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst"); // real DB role: analyst (no pages.view)
    const spoofedRequest = new Request("http://localhost/api/whatever", {
      method: "POST",
      headers: {
        Cookie: `codivio_session=${token}`,
        "Content-Type": "application/json",
        "X-Role": "super_admin", // ignored — not a real mechanism, just proving it's not read
      },
      body: JSON.stringify({ role: "super_admin" }),
    });
    const result = await authorize(spoofedRequest, env, "pages.view");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("treats an expired session as unauthenticated (401), not unauthorized", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "super_admin");
    const fake = env.DB as FakeD1;
    (fake.sessions[0] as Record<string, unknown>).expires_at = new Date(Date.now() - 1000).toISOString();

    const result = await authorize(withCookie(token), env, "dashboard.view");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("rejects a still-valid session the moment the underlying user is deactivated mid-session (not just at login)", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "super_admin");
    const fake = env.DB as FakeD1;

    // Session itself is untouched (not expired, not deleted) — only the
    // user row's status changes, simulating an admin deactivating another
    // admin while that admin's browser still holds a valid cookie.
    (fake.users[0] as Record<string, unknown>).status = "inactive";

    const result = await authorize(withCookie(token), env, "dashboard.view");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("error responses never leak which permission or role was involved", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const result = await authorize(withCookie(token), env, "settings.manage");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const body = await result.response.json();
      const text = JSON.stringify(body).toLowerCase();
      expect(text).not.toContain("editor");
      expect(text).not.toContain("settings.manage");
    }
  });
});

// --- Frontend is not the authorization boundary (structural) ---------------

describe("frontend cannot be the sole authorization mechanism (structural)", () => {
  it("ProtectedAdminRoute's access decision comes only from the session check, never from a client-side permission function", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../src/admin/AdminApp.tsx", import.meta.url), "utf8");
    const fn = source.slice(
      source.indexOf("export function ProtectedAdminRoute"),
      source.indexOf("export function ProtectedAdminRoute") + 400
    );
    expect(fn).not.toMatch(/hasPermission|getPermissions/);
    expect(fn).toContain("session.status");
  });
});
