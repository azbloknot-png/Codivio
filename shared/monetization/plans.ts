import type { Plan, PlanKey } from "./types";

/**
 * Codivio plan definitions (Phase 3.14).
 *
 * Every price is `null` — genuinely undecided, not a placeholder. No plan
 * is currently purchasable (`status: "planned"` on all four): there is no
 * payment integration anywhere in this codebase (see access.ts). This file
 * is the single source of truth for plan display data; nothing else should
 * hardcode a plan name/description/order.
 */
export const PLANS: Record<PlanKey, Plan> = {
  free: {
    key: "free",
    displayName: "Free",
    status: "planned",
    description: "Access to Codivio's tools as they become available, at no cost.",
    pricing: { amount: null, currency: null, period: null },
    priority: 0,
    visible: true,
    upgradeTarget: "pro",
  },
  pro: {
    key: "pro",
    displayName: "Pro",
    status: "planned",
    description: "Planned for individuals who need higher limits and faster processing once tools are live.",
    pricing: { amount: null, currency: null, period: null },
    priority: 1,
    visible: true,
    upgradeTarget: "business",
  },
  business: {
    key: "business",
    displayName: "Business",
    status: "planned",
    description: "Planned for teams that need advanced limits and priority processing once tools are live.",
    pricing: { amount: null, currency: null, period: null },
    priority: 2,
    visible: true,
    upgradeTarget: "api",
  },
  api: {
    key: "api",
    displayName: "API",
    status: "planned",
    description: "Planned programmatic access to Codivio's tools for developers and integrations.",
    pricing: { amount: null, currency: null, period: null },
    priority: 3,
    visible: true,
    upgradeTarget: null,
  },
};

export function getPlan(key: PlanKey): Plan {
  return PLANS[key];
}

export function getVisiblePlansByPriority(): Plan[] {
  return Object.values(PLANS)
    .filter((plan) => plan.visible)
    .sort((a, b) => a.priority - b.priority);
}
