import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Newspaper, Loader2 } from "lucide-react";
import { usePageMeta } from "../App";
import { useLanguage } from "../i18n/LanguageContext";
import { hasPermission } from "../../shared/rbac";
import { BLOG_POST_STATUSES } from "../../shared/blog";
import { useAdminUser } from "./AdminApp";

/**
 * Phase 8.2 — Admin Blog CRUD UI.
 *
 * A list view (real data only) plus a shared create/edit form, driving the
 * `blog_posts` D1 table via /api/admin/blog-posts — mirrors
 * src/admin/AdminToolsPage.tsx's exact structure and conventions.
 *
 * Content is authored as Markdown (an explicit Stage 2 decision) — a plain
 * textarea, no rich-text editor and no preview/rendering in this phase (no
 * public render path exists yet to preview against; see shared/blog.ts's
 * own header comment).
 *
 * Category is a `<select>` populated from GET /api/admin/blog-categories
 * (read-only list; creating a category is Phase 8.3's scope — if none
 * exist yet, the select shows only "No category"). Tags and related tools
 * are plain comma-separated text inputs: tags are find-or-created by name
 * server-side (worker/blog.ts), and related tools must match a real,
 * already-existing tool slug (never auto-created) — both are the smallest
 * usable surface for this phase, per shared/blog.ts's own reasoning. A
 * full tag/category *management* page (browse-all, rename, merge) remains
 * Phase 8.3's scope.
 *
 * Author is always the creating user, set server-side — there is no
 * author-picker in this phase (see worker/blog.ts's own comment).
 *
 * Editing/creating/deleting is gated the same way the server gates it:
 * only a role with blog.manage sees those controls at all (blog.view alone
 * gets a read-only list) — a UX convenience, not the security boundary;
 * every mutation endpoint re-checks blog.manage server-side regardless of
 * what this component renders.
 */

const STATUS_LABELS: Record<string, string> = { draft: "Draft", published: "Published", scheduled: "Scheduled" };

interface AdminBlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  status: "draft" | "published" | "scheduled";
  publishedAt: string | null;
  scheduledAt: string | null;
  categoryId: number | null;
  categoryName: string | null;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImage: string;
  tagNames: string[];
  relatedToolSlugs: string[];
  updatedAt: string;
}

interface AdminBlogCategory {
  id: number;
  name: string;
  slug: string;
}

type BlogPostForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: "draft" | "published" | "scheduled";
  scheduledAt: string;
  categoryId: string;
  featuredImage: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImage: string;
  tagNames: string;
  relatedToolSlugs: string;
};

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; blogPosts: AdminBlogPost[] };

type View = { mode: "list" } | { mode: "editor"; blogPost: AdminBlogPost | null };

const EMPTY_FORM: BlogPostForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  status: "draft",
  scheduledAt: "",
  categoryId: "",
  featuredImage: "",
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
  ogImage: "",
  tagNames: "",
  relatedToolSlugs: "",
};

/** "a, b,, c" -> ["a", "b", "c"] — trims, drops empties, matches the plain
 * comma-separated text-input convention this form uses for tags/related
 * tools (no multi-select widget; see this file's own header comment). */
function parseCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function describeError(status: number, fallback: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do this.";
  if (status === 404) return "This blog post no longer exists.";
  return fallback;
}

export default function AdminBlogPage() {
  const { t } = useLanguage();
  usePageMeta(t.nav.blog, "Manage Codivio's blog posts.");
  const user = useAdminUser();
  const canManage = hasPermission(user.role, "blog.manage");

  const [state, setState] = useState<ListState>({ status: "loading" });
  const [view, setView] = useState<View>({ mode: "list" });
  const [form, setForm] = useState<BlogPostForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [categories, setCategories] = useState<AdminBlogCategory[]>([]);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/admin/blog-posts");
      if (!response.ok) {
        setState({ status: "error", message: describeError(response.status, "Could not load blog posts.") });
        return;
      }
      const data = (await response.json()) as { blogPosts: AdminBlogPost[] };
      setState({ status: "ready", blogPosts: data.blogPosts });
    } catch {
      setState({ status: "error", message: "Network error loading blog posts." });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Read-only category list for the editor's <select> — a 403 here (e.g.
    // a role that somehow loses blog.view mid-session) just leaves the
    // dropdown at "No category"; it's not worth a separate error state for
    // a secondary, non-blocking fetch.
    fetch("/api/admin/blog-categories")
      .then((response) => (response.ok ? response.json() : { blogCategories: [] }))
      .then((data: { blogCategories: AdminBlogCategory[] }) => setCategories(data.blogCategories ?? []))
      .catch(() => setCategories([]));
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setView({ mode: "editor", blogPost: null });
  }

  function openEdit(blogPost: AdminBlogPost) {
    setForm({
      title: blogPost.title,
      slug: blogPost.slug,
      excerpt: blogPost.excerpt,
      content: blogPost.content,
      status: blogPost.status,
      scheduledAt: blogPost.scheduledAt ?? "",
      categoryId: blogPost.categoryId === null ? "" : String(blogPost.categoryId),
      featuredImage: blogPost.featuredImage,
      seoTitle: blogPost.seoTitle,
      seoDescription: blogPost.seoDescription,
      canonicalUrl: blogPost.canonicalUrl,
      ogImage: blogPost.ogImage,
      tagNames: blogPost.tagNames.join(", "),
      relatedToolSlugs: blogPost.relatedToolSlugs.join(", "),
    });
    setFormError(null);
    setView({ mode: "editor", blogPost });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const editingId = view.mode === "editor" ? view.blogPost?.id : undefined;
      const payload = {
        ...form,
        scheduledAt: form.scheduledAt || null,
        categoryId: form.categoryId === "" ? null : Number(form.categoryId),
        tagNames: parseCommaList(form.tagNames),
        relatedToolSlugs: parseCommaList(form.relatedToolSlugs),
      };
      const response = await fetch(editingId ? `/api/admin/blog-posts/${editingId}` : "/api/admin/blog-posts", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setFormError(describeError(response.status, body.error ?? "Could not save this blog post."));
        return;
      }
      setView({ mode: "list" });
      await load();
    } catch {
      setFormError("Network error saving this blog post.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(blogPost: AdminBlogPost) {
    if (!window.confirm(`Delete "${blogPost.title}"? This cannot be undone.`)) return;
    setBusyId(blogPost.id);
    setRowError(null);
    try {
      const response = await fetch(`/api/admin/blog-posts/${blogPost.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setRowError(
          describeError(response.status, body.error ?? "Could not delete this blog post. Unpublish it before deleting.")
        );
        return;
      }
      await load();
    } catch {
      setRowError("Network error deleting this blog post.");
    } finally {
      setBusyId(null);
    }
  }

  if (state.status === "loading") {
    return (
      <div className="admin-settings-loading" role="status" aria-live="polite">
        <Loader2 className="admin-spinner" size={22} aria-hidden="true" />
        <p>{t.contentAdmin.loadingBlogPosts}</p>
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
        <h1>{view.blogPost ? t.contentAdmin.editBlogPost : t.contentAdmin.newBlogPost}</h1>
        <p className="admin-settings-key">
          {view.blogPost ? "Author: set to the user who created this post (not reassignable in this phase)." : "Author: you, set automatically on save."}
        </p>
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
              placeholder="how-to-create-a-qr-code"
              required
            />
          </label>

          <label>
            Excerpt
            <input
              type="text"
              value={form.excerpt}
              onChange={(event) => setForm((f) => ({ ...f, excerpt: event.target.value }))}
            />
          </label>

          <label>
            Content (Markdown)
            <textarea
              rows={10}
              value={form.content}
              onChange={(event) => setForm((f) => ({ ...f, content: event.target.value }))}
            />
          </label>

          <label>
            Featured image URL
            <input
              type="text"
              value={form.featuredImage}
              onChange={(event) => setForm((f) => ({ ...f, featuredImage: event.target.value }))}
            />
          </label>

          <label>
            Category
            <select value={form.categoryId} onChange={(event) => setForm((f) => ({ ...f, categoryId: event.target.value }))}>
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tags (comma-separated)
            <input
              type="text"
              value={form.tagNames}
              onChange={(event) => setForm((f) => ({ ...f, tagNames: event.target.value }))}
              placeholder="qr, security"
            />
          </label>

          <label>
            Related tools (comma-separated slugs)
            <input
              type="text"
              value={form.relatedToolSlugs}
              onChange={(event) => setForm((f) => ({ ...f, relatedToolSlugs: event.target.value }))}
              placeholder="qr-code-generator"
            />
          </label>

          <label>
            Status
            <select
              value={form.status}
              onChange={(event) => setForm((f) => ({ ...f, status: event.target.value as BlogPostForm["status"] }))}
            >
              {BLOG_POST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status] ?? status}
                </option>
              ))}
            </select>
          </label>

          {form.status === "scheduled" && (
            <label>
              Scheduled for
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) => setForm((f) => ({ ...f, scheduledAt: event.target.value }))}
                required
              />
            </label>
          )}

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

          <label>
            Canonical URL
            <input
              type="text"
              value={form.canonicalUrl}
              onChange={(event) => setForm((f) => ({ ...f, canonicalUrl: event.target.value }))}
              placeholder="https://codivio.online/blog/..."
            />
          </label>

          <label>
            OG image URL
            <input
              type="text"
              value={form.ogImage}
              onChange={(event) => setForm((f) => ({ ...f, ogImage: event.target.value }))}
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
        <h1>{t.nav.blog}</h1>
        {canManage && (
          <button className="primary-button" type="button" onClick={openCreate}>
            {t.contentAdmin.newBlogPost}
          </button>
        )}
      </div>

      {rowError && (
        <div className="admin-auth-error" role="alert">
          {rowError}
        </div>
      )}

      {state.blogPosts.length === 0 ? (
        <div className="empty-state">
          <Newspaper size={28} />
          <h2>{t.contentAdmin.noBlogPostsYet}</h2>
          <p>Blog posts created here are not yet rendered on the public site.</p>
        </div>
      ) : (
        <div className="admin-pages-table admin-tools-table" role="table" aria-label="Blog posts">
          <div className="admin-pages-row admin-pages-row-head" role="row">
            <span role="columnheader">Title</span>
            <span role="columnheader">Category</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Updated</span>
            <span role="columnheader">Actions</span>
          </div>
          {state.blogPosts.map((blogPost) => (
            <div className="admin-pages-row" role="row" key={blogPost.id}>
              <span data-label="Title" role="cell">
                {blogPost.title}
                <span className="admin-settings-key">/{blogPost.slug}</span>
              </span>
              <span data-label="Category" role="cell">
                {blogPost.categoryName ?? "—"}
              </span>
              <span data-label="Status" role="cell">
                <span className={`admin-pages-status status-${blogPost.status}`}>
                  {STATUS_LABELS[blogPost.status] ?? blogPost.status}
                </span>
              </span>
              <span data-label="Updated" role="cell">
                {new Date(blogPost.updatedAt).toLocaleDateString()}
              </span>
              <span data-label="Actions" role="cell" className="admin-pages-actions">
                {canManage ? (
                  <>
                    <button type="button" onClick={() => openEdit(blogPost)} disabled={busyId === blogPost.id}>
                      {t.common.edit}
                    </button>
                    <button
                      type="button"
                      className="admin-pages-delete"
                      onClick={() => handleDelete(blogPost)}
                      disabled={busyId === blogPost.id}
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
