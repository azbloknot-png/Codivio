import { beforeEach, describe, expect, it } from "vitest";
import {
  generateSessionToken,
  handleBootstrap,
  handleLogin,
  handleLogout,
  handleSession,
  hashPassword,
  hashToken,
  verifyPassword,
} from "../worker/auth";
import type { Env } from "../worker/types";
import { FakeD1, extractCookieValue, makeEnv } from "./helpers/fake-d1";

// --- Password hashing --------------------------------------------------

describe("password hashing", () => {
  it("verifies a correct password against its own hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });
});

// --- Session tokens ------------------------------------------------------

describe("session tokens", () => {
  it("generates unique, sufficiently long tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it("hashes the same token identically and different tokens differently", async () => {
    const token = generateSessionToken();
    const h1 = await hashToken(token);
    const h2 = await hashToken(token);
    const h3 = await hashToken(generateSessionToken());
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });
});

// --- Bootstrap -------------------------------------------------------------

describe("handleBootstrap", () => {
  it("refuses when secrets are not configured", async () => {
    const env = makeEnv();
    const res = await handleBootstrap(new Request("http://localhost/api/auth/bootstrap", { method: "POST" }), env);
    expect(res.status).toBe(500);
  });

  it("creates the first admin when secrets are configured on an empty table", async () => {
    const env = makeEnv({ ADMIN_BOOTSTRAP_EMAIL: "root@codivio.online", ADMIN_BOOTSTRAP_PASSWORD: "a-strong-password" });
    const res = await handleBootstrap(new Request("http://localhost/api/auth/bootstrap", { method: "POST" }), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("root@codivio.online");
  });

  it("refuses to bootstrap a second time once a user exists", async () => {
    const env = makeEnv({ ADMIN_BOOTSTRAP_EMAIL: "root@codivio.online", ADMIN_BOOTSTRAP_PASSWORD: "a-strong-password" });
    await handleBootstrap(new Request("http://localhost/api/auth/bootstrap", { method: "POST" }), env);
    const second = await handleBootstrap(new Request("http://localhost/api/auth/bootstrap", { method: "POST" }), env);
    expect(second.status).toBe(403);
  });
});

// --- Login / Session / Logout ---------------------------------------------

describe("login, session, and logout", () => {
  let env: Env;

  beforeEach(async () => {
    env = makeEnv({ ADMIN_BOOTSTRAP_EMAIL: "admin@codivio.online", ADMIN_BOOTSTRAP_PASSWORD: "correct-password" });
    await handleBootstrap(new Request("http://localhost/api/auth/bootstrap", { method: "POST" }), env);
  });

  function loginRequest(email: string, password: string) {
    return new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  }

  it("rejects a non-existent email with a generic error", async () => {
    const res = await handleLogin(loginRequest("nobody@codivio.online", "whatever"), env);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Invalid email or password");
  });

  it("rejects the correct email with a wrong password", async () => {
    const res = await handleLogin(loginRequest("admin@codivio.online", "wrong-password"), env);
    expect(res.status).toBe(401);
  });

  it("logs in successfully with correct credentials, sets a cookie, and never returns the password hash", async () => {
    const res = await handleLogin(loginRequest("admin@codivio.online", "correct-password"), env);
    expect(res.status).toBe(200);
    const cookie = res.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    const body = await res.json();
    expect(body.user.email).toBe("admin@codivio.online");
    expect(JSON.stringify(body)).not.toContain("password");
  });

  it("does not set the Secure cookie attribute over plain HTTP (local dev)", async () => {
    const res = await handleLogin(loginRequest("admin@codivio.online", "correct-password"), env);
    expect(res.headers.get("Set-Cookie") ?? "").not.toContain("Secure");
  });

  it("locks out further attempts after too many failures", async () => {
    for (let i = 0; i < 5; i++) {
      await handleLogin(loginRequest("admin@codivio.online", "wrong-password"), env);
    }
    const res = await handleLogin(loginRequest("admin@codivio.online", "correct-password"), env);
    expect(res.status).toBe(429);
  });

  it("rejects an inactive user even with the correct password", async () => {
    const fake = env.DB as FakeD1;
    (fake.users[0] as Record<string, unknown>).status = "inactive";
    const res = await handleLogin(loginRequest("admin@codivio.online", "correct-password"), env);
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/session returns 401 with no cookie", async () => {
    const res = await handleSession(new Request("http://localhost/api/auth/session"), env);
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/session returns the user for a valid session cookie", async () => {
    const loginRes = await handleLogin(loginRequest("admin@codivio.online", "correct-password"), env);
    const cookie = extractCookieValue(loginRes);

    const sessionRes = await handleSession(
      new Request("http://localhost/api/auth/session", { headers: { Cookie: cookie } }),
      env
    );
    expect(sessionRes.status).toBe(200);
    const body = await sessionRes.json();
    expect(body.user.email).toBe("admin@codivio.online");
  });

  it("rejects an expired session", async () => {
    const loginRes = await handleLogin(loginRequest("admin@codivio.online", "correct-password"), env);
    const cookie = extractCookieValue(loginRes);
    const fake = env.DB as FakeD1;
    fake.sessions[0].expires_at = new Date(Date.now() - 1000).toISOString();

    const sessionRes = await handleSession(
      new Request("http://localhost/api/auth/session", { headers: { Cookie: cookie } }),
      env
    );
    expect(sessionRes.status).toBe(401);
  });

  it("invalidates the session on logout so it can't be reused", async () => {
    const loginRes = await handleLogin(loginRequest("admin@codivio.online", "correct-password"), env);
    const cookie = extractCookieValue(loginRes);

    const logoutRes = await handleLogout(
      new Request("http://localhost/api/auth/logout", { method: "POST", headers: { Cookie: cookie } }),
      env
    );
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers.get("Set-Cookie") ?? "").toContain("Max-Age=0");

    const sessionRes = await handleSession(
      new Request("http://localhost/api/auth/session", { headers: { Cookie: cookie } }),
      env
    );
    expect(sessionRes.status).toBe(401);
  });
});

// --- SQL parameterization (static check) -----------------------------------

describe("SQL parameterization", () => {
  it("worker/auth.ts never string-interpolates a value into a SQL string", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../worker/auth.ts", import.meta.url), "utf8");
    const sqlTemplateLiteralsWithInterpolation = /prepare\(\s*`[^`]*\$\{/;
    expect(sqlTemplateLiteralsWithInterpolation.test(source)).toBe(false);
  });
});
