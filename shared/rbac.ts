/**
 * Codivio RBAC — centralized role/permission model (Phase 2.5).
 *
 * This is the ONE place the role→permission matrix is defined. Both the
 * Worker (server-side enforcement, authoritative) and the React frontend
 * (UI hints only) import from here — see worker/rbac.ts and
 * src/admin/AdminApp.tsx. Do not re-implement `role === "..."` checks
 * elsewhere; add a permission here and check it instead.
 *
 * Security note: frontend use of this module is NOT an authorization
 * boundary. A permission check here only decides what the UI shows; it
 * never decides what the server allows. The server always re-derives the
 * user's role from the authenticated session (see
 * worker/auth.ts#resolveAuthenticatedUser) and re-checks permissions
 * independently — it never trusts a role or permission value from the
 * client.
 */

export const ROLES = ["super_admin", "admin", "editor", "analyst"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "admin.access",
  "dashboard.view",
  "pages.view",
  "pages.manage",
  "tools.view",
  "tools.manage",
  "users.view",
  "users.manage",
  "settings.view",
  "settings.manage",
  "analytics.view",
  "audit.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_DISPLAY_NAMES: Readonly<Record<Role, string>> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Editor",
  analyst: "Analyst",
};

/**
 * Initial approved permission matrix (Phase 2.5). Reviewed for internal
 * consistency before implementation — no role is granted a permission it
 * shouldn't have by default, and every role's permissions are a subset of
 * a role above it in the hierarchy (analyst ⊆ editor's dashboard/admin
 * access; admin ⊇ editor's content permissions plus read-only visibility
 * into users/settings/analytics/audit; super_admin ⊇ everything). No
 * security issue was found in the matrix as specified, so it is
 * implemented as given rather than silently altered — see DECISIONS.md
 * if this needs to change later.
 */
const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  super_admin: PERMISSIONS,
  admin: [
    "admin.access",
    "dashboard.view",
    "pages.view",
    "pages.manage",
    "tools.view",
    "tools.manage",
    "users.view",
    "analytics.view",
    "settings.view",
    "audit.view",
  ],
  editor: ["admin.access", "dashboard.view", "pages.view", "pages.manage", "tools.view", "tools.manage"],
  analyst: ["admin.access", "dashboard.view", "analytics.view"],
};

const VALID_ROLES: ReadonlySet<string> = new Set(ROLES);

/** Type guard — also the single fail-closed check every lookup below relies
 * on: an unrecognized role string is never silently treated as any
 * existing role. */
export function isValidRole(value: string): value is Role {
  return VALID_ROLES.has(value);
}

/** Fails closed: an unrecognized role has zero permissions, never all of
 * them and never a guessed default. */
export function hasPermission(role: string, permission: Permission): boolean {
  if (!isValidRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function getPermissions(role: string): readonly Permission[] {
  return isValidRole(role) ? ROLE_PERMISSIONS[role] : [];
}

/** Safe for display even if `role` is somehow not one of the known values
 * (falls back to the raw string rather than throwing) — the caller (React)
 * still renders it as plain text, so this carries no injection risk. */
export function displayName(role: string): string {
  return isValidRole(role) ? ROLE_DISPLAY_NAMES[role] : role;
}
