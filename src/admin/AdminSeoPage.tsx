import { useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePageMeta } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGUAGES } from "../../shared/i18n";
import {
  PAGE_SEO,
  TOOL_SEO,
  CANONICAL_DOMAIN,
  SITE_NAME,
  TITLE_SUFFIX,
  DEFAULT_OG_IMAGE,
  OG_LOCALE,
  buildTitle,
  buildCanonicalUrl,
  robotsToString,
  findDuplicateTitles,
  findDuplicateDescriptions,
  findMissingMetadata,
  findLengthOutliers,
  type SeoEntity,
  type SeoEntityRef,
} from "../../shared/seo";
import type { Language } from "../../shared/i18n";

/**
 * Codivio Admin — SEO overview (Phase 3.1).
 *
 * Deliberately read-only: every value here comes live from shared/seo/
 * (the real code-level SEO dataset the public site actually renders from
 * today — see DECISIONS.md's "SEO Metadata Architecture" entry for why
 * that's a code dataset, not a new D1 table, at this stage). There is no
 * save button because there is nothing here to save yet — editing this
 * data means editing the shared/seo/*.ts source files directly. Adding a
 * form that looked editable but silently did nothing would be exactly the
 * "fake UI field that cannot save" this phase's own instructions forbid.
 *
 * Visible to any role that reaches the Admin shell, same as the other
 * not-yet-built modules (see the Phase 2.13 decision in DECISIONS.md) —
 * no new RBAC permission was added for this, since it is read-only and
 * touches no sensitive data.
 */
function buildRefs(): SeoEntityRef[] {
  const pageRefs = Object.entries(PAGE_SEO).map(([key, entity]) => ({ key: `page:${key}`, entity }));
  const toolRefs = Object.entries(TOOL_SEO).map(([key, entity]) => ({ key: `tool:${key}`, entity }));
  return [...pageRefs, ...toolRefs];
}

export default function AdminSeoPage() {
  const { t, language } = useLanguage();
  usePageMeta(t.nav.seo, "Read-only preview of Codivio's SEO title and meta description coverage.");

  const refs = useMemo(buildRefs, []);
  const duplicateTitles = useMemo(() => findDuplicateTitles(refs, language), [refs, language]);
  const duplicateDescriptions = useMemo(() => findDuplicateDescriptions(refs, language), [refs, language]);
  const missing = useMemo(() => findMissingMetadata(refs, LANGUAGES), [refs]);
  const outliers = useMemo(() => findLengthOutliers(refs, [language]), [refs, language]);

  const hasWarnings = duplicateTitles.length > 0 || duplicateDescriptions.length > 0 || missing.length > 0;

  return (
    <div className="admin-seo-page">
      <h1>SEO Overview</h1>
      <p className="admin-seo-intro">
        Live, read-only preview of Codivio's SEO metadata ({Object.keys(PAGE_SEO).length} pages,{" "}
        {Object.keys(TOOL_SEO).length} tools, {LANGUAGES.length} languages each). This preview is informational
        only — it does not represent Google's actual search result rendering.
      </p>

      <section className="admin-seo-summary">
        <h2>Global configuration</h2>
        <dl>
          <div>
            <dt>Site name</dt>
            <dd>{SITE_NAME}</dd>
          </div>
          <div>
            <dt>Canonical domain</dt>
            <dd>{CANONICAL_DOMAIN}</dd>
          </div>
          <div>
            <dt>Title suffix</dt>
            <dd>"{TITLE_SUFFIX}"</dd>
          </div>
          <div>
            <dt>Default OG image</dt>
            <dd>{DEFAULT_OG_IMAGE}</dd>
          </div>
          <div>
            <dt>OG locale (current language)</dt>
            <dd>{OG_LOCALE[language]}</dd>
          </div>
        </dl>
      </section>

      <section className={`admin-seo-warnings${hasWarnings ? "" : " admin-seo-warnings-clean"}`} aria-live="polite">
        <h2>
          {hasWarnings ? (
            <>
              <AlertTriangle size={18} aria-hidden="true" /> Warnings
            </>
          ) : (
            <>
              <CheckCircle2 size={18} aria-hidden="true" /> No duplicate or missing metadata found
            </>
          )}
        </h2>

        {duplicateTitles.length > 0 && (
          <div className="admin-seo-warning-group">
            <h3>Duplicate titles ({language.toUpperCase()})</h3>
            <ul>
              {duplicateTitles.map((group) => (
                <li key={group.value}>
                  "{group.value}" — {group.keys.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {duplicateDescriptions.length > 0 && (
          <div className="admin-seo-warning-group">
            <h3>Duplicate descriptions ({language.toUpperCase()})</h3>
            <ul>
              {duplicateDescriptions.map((group) => (
                <li key={group.value}>
                  "{group.value}" — {group.keys.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {missing.length > 0 && (
          <div className="admin-seo-warning-group">
            <h3>Missing metadata (any language)</h3>
            <ul>
              {missing.map((entry, index) => (
                <li key={index}>
                  {entry.key} — {entry.lang.toUpperCase()} {entry.field}
                </li>
              ))}
            </ul>
          </div>
        )}

        {outliers.length > 0 && (
          <div className="admin-seo-warning-group">
            <h3>Length outliers to review ({language.toUpperCase()})</h3>
            <ul>
              {outliers.map((entry, index) => (
                <li key={index}>
                  {entry.key} — {entry.field} is {entry.length} characters
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2>Pages ({Object.keys(PAGE_SEO).length})</h2>
        <div className="admin-seo-table" role="table" aria-label="Page SEO metadata">
          {Object.entries(PAGE_SEO).map(([key, entity]) => (
            <SeoPreviewRow key={key} entityKey={key} entity={entity} language={language} />
          ))}
        </div>
      </section>

      <section>
        <h2>Tools ({Object.keys(TOOL_SEO).length})</h2>
        <div className="admin-seo-table" role="table" aria-label="Tool SEO metadata">
          {Object.entries(TOOL_SEO).map(([key, entity]) => (
            <SeoPreviewRow key={key} entityKey={key} entity={entity} language={language} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SeoPreviewRow({ entityKey, entity, language }: { entityKey: string; entity: SeoEntity; language: Language }) {
  const copy = entity.localized[language];
  const fullTitle = buildTitle(copy.title);
  const url = buildCanonicalUrl(entity.path);

  return (
    <div className="admin-seo-row" role="row">
      <div className="admin-seo-preview">
        <span className="admin-seo-preview-title">{fullTitle}</span>
        <span className="admin-seo-preview-url">{url}</span>
        <span className="admin-seo-preview-desc">{copy.description}</span>
      </div>
      <div className="admin-seo-meta">
        <span className="admin-seo-key">{entityKey}</span>
        <span>Title: {fullTitle.length} chars</span>
        <span>Description: {copy.description.length} chars</span>
        <span>Robots: {robotsToString(entity.robots)}</span>
      </div>
    </div>
  );
}
