import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePageMeta } from "../App";
import { hasPermission } from "../../shared/rbac";
import { useAdminUser } from "./AdminApp";

/**
 * Phase 2.7 — Settings Foundation UI.
 *
 * Foundation-level only: renders the real settings that exist today
 * (general/system/security, editable; google/advertising/affiliate,
 * read-only "not configured" status) grouped the way the long-term
 * Settings area is planned (General/Branding/Integrations/Security/
 * System — see CLAUDE.md). Branding has no registered settings yet, so it
 * is shown as "Coming soon", honestly, rather than with placeholder
 * fields. No fake data, no fake connection status — every value shown
 * comes from a real GET /api/admin/settings response.
 *
 * Editing is gated the same way the server gates it: only a role with
 * settings.manage sees editable controls at all (settings.view alone gets
 * a read-only view) — but this is a UX convenience, not the security
 * boundary; PATCH /api/admin/settings re-checks settings.manage
 * server-side regardless of what this component renders.
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

  const byCategory = (category: string) => state.settings.filter((s) => s.category === category);
  const general = byCategory("general");
  const system = byCategory("system");
  const security = byCategory("security");
  const integrations = [...byCategory("google"), ...byCategory("advertising"), ...byCategory("affiliate")];

  return (
    <div className="admin-settings-page">
      <h1>Settings</h1>
      <p className="admin-settings-intro">
        {canManage
          ? "Foundation-level configuration. More categories will appear here as later checkpoints add them."
          : "Read-only view — your role can view settings but not change them."}
      </p>

      {saveError && (
        <div className="admin-auth-error" role="alert">
          {saveError}
        </div>
      )}

      <section className="admin-settings-group">
        <h2>General</h2>
        {general.map((item) => (
          <EditableSettingRow
            key={item.key}
            item={item}
            canManage={canManage}
            saving={savingKey === item.key}
            draftValue={drafts[item.key]}
            onDraftChange={(v) => setDrafts((d) => ({ ...d, [item.key]: v }))}
            onSave={(value) => save(item.key, value)}
          />
        ))}
      </section>

      <section className="admin-settings-group">
        <h2>Branding</h2>
        <p className="admin-settings-soon">Coming soon — no branding settings are registered yet.</p>
      </section>

      <section className="admin-settings-group">
        <h2>Integrations</h2>
        {integrations.map((item) => (
          <StatusSettingRow key={item.key} item={item} />
        ))}
      </section>

      <section className="admin-settings-group">
        <h2>Security</h2>
        {security.map((item) => (
          <EditableSettingRow
            key={item.key}
            item={item}
            canManage={canManage}
            saving={savingKey === item.key}
            draftValue={drafts[item.key]}
            onDraftChange={(v) => setDrafts((d) => ({ ...d, [item.key]: v }))}
            onSave={(value) => save(item.key, value)}
          />
        ))}
      </section>

      <section className="admin-settings-group">
        <h2>System</h2>
        {system.map((item) => (
          <EditableSettingRow
            key={item.key}
            item={item}
            canManage={canManage}
            saving={savingKey === item.key}
            draftValue={drafts[item.key]}
            onDraftChange={(v) => setDrafts((d) => ({ ...d, [item.key]: v }))}
            onSave={(value) => save(item.key, value)}
          />
        ))}
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
