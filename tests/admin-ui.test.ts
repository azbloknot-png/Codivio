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
const styleSource = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

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

// --- Phase 2.13 UI/UX redesign: nav architecture + branding ------------------

describe("Admin navigation architecture (Phase 2.13, translated in Phase 2.15)", () => {
  it("declares all 16 requested Admin modules in getNavItems, each labeled from the translation dictionary", () => {
    const navBlock = adminSource.slice(
      adminSource.indexOf("function getNavItems"),
      adminSource.indexOf("function AdminNavLink")
    );
    const navKeys = [
      "dashboard",
      "pages",
      "tools",
      "usersCrm",
      "blog",
      "analytics",
      "seo",
      "searchConsole",
      "advertising",
      "affiliate",
      "monetization",
      "social",
      "reports",
      "systemHealth",
      "settings",
      "auditLog",
    ];
    for (const key of navKeys) {
      expect(navBlock).toContain(`label: t.nav.${key}`);
    }
  });

  it("every getNavItems entry has a real `to` — none rely on the old permission-less 'Soon' badge", () => {
    const navBlock = adminSource.slice(
      adminSource.indexOf("function getNavItems"),
      adminSource.indexOf("function AdminNavLink")
    );
    const entryCount = (navBlock.match(/label: t\.nav\./g) ?? []).length;
    const toCount = (navBlock.match(/to: "\/admin/g) ?? []).length;
    expect(entryCount).toBe(16);
    expect(toCount).toBe(entryCount);
  });

  it("the EN dictionary provides real English text for all 16 nav labels (no missing/placeholder values)", async () => {
    const { en } = await import("../shared/i18n/en");
    for (const value of Object.values(en.nav)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
    expect(Object.keys(en.nav).length).toBe(16);
  });
});

describe("official branding is used consistently (Phase 2.13)", () => {
  it("public header/footer and Admin login/shell all use the official logo asset, not a generic icon mark", () => {
    for (const source of [appSource, adminSource]) {
      expect(source).not.toContain("Code2");
    }
    const logoOccurrences = (appSource.match(/\/assets\/branding\/codivio-logo\.png/g) ?? []).length;
    // Public header + public footer = 2 usages in App.tsx.
    expect(logoOccurrences).toBe(2);
    const adminLogoOccurrences = (adminSource.match(/\/assets\/branding\/codivio-logo\.png/g) ?? []).length;
    // Admin login card + Admin shell header = 2 usages in AdminApp.tsx.
    expect(adminLogoOccurrences).toBe(2);
  });

  it("index.html declares a favicon using the official logo asset", () => {
    const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
    expect(indexHtml).toContain('rel="icon"');
    expect(indexHtml).toContain("/assets/branding/codivio-logo.png");
  });
});

describe("homepage hero has a real advertisement area, not a phone/device mockup (CLAUDE.md §23)", () => {
  it("hero-ad-slot replaces the old decorative floating-card mockup", () => {
    expect(appSource).toContain("hero-ad-slot");
    expect(appSource).not.toContain("floating-card");
  });
});

describe("homepage shows exactly the 12 specified main tools (Phase 2.13)", () => {
  it("HOMEPAGE_FEATURED_TOOLS still resolves to exactly these 12 slugs", () => {
    const expectedSlugs = [
      "qr-code-generator",
      "qr-code-scanner",
      "url-to-qr",
      "wifi-qr",
      "vcard-qr",
      "pdf-merge",
      "pdf-split",
      "pdf-compress",
      "pdf-to-word",
      "image-resize",
      "image-compress",
      "background-remover",
    ];
    for (const slug of expectedSlugs) {
      const toolBlockStart = appSource.indexOf(`slug: "${slug}"`);
      expect(toolBlockStart).toBeGreaterThan(-1);
      // featured:true is declared a few lines after slug within the same
      // object literal for every one of these 12 real registry entries.
      const toolBlock = appSource.slice(toolBlockStart, toolBlockStart + 300);
      expect(toolBlock).toContain("featured: true");
    }
  });
});

// --- Phase 2.14: homepage structure, responsive and accessibility polish ---

describe("homepage section order (Phase 2.14)", () => {
  it("Header, Hero, Ad, Popular, QR, PDF, Image & Other, Blog, Footer appear in that order", () => {
    const homePageSource = appSource.slice(appSource.indexOf("function HomePage"), appSource.indexOf("function ToolsPage"));
    const markers = [
      'className="hero"',
      "hero-ad-slot",
      'id="popular-tools"',
      "t.section.qrTools",
      "t.section.pdfTools",
      "t.section.imageOtherTools",
      "t.section.blogEyebrow",
    ];
    let lastIndex = -1;
    for (const marker of markers) {
      const index = homePageSource.indexOf(marker);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
    // SiteHeader/SiteFooter are rendered by PageShell around HomePage's own
    // <main>, not inside it — confirmed separately below.
  });

  it("PageShell renders SiteHeader before children and SiteFooter after", () => {
    const shellSource = appSource.slice(appSource.indexOf("function PageShell"), appSource.indexOf("function HomePage"));
    const headerIndex = shellSource.indexOf("<SiteHeader");
    const childrenIndex = shellSource.indexOf("{children}");
    const footerIndex = shellSource.indexOf("<SiteFooter");
    expect(headerIndex).toBeGreaterThan(-1);
    expect(childrenIndex).toBeGreaterThan(headerIndex);
    expect(footerIndex).toBeGreaterThan(childrenIndex);
  });
});

describe("homepage responsive structure (Phase 2.14)", () => {
  it("no fixed (non-max/min) pixel width ≥100px exists outside the Admin-only sidebar rule", () => {
    const fixedWidths = styleSource.match(/(?<![a-z-])width:\d{3,}px/g) ?? [];
    for (const match of fixedWidths) {
      // .nav-search (165px/210px, hidden below 650px) and .admin-sidebar
      // (220px, off-canvas below 900px) are the only known, already-handled
      // fixed widths in the whole stylesheet — anything else would be new
      // and needs its own responsive review.
      const context = styleSource.slice(styleSource.indexOf(match) - 200, styleSource.indexOf(match));
      expect(context.includes("nav-search") || context.includes("admin-sidebar") || context === "").toBe(true);
    }
  });

  it("the hero advertisement area still collapses on tablet/mobile (≤900px)", () => {
    expect(styleSource).toContain(".hero-ad-slot{display:none}");
  });
});

describe("homepage accessibility structure (Phase 2.14)", () => {
  it("has a skip-to-content link targeting HomePage's <main id=\"main-content\">", () => {
    expect(appSource).toContain('href="#main-content"');
    expect(appSource).toContain('<main id="main-content">');
  });

  it("decorative tool-card arrow icon is hidden from assistive tech", () => {
    expect(appSource).toContain('<ArrowRight className="tool-arrow" size={18} aria-hidden="true" />');
  });

  it("search inputs that remove the default outline provide a visible :focus-within replacement", () => {
    expect(styleSource).toContain("outline:0");
    expect(styleSource).toContain(".nav-search:focus-within,.hero-search:focus-within{border-color");
  });

  it("interactive public-site elements (tool cards, slider controls, mobile menu, nav/footer links) have a branded :focus-visible style", () => {
    for (const selector of [
      ".tool-card:focus-visible",
      ".tool-slider-actions button:focus-visible",
      ".mobile-menu:focus-visible",
      ".popular-tools-track:focus-visible",
      ".nav-links a:focus-visible",
    ]) {
      expect(styleSource).toContain(selector);
    }
  });

  it("HomePage renders exactly one <h1>", () => {
    const homePageSource = appSource.slice(appSource.indexOf("function HomePage"), appSource.indexOf("function ToolsPage"));
    const h1Count = (homePageSource.match(/<h1[\s>]/g) ?? []).length;
    expect(h1Count).toBe(1);
  });
});
