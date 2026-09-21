/**
 * Codivio i18n — supported languages (Phase 2.15).
 *
 * Framework-agnostic (imported by both the Worker and the frontend, same
 * pattern as shared/rbac.ts/settings.ts/pages.ts/tools.ts) — no DOM/
 * localStorage access here, that lives in src/i18n/ (frontend-only).
 */

export const LANGUAGES = ["az", "tr", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * The site's default language when no visitor preference exists yet
 * (no `localStorage` override, before the async site-setting fetch in
 * src/i18n/LanguageContext.tsx resolves). Must always match the real,
 * live `general.default_language` D1 setting's actual value ("en") —
 * a mismatch here is what caused a real bug: the UI would render in
 * whatever this constant said, then flip to the D1 setting's real value
 * moments later once the async fetch resolved, a visible flash of the
 * wrong language on every first-time visit. Fixed 2026-09-22 (was "az",
 * while production's `general.default_language` had always been "en" —
 * see DECISIONS.md's Multilanguage System entry). If the site's real
 * configured default language ever legitimately changes, update it in
 * both places together, not just one.
 */
export const DEFAULT_LANGUAGE: Language = "en";

/** A language's own name, always shown in that language regardless of the
 * current UI language — this is the universal convention for language
 * switchers (nobody expects "Türkçe" to become "Turkish" just because the
 * UI is currently in English). Not part of the translation dictionaries. */
export const LANGUAGE_NATIVE_NAMES: Readonly<Record<Language, string>> = {
  az: "Azərbaycan dili",
  tr: "Türkçe",
  en: "English",
};

export function isValidLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
}
