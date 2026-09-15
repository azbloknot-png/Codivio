import type { UsageQuota } from "./types";

/**
 * Codivio usage/quota foundation (Phase 3.14).
 *
 * This module defines the SHAPE of a future usage/quota system. It does
 * not record, count, or fabricate any usage — there is no real tool
 * operation anywhere in this codebase to measure yet (every tool page
 * renders the Phase 2 "coming soon" placeholder; see
 * shared/seo/content.ts's TOOL_STATUS_NOTE). A future phase, once a tool
 * genuinely processes a file, would call something that records a real
 * `UsageEvent` (see types.ts) — nothing here does that, and nothing here
 * should be mistaken for doing that.
 */

/** Pure comparison — the caller supplies a real, already-known usage
 * count and limit; this never looks up or invents either. `limit: null`
 * means unlimited (never a fabricated number when the real limit is
 * undecided). */
export function evaluateQuota(count: number, quota: UsageQuota): "ALLOWED" | "LIMIT_REACHED" {
  if (quota.limit === null) return "ALLOWED";
  return count >= quota.limit ? "LIMIT_REACHED" : "ALLOWED";
}
