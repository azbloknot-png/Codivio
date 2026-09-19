import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { TRANSLATIONS } from "../shared/i18n";

/**
 * Cookie Consent UI (banner, settings modal, ConsentProvider, updated
 * /cookies page). No jsdom/@testing-library exists in this project (see
 * tests/analytics.test.ts's own note) — these are structural/source-level
 * checks, matching the established pattern for React UI in this suite
 * (e.g. tests/qr-scanner-tool.test.ts, tests/phase3-finalization.test.ts).
 */

const consentContextSource = fs.readFileSync(new URL("../src/consent/ConsentContext.tsx", import.meta.url), "utf8");
const bannerSource = fs.readFileSync(new URL("../src/consent/CookieConsentBanner.tsx", import.meta.url), "utf8");
const modalSource = fs.readFileSync(new URL("../src/consent/CookieSettingsModal.tsx", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const mainSource = fs.readFileSync(new URL("../src/main.tsx", import.meta.url), "utf8");

describe("ConsentProvider wiring", () => {
  it("is mounted in src/main.tsx, wrapping the router", () => {
    expect(mainSource).toContain('import { ConsentProvider } from "./consent/ConsentContext";');
    expect(mainSource).toContain("<ConsentProvider>");
  });

  it("reacts to consent.analytics by calling enableAnalytics/disableAnalytics, not by reading storage directly elsewhere", () => {
    expect(consentContextSource).toContain('import { disableAnalytics, enableAnalytics } from "../lib/analytics";');
    expect(consentContextSource).toMatch(/if \(consent\?\.analytics\) \{\s*enableAnalytics\(\);/);
    expect(consentContextSource).toContain("disableAnalytics();");
  });

  it("acceptAll/rejectOptional/savePreferences all persist via writeConsent and close the settings modal", () => {
    expect(consentContextSource).toContain("writeConsent(acceptAllPreferences())");
    expect(consentContextSource).toContain("writeConsent(rejectOptionalPreferences())");
    expect(consentContextSource).toContain("writeConsent(preferences)");
    // Every one of the three setters ends the modal session.
    const setterCount = (consentContextSource.match(/setIsSettingsOpen\(false\)/g) ?? []).length;
    expect(setterCount).toBeGreaterThanOrEqual(3);
  });
});

describe("CookieConsentBanner", () => {
  it("offers exactly Accept All, Reject Optional, and Cookie Settings", () => {
    expect(bannerSource).toContain("t.cookieConsent.acceptAll");
    expect(bannerSource).toContain("t.cookieConsent.rejectOptional");
    expect(bannerSource).toContain("t.cookieConsent.openSettings");
    expect(bannerSource).toContain("onClick={acceptAll}");
    expect(bannerSource).toContain("onClick={rejectOptional}");
    expect(bannerSource).toContain("onClick={openSettings}");
  });

  it("only renders when nothing has been decided yet and the settings modal isn't open", () => {
    expect(bannerSource).toContain("if (consent !== null || isSettingsOpen) return null;");
  });

  it("links to /cookies for more detail, using safe client-side routing (Link), not a raw <a>", () => {
    expect(bannerSource).toContain('import { Link } from "react-router-dom";');
    expect(bannerSource).toMatch(/<Link to="\/cookies">/);
  });
});

describe("CookieSettingsModal", () => {
  it("shows all four categories: Necessary, Analytics, Advertising, Preferences", () => {
    expect(modalSource).toContain("categories.necessary");
    expect(modalSource).toContain("categories.analytics");
    expect(modalSource).toContain("categories.advertising");
    expect(modalSource).toContain("categories.preferences");
  });

  it("locks Necessary always-on and Advertising/Preferences always-off (no real technology behind either yet)", () => {
    expect(modalSource).toMatch(/<CategorySwitch checked disabled label=\{categories\.necessary\.name\}/);
    expect(modalSource).toMatch(/<CategorySwitch checked=\{false\} disabled label=\{categories\.advertising\.name\}/);
    expect(modalSource).toMatch(/<CategorySwitch checked=\{false\} disabled label=\{categories\.preferences\.name\}/);
  });

  it("only Analytics is a real, user-editable toggle", () => {
    expect(modalSource).toContain(
      '<CategorySwitch checked={analyticsDraft} onChange={setAnalyticsDraft} label={categories.analytics.name} />',
    );
  });

  it("uses a real accessible dialog role and closes on Escape without saving", () => {
    expect(modalSource).toContain('role="dialog"');
    expect(modalSource).toContain('aria-modal="true"');
    expect(modalSource).toContain('event.key === "Escape"');
    expect(modalSource).not.toMatch(/Escape["'][\s\S]{0,80}savePreferences/);
  });

  it("Save preferences forces advertising/preferences false regardless of the (nonexistent) UI for them", () => {
    expect(modalSource).toContain("savePreferences({ analytics: analyticsDraft, advertising: false, preferences: false })");
  });
});

describe("CookiePolicyPage reflects real behavior", () => {
  it("no longer promises a future cookie settings interface — it renders a real, working one", () => {
    expect(appSource).not.toContain("Codivio will provide a cookie settings interface");
    expect(appSource).toContain("t.cookieConsent.managePreferencesButton");
    expect(appSource).toContain("onClick={openSettings}");
  });
});

describe("Translation completeness for the new cookieConsent section", () => {
  it("AZ, TR, and EN all provide the four category names distinctly (not copy-pasted placeholders)", () => {
    const az = TRANSLATIONS.az.cookieConsent.categories;
    const tr = TRANSLATIONS.tr.cookieConsent.categories;
    const en = TRANSLATIONS.en.cookieConsent.categories;
    for (const key of ["necessary", "analytics", "advertising", "preferences"] as const) {
      expect(az[key].name).not.toBe(en[key].name);
      expect(tr[key].name).not.toBe(en[key].name);
      expect(az[key].description.length).toBeGreaterThan(10);
      expect(tr[key].description.length).toBeGreaterThan(10);
      expect(en[key].description.length).toBeGreaterThan(10);
    }
  });
});
