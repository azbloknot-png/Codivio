import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { enableAnalytics } from "../src/lib/analytics";
import { trackToolOpen, trackToolStart, trackToolComplete, trackDownload } from "../src/lib/tool-analytics";

/**
 * Phase 3.21 — generic tool-lifecycle analytics (tool_open/tool_start/
 * tool_complete/download). Mirrors tests/qr-analytics.test.ts's own
 * structure and conventions exactly: no-consent/no-config behavior with the
 * statically-imported module (this test environment's real, unconfigured
 * state), real delivery behavior via a fresh dynamic import once a
 * Measurement ID is stubbed in, and structural checks that the real call
 * sites wire these functions to genuine, already-existing user actions
 * (never invented functionality).
 */

describe("trackToolOpen / trackToolStart / trackToolComplete / trackDownload — no consent, no config", () => {
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

  it("sends nothing without consent (no enableAnalytics call)", () => {
    const calls = stubBrowser("/tools/qr-code-generator");
    trackToolOpen("qr-code-generator");
    trackToolStart("qr-code-generator");
    trackToolComplete("qr-code-generator");
    trackDownload("qr-code-generator", "png-data-url");
    expect(calls).toHaveLength(0);
  });

  it("enableAnalytics is a real no-op with no Measurement ID configured (this test environment's actual state) — every tool-lifecycle call still sends nothing", () => {
    const calls = stubBrowser("/tools/pdf-merge");
    enableAnalytics();
    trackToolOpen("pdf-merge");
    expect(calls).toHaveLength(0);
  });
});

// Real event delivery, once a Measurement ID is configured — same
// vi.stubEnv + vi.resetModules + fresh-dynamic-import technique as
// tests/analytics.test.ts's and tests/qr-analytics.test.ts's own matching
// blocks (see their comments for why this is necessary rather than mocked).
describe("trackToolOpen / trackToolStart / trackToolComplete / trackDownload — real executed delivery when a Measurement ID IS configured", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadConfigured() {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-TEST0000001");
    vi.resetModules();
    const analyticsModule = await import("../src/lib/analytics");
    const toolAnalyticsModule = await import("../src/lib/tool-analytics");
    return { ...analyticsModule, ...toolAnalyticsModule };
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

  it("trackToolOpen sends tool_open with exactly {tool_slug}", async () => {
    stubBrowser("/tools/pdf-merge");
    const configured = await loadConfigured();
    configured.enableAnalytics();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    configured.trackToolOpen("pdf-merge");
    expect(calls).toEqual([["event", "tool_open", { tool_slug: "pdf-merge" }]]);
  });

  it("trackToolStart sends tool_start with exactly {tool_slug}", async () => {
    stubBrowser("/tools/qr-code-generator");
    const configured = await loadConfigured();
    configured.enableAnalytics();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    configured.trackToolStart("qr-code-generator");
    expect(calls).toEqual([["event", "tool_start", { tool_slug: "qr-code-generator" }]]);
  });

  it("trackToolComplete sends tool_complete with exactly {tool_slug}", async () => {
    stubBrowser("/tools/qr-code-scanner");
    const configured = await loadConfigured();
    configured.enableAnalytics();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    configured.trackToolComplete("qr-code-scanner");
    expect(calls).toEqual([["event", "tool_complete", { tool_slug: "qr-code-scanner" }]]);
  });

  it("trackDownload sends download with exactly {tool_slug, format}", async () => {
    stubBrowser("/tools/qr-code-generator");
    const configured = await loadConfigured();
    configured.enableAnalytics();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    configured.trackDownload("qr-code-generator", "svg");
    expect(calls).toEqual([["event", "download", { tool_slug: "qr-code-generator", format: "svg" }]]);
  });

  it("respects /admin exclusion, same as every other trackEvent-based call", async () => {
    stubBrowser("/admin/tools");
    const configured = await loadConfigured();
    configured.enableAnalytics();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    configured.trackToolOpen("pdf-merge");
    expect(calls).toHaveLength(0);
  });
});

describe("real call sites wire tool-lifecycle events to genuine, already-existing user actions", () => {
  const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
  const generatorSource = fs.readFileSync(new URL("../src/tools/QrCodeGeneratorTool.tsx", import.meta.url), "utf8");
  const scannerSource = fs.readFileSync(new URL("../src/tools/QrCodeScannerTool.tsx", import.meta.url), "utf8");

  it("ToolPage fires tool_open for every tool page view (all 34, including coming-soon placeholders), keyed off the real slug prop — never a hand-typed slug", () => {
    expect(toolPageSource).toContain('import { trackToolOpen } from "../lib/tool-analytics";');
    expect(toolPageSource).toMatch(/useEffect\(\(\) => \{\s*if \(slug\) trackToolOpen\(slug\);\s*\}, \[slug\]\);/);
  });

  it("QrCodeGeneratorTool fires tool_start once real content exists (not on every keystroke) and tool_complete alongside qr_generate", () => {
    expect(generatorSource).toContain('import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";');
    expect(generatorSource).toContain("hasStartedRef.current = true;");
    expect(generatorSource).toContain('trackToolStart(TOOL_SLUG);');
    expect(generatorSource).toContain("trackToolComplete(TOOL_SLUG);");
  });

  it("QrCodeGeneratorTool fires download only on a successful export (inside downloadAs's try block, with the real format), never on a failed one", () => {
    const downloadAsBody = generatorSource.slice(
      generatorSource.indexOf("async function downloadAs"),
      generatorSource.indexOf("\n  }\n\n  return (")
    );
    expect(downloadAsBody).toContain("trackDownload(TOOL_SLUG, format);");
    // The catch block only sets an error message — never calls trackDownload.
    const catchBlock = downloadAsBody.slice(downloadAsBody.indexOf("} catch"));
    expect(catchBlock).not.toContain("trackDownload");
  });

  it("QrCodeScannerTool fires tool_start on a real scan attempt (camera start or a chosen file) and tool_complete alongside both qr_scan call sites", () => {
    expect(scannerSource).toContain('import { trackToolStart, trackToolComplete } from "../lib/tool-analytics";');
    expect(scannerSource).toContain("trackToolStart(TOOL_SLUG);");
    const completeCalls = scannerSource.match(/trackToolComplete\(TOOL_SLUG\);/g) ?? [];
    expect(completeCalls.length).toBe(2); // camera path + upload path, matching trackQrScan's own 2 call sites
  });

  it("no tool_start/tool_complete/download call exists for any of the 32 not-yet-functional tools — only the 2 live QR tools call these", () => {
    const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    expect(appSource).not.toContain("trackToolStart");
    expect(appSource).not.toContain("trackToolComplete");
    expect(appSource).not.toContain("trackDownload");
  });
});
