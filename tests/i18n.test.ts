import { describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_NATIVE_NAMES, TRANSLATIONS, isValidLanguage } from "../shared/i18n";
import { validateSettingValue } from "../shared/settings";
import fs from "node:fs";

/**
 * Phase 2.15 — multilanguage system.
 *
 * Per the project's testing rule, one appropriate test per topic below;
 * a second case is added only where a topic genuinely has more than one
 * distinct behavior to prove (e.g. accept vs. reject for validation).
 */

// --- topic: supported languages + default -----------------------------------

describe("supported languages", () => {
  it("are exactly az (default), tr, en, with real native names", () => {
    expect(LANGUAGES).toEqual(["az", "tr", "en"]);
    expect(DEFAULT_LANGUAGE).toBe("az");
    expect(LANGUAGE_NATIVE_NAMES.az).toBe("Azərbaycan dili");
    expect(LANGUAGE_NATIVE_NAMES.tr).toBe("Türkçe");
    expect(LANGUAGE_NATIVE_NAMES.en).toBe("English");
  });

  it("isValidLanguage fails closed for an unsupported code", () => {
    expect(isValidLanguage("az")).toBe(true);
    expect(isValidLanguage("tr")).toBe(true);
    expect(isValidLanguage("en")).toBe(true);
    expect(isValidLanguage("ru")).toBe(false);
    expect(isValidLanguage("")).toBe(false);
  });
});

// --- topic: translation completeness (AZ/TR/EN selection) -------------------

describe("translation dictionaries", () => {
  it("AZ, TR, and EN all provide non-empty text for every key (no missing/blank translations)", () => {
    function assertNoBlanks(value: unknown, path: string) {
      if (typeof value === "function") return; // interpolated strings (welcome/copyright/etc.)
      if (typeof value === "string") {
        expect(value.length, `${path} should not be empty`).toBeGreaterThan(0);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((item, i) => assertNoBlanks(item, `${path}[${i}]`));
        return;
      }
      if (value && typeof value === "object") {
        for (const [key, nested] of Object.entries(value)) {
          assertNoBlanks(nested, `${path}.${key}`);
        }
      }
    }

    for (const lang of LANGUAGES) {
      assertNoBlanks(TRANSLATIONS[lang], lang);
    }
  });

  it("interpolated strings (welcome, copyright) actually interpolate in every language", () => {
    for (const lang of LANGUAGES) {
      expect(TRANSLATIONS[lang].admin.welcome("test@codivio.online")).toContain("test@codivio.online");
      expect(TRANSLATIONS[lang].footer.copyright(2030)).toContain("2030");
    }
  });
});

// --- topic: source wording fix (section 6) -----------------------------------

describe("setting-label wording fix", () => {
  it("the four 'Whether X has been configured/enabled' strings are now real questions, in the exact wording requested, in all 3 languages", () => {
    expect(TRANSLATIONS.en.settingLabel["google.analytics_configured"]).toBe("Is Google Analytics configured?");
    expect(TRANSLATIONS.en.settingLabel["google.search_console_configured"]).toBe("Is Search Console configured?");
    expect(TRANSLATIONS.en.settingLabel["advertising.adsense_configured"]).toBe("Is AdSense configured?");
    expect(TRANSLATIONS.en.settingLabel["affiliate.enabled"]).toBe("Is the affiliate program enabled?");

    expect(TRANSLATIONS.az.settingLabel["google.analytics_configured"]).toBe("Google Analytics konfiqurasiya olunub?");
    expect(TRANSLATIONS.az.settingLabel["google.search_console_configured"]).toBe("Search Console konfiqurasiya olunub?");
    expect(TRANSLATIONS.az.settingLabel["advertising.adsense_configured"]).toBe("AdSense konfiqurasiya olunub?");

    expect(TRANSLATIONS.tr.settingLabel["google.analytics_configured"]).toBe("Google Analytics yapılandırıldı mı?");
    expect(TRANSLATIONS.tr.settingLabel["google.search_console_configured"]).toBe("Search Console yapılandırıldı mı?");
    expect(TRANSLATIONS.tr.settingLabel["advertising.adsense_configured"]).toBe("AdSense yapılandırıldı mı?");

    // None of the four still contain the awkward, literal source phrasing.
    for (const lang of LANGUAGES) {
      const labels = Object.values(TRANSLATIONS[lang].settingLabel);
      for (const label of labels) {
        expect(label.toLowerCase()).not.toContain("whether");
      }
    }
  });

  it("common status words match the exact requested wording (Coming soon / Not configured / Disabled)", () => {
    expect(TRANSLATIONS.en.common.comingSoon).toBe("Coming soon");
    expect(TRANSLATIONS.az.common.comingSoon).toBe("Tezliklə");
    expect(TRANSLATIONS.tr.common.comingSoon).toBe("Yakında");

    expect(TRANSLATIONS.en.common.notConfigured).toBe("Not configured");
    expect(TRANSLATIONS.az.common.notConfigured).toBe("Konfiqurasiya edilməyib");
    expect(TRANSLATIONS.tr.common.notConfigured).toBe("Yapılandırılmadı");

    expect(TRANSLATIONS.en.common.disabled).toBe("Disabled");
    expect(TRANSLATIONS.az.common.disabled).toBe("Deaktivdir");
    expect(TRANSLATIONS.tr.common.disabled).toBe("Devre dışı");
  });
});

// --- topic: server-side language validation (fail-closed) -------------------

describe("general.default_language server-side validation", () => {
  it("accepts az/tr/en and rejects an unsupported code", () => {
    for (const lang of LANGUAGES) {
      const result = validateSettingValue("general.default_language", lang);
      expect(result.ok).toBe(true);
    }
    const rejected = validateSettingValue("general.default_language", "xx");
    expect(rejected.ok).toBe(false);
  });
});

// --- topic: persistence (localStorage, no conflicting source of truth) ------

describe("language persistence architecture", () => {
  const contextSource = fs.readFileSync(new URL("../src/i18n/LanguageContext.tsx", import.meta.url), "utf8");

  it("reads/writes a single localStorage key, and falls back to DEFAULT_LANGUAGE (az) when nothing is stored", () => {
    expect(contextSource).toContain('localStorage.getItem(STORAGE_KEY)');
    expect(contextSource).toContain('localStorage.setItem(STORAGE_KEY, lang)');
    expect(contextSource).toContain("readStoredLanguage() ?? DEFAULT_LANGUAGE");
  });

  it("only consults the site's public default-language setting when no personal choice is stored yet (never overwrites an explicit choice)", () => {
    expect(contextSource).toContain("if (readStoredLanguage()) return;");
    expect(contextSource).toContain('fetch("/api/settings/public")');
  });
});

// --- topic: UI structure (reuse, not scattered per-component checks) --------

describe("UI uses the centralized dictionary, not scattered language checks", () => {
  it("no component contains a literal `language === \"...\"` branch", () => {
    const files = [
      "../src/App.tsx",
      "../src/admin/AdminApp.tsx",
      "../src/admin/AdminSettingsPage.tsx",
      "../src/admin/AdminPagesPage.tsx",
      "../src/admin/AdminToolsPage.tsx",
      "../src/admin/AdminComingSoonPage.tsx",
    ];
    for (const file of files) {
      const source = fs.readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source).not.toMatch(/language\s*===\s*["'](az|tr|en)["']/);
    }
  });

  it("the same LanguageSwitcher component is reused in the public header, Admin shell, and Settings — not three separate implementations", () => {
    const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    const adminAppSource = fs.readFileSync(new URL("../src/admin/AdminApp.tsx", import.meta.url), "utf8");
    const settingsSource = fs.readFileSync(new URL("../src/admin/AdminSettingsPage.tsx", import.meta.url), "utf8");
    for (const source of [appSource, adminAppSource, settingsSource]) {
      expect(source).toContain("LanguageSwitcher");
    }
  });
});

// --- topic: responsive (no fixed width that could overflow with longer AZ/TR text) ---

describe("language switcher responsive safety", () => {
  it("the switcher has no fixed (non-flexible) width that could overflow on narrow screens", () => {
    const styleSource = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    const rule = styleSource.match(/\.language-switcher\{[^}]*\}/)?.[0] ?? "";
    expect(rule).toContain("max-width:100%");
    expect(rule).not.toMatch(/[^-]width:\d/); // no fixed `width:Npx`, only min-width/max-width
  });
});
