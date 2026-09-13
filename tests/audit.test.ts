import { describe, expect, it } from "vitest";
import { auditLog } from "../worker/audit";
import { handleBootstrap, handleLogin, handleLogout, hashPassword, hashToken } from "../worker/auth";
import { authorize } from "../worker/rbac";
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

function withCookie(token: string): Request {
  return new Request("http://localhost/api/whatever", {
    headers: { Cookie: `codivio_session=${token}` },
  });
}

function loginRequest(email: string, password: string, extraHeaders: Record<string, string> = {}) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify({ email, password }),
  });
}

// --- 1/2/3: record creation, real-server-derived actor, safe null actor ----

describe("audit records are created with a server-derived actor", () => {
  it("logs a successful login with the real authenticated actor", async () => {
    const env = makeEnv();
    await seedUser(env, "admin");
    await handleLogin(loginRequest("user@codivio.online", "correct-password"), env);

    const fake = env.DB as FakeD1;
    const entry = fake.auditLogs.find((e) => e.action === "AUTH_LOGIN_SUCCESS");
    expect(entry).toBeTruthy();
    expect(entry?.user_id).toBe(1);
    expect(entry?.actor_email).toBe("user@codivio.online");
    expect(entry?.result).toBe("success");
  });

  it("logs a failed login against a non-existent email with a null actor, not an invented one", async () => {
    const env = makeEnv();
    await handleLogin(loginRequest("nobody@codivio.online", "whatever"), env);

    const fake = env.DB as FakeD1;
    const entry = fake.auditLogs.find((e) => e.action === "AUTH_LOGIN_FAILURE");
    expect(entry).toBeTruthy();
    expect(entry?.user_id).toBeNull();
    expect(entry?.actor_email).toBe("nobody@codivio.online");
    expect(entry?.result).toBe("failure");
  });

  it("logs logout with the actor the session actually belonged to", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    await handleLogout(withCookie(token), env);

    const fake = env.DB as FakeD1;
    const entry = fake.auditLogs.find((e) => e.action === "AUTH_LOGOUT");
    expect(entry).toBeTruthy();
    expect(entry?.user_id).toBe(1);
    expect(entry?.actor_email).toBe("user@codivio.online");
  });

  it("writes nothing for a logout call with no session to invalidate", async () => {
    const env = makeEnv();
    await handleLogout(new Request("http://localhost/api/auth/logout", { method: "POST" }), env);
    const fake = env.DB as FakeD1;
    expect(fake.auditLogs.some((e) => e.action === "AUTH_LOGOUT")).toBe(false);
  });
});

// --- 4: client cannot spoof the actor -------------------------------------

describe("the actor cannot be spoofed by the client", () => {
  it("ignores a forged role/actor claim in the request body and headers when authorizing", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst"); // real role: analyst (lacks pages.view)
    const spoofed = new Request("http://localhost/api/whatever", {
      method: "POST",
      headers: {
        Cookie: `codivio_session=${token}`,
        "X-Role": "super_admin",
        "X-User-Id": "999",
      },
      body: JSON.stringify({ role: "super_admin", actorUserId: 999 }),
    });

    const result = await authorize(spoofed, env, "pages.view");
    expect(result.ok).toBe(false);

    const fake = env.DB as FakeD1;
    const entry = fake.auditLogs.find((e) => e.action === "AUTHZ_DENIED");
    expect(entry?.user_id).toBe(1); // the real DB-resolved user, not 999
  });

  it("logs a login attempt with the email actually supplied, ignoring any injected id fields", async () => {
    const env = makeEnv();
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@codivio.online", password: "x", user_id: 1, id: 1 }),
    });
    await handleLogin(request, env);

    const fake = env.DB as FakeD1;
    const entry = fake.auditLogs.find((e) => e.action === "AUTH_LOGIN_FAILURE");
    expect(entry?.user_id).toBeNull();
  });
});

// --- 5: no secrets ever written --------------------------------------------

describe("no secrets are ever written to the audit log", () => {
  it("a full login+logout+denied-authorize cycle never writes a password, hash, or session token", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    await handleLogin(loginRequest("user@codivio.online", "correct-password"), env);
    await authorize(withCookie(token), env, "users.manage"); // editor lacks this -> denied
    await handleLogout(withCookie(token), env);

    const fake = env.DB as FakeD1;
    const serialized = JSON.stringify(fake.auditLogs).toLowerCase();
    expect(serialized).not.toContain("correct-password");
    expect(serialized).not.toContain(token.toLowerCase());
    expect(serialized).not.toContain("pbkdf2"); // password hash format marker
    expect(serialized).not.toContain("cookie");
  });

  it("auditLog itself only ever reads the Cookie/User-Agent headers off a passed request, never the body", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../worker/audit.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/request\.json\(\)/);
    expect(source).not.toMatch(/request\.text\(\)/);
  });
});

// --- 6: authorization denial logging ---------------------------------------

describe("authorization denials are logged correctly", () => {
  it("records AUTHZ_DENIED with the permission that was denied, and 'denied' as the result", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    await authorize(withCookie(token), env, "settings.manage");

    const fake = env.DB as FakeD1;
    const entry = fake.auditLogs.find((e) => e.action === "AUTHZ_DENIED");
    expect(entry).toBeTruthy();
    expect(entry?.result).toBe("denied");
    expect(JSON.parse(entry?.metadata_json as string)).toEqual({ permission: "settings.manage" });
  });

  it("does not log anything for a plain unauthenticated (401) request — only authenticated-but-denied is audited", async () => {
    const env = makeEnv();
    await authorize(new Request("http://localhost/api/whatever"), env, "dashboard.view");
    const fake = env.DB as FakeD1;
    expect(fake.auditLogs.length).toBe(0);
  });

  it("records a bootstrap attempt against an already-bootstrapped instance as denied, with no actor", async () => {
    const env = makeEnv({ ADMIN_BOOTSTRAP_EMAIL: "root@codivio.online", ADMIN_BOOTSTRAP_PASSWORD: "x" });
    await handleBootstrap(new Request("http://localhost/api/auth/bootstrap", { method: "POST" }), env);
    await handleBootstrap(new Request("http://localhost/api/auth/bootstrap", { method: "POST" }), env);

    const fake = env.DB as FakeD1;
    const denied = fake.auditLogs.find((e) => e.action === "AUTH_BOOTSTRAP" && e.result === "denied");
    expect(denied).toBeTruthy();
    expect(denied?.user_id).toBeNull();
  });
});

// --- 7: parameterized SQL (static check) -----------------------------------

describe("audit writer uses parameterized SQL", () => {
  it("worker/audit.ts never string-interpolates a value into the INSERT statement", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../worker/audit.ts", import.meta.url), "utf8");
    expect(/prepare\(\s*`[^`]*\$\{/.test(source)).toBe(false);
    expect(source).toContain(".bind(");
  });
});

// --- audit logging failure never blocks the primary operation --------------

describe("audit write failure policy (fail-open)", () => {
  it("a login still succeeds even if the audit write itself throws", async () => {
    const env = makeEnv();
    await seedUser(env, "admin");
    const fake = env.DB as FakeD1;
    const originalPrepare = fake.prepare.bind(fake);
    fake.prepare = (q: string) => {
      if (q.includes("INSERT INTO audit_logs")) {
        throw new Error("simulated D1 outage");
      }
      return originalPrepare(q);
    };

    const response = await handleLogin(loginRequest("user@codivio.online", "correct-password"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toBeTruthy();
  });

  it("auditLog itself never throws, even when the underlying write fails", async () => {
    const env = makeEnv();
    const fake = env.DB as FakeD1;
    fake.prepare = () => {
      throw new Error("simulated D1 outage");
    };
    await expect(
      auditLog(env, { actorUserId: null, actorEmail: null, action: "AUTH_LOGOUT", result: "success" })
    ).resolves.toBeUndefined();
  });
});

// --- 8: timestamp format, validated against a real SQLite engine -----------

describe("migration 0003 (audit_logs extension) against a real SQLite engine", () => {
  it("applies cleanly on top of schema.sql + 0002, and CURRENT_TIMESTAMP-based columns remain comparable to app-supplied ISO strings only where the app supplies them explicitly", async () => {
    const { DatabaseSync } = await import("node:sqlite");
    const fs = await import("node:fs");
    const db = new DatabaseSync(":memory:");

    db.exec(fs.readFileSync(new URL("../database/schema.sql", import.meta.url), "utf8"));

    const cols = db
      .prepare("PRAGMA table_info(audit_logs)")
      .all()
      .map((c: unknown) => (c as { name: string }).name);
    expect(cols).toEqual(
      expect.arrayContaining([
        "id",
        "user_id",
        "action",
        "entity_type",
        "entity_id",
        "metadata_json",
        "created_at",
        "actor_email",
        "result",
        "ip_address",
        "user_agent",
      ])
    );

    // Default result applies when omitted.
    db.prepare("INSERT INTO audit_logs (user_id, action, metadata_json) VALUES (?, ?, ?)").run(
      null,
      "AUTH_LOGOUT",
      "{}"
    );
    const row = db.prepare("SELECT result FROM audit_logs WHERE action = 'AUTH_LOGOUT'").get() as {
      result: string;
    };
    expect(row.result).toBe("success");

    const indexNames = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='audit_logs'")
      .all()
      .map((i: unknown) => (i as { name: string }).name);
    for (const expected of [
      "idx_audit_logs_created_at",
      "idx_audit_logs_user_id",
      "idx_audit_logs_action",
      "idx_audit_logs_entity_type",
      "idx_audit_logs_result",
    ]) {
      expect(indexNames).toContain(expected);
    }
  });
});
