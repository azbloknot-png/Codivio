import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Box, Loader2 } from "lucide-react";
import { usePageMeta } from "../App";
import { hasPermission } from "../../shared/rbac";
import { ICON_NAMES } from "../../shared/tools";
import { useAdminUser } from "./AdminApp";

/**
 * Phase 2.10 — Tools Management foundation UI.
 *
 * A list view (real data only) plus a shared create/edit form, driving the
 * `tools`/`categories` D1 tables via /api/admin/tools. This is the
 * Admin-managed CONFIGURATION surface (name/description/category/icon/
 * active/featured/popular/order/SEO) — separate from the tool
 * IMPLEMENTATION, which still lives entirely in src/App.tsx's static
 * registry and src/pages/ToolPage.tsx. Nothing here changes what the
 * public site renders yet; see DECISIONS.md for the documented remaining
 * integration step.
 *
 * Category options are intentionally the 4 real, already-seeded
 * categories (qr/pdf/image/other) rather than shared/tools.ts's full
 * forward-looking TOOL_CATEGORIES list — offering a category with no real
 * `categories` row would just be a dead-end 400 from the server. Add an
 * option here only once migrations/0006_tools_management.sql's `categories`
 * seed grows a matching row.
 *
 * Editing/creating/activating/deactivating/deleting is gated the same way
 * the server gates it: only a role with tools.manage sees those controls
 * at all (tools.view alone gets a read-only list) — a UX convenience, not
 * the security boundary; every mutation endpoint re-checks tools.manage
 * server-side regardless of what this component renders.
 */

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "qr", label: "QR Tools" },
  { value: "pdf", label: "PDF Tools" },
  { value: "image", label: "Image Tools" },
  { value: "other", label: "Other Tools" },
];

interface AdminTool {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string | null;
  categoryName: string | null;
  icon: string;
  status: "active" | "inactive";
  isActive: boolean;
  featured: boolean;
  isPopular: boolean;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  updatedAt: string;
}

type ToolForm = {
  name: string;
  slug: string;
  description: string;
  category: string;
  icon: string;
  status: "active" | "inactive";
  featured: boolean;
  isPopular: boolean;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
};

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; tools: AdminTool[] };

type View = { mode: "list" } | { mode: "editor"; tool: AdminTool | null };

const EMPTY_FORM: ToolForm = {
  name: "",
  slug: "",
  description: "",
  category: "qr",
  icon: "Box",
  status: "active",
  featured: false,
  isPopular: false,
  sortOrder: 0,
  seoTitle: "",
  seoDescription: "",
};

function describeError(status: number, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do this.";
  if (status === 404) return "This tool no longer exists.";
  return fallback;
}

export default function AdminToolsPage() {
  usePageMeta("Admin Tools", "Manage the Codivio tool registry.");
  const user = useAdminUser();
  const canManage = hasPermission(user.role, "tools.manage");

  const [state, setState] = useState<ListState>({ status: "loading" });
  const [view, setView] = useState<View>({ mode: "list" });
  const [form, setForm] = useState<ToolForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/admin/tools");
      if (!response.ok) {
        setState({ status: "error", message: describeError(response.status, "Could not load tools.") });
        return;
      }
      const data = (await response.json()) as { tools: AdminTool[] };
      setState({ status: "ready", tools: data.tools });
    } catch {
      setState({ status: "error", message: "Network error loading tools." });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setView({ mode: "editor", tool: null });
  }

  function openEdit(tool: AdminTool) {
    setForm({
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      category: tool.category ?? "qr",
      icon: tool.icon,
      status: tool.status,
      featured: tool.featured,
      isPopular: tool.isPopular,
      sortOrder: tool.sortOrder,
      seoTitle: tool.seoTitle,
      seoDescription: tool.seoDescription,
    });
    setFormError(null);
    setView({ mode: "editor", tool });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const editingId = view.mode === "editor" ? view.tool?.id : undefined;
      const response = await fetch(editingId ? `/api/admin/tools/${editingId}` : "/api/admin/tools", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setFormError(describeError(response.status, body.error ?? "Could not save this tool."));
        return;
      }
      setView({ mode: "list" });
      await load();
    } catch {
      setFormError("Network error saving this tool.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(tool: AdminTool, status: "active" | "inactive") {
    setBusyId(tool.id);
    setRowError(null);
    try {
      const response = await fetch(`/api/admin/tools/${tool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setRowError(describeError(response.status, body.error ?? "Could not update this tool."));
        return;
      }
      await load();
    } catch {
      setRowError("Network error updating this tool.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(tool: AdminTool) {
    if (!window.confirm(`Delete "${tool.name}"? This cannot be undone.`)) return;
    setBusyId(tool.id);
    setRowError(null);
    try {
      const response = await fetch(`/api/admin/tools/${tool.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setRowError(
          describeError(response.status, body.error ?? "Could not delete this tool. Deactivate active tools before deleting them.")
        );
        return;
      }
      await load();
    } catch {
      setRowError("Network error deleting this tool.");
    } finally {
      setBusyId(null);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="admin-settings-loading" role="status" aria-live="polite">
        <Loader2 className="admin-spinner" size={22} aria-hidden="true" />
        <p>Loading tools…</p>
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
        <h1>{view.tool ? "Edit tool" : "New tool"}</h1>
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
            Slug
            <input
              type="text"
              value={form.slug}
              onChange={(event) => setForm((f) => ({ ...f, slug: event.target.value }))}
              placeholder="qr-code-generator"
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
            Category
            <select
              value={form.category}
              onChange={(event) => setForm((f) => ({ ...f, category: event.target.value }))}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Icon
            <select value={form.icon} onChange={(event) => setForm((f) => ({ ...f, icon: event.target.value }))}>
              {ICON_NAMES.map((iconName) => (
                <option key={iconName} value={iconName}>
                  {iconName}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={form.status === "active"}
              onChange={(event) => setForm((f) => ({ ...f, status: event.target.checked ? "active" : "inactive" }))}
            />
            Active (publicly available)
          </label>

          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => setForm((f) => ({ ...f, featured: event.target.checked }))}
            />
            Featured on homepage
          </label>

          <label className="admin-settings-toggle">
            <input
              type="checkbox"
              checked={form.isPopular}
              onChange={(event) => setForm((f) => ({ ...f, isPopular: event.target.checked }))}
            />
            Show in Popular Tools
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

          <label>
            SEO title
            <input
              type="text"
              value={form.seoTitle}
              onChange={(event) => setForm((f) => ({ ...f, seoTitle: event.target.value }))}
            />
          </label>

          <label>
            SEO description
            <input
              type="text"
              value={form.seoDescription}
              onChange={(event) => setForm((f) => ({ ...f, seoDescription: event.target.value }))}
            />
          </label>

          {formError && (
            <div className="admin-auth-error" role="alert">
              {formError}
            </div>
          )}

          <div className="admin-page-form-actions">
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="admin-secondary-button"
              type="button"
              onClick={() => setView({ mode: "list" })}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-pages-page">
      <div className="admin-pages-header">
        <h1>Tools</h1>
        {canManage && (
          <button className="primary-button" type="button" onClick={openCreate}>
            New tool
          </button>
        )}
      </div>

      {rowError && (
        <div className="admin-auth-error" role="alert">
          {rowError}
        </div>
      )}

      {state.tools.length === 0 ? (
        <div className="empty-state">
          <Box size={28} />
          <h2>No tools yet</h2>
          <p>Tools created here appear alongside the existing tool registry.</p>
        </div>
      ) : (
        <div className="admin-pages-table admin-tools-table" role="table" aria-label="Tools">
          <div className="admin-pages-row admin-pages-row-head" role="row">
            <span role="columnheader">Tool</span>
            <span role="columnheader">Category</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Featured</span>
            <span role="columnheader">Popular</span>
            <span role="columnheader">Order</span>
            <span role="columnheader">Updated</span>
            <span role="columnheader">Actions</span>
          </div>
          {state.tools.map((tool) => (
            <div className="admin-pages-row" role="row" key={tool.id}>
              <span data-label="Tool" role="cell">
                {tool.name}
                <span className="admin-settings-key">/{tool.slug}</span>
              </span>
              <span data-label="Category" role="cell">
                {tool.categoryName ?? "—"}
              </span>
              <span data-label="Status" role="cell">
                <span className={`admin-pages-status status-${tool.status}`}>{tool.status}</span>
              </span>
              <span data-label="Featured" role="cell">
                {tool.featured ? "Yes" : "No"}
              </span>
              <span data-label="Popular" role="cell">
                {tool.isPopular ? "Yes" : "No"}
              </span>
              <span data-label="Order" role="cell">
                {tool.sortOrder}
              </span>
              <span data-label="Updated" role="cell">
                {new Date(tool.updatedAt).toLocaleDateString()}
              </span>
              <span data-label="Actions" role="cell" className="admin-pages-actions">
                {canManage ? (
                  <>
                    <button type="button" onClick={() => openEdit(tool)} disabled={busyId === tool.id}>
                      Edit
                    </button>
                    {tool.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(tool, "inactive")}
                        disabled={busyId === tool.id}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(tool, "active")}
                        disabled={busyId === tool.id}
                      >
                        Activate
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-pages-delete"
                      onClick={() => handleDelete(tool)}
                      disabled={busyId === tool.id}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <span className="admin-settings-status">View only</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
