import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_LANGUAGE, TRANSLATIONS, isValidLanguage, type Language, type Translations } from "../../shared/i18n";

/**
 * Phase 2.15 — language persistence.
 *
 * Two layers, deliberately not merged into one "settings" system:
 *  1. The existing `general.default_language` Setting (Phase 2.7, public,
 *     read via the existing GET /api/settings/public — no new endpoint)
 *     is the SITE'S configured default for a visitor who has never chosen
 *     a language themselves. Changing it (Settings → Language, requires
 *     settings.manage) changes what every new visitor sees.
 *  2. `localStorage` holds THIS BROWSER's own override, set the moment
 *     anyone uses the language switcher (public header or Admin). It is
 *     checked first and, once set, is never silently overwritten by the
 *     site default — a visitor's own choice always wins on their device.
 *
 * This is not two conflicting sources of truth: layer 2 is a personal
 * override that sits on top of layer 1's single site-wide default, the
 * same relationship every real i18n system (browser locale vs. app
 * default) already has. No new D1 table/column was added for this.
 *
 * The literal "if nothing is configured, use AZ" requirement is satisfied
 * by DEFAULT_LANGUAGE itself — used synchronously as the initial state
 * before the async site-default fetch below ever resolves, so there is
 * never a moment where the UI is blocked on a network request just to
 * pick a language.
 */

const STORAGE_KEY = "codivio_language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && isValidLanguage(stored) ? stored : null;
  } catch {
    // Private browsing / storage disabled — degrade to no stored
    // preference rather than throwing.
    return null;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage() ?? DEFAULT_LANGUAGE);

  useEffect(() => {
    if (readStoredLanguage()) return; // never override an explicit per-browser choice

    let cancelled = false;
    fetch("/api/settings/public")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { settings?: { key: string; value: unknown }[] } | null) => {
        if (cancelled || !data?.settings) return;
        const setting = data.settings.find((item) => item.key === "general.default_language");
        if (typeof setting?.value === "string" && isValidLanguage(setting.value)) {
          setLanguageState(setting.value);
        }
      })
      .catch(() => {
        // Network/parse failure — the DEFAULT_LANGUAGE already applied at
        // initial state stands; never a broken or blank UI.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private browsing / storage disabled — the change still applies
      // for this page view, it just won't persist across reloads.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t: TRANSLATIONS[language] }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
