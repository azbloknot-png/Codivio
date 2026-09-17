import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Box,
  CircleHelp,
  ClipboardList,
  DollarSign,
  FileBarChart,
  FileText,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  Search,
  Settings,
  Share2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Link, Navigate, Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { usePageMeta } from "../App";
import { displayName, hasPermission, type Permission } from "../../shared/rbac";
import type { Translations } from "../../shared/i18n";
import { useLanguage } from "../i18n/LanguageContext";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";

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
  const { t } = useLanguage();
  usePageMeta(t.admin.adminSignIn, t.admin.signInSubtitle);

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
          <img className="brand-logo" src="/assets/branding/codivio-logo.png" alt="Codivio" />
          Codivio
        </Link>

        <h1>{t.admin.adminSignIn}</h1>
        <p>{t.admin.signInSubtitle}</p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            {t.admin.email}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label>
            {t.admin.password}
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
            {submitting ? t.admin.signingIn : t.admin.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminLoadingScreen() {
  const { t } = useLanguage();
  return (
    <div className="admin-loading-screen" role="status" aria-live="polite">
      <Loader2 className="admin-spinner" size={28} aria-hidden="true" />
      <p>{t.admin.checkingSession}</p>
    </div>
  );
}

/**
 * Nav items derived from the shared permission matrix — not duplicated.
 * A role that lacks the permission entirely doesn't see the item at all
 * (no point advertising a feature it will never be allowed to use). This
 * filtering is a UX convenience only — it has no security effect on its
 * own; the actual boundary is the server (see worker/rbac.ts#authorize).
 *
 * `permission` is optional: several modules below (Blog/SEO/Search
 * Console/Advertising/Affiliate/Monetization/Social/Reports/System
 * Health) have no dedicated permission in shared/rbac.ts yet, because no
 * real data or mutation exists behind them to protect — each is a
 * "Coming soon" architecture placeholder (AdminComingSoonPage), not a
 * functioning feature. Adding a fake permission for a page with nothing
 * to protect would be RBAC theater; these are simply visible to any role
 * that reached the Admin shell at all (already gated by `admin.access`).
 * The day a placeholder gets a real backend, it gets a real permission
 * here too — see DECISIONS.md.
 */
function getNavItems(t: Translations): { permission?: Permission; icon: ReactNode; label: string; to?: string }[] {
  return [
    { permission: "dashboard.view", icon: <LayoutDashboard size={18} />, label: t.nav.dashboard, to: "/admin" },
    { permission: "pages.view", icon: <FileText size={18} />, label: t.nav.pages, to: "/admin/pages" },
    { permission: "tools.view", icon: <Box size={18} />, label: t.nav.tools, to: "/admin/tools" },
    { permission: "faq.view", icon: <CircleHelp size={18} />, label: t.nav.faq, to: "/admin/faq" },
    { permission: "users.view", icon: <Users size={18} />, label: t.nav.usersCrm, to: "/admin/users" },
    { icon: <BookOpen size={18} />, label: t.nav.blog, to: "/admin/blog" },
    { permission: "analytics.view", icon: <BarChart3 size={18} />, label: t.nav.analytics, to: "/admin/analytics" },
    { permission: "seo.view", icon: <TrendingUp size={18} />, label: t.nav.seo, to: "/admin/seo" },
    { icon: <Search size={18} />, label: t.nav.searchConsole, to: "/admin/search-console" },
    { icon: <Megaphone size={18} />, label: t.nav.advertising, to: "/admin/advertising" },
    { icon: <Link2 size={18} />, label: t.nav.affiliate, to: "/admin/affiliate" },
    { icon: <DollarSign size={18} />, label: t.nav.monetization, to: "/admin/monetization" },
    { icon: <Share2 size={18} />, label: t.nav.social, to: "/admin/social" },
    { icon: <FileBarChart size={18} />, label: t.nav.reports, to: "/admin/reports" },
    { icon: <Activity size={18} />, label: t.nav.systemHealth, to: "/admin/system" },
    { permission: "settings.view", icon: <Settings size={18} />, label: t.nav.settings, to: "/admin/settings" },
    { permission: "audit.view", icon: <ClipboardList size={18} />, label: t.nav.auditLog, to: "/admin/audit-log" },
  ];
}

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
  const { t } = useLanguage();
  if (!to) {
    return (
      <span className="admin-nav-link admin-nav-link-disabled" aria-disabled="true">
        {icon}
        {label}
        <span className="admin-nav-badge">{t.common.comingSoon}</span>
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

/**
 * Every metric here is a real, named future data point (matching CLAUDE.md
 * §7's dashboard scope) with NO value wired up yet — every row renders the
 * same honest "Not connected" state. Do not replace any of these with a
 * number until a real analytics/revenue/system-health data source exists
 * to back it; see CLAUDE.md §23's "Statistics principle". Titles/metrics
 * come from the translation dictionaries (Phase 2.15), not literal English.
 */
function getDashboardSections(t: Translations): { title: string; metrics: string[] }[] {
  const m = t.dashboard.metrics;
  return [
    { title: t.dashboard.traffic, metrics: [m.visitors, m.uniqueVisitors, m.pageviews, m.sessions, m.newVsReturning, m.topCountries, m.devices] },
    { title: t.nav.tools, metrics: [m.totalUsage, m.mostUsed, m.leastUsed, m.usageGrowth, m.errors, m.processingPerformance] },
    { title: t.nav.usersCrm, metrics: [m.totalUsers, m.newUsers, m.freeProBusiness, m.active, m.retention, m.churn] },
    { title: t.dashboard.revenue, metrics: [m.totalRevenue, m.subscriptionRevenue, m.premiumServices, m.affiliateRevenue, m.advertisingRevenue, m.revenuePerUser] },
    { title: t.nav.advertising, metrics: [m.impressions, m.clicks, m.ctr, m.rpm, m.slotPerformance] },
    { title: t.nav.affiliate, metrics: [m.clicks, m.conversions, m.commission, m.totalRevenue, m.roi] },
    { title: t.dashboard.system, metrics: [m.workerHealth, m.d1Health, m.storage, m.bandwidth, m.backups, m.apiHealth] },
  ];
}

export function AdminDashboardPlaceholder() {
  const { t } = useLanguage();
  usePageMeta("Admin Dashboard", "Codivio admin dashboard.");
  const user = useAdminUser();

  return (
    <div className="admin-dashboard">
      <h1>{t.admin.welcome(user.email)}</h1>
      <span className="admin-role-badge">{displayName(user.role)}</span>
      <p className="admin-dashboard-intro">{t.admin.dashboardIntro}</p>

      <div className="admin-dashboard-grid">
        {getDashboardSections(t).map((section) => (
          <section className="admin-dashboard-card" key={section.title}>
            <h2>{section.title}</h2>
            <ul className="admin-dashboard-metrics">
              {section.metrics.map((metric) => (
                <li key={metric}>
                  <span>{metric}</span>
                  <span className="admin-settings-status">{t.common.notConnected}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
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
  const { t } = useLanguage();

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
          aria-label={sidebarOpen ? t.admin.closeMenu : t.admin.openMenu}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Link className="brand" to="/admin">
          <img className="brand-logo" src="/assets/branding/codivio-logo.png" alt="Codivio" />
          Codivio Admin
        </Link>

        <div className="admin-header-user">
          <LanguageSwitcher className="language-switcher language-switcher-admin" />
          <span className="admin-user-email">{user.email}</span>
          <button className="admin-logout-button" type="button" onClick={handleLogout}>
            <LogOut size={16} />
            {t.common.logout}
          </button>
        </div>
      </header>

      <div className="admin-body">
        <nav className={`admin-sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Admin navigation">
          {getNavItems(t)
            .filter((item) => item.permission === undefined || hasPermission(user.role, item.permission))
            .map((item) => (
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
