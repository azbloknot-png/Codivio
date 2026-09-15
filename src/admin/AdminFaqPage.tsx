import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CircleHelp, Loader2 } from "lucide-react";
import { usePageMeta } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import { hasPermission } from "../../shared/rbac";
import { LANGUAGES, LANGUAGE_NATIVE_NAMES, type Language } from "../../shared/i18n/languages";
import type { FaqScope, FaqStatus } from "../../shared/faq";
import { useAdminUser } from "./AdminApp";

/**
 * Phase 3 Finalization — Admin FAQ Management UI.
 *
 * A list view (real data only) plus a shared create/edit form, driving
 * `site_faqs` via /api/admin/faqs — the same list+editor structure as
 * AdminToolsPage.tsx, reusing its `.admin-pages-table`/`.admin-pages-row`
 * responsive classes rather than introducing new CSS.
 *
 * scope="global" entries are site-wide (no tool); scope="tool" entries
 * belong to one real tool, picked from the live /api/admin/tools list so a
 * typo can never create a dangling reference — the server re-validates this
 * regardless (see worker/faq.ts#toolExists).
 *
 * Editing/creating/activating/deactivating/deleting is gated the same way
 * the server gates it: only a role with faq.manage sees those controls at
 * all (faq.view alone gets a read-only list) — a UX convenience, not the
 * security boundary; every mutation endpoint re-checks faq.manage
 * server-side regardless of what this component renders.
 */

interface AdminFaq {
  id: number;
  scope: FaqScope;
  toolSlug: string | null;
  language: Language;
  question: string;
  answer: string;
  status: FaqStatus;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
}

interface AdminToolOption {
  slug: string;
  name: string;
}

type FaqForm = {
  scope: FaqScope;
  toolSlug: string;
  language: Language;
  question: string;
  answer: string;
  status: FaqStatus;
  sortOrder: number;
};

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; faqs: AdminFaq[] };

type View = { mode: "list" } | { mode: "editor"; faq: AdminFaq | null };

function emptyForm(defaultToolSlug: string): FaqForm {
  return {
    scope: "global",
    toolSlug: defaultToolSlug,
    language: "en",
    question: "",
    answer: "",
    status: "active",
    sortOrder: 0,
  };
}

function describeError(status: number, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do this.";
  if (status === 404) return "This FAQ entry no longer exists.";
  return fallback;
}

export default function AdminFaqPage() {
  const { t } = useLanguage();
  usePageMeta(t.nav.faq, "Manage Codivio's global and tool FAQ entries.");
  const user = useAdminUser();
  const canManage = hasPermission(user.role, "faq.manage");

  const [state, setState] = useState<ListState>({ status: "loading" });
  const [tools, setTools] = useState<AdminToolOption[]>([]);
  const [view, setView] = useState<View>({ mode: "list" });
  const [form, setForm] = useState<FaqForm>(emptyForm(""));
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/admin/faqs");
      if (!response.ok) {
        setState({ status: "error", message: describeError(response.status, "Could not load FAQ entries.") });
        return;
      }
      const data = (await response.json()) as { faqs: AdminFaq[] };
      setState({ status: "ready", faqs: data.faqs });
    } catch {
      setState({ status: "error", message: "Network error loading FAQ entries." });
    }
  }, []);

  const loadTools = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/tools");
      if (!response.ok) return;
      const data = (await response.json()) as { tools: { slug: string; name: string }[] };
      setTools(data.tools.map((tool) => ({ slug: tool.slug, name: tool.name })));
    } catch {
      // The tool picker is a UX convenience only (see file-level note) — if
      // it can't load, scope="tool" entries can still be viewed and edited,
      // just without a slug dropdown.
    }
  }, []);

  useEffect(() => {
    load();
    loadTools();
  }, [load, loadTools]);

  function openCreate() {
    setForm(emptyForm(tools[0]?.slug ?? ""));
    setFormError(null);
    setView({ mode: "editor", faq: null });
  }

  function openEdit(faq: AdminFaq) {
    setForm({
      scope: faq.scope,
      toolSlug: faq.toolSlug ?? tools[0]?.slug ?? "",
      language: faq.language,
      question: faq.question,
      answer: faq.answer,
      status: faq.status,
      sortOrder: faq.sortOrder,
    });
    setFormError(null);
    setView({ mode: "editor", faq });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const editingId = view.mode === "editor" ? view.faq?.id : undefined;
      const payload = {
        scope: form.scope,
        toolSlug: form.scope === "tool" ? form.toolSlug : undefined,
        language: form.language,
        question: form.question,
        answer: form.answer,
        status: form.status,
        sortOrder: form.sortOrder,
      };
      const response = await fetch(editingId ? `/api/admin/faqs/${editingId}` : "/api/admin/faqs", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setFormError(describeError(response.status, body.error ?? "Could not save this FAQ entry."));
        return;
      }
      setView({ mode: "list" });
      await load();
    } catch {
      setFormError("Network error saving this FAQ entry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(faq: AdminFaq, status: FaqStatus) {
    setBusyId(faq.id);
    setRowError(null);
    try {
      const response = await fetch(`/api/admin/faqs/${faq.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setRowError(describeError(response.status, body.error ?? "Could not update this FAQ entry."));
        return;
      }
      await load();
    } catch {
      setRowError("Network error updating this FAQ entry.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(faq: AdminFaq) {
    if (!window.confirm(`Delete "${faq.question}"? This cannot be undone.`)) return;
    setBusyId(faq.id);
    setRowError(null);
    try {
      const response = await fetch(`/api/admin/faqs/${faq.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setRowError(describeError(response.status, body.error ?? "Could not delete this FAQ entry."));
        return;
      }
      await load();
    } catch {
      setRowError("Network error deleting this FAQ entry.");
    } finally {
      setBusyId(null);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="admin-settings-loading" role="status" aria-live="polite">
        <Loader2 className="admin-spinner" size={22} aria-hidden="true" />
        <p>{t.contentAdmin.loadingFaqs}</p>
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
        <h1>{view.faq ? t.contentAdmin.editFaq : t.contentAdmin.newFaq}</h1>
        <form className="contact-form admin-page-form" onSubmit={handleSubmit}>
          <label>
            Scope
            <select
              value={form.scope}
              onChange={(event) => setForm((f) => ({ ...f, scope: event.target.value as FaqScope }))}
            >
              <option value="global">Global (site-wide)</option>
              <option value="tool">Tool-specific</option>
            </select>
          </label>

          {form.scope === "tool" && (
            <label>
              Tool
              {tools.length > 0 ? (
                <select
                  value={form.toolSlug}
                  onChange={(event) => setForm((f) => ({ ...f, toolSlug: event.target.value }))}
                  required
                >
                  {tools.map((tool) => (
                    <option key={tool.slug} value={tool.slug}>
                      {tool.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.toolSlug}
                  onChange={(event) => setForm((f) => ({ ...f, toolSlug: event.target.value }))}
                  placeholder="qr-code-generator"
                  required
                />
              )}
            </label>
          )}

          <label>
            Language
            <select
              value={form.language}
              onChange={(event) => setForm((f) => ({ ...f, language: event.target.value as Language }))}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_NATIVE_NAMES[lang]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Question
            <input
              type="text"
              value={form.question}
              onChange={(event) => setForm((f) => ({ ...f, question: event.target.value }))}
              required
            />
          </label>

          <label>
            Answer
            <textarea
              value={form.answer}
              onChange={(event) => setForm((f) => ({ ...f, answer: event.target.value }))}
              rows={4}
              required
            />
          </label>

          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={form.status === "active"}
              onChange={(event) => setForm((f) => ({ ...f, status: event.target.checked ? "active" : "inactive" }))}
            />
            Active (publicly relevant)
          </label>

          <label>
            Sort order
            <input
              type="number"
              min={0}
              max={9999}
              value={form.sortOrder}
              onChange={(event) => setForm((f) => ({ ...f, sortOrder: Number(event.target.value) }))}
            />
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
        <h1>{t.nav.faq}</h1>
        {canManage && (
          <button className="primary-button" type="button" onClick={openCreate}>
            {t.contentAdmin.newFaq}
          </button>
        )}
      </div>

      {rowError && (
        <div className="admin-auth-error" role="alert">
          {rowError}
        </div>
      )}

      {state.faqs.length === 0 ? (
        <div className="empty-state">
          <CircleHelp size={28} />
          <h2>{t.contentAdmin.noFaqsYet}</h2>
          <p>FAQ entries created here are managed separately from the public FAQ content.</p>
        </div>
      ) : (
        <div className="admin-pages-table admin-tools-table" role="table" aria-label="FAQ entries">
          <div className="admin-pages-row admin-pages-row-head" role="row">
            <span role="columnheader">Question</span>
            <span role="columnheader">Scope</span>
            <span role="columnheader">Language</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Order</span>
            <span role="columnheader">Updated</span>
            <span role="columnheader">Actions</span>
          </div>
          {state.faqs.map((faq) => (
            <div className="admin-pages-row" role="row" key={faq.id}>
              <span data-label="Question" role="cell">
                {faq.question}
              </span>
              <span data-label="Scope" role="cell">
                {faq.scope === "tool" ? `Tool — ${faq.toolSlug}` : "Global"}
              </span>
              <span data-label="Language" role="cell">
                {LANGUAGE_NATIVE_NAMES[faq.language]}
              </span>
              <span data-label="Status" role="cell">
                <span className={`admin-pages-status status-${faq.status}`}>{faq.status}</span>
              </span>
              <span data-label="Order" role="cell">
                {faq.sortOrder}
              </span>
              <span data-label="Updated" role="cell">
                {new Date(faq.updatedAt).toLocaleDateString()}
              </span>
              <span data-label="Actions" role="cell" className="admin-pages-actions">
                {canManage ? (
                  <>
                    <button type="button" onClick={() => openEdit(faq)} disabled={busyId === faq.id}>
                      {t.common.edit}
                    </button>
                    {faq.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(faq, "inactive")}
                        disabled={busyId === faq.id}
                      >
                        {t.common.deactivate}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(faq, "active")}
                        disabled={busyId === faq.id}
                      >
                        {t.common.activate}
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-pages-delete"
                      onClick={() => handleDelete(faq)}
                      disabled={busyId === faq.id}
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
