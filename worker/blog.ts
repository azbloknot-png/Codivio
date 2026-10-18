/**
 * Phase 8.2 — Admin Blog CRUD.
 *
 * Admin endpoints only (all require RBAC via the existing `authorize()`
 * pipeline — no second authorization mechanism):
 *  - GET    /api/admin/blog-posts       — blog.view — list every post, any status
 *  - GET    /api/admin/blog-posts/:id   — blog.view — one post, any status
 *  - POST   /api/admin/blog-posts       — blog.manage — create
 *  - PATCH  /api/admin/blog-posts/:id   — blog.manage — partial update
 *  - DELETE /api/admin/blog-posts/:id   — blog.manage — delete
 *  - GET    /api/admin/blog-categories  — blog.view — list existing categories
 *    (read-only; creating/editing/deleting a category is Phase 8.3's scope)
 *
 * Phase 8.5 — Public Blog, Post Pages, and Blog Navigation adds two
 * unauthenticated, read-only endpoints (mirrors worker/pages.ts's
 * handlePublicPage exactly: no authorize() call, filters to
 * status = 'published' in the SQL itself, and returns an identical 404 for
 * "slug doesn't exist" and "slug exists but isn't published" so neither
 * response discloses which case it is):
 *  - GET /api/blog-posts       — published posts only, summary fields (no
 *    `content`) — list rendering never needs the full article body.
 *  - GET /api/blog-posts/:slug — one published post, full fields including
 *    `content` (raw Markdown source — the client is responsible for
 *    rendering it through a safe Markdown renderer, see
 *    src/pages/BlogArticleBody.tsx; this endpoint never returns HTML).
 * Neither endpoint ever selects/returns `author_id`, `created_by`, or
 * `updated_by` — `users` has no public-safe display-name column (only
 * `email`, a login credential), so author attribution is deliberately
 * omitted from the public API rather than leaking an admin's email or
 * fabricating a name. Tags and related-tool slugs are also omitted here
 * (not used by any current public rendering) — add them later, alongside a
 * real consumer, rather than speculatively.
 *
 * Mirrors worker/tools.ts's exact shape (authenticate -> authorize ->
 * validate (shared, pure fn) -> explicit field allowlist -> parameterized
 * SQL -> auditLog -> response).
 *
 * Author handling: `author_id` is always set from the authenticated
 * session on create (result.user.id) — never accepted from the request
 * body, exactly like `created_by`/`updated_by`. There is deliberately no
 * author-picker in this phase; reassigning authorship is not part of
 * Phase 8.2's authorized scope.
 *
 * Category handling: `categoryId`, if provided, must reference a real,
 * already-existing `blog_categories` row (resolved via findCategoryById) —
 * no category is ever auto-created by this API, mirroring
 * worker/tools.ts's own category-resolution precedent exactly.
 *
 * Tags: `tagNames` (plain names) are resolved find-or-create against
 * `blog_tags`, then `blog_post_tags` is replaced to match exactly the
 * given set on every create/update — see shared/blog.ts's header comment
 * for why this (and not a full tag-management surface, which stays Phase
 * 8.3's scope) is the right minimum for this phase.
 *
 * Related tools: `relatedToolSlugs` must each reference a real,
 * already-existing `tools` row (resolved via findToolBySlug) — never
 * auto-created, mirroring the category precedent above. `blog_post_related_tools`
 * is replaced to match exactly the given set on every create/update.
 *
 * `category` (TEXT) and `author_name` (TEXT) — the two columns retired in
 * place by migrations/0012_blog_data_model.sql — are never read, written,
 * or exposed by any handler in this file.
 *
 * Mass-assignment protection: every handler explicitly destructures only
 * the fields shared/blog.ts's validator defines, plus category_id (handled
 * separately below). id/created_at/updated_at/author_id/created_by/
 * updated_by/published_at can never be set from the request body,
 * regardless of what a client sends.
 */

import type { Env } from "./types";
import { jsonError } from "./auth";
import { authorize } from "./rbac";
import { auditLog } from "./audit";
import { validateBlogPostInput, type BlogPostStatus } from "../shared/blog";

interface BlogPostRow {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  status: BlogPostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category_id: number | null;
  author_id: number | null;
  scheduled_at: string | null;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  og_image: string;
  created_by: number | null;
  updated_by: number | null;
}

interface CategoryRow {
  id: number;
  name: string;
  slug: string;
}

interface TagRow {
  id: number;
  name: string;
  slug: string;
}

interface ToolRow {
  id: number;
  slug: string;
}

const BLOG_POST_COLUMNS =
  "id, title, slug, excerpt, content, featured_image, status, published_at, created_at, updated_at, " +
  "category_id, author_id, scheduled_at, seo_title, seo_description, canonical_url, og_image, created_by, updated_by";

async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function parseIdParam(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function findBlogPostById(env: Env, id: number): Promise<BlogPostRow | null> {
  return env.DB.prepare(`SELECT ${BLOG_POST_COLUMNS} FROM blog_posts WHERE id = ?`).bind(id).first<BlogPostRow>();
}

async function findBlogPostBySlug(env: Env, slug: string): Promise<BlogPostRow | null> {
  return env.DB.prepare(`SELECT ${BLOG_POST_COLUMNS} FROM blog_posts WHERE slug = ?`).bind(slug).first<BlogPostRow>();
}

async function findCategoryById(env: Env, id: number): Promise<CategoryRow | null> {
  return env.DB.prepare("SELECT id, name, slug FROM blog_categories WHERE id = ?").bind(id).first<CategoryRow>();
}

async function loadCategoryMap(env: Env): Promise<Map<number, CategoryRow>> {
  const rows = await env.DB.prepare("SELECT id, name, slug FROM blog_categories").all<CategoryRow>();
  return new Map(rows.results.map((row) => [row.id, row]));
}

/** Simple, deterministic ASCII slugification for a find-or-create tag
 * name — mirrors the lowercase-hyphenated shape every other slug column
 * in this schema already uses (shared/blog.ts#SLUG_PATTERN). Non-ASCII
 * input collapses to hyphens rather than erroring, since a tag name is
 * free-form prose, unlike a post/tool slug a human types deliberately. */
function slugifyTagName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function findTagBySlug(env: Env, slug: string): Promise<TagRow | null> {
  return env.DB.prepare("SELECT id, name, slug FROM blog_tags WHERE slug = ?").bind(slug).first<TagRow>();
}

/** Resolves each tag name to a real blog_tags row, creating one only when
 * no row with that slug already exists — never duplicates a tag because
 * of casing/whitespace differences in how two different posts typed the
 * same name. */
async function findOrCreateTagIds(env: Env, tagNames: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const name of tagNames) {
    const slug = slugifyTagName(name);
    if (slug.length === 0) continue;
    const existing = await findTagBySlug(env, slug);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const inserted = await env.DB.prepare("INSERT INTO blog_tags (name, slug) VALUES (?, ?)").bind(name, slug).run();
    ids.push(inserted.meta.last_row_id);
  }
  return [...new Set(ids)];
}

/** relatedToolSlugs must each reference a real, already-existing `tools`
 * row — never auto-created (mirrors worker/tools.ts's own "no category is
 * ever auto-created by this API" precedent, applied here to tools). Returns
 * an error string naming the first unknown slug if any is not real. */
async function resolveRelatedToolIds(env: Env, slugs: string[]): Promise<{ ok: true; ids: number[] } | { ok: false; error: string }> {
  const ids: number[] = [];
  for (const slug of slugs) {
    const row = await env.DB.prepare("SELECT id FROM tools WHERE slug = ?").bind(slug).first<Pick<ToolRow, "id">>();
    if (!row) return { ok: false, error: `Related tool "${slug}" does not exist` };
    ids.push(row.id);
  }
  return { ok: true, ids: [...new Set(ids)] };
}

/** Replaces blog_post_tags for a post to match exactly the given tag id
 * set — simplest correct sync for a small per-post list (at most
 * MAX_TAGS from shared/blog.ts), avoiding a more complex diff. */
async function syncPostTags(env: Env, postId: number, tagIds: number[]): Promise<void> {
  await env.DB.prepare("DELETE FROM blog_post_tags WHERE post_id = ?").bind(postId).run();
  for (const tagId of tagIds) {
    await env.DB.prepare("INSERT INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)").bind(postId, tagId).run();
  }
}

async function syncPostRelatedTools(env: Env, postId: number, toolIds: number[]): Promise<void> {
  await env.DB.prepare("DELETE FROM blog_post_related_tools WHERE post_id = ?").bind(postId).run();
  for (const toolId of toolIds) {
    await env.DB.prepare("INSERT INTO blog_post_related_tools (post_id, tool_id) VALUES (?, ?)").bind(postId, toolId).run();
  }
}

async function loadTagNamesForPost(env: Env, postId: number): Promise<string[]> {
  const rows = await env.DB
    .prepare("SELECT t.name FROM blog_post_tags bpt JOIN blog_tags t ON t.id = bpt.tag_id WHERE bpt.post_id = ?")
    .bind(postId)
    .all<{ name: string }>();
  return rows.results.map((row) => row.name);
}

async function loadRelatedToolSlugsForPost(env: Env, postId: number): Promise<string[]> {
  const rows = await env.DB
    .prepare("SELECT t.slug FROM blog_post_related_tools bprt JOIN tools t ON t.id = bprt.tool_id WHERE bprt.post_id = ?")
    .bind(postId)
    .all<{ slug: string }>();
  return rows.results.map((row) => row.slug);
}

function serializeAdminBlogPost(
  row: BlogPostRow,
  categoryRow: CategoryRow | undefined | null,
  tagNames: string[],
  relatedToolSlugs: string[]
) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    featuredImage: row.featured_image,
    status: row.status,
    publishedAt: row.published_at,
    scheduledAt: row.scheduled_at,
    categoryId: row.category_id,
    categoryName: categoryRow?.name ?? null,
    authorId: row.author_id,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    canonicalUrl: row.canonical_url,
    ogImage: row.og_image,
    tagNames,
    relatedToolSlugs,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

/** GET /api/admin/blog-posts — requires blog.view. Real data only — never
 * a fabricated post, count, or statistic. */
export async function handleListBlogPosts(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "blog.view");
  if (!result.ok) return result.response;

  const [rows, categories] = await Promise.all([
    env.DB.prepare(`SELECT ${BLOG_POST_COLUMNS} FROM blog_posts ORDER BY updated_at DESC`).all<BlogPostRow>(),
    loadCategoryMap(env),
  ]);

  const blogPosts = await Promise.all(
    rows.results.map(async (row) => {
      const [tagNames, relatedToolSlugs] = await Promise.all([
        loadTagNamesForPost(env, row.id),
        loadRelatedToolSlugsForPost(env, row.id),
      ]);
      return serializeAdminBlogPost(row, row.category_id ? categories.get(row.category_id) : null, tagNames, relatedToolSlugs);
    })
  );

  return Response.json({ blogPosts });
}

/** GET /api/admin/blog-posts/:id — requires blog.view. */
export async function handleGetBlogPost(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "blog.view");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid blog post id", 400);

  const row = await findBlogPostById(env, id);
  if (!row) return jsonError("Blog post not found", 404);

  const [categoryRow, tagNames, relatedToolSlugs] = await Promise.all([
    row.category_id ? findCategoryById(env, row.category_id) : Promise.resolve(null),
    loadTagNamesForPost(env, row.id),
    loadRelatedToolSlugsForPost(env, row.id),
  ]);
  return Response.json({ blogPost: serializeAdminBlogPost(row, categoryRow, tagNames, relatedToolSlugs) });
}

/** GET /api/admin/blog-categories — requires blog.view. Read-only list of
 * existing categories (so the post editor's category select has real
 * options) — creating/editing/deleting a category is Phase 8.3's scope. */
export async function handleListBlogCategories(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "blog.view");
  if (!result.ok) return result.response;

  const rows = await env.DB.prepare("SELECT id, name, slug FROM blog_categories ORDER BY name ASC").all<CategoryRow>();
  return Response.json({ blogCategories: rows.results });
}

/** Summary shape for the public list — deliberately excludes `content`
 * (never needed to render a card) on top of the author/tag/related-tool
 * omissions documented in this file's header comment. */
function serializePublicBlogPostSummary(row: BlogPostRow, categoryName: string | null) {
  return {
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    featuredImage: row.featured_image,
    publishedAt: row.published_at,
    categoryName,
  };
}

/** Full shape for a single public article — adds `content` (raw Markdown;
 * rendering/sanitization happens client-side, see
 * src/pages/BlogArticleBody.tsx) and the existing SEO fields, still never
 * author/tag/related-tool data (see header comment). */
function serializePublicBlogPost(row: BlogPostRow, categoryName: string | null) {
  return {
    ...serializePublicBlogPostSummary(row, categoryName),
    content: row.content,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    canonicalUrl: row.canonical_url,
    ogImage: row.og_image,
  };
}

/** GET /api/blog-posts — public, unauthenticated. Published posts only
 * (draft/scheduled never selected — status is filtered in SQL, not
 * filtered-after-the-fact in JS, so there is exactly one place that
 * decides public visibility). Real data only: an empty table returns an
 * empty array, never a fabricated sample post. */
export async function handlePublicBlogPosts(_request: Request, env: Env): Promise<Response> {
  const [rows, categories] = await Promise.all([
    env.DB.prepare(`SELECT ${BLOG_POST_COLUMNS} FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC`).all<BlogPostRow>(),
    loadCategoryMap(env),
  ]);

  const blogPosts = rows.results.map((row) =>
    serializePublicBlogPostSummary(row, row.category_id ? categories.get(row.category_id)?.name ?? null : null)
  );

  return Response.json({ blogPosts });
}

/** GET /api/blog-posts/:slug — public, unauthenticated. Mirrors
 * handlePublicPage (worker/pages.ts) exactly: a draft/scheduled post and a
 * genuinely nonexistent slug both return the identical 404, so guessing a
 * real but unpublished slug discloses nothing. */
export async function handlePublicBlogPost(_request: Request, env: Env, slugParam: string): Promise<Response> {
  const slug = decodeURIComponent(slugParam);
  const row = await env.DB.prepare(`SELECT ${BLOG_POST_COLUMNS} FROM blog_posts WHERE slug = ? AND status = 'published'`)
    .bind(slug)
    .first<BlogPostRow>();

  if (!row) return jsonError("Blog post not found", 404);

  const categoryRow = row.category_id ? await findCategoryById(env, row.category_id) : null;
  return Response.json({ blogPost: serializePublicBlogPost(row, categoryRow?.name ?? null) });
}

/** POST /api/admin/blog-posts — requires blog.manage. */
export async function handleCreateBlogPost(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "blog.manage");
  if (!result.ok) return result.response;

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const validation = validateBlogPostInput(body);
  if (!validation.ok) return jsonError(validation.error, 400);

  let categoryRow: CategoryRow | null = null;
  if (validation.value.categoryId !== null) {
    categoryRow = await findCategoryById(env, validation.value.categoryId);
    if (!categoryRow) return jsonError("This category does not exist", 400);
  }

  const relatedTools = await resolveRelatedToolIds(env, validation.value.relatedToolSlugs);
  if (!relatedTools.ok) return jsonError(relatedTools.error, 400);

  const existing = await findBlogPostBySlug(env, validation.value.slug);
  if (existing) return jsonError("A blog post with this slug already exists", 409);

  const now = new Date().toISOString();
  const publishedAt = validation.value.status === "published" ? now : null;

  await env.DB.prepare(
    `INSERT INTO blog_posts
      (title, slug, excerpt, content, featured_image, status, published_at, created_at, updated_at,
       category_id, author_id, scheduled_at, seo_title, seo_description, canonical_url, og_image, created_by, updated_by)
     VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      validation.value.title,
      validation.value.slug,
      validation.value.excerpt,
      validation.value.content,
      validation.value.status,
      publishedAt,
      now,
      now,
      validation.value.categoryId,
      result.user.id,
      validation.value.scheduledAt,
      validation.value.seoTitle,
      validation.value.seoDescription,
      validation.value.canonicalUrl,
      validation.value.ogImage,
      result.user.id,
      result.user.id
    )
    .run();

  const created = await findBlogPostBySlug(env, validation.value.slug);
  if (!created) return jsonError("Blog post was created but could not be re-read", 500);

  const tagIds = await findOrCreateTagIds(env, validation.value.tagNames);
  await Promise.all([syncPostTags(env, created.id, tagIds), syncPostRelatedTools(env, created.id, relatedTools.ids)]);

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "BLOG_POST_CREATED",
    resourceType: "blog_post",
    resourceId: created.id,
    result: "success",
    request,
    metadata: { slug: created.slug, status: created.status },
  });

  const [tagNames, relatedToolSlugs] = await Promise.all([
    loadTagNamesForPost(env, created.id),
    loadRelatedToolSlugsForPost(env, created.id),
  ]);
  return Response.json({ blogPost: serializeAdminBlogPost(created, categoryRow, tagNames, relatedToolSlugs) }, { status: 201 });
}

/** PATCH /api/admin/blog-posts/:id — requires blog.manage. Partial update:
 * only fields present in the body override the existing row; the merged
 * result is validated as a whole, mirroring worker/tools.ts's exact
 * contract. `authorId`/`createdBy` are never changed by an update. */
export async function handleUpdateBlogPost(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "blog.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid blog post id", 400);

  const existing = await findBlogPostById(env, id);
  if (!existing) return jsonError("Blog post not found", 404);

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const [existingTagNames, existingRelatedToolSlugs] = await Promise.all([
    loadTagNamesForPost(env, existing.id),
    loadRelatedToolSlugsForPost(env, existing.id),
  ]);

  const merged: Record<string, unknown> = {
    title: "title" in body ? body.title : existing.title,
    slug: "slug" in body ? body.slug : existing.slug,
    excerpt: "excerpt" in body ? body.excerpt : existing.excerpt,
    content: "content" in body ? body.content : existing.content,
    status: "status" in body ? body.status : existing.status,
    scheduledAt: "scheduledAt" in body ? body.scheduledAt : existing.scheduled_at,
    categoryId: "categoryId" in body ? body.categoryId : existing.category_id,
    featuredImage: "featuredImage" in body ? body.featuredImage : existing.featured_image,
    seoTitle: "seoTitle" in body ? body.seoTitle : existing.seo_title,
    seoDescription: "seoDescription" in body ? body.seoDescription : existing.seo_description,
    canonicalUrl: "canonicalUrl" in body ? body.canonicalUrl : existing.canonical_url,
    ogImage: "ogImage" in body ? body.ogImage : existing.og_image,
    tagNames: "tagNames" in body ? body.tagNames : existingTagNames,
    relatedToolSlugs: "relatedToolSlugs" in body ? body.relatedToolSlugs : existingRelatedToolSlugs,
  };

  const validation = validateBlogPostInput(merged);
  if (!validation.ok) return jsonError(validation.error, 400);

  let categoryRow: CategoryRow | null = null;
  if (validation.value.categoryId !== null) {
    categoryRow = await findCategoryById(env, validation.value.categoryId);
    if (!categoryRow) return jsonError("This category does not exist", 400);
  }

  const relatedTools = await resolveRelatedToolIds(env, validation.value.relatedToolSlugs);
  if (!relatedTools.ok) return jsonError(relatedTools.error, 400);

  if (validation.value.slug !== existing.slug) {
    const clash = await findBlogPostBySlug(env, validation.value.slug);
    if (clash) return jsonError("A blog post with this slug already exists", 409);
  }

  const now = new Date().toISOString();
  const becomingPublished = existing.status !== "published" && validation.value.status === "published";
  const publishedAt = becomingPublished ? now : existing.published_at;

  await env.DB.prepare(
    `UPDATE blog_posts
     SET title = ?, slug = ?, excerpt = ?, content = ?, status = ?, published_at = ?, updated_at = ?,
         category_id = ?, scheduled_at = ?, seo_title = ?, seo_description = ?, canonical_url = ?, og_image = ?,
         featured_image = ?, updated_by = ?
     WHERE id = ?`
  )
    .bind(
      validation.value.title,
      validation.value.slug,
      validation.value.excerpt,
      validation.value.content,
      validation.value.status,
      publishedAt,
      now,
      validation.value.categoryId,
      validation.value.scheduledAt,
      validation.value.seoTitle,
      validation.value.seoDescription,
      validation.value.canonicalUrl,
      validation.value.ogImage,
      validation.value.featuredImage,
      result.user.id,
      id
    )
    .run();

  const updated = await findBlogPostById(env, id);
  if (!updated) return jsonError("Blog post was updated but could not be re-read", 500);

  const tagIds = await findOrCreateTagIds(env, validation.value.tagNames);
  await Promise.all([syncPostTags(env, id, tagIds), syncPostRelatedTools(env, id, relatedTools.ids)]);

  const statusChanged = existing.status !== updated.status;
  const action = statusChanged && updated.status === "published" ? "BLOG_POST_PUBLISHED" : "BLOG_POST_UPDATED";

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action,
    resourceType: "blog_post",
    resourceId: updated.id,
    result: "success",
    request,
    metadata: { slug: updated.slug, status: updated.status },
  });

  const [tagNames, relatedToolSlugs] = await Promise.all([
    loadTagNamesForPost(env, updated.id),
    loadRelatedToolSlugsForPost(env, updated.id),
  ]);
  return Response.json({ blogPost: serializeAdminBlogPost(updated, categoryRow, tagNames, relatedToolSlugs) });
}

/** DELETE /api/admin/blog-posts/:id — requires blog.manage. A published
 * post must be moved out of 'published' status first — mirrors
 * worker/tools.ts#handleDeleteTool's exact safety precedent, avoiding an
 * accidental hard-delete of a post that may currently be live. */
export async function handleDeleteBlogPost(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "blog.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid blog post id", 400);

  const existing = await findBlogPostById(env, id);
  if (!existing) return jsonError("Blog post not found", 404);

  if (existing.status === "published") {
    return jsonError("Unpublish this post (set it to draft) before deleting it", 409);
  }

  await env.DB.prepare("DELETE FROM blog_posts WHERE id = ?").bind(id).run();

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "BLOG_POST_DELETED",
    resourceType: "blog_post",
    resourceId: id,
    result: "success",
    request,
    metadata: { slug: existing.slug },
  });

  return Response.json({ success: true });
}
