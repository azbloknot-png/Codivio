import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { FileText, Loader2 } from "lucide-react";
import { usePageMeta } from "../App";
import { hasPermission } from "../../shared/rbac";
import { useAdminUser } from "./AdminApp";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Phase 2.9 — Pages Management foundation UI.
 *
 * A list view (real data only — "No pages yet" when the table is empty,
 * never fabricated sample rows) plus a single shared create/edit form.
 * Content is plain text throughout: this component never uses
 * dangerouslySetInnerHTML, and never will for page content — see
 * shared/pages.ts and worker/pages.ts for why that's also the server-side
 * security boundary, not just a UI choice.
 *
 * Editing/creating/publishing/deleting is gated the same way the server
 * gates it: only a role with pages.manage sees those controls at all
 * (pages.view alone gets a read-only list) — a UX convenience, not the
 * security boundary; every mutation endpoint re-checks pages.manage
 * server-side regardless of what this component renders.
 */

interface AdminPage {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  status: "draft" | "published" | "archived";
  isIndexable: boolean;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  createdAt: string;
  updatedAt: string;
}

type PageForm = Pick<
  AdminPage,
  | "title"
  | "slug"
  | "description"
  | "content"
  | "status"
  | "isIndexable"
  | "metaTitle"
  | "metaDescription"
  | "canonicalUrl"
>;

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; pages: AdminPage[] };

type View = { mode: "list" } | { mode: "editor"; page: AdminPage | null };

const EMPTY_FORM: PageForm = {
  title: "",
  slug: "",
  description: "",
  content: "",
  status: "draft",
  isIndexable: true,
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
};

function describeError(status: number, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do this.";
  if (status === 404) return "This page no longer exists.";
  return fallback;
}

export default function AdminPagesPage() {
  const { t } = useLanguage();
  usePageMeta(t.nav.pages, "Manage Codivio content pages.");
  const user = useAdminUser();
  const canManage = hasPermission(user.role, "pages.manage");

  const [state, setState] = useState<ListState>({ status: "loading" });
  const [view, setView] = useState<View>({ mode: "list" });
  const [form, setForm] = useState<PageForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/admin/pages");
      if (!response.ok) {
        setState({ status: "error", message: describeError(response.status, "Could not load pages.") });
        return;
      }
      const data = (await response.json()) as { pages: AdminPage[] };
      setState({ status: "ready", pages: data.pages });
    } catch {
      setState({ status: "error", message: "Network error loading pages." });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setView({ mode: "editor", page: null });
  }

  function openEdit(page: AdminPage) {
    setForm({
      title: page.title,
      slug: page.slug,
      description: page.description,
      content: page.content,
      status: page.status,
      isIndexable: page.isIndexable,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      canonicalUrl: page.canonicalUrl,
    });
    setFormError(null);
    setView({ mode: "editor", page });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const editingId = view.mode === "editor" ? view.page?.id : undefined;
      const response = await fetch(editingId ? `/api/admin/pages/${editingId}` : "/api/admin/pages", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setFormError(describeError(response.status, body.error ?? "Could not save this page."));
        return;
      }
      setView({ mode: "list" });
      await load();
    } catch {
      setFormError("Network error saving this page.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(page: AdminPage, status: AdminPage["status"]) {
    setBusyId(page.id);
    setRowError(null);
    try {
      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setRowError(describeError(response.status, body.error ?? "Could not update this page."));
        return;
      }
      await load();
    } catch {
      setRowError("Network error updating this page.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(page: AdminPage) {
    if (!window.confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    setBusyId(page.id);
    setRowError(null);
    try {
      const response = await fetch(`/api/admin/pages/${page.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setRowError(describeError(response.status, body.error ?? "Could not delete this page. Archive published pages before deleting them."));
        return;
      }
      await load();
    } catch {
      setRowError("Network error deleting this page.");
    } finally {
      setBusyId(null);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="admin-settings-loading" role="status" aria-live="polite">
        <Loader2 className="admin-spinner" size={22} aria-hidden="true" />
        <p>{t.contentAdmin.loadingPages}</p>
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
        <h1>{view.page ? t.contentAdmin.editPage : t.contentAdmin.newPage}</h1>
        <form className="contact-form admin-page-form" onSubmit={handleSubmit}>
          <label>
            Title
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
              required
            />
          </label>

          <label>
            Slug
            <input
              type="text"
              value={form.slug}
              onChange={(event) => setForm((f) => ({ ...f, slug: event.target.value }))}
              placeholder="about-us"
              required
            />
          </label>

          <label>
            Description
            <input
              type="text"
              value={form.description}
              onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))}
            />
          </label>

          <label>
            Content
            <textarea
              value={form.content}
              onChange={(event) => setForm((f) => ({ ...f, content: event.target.value }))}
              rows={10}
            />
          </label>

          <label>
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm((f) => ({ ...f, status: event.target.value as AdminPage["status"] }))
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={form.isIndexable}
              onChange={(event) => setForm((f) => ({ ...f, isIndexable: event.target.checked }))}
            />
            Indexable by search engines
          </label>

          <label>
            Meta title
            <input
              type="text"
              value={form.metaTitle}
              onChange={(event) => setForm((f) => ({ ...f, metaTitle: event.target.value }))}
            />
          </label>

          <label>
            Meta description
            <input
              type="text"
              value={form.metaDescription}
              onChange={(event) => setForm((f) => ({ ...f, metaDescription: event.target.value }))}
            />
          </label>

          <label>
            Canonical URL
            <input
              type="text"
              value={form.canonicalUrl}
              onChange={(event) => setForm((f) => ({ ...f, canonicalUrl: event.target.value }))}
              placeholder="https://codivio.online/about-us"
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
        <h1>{t.nav.pages}</h1>
        {canManage && (
          <button className="primary-button" type="button" onClick={openCreate}>
            {t.contentAdmin.newPage}
          </button>
        )}
      </div>

      {rowError && (
        <div className="admin-auth-error" role="alert">
          {rowError}
        </div>
      )}

      {state.pages.length === 0 ? (
        <div className="empty-state">
          <FileText size={28} />
          <h2>{t.contentAdmin.noPagesYet}</h2>
          <p>Create your first page to get started.</p>
        </div>
      ) : (
        <div className="admin-pages-table" role="table" aria-label="Pages">
          <div className="admin-pages-row admin-pages-row-head" role="row">
            <span role="columnheader">Title</span>
            <span role="columnheader">Slug</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Indexable</span>
            <span role="columnheader">Updated</span>
            <span role="columnheader">Actions</span>
          </div>
          {state.pages.map((page) => (
            <div className="admin-pages-row" role="row" key={page.id}>
              <span data-label="Title" role="cell">
                {page.title}
              </span>
              <span data-label="Slug" role="cell" className="admin-settings-key">
                /{page.slug}
              </span>
              <span data-label="Status" role="cell">
                <span className={`admin-pages-status status-${page.status}`}>{page.status}</span>
              </span>
              <span data-label="Indexable" role="cell">
                {page.isIndexable ? t.common.yes : t.common.no}
              </span>
              <span data-label="Updated" role="cell">
                {new Date(page.updatedAt).toLocaleDateString()}
              </span>
              <span data-label="Actions" role="cell" className="admin-pages-actions">
                {canManage ? (
                  <>
                    <button type="button" onClick={() => openEdit(page)} disabled={busyId === page.id}>
                      {t.common.edit}
                    </button>
                    {page.status !== "published" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(page, "published")}
                        disabled={busyId === page.id}
                      >
                        {t.common.publish}
                      </button>
                    )}
                    {page.status === "published" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(page, "draft")}
                        disabled={busyId === page.id}
                      >
                        {t.common.unpublish}
                      </button>
                    )}
                    {page.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(page, "archived")}
                        disabled={busyId === page.id}
                      >
                        {t.common.archive}
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-pages-delete"
                      onClick={() => handleDelete(page)}
                      disabled={busyId === page.id}
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
