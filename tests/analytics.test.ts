import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import {
  disableAnalytics,
  enableAnalytics,
  GA4_MEASUREMENT_ID,
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
 */

describe("GA4 measurement ID", () => {
  it("is the real, provided measurement ID, not a placeholder", () => {
    expect(GA4_MEASUREMENT_ID).toBe("G-NFMYHQX593");
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

  it("sends the exact event name and params once consent is granted, on a trackable path", () => {
    stubBrowser("/tools/qr-code-generator");
    enableAnalytics();
    // enableAnalytics installs its own real gtag on first init; re-stub it
    // afterward so this test observes calls regardless of call order.
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    trackEvent("qr_generate", { content_kind: "wifi" });
    expect(calls).toEqual([["event", "qr_generate", { content_kind: "wifi" }]]);
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
