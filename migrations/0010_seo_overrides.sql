-- Migration 0010 (Phase 3.15-C — SEO Override Architecture).
--
-- Root cause this addresses: PAGE_SEO (shared/seo/pages.ts) and TOOL_SEO
-- (shared/seo/tools.ts) are compile-time TypeScript constants — there is no
-- D1 row anywhere an admin could edit to change a static page's or a
-- tool's live SEO title/description. The existing `tools.seo_title`/
-- `seo_description` columns (migration 0006) are NOT a substitute: they
-- are single-language (no `language` column) and, per that migration's
-- own comment, were never wired to what the public site/Worker actually
-- renders — reusing them here would mean either dropping multilingual
-- support entirely or altering already-seeded, already-disconnected
-- columns with an unrelated meaning change. Neither is safe or simple.
-- The pre-existing `pages` table cannot represent the 9 built-in static
-- pages at all — they are deliberately NOT rows in `pages`
-- (RESERVED_PAGE_SLUGS in shared/pages.ts protects exactly this
-- boundary), and repurposing it would blur that boundary.
--
-- This migration instead adds one new, purpose-built `seo_overrides`
-- table, following the exact same shape/conventions already established
-- and shipped for `site_faqs` (migration 0009): one row per
-- (entity_type, entity_key, language), an active/inactive status column,
-- and standard created/updated audit columns. It intentionally covers
-- BOTH static pages (entity_type='page', entity_key = a real PAGE_SEO
-- key) and tools (entity_type='tool', entity_key = a real TOOL_SEO slug)
-- in one shared table/API/Worker-lookup, rather than two near-identical
-- tables — the only structural difference between the two entity types is
-- which compile-time dataset validates entity_key, which lives in
-- application code (shared/seo-overrides.ts), not the schema.
--
-- This is deliberately an OVERRIDE layer, not a replacement: PAGE_SEO/
-- TOOL_SEO remain the permanent, always-available fallback. A row's mere
-- existence with status='active' is what makes it take effect; deleting
-- it (or setting status='inactive') is the rollback mechanism — no
-- separate "restore defaults" code path is needed. No seed data is
-- inserted — the table starts empty, since the default (compile-time)
-- values are already correct until an admin deliberately overrides one.
--
-- No DB-level CHECK constraint for entity_type/language/status — the same
-- deliberate deferral already applied to site_faqs.scope/tools.status/
-- pages.status; shared/seo-overrides.ts's isValid* functions fail closed
-- at the application layer instead.

CREATE TABLE IF NOT EXISTS seo_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

-- One override per (entity, language) — a second row for the same page/
-- tool/language would be ambiguous ("which one applies?"); the admin API
-- enforces "create or update the existing row" against this same
-- constraint rather than ever allowing a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_overrides_entity_lang ON seo_overrides(entity_type, entity_key, language);
-- Supports the public Worker's hot-path lookup (exact entity_type +
-- entity_key + language + status='active' match) without a table scan.
CREATE INDEX IF NOT EXISTS idx_seo_overrides_status ON seo_overrides(status);
