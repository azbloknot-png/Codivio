import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { LANGUAGES } from "../shared/i18n";
import { PAGE_SEO } from "../shared/seo";
import {
  PLAN_KEYS,
  ENTITLEMENT_KEYS,
  PLANS,
  getVisiblePlansByPriority,
  ENTITLEMENTS,
  getPlanEntitlementKeys,
  getAllToolMonetizationSlugs,
  getToolMonetization,
  canUseFeature,
  evaluateQuota,
} from "../shared/monetization";

/**
 * Phase 3.14 — Free Tool -> Premium Monetization Funnel.
 *
 * One appropriate test per topic per the project's testing rule.
 */

describe("no fabricated business data in the plan catalog", () => {
  it("every plan has null pricing (undecided, not a placeholder number), a valid upgrade chain, and no plan is purchasable yet", () => {
    for (const key of PLAN_KEYS) {
      const plan = PLANS[key];
      expect(plan.pricing.amount, `${key} pricing.amount`).toBeNull();
      expect(plan.pricing.currency, `${key} pricing.currency`).toBeNull();
      expect(plan.status, `${key} status`).toBe("planned");
    }
    expect(PLANS.free.upgradeTarget).toBe("pro");
    expect(PLANS.pro.upgradeTarget).toBe("business");
    expect(PLANS.business.upgradeTarget).toBe("api");
    expect(PLANS.api.upgradeTarget).toBeNull();
    expect(getVisiblePlansByPriority().map((p) => p.key)).toEqual(["free", "pro", "business", "api"]);
  });
});

describe("entitlement catalog is honest about what's actually implemented", () => {
  it("no entitlement is marked AVAILABLE (nothing is actually gated/enforced anywhere yet)", () => {
    for (const key of ENTITLEMENT_KEYS) {
      expect(ENTITLEMENTS[key].status, key).not.toBe("AVAILABLE");
    }
  });

  it("getPlanEntitlementKeys returns an inheriting, non-empty set for every plan and a strictly larger set for a higher plan", () => {
    const free = getPlanEntitlementKeys("free");
    const pro = getPlanEntitlementKeys("pro");
    const business = getPlanEntitlementKeys("business");
    const api = getPlanEntitlementKeys("api");
    expect(free.length).toBeGreaterThan(0);
    expect(pro.length).toBeGreaterThan(free.length);
    expect(business.length).toBeGreaterThan(pro.length);
    expect(api.length).toBeGreaterThan(business.length);
    for (const key of free) expect(pro).toContain(key);
  });
});

describe("tool monetization metadata is uniform and honest across all 34 tools", () => {
  it("every tool is inactive, non-monetizable, unenforced and defaults to the free plan (no tool is special yet)", () => {
    for (const slug of getAllToolMonetizationSlugs()) {
      const meta = getToolMonetization(slug);
      expect(meta, slug).not.toBeNull();
      expect(meta!.active, slug).toBe(false);
      expect(meta!.monetizable, slug).toBe(false);
      expect(meta!.enforced, slug).toBe(false);
      expect(meta!.requiredPlan, slug).toBe("free");
      expect(meta!.usageCost, slug).toBe("N/A — NOT APPLICABLE");
    }
    expect(getToolMonetization("not-a-real-tool")).toBeNull();
  });
});

describe("access decision engine never grants access to anything not actually implemented, regardless of client-claimed plan/auth", () => {
  it("canUseFeature returns FEATURE_UNAVAILABLE for every entitlement even when authenticated with the top plan (proves nothing can be self-escalated into ALLOWED today)", () => {
    for (const entitlement of ENTITLEMENT_KEYS) {
      const decision = canUseFeature({ authenticated: true, plan: "api", entitlement });
      expect(decision.result, entitlement).toBe("FEATURE_UNAVAILABLE");
    }
  });

  it("canUseFeature returns TOOL_UNAVAILABLE for any real (inactive) tool and for a fake tool slug, before any plan/entitlement check runs", () => {
    const real = canUseFeature({ authenticated: true, plan: "api", entitlement: "basic_tool_access", toolSlug: "qr-code-generator" });
    expect(real.result).toBe("TOOL_UNAVAILABLE");
    const fake = canUseFeature({ authenticated: true, plan: "api", entitlement: "basic_tool_access", toolSlug: "not-a-real-tool" });
    expect(fake.result).toBe("TOOL_UNAVAILABLE");
  });
});

describe("usage/quota evaluation is pure and never invents usage", () => {
  it("evaluateQuota compares only the supplied count against the supplied limit, and null limit always means unlimited", () => {
    expect(evaluateQuota(5, { key: "x", period: "day", limit: 10 })).toBe("ALLOWED");
    expect(evaluateQuota(10, { key: "x", period: "day", limit: 10 })).toBe("LIMIT_REACHED");
    expect(evaluateQuota(999999, { key: "x", period: "day", limit: null })).toBe("ALLOWED");
  });
});

describe("the pricing page is wired into the existing SEO architecture honestly", () => {
  it("PAGE_SEO has a pricing entry (index,follow, all 3 languages) and no Product/Offer/AggregateRating schema type exists anywhere", () => {
    expect(PAGE_SEO.pricing.path).toBe("/pricing");
    expect(PAGE_SEO.pricing.robots.index).toBe(true);
    for (const lang of LANGUAGES) {
      expect(PAGE_SEO.pricing.localized[lang].title.length).toBeGreaterThan(0);
      expect(PAGE_SEO.pricing.localized[lang].description.length).toBeGreaterThan(0);
    }
    const schemaSource = fs.readFileSync(new URL("../shared/seo/schema.ts", import.meta.url), "utf8");
    expect(schemaSource).not.toMatch(/"@type"\s*:\s*"(Product|Offer|AggregateRating|Review)"/);
  });

  it("App.tsx never renders a real or fake checkout — the upgrade button is disabled and labeled 'Coming soon'", () => {
    const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    expect(appSource).toContain("pricing-upgrade-button");
    expect(appSource).toMatch(/className="pricing-upgrade-button"\s+disabled/);
    expect(appSource).not.toMatch(/checkout|Buy now|Subscribe now/i);
  });
});
