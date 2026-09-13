import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  BarChart3,
  Box,
  ClipboardList,
  Code2,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Link, Navigate, Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { usePageMeta } from "../App";
import { displayName, hasPermission, type Permission } from "../../shared/rbac";

/**
 * Phase 2.4 — Admin UI + Protected Route.
 *
 * Scope: a login page, a server-session-backed protected `/admin` route,
 * and an Admin shell with navigation placeholders. Explicitly NOT in scope
 * (later checkpoints): RBAC enforcement (any authenticated user reaches the
 * shell — see codivio-admin skill for 2.5+), audit logging, settings, and
 * real Pages/Tools/Users/Analytics functionality behind the nav placeholders.
 *
 * Auth state is deliberately simple (a local hook per route, re-checked via
 * GET /api/auth/session each time it mounts) rather than a global store —
 * the server session is the only source of truth; nothing here reads or
 * trusts localStorage/sessionStorage/URL params for authentication.
 */

export type SessionUser = { id: number; email: string; role: string };

/** For nested /admin/* pages (rendered via <Outlet />) to read the already
 * server-verified user without each page re-fetching /api/auth/session
 * itself. The value ultimately still comes from ProtectedAdminRoute's own
 * session check — this is just how it's threaded down, not a second
 * source of truth. */
export function useAdminUser(): SessionUser {
  return useOutletContext<SessionUser>();
}

type SessionState =
  | { status: "loading" }
  | { status: "authenticated"; user: SessionUser }
  | { status: "unauthenticated" };

/** Pure — kept separate from the hook below so it's unit-testable without
 * rendering a component (no jsdom/React Testing Library in this project). */
export async function resolveSessionState(response: Response): Promise<SessionState> {
  if (response.ok) {
    const data = (await response.json()) as { user: SessionUser };
    return { status: "authenticated", user: data.user };
  }
  return { status: "unauthenticated" };
}

function useSession() {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  const refresh = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/auth/session");
      setState(await resolveSessionState(response));
    } catch {
      setState({ status: "unauthenticated" });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Network failure during logout should not trap the user in the
      // admin area — the client-side state is cleared regardless, and a
      // failed server-side invalidation just means the session (which is
      // short-lived and was likely about to be re-checked anyway) expires
      // naturally.
    }
    setState({ status: "unauthenticated" });
  }, []);

  return { ...state, refresh, logout };
}

export function describeLoginError(status: number): string {
  if (status === 401) return "Invalid email or password.";
  if (status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  if (status >= 500) return "Something went wrong on our end. Please try again shortly.";
  return "Sign-in failed. Please check your details and try again.";
}

export function AdminLoginPage() {
  usePageMeta("Admin Sign In", "Sign in to the Codivio admin area.");

  const session = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session.status === "authenticated") {
      navigate("/admin", { replace: true });
    }
  }, [session.status, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError(describeLoginError(response.status));
        return;
      }

      await session.refresh();
      navigate("/admin", { replace: true });
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-auth-page">
      <div className="admin-auth-card">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <Code2 size={19} />
          </span>
          Codivio
        </Link>

        <h1>Admin sign in</h1>
        <p>Sign in with your Codivio admin account.</p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <div className="admin-auth-error" role="alert">
              {error}
            </div>
          )}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminLoadingScreen() {
  return (
    <div className="admin-loading-screen" role="status" aria-live="polite">
      <Loader2 className="admin-spinner" size={28} aria-hidden="true" />
      <p>Checking your session…</p>
    </div>
  );
}

/**
 * Nav items derived from the shared permission matrix — not duplicated.
 * A role that lacks the permission entirely doesn't see the item at all
 * (no point advertising a feature it will never be allowed to use); a role
 * that has the permission but the feature isn't built yet sees it as
 * "Soon" (no `to`). This filtering is a UX convenience only — it has no
 * security effect on its own, since none of these areas have a real
 * route/endpoint yet; the actual boundary is the server (see
 * worker/rbac.ts#authorize).
 */
const NAV_ITEMS: { permission: Permission; icon: ReactNode; label: string; to?: string }[] = [
  { permission: "dashboard.view", icon: <LayoutDashboard size={18} />, label: "Dashboard", to: "/admin" },
  { permission: "pages.view", icon: <FileText size={18} />, label: "Pages", to: "/admin/pages" },
  { permission: "tools.view", icon: <Box size={18} />, label: "Tools", to: "/admin/tools" },
  { permission: "users.view", icon: <Users size={18} />, label: "Users" },
  { permission: "settings.view", icon: <Settings size={18} />, label: "Settings", to: "/admin/settings" },
  { permission: "analytics.view", icon: <BarChart3 size={18} />, label: "Analytics" },
  { permission: "audit.view", icon: <ClipboardList size={18} />, label: "Audit Log" },
];

function AdminNavLink({
  to,
  icon,
  label,
  onNavigate,
}: {
  to?: string;
  icon: ReactNode;
  label: string;
  onNavigate?: () => void;
}) {
  if (!to) {
    return (
      <span className="admin-nav-link admin-nav-link-disabled" aria-disabled="true">
        {icon}
        {label}
        <span className="admin-nav-badge">Soon</span>
      </span>
    );
  }

  return (
    <Link className="admin-nav-link" to={to} onClick={onNavigate}>
      {icon}
      {label}
    </Link>
  );
}

export function AdminDashboardPlaceholder() {
  usePageMeta("Admin Dashboard", "Codivio admin dashboard.");
  const user = useAdminUser();

  return (
    <div className="admin-dashboard-placeholder">
      <h1>Welcome, {user.email}</h1>
      <span className="admin-role-badge">{displayName(user.role)}</span>

      <div className="empty-state">
        <LayoutDashboard size={28} />
        <h2>Dashboard coming soon</h2>
        <p>
          Live statistics (tool usage, traffic, revenue) will appear here once
          real analytics are wired up in a later checkpoint — never estimated
          or fabricated numbers.
        </p>
      </div>
    </div>
  );
}

function AdminShell({
  user,
  onLogout,
}: {
  user: SessionUser;
  onLogout: () => Promise<void>;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await onLogout();
    navigate("/admin/login", { replace: true });
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <button
          className="admin-sidebar-toggle"
          type="button"
          onClick={() => setSidebarOpen((value) => !value)}
          aria-label={sidebarOpen ? "Close admin menu" : "Open admin menu"}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link className="brand" to="/admin">
          <span className="brand-mark">
            <Code2 size={19} />
          </span>
          Codivio Admin
        </Link>

        <div className="admin-header-user">
          <span className="admin-user-email">{user.email}</span>
          <button className="admin-logout-button" type="button" onClick={handleLogout}>
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </header>

      <div className="admin-body">
        <nav className={`admin-sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Admin navigation">
          {NAV_ITEMS.filter((item) => hasPermission(user.role, item.permission)).map((item) => (
            <AdminNavLink
              key={item.label}
              to={item.to}
              icon={item.icon}
              label={item.label}
              onNavigate={closeSidebar}
            />
          ))}
        </nav>

        {sidebarOpen && (
          <div className="admin-sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />
        )}

        <main className="admin-main">
          <Outlet context={user} />
        </main>
      </div>
    </div>
  );
}

export function ProtectedAdminRoute() {
  const session = useSession();

  if (session.status === "loading") {
    return <AdminLoadingScreen />;
  }

  if (session.status === "unauthenticated") {
    return <Navigate to="/admin/login" replace />;
  }

  return <AdminShell user={session.user} onLogout={session.logout} />;
}
