/**
 * Phase 2.5 — server-side authorization pipeline.
 *
 * authenticate(request) → resolve session → resolve user → authorize(permission) → handler
 *
 * `resolveAuthenticatedUser` (the first three steps) lives in ./auth.ts,
 * which this file depends on (one-directional — auth.ts does not import
 * from here, to avoid a circular import; its own `handleSession` endpoint
 * does its authorization check inline for that reason).
 *
 * Current usage: no Pages/Tools/Users/etc. CRUD endpoints exist yet
 * (those are Phase 2.9/2.10+), so `authorize()` has no additional caller
 * beyond what worker/index.ts wires up for future use. This is the
 * documented, non-fake limitation the Phase 2.5 checkpoint calls for
 * reporting rather than inventing endpoints to exercise it — the
 * function itself is fully implemented and unit-tested (see
 * tests/rbac.test.ts) against worker/auth.ts's real session-resolution
 * logic.
 */

import type { Env } from "./types";
import { jsonError, resolveAuthenticatedUser } from "./auth";
import { hasPermission, type Permission } from "../shared/rbac";
import { auditLog } from "./audit";

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
}

export type AuthorizationResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; response: Response };

/**
 * The full authenticate → authorize(permission) pipeline as one call.
 * Every protected Worker operation beyond plain authentication should call
 * this rather than re-implementing session or role checks.
 *
 * Returns 401 when there is no valid session (not authenticated) and 403
 * when there is a valid session but the user's role lacks the required
 * permission (authenticated, not authorized) — the two must never be
 * conflated. The permission comes from the caller (a fixed, code-defined
 * value); the role comes only from `resolveAuthenticatedUser`'s DB lookup —
 * neither is ever read from the request body, query string, or headers.
 */
export async function authorize(
  request: Request,
  env: Env,
  permission: Permission
): Promise<AuthorizationResult> {
  const user = await resolveAuthenticatedUser(request, env);

  if (!user) {
    return { ok: false, response: jsonError("Not authenticated", 401) };
  }

  if (!hasPermission(user.role, permission)) {
    // Authenticated-but-denied is the actionable security signal — plain
    // 401 (no session at all) is the expected default for routine
    // anonymous traffic and is deliberately not audited here to avoid
    // unbounded log volume with no security value.
    await auditLog(env, {
      actorUserId: user.id,
      actorEmail: user.email,
      action: "AUTHZ_DENIED",
      result: "denied",
      request,
      metadata: { permission },
    });
    return { ok: false, response: jsonError("Not authorized", 403) };
  }

  return { ok: true, user };
}
