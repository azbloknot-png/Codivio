/**
 * Codivio i18n — supported languages (Phase 2.15).
 *
 * Framework-agnostic (imported by both the Worker and the frontend, same
 * pattern as shared/rbac.ts/settings.ts/pages.ts/tools.ts) — no DOM/
 * localStorage access here, that lives in src/i18n/ (frontend-only).
 */

export const LANGUAGES = ["az", "tr", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "az";

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
