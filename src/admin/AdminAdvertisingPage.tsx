import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import { usePageMeta } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import { hasPermission } from "../../shared/rbac";
import { AD_SLOT_PROVIDERS, AD_SLOT_POSITIONS, AD_SLOT_DEVICES } from "../../shared/ad-slots";
import { useAdminUser } from "./AdminApp";

/**
 * Phase 7.4 — Admin Ad Management UI.
 *
 * A list view (real data only) plus a shared create/edit form, driving the
 * `ad_slots` D1 table via /api/admin/ad-slots — mirrors
 * src/admin/AdminToolsPage.tsx's exact structure and conventions.
 *
 * CONTROLLED MODEL, NOT ARBITRARY CODE (CLAUDE.md §14): the form exposes
 * only closed dropdowns (provider/position/device/status) and short,
 * validated text/number fields (name, ad unit ID, width/height, priority).
 * There is deliberately no textarea, rich-text field, or code editor here —
 * an ad slot's actual creative/script is never entered through this page.
 *
 * No AdSense script is loaded by this page or triggered by any action on
 * it — configuring a slot's data here never activates advertising consent
 * or real ad serving (both remain out of Phase 7.4's scope).
 *
 * Editing/creating/activating/deactivating/deleting is gated the same way
 * the server gates it: only a role with advertising.manage sees those
 * controls at all (advertising.view alone gets a read-only list) — a UX
 * convenience, not the security boundary; every mutation endpoint
 * re-checks advertising.manage server-side regardless of what this
 * component renders.
 */

const PROVIDER_LABELS: Record<string, string> = { adsense: "AdSense" };
const POSITION_LABELS: Record<string, string> = {
  "homepage-hero": "Homepage — hero",
  "homepage-mid": "Homepage — mid-page",
  "blog-page": "Blog page",
};
const DEVICE_LABELS: Record<string, string> = { all: "All devices", desktop: "Desktop", mobile: "Mobile" };

interface AdminAdSlot {
  id: number;
  name: string;
  provider: string;
  adUnitId: string;
  position: string;
  device: string;
  width: number | null;
  height: number | null;
  priority: number;
  status: "active" | "inactive";
  isActive: boolean;
  updatedAt: string;
}

type AdSlotForm = {
  name: string;
  provider: string;
  adUnitId: string;
  position: string;
  device: string;
  width: string;
  height: string;
  priority: number;
  status: "active" | "inactive";
};

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; adSlots: AdminAdSlot[] };

type View = { mode: "list" } | { mode: "editor"; adSlot: AdminAdSlot | null };

const EMPTY_FORM: AdSlotForm = {
  name: "",
  provider: AD_SLOT_PROVIDERS[0],
  adUnitId: "",
  position: AD_SLOT_POSITIONS[0],
  device: "all",
  width: "",
  height: "",
  priority: 0,
  status: "active",
};

function describeError(status: number, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do this.";
  if (status === 404) return "This ad slot no longer exists.";
  return fallback;
}

function toFormNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default function AdminAdvertisingPage() {
  const { t } = useLanguage();
  usePageMeta(t.nav.advertising, "Manage Codivio's controlled ad-slot configuration.");
  const user = useAdminUser();
  const canManage = hasPermission(user.role, "advertising.manage");

  const [state, setState] = useState<ListState>({ status: "loading" });
  const [view, setView] = useState<View>({ mode: "list" });
  const [form, setForm] = useState<AdSlotForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/admin/ad-slots");
      if (!response.ok) {
        setState({ status: "error", message: describeError(response.status, "Could not load ad slots.") });
        return;
      }
      const data = (await response.json()) as { adSlots: AdminAdSlot[] };
      setState({ status: "ready", adSlots: data.adSlots });
    } catch {
      setState({ status: "error", message: "Network error loading ad slots." });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setView({ mode: "editor", adSlot: null });
  }

  function openEdit(adSlot: AdminAdSlot) {
    setForm({
      name: adSlot.name,
      provider: adSlot.provider,
      adUnitId: adSlot.adUnitId,
      position: adSlot.position,
      device: adSlot.device,
      width: adSlot.width === null ? "" : String(adSlot.width),
      height: adSlot.height === null ? "" : String(adSlot.height),
      priority: adSlot.priority,
      status: adSlot.status,
    });
    setFormError(null);
    setView({ mode: "editor", adSlot });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const editingId = view.mode === "editor" ? view.adSlot?.id : undefined;
      const payload = {
        name: form.name,
        provider: form.provider,
        adUnitId: form.adUnitId,
        position: form.position,
        device: form.device,
        width: toFormNumber(form.width) ?? null,
        height: toFormNumber(form.height) ?? null,
        priority: form.priority,
        status: form.status,
      };
      const response = await fetch(editingId ? `/api/admin/ad-slots/${editingId}` : "/api/admin/ad-slots", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setFormError(describeError(response.status, body.error ?? "Could not save this ad slot."));
        return;
      }
      setView({ mode: "list" });
      await load();
    } catch {
      setFormError("Network error saving this ad slot.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(adSlot: AdminAdSlot, status: "active" | "inactive") {
    setBusyId(adSlot.id);
    setRowError(null);
    try {
      const response = await fetch(`/api/admin/ad-slots/${adSlot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setRowError(describeError(response.status, body.error ?? "Could not update this ad slot."));
        return;
      }
      await load();
    } catch {
      setRowError("Network error updating this ad slot.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(adSlot: AdminAdSlot) {
    if (!window.confirm(`Delete "${adSlot.name}"? This cannot be undone.`)) return;
    setBusyId(adSlot.id);
    setRowError(null);
    try {
      const response = await fetch(`/api/admin/ad-slots/${adSlot.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setRowError(
          describeError(response.status, body.error ?? "Could not delete this ad slot. Deactivate active slots before deleting them.")
        );
        return;
      }
      await load();
    } catch {
      setRowError("Network error deleting this ad slot.");
    } finally {
      setBusyId(null);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="admin-settings-loading" role="status" aria-live="polite">
        <Loader2 className="admin-spinner" size={22} aria-hidden="true" />
        <p>{t.contentAdmin.loadingAdSlots}</p>
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

  if (view.mode === "editor") {
    return (
      <div className="admin-pages-page">
        <h1>{view.adSlot ? t.contentAdmin.editAdSlot : t.contentAdmin.newAdSlot}</h1>
        <form className="contact-form admin-page-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              required
            />
          </label>

          <label>
            Provider
            <select value={form.provider} onChange={(event) => setForm((f) => ({ ...f, provider: event.target.value }))}>
              {AD_SLOT_PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {PROVIDER_LABELS[provider] ?? provider}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ad unit ID
            <input
              type="text"
              value={form.adUnitId}
              onChange={(event) => setForm((f) => ({ ...f, adUnitId: event.target.value }))}
              placeholder="Not configured yet"
            />
          </label>

          <label>
            Position
            <select value={form.position} onChange={(event) => setForm((f) => ({ ...f, position: event.target.value }))}>
              {AD_SLOT_POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {POSITION_LABELS[position] ?? position}
                </option>
              ))}
            </select>
          </label>

          <label>
            Device
            <select value={form.device} onChange={(event) => setForm((f) => ({ ...f, device: event.target.value }))}>
              {AD_SLOT_DEVICES.map((device) => (
                <option key={device} value={device}>
                  {DEVICE_LABELS[device] ?? device}
                </option>
              ))}
            </select>
          </label>

          <label>
            Width (px)
            <input
              type="number"
              min={1}
              max={4000}
              value={form.width}
              onChange={(event) => setForm((f) => ({ ...f, width: event.target.value }))}
            />
          </label>

          <label>
            Height (px)
            <input
              type="number"
              min={1}
              max={4000}
              value={form.height}
              onChange={(event) => setForm((f) => ({ ...f, height: event.target.value }))}
            />
          </label>

          <label>
            Priority
            <input
              type="number"
              min={0}
              max={9999}
              value={form.priority}
              onChange={(event) => setForm((f) => ({ ...f, priority: Number(event.target.value) }))}
            />
          </label>

          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={form.status === "active"}
              onChange={(event) => setForm((f) => ({ ...f, status: event.target.checked ? "active" : "inactive" }))}
            />
            Active
          </label>

          {formError && (
            <div className="admin-auth-error" role="alert">
              {formError}
            </div>
          )}

          <div className="admin-page-form-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? t.common.saving : t.common.save}
            </button>
            <button
              className="admin-secondary-button"
              type="button"
              onClick={() => setView({ mode: "list" })}
              disabled={saving}
            >
              {t.common.cancel}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-pages-page">
      <div className="admin-pages-header">
        <h1>{t.nav.advertising}</h1>
        {canManage && (
          <button className="primary-button" type="button" onClick={openCreate}>
            {t.contentAdmin.newAdSlot}
          </button>
        )}
      </div>

      {rowError && (
        <div className="admin-auth-error" role="alert">
          {rowError}
        </div>
      )}

      {state.adSlots.length === 0 ? (
        <div className="empty-state">
          <Megaphone size={28} />
          <h2>{t.contentAdmin.noAdSlotsYet}</h2>
          <p>Ad slots created here describe controlled placement configuration only — never raw ad code.</p>
        </div>
      ) : (
        <div className="admin-pages-table admin-tools-table" role="table" aria-label="Ad slots">
          <div className="admin-pages-row admin-pages-row-head" role="row">
            <span role="columnheader">Name</span>
            <span role="columnheader">Position</span>
            <span role="columnheader">Device</span>
            <span role="columnheader">Provider</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Updated</span>
            <span role="columnheader">Actions</span>
          </div>
          {state.adSlots.map((adSlot) => (
            <div className="admin-pages-row" role="row" key={adSlot.id}>
              <span data-label="Name" role="cell">
                {adSlot.name}
              </span>
              <span data-label="Position" role="cell">
                {POSITION_LABELS[adSlot.position] ?? adSlot.position}
              </span>
              <span data-label="Device" role="cell">
                {DEVICE_LABELS[adSlot.device] ?? adSlot.device}
              </span>
              <span data-label="Provider" role="cell">
                {PROVIDER_LABELS[adSlot.provider] ?? adSlot.provider}
              </span>
              <span data-label="Status" role="cell">
                <span className={`admin-pages-status status-${adSlot.status}`}>{adSlot.status}</span>
              </span>
              <span data-label="Updated" role="cell">
                {new Date(adSlot.updatedAt).toLocaleDateString()}
              </span>
              <span data-label="Actions" role="cell" className="admin-pages-actions">
                {canManage ? (
                  <>
                    <button type="button" onClick={() => openEdit(adSlot)} disabled={busyId === adSlot.id}>
                      {t.common.edit}
                    </button>
                    {adSlot.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(adSlot, "inactive")}
                        disabled={busyId === adSlot.id}
                      >
                        {t.common.deactivate}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(adSlot, "active")}
                        disabled={busyId === adSlot.id}
                      >
                        {t.common.activate}
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-pages-delete"
                      onClick={() => handleDelete(adSlot)}
                      disabled={busyId === adSlot.id}
                    >
                      {t.common.delete}
                    </button>
                  </>
                ) : (
                  <span className="admin-settings-status">{t.common.viewOnly}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
