import type { PlanKey } from "./types";

/**
 * Codivio monetization-funnel analytics — event-definition foundation
 * (Phase 3.14 remediation, Finding #3).
 *
 * This is ONLY a typed event catalog. Nothing in this file sends, logs,
 * records, or fabricates an event — there is no analytics sink wired up
 * anywhere in this codebase yet (no Worker endpoint writes to the existing
 * `analytics_events` D1 table; grepped and confirmed before writing this).
 * Per this remediation's own explicit instruction, building a second
 * analytics backend just to give these events somewhere to go would be
 * out of scope — this module exists so a future phase that DOES wire up
 * `analytics_events` (or GA4/Search Console, per CLAUDE.md Sec 12) has a
 * real, reviewed event contract to send, instead of inventing one ad hoc.
 *
 * If a future caller does wire one of these up, it must represent a
 * genuine user interaction (e.g. `pricing_view` when `/pricing` actually
 * renders) — never fired speculatively, never backfilled with fake
 * historical data.
 */

export const FUNNEL_EVENT_NAMES = ["pricing_view", "upgrade_cta_view", "upgrade_cta_click", "plan_selected"] as const;
export type FunnelEventName = (typeof FUNNEL_EVENT_NAMES)[number];

/** The shape a real funnel event would have once a real sink exists.
 * `planKey` is only relevant for plan-specific events (CTA view/click,
 * plan selection) — omitted for a page-level event like `pricing_view`. */
export interface FunnelEvent {
  name: FunnelEventName;
  planKey?: PlanKey;
  timestamp: string;
}

export function isValidFunnelEventName(value: string): value is FunnelEventName {
  return (FUNNEL_EVENT_NAMES as readonly string[]).includes(value);
}
