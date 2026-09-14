import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePageMeta } from "../App";
import { hasPermission } from "../../shared/rbac";
import type { Translations } from "../../shared/i18n";
import { useAdminUser } from "./AdminApp";
import { useLanguage } from "../i18n/LanguageContext";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";

/**
 * Phase 2.7 Settings Foundation, redesigned in Phase 2.13 into a category-
 * tab layout, and again in Phase 2.15 to (a) translate every visible
 * string via the centralized dictionaries and (b) add a real, functioning
 * Language tab (not a "Coming soon" placeholder — the app's language
 * choice is a genuinely working feature, see src/i18n/LanguageContext.tsx).
 *
 * Categories with a real, registered setting render it (editable if the
 * setting is editable and the viewer has settings.manage; status-only
 * otherwise). Categories with no registered setting yet render an honest
 * "Coming soon" panel — never a fake toggle or fabricated status. No fake
 * data, no fake connection status — every value shown comes from a real
 * GET /api/admin/settings response.
 *
 * Setting display labels come from `t.settingLabel`, not the raw
 * `description` field the API returns — the API's description is an
 * internal/English default (used only as a defensive fallback below);
 * the visible label is always the corrected, natural-language wording for
 * the viewer's chosen language (see shared/i18n — this is where "Whether
 * Google Analytics has been configured" became "Is Google Analytics
 * configured?" per the Phase 2.15 wording fix, translated from there).
 *
 * Editing is gated the same way the server gates it: only a role with
 * settings.manage sees editable controls at all — but this is a UX
 * convenience, not the security boundary; PATCH /api/admin/settings
 * re-checks settings.manage server-side regardless of what this renders.
 */

interface SettingItem {
  key: string;
  value: unknown;
  valueType: "string" | "boolean" | "integer" | "number" | "json";
  category: string;
  isPublic: boolean;
  description: string;
  updatedAt: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; settings: SettingItem[] };

/** One tab per long-term Settings category, plus the real "language" tab.
 * `keys` selects which real setting keys (if any) belong on that tab — a
 * tab with an empty list renders as "Coming soon" (except "language",
 * special-cased below). Google's two "configured" flags are split across
 * Analytics and Search Console here, matching the finer-grained category
 * list this checkpoint asks for (the settings table itself still stores
 * both under the single "google" category — see shared/settings.ts; this
 * split is a presentation grouping only, not a schema change). */
function getSettingsTabs(t: Translations): { id: string; label: string; keys: string[]; editable: boolean }[] {
  const tabs = t.settings.tabs;
  return [
    // general.default_language deliberately lives only on the "language"
    // tab below (a proper dropdown, not a free-text input) — no duplicate
    // control for the same setting.
    { id: "general", label: tabs.general, keys: ["general.site_name", "general.site_description"], editable: true },
    { id: "language", label: tabs.language, keys: [], editable: false },
    { id: "branding", label: tabs.branding, keys: [], editable: false },
    { id: "domain", label: tabs.domain, keys: [], editable: false },
    { id: "email", label: tabs.email, keys: [], editable: false },
    { id: "analytics", label: tabs.analytics, keys: ["google.analytics_configured"], editable: false },
    { id: "search-console", label: tabs.searchConsole, keys: ["google.search_console_configured"], editable: false },
    { id: "seo", label: tabs.seo, keys: [], editable: false },
    { id: "advertising", label: tabs.advertising, keys: ["advertising.adsense_configured"], editable: false },
    { id: "affiliate", label: tabs.affiliate, keys: ["affiliate.enabled"], editable: false },
    { id: "social", label: tabs.social, keys: [], editable: false },
    { id: "payments", label: tabs.payments, keys: [], editable: false },
    { id: "security", label: tabs.security, keys: ["security.registration_enabled"], editable: true },
    { id: "backups", label: tabs.backups, keys: [], editable: false },
    { id: "system", label: tabs.system, keys: ["system.maintenance_mode"], editable: true },
  ];
}

function settingLabelFor(t: Translations, item: SettingItem): string {
  const known = (t.settingLabel as Record<string, string | undefined>)[item.key];
  return known ?? item.description;
}

function describeLoadError(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to view settings.";
  return "Could not load settings. Please try again.";
}

function describeSaveError(status: number, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to change this setting.";
  if (status === 400) return fallback;
  return "Could not save this setting. Please try again.";
}

export default function AdminSettingsPage() {
  const { t } = useLanguage();
  usePageMeta(t.nav.settings, "Codivio admin settings.");
  const user = useAdminUser();
  const canManage = hasPermission(user.role, "settings.manage");

  const settingsTabs = getSettingsTabs(t);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [activeTab, setActiveTab] = useState(settingsTabs[0].id);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) {
        setState({ status: "error", message: describeLoadError(response.status) });
        return;
      }
      const data = (await response.json()) as { settings: SettingItem[] };
      setState({ status: "ready", settings: data.settings });
    } catch {
      setState({ status: "error", message: "Network error loading settings." });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(key: string, value: unknown) {
    setSavingKey(key);
    setSaveError(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setSaveError(describeSaveError(response.status, body.error ?? "Invalid value."));
        return;
      }
      await load();
    } catch {
      setSaveError("Network error saving this setting.");
    } finally {
      setSavingKey(null);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="admin-settings-loading" role="status" aria-live="polite">
        <Loader2 className="admin-spinner" size={22} aria-hidden="true" />
        <p>{t.common.loading}</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="admin-auth-error" role="alert">
        {state.message}
      </div>
    );
  }

  const settingsByKey = new Map(state.settings.map((item) => [item.key, item]));
  const currentTab = settingsTabs.find((tab) => tab.id === activeTab) ?? settingsTabs[0];
  const currentItems = currentTab.keys
    .map((key) => settingsByKey.get(key))
    .filter((item): item is SettingItem => item !== undefined);

  return (
    <div className="admin-settings-page">
      <h1>{t.nav.settings}</h1>
      <p className="admin-settings-intro">{canManage ? t.settings.introManage : t.settings.introReadOnly}</p>

      {saveError && (
        <div className="admin-auth-error" role="alert">
          {saveError}
        </div>
      )}

      <div className="admin-settings-tabs" role="tablist" aria-label="Settings categories">
        {settingsTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            className={`admin-settings-tab ${tab.id === activeTab ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="admin-settings-group" role="tabpanel">
        <h2>{currentTab.label}</h2>
        {currentTab.id === "language" ? (
          <div className="admin-settings-row admin-settings-row-text">
            <label>
              <strong>{t.settings.language.title}</strong>
              <span className="admin-settings-key">{t.settings.language.description}</span>
            </label>
            <LanguageSwitcher
              className="language-switcher"
              onChange={canManage ? (lang) => save("general.default_language", lang) : undefined}
            />
          </div>
        ) : currentTab.keys.length === 0 ? (
          <p className="admin-settings-soon">{t.settings.comingSoonForCategory(currentTab.label)}</p>
        ) : currentItems.length === 0 ? (
          <p className="admin-settings-soon">{t.settings.noSettingsForCategory}</p>
        ) : (
          currentItems.map((item) =>
            currentTab.editable ? (
              <EditableSettingRow
                key={item.key}
                item={item}
                t={t}
                canManage={canManage}
                saving={savingKey === item.key}
                draftValue={drafts[item.key]}
                onDraftChange={(v) => setDrafts((d) => ({ ...d, [item.key]: v }))}
                onSave={(value) => save(item.key, value)}
              />
            ) : (
              <StatusSettingRow key={item.key} item={item} t={t} />
            )
          )
        )}
      </section>
    </div>
  );
}

function StatusSettingRow({ item, t }: { item: SettingItem; t: Translations }) {
  const configured = item.value === true;
  return (
    <div className="admin-settings-row">
      <div>
        <strong>{settingLabelFor(t, item)}</strong>
        <span className="admin-settings-key">{item.key}</span>
      </div>
      <span className={`admin-settings-status ${configured ? "is-configured" : "is-unconfigured"}`}>
        {configured ? t.common.configured : t.common.notConfigured}
      </span>
    </div>
  );
}

function EditableSettingRow({
  item,
  t,
  canManage,
  saving,
  draftValue,
  onDraftChange,
  onSave,
}: {
  item: SettingItem;
  t: Translations;
  canManage: boolean;
  saving: boolean;
  draftValue: string | undefined;
  onDraftChange: (value: string) => void;
  onSave: (value: unknown) => void;
}) {
  const label = settingLabelFor(t, item);

  if (item.valueType === "boolean") {
    const current = item.value === true;
    return (
      <div className="admin-settings-row">
        <div>
          <strong>{label}</strong>
          <span className="admin-settings-key">{item.key}</span>
        </div>
        {canManage ? (
          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={current}
              disabled={saving}
              onChange={(event) => onSave(event.target.checked)}
            />
            {current ? t.common.enabled : t.common.disabled}
          </label>
        ) : (
          <span className="admin-settings-status">{current ? t.common.enabled : t.common.disabled}</span>
        )}
      </div>
    );
  }

  // string (the only other editable type registered today)
  const value = draftValue ?? (typeof item.value === "string" ? item.value : "");
  return (
    <div className="admin-settings-row admin-settings-row-text">
      <label>
        <strong>{label}</strong>
        <span className="admin-settings-key">{item.key}</span>
        {canManage ? (
          <input
            type="text"
            value={value}
            disabled={saving}
            onChange={(event) => onDraftChange(event.target.value)}
          />
        ) : (
          <span className="admin-settings-status">{String(item.value ?? "")}</span>
        )}
      </label>
      {canManage && (
        <button
          className="primary-button"
          type="button"
          disabled={saving}
          onClick={() => onSave(value)}
        >
          {saving ? t.common.saving : t.common.save}
        </button>
      )}
    </div>
  );
}
