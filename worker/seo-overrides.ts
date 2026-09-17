/**
 * Phase 3.15-C — SEO Override Architecture.
 *
 * Admin endpoints (require RBAC via the existing `authorize()` pipeline —
 * no second authorization mechanism), mirroring worker/faq.ts's shape:
 *  - GET    /api/admin/seo-overrides       — seo.view   — list every row
 *  - GET    /api/admin/seo-overrides/:id   — seo.view   — one row
 *  - POST   /api/admin/seo-overrides       — seo.manage — create
 *  - PATCH  /api/admin/seo-overrides/:id   — seo.manage — partial update
 *  - DELETE /api/admin/seo-overrides/:id   — seo.manage — delete (=
 *    rollback to the compile-time PAGE_SEO/TOOL_SEO default)
 *
 * `fetchActiveOverride` (below) is NOT an HTTP endpoint — it is called
 * directly, server-side, from worker/seo-rewrite.ts's public rendering
 * path. There is no public API for reading overrides; the public site
 * only ever sees their *effect* (a rewritten title/description), never a
 * dedicated override-reading endpoint, keeping the admin-management
 * surface and the public-rendering surface architecturally separate,
 * matching worker/faq.ts's own admin-CRUD-vs-handlePublicFaqs split.
 */

import type { Env } from "./types";
import { jsonError } from "./auth";
import { authorize } from "./rbac";
import { auditLog } from "./audit";
import {
  validateSeoOverrideInput,
  type SeoOverrideEntityType,
  type SeoOverrideStatus,
} from "../shared/seo-overrides";
import type { Language } from "../shared/i18n/languages";

interface SeoOverrideRow {
  id: number;
  entity_type: SeoOverrideEntityType;
  entity_key: string;
  language: Language;
  title: string;
  description: string;
  status: SeoOverrideStatus;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

const SEO_OVERRIDE_COLUMNS =
  "id, entity_type, entity_key, language, title, description, status, created_at, updated_at, created_by, updated_by";

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

async function findOverrideById(env: Env, id: number): Promise<SeoOverrideRow | null> {
  return env.DB.prepare(`SELECT ${SEO_OVERRIDE_COLUMNS} FROM seo_overrides WHERE id = ?`).bind(id).first<SeoOverrideRow>();
}

async function findOverrideByEntityLang(
  env: Env,
  entityType: SeoOverrideEntityType,
  entityKey: string,
  language: Language
): Promise<SeoOverrideRow | null> {
  return env.DB.prepare(
    `SELECT ${SEO_OVERRIDE_COLUMNS} FROM seo_overrides WHERE entity_type = ? AND entity_key = ? AND language = ?`
  )
    .bind(entityType, entityKey, language)
    .first<SeoOverrideRow>();
}

function serializeAdminOverride(row: SeoOverrideRow) {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityKey: row.entity_key,
    language: row.language,
    title: row.title,
    description: row.description,
    status: row.status,
    isActive: row.status === "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

/** GET /api/admin/seo-overrides — requires seo.view. Real data only. */
export async function handleListSeoOverrides(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "seo.view");
  if (!result.ok) return result.response;

  const rows = await env.DB.prepare(
    `SELECT ${SEO_OVERRIDE_COLUMNS} FROM seo_overrides ORDER BY entity_type ASC, entity_key ASC, language ASC`
  ).all<SeoOverrideRow>();

  return Response.json({ overrides: rows.results.map(serializeAdminOverride) });
}

/** GET /api/admin/seo-overrides/:id — requires seo.view. */
export async function handleGetSeoOverride(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "seo.view");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid override id", 400);

  const row = await findOverrideById(env, id);
  if (!row) return jsonError("SEO override not found", 404);

  return Response.json({ override: serializeAdminOverride(row) });
}

/**
 * POST /api/admin/seo-overrides — requires seo.manage. Rejects a second
 * row for the same (entityType, entityKey, language) — the unique index
 * (migration 0010) is the ultimate backstop, but this check gives a clear
 * 409 instead of a raw constraint-violation error, and tells the caller to
 * PATCH the existing row (the update-or-create pattern an editing UI
 * naturally wants) instead of failing ambiguously.
 */
export async function handleCreateSeoOverride(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "seo.manage");
  if (!result.ok) return result.response;

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const validation = validateSeoOverrideInput(body);
  if (!validation.ok) return jsonError(validation.error, 400);

  const existing = await findOverrideByEntityLang(
    env,
    validation.value.entityType,
    validation.value.entityKey,
    validation.value.language
  );
  if (existing) {
    return jsonError("An override already exists for this page/tool and language — update it instead", 409);
  }

  const now = new Date().toISOString();
  const insertResult = await env.DB.prepare(
    `INSERT INTO seo_overrides
      (entity_type, entity_key, language, title, description, status, created_at, updated_at, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      validation.value.entityType,
      validation.value.entityKey,
      validation.value.language,
      validation.value.title,
      validation.value.description,
      validation.value.status,
      now,
      now,
      result.user.id,
      result.user.id
    )
    .run();

  const createdId = insertResult.meta.last_row_id;
  const created = typeof createdId === "number" ? await findOverrideById(env, createdId) : null;
  if (!created) return jsonError("SEO override was created but could not be re-read", 500);

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "SEO_OVERRIDE_CREATED",
    resourceType: "seo_override",
    resourceId: created.id,
    result: "success",
    request,
    metadata: { entityType: created.entity_type, entityKey: created.entity_key, language: created.language },
  });

  return Response.json({ override: serializeAdminOverride(created) }, { status: 201 });
}

/** PATCH /api/admin/seo-overrides/:id — requires seo.manage. Partial
 * update: only fields present in the body override the existing row; the
 * merged result is validated as a whole. Mass-assignment protection is
 * structural — only the named fields below are ever read from `body`. */
export async function handleUpdateSeoOverride(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "seo.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid override id", 400);

  const existing = await findOverrideById(env, id);
  if (!existing) return jsonError("SEO override not found", 404);

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const merged: Record<string, unknown> = {
    entityType: "entityType" in body ? body.entityType : existing.entity_type,
    entityKey: "entityKey" in body ? body.entityKey : existing.entity_key,
    language: "language" in body ? body.language : existing.language,
    title: "title" in body ? body.title : existing.title,
    description: "description" in body ? body.description : existing.description,
    status: "status" in body ? body.status : existing.status,
  };

  const validation = validateSeoOverrideInput(merged);
  if (!validation.ok) return jsonError(validation.error, 400);

  // If the (entityType, entityKey, language) triple changed, guard against
  // colliding with a *different* existing row (the unique index would
  // reject it anyway, but with an opaque D1 error rather than a clear 409).
  const collision = await findOverrideByEntityLang(
    env,
    validation.value.entityType,
    validation.value.entityKey,
    validation.value.language
  );
  if (collision && collision.id !== id) {
    return jsonError("An override already exists for this page/tool and language", 409);
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE seo_overrides
     SET entity_type = ?, entity_key = ?, language = ?, title = ?, description = ?, status = ?, updated_at = ?, updated_by = ?
     WHERE id = ?`
  )
    .bind(
      validation.value.entityType,
      validation.value.entityKey,
      validation.value.language,
      validation.value.title,
      validation.value.description,
      validation.value.status,
      now,
      result.user.id,
      id
    )
    .run();

  const updated = await findOverrideById(env, id);
  if (!updated) return jsonError("SEO override was updated but could not be re-read", 500);

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "SEO_OVERRIDE_UPDATED",
    resourceType: "seo_override",
    resourceId: updated.id,
    result: "success",
    request,
    metadata: { entityType: updated.entity_type, entityKey: updated.entity_key, language: updated.language, status: updated.status },
  });

  return Response.json({ override: serializeAdminOverride(updated) });
}

/** DELETE /api/admin/seo-overrides/:id — requires seo.manage. This is the
 * rollback mechanism: deleting a row makes the affected page/tool/language
 * immediately fall back to its compile-time PAGE_SEO/TOOL_SEO default on
 * the very next request — no separate "restore defaults" code path. */
export async function handleDeleteSeoOverride(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "seo.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid override id", 400);

  const existing = await findOverrideById(env, id);
  if (!existing) return jsonError("SEO override not found", 404);

  await env.DB.prepare("DELETE FROM seo_overrides WHERE id = ?").bind(id).run();

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "SEO_OVERRIDE_DELETED",
    resourceType: "seo_override",
    resourceId: id,
    result: "success",
    request,
    metadata: { entityType: existing.entity_type, entityKey: existing.entity_key, language: existing.language },
  });

  return Response.json({ success: true });
}

export interface ActiveOverride {
  title: string;
  description: string;
}

/**
 * Server-internal only (not an HTTP handler) — called from
 * worker/seo-rewrite.ts's public rendering path to look up an active
 * override for one (entityType, entityKey, language), or `null` if none
 * exists (or is inactive). Callers MUST treat any thrown error as "no
 * override" and fall back to the compile-time default — this function
 * itself does not catch D1 errors, so the existing public rendering
 * pipeline never regresses to a broken page just because D1 is slow,
 * unavailable, or the table doesn't exist yet in some environment.
 */
export async function fetchActiveOverride(
  env: Env,
  entityType: SeoOverrideEntityType,
  entityKey: string,
  language: Language
): Promise<ActiveOverride | null> {
  const row = await env.DB.prepare(
    `SELECT title, description FROM seo_overrides
     WHERE entity_type = ? AND entity_key = ? AND language = ? AND status = 'active'`
  )
    .bind(entityType, entityKey, language)
    .first<ActiveOverride>();
  return row;
}
