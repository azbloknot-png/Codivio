/**
 * Phase 7.4 — Admin Ad Management.
 *
 * Admin endpoints only (all require RBAC via the existing `authorize()`
 * pipeline — no second authorization mechanism):
 *  - GET    /api/admin/ad-slots       — advertising.view — list every slot
 *  - POST   /api/admin/ad-slots       — advertising.manage — create
 *  - PATCH  /api/admin/ad-slots/:id   — advertising.manage — partial update
 *  - DELETE /api/admin/ad-slots/:id   — advertising.manage — delete
 *    (blocked while status='active' — see handleDeleteAdSlot, mirroring
 *    worker/tools.ts#handleDeleteTool's exact precedent)
 *
 * No single-record `GET /api/admin/ad-slots/:id` endpoint exists — an
 * explicit Phase 7.4 scope decision, not an oversight: the list endpoint's
 * response is the Admin UI's only data need at this scale (3 real
 * placements), so a second endpoint would be unused surface (CLAUDE.md
 * §2's "no unrelated functionality").
 *
 * No public-facing endpoint exists either — real ad rendering (reading
 * these rows to actually decide what to show a visitor) is explicitly
 * deferred, along with wiring `tools.ads_allowed` and advertising consent
 * into that decision — none of that is Phase 7.4's scope.
 *
 * CONTROLLED MODEL, NOT ARBITRARY CODE: every field accepted here comes
 * from shared/ad-slots.ts#validateAdSlotInput's closed allowlists/formats.
 * The existing `ad_slots.code` column is never read, written, or exposed
 * by any handler in this file — see that column's own schema comment.
 *
 * Mass-assignment protection: every handler explicitly destructures only
 * the fields shared/ad-slots.ts's validator defines. id/created_at/
 * updated_at can never be set from the request body, regardless of what a
 * client sends.
 */

import type { Env } from "./types";
import { jsonError } from "./auth";
import { authorize } from "./rbac";
import { auditLog } from "./audit";
import {
  validateAdSlotInput,
  type AdSlotDevice,
  type AdSlotPosition,
  type AdSlotProvider,
  type AdSlotStatus,
} from "../shared/ad-slots";

interface AdSlotRow {
  id: number;
  name: string;
  position: AdSlotPosition;
  device: AdSlotDevice;
  width: number | null;
  height: number | null;
  status: AdSlotStatus;
  priority: number;
  created_at: string;
  updated_at: string;
  provider: AdSlotProvider;
  ad_unit_id: string;
}

const AD_SLOT_COLUMNS =
  "id, name, position, device, width, height, status, priority, created_at, updated_at, provider, ad_unit_id";

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

async function findAdSlotById(env: Env, id: number): Promise<AdSlotRow | null> {
  return env.DB.prepare(`SELECT ${AD_SLOT_COLUMNS} FROM ad_slots WHERE id = ?`).bind(id).first<AdSlotRow>();
}

function serializeAdSlot(row: AdSlotRow) {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    adUnitId: row.ad_unit_id,
    position: row.position,
    device: row.device,
    width: row.width,
    height: row.height,
    priority: row.priority,
    status: row.status,
    isActive: row.status === "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** GET /api/admin/ad-slots — requires advertising.view. Real data only —
 * never a fabricated slot, count, or performance statistic. */
export async function handleListAdSlots(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "advertising.view");
  if (!result.ok) return result.response;

  const rows = await env.DB
    .prepare(`SELECT ${AD_SLOT_COLUMNS} FROM ad_slots ORDER BY position ASC, priority ASC`)
    .all<AdSlotRow>();

  return Response.json({ adSlots: rows.results.map(serializeAdSlot) });
}

/** POST /api/admin/ad-slots — requires advertising.manage. */
export async function handleCreateAdSlot(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "advertising.manage");
  if (!result.ok) return result.response;

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const validation = validateAdSlotInput(body);
  if (!validation.ok) return jsonError(validation.error, 400);

  const now = new Date().toISOString();
  const inserted = await env.DB.prepare(
    `INSERT INTO ad_slots
      (name, position, device, width, height, status, priority, created_at, updated_at, provider, ad_unit_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      validation.value.name,
      validation.value.position,
      validation.value.device,
      validation.value.width,
      validation.value.height,
      validation.value.status,
      validation.value.priority,
      now,
      now,
      validation.value.provider,
      validation.value.adUnitId
    )
    .run();

  const created = await findAdSlotById(env, inserted.meta.last_row_id);
  if (!created) return jsonError("Ad slot was created but could not be re-read", 500);

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "AD_SLOT_CREATED",
    resourceType: "ad_slot",
    resourceId: created.id,
    result: "success",
    request,
    metadata: { position: created.position, provider: created.provider },
  });

  return Response.json({ adSlot: serializeAdSlot(created) }, { status: 201 });
}

/** PATCH /api/admin/ad-slots/:id — requires advertising.manage. Partial
 * update: only fields present in the body override the existing row; the
 * merged result is validated as a whole, mirroring
 * worker/tools.ts#handleUpdateTool's exact contract. */
export async function handleUpdateAdSlot(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "advertising.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid ad slot id", 400);

  const existing = await findAdSlotById(env, id);
  if (!existing) return jsonError("Ad slot not found", 404);

  const body = await readJsonBody(request);
  if (!body) return jsonError("Invalid request body", 400);

  const merged: Record<string, unknown> = {
    name: "name" in body ? body.name : existing.name,
    provider: "provider" in body ? body.provider : existing.provider,
    adUnitId: "adUnitId" in body ? body.adUnitId : existing.ad_unit_id,
    position: "position" in body ? body.position : existing.position,
    device: "device" in body ? body.device : existing.device,
    width: "width" in body ? body.width : existing.width,
    height: "height" in body ? body.height : existing.height,
    priority: "priority" in body ? body.priority : existing.priority,
    status: "status" in body ? body.status : existing.status,
  };

  const validation = validateAdSlotInput(merged);
  if (!validation.ok) return jsonError(validation.error, 400);

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE ad_slots
     SET name = ?, position = ?, device = ?, width = ?, height = ?, status = ?, priority = ?,
         updated_at = ?, provider = ?, ad_unit_id = ?
     WHERE id = ?`
  )
    .bind(
      validation.value.name,
      validation.value.position,
      validation.value.device,
      validation.value.width,
      validation.value.height,
      validation.value.status,
      validation.value.priority,
      now,
      validation.value.provider,
      validation.value.adUnitId,
      id
    )
    .run();

  const updated = await findAdSlotById(env, id);
  if (!updated) return jsonError("Ad slot was updated but could not be re-read", 500);

  const statusChanged = existing.status !== updated.status;
  const action =
    statusChanged && updated.status === "active"
      ? "AD_SLOT_ACTIVATED"
      : statusChanged && updated.status === "inactive"
        ? "AD_SLOT_DEACTIVATED"
        : "AD_SLOT_UPDATED";

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action,
    resourceType: "ad_slot",
    resourceId: updated.id,
    result: "success",
    request,
    metadata: { position: updated.position, status: updated.status },
  });

  return Response.json({ adSlot: serializeAdSlot(updated) });
}

/** DELETE /api/admin/ad-slots/:id — requires advertising.manage. An active
 * slot must be deactivated first — mirrors
 * worker/tools.ts#handleDeleteTool's exact safety precedent, avoiding an
 * accidental hard-delete of a slot that may currently be live on a public
 * page. */
export async function handleDeleteAdSlot(request: Request, env: Env, idParam: string): Promise<Response> {
  const result = await authorize(request, env, "advertising.manage");
  if (!result.ok) return result.response;

  const id = parseIdParam(idParam);
  if (id === null) return jsonError("Invalid ad slot id", 400);

  const existing = await findAdSlotById(env, id);
  if (!existing) return jsonError("Ad slot not found", 404);

  if (existing.status === "active") {
    return jsonError("Deactivate this ad slot before deleting it", 409);
  }

  await env.DB.prepare("DELETE FROM ad_slots WHERE id = ?").bind(id).run();

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "AD_SLOT_DELETED",
    resourceType: "ad_slot",
    resourceId: id,
    result: "success",
    request,
    metadata: { position: existing.position },
  });

  return Response.json({ success: true });
}
