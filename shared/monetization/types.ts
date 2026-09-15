/**
 * Codivio monetization foundation — shared types (Phase 3.14).
 *
 * This module defines the FOUNDATION for a future Free → Pro → Business →
 * API model. It intentionally does not model billing, payment, or
 * subscription lifecycle — see access.ts's header comment for why that's a
 * deliberate boundary, not an omission.
 */

export const PLAN_KEYS = ["free", "pro", "business", "api"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/** A plan is public-facing, business-defined data (name, description,
 * pricing once decided) — this is the kind of thing that eventually
 * belongs in D1 as admin-configurable content, matching how `tools`/
 * `pages`/`settings` already work in this codebase. See
 * migrations/0007_monetization_foundation.sql. */
export interface PlanPricing {
  /** `null` means genuinely undecided — never a placeholder number. A
   * real amount is only ever set once a real business decision is made. */
  amount: number | null;
  currency: string | null;
  period: "monthly" | "yearly" | null;
}

export interface Plan {
  key: PlanKey;
  displayName: string;
  /** Whether this plan can currently be selected/upgraded to. Every plan
   * is "planned" today — none is actually purchasable, since no payment
   * integration exists (see access.ts). */
  status: "planned" | "available";
  description: string;
  pricing: PlanPricing;
  /** Lower priority = shown first / considered the "entry" plan. */
  priority: number;
  /** Whether this plan should appear in a public plan-comparison UI at
   * all. All 4 are visible today (informational), none is purchasable. */
  visible: boolean;
  /** The next plan up in the funnel, or null for the top plan. */
  upgradeTarget: PlanKey | null;
}

export const ENTITLEMENT_KEYS = [
  "basic_tool_access",
  "advanced_tool_access",
  "batch_processing",
  "larger_file_size",
  "faster_processing",
  "priority_processing",
  "storage",
  "api_access",
  "analytics",
  "premium_tools",
  "reduced_ads",
  "higher_usage_limits",
] as const;
export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

/** Distinguishes what's real from what's aspirational, per capability —
 * never collapsed into a single boolean "hasFeature" that would blur the
 * two. See DECISIONS.md's Phase 3.14 entry. */
export type EntitlementStatus = "AVAILABLE" | "PLANNED" | "NOT_AVAILABLE";

export interface EntitlementDefinition {
  key: EntitlementKey;
  description: string;
  /** Global, product-wide status — is this capability real ANYWHERE in
   * Codivio today, for any plan? Almost all of these are NOT_AVAILABLE
   * right now because no tool has real processing yet; see
   * entitlements.ts for the honest per-entitlement reasoning. */
  status: EntitlementStatus;
}

/** The outcome of a single access-decision check (access.ts#canUseFeature).
 * Deliberately a closed set, not a boolean — a caller needs to know WHY
 * access was denied to show the right UI (upgrade CTA vs. "coming soon"
 * vs. "sign in"), not just that it was denied. */
export type AccessResult =
  | "ALLOWED"
  | "LIMIT_REACHED"
  | "PLAN_REQUIRED"
  | "FEATURE_UNAVAILABLE"
  | "TOOL_UNAVAILABLE"
  | "AUTH_REQUIRED";

export interface AccessDecision {
  result: AccessResult;
  /** Present only for LIMIT_REACHED / PLAN_REQUIRED — the plan that would
   * resolve this, if any is known. */
  requiredPlan: PlanKey | null;
  reason: string;
}

/** Business/policy metadata about a single tool, separate from its SEO
 * metadata (shared/seo/tools.ts) and its D1 registry row (shared/tools.ts)
 * — this is "what plan/policy rules apply to this tool", not "how it's
 * described to a crawler" or "how it's stored". See tool-monetization.ts.
 */
export interface ToolMonetizationMetadata {
  slug: string;
  /** Whether this tool currently has any real, live functionality. Every
   * tool is false today (all 34 render the Phase 2 "coming soon"
   * placeholder) — never true until the tool actually processes files. */
  active: boolean;
  /** Whether this tool is planned to ever be plan-gated/limited. False
   * for every tool today — no tool has usage limits to enforce yet. */
  monetizable: boolean;
  adsAllowed: boolean;
  affiliateAllowed: boolean;
  policyCategory: string;
  requiresReview: boolean;
  seoIndexable: boolean;
  userGeneratedContent: boolean;
  riskLevel: "low" | "medium" | "high";
  requiredPlan: PlanKey;
  /** Whether requiredPlan is actually enforced anywhere today. Always
   * false right now — see access.ts. Sourced separately from
   * `requiredPlan` itself so a future phase can flip enforcement on
   * without having to first invent what the value should be. */
  enforced: boolean;
  usageCost: string;
}

export const USAGE_PERIODS = ["day", "month"] as const;
export type UsagePeriod = (typeof USAGE_PERIODS)[number];

/** The shape a real usage record would have once real tool usage exists.
 * Nothing in this codebase currently constructs one — see usage.ts. */
export interface UsageEvent {
  userId: string | null;
  toolSlug: string;
  action: string;
  timestamp: string;
}

export interface UsageQuota {
  key: string;
  period: UsagePeriod;
  limit: number | null;
}
