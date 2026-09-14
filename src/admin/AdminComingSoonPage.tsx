import { usePageMeta } from "../App";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Phase 2.13 — shared "architecture preview" page for Admin modules that
 * have no backend yet. Phase 2.15: content now comes entirely from the
 * centralized translation dictionaries (keyed by `moduleKey`, matching a
 * `nav.*`/`comingSoon.modules.*` entry) rather than literal strings passed
 * in from each route — the same module never needs its English text
 * duplicated at the call site just to add AZ/TR versions.
 *
 * Still NOT a mock of the future feature: no fake tables, no fake charts,
 * no fake numbers. It states plainly that the module isn't connected yet
 * and lists the real categories that are planned.
 */

type ComingSoonModuleKey = keyof import("../../shared/i18n").Translations["comingSoon"]["modules"];

export default function AdminComingSoonPage({ moduleKey }: { moduleKey: ComingSoonModuleKey }) {
  const { t } = useLanguage();
  const title = t.nav[moduleKey];
  const { description, categories } = t.comingSoon.modules[moduleKey];

  usePageMeta(`Admin ${title}`, description);

  return (
    <div className="admin-coming-soon">
      <h1>{title}</h1>
      <p className="admin-coming-soon-intro">{description}</p>
      <span className="admin-coming-soon-badge">{t.comingSoon.notConnectedBadge}</span>

      <div className="admin-coming-soon-categories">
        {categories.map((category) => (
          <span className="admin-coming-soon-chip" key={category}>
            {category}
          </span>
        ))}
      </div>
    </div>
  );
}
