/**
 * Phase 2.10 — Tools Management foundation.
 *
 * Admin endpoints only (all require RBAC via the existing `authorize()`
 * pipeline — no second authorization mechanism):
 *  - GET    /api/admin/tools       — tools.view — list every tool, any status
 *  - GET    /api/admin/tools/:id   — tools.view — one tool, any status
 *  - POST   /api/admin/tools       — tools.manage — create
 *  - PATCH  /api/admin/tools/:id   — tools.manage — partial update
 *  - DELETE /api/admin/tools/:id   — tools.manage — delete (blocked while
 *    status='active' — see handleDeleteTool)
 *
 * No public `GET /api/tools` endpoint exists yet — a deliberate decision,
 * not an oversight. This checkpoint's public site (Homepage, `/tools`,
 * `/tools/:slug`) continues to read the existing static registry in
 * src/App.tsx unchanged; nothing currently would consume a public tools
 * API, so building one now would be unused surface (see CLAUDE.md §2 —
 * "no unrelated functionality"). See DECISIONS.md for the full reasoning
 * and the documented remaining integration step for a future checkpoint.
 *
 * Category handling: `category` in request/response bodies is always the
 * `categories.slug` value (e.g. "qr"), never the numeric `category_id`.
 * shared/tools.ts#TOOL_CATEGORIES is a broader, forward-looking allowlist
 * of category slugs that may exist one day; a category slug is only
 * actually usable here once a real `categories` row exists for it
 * (resolved via findCategoryBySlug) — no category is ever auto-created by
 * this API.
 *
 * Mass-assignment protection: every handler explicitly destructures only
 * the fields shared/tools.ts's registry defines. id/created_at/updated_at/
 * created_by/updated_by/category_id/component can never be set from the
 * request body, regardless of what a client sends.
 */

import type { Env } from "./types";
import { jsonError } from "./auth";
import { authorize } from "./rbac";
import { auditLog } from "./audit";
import { validateToolInput, type ToolCategory, type ToolStatus, type IconName } from "../shared/tools";

interface ToolRow {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string;
  component: string;
  status: ToolStatus;
  featured: number;
  is_popular: number;
  icon: IconName;
  sort_order: number;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

interface CategoryRow {
  id: number;
  slug: string;
  name: string;
}

const TOOL_COLUMNS =
  "id, category_id, name, slug, description, component, status, featured, is_popular, icon, sort_order, seo_title, seo_description, created_at, updated_at, created_by, updated_by";

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

async function findToolById(env: Env, id: number): Promise<ToolRow | null> {
  return env.DB.prepare(`SELECT ${TOOL_COLUMNS} FROM tools WHERE id = ?`).bind(id).first<ToolRow>();
}

async function findToolBySlug(env: Env, slug: string): Promise<ToolRow | null> {
  return env.DB.prepare(`SELECT ${TOOL_COLUMNS} FROM tools WHERE slug = ?`).bind(slug).first<ToolRow>();
}

async function findCategoryBySlug(env: Env, slug: string): Promise<CategoryRow | null> {
  return env.DB.prepare("SELECT id, slug, name FROM categories WHERE slug = ?").bind(slug).first<CategoryRow>();
}

async function findCategoryById(env: Env, id: number): Promise<CategoryRow | null> {
  return env.DB.prepare("SELECT id, slug, name FROM categories WHERE id = ?").bind(id).first<CategoryRow>();
}

async function loadCategoryMap(env: Env): Promise<Map<number, CategoryRow>> {
  const rows = await env.DB.prepare("SELECT id, slug, name FROM categories").all<CategoryRow>();
  return new Map(rows.results.map((row) => [row.id, row]));
}

function serializeAdminTool(row: ToolRow, category: CategoryRow | undefined) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    category: category?.slug ?? null,
    categoryName: category?.name ?? null,
    icon: row.icon,
    status: row.status,
    isActive: row.status === "active",
    featured: Boolean(row.featured),
    isPopular: Boolean(row.is_popular),
    sortOrder: row.sort_order,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

/** GET /api/admin/tools — requires tools.view. Real data only — never a
 * fabricated tool, count, or statistic. */
export async function handleListTools(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "tools.view");
  if (!result.ok) return result.response;

  const [rows, categories] = await Promise.all([
    env.DB.prepare(`SELECT ${TOOL_COLUMNS} FROM tools ORDER BY category_id ASC, sort_order ASC`).all<ToolRow>(),
    loadCategoryMap(env),
  ]);

  return Response.json({ tools: rows.results.map((row) => serializeAdminTool(row, categories.get(row.category_id))) });
}

/** GET /api/admin/tools/:id — requires tools.view. */
export async function handleGetTool(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "tools.view");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid tool id", 400);

  const row = await findToolById(env, id);
  if (!row) return jsonError("Tool not found", 404);

  const category = await findCategoryById(env, row.category_id);
  return Response.json({ tool: serializeAdminTool(row, category ?? undefined) });
}

/** POST /api/admin/tools — requires tools.manage. */
export async function handleCreateTool(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "tools.manage");
  if (!result.ok) return result.response;

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const validation = validateToolInput(body);
  if (!validation.ok) return jsonError(validation.error, 400);

  const category = await findCategoryBySlug(env, validation.value.category);
  if (!category) return jsonError("This category is not available yet", 400);

  const existing = await findToolBySlug(env, validation.value.slug);
  if (existing) return jsonError("A tool with this slug already exists", 409);

  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO tools
      (category_id, name, slug, description, component, status, featured, is_popular, icon, sort_order,
       seo_title, seo_description, created_at, updated_at, created_by, updated_by)
     VALUES (?, ?, ?, ?, 'ToolPage', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      category.id,
      validation.value.name,
      validation.value.slug,
      validation.value.description,
      validation.value.status,
      validation.value.featured ? 1 : 0,
      validation.value.isPopular ? 1 : 0,
      validation.value.icon,
      validation.value.sortOrder,
      validation.value.seoTitle,
      validation.value.seoDescription,
      now,
      now,
      result.user.id,
      result.user.id
    )
    .run();

  const created = await findToolBySlug(env, validation.value.slug);
  if (!created) return jsonError("Tool was created but could not be re-read", 500);

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "TOOL_CREATED",
    resourceType: "tool",
    resourceId: created.id,
    result: "success",
    request,
    metadata: { slug: created.slug, category: category.slug },
  });

  return Response.json({ tool: serializeAdminTool(created, category) }, { status: 201 });
}

/** PATCH /api/admin/tools/:id — requires tools.manage. Partial update: only
 * fields present in the body override the existing row; the merged result
 * is validated as a whole. Mass-assignment protection is structural — only
 * the named fields below are ever read from `body`. */
export async function handleUpdateTool(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "tools.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid tool id", 400);

  const existing = await findToolById(env, id);
  if (!existing) return jsonError("Tool not found", 404);

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const existingCategory = await findCategoryById(env, existing.category_id);

  const merged: Record<string, unknown> = {
    name: "name" in body ? body.name : existing.name,
    slug: "slug" in body ? body.slug : existing.slug,
    description: "description" in body ? body.description : existing.description,
    category: "category" in body ? body.category : existingCategory?.slug,
    icon: "icon" in body ? body.icon : existing.icon,
    status: "status" in body ? body.status : existing.status,
    featured: "featured" in body ? body.featured : Boolean(existing.featured),
    isPopular: "isPopular" in body ? body.isPopular : Boolean(existing.is_popular),
    sortOrder: "sortOrder" in body ? body.sortOrder : existing.sort_order,
    seoTitle: "seoTitle" in body ? body.seoTitle : existing.seo_title,
    seoDescription: "seoDescription" in body ? body.seoDescription : existing.seo_description,
  };

  const validation = validateToolInput(merged);
  if (!validation.ok) return jsonError(validation.error, 400);

  const category = await findCategoryBySlug(env, validation.value.category);
  if (!category) return jsonError("This category is not available yet", 400);

  if (validation.value.slug !== existing.slug) {
    const clash = await findToolBySlug(env, validation.value.slug);
    if (clash) return jsonError("A tool with this slug already exists", 409);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE tools
     SET name = ?, slug = ?, description = ?, category_id = ?, status = ?, featured = ?, is_popular = ?,
         icon = ?, sort_order = ?, seo_title = ?, seo_description = ?, updated_at = ?, updated_by = ?
     WHERE id = ?`
  )
    .bind(
      validation.value.name,
      validation.value.slug,
      validation.value.description,
      category.id,
      validation.value.status,
      validation.value.featured ? 1 : 0,
      validation.value.isPopular ? 1 : 0,
      validation.value.icon,
      validation.value.sortOrder,
      validation.value.seoTitle,
      validation.value.seoDescription,
      now,
      result.user.id,
      id
    )
    .run();

  const updated = await findToolById(env, id);
  if (!updated) return jsonError("Tool was updated but could not be re-read", 500);

  const statusChanged = existing.status !== updated.status;
  const action =
    statusChanged && updated.status === "active"
      ? "TOOL_ACTIVATED"
      : statusChanged && updated.status === "inactive"
        ? "TOOL_DEACTIVATED"
        : "TOOL_UPDATED";

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action,
    resourceType: "tool",
    resourceId: updated.id,
    result: "success",
    request,
    metadata: { slug: updated.slug, status: updated.status },
  });

  return Response.json({ tool: serializeAdminTool(updated, category) });
}

/** DELETE /api/admin/tools/:id — requires tools.manage. An active tool
 * must be deactivated first (see CLAUDE.md §24 / DECISIONS.md) — avoids an
 * accidental hard-delete of a tool that may be linked from the homepage,
 * routes, or (in a future phase) analytics/SEO/affiliate configuration. */
export async function handleDeleteTool(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "tools.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid tool id", 400);

  const existing = await findToolById(env, id);
  if (!existing) return jsonError("Tool not found", 404);

  if (existing.status === "active") {
    return jsonError("Deactivate this tool before deleting it", 409);
  }

  await env.DB.prepare("DELETE FROM tools WHERE id = ?").bind(id).run();

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "TOOL_DELETED",
    resourceType: "tool",
    resourceId: id,
    result: "success",
    request,
    metadata: { slug: existing.slug },
  });

  return Response.json({ success: true });
}

export type { ToolCategory };
