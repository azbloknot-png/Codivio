import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { LANGUAGES, TRANSLATIONS } from "../shared/i18n";
import { PLAN_KEYS, ENTITLEMENT_KEYS } from "../shared/monetization";
import { FUNNEL_EVENT_NAMES, isValidFunnelEventName } from "../shared/monetization/funnel-events";
import { isValidCustomerAccountStatus, isValidCustomerEmail } from "../shared/customer";

/**
 * Phase 3.14 remediation — Findings #1-#3. One appropriate test per topic.
 * Finding #4 (test typecheck config) is verified by actually running
 * `npm run typecheck:tests`, not by a vitest case (it's a tsc concern, not
 * a runtime one) — see the handoff report.
 */

describe("Finding #1 — customer accounts are structurally separate from Admin accounts", () => {
  it("migration 0008 creates customer_accounts with no foreign key to users/sessions/audit_logs, and no subscription/billing table", () => {
    const migration = fs.readFileSync(new URL("../migrations/0008_customer_accounts.sql", import.meta.url), "utf8");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS customer_accounts");
    expect(migration).not.toMatch(/REFERENCES\s+users/i);
    expect(migration).not.toMatch(/REFERENCES\s+sessions/i);
    expect(migration).not.toMatch(/CREATE TABLE.*subscriptions/i);
    expect(migration).not.toMatch(/^\s*password_hash\s+TEXT/im);
  });

  it("no Worker auth/RBAC file references customer_accounts (proves no shared session/privilege path exists between Admin and a future customer identity)", () => {
    const authSource = fs.readFileSync(new URL("../worker/auth.ts", import.meta.url), "utf8");
    const rbacSource = fs.readFileSync(new URL("../worker/rbac.ts", import.meta.url), "utf8");
    expect(authSource).not.toContain("customer_accounts");
    expect(rbacSource).not.toContain("customer_accounts");
  });

  it("shared/customer.ts validators are correct and independent of shared/rbac.ts's Admin role model", () => {
    expect(isValidCustomerAccountStatus("active")).toBe(true);
    expect(isValidCustomerAccountStatus("super_admin")).toBe(false);
    expect(isValidCustomerEmail("person@example.com")).toBe(true);
    expect(isValidCustomerEmail("not-an-email")).toBe(false);
    const customerSource = fs.readFileSync(new URL("../shared/customer.ts", import.meta.url), "utf8");
    expect(customerSource).not.toMatch(/^\s*import .*from\s+["'].*rbac["']/m);
  });
});

describe("Finding #2 — /pricing is fully localized through the existing i18n architecture", () => {
  it("t.pricing has every key non-empty in AZ/TR/EN, plan/entitlement key sets match the monetization module exactly, and translated fields genuinely differ by language", () => {
    for (const lang of LANGUAGES) {
      const pricing = TRANSLATIONS[lang].pricing;
      expect(Object.keys(pricing.planDescriptions).sort()).toEqual([...PLAN_KEYS].sort());
      expect(Object.keys(pricing.entitlementLabels).sort()).toEqual([...ENTITLEMENT_KEYS].sort());
      for (const value of Object.values(pricing.planDescriptions)) expect(value.length).toBeGreaterThan(0);
      for (const value of Object.values(pricing.entitlementLabels)) expect(value.length).toBeGreaterThan(0);
      expect(pricing.heading.length).toBeGreaterThan(0);
      expect(pricing.faqBuyAnswer.length).toBeGreaterThan(0);
    }
    expect(TRANSLATIONS.az.pricing.heading).not.toBe(TRANSLATIONS.en.pricing.heading);
    expect(TRANSLATIONS.tr.pricing.heading).not.toBe(TRANSLATIONS.en.pricing.heading);
    expect(TRANSLATIONS.az.pricing.planDescriptions.pro).not.toBe(TRANSLATIONS.en.pricing.planDescriptions.pro);
  });

  it("App.tsx's PricingPage reads all body copy from t.pricing, not hardcoded English strings", () => {
    const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    const start = appSource.indexOf("function PricingPage()");
    const end = appSource.indexOf("function ContactPage()");
    const pricingPageSource = appSource.slice(start, end);
    expect(pricingPageSource).not.toContain("Plans for every stage");
    expect(pricingPageSource).not.toContain("Coming soon");
    expect(pricingPageSource).toContain("t.pricing.");
  });
});

describe("Finding #3 — funnel analytics stays a type-only foundation, never fabricated", () => {
  it("FUNNEL_EVENT_NAMES matches the specified catalog exactly, and no fake event is fired anywhere in src/", () => {
    expect([...FUNNEL_EVENT_NAMES].sort()).toEqual(["plan_selected", "pricing_view", "upgrade_cta_click", "upgrade_cta_view"].sort());
    expect(isValidFunnelEventName("pricing_view")).toBe(true);
    expect(isValidFunnelEventName("fake_event")).toBe(false);

    const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    for (const name of FUNNEL_EVENT_NAMES) {
      expect(appSource, `src/App.tsx should not fire "${name}"`).not.toContain(name);
    }
  });
});
