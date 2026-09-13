/**
 * Phase 2.7 — Settings Foundation.
 *
 * Three endpoints on top of the generic `settings` table (migration 0004):
 *  - GET  /api/settings/public   — no auth; only is_public=1 rows
 *  - GET  /api/admin/settings    — requires settings.view; every row
 *  - PATCH /api/admin/settings   — requires settings.manage; one key at a time
 *
 * The server is authoritative. shared/settings.ts's registry/validation is
 * imported here for real enforcement (not just frontend hinting) — an
 * unregistered key is rejected before it ever reaches a query, and every
 * value is validated against its definition's type/length/range before
 * being stored. True secrets (API keys, OAuth secrets, SMTP passwords)
 * never live in this table — see DECISIONS.md; this foundation only
 * stores non-secret configuration and "is this integration configured"
 * style status flags.
 */

import type { Env } from "./types";
import { jsonError } from "./auth";
import { authorize } from "./rbac";
import { auditLog } from "./audit";
import {
  getSettingDefinition,
  parseSettingValue,
  validateSettingValue,
  type SettingDefinition,
} from "../shared/settings";

interface SettingRow {
  key: string;
  value: string | null;
  value_type: SettingDefinition["valueType"];
  category: string;
  is_public: number;
  description: string;
  updated_at: string;
}

async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function serializeRow(row: SettingRow) {
  return {
    key: row.key,
    value: parseSettingValue(row.value_type, row.value),
    valueType: row.value_type,
    category: row.category,
    isPublic: Boolean(row.is_public),
    description: row.description,
    updatedAt: row.updated_at,
  };
}

/** GET /api/settings/public — intentionally unauthenticated. Only ever
 * reads rows already flagged is_public=1 at the database level; there is
 * no code path here that could accidentally include a private row. */
export async function handlePublicSettings(_request: Request, env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    "SELECT key, value, value_type, category, is_public, description, updated_at FROM settings WHERE is_public = 1 ORDER BY category, key"
  ).all<SettingRow>();

  return Response.json({ settings: result.results.map(serializeRow) });
}

/** GET /api/admin/settings — requires settings.view. Returns every row
 * (both public and private) since the caller has already proven they're
 * allowed to view settings; the public/private split matters for the
 * unauthenticated endpoint above, not for an authorized admin viewer. */
export async function handleGetSettings(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "settings.view");
  if (!result.ok) return result.response;

  const rows = await env.DB.prepare(
    "SELECT key, value, value_type, category, is_public, description, updated_at FROM settings ORDER BY category, key"
  ).all<SettingRow>();

  return Response.json({ settings: rows.results.map(serializeRow) });
}

/** PATCH /api/admin/settings — requires settings.manage. Body: { key, value }
 * for exactly one setting at a time (see DECISIONS.md — deliberately not a
 * batch endpoint, to avoid partial-apply semantics for a foundation this
 * small). Unknown keys and values that fail their definition's validation
 * are rejected with 400, not silently coerced or ignored. */
export async function handlePatchSettings(request: Request, env: Env): Promise<Response> {
  const result = await authorize(request, env, "settings.manage");
  if (!result.ok) return result.response;

  const body = await readJsonBody(request);
  const key = typeof body?.key === "string" ? body.key : null;

  if (!key || !("value" in (body ?? {}))) {
    return jsonError("A 'key' and 'value' are required", 400);
  }

  const definition = getSettingDefinition(key);
  const validation = validateSettingValue(key, body?.value);

  if (!validation.ok) {
    await auditLog(env, {
      actorUserId: result.user.id,
      actorEmail: result.user.email,
      action: "SETTING_UPDATED",
      result: "failure",
      request,
      metadata: { key, reason: validation.error },
    });
    return jsonError(validation.error, 400);
  }

  const updatedAt = new Date().toISOString();
  await env.DB.prepare("UPDATE settings SET value = ?, updated_at = ?, updated_by = ? WHERE key = ?")
    .bind(validation.stored, updatedAt, result.user.id, key)
    .run();

  const row = await env.DB.prepare(
    "SELECT key, value, value_type, category, is_public, description, updated_at FROM settings WHERE key = ?"
  )
    .bind(key)
    .first<SettingRow>();

  // The key is registered (it passed validation), but no row exists to
  // have been updated — a SettingDefinition was added to code without a
  // matching migration seed row. That is a deployment/migration gap, not
  // a client error; fail closed rather than silently inserting an ad-hoc
  // row outside the normal migration process.
  if (!row) {
    return jsonError("Setting is registered but not yet seeded — a migration is missing", 500);
  }

  await auditLog(env, {
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: "SETTING_UPDATED",
    result: "success",
    request,
    metadata: definition?.isSensitive
      ? { key, category: definition.category }
      : { key, category: definition?.category, valueType: definition?.valueType },
  });

  return Response.json({ setting: serializeRow(row) });
}
