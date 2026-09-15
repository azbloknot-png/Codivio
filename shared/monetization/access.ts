import { ENTITLEMENTS, ENTITLEMENT_MINIMUM_PLAN } from "./entitlements";
import { getToolMonetization } from "./tool-monetization";
import type { AccessDecision, EntitlementKey, PlanKey } from "./types";

/**
 * Codivio access-decision engine (Phase 3.14).
 *
 * ONE authoritative place to answer "can this happen?" instead of
 * `if (plan === "pro")` scattered through components — see CLAUDE.md's
 * instruction for this phase.
 *
 * BILLING BOUNDARY (Section 19 of the Phase 3.14 brief): this function
 * only ever reasons about entitlements/plans/usage that are ALREADY
 * KNOWN to the caller. It does not look up a real user's plan from a
 * database, call a payment provider, or persist anything — there is no
 * payment integration anywhere in this codebase, and none was added here.
 * A future phase can supply real plan/usage data to this same function
 * without changing its shape; server-side enforcement (never trusting a
 * client-supplied `plan` value) is the caller's responsibility once a
 * real caller exists — see DECISIONS.md's Phase 3.14 entry for why no
 * such caller exists yet (no public/customer account system exists to
 * authoritatively hold a user's plan in the first place).
 */

const PLAN_ORDER: PlanKey[] = ["free", "pro", "business", "api"];

function planMeetsRequirement(userPlan: PlanKey, requiredPlan: PlanKey): boolean {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(requiredPlan);
}

export interface CanUseFeatureInput {
  authenticated: boolean;
  plan: PlanKey;
  entitlement: EntitlementKey;
  /** Only checked when the request is about a specific tool. */
  toolSlug?: string;
  /** Only checked when a real usage count/limit is already known to the
   * caller — this function never invents or looks up usage itself. */
  usage?: { count: number; limit: number | null };
}

export function canUseFeature(input: CanUseFeatureInput): AccessDecision {
  const { authenticated, plan, entitlement, toolSlug, usage } = input;

  if (toolSlug !== undefined) {
    const toolMeta = getToolMonetization(toolSlug);
    if (!toolMeta || !toolMeta.active) {
      return { result: "TOOL_UNAVAILABLE", requiredPlan: null, reason: "This tool has no live functionality yet." };
    }
  }

  const definition = ENTITLEMENTS[entitlement];
  if (definition.status !== "AVAILABLE") {
    return {
      result: "FEATURE_UNAVAILABLE",
      requiredPlan: null,
      reason: `"${entitlement}" is not implemented yet (status: ${definition.status}).`,
    };
  }

  if (!authenticated) {
    return { result: "AUTH_REQUIRED", requiredPlan: null, reason: "Sign-in is required for this capability." };
  }

  const requiredPlan = ENTITLEMENT_MINIMUM_PLAN[entitlement];
  if (!planMeetsRequirement(plan, requiredPlan)) {
    return {
      result: "PLAN_REQUIRED",
      requiredPlan,
      reason: `"${entitlement}" requires the ${requiredPlan} plan or higher.`,
    };
  }

  if (usage && usage.limit !== null && usage.count >= usage.limit) {
    return { result: "LIMIT_REACHED", requiredPlan: null, reason: "The usage limit for this period has been reached." };
  }

  return { result: "ALLOWED", requiredPlan: null, reason: "Access granted." };
}
