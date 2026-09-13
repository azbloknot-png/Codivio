/**
 * Phase 2.3 — Authentication + Sessions (extended in Phase 2.5 — RBAC).
 *
 * Scope: admin login/logout/session-check + a one-time bootstrap endpoint.
 * `resolveAuthenticatedUser` here is the shared "who is this request from"
 * primitive; `handleSession` uses it plus a permission check (see
 * ../shared/rbac). The general-purpose authorize() wrapper for other
 * protected operations lives in ./rbac.ts, not here, to avoid a circular
 * import (rbac.ts depends on this file, not the reverse).
 * Explicitly NOT in scope here (later checkpoints): Admin UI beyond what
 * Phase 2.4 built, audit logging, settings, real Pages/Tools/Users CRUD.
 *
 * Security notes:
 * - Passwords are hashed with PBKDF2-SHA256 (Web Crypto, no dependency) —
 *   a standard, non-invented algorithm appropriate for the Workers runtime,
 *   which has no native bcrypt/argon2.
 * - Session tokens are 256-bit random values; only their SHA-256 hash is
 *   stored in D1, so a database read alone can't be replayed as a cookie.
 * - Login timing is equalized for existing vs non-existent accounts by
 *   always running a full password-verification pass (see DUMMY_HASH).
 * - Failed-login tracking is keyed by the *email being attempted*, not by
 *   IP — see DECISIONS.md ("IP limits are abuse protection, not permanent
 *   identity"); this avoids storing any IP address at all.
 * - Every timestamp compared programmatically is generated in JS as an ISO
 *   string and stored explicitly — SQLite's own `CURRENT_TIMESTAMP` format
 *   does not string-compare correctly against `Date#toISOString()` output
 *   (verified empirically against a real SQLite engine while building
 *   this; `sessions.created_at`/`last_used_at` and `users.updated_at`/
 *   `last_login_at` are purely informational and never compared, so they
 *   safely keep the SQL-side default).
 */

import type { Env } from "./types";
import { hasPermission } from "../shared/rbac";
import { auditLog } from "./audit";

const SESSION_COOKIE_NAME = "codivio_session";
const SESSION_DURATION_HOURS = 24;
const PBKDF2_ITERATIONS = 100_000;
const MAX_FAILED_ATTEMPTS = 25; // 5x the original 5, for normal admin use
const FAILED_ATTEMPT_WINDOW_MINUTES = 15;

// A fixed, non-secret PBKDF2 hash (of an arbitrary throwaway string, not any
// real credential) used only to keep login timing consistent when the
// looked-up email doesn't exist. It is not a working password for any
// account and cannot be turned into one.
const DUMMY_HASH =
  "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY";

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  status: string;
}

interface SessionRow {
  session_id: string;
  expires_at: string;
  user_id: number;
  email: string;
  role: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Crypto primitives (pure functions — no D1/env dependency, unit-testable)
// ---------------------------------------------------------------------------

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await deriveBits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const salt = fromBase64Url(parts[2]);
  const expected = fromBase64Url(parts[3]);
  const actual = new Uint8Array(await deriveBits(password, salt, iterations));
  return constantTimeEqual(actual, expected);
}

export function generateSessionToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token)
  );
  return toHex(digest);
}

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

function cookieAttributes(request: Request, maxAgeSeconds: number): string[] {
  const isHttps = new URL(request.url).protocol === "https:";
  const attrs = ["HttpOnly", "Path=/", "SameSite=Strict", `Max-Age=${maxAgeSeconds}`];
  if (isHttps) attrs.push("Secure");
  return attrs;
}

function buildSessionCookie(token: string, request: Request): string {
  const maxAge = SESSION_DURATION_HOURS * 3600;
  return [`${SESSION_COOKIE_NAME}=${token}`, ...cookieAttributes(request, maxAge)].join("; ");
}

function buildExpiredCookie(request: Request): string {
  return [`${SESSION_COOKIE_NAME}=`, ...cookieAttributes(request, 0)].join("; ");
}

function getSessionToken(request: Request): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  if (!match) return null;
  const value = match.slice(prefix.length);
  return value.length > 0 ? value : null;
}

// ---------------------------------------------------------------------------
// D1 access (every query parameterized via .bind — never string-built)
// ---------------------------------------------------------------------------

async function getUserByEmail(env: Env, email: string): Promise<UserRow | null> {
  return env.DB.prepare(
    "SELECT id, email, password_hash, role, status FROM users WHERE email = ?"
  )
    .bind(email)
    .first<UserRow>();
}

async function countUsers(env: Env): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first<{
    count: number;
  }>();
  return row?.count ?? 0;
}

async function createUser(
  env: Env,
  email: string,
  passwordHash: string,
  role: string
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, ?, 'active')"
  )
    .bind(email, passwordHash, role)
    .run();
}

async function touchLastLogin(env: Env, userId: number): Promise<void> {
  await env.DB.prepare(
    "UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  )
    .bind(userId)
    .run();
}

async function createSession(
  env: Env,
  tokenHash: string,
  userId: number,
  expiresAtIso: string
): Promise<void> {
  await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(tokenHash, userId, expiresAtIso)
    .run();
}

async function getSessionByTokenHash(
  env: Env,
  tokenHash: string
): Promise<SessionRow | null> {
  return env.DB.prepare(
    `SELECT sessions.id as session_id, sessions.expires_at, users.id as user_id,
            users.email, users.role, users.status
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ?`
  )
    .bind(tokenHash)
    .first<SessionRow>();
}

async function deleteSession(env: Env, tokenHash: string): Promise<void> {
  await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(tokenHash).run();
}

async function touchSessionLastUsed(env: Env, tokenHash: string): Promise<void> {
  await env.DB.prepare("UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(tokenHash)
    .run();
}

async function countRecentFailedAttempts(
  env: Env,
  identifier: string,
  sinceIso: string
): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM login_attempts WHERE identifier = ? AND created_at >= ?"
  )
    .bind(identifier, sinceIso)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

async function recordFailedAttempt(env: Env, identifier: string): Promise<void> {
  // created_at is supplied explicitly (ISO) rather than relying on the
  // column's SQL-side default — see the file-level note on timestamp
  // formats; this value must string-compare correctly against the ISO
  // window bound used in countRecentFailedAttempts.
  await env.DB.prepare("INSERT INTO login_attempts (identifier, created_at) VALUES (?, ?)")
    .bind(identifier, new Date().toISOString())
    .run();
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function methodNotAllowed(allowed: string[]): Response {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json", Allow: allowed.join(", ") },
  });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Endpoint handlers
// ---------------------------------------------------------------------------

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return jsonError("Email and password are required", 400);
  }

  const windowStart = new Date(
    Date.now() - FAILED_ATTEMPT_WINDOW_MINUTES * 60_000
  ).toISOString();
  const recentFailures = await countRecentFailedAttempts(env, email, windowStart);
  if (recentFailures >= MAX_FAILED_ATTEMPTS) {
    await auditLog(env, {
      actorUserId: null,
      actorEmail: email,
      action: "AUTH_LOGIN_FAILURE",
      result: "denied",
      request,
      metadata: { reason: "rate_limited" },
    });
    return jsonError("Too many login attempts. Try again later.", 429);
  }

  const user = await getUserByEmail(env, email);

  // Always verify against a real hash (the user's, or a fixed dummy one) so
  // that response timing does not reveal whether the email exists.
  const passwordOk = await verifyPassword(
    password,
    user ? user.password_hash : DUMMY_HASH
  );

  if (!user || !passwordOk) {
    await recordFailedAttempt(env, email);
    await auditLog(env, {
      actorUserId: null,
      actorEmail: email,
      action: "AUTH_LOGIN_FAILURE",
      result: "failure",
      request,
      metadata: { reason: "invalid_credentials" },
    });
    return jsonError("Invalid email or password", 401);
  }

  if (user.status !== "active") {
    // Deliberately the same generic message as a bad password — do not
    // reveal that the account exists but is disabled.
    await auditLog(env, {
      actorUserId: null,
      actorEmail: email,
      action: "AUTH_LOGIN_FAILURE",
      result: "failure",
      request,
      metadata: { reason: "inactive_user" },
    });
    return jsonError("Invalid email or password", 401);
  }

  const token = generateSessionToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 3_600_000).toISOString();

  await createSession(env, tokenHash, user.id, expiresAt);
  await touchLastLogin(env, user.id);
  await auditLog(env, {
    actorUserId: user.id,
    actorEmail: user.email,
    action: "AUTH_LOGIN_SUCCESS",
    result: "success",
    request,
  });

  const response = Response.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
  response.headers.append("Set-Cookie", buildSessionCookie(token, request));
  return response;
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = getSessionToken(request);
  if (token) {
    const tokenHash = await hashToken(token);
    // Resolve who this session belonged to before deleting it, purely to
    // give the audit entry a meaningful actor — logging out with no
    // session at all (already logged out / invalid cookie) is not itself
    // an audit-worthy event, so no entry is written in that case.
    const session = await getSessionByTokenHash(env, tokenHash);
    await deleteSession(env, tokenHash);
    if (session) {
      await auditLog(env, {
        actorUserId: session.user_id,
        actorEmail: session.email,
        action: "AUTH_LOGOUT",
        result: "success",
        request,
      });
    }
  }

  const response = Response.json({ success: true });
  response.headers.append("Set-Cookie", buildExpiredCookie(request));
  return response;
}

/**
 * The "authenticate → resolve session → resolve user" steps, factored out
 * so any current or future protected operation can reuse them instead of
 * re-parsing the cookie/session itself. Returns null for any reason a
 * request should be treated as unauthenticated (no cookie, unknown/deleted
 * session, expired session — which is also deleted here as a side effect,
 * or an inactive user). Role comes only from this DB lookup — never from
 * anything the client sent. See worker/rbac.ts#authorize for the next step
 * (permission check) built on top of this.
 */
export async function resolveAuthenticatedUser(
  request: Request,
  env: Env
): Promise<{ id: number; email: string; role: string } | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  const tokenHash = await hashToken(token);
  const session = await getSessionByTokenHash(env, tokenHash);
  if (!session) return null;

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await deleteSession(env, tokenHash);
    await auditLog(env, {
      actorUserId: session.user_id,
      actorEmail: session.email,
      action: "AUTH_SESSION_EXPIRED",
      result: "failure",
      request,
    });
    return null;
  }

  if (session.status !== "active") return null;

  await touchSessionLastUsed(env, tokenHash);

  return { id: session.user_id, email: session.email, role: session.role };
}

export async function handleSession(request: Request, env: Env): Promise<Response> {
  const user = await resolveAuthenticatedUser(request, env);
  if (!user) return jsonError("Not authenticated", 401);

  // Every current role has admin.access, so this branch cannot yet be hit
  // by a real user — it exists so a future role without dashboard access
  // is correctly rejected without needing this endpoint to change.
  if (!hasPermission(user.role, "admin.access")) {
    await auditLog(env, {
      actorUserId: user.id,
      actorEmail: user.email,
      action: "AUTHZ_DENIED",
      result: "denied",
      request,
      metadata: { permission: "admin.access" },
    });
    return jsonError("Not authorized", 403);
  }

  return Response.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
}

/**
 * One-time bootstrap: creates the first admin account from Worker secrets,
 * and only while the users table is empty. Self-disables permanently once
 * any user exists. Never invents or hardcodes credentials.
 */
export async function handleBootstrap(request: Request, env: Env): Promise<Response> {
  const existing = await countUsers(env);
  if (existing > 0) {
    // A probe against an already-bootstrapped instance is a real security
    // signal worth recording — no actor exists yet at this point, so this
    // is exactly the "unauthenticated security event → actorUserId = null"
    // case.
    await auditLog(env, {
      actorUserId: null,
      actorEmail: null,
      action: "AUTH_BOOTSTRAP",
      result: "denied",
      request,
      metadata: { reason: "already_bootstrapped" },
    });
    return jsonError("Bootstrap already completed", 403);
  }

  const email = env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    // Not configured is an operator/config issue, not a security event —
    // deliberately not audited to avoid noise on every unconfigured deploy.
    return jsonError(
      "Bootstrap is not configured. Set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD as Worker secrets first.",
      500
    );
  }

  const passwordHash = await hashPassword(password);
  await createUser(env, email, passwordHash, "super_admin");

  const created = await getUserByEmail(env, email);
  await auditLog(env, {
    actorUserId: created?.id ?? null,
    actorEmail: email,
    action: "AUTH_BOOTSTRAP",
    result: "success",
    request,
  });

  return Response.json({ success: true, email });
}
