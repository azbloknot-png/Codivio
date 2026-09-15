/**
 * Phase 3 Finalization — Admin FAQ Management.
 *
 * Admin endpoints only (all require RBAC via the existing `authorize()`
 * pipeline — no second authorization mechanism), mirroring worker/tools.ts:
 *  - GET    /api/admin/faqs       — faq.view — list every FAQ entry, any status
 *  - GET    /api/admin/faqs/:id   — faq.view — one FAQ entry
 *  - POST   /api/admin/faqs       — faq.manage — create
 *  - PATCH  /api/admin/faqs/:id   — faq.manage — partial update
 *  - DELETE /api/admin/faqs/:id   — faq.manage — delete
 *
 * No public `GET /api/faqs` endpoint exists yet — the public /faq page and
 * Homepage FAQ preview continue to read shared/seo/global-faq.ts's static
 * content unchanged, the same deliberate deferral already documented for
 * Tools Management (worker/tools.ts) and Pages Management (worker/pages.ts).
 *
 * scope="tool" entries are validated against the real `tools` table here
 * (shared/faq.ts cannot do a DB lookup) — a toolSlug that doesn't match a
 * real, existing tool is rejected, the same "no dangling reference" rule
 * worker/tools.ts applies to categories.
 */

import type { Env } from "./types";
import { jsonError } from "./auth";
import { authorize } from "./rbac";
import { auditLog } from "./audit";
import { validateFaqInput, type FaqScope, type FaqStatus } from "../shared/faq";
import type { Language } from "../shared/i18n/languages";

interface FaqRow {
  id: number;
  scope: FaqScope;
  tool_slug: string | null;
  language: Language;
  question: string;
  answer: string;
  status: FaqStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

const FAQ_COLUMNS =
  "id, scope, tool_slug, language, question, answer, status, sort_order, created_at, updated_at, created_by, updated_by";

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

async function findFaqById(env: Env, id: number): Promise<FaqRow | null> {
  return env.DB.prepare(`SELECT ${FAQ_COLUMNS} FROM site_faqs WHERE id = ?`).bind(id).first<FaqRow>();
}

async function toolExists(env: Env, slug: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT id FROM tools WHERE slug = ?").bind(slug).first<{ id: number }>();
  return row !== null;
}

function serializeAdminFaq(row: FaqRow) {
  return {
    id: row.id,
    scope: row.scope,
    toolSlug: row.tool_slug,
    language: row.language,
    question: row.question,
    answer: row.answer,
    status: row.status,
    isActive: row.status === "active",
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

/** GET /api/admin/faqs — requires faq.view. Real data only. */
export async function handleListFaqs(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "faq.view");
  if (!result.ok) return result.response;

  const rows = await env.DB.prepare(
    `SELECT ${FAQ_COLUMNS} FROM site_faqs ORDER BY scope ASC, language ASC, sort_order ASC`
  ).all<FaqRow>();

  return Response.json({ faqs: rows.results.map(serializeAdminFaq) });
}

/** GET /api/admin/faqs/:id — requires faq.view. */
export async function handleGetFaq(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "faq.view");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid FAQ id", 400);

  const row = await findFaqById(env, id);
  if (!row) return jsonError("FAQ entry not found", 404);

  return Response.json({ faq: serializeAdminFaq(row) });
}

/** POST /api/admin/faqs — requires faq.manage. */
export async function handleCreateFaq(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "faq.manage");
  if (!result.ok) return result.response;

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const validation = validateFaqInput(body);
  if (!validation.ok) return jsonError(validation.error, 400);

  if (validation.value.scope === "tool" && validation.value.toolSlug) {
    if (!(await toolExists(env, validation.value.toolSlug))) {
      return jsonError("toolSlug does not match an existing tool", 400);
    }
  }

  const now = new Date().toISOString();
  const insertResult = await env.DB.prepare(
    `INSERT INTO site_faqs
      (scope, tool_slug, language, question, answer, status, sort_order, created_at, updated_at, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      validation.value.scope,
      validation.value.toolSlug,
      validation.value.language,
      validation.value.question,
      validation.value.answer,
      validation.value.status,
      validation.value.sortOrder,
      now,
      now,
      result.user.id,
      result.user.id
    )
    .run();

  const createdId = insertResult.meta.last_row_id;
  const created = typeof createdId === "number" ? await findFaqById(env, createdId) : null;
  if (!created) return jsonError("FAQ entry was created but could not be re-read", 500);

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "FAQ_CREATED",
    resourceType: "faq",
    resourceId: created.id,
    result: "success",
    request,
    metadata: { scope: created.scope, toolSlug: created.tool_slug, language: created.language },
  });

  return Response.json({ faq: serializeAdminFaq(created) }, { status: 201 });
}

/** PATCH /api/admin/faqs/:id — requires faq.manage. Partial update: only
 * fields present in the body override the existing row; the merged result
 * is validated as a whole. Mass-assignment protection is structural — only
 * the named fields below are ever read from `body`. */
export async function handleUpdateFaq(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "faq.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid FAQ id", 400);

  const existing = await findFaqById(env, id);
  if (!existing) return jsonError("FAQ entry not found", 404);

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const merged: Record<string, unknown> = {
    scope: "scope" in body ? body.scope : existing.scope,
    toolSlug: "toolSlug" in body ? body.toolSlug : existing.tool_slug,
    language: "language" in body ? body.language : existing.language,
    question: "question" in body ? body.question : existing.question,
    answer: "answer" in body ? body.answer : existing.answer,
    status: "status" in body ? body.status : existing.status,
    sortOrder: "sortOrder" in body ? body.sortOrder : existing.sort_order,
  };

  const validation = validateFaqInput(merged);
  if (!validation.ok) return jsonError(validation.error, 400);

  if (validation.value.scope === "tool" && validation.value.toolSlug) {
    if (!(await toolExists(env, validation.value.toolSlug))) {
      return jsonError("toolSlug does not match an existing tool", 400);
    }
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE site_faqs
     SET scope = ?, tool_slug = ?, language = ?, question = ?, answer = ?, status = ?, sort_order = ?, updated_at = ?, updated_by = ?
     WHERE id = ?`
  )
    .bind(
      validation.value.scope,
      validation.value.toolSlug,
      validation.value.language,
      validation.value.question,
      validation.value.answer,
      validation.value.status,
      validation.value.sortOrder,
      now,
      result.user.id,
      id
    )
    .run();

  const updated = await findFaqById(env, id);
  if (!updated) return jsonError("FAQ entry was updated but could not be re-read", 500);

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "FAQ_UPDATED",
    resourceType: "faq",
    resourceId: updated.id,
    result: "success",
    request,
    metadata: { scope: updated.scope, toolSlug: updated.tool_slug, language: updated.language, status: updated.status },
  });

  return Response.json({ faq: serializeAdminFaq(updated) });
}

/** DELETE /api/admin/faqs/:id — requires faq.manage. */
export async function handleDeleteFaq(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "faq.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid FAQ id", 400);

  const existing = await findFaqById(env, id);
  if (!existing) return jsonError("FAQ entry not found", 404);

  await env.DB.prepare("DELETE FROM site_faqs WHERE id = ?").bind(id).run();

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "FAQ_DELETED",
    resourceType: "faq",
    resourceId: id,
    result: "success",
    request,
    metadata: { scope: existing.scope, toolSlug: existing.tool_slug, language: existing.language },
  });

  return Response.json({ success: true });
}
