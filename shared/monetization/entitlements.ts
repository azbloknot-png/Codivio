import type { EntitlementDefinition, EntitlementKey, PlanKey } from "./types";

/**
 * Codivio entitlement catalog (Phase 3.14).
 *
 * Honest, product-wide status per capability. Almost everything here is
 * `NOT_AVAILABLE` today, not because it's "Pro-only", but because Codivio
 * has no live tool processing yet — none of these capabilities exist for
 * ANY plan right now. `basic_tool_access` is `PLANNED` rather than
 * `NOT_AVAILABLE` because visiting a tool's page and reading about it does
 * work today; actually using a tool to do something does not.
 *
 * Never mark something AVAILABLE here unless it is genuinely, currently
 * true — this catalog is read by canUseFeature() below and by any future
 * UI that shows "coming soon" vs. real capability.
 */
export const ENTITLEMENTS: Record<EntitlementKey, EntitlementDefinition> = {
  basic_tool_access: {
    key: "basic_tool_access",
    description: "View and (once live) use a tool's core functionality.",
    status: "PLANNED",
  },
  advanced_tool_access: {
    key: "advanced_tool_access",
    description: "Use advanced tool options beyond the basic workflow.",
    status: "NOT_AVAILABLE",
  },
  batch_processing: {
    key: "batch_processing",
    description: "Process multiple files in one operation.",
    status: "NOT_AVAILABLE",
  },
  larger_file_size: {
    key: "larger_file_size",
    description: "Upload/process files above the default size limit.",
    status: "NOT_AVAILABLE",
  },
  faster_processing: {
    key: "faster_processing",
    description: "Reduced processing time for supported operations.",
    status: "NOT_AVAILABLE",
  },
  priority_processing: {
    key: "priority_processing",
    description: "Processing requests are prioritized ahead of the default queue.",
    status: "NOT_AVAILABLE",
  },
  storage: {
    key: "storage",
    description: "Persistent storage for processed files across sessions.",
    status: "NOT_AVAILABLE",
  },
  api_access: {
    key: "api_access",
    description: "Programmatic access to Codivio's tools (Phase 13, speculative).",
    status: "NOT_AVAILABLE",
  },
  analytics: {
    key: "analytics",
    description: "Usage analytics for the account's own tool activity.",
    status: "NOT_AVAILABLE",
  },
  premium_tools: {
    key: "premium_tools",
    description: "Access to tools reserved for a paid plan.",
    status: "NOT_AVAILABLE",
  },
  reduced_ads: {
    key: "reduced_ads",
    description: "Fewer or no ad placements. Not implemented until it can be technically enforced (see DECISIONS.md) — never a visual-only promise.",
    status: "NOT_AVAILABLE",
  },
  higher_usage_limits: {
    key: "higher_usage_limits",
    description: "Higher daily/monthly usage quotas than the default.",
    status: "NOT_AVAILABLE",
  },
};

/**
 * Conceptual plan → entitlement roadmap: which entitlement WOULD belong to
 * which plan once it's real. This is a planning map, not a live grant —
 * it does not mean a "pro" user has any of these today (nothing does; see
 * ENTITLEMENTS above). Kept intentionally simple: each entitlement maps to
 * the lowest plan intended to eventually include it; every higher plan
 * inherits everything below it.
 */
export const ENTITLEMENT_MINIMUM_PLAN: Record<EntitlementKey, PlanKey> = {
  basic_tool_access: "free",
  advanced_tool_access: "pro",
  batch_processing: "pro",
  larger_file_size: "pro",
  faster_processing: "pro",
  priority_processing: "business",
  storage: "pro",
  api_access: "api",
  analytics: "business",
  premium_tools: "pro",
  reduced_ads: "pro",
  higher_usage_limits: "pro",
};

const PLAN_ORDER: PlanKey[] = ["free", "pro", "business", "api"];

/** Entitlement keys conceptually included in a plan (inheriting every
 * lower plan's entitlements) — for rendering a plan-comparison table, not
 * for granting real access (see access.ts for the actual decision). */
export function getPlanEntitlementKeys(plan: PlanKey): EntitlementKey[] {
  const planIndex = PLAN_ORDER.indexOf(plan);
  return (Object.keys(ENTITLEMENT_MINIMUM_PLAN) as EntitlementKey[]).filter(
    (key) => PLAN_ORDER.indexOf(ENTITLEMENT_MINIMUM_PLAN[key]) <= planIndex,
  );
}
