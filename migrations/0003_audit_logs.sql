-- D1 migration 0003: Audit Logging foundation (Phase 2.6).
-- Extends the existing `audit_logs` table (defined in migration 0001) —
-- inspected first; no new table was needed, only these columns/indexes.
-- Applied via: wrangler d1 migrations apply <DB_NAME> [--local | --remote]

-- actor_email: a safe snapshot of the acting/attempted email. Needed
-- specifically for failed-login events, where there is no user_id to
-- reference (either the email doesn't exist, or we deliberately don't want
-- to conflate "this account was probed" with "this account acted" by
-- reusing user_id for a failed attempt).
ALTER TABLE audit_logs ADD COLUMN actor_email TEXT;

-- result: a small controlled vocabulary (success | failure | denied |
-- error) so queries like "all failures across any action" don't need to
-- pattern-match action name strings. Defaults to 'success' since most
-- existing call sites (e.g. successful mutations elsewhere in the schema)
-- would otherwise need to pass it explicitly for no reason.
ALTER TABLE audit_logs ADD COLUMN result TEXT NOT NULL DEFAULT 'success';

-- ip_address: populated only from Cloudflare's edge-set CF-Connecting-IP
-- header (not client-spoofable when actually running behind Cloudflare);
-- left NULL when that header is absent (e.g. local dev) rather than
-- falling back to a spoofable header like X-Forwarded-For.
ALTER TABLE audit_logs ADD COLUMN ip_address TEXT;

ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;

-- One index per query pattern named in the Phase 2.6 spec (newest events,
-- actor, action, resource type, result) — five single-column indexes,
-- deliberately not compound, since none of those five patterns were
-- specified as needing to combine.
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);
