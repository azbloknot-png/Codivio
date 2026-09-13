-- Migration 0005 (Phase 2.9 — Pages Management).
--
-- Extends the existing `pages` table (defined in migration 0001) rather
-- than creating a new one — it already had the right shape (id/slug/
-- title/content/status/timestamps) for a CMS-style admin page. Adds the
-- fields the Admin Pages module needs: a short summary/description, the
-- SEO fields the checkpoint requires (meta_title/meta_description/
-- canonical_url/is_indexable), and actor tracking (created_by/updated_by).
--
-- Deliberately NOT wired into the existing (currently unused) `seo_settings`
-- table: that table models richer per-page SEO (Open Graph fields,
-- schema_json, granular robots directives) intended for the Phase 3 SEO
-- system, and joining it in now would require multi-table transactional
-- writes for a foundation checkpoint that only needs four scalar SEO
-- fields. See DECISIONS.md.
--
-- No DB-level CHECK constraint is added for `status` (draft/published/
-- archived) — the same deliberate deferral already applied to
-- `users.role`: SQLite/D1 cannot add a CHECK to an existing column without
-- a full table rebuild. shared/pages.ts#isValidPageStatus fails closed at
-- the application layer instead (see DECISIONS.md).
--
-- Verified empirically against a real SQLite engine (node:sqlite) before
-- finalizing: ALTER TABLE ADD COLUMN ... REFERENCES is accepted, and the
-- foreign key is genuinely enforced once PRAGMA foreign_keys = ON.

ALTER TABLE pages ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE pages ADD COLUMN meta_title TEXT NOT NULL DEFAULT '';
ALTER TABLE pages ADD COLUMN meta_description TEXT NOT NULL DEFAULT '';
ALTER TABLE pages ADD COLUMN canonical_url TEXT NOT NULL DEFAULT '';
ALTER TABLE pages ADD COLUMN is_indexable INTEGER NOT NULL DEFAULT 1;
ALTER TABLE pages ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE pages ADD COLUMN updated_by INTEGER REFERENCES users(id);
