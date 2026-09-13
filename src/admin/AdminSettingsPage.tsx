import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePageMeta } from "../App";
import { hasPermission } from "../../shared/rbac";
import { useAdminUser } from "./AdminApp";

/**
 * Phase 2.7 Settings Foundation, redesigned in Phase 2.13 into a proper
 * category-tab layout matching the long-term Settings architecture
 * (CLAUDE.md §7 / this checkpoint's spec). Categories with a real,
 * registered setting render it (editable if the setting is editable and
 * the viewer has settings.manage; status-only otherwise). Categories with
 * no registered setting yet render an honest "Coming soon" panel — never
 * a fake toggle or fabricated status. No fake data, no fake connection
 * status — every value shown comes from a real GET /api/admin/settings
 * response.
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

/** One tab per long-term Settings category. `keys` selects which real
 * setting keys (if any) belong on that tab — a tab with an empty list
 * renders as "Coming soon". Google's two "configured" flags are split
 * across Analytics and Search Console here, matching the finer-grained
 * category list this checkpoint asks for (the settings table itself still
 * stores both under the single "google" category — see shared/settings.ts;
 * this split is a presentation grouping only, not a schema change). */
const SETTINGS_TABS: { id: string; label: string; keys: string[]; editable: boolean }[] = [
  { id: "general", label: "General", keys: ["general.site_name", "general.site_description", "general.default_language"], editable: true },
  { id: "branding", label: "Branding", keys: [], editable: false },
  { id: "domain", label: "Domain", keys: [], editable: false },
  { id: "email", label: "Email", keys: [], editable: false },
  { id: "analytics", label: "Analytics", keys: ["google.analytics_configured"], editable: false },
  { id: "search-console", label: "Search Console", keys: ["google.search_console_configured"], editable: false },
  { id: "seo", label: "SEO", keys: [], editable: false },
  { id: "advertising", label: "Advertising", keys: ["advertising.adsense_configured"], editable: false },
  { id: "affiliate", label: "Affiliate", keys: ["affiliate.enabled"], editable: false },
  { id: "social", label: "Social", keys: [], editable: false },
  { id: "payments", label: "Payments", keys: [], editable: false },
  { id: "security", label: "Security", keys: ["security.registration_enabled"], editable: true },
  { id: "backups", label: "Backups", keys: [], editable: false },
  { id: "system", label: "System", keys: ["system.maintenance_mode"], editable: true },
];

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
  usePageMeta("Admin Settings", "Codivio admin settings.");
  const user = useAdminUser();
  const canManage = hasPermission(user.role, "settings.manage");

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [activeTab, setActiveTab] = useState(SETTINGS_TABS[0].id);
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
        <p>Loading settings…</p>
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
  const currentTab = SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0];
  const currentItems = currentTab.keys
    .map((key) => settingsByKey.get(key))
    .filter((item): item is SettingItem => item !== undefined);

  return (
    <div className="admin-settings-page">
      <h1>Settings</h1>
      <p className="admin-settings-intro">
        {canManage
          ? "Foundation-level configuration, organized by the long-term Settings architecture. More categories become real as later checkpoints connect them."
          : "Read-only view — your role can view settings but not change them."}
      </p>

      {saveError && (
        <div className="admin-auth-error" role="alert">
          {saveError}
        </div>
      )}

      <div className="admin-settings-tabs" role="tablist" aria-label="Settings categories">
        {SETTINGS_TABS.map((tab) => (
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
        {currentTab.keys.length === 0 ? (
          <p className="admin-settings-soon">Coming soon — no {currentTab.label.toLowerCase()} settings are registered yet.</p>
        ) : currentItems.length === 0 ? (
          <p className="admin-settings-soon">No settings found for this category.</p>
        ) : (
          currentItems.map((item) =>
            currentTab.editable ? (
              <EditableSettingRow
                key={item.key}
                item={item}
                canManage={canManage}
                saving={savingKey === item.key}
                draftValue={drafts[item.key]}
                onDraftChange={(v) => setDrafts((d) => ({ ...d, [item.key]: v }))}
                onSave={(value) => save(item.key, value)}
              />
            ) : (
              <StatusSettingRow key={item.key} item={item} />
            )
          )
        )}
      </section>
    </div>
  );
}

function StatusSettingRow({ item }: { item: SettingItem }) {
  const configured = item.value === true;
  return (
    <div className="admin-settings-row">
      <div>
        <strong>{item.description}</strong>
        <span className="admin-settings-key">{item.key}</span>
      </div>
      <span className={`admin-settings-status ${configured ? "is-configured" : "is-unconfigured"}`}>
        {configured ? "Configured" : "Not configured"}
      </span>
    </div>
  );
}

function EditableSettingRow({
  item,
  canManage,
  saving,
  draftValue,
  onDraftChange,
  onSave,
}: {
  item: SettingItem;
  canManage: boolean;
  saving: boolean;
  draftValue: string | undefined;
  onDraftChange: (value: string) => void;
  onSave: (value: unknown) => void;
}) {
  if (item.valueType === "boolean") {
    const current = item.value === true;
    return (
      <div className="admin-settings-row">
        <div>
          <strong>{item.description}</strong>
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
            {current ? "Enabled" : "Disabled"}
          </label>
        ) : (
          <span className="admin-settings-status">{current ? "Enabled" : "Disabled"}</span>
        )}
      </div>
    );
  }

  // string (the only other editable type registered today)
  const value = draftValue ?? (typeof item.value === "string" ? item.value : "");
  return (
    <div className="admin-settings-row admin-settings-row-text">
      <label>
        <strong>{item.description}</strong>
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
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}
