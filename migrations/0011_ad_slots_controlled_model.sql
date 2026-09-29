-- Migration 0011 (Phase 7.4 -- Admin Ad Management).
--
-- Implements the controlled ad-slot model approved in Phase 7.3's
-- zero-code-change architecture audit (see CLAUDE.md §14, DECISIONS.md).
--
-- Adds exactly two columns to the existing, previously-inert `ad_slots`
-- table:
--   - `provider` -- a closed literal allowlist (currently just "adsense",
--     see shared/ad-slots.ts#AD_SLOT_PROVIDERS), validated at the
--     application layer only -- no DB CHECK constraint, matching the
--     already-established convention for `tools.status`/`pages.status`/
--     `plans.status` (D1/SQLite cannot add a CHECK to an existing column
--     without a full table rebuild).
--   - `ad_unit_id` -- a short, format-validated, non-secret configuration
--     string (mirrors src/lib/analytics.ts's GA4 Measurement ID precedent:
--     public-by-design, still never blindly trusted).
--
-- Deliberately does NOT touch `code TEXT`: whether this D1/SQLite
-- environment supports `ALTER TABLE ... DROP COLUMN` was UNKNOWN -- NOT
-- VERIFIED throughout Phase 7.3's audit (no live D1 instance was available
-- to test it), so this migration avoids depending on that capability
-- entirely. `code` is retired IN PLACE: it keeps existing, but
-- shared/ad-slots.ts and worker/ad-slots.ts never read, write, or expose
-- it. This is the smallest-risk path that still fully satisfies the
-- "no free-text executable ad-code field" requirement, without gambling on
-- an unverified DROP COLUMN operation actually working in production.
--
-- Two indexes are added, each justified by a real, already-planned query
-- pattern (mirrors `idx_pages_status`/`idx_tools_category`'s own
-- single-column, real-filter-only convention -- no speculative composite
-- index):
--   - `idx_ad_slots_status` -- the Admin list view filters/displays by
--     status, exactly like Pages/Tools/SEO overrides already do.
--   - `idx_ad_slots_position` -- a future ad-rendering read will look up
--     the active slot(s) for one of the 3 real placements.

ALTER TABLE ad_slots ADD COLUMN provider TEXT NOT NULL DEFAULT '';
ALTER TABLE ad_slots ADD COLUMN ad_unit_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_ad_slots_status ON ad_slots(status);
CREATE INDEX IF NOT EXISTS idx_ad_slots_position ON ad_slots(position);
