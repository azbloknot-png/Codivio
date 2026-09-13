/**
 * Phase 2.6 — Audit Logging foundation.
 *
 * A reusable, server-only audit writer on top of the existing `audit_logs`
 * table (extended by migration 0003). Only the current, real call sites
 * (auth + RBAC) are wired up here — the action vocabulary is intentionally
 * a closed string-literal union today, extended later (Pages/Tools/Users/
 * Settings actions) as those modules are actually built, not pre-declared
 * as unused constants now.
 *
 * Failure policy (see DECISIONS.md): audit writes are best-effort/fail-open
 * for every event type here. A failed write is reported via
 * `console.error` (visible in Cloudflare's Worker logs / `wrangler tail`)
 * but never blocks, delays, or changes the outcome of the operation being
 * audited. Reasoning: audit logging is a *detective* control, not a
 * *preventive* one — its own unavailability (e.g. a transient D1 hiccup,
 * or, right now, no real D1 being provisioned at all yet) must not become
 * an authentication/authorization outage. This is a deliberate, uniform
 * policy, not a silently-swallowed error.
 */

import type { Env } from "./types";

export const AUDIT_ACTIONS = [
  "AUTH_LOGIN_SUCCESS",
  "AUTH_LOGIN_FAILURE",
  "AUTH_LOGOUT",
  "AUTH_BOOTSTRAP",
  "AUTH_SESSION_EXPIRED",
  "AUTHZ_DENIED",
  "SETTING_UPDATED",
  "PAGE_CREATED",
  "PAGE_UPDATED",
  "PAGE_PUBLISHED",
  "PAGE_ARCHIVED",
  "PAGE_DELETED",
  "TOOL_CREATED",
  "TOOL_UPDATED",
  "TOOL_ACTIVATED",
  "TOOL_DEACTIVATED",
  "TOOL_DELETED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_RESULTS = ["success", "failure", "denied", "error"] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];

export interface AuditEvent {
  /** The authenticated user who performed the action, or null for events
   * with no authenticated actor (e.g. a failed login, or a login attempt
   * against an email with no account). Never invented — always either a
   * real, server-resolved user id or null. */
  actorUserId: number | null;
  /** A safe email snapshot — used mainly for failed-login events where
   * there is no actorUserId to reference. Never a password or token. */
  actorEmail: string | null;
  action: AuditAction;
  resourceType?: string | null;
  resourceId?: number | null;
  result: AuditResult;
  /** Passed through only to derive IP/user-agent safely — never stored or
   * forwarded whole, and never read for anything beyond those two headers. */
  request?: Request;
  /** Arbitrary safe details. Callers must not put secrets, password
   * hashes, session tokens, or raw Cookie headers in here. */
  metadata?: Record<string, unknown>;
}

/** Only trusts Cloudflare's own edge-set header, which the platform
 * overwrites/strips on any client-supplied copy before the Worker sees it
 * — genuinely non-spoofable when actually deployed behind Cloudflare. This
 * cannot be verified live in this environment (no real Cloudflare deploy,
 * no local workerd boot — see PROJECT_STATE.md); the mechanism itself is a
 * documented platform guarantee, not a guess. Never falls back to a
 * client-controlled header like X-Forwarded-For. */
function getTrustworthyClientIp(request: Request): string | null {
  return request.headers.get("CF-Connecting-IP");
}

export async function auditLog(env: Env, event: AuditEvent): Promise<void> {
  const ip = event.request ? getTrustworthyClientIp(event.request) : null;
  const userAgent = event.request?.headers.get("User-Agent") ?? null;

  try {
    await env.DB.prepare(
      `INSERT INTO audit_logs
        (user_id, actor_email, action, entity_type, entity_id, result, ip_address, user_agent, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        event.actorUserId,
        event.actorEmail,
        event.action,
        event.resourceType ?? null,
        event.resourceId ?? null,
        event.result,
        ip,
        userAgent,
        JSON.stringify(event.metadata ?? {})
      )
      .run();
  } catch (error) {
    console.error("[audit] write failed", event.action, error);
  }
}
