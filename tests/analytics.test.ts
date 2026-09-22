import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import {
  disableAnalytics,
  enableAnalytics,
  GA4_MEASUREMENT_ID,
  isAnalyticsConfigured,
  isProductionHost,
  isTrackablePath,
  trackEvent,
  trackPageView,
} from "../src/lib/analytics";

/**
 * GA4 foundational analytics integration, now consent-gated (Cookie
 * Consent foundation). One appropriate test per topic: the pure,
 * DOM-independent decision functions are exercised directly (real unit
 * tests, not structural greps); the DOM-touching parts of
 * enableAnalytics/disableAnalytics/trackPageView cannot be exercised
 * end-to-end in this Vitest/Node environment (no jsdom — see
 * tests/consent.test.ts's own note on the same limitation), so those are
 * instead checked for safe no-op behavior under Node's real
 * `typeof window === "undefined"`, which is itself a genuine, meaningful
 * assertion (proves the SSR/Worker-safety guard actually works, not just
 * that it exists in source).
 *
 * Phase 3.21 — the Measurement ID moved from a hardcoded literal to
 * `import.meta.env.VITE_GA4_MEASUREMENT_ID` (see src/vite-env.d.ts /
 * .env.example). This test run has no `.env`/`.env.test` file, so the env
 * var is genuinely unset here — exercising the real "missing config" path,
 * not a mock of it.
 */

describe("GA4 measurement ID — configurable via VITE_GA4_MEASUREMENT_ID, never hardcoded", () => {
  it("is not hardcoded in source — src/lib/analytics.ts reads it from import.meta.env", () => {
    const source = fs.readFileSync(new URL("../src/lib/analytics.ts", import.meta.url), "utf8");
    expect(source).toContain("import.meta.env.VITE_GA4_MEASUREMENT_ID");
    // Regression guard: no literal "G-XXXXXXX"-shaped string is hardcoded
    // as the actual measurement ID anywhere in this file.
    expect(source).not.toMatch(/["']G-[A-Z0-9]{4,}["']/);
  });

  it("resolves to null in this test environment (no env var configured) — the real, honest missing-config state, not a mock", () => {
    expect(GA4_MEASUREMENT_ID).toBeNull();
    expect(isAnalyticsConfigured()).toBe(false);
  });
});

describe("isProductionHost", () => {
  it("matches only the real canonical apex domain", () => {
    expect(isProductionHost("codivio.online")).toBe(true);
  });

  it("rejects localhost, the workers.dev preview host, and www", () => {
    expect(isProductionHost("localhost")).toBe(false);
    expect(isProductionHost("codivio.azbloknot.workers.dev")).toBe(false);
    expect(isProductionHost("www.codivio.online")).toBe(false);
  });
});

describe("isTrackablePath", () => {
  it("excludes /admin routes from page-view tracking", () => {
    expect(isTrackablePath("/admin")).toBe(false);
    expect(isTrackablePath("/admin/tools")).toBe(false);
  });

  it("includes every real public route", () => {
    for (const path of ["/", "/tools", "/tools/qr-code-generator", "/faq", "/blog"]) {
      expect(isTrackablePath(path)).toBe(true);
    }
  });
});

describe("enableAnalytics / disableAnalytics / trackPageView — safe outside a browser", () => {
  it("does not throw when window/document are undefined (this test environment has no DOM)", () => {
    expect(typeof window).toBe("undefined");
    expect(() => enableAnalytics()).not.toThrow();
    expect(() => disableAnalytics()).not.toThrow();
    expect(() => trackPageView("/")).not.toThrow();
  });

  it("trackPageView sends nothing before enableAnalytics has ever run (never initialized in this environment)", () => {
    // Real, meaningful assertion even without a DOM: trackPageView's own
    // internal `!initialized` guard is exercised here, not just asserted
    // to exist — see src/lib/analytics.ts's `initialized`/`disabled` state.
    expect(() => trackPageView("/tools")).not.toThrow();
  });

  it("trackEvent sends nothing before enableAnalytics has ever run", () => {
    expect(() => trackEvent("qr_generate", { content_kind: "text" })).not.toThrow();
  });
});

// Phase 4.9 — QR Analytics Architecture. Real, executed consent/admin-
// exclusion behavior for the new generic trackEvent primitive, using a
// minimal stubbed window/document (same technique as tests/consent.test.ts
// and the App.tsx-review task's own deleted scratch simulation) rather
// than only asserting the guard clauses exist in source.
describe("trackEvent — real executed consent + /admin gating", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubBrowser(pathname: string) {
    const calls: unknown[][] = [];
    vi.stubGlobal("window", {
      location: { hostname: "codivio.online", pathname, href: `https://codivio.online${pathname}` },
    });
    vi.stubGlobal("document", {
      cookie: "",
      head: { appendChild: () => undefined },
      createElement: () => ({ async: false, src: "" }),
    });
    window.gtag = (...args: unknown[]) => calls.push(args);
    window.dataLayer = [];
    return calls;
  }

  it("sends nothing before consent is granted", () => {
    const calls = stubBrowser("/tools/qr-code-generator");
    trackEvent("qr_generate", { content_kind: "text" });
    expect(calls).toHaveLength(0);
  });

  it("enableAnalytics is a real, deliberate no-op when no Measurement ID is configured (this test environment's actual state) — never calls gtag, even indirectly", () => {
    const calls = stubBrowser("/tools/qr-code-generator");
    enableAnalytics();
    // If enableAnalytics had proceeded past its GA4_MEASUREMENT_ID guard,
    // it would overwrite window.gtag with its own bootstrap function and
    // immediately call gtag("js", ...)/gtag("config", ...) through it —
    // both would show up in `calls`. An empty array proves it never did.
    expect(calls).toHaveLength(0);
  });

  it("sends nothing on an /admin path even with consent granted", () => {
    stubBrowser("/admin/tools");
    enableAnalytics();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    trackEvent("qr_scan", { content_kind: "url" });
    expect(calls).toHaveLength(0);
  });

  it("sends nothing after consent is withdrawn", () => {
    stubBrowser("/tools/qr-code-scanner");
    enableAnalytics();
    disableAnalytics();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    trackEvent("qr_scan", { content_kind: "text" });
    expect(calls).toHaveLength(0);
  });
});

// Phase 3.21 — proves the OTHER half of the config-driven design actually
// works too: when a real-looking Measurement ID IS configured, analytics
// behaves exactly as it did before this change (real gtag bootstrap, real
// event delivery). `import.meta.env.VITE_GA4_MEASUREMENT_ID` is resolved
// once, at module load, so this requires `vi.stubEnv` + `vi.resetModules()`
// + a fresh dynamic import to actually exercise the "configured" branch —
// the module-level top-level import used everywhere else in this file
// stays permanently bound to the real (unset) value from before any test
// ran, which is exactly why those tests are a genuine, not mocked, "missing
// config" check.
describe("enableAnalytics / trackEvent — real executed behavior when a Measurement ID IS configured", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadConfiguredAnalytics() {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-TEST0000001");
    vi.resetModules();
    return import("../src/lib/analytics");
  }

  function stubBrowser(pathname: string) {
    vi.stubGlobal("window", {
      location: { hostname: "codivio.online", pathname, href: `https://codivio.online${pathname}` },
    });
    vi.stubGlobal("document", {
      cookie: "",
      head: { appendChild: () => undefined },
      createElement: () => ({ async: false, src: "" }),
    });
  }

  it("resolves the configured value as GA4_MEASUREMENT_ID and reports itself configured", async () => {
    const configured = await loadConfiguredAnalytics();
    expect(configured.GA4_MEASUREMENT_ID).toBe("G-TEST0000001");
    expect(configured.isAnalyticsConfigured()).toBe(true);
  });

  it("enableAnalytics installs a real gtag and trackEvent actually delivers the event", async () => {
    stubBrowser("/tools/qr-code-generator");
    const configured = await loadConfiguredAnalytics();
    configured.enableAnalytics();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    configured.trackEvent("qr_generate", { content_kind: "wifi" });
    expect(calls).toEqual([["event", "qr_generate", { content_kind: "wifi" }]]);
  });
});

describe("Cookie Consent + Analytics wiring in src/App.tsx", () => {
  const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

  it("renders Analytics alongside the consent banner and settings modal, all reacting to route/consent state", () => {
    expect(appSource).toContain('import { trackPageView } from "./lib/analytics";');
    expect(appSource).toContain('import { useConsent } from "./consent/ConsentContext";');
    expect(appSource).toContain("<ScrollRestoration />");
    expect(appSource).toContain("<Analytics />");
    expect(appSource).toContain("<CookieConsentBanner />");
    expect(appSource).toContain("<CookieSettingsModal />");
  });

  it("Analytics only calls trackPageView when analytics consent is granted", () => {
    expect(appSource).toMatch(/if \(consent\?\.analytics\) \{\s*trackPageView\(location\.pathname\);/);
  });

  it("never calls enableAnalytics unconditionally from App.tsx (that decision belongs to ConsentProvider)", () => {
    expect(appSource).not.toContain("enableAnalytics()");
  });
});
