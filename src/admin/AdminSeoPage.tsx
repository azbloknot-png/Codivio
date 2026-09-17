import { useEffect, useMemo, useState, type ReactElement } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert } from "lucide-react";
import { usePageMeta } from "../App";
import { useAdminUser } from "./AdminApp";
import { useLanguage } from "../i18n/LanguageContext";
import { hasPermission } from "../../shared/rbac";
import { LANGUAGES } from "../../shared/i18n";
import type { SeoOverrideEntityType } from "../../shared/seo-overrides";
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
  classifyLength,
  DEFAULT_LENGTH_THRESHOLDS,
  type SeoEntity,
  type SeoEntityRef,
  type LengthStatus,
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
 * RBAC (Phase 3.15-B): gated behind `seo.view` — both the sidebar nav
 * item (`AdminApp.tsx#NAV_ITEMS`) and this component itself check it (the
 * same `useAdminUser`/`hasPermission` pattern `AdminSettingsPage.tsx`
 * already uses for its own `settings.manage` read-only/editable split),
 * so a user without `seo.view` sees neither the nav link nor the page
 * content even via direct URL navigation. `seo.view`/`seo.manage` were
 * added to `admin` and `editor` only, matching every other content
 * permission pair (`pages.*`/`tools.*`/`faq.*`) exactly — `analyst` gets
 * neither, same as it gets none of those either. `seo.manage` has no
 * enforcing code path yet — this page has no save/edit functionality to
 * gate (that is future, separately-approved work) — it exists now only so
 * that future work has an already-defined, already-tested permission to
 * use instead of introducing RBAC changes mixed with feature changes.
 *
 * There is still no confidentiality reason for this gate — every value
 * shown here is already public on the live site (the same title/
 * description any visitor's browser already receives in raw HTML/
 * View Source, with no login required). The gate exists for consistent
 * Admin navigation structure, not to protect a secret.
 *
 * Editing (Phase 3.15-C): `seo.manage` gates an inline edit control per
 * row, backed by the new `/api/admin/seo-overrides` endpoints
 * (worker/seo-overrides.ts). An override only ever affects the title/
 * description shown here and in raw HTML (worker/seo-rewrite.ts) — never
 * the H1/JSON-LD, which still always reflect the compile-time default
 * (see that file's own header comment for why). This page fetches the
 * full override list once and merges it client-side with the compile-time
 * PAGE_SEO/TOOL_SEO defaults — a role with only `seo.view` (nothing has
 * that combination today, but the RBAC matrix allows it) still sees the
 * effective value and an "Overridden" badge, just no edit control.
 */
function buildRefs(): SeoEntityRef[] {
  const pageRefs = Object.entries(PAGE_SEO).map(([key, entity]) => ({ key: `page:${key}`, entity }));
  const toolRefs = Object.entries(TOOL_SEO).map(([key, entity]) => ({ key: `tool:${key}`, entity }));
  return [...pageRefs, ...toolRefs];
}

interface OverrideRecord {
  id: number;
  entityType: SeoOverrideEntityType;
  entityKey: string;
  language: Language;
  title: string;
  description: string;
  status: "active" | "inactive";
}

function overrideMapKey(entityType: SeoOverrideEntityType, entityKey: string, language: Language): string {
  return `${entityType}:${entityKey}:${language}`;
}

export default function AdminSeoPage() {
  const { t, language } = useLanguage();
  const user = useAdminUser();
  usePageMeta(t.nav.seo, "Read-only preview of Codivio's SEO title and meta description coverage.");

  const refs = useMemo(buildRefs, []);
  const duplicateTitles = useMemo(() => findDuplicateTitles(refs, language), [refs, language]);
  const duplicateDescriptions = useMemo(() => findDuplicateDescriptions(refs, language), [refs, language]);
  const missing = useMemo(() => findMissingMetadata(refs, LANGUAGES), [refs]);
  const outliers = useMemo(() => findLengthOutliers(refs, [language]), [refs, language]);

  const hasWarnings = duplicateTitles.length > 0 || duplicateDescriptions.length > 0 || missing.length > 0;

  const [overrides, setOverrides] = useState<OverrideRecord[]>([]);
  useEffect(() => {
    if (!hasPermission(user.role, "seo.view")) return;
    let cancelled = false;
    fetch("/api/admin/seo-overrides")
      .then((response) => (response.ok ? (response.json() as Promise<{ overrides: OverrideRecord[] }>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setOverrides(data.overrides);
      })
      .catch(() => {
        // Network/parse failure — the page still works, just shows every
        // row's compile-time default with no "Overridden" badges, the
        // same honest degrade-to-default behavior the public rendering
        // path (worker/seo-rewrite.ts) uses for the exact same failure.
      });
    return () => {
      cancelled = true;
    };
  }, [user.role]);

  const overridesByKey = useMemo(() => {
    const map = new Map<string, OverrideRecord>();
    for (const override of overrides) {
      if (override.status === "active") {
        map.set(overrideMapKey(override.entityType, override.entityKey, override.language), override);
      }
    }
    return map;
  }, [overrides]);

  const canManage = hasPermission(user.role, "seo.manage");

  // All hooks above run unconditionally (React's rules of hooks) — the
  // permission check itself is a plain conditional render, not a
  // conditional hook call.
  if (!hasPermission(user.role, "seo.view")) {
    return (
      <div className="admin-seo-page">
        <h1>SEO Overview</h1>
        <p className="admin-seo-denied">
          <ShieldAlert size={16} aria-hidden="true" /> You don't have permission to view this page.
        </p>
      </div>
    );
  }

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
            <SeoPreviewRow
              key={key}
              entityType="page"
              entityKey={key}
              entity={entity}
              language={language}
              override={overridesByKey.get(overrideMapKey("page", key, language)) ?? null}
              canManage={canManage}
              onOverrideSaved={(record) => setOverrides((prev) => [...prev.filter((o) => o.id !== record.id), record])}
              onOverrideDeleted={(id) => setOverrides((prev) => prev.filter((o) => o.id !== id))}
            />
          ))}
        </div>
      </section>

      <section>
        <h2>Tools ({Object.keys(TOOL_SEO).length})</h2>
        <div className="admin-seo-table" role="table" aria-label="Tool SEO metadata">
          {Object.entries(TOOL_SEO).map(([key, entity]) => (
            <SeoPreviewRow
              key={key}
              entityType="tool"
              entityKey={key}
              entity={entity}
              language={language}
              override={overridesByKey.get(overrideMapKey("tool", key, language)) ?? null}
              canManage={canManage}
              onOverrideSaved={(record) => setOverrides((prev) => [...prev.filter((o) => o.id !== record.id), record])}
              onOverrideDeleted={(id) => setOverrides((prev) => prev.filter((o) => o.id !== id))}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Phase 3.15-A — small, reusable status icon for a length classification,
 * matching the same short/good/long vocabulary `classifyLength` already
 * uses (`shared/seo/duplicates.ts`) — never a second, independently
 * invented set of thresholds or labels. */
const LENGTH_STATUS_ICON: Record<LengthStatus, ReactElement> = {
  short: <AlertTriangle size={13} aria-hidden="true" />,
  good: <CheckCircle2 size={13} aria-hidden="true" />,
  long: <AlertTriangle size={13} aria-hidden="true" />,
};

const LENGTH_STATUS_LABEL: Record<LengthStatus, string> = {
  short: "Too short",
  good: "Good length",
  long: "Too long",
};

/** Character counter + short/good/long badge for one field, using the
 * exact same `DEFAULT_LENGTH_THRESHOLDS` the sitewide warnings section
 * above already applies via `findLengthOutliers` — one shared source of
 * guidance, not a second set of numbers invented for this row-level view. */
function LengthCounter({ length, min, max }: { length: number; min: number; max: number }) {
  const status = classifyLength(length, min, max);
  return (
    <span className={`admin-seo-length admin-seo-length-${status}`}>
      {LENGTH_STATUS_ICON[status]}
      {length} chars ({LENGTH_STATUS_LABEL[status]}, guidance {min}–{max})
    </span>
  );
}

/**
 * Phase 3.15-A — Google Search Result preview mockups (desktop + mobile).
 *
 * Explicitly informational, matching this page's existing disclaimer
 * ("does not represent Google's actual search result rendering" — Google's
 * real rendering is proprietary, query-dependent, and not something any
 * site can exactly reproduce). Built entirely from data already available
 * on this page (title/description/canonical URL) — no new data source, no
 * favicon upload, no OG image (explicitly out of this task's scope). The
 * small circular site-mark is a plain decorative letter, not a real
 * favicon or an upload affordance of any kind.
 */
function GoogleSearchPreview({ fullTitle, url, description }: { fullTitle: string; url: string; description: string }) {
  const displayUrl = url.replace(/^https?:\/\//, "");

  return (
    <div className="admin-seo-serp">
      <div className="admin-seo-serp-mock admin-seo-serp-mock-desktop">
        <span className="admin-seo-serp-device-label">Desktop</span>
        <div className="admin-seo-serp-site">
          <span className="admin-seo-serp-mark" aria-hidden="true">
            C
          </span>
          <span className="admin-seo-serp-sitename">Codivio</span>
          <span className="admin-seo-serp-url">{displayUrl}</span>
        </div>
        <div className="admin-seo-serp-title admin-seo-serp-title-desktop">{fullTitle}</div>
        <div className="admin-seo-serp-desc admin-seo-serp-desc-desktop">{description}</div>
      </div>

      <div className="admin-seo-serp-mock admin-seo-serp-mock-mobile">
        <span className="admin-seo-serp-device-label">Mobile</span>
        <div className="admin-seo-serp-site">
          <span className="admin-seo-serp-mark" aria-hidden="true">
            C
          </span>
          <div className="admin-seo-serp-site-text">
            <span className="admin-seo-serp-sitename">Codivio</span>
            <span className="admin-seo-serp-url">{displayUrl}</span>
          </div>
        </div>
        <div className="admin-seo-serp-title admin-seo-serp-title-mobile">{fullTitle}</div>
        <div className="admin-seo-serp-desc admin-seo-serp-desc-mobile">{description}</div>
      </div>
    </div>
  );
}

function SeoPreviewRow({
  entityType,
  entityKey,
  entity,
  language,
  override,
  canManage,
  onOverrideSaved,
  onOverrideDeleted,
}: {
  entityType: SeoOverrideEntityType;
  entityKey: string;
  entity: SeoEntity;
  language: Language;
  override: OverrideRecord | null;
  canManage: boolean;
  onOverrideSaved: (record: OverrideRecord) => void;
  onOverrideDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const defaultCopy = entity.localized[language];
  // The effective value: an active override wins, otherwise the
  // compile-time default — the exact same precedence
  // worker/seo-rewrite.ts's injectStaticSeoMetadata applies server-side,
  // so this preview never shows something raw HTML wouldn't also show.
  const effectiveCopy = override ? { title: override.title, description: override.description } : defaultCopy;
  const fullTitle = buildTitle(effectiveCopy.title);
  const url = buildCanonicalUrl(entity.path);
  const { titleMin, titleMax, descriptionMin, descriptionMax } = DEFAULT_LENGTH_THRESHOLDS;

  return (
    <div className="admin-seo-row" role="row">
      <div className="admin-seo-preview">
        <span className="admin-seo-preview-title">{fullTitle}</span>
        <span className="admin-seo-preview-url">{url}</span>
        <span className="admin-seo-preview-desc">{effectiveCopy.description}</span>

        <GoogleSearchPreview fullTitle={fullTitle} url={url} description={effectiveCopy.description} />
      </div>
      <div className="admin-seo-meta">
        <span className="admin-seo-key">{entityKey}</span>
        {override && <span className="admin-seo-override-badge">Overridden</span>}
        <LengthCounter length={fullTitle.length} min={titleMin} max={titleMax} />
        <LengthCounter length={effectiveCopy.description.length} min={descriptionMin} max={descriptionMax} />
        <span>Robots: {robotsToString(entity.robots)}</span>

        {canManage && !editing && (
          <button type="button" className="admin-secondary-button admin-seo-edit-button" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {canManage && editing && (
        <SeoOverrideEditor
          entityType={entityType}
          entityKey={entityKey}
          language={language}
          defaultTitle={defaultCopy.title}
          defaultDescription={defaultCopy.description}
          override={override}
          onCancel={() => setEditing(false)}
          onSaved={(record) => {
            onOverrideSaved(record);
            setEditing(false);
          }}
          onReset={(id) => {
            onOverrideDeleted(id);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Phase 3.15-C — inline SEO override editor. Mounted only while the user
 * has clicked "Edit" (unmounting resets its draft state, matching the
 * "open form → snapshot current values → save or cancel" pattern already
 * used by AdminPagesPage.tsx/AdminToolsPage.tsx's own create/edit forms).
 *
 * Save uses PATCH when an override row already exists, POST otherwise —
 * the server independently re-validates and re-authorizes every request
 * (seo.manage), this is purely about picking the right HTTP method/URL.
 * Reset (DELETE) is the rollback path: it removes the override row
 * entirely, so the very next page load (admin or public) falls back to
 * the compile-time PAGE_SEO/TOOL_SEO default — there is no separate
 * "restore defaults" mechanism because none is needed.
 */
function SeoOverrideEditor({
  entityType,
  entityKey,
  language,
  defaultTitle,
  defaultDescription,
  override,
  onCancel,
  onSaved,
  onReset,
}: {
  entityType: SeoOverrideEntityType;
  entityKey: string;
  language: Language;
  defaultTitle: string;
  defaultDescription: string;
  override: OverrideRecord | null;
  onCancel: () => void;
  onSaved: (record: OverrideRecord) => void;
  onReset: (id: number) => void;
}) {
  const [title, setTitle] = useState(override?.title ?? defaultTitle);
  const [description, setDescription] = useState(override?.description ?? defaultDescription);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body = { entityType, entityKey, language, title, description, status: "active" };
      const response = await fetch(
        override ? `/api/admin/seo-overrides/${override.id}` : "/api/admin/seo-overrides",
        {
          method: override ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        if (response.status === 403) throw new Error("You don't have permission to do this.");
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not save this override.");
      }
      const data = (await response.json()) as { override: OverrideRecord };
      onSaved(data.override);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this override.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!override) {
      onCancel();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/seo-overrides/${override.id}`, { method: "DELETE" });
      if (!response.ok) {
        if (response.status === 403) throw new Error("You don't have permission to do this.");
        throw new Error("Could not reset this override.");
      }
      onReset(override.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset this override.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-seo-editor">
      <label className="admin-seo-editor-field">
        <span>SEO title</span>
        <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} disabled={saving} />
      </label>
      <label className="admin-seo-editor-field">
        <span>Meta description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={saving}
          rows={3}
        />
      </label>

      {error && <p className="admin-seo-editor-error">{error}</p>}

      <div className="admin-seo-editor-actions">
        <button type="button" className="primary-button" onClick={handleSave} disabled={saving}>
          Save
        </button>
        {override && (
          <button type="button" className="admin-secondary-button" onClick={handleReset} disabled={saving}>
            <RotateCcw size={14} aria-hidden="true" /> Reset to default
          </button>
        )}
        <button type="button" className="admin-secondary-button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}
