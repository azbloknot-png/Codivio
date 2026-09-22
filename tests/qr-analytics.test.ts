import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { enableAnalytics } from "../src/lib/analytics";
import { trackQrGenerate, trackQrScan } from "../src/lib/qr-analytics";

/**
 * Phase 4.9 — QR Analytics Architecture. Proves two things, per this
 * phase's own explicit acceptance criteria:
 *
 *  1. Payload privacy is enforced BY THE TYPE SYSTEM, not just convention
 *     — trackQrGenerate/trackQrScan only accept a closed-union "kind"
 *     literal, so a caller cannot pass raw payload/decoded text even by
 *     mistake. The `@ts-expect-error` cases below are a real compile-time
 *     assertion: `npm run typecheck:tests` (which runs `tsc --noEmit` over
 *     this exact file) would fail if either line stopped actually being a
 *     type error — "Unused '@ts-expect-error' directive" is a hard tsc
 *     error, not a silent no-op.
 *  2. Correct consent/`/admin`-gating behavior, exercised with real,
 *     executed code (same minimal-stub technique as tests/analytics.test.ts)
 *     — not just asserted to exist in source.
 */

describe("trackQrGenerate / trackQrScan — type-level payload privacy", () => {
  it("only accepts a real QrPayload kind literal, never arbitrary text", () => {
    // @ts-expect-error — a free-form string (e.g. raw payload text) must
    // be rejected; only "text" | "url" | "wifi" | "vcard" is valid.
    trackQrGenerate("my secret wifi password: hunter2");
    expect(true).toBe(true);
  });

  it("only accepts a real ScannedQrContentKind literal, never decoded text", () => {
    // @ts-expect-error — a free-form string (e.g. actual decoded QR
    // content) must be rejected; only the closed classification kinds are.
    trackQrScan("WIFI:T:WPA;S:MyNetwork;P:hunter2;;");
    expect(true).toBe(true);
  });
});

describe("trackQrGenerate / trackQrScan — real executed consent + /admin gating", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubBrowser(pathname: string) {
    vi.stubGlobal("window", {
      location: { hostname: "codivio.online", pathname, href: `https://codivio.online${pathname}` },
    });
    vi.stubGlobal("document", {
      cookie: "",
      head: { appendChild: () => undefined },
      createElement: () => ({ async: false, src: "" }),
    });
    window.dataLayer = [];
  }

  // Runs first, deliberately, before any enableAnalytics() call touches
  // this file's module state — `initialized` is a module-level singleton
  // (mirroring real page-lifetime behavior; there is no reset primitive),
  // so a "no consent yet" assertion is only meaningful before the first
  // real enable in this file, matching the same ordering-sensitive pattern
  // tests/analytics.test.ts's own "safe outside a browser" block uses.
  it("sends nothing without consent (no enableAnalytics call)", () => {
    stubBrowser("/tools/qr-code-generator");
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    trackQrGenerate("text");
    expect(calls).toHaveLength(0);
  });

  it("enableAnalytics is a real no-op with no Measurement ID configured (this test environment's actual state) — trackQrGenerate still sends nothing", () => {
    stubBrowser("/tools/qr-code-generator");
    enableAnalytics();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    trackQrGenerate("wifi");
    expect(calls).toHaveLength(0);
  });
});

// Phase 3.21 — the Measurement ID is now resolved once, at module load, from
// `import.meta.env.VITE_GA4_MEASUREMENT_ID` (see tests/analytics.test.ts's
// own matching block for the full explanation). Proving trackQrGenerate/
// trackQrScan still deliver real events when a Measurement ID IS configured
// requires a fresh dynamic import of both src/lib/analytics AND
// src/lib/qr-analytics after `vi.stubEnv`, so they share the same
// freshly-configured module instance.
describe("trackQrGenerate / trackQrScan — real executed delivery when a Measurement ID IS configured", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  async function loadConfigured() {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-TEST0000001");
    vi.resetModules();
    const analyticsModule = await import("../src/lib/analytics");
    const qrAnalyticsModule = await import("../src/lib/qr-analytics");
    return { ...analyticsModule, ...qrAnalyticsModule };
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

  it("trackQrGenerate sends qr_generate with exactly {content_kind} once consent is granted", async () => {
    stubBrowser("/tools/qr-code-generator");
    const configured = await loadConfigured();
    configured.enableAnalytics();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    configured.trackQrGenerate("wifi");
    expect(calls).toEqual([["event", "qr_generate", { content_kind: "wifi" }]]);
  });

  it("trackQrScan sends qr_scan with exactly {content_kind} once consent is granted", async () => {
    stubBrowser("/tools/qr-code-scanner");
    const configured = await loadConfigured();
    configured.enableAnalytics();
    const calls: unknown[][] = [];
    window.gtag = (...args: unknown[]) => calls.push(args);
    configured.trackQrScan("url");
    expect(calls).toEqual([["event", "qr_scan", { content_kind: "url" }]]);
  });
});

describe("QR tool components only ever send a classified kind, never payload content", () => {
  const generatorSource = fs.readFileSync(new URL("../src/tools/QrCodeGeneratorTool.tsx", import.meta.url), "utf8");
  const scannerSource = fs.readFileSync(new URL("../src/tools/QrCodeScannerTool.tsx", import.meta.url), "utf8");

  it("QrCodeGeneratorTool calls trackQrGenerate(payload.kind), never with raw text/wifi/vcard field values", () => {
    expect(generatorSource).toContain('import { trackQrGenerate } from "../lib/qr-analytics";');
    expect(generatorSource).toContain("trackQrGenerate(payload.kind);");
    // Never called with a free-form variable that could hold entered text.
    expect(generatorSource).not.toMatch(/trackQrGenerate\((?!payload\.kind\))/);
  });

  it("QrCodeScannerTool calls trackQrScan(classifyScannedQrContent(result.data).kind), never with decodedText/result.data directly", () => {
    expect(scannerSource).toContain('import { trackQrScan } from "../lib/qr-analytics";');
    // One level of nested parens (classifyScannedQrContent(...)) means a
    // naive `[^)]*` capture truncates at the inner ")" — matched explicitly
    // instead of with a generic capture-then-compare.
    const calls = scannerSource.match(/trackQrScan\(classifyScannedQrContent\(result\.data\)\.kind\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2); // camera path + upload path
    // No other trackQrScan call shape exists anywhere in the file (e.g.
    // one accidentally passing decodedText or result.data directly).
    const allCallSites = scannerSource.match(/trackQrScan\([^;]*\);/g) ?? [];
    expect(allCallSites.length).toBe(calls.length);
  });
});
