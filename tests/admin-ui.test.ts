import { describe, expect, it } from "vitest";
import { describeLoginError, resolveSessionState } from "../src/admin/AdminApp";
import fs from "node:fs";

/**
 * Phase 2.4 test coverage note (see PROJECT_STATE.md / codivio-test-gate):
 * this project has no @testing-library/react or jsdom installed, and adding
 * one was explicitly out of scope for this checkpoint. Two kinds of check
 * are used here instead:
 *
 *  - Real, executed unit tests for the pure logic extracted out of the
 *    React components (`describeLoginError`, `resolveSessionState`) — these
 *    actually run and can actually fail.
 *  - Structural/static source checks (reading the real files as text) for
 *    the parts that are genuinely React-rendering/routing behavior and
 *    would need a DOM renderer to execute live. These confirm the code that
 *    implements the required behavior is present and wired correctly; they
 *    are not a substitute for a live browser/E2E check, which was not
 *    possible here (see the separate `workerd` limitation in
 *    PROJECT_STATE.md — a different, unrelated constraint from this one).
 */

const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const adminSource = fs.readFileSync(new URL("../src/admin/AdminApp.tsx", import.meta.url), "utf8");

describe("describeLoginError (pure)", () => {
  it("maps 401 to an invalid-credentials message", () => {
    expect(describeLoginError(401)).toMatch(/invalid email or password/i);
  });

  it("maps 429 to a rate-limit message", () => {
    expect(describeLoginError(429)).toMatch(/too many attempts/i);
  });

  it("maps 5xx to a generic server-error message", () => {
    expect(describeLoginError(500)).toMatch(/something went wrong/i);
  });

  it("never leaks a raw status code or internal detail in the message", () => {
    for (const status of [400, 401, 403, 429, 500, 503]) {
      const message = describeLoginError(status);
      expect(message).not.toMatch(/\d{3}/); // no raw status code text
      expect(message.toLowerCase()).not.toContain("sql");
      expect(message.toLowerCase()).not.toContain("stack");
    }
  });
});

describe("resolveSessionState (pure)", () => {
  it("resolves to authenticated with the user on a 200 response", async () => {
    const response = new Response(JSON.stringify({ user: { id: 1, email: "a@b.com", role: "super_admin" } }), {
      status: 200,
    });
    const state = await resolveSessionState(response);
    expect(state).toEqual({
      status: "authenticated",
      user: { id: 1, email: "a@b.com", role: "super_admin" },
    });
  });

  it("resolves to unauthenticated on a 401 response", async () => {
    const response = new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    const state = await resolveSessionState(response);
    expect(state).toEqual({ status: "unauthenticated" });
  });
});

describe("routing wiring (structural — see file-level note)", () => {
  it("adds /admin/login and /admin without removing any existing public route", () => {
    const expectedPublicRoutes = [
      '<Route path="/" element={<HomePage />} />',
      '<Route path="/tools" element={<ToolsPage />} />',
      '<Route path="/tools/:slug" element={<ToolRoute />} />',
      '<Route path="/blog" element={<BlogPage />} />',
      '<Route path="/faq" element={<FAQPage />} />',
      '<Route path="/about" element={<AboutPage />} />',
      '<Route path="/contact" element={<ContactPage />} />',
      '<Route path="/privacy" element={<PrivacyPage />} />',
      '<Route path="/terms" element={<TermsPage />} />',
      '<Route path="/cookies" element={<CookiePolicyPage />} />',
      '<Route path="*" element={<NotFoundPage />} />',
    ];
    for (const route of expectedPublicRoutes) {
      expect(appSource).toContain(route);
    }
    expect(appSource).toContain('<Route path="/admin/login" element={<AdminLoginPage />} />');
    // As of Phase 2.7, /admin is a parent route with nested children
    // (Dashboard at index, Settings at /admin/settings) rather than a
    // single self-closing route — the protection/redirect behavior itself
    // (tested separately below) is unchanged.
    expect(appSource).toContain('<Route path="/admin" element={<ProtectedAdminRoute />}>');
    expect(appSource).toContain('<Route index element={<AdminDashboardPlaceholder />} />');
    expect(appSource).toContain('<Route path="settings" element={<AdminSettingsPage />} />');
  });

  it("registry still has all 34 tools", () => {
    const matches = appSource.match(/slug: "/g) ?? [];
    expect(matches.length).toBe(34);
  });
});

describe("protected-route behavior (structural — see file-level note)", () => {
  it("ProtectedAdminRoute redirects to /admin/login only in the unauthenticated branch", () => {
    const fn = adminSource.slice(
      adminSource.indexOf("export function ProtectedAdminRoute"),
      adminSource.indexOf("export function ProtectedAdminRoute") + 400
    );
    expect(fn).toContain('session.status === "unauthenticated"');
    expect(fn).toContain('<Navigate to="/admin/login" replace />');
    expect(fn).toContain('session.status === "loading"');
    expect(fn).toContain("<AdminLoadingScreen");
    expect(fn).toContain("<AdminShell");
  });

  it("AdminLoginPage redirects an already-authenticated visitor to /admin", () => {
    const fn = adminSource.slice(
      adminSource.indexOf("export function AdminLoginPage"),
      adminSource.indexOf("export function AdminLoginPage") + 900
    );
    expect(fn).toContain('session.status === "authenticated"');
    expect(fn).toContain('navigate("/admin", { replace: true })');
  });

  it("logout calls the real logout endpoint before the caller navigates away", () => {
    const logoutFn = adminSource.slice(
      adminSource.indexOf("const logout = useCallback"),
      adminSource.indexOf("const logout = useCallback") + 300
    );
    expect(logoutFn).toContain('fetch("/api/auth/logout", { method: "POST" })');

    const shellLogout = adminSource.slice(
      adminSource.indexOf("async function handleLogout"),
      adminSource.indexOf("async function handleLogout") + 200
    );
    expect(shellLogout).toContain("await onLogout()");
    expect(shellLogout).toContain('navigate("/admin/login", { replace: true })');
  });

  it("never reads localStorage/sessionStorage/URL params to decide auth state", () => {
    // Match actual API usage (e.g. `localStorage.getItem`), not the words
    // appearing in this file's own explanatory comments.
    expect(adminSource).not.toMatch(/\blocalStorage\s*\./);
    expect(adminSource).not.toMatch(/\bsessionStorage\s*\./);
    expect(adminSource).not.toMatch(/URLSearchParams/);
  });
});
