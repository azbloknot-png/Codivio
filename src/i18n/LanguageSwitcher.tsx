import { LANGUAGES, LANGUAGE_NATIVE_NAMES, isValidLanguage, type Language } from "../../shared/i18n";
import { useLanguage } from "./LanguageContext";

/** One reusable switcher — used in the public header, the Admin shell
 * header, AND the Settings → Language panel (Phase 2.15), never a second
 * parallel implementation. Language names are always shown in their own
 * language (Azərbaycan dili / Türkçe / English), never translated based on
 * the current UI language — the universal convention for language
 * switchers.
 *
 * `onChange` is optional and fires IN ADDITION to the context update —
 * only the Settings page uses it, to also persist the choice as the
 * site-wide default (a real settings.manage-gated PATCH) when the viewer
 * has permission to. Every other usage just sets this browser's own
 * override, which `onChange` never needs to know about. */
export function LanguageSwitcher({
  className = "language-switcher",
  onChange,
}: {
  className?: string;
  onChange?: (lang: Language) => void;
}) {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      className={className}
      value={language}
      onChange={(event) => {
        const value = event.target.value;
        if (isValidLanguage(value)) {
          setLanguage(value);
          onChange?.(value);
        }
      }}
      aria-label="Language"
    >
      {LANGUAGES.map((code) => (
        <option key={code} value={code}>
          {LANGUAGE_NATIVE_NAMES[code]}
        </option>
      ))}
    </select>
  );
}
