/**
 * Phase 2.9 — Pages Management foundation.
 *
 * Admin endpoints (all require RBAC, all use the existing `authorize()`
 * pipeline — no second authorization mechanism):
 *  - GET    /api/admin/pages       — pages.view — list every page, any status
 *  - GET    /api/admin/pages/:id   — pages.view — one page, any status
 *  - POST   /api/admin/pages       — pages.manage — create
 *  - PATCH  /api/admin/pages/:id   — pages.manage — partial update
 *  - DELETE /api/admin/pages/:id   — pages.manage — delete (blocked while
 *    published — see handleDeletePage)
 *
 * Public endpoint (no auth, published-only, enforced at the query level —
 * never by filtering after the fact):
 *  - GET /api/pages/:slug
 *
 * Mass-assignment protection: every handler explicitly destructures only
 * the fields shared/pages.ts's registry defines. id/created_at/updated_at/
 * created_by/updated_by/tool_id/template can never be set from the
 * request body, regardless of what a client sends.
 */

import type { Env } from "./types";
import { jsonError } from "./auth";
import { authorize } from "./rbac";
import { auditLog } from "./audit";
import { validatePageInput, type PageInput, type PageStatus } from "../shared/pages";

interface PageRow {
  id: number;
  title: string;
  slug: string;
  content: string;
  status: PageStatus;
  description: string;
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  is_indexable: number;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

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

function serializeAdminPage(row: PageRow) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    content: row.content,
    status: row.status,
    isIndexable: Boolean(row.is_indexable),
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    canonicalUrl: row.canonical_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

function serializePublicPage(row: PageRow) {
  return {
    title: row.title,
    slug: row.slug,
    description: row.description,
    content: row.content,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    canonicalUrl: row.canonical_url,
    isIndexable: Boolean(row.is_indexable),
  };
}

const PAGE_COLUMNS =
  "id, title, slug, content, status, description, meta_title, meta_description, canonical_url, is_indexable, created_at, updated_at, created_by, updated_by";

async function findPageById(env: Env, id: number): Promise<PageRow | null> {
  return env.DB.prepare(`SELECT ${PAGE_COLUMNS} FROM pages WHERE id = ?`).bind(id).first<PageRow>();
}

async function findPageBySlug(env: Env, slug: string): Promise<PageRow | null> {
  return env.DB.prepare(`SELECT ${PAGE_COLUMNS} FROM pages WHERE slug = ?`).bind(slug).first<PageRow>();
}

/** GET /api/admin/pages — requires pages.view. Real data only: an empty
 * table returns an empty array, never fabricated sample rows. */
export async function handleListPages(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "pages.view");
  if (!result.ok) return result.response;

  const rows = await env.DB.prepare(`SELECT ${PAGE_COLUMNS} FROM pages ORDER BY updated_at DESC`).all<PageRow>();
  return Response.json({ pages: rows.results.map(serializeAdminPage) });
}

/** GET /api/admin/pages/:id — requires pages.view. */
export async function handleGetPage(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "pages.view");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid page id", 400);

  const row = await findPageById(env, id);
  if (!row) return jsonError("Page not found", 404);

  return Response.json({ page: serializeAdminPage(row) });
}

/** POST /api/admin/pages — requires pages.manage. Body fields are
 * explicitly extracted and validated via shared/pages.ts before ever
 * reaching a query; an unregistered/extra field in the body is silently
 * ignored, never stored. */
export async function handleCreatePage(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "pages.manage");
  if (!result.ok) return result.response;

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const validation = validatePageInput(body);
  if (!validation.ok) return jsonError(validation.error, 400);

  const existing = await findPageBySlug(env, validation.value.slug);
  if (existing) return jsonError("A page with this slug already exists", 409);

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO pages
      (title, slug, description, content, status, is_indexable, meta_title, meta_description, canonical_url,
       template, created_at, updated_at, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'page', ?, ?, ?, ?)`
  )
    .bind(
      validation.value.title,
      validation.value.slug,
      validation.value.description,
      validation.value.content,
      validation.value.status,
      validation.value.isIndexable ? 1 : 0,
      validation.value.metaTitle,
      validation.value.metaDescription,
      validation.value.canonicalUrl,
      now,
      now,
      result.user.id,
      result.user.id
    )
    .run();

  const created = await findPageBySlug(env, validation.value.slug);
  if (!created) return jsonError("Page was created but could not be re-read", 500);

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "PAGE_CREATED",
    resourceType: "page",
    resourceId: created.id,
    result: "success",
    request,
    metadata: { slug: created.slug, status: created.status },
  });

  return Response.json({ page: serializeAdminPage(created) }, { status: 201 });
}

/** PATCH /api/admin/pages/:id — requires pages.manage. Partial update:
 * only fields present in the body override the existing row; the merged
 * result is validated as a whole (so, e.g., a status-only update still
 * re-validates the unchanged title/slug rather than trusting stored data
 * blindly). Mass-assignment protection is structural — only the named
 * fields below are ever read from `body`. */
export async function handleUpdatePage(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "pages.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid page id", 400);

  const existing = await findPageById(env, id);
  if (!existing) return jsonError("Page not found", 404);

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const merged: Record<string, unknown> = {
    title: "title" in body ? body.title : existing.title,
    slug: "slug" in body ? body.slug : existing.slug,
    description: "description" in body ? body.description : existing.description,
    content: "content" in body ? body.content : existing.content,
    status: "status" in body ? body.status : existing.status,
    isIndexable: "isIndexable" in body ? body.isIndexable : Boolean(existing.is_indexable),
    metaTitle: "metaTitle" in body ? body.metaTitle : existing.meta_title,
    metaDescription: "metaDescription" in body ? body.metaDescription : existing.meta_description,
    canonicalUrl: "canonicalUrl" in body ? body.canonicalUrl : existing.canonical_url,
  };

  const validation = validatePageInput(merged);
  if (!validation.ok) return jsonError(validation.error, 400);

  if (validation.value.slug !== existing.slug) {
    const clash = await findPageBySlug(env, validation.value.slug);
    if (clash) return jsonError("A page with this slug already exists", 409);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE pages
     SET title = ?, slug = ?, description = ?, content = ?, status = ?, is_indexable = ?,
         meta_title = ?, meta_description = ?, canonical_url = ?, updated_at = ?, updated_by = ?
     WHERE id = ?`
  )
    .bind(
      validation.value.title,
      validation.value.slug,
      validation.value.description,
      validation.value.content,
      validation.value.status,
      validation.value.isIndexable ? 1 : 0,
      validation.value.metaTitle,
      validation.value.metaDescription,
      validation.value.canonicalUrl,
      now,
      result.user.id,
      id
    )
    .run();

  const updated = await findPageById(env, id);
  if (!updated) return jsonError("Page was updated but could not be re-read", 500);

  const statusChanged = existing.status !== updated.status;
  const action =
    statusChanged && updated.status === "published"
      ? "PAGE_PUBLISHED"
      : statusChanged && updated.status === "archived"
        ? "PAGE_ARCHIVED"
        : "PAGE_UPDATED";

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action,
    resourceType: "page",
    resourceId: updated.id,
    result: "success",
    request,
    metadata: { slug: updated.slug, status: updated.status },
  });

  return Response.json({ page: serializeAdminPage(updated) });
}

/** DELETE /api/admin/pages/:id — requires pages.manage. A published page
 * must be archived first (see CLAUDE.md §18 / DECISIONS.md) — this avoids
 * an accidental hard-delete of live, possibly-indexed content. Draft and
 * archived pages can be deleted directly. */
export async function handleDeletePage(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "pages.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid page id", 400);

  const existing = await findPageById(env, id);
  if (!existing) return jsonError("Page not found", 404);

  if (existing.status === "published") {
    return jsonError("Archive this page before deleting it", 409);
  }

  await env.DB.prepare("DELETE FROM pages WHERE id = ?").bind(id).run();

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "PAGE_DELETED",
    resourceType: "page",
    resourceId: id,
    result: "success",
    request,
    metadata: { slug: existing.slug },
  });

  return Response.json({ success: true });
}

/** GET /api/pages/:slug — intentionally unauthenticated. Visibility is
 * enforced at the query level (status = 'published' is part of the WHERE
 * clause, not a post-hoc filter) so a draft/archived page can never leak
 * through this endpoint. A missing or non-published page both return the
 * same generic 404 — this does not reveal whether a draft with that slug
 * exists. */
export async function handlePublicPage(_request: Request, env: Env, slugParam: string): Promise<Response> {
  const slug = decodeURIComponent(slugParam);
  const row = await env.DB.prepare(`SELECT ${PAGE_COLUMNS} FROM pages WHERE slug = ? AND status = 'published'`)
    .bind(slug)
    .first<PageRow>();

  if (!row) return jsonError("Page not found", 404);

  return Response.json({ page: serializePublicPage(row) });
}

export type { PageInput };
