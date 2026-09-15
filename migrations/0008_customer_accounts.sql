-- Migration 0008 (Phase 3.14 remediation — Finding #1: Customer Accounts).
--
-- Codivio's existing `users` table (migration 0001) is the ADMIN account
-- table (Super Admin/Admin/Editor/Analyst) -- it has never modeled a
-- public/customer identity, and the monetization foundation added in
-- migration 0007 (plans/plan_entitlements) has no customer to attach a
-- plan to. This migration adds ONLY the identity anchor for a future
-- public/customer account system -- deliberately not a full account
-- system, and deliberately not connected to plans/entitlements yet.
--
-- Table name `customer_accounts` (not `customers`, not `accounts`) is
-- chosen specifically so it cannot be confused with `users` (Admin) in
-- code, in a query, or in a report -- the two are structurally,
-- semantically, and namespace-wise distinct on purpose.
--
-- Purpose: the identity a future customer registration/login system would
-- create a row for, and a future plan/entitlement system would reference.
--
-- Fields (deliberately minimal -- "no unnecessary profile fields, no
-- sensitive data beyond what is required"):
--   id          -- surrogate key, matches every other table's convention.
--   email       -- the one piece of identity data a customer account
--                  cannot function without; UNIQUE, matching `users.email`.
--   status      -- 'active'/'inactive', matching `users.status`'s pattern
--                  (no CHECK constraint, same deliberate deferral as
--                  users.role/tools.status -- app-layer validation in a
--                  future shared/customer.ts, same as every other table).
--   created_at / updated_at -- standard audit timestamps, matching every
--                  other table in this schema.
--
-- Deliberately NOT included in this table or this migration, and why:
--   - No password_hash/auth field: no customer registration or login
--     mechanism exists yet (out of scope for this remediation -- see
--     DECISIONS.md's Phase 3.14 remediation entry). Adding an unused auth
--     column now would itself be an "unnecessary profile field".
--   - No name/phone/address/profile fields: nothing in the current
--     architecture needs them, and CLAUDE.md Sec 11 (Privacy) forbids
--     collecting data a feature doesn't need.
--   - No `plan_key` column and no `customer_plan_assignments` table: with
--     no registration mechanism, no real customer row can exist yet, so a
--     plan-assignment table would reference rows that can't be genuinely
--     populated -- the exact anti-pattern already avoided for
--     subscriptions/usage_events in migration 0007. The FUTURE
--     relationship is: a customer's current plan would be a
--     `customer_plan_assignments(customer_id, plan_key, assigned_at)`
--     table (mirroring `plan_entitlements`'s shape), added once a real
--     registration flow exists to populate `customer_accounts` -- not
--     before.
--   - No `subscriptions`/billing table: unchanged from migration 0007 --
--     still no payment integration, per this remediation's own explicit
--     scope limit.
--
-- Admin/RBAC impact: NONE. This table has no foreign key to or from
-- `users`, `sessions`, or `audit_logs`, no admin endpoint reads or writes
-- it, and no code path in worker/auth.ts or worker/rbac.ts references it
-- -- there is currently no shared session/cookie mechanism between Admin
-- and a future customer identity, by construction, not by convention.

CREATE TABLE IF NOT EXISTS customer_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
