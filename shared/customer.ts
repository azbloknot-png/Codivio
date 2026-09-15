/**
 * Codivio customer identity — foundation types (Phase 3.14 remediation,
 * Finding #1).
 *
 * Mirrors the shared/rbac.ts, shared/settings.ts, shared/tools.ts pattern:
 * one framework-agnostic module, meant to be imported by both a future
 * Worker endpoint (authoritative) and any future customer-facing UI
 * (hinting only). Nothing in this codebase currently constructs a
 * `CustomerAccount` — there is no registration/login endpoint yet (see
 * migrations/0008_customer_accounts.sql for why that's deliberate). This
 * module exists so that future endpoint has a real, reviewed contract to
 * implement against, not to represent something that already works.
 *
 * Deliberately separate from shared/tools.ts's `users`-table validation
 * and from shared/rbac.ts's Admin role model — a customer is not an Admin
 * account and must never be checked against Admin roles/permissions.
 */

export const CUSTOMER_ACCOUNT_STATUSES = ["active", "inactive"] as const;
export type CustomerAccountStatus = (typeof CUSTOMER_ACCOUNT_STATUSES)[number];

export function isValidCustomerAccountStatus(value: string): value is CustomerAccountStatus {
  return (CUSTOMER_ACCOUNT_STATUSES as readonly string[]).includes(value);
}

/** Mirrors the `customer_accounts` table row shape exactly. */
export interface CustomerAccount {
  id: number;
  email: string;
  status: CustomerAccountStatus;
  createdAt: string;
  updatedAt: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

export function isValidCustomerEmail(value: string): boolean {
  return value.length > 0 && value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value);
}
