-- Migration 0007 (Phase 3.14 — Free Tool -> Premium Monetization Funnel).
--
-- Adds the SMALLEST correct database foundation for a future Free/Pro/
-- Business/API model, matching shared/monetization/*.ts's plan and
-- entitlement catalog exactly (see DECISIONS.md's Phase 3.14 entry for
-- the full reasoning). Two things this migration deliberately does NOT
-- do, and why:
--
--   1. No `user_entitlements` or `subscriptions` table. Codivio has no
--      public/customer account system today -- `users` (migration 0001)
--      is the ADMIN account table (Super Admin/Admin/Editor/Analyst),
--      not a customer identity. A table describing "which plan a user
--      has" cannot mean anything real without a customer identity to
--      attach it to; creating one now would be schema with no way to be
--      genuinely populated, not a foundation. This is documented as a
--      HIGH-importance new finding for a future phase.
--   2. No `usage_events` table. No tool has real processing yet (every
--      tool page renders the Phase 2 "coming soon" placeholder), so there
--      is no real usage event this table could ever legitimately hold.
--
-- What this migration DOES add:
--   - `plans`: the FREE/PRO/BUSINESS/API catalog as admin-configurable
--     business data (display name, description, pricing, priority,
--     visibility, upgrade target) -- mirrors shared/monetization/plans.ts
--     exactly. Pricing columns are NULL (genuinely undecided), never a
--     placeholder number.
--   - `plan_entitlements`: which entitlement conceptually belongs to
--     which plan, with an honest status per row -- mirrors
--     shared/monetization/entitlements.ts's ENTITLEMENT_MINIMUM_PLAN
--     exactly. Every row's status is 'planned' or 'not_available' today;
--     none is 'available', since nothing is actually enforced yet.
--   - `tools` gains monetization metadata columns, matching
--     shared/monetization/tool-monetization.ts's ToolMonetizationMetadata
--     shape exactly, defaulted to the same honest, uniform values that
--     function returns for every tool today (nothing is monetizable,
--     nothing is enforced, every tool defaults to the 'free' plan).
--
-- No CHECK constraint on `plans.status`/`plan_entitlements.status`/
-- `tools.risk_level`/`tools.required_plan` -- same deliberate deferral
-- already applied to `users.role`/`pages.status`/`tools.status`
-- (SQLite/D1 cannot add a CHECK to an existing column without a full
-- table rebuild). Application-layer validation lives in
-- shared/monetization/types.ts's literal union types.

CREATE TABLE IF NOT EXISTS plans (
  plan_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  description TEXT NOT NULL DEFAULT '',
  pricing_amount REAL,
  pricing_currency TEXT,
  pricing_period TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  upgrade_target TEXT REFERENCES plans(plan_key),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_entitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_key TEXT NOT NULL REFERENCES plans(plan_key),
  entitlement_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_available',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (plan_key, entitlement_key)
);

ALTER TABLE tools ADD COLUMN monetizable INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tools ADD COLUMN ads_allowed INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tools ADD COLUMN affiliate_allowed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tools ADD COLUMN policy_category TEXT NOT NULL DEFAULT '';
ALTER TABLE tools ADD COLUMN requires_review INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tools ADD COLUMN user_generated_content INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tools ADD COLUMN risk_level TEXT NOT NULL DEFAULT 'low';
ALTER TABLE tools ADD COLUMN required_plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE tools ADD COLUMN monetization_enforced INTEGER NOT NULL DEFAULT 0;

-- policy_category mirrors each tool's existing category name (real data
-- already in this table via category_id), not a fabricated value.
UPDATE tools
SET policy_category = (SELECT categories.name FROM categories WHERE categories.id = tools.category_id)
WHERE policy_category = '';

-- pricing_amount/currency/period intentionally NULL for all four --
-- undecided, not zero and not a placeholder figure.
INSERT OR IGNORE INTO plans (plan_key, display_name, status, description, priority, visible, upgrade_target) VALUES
  ('free', 'Free', 'planned', 'Access to Codivio''s tools as they become available, at no cost.', 0, 1, 'pro'),
  ('pro', 'Pro', 'planned', 'Planned for individuals who need higher limits and faster processing once tools are live.', 1, 1, 'business'),
  ('business', 'Business', 'planned', 'Planned for teams that need advanced limits and priority processing once tools are live.', 2, 1, 'api'),
  ('api', 'API', 'planned', 'Planned programmatic access to Codivio''s tools for developers and integrations.', 3, 1, NULL);

INSERT OR IGNORE INTO plan_entitlements (plan_key, entitlement_key, status) VALUES
  ('free', 'basic_tool_access', 'planned'),
  ('pro', 'advanced_tool_access', 'not_available'),
  ('pro', 'batch_processing', 'not_available'),
  ('pro', 'larger_file_size', 'not_available'),
  ('pro', 'faster_processing', 'not_available'),
  ('pro', 'storage', 'not_available'),
  ('pro', 'premium_tools', 'not_available'),
  ('pro', 'reduced_ads', 'not_available'),
  ('pro', 'higher_usage_limits', 'not_available'),
  ('business', 'priority_processing', 'not_available'),
  ('business', 'analytics', 'not_available'),
  ('api', 'api_access', 'not_available');
