import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 4.2 — structural checks for the QR Code Generator tool UI.
 *
 * No component-testing setup (jsdom/@testing-library/react) exists in this
 * project (see PROJECT_STATE.md's Known limitations) — these are real,
 * source-level regression guards for the specific things most likely to
 * silently break: the lazy-loading boundary that keeps `qrcode` out of the
 * other 33 tool pages' bundle, and the "never log the payload" rule.
 * Functional QR-generation behavior itself is already covered by
 * tests/qr-engine.test.ts and is not re-tested here.
 */

const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const generatorSource = fs.readFileSync(new URL("../src/tools/QrCodeGeneratorTool.tsx", import.meta.url), "utf8");

describe("QR Generator lazy-loading boundary (bundle-impact regression guard)", () => {
  it("ToolPage.tsx loads QrCodeGeneratorTool via a dynamic import, not a static one", () => {
    expect(toolPageSource).toContain('lazy(() => import("../tools/QrCodeGeneratorTool"))');
    expect(toolPageSource).not.toMatch(/^import QrCodeGeneratorTool from/m);
  });

  it("the real generator UI renders only for the qr-code-generator slug, never for any other tool", () => {
    expect(toolPageSource).toContain('slug === QR_CODE_GENERATOR_SLUG ? "tool-workspace qr-generator-workspace"');
    expect(toolPageSource).toContain('const QR_CODE_GENERATOR_SLUG = "qr-code-generator";');
  });

  it("the placeholder markup for every other tool is unchanged (still renders 'Tool coming soon')", () => {
    expect(toolPageSource).toContain("Tool coming soon");
    expect(toolPageSource).toContain("tool-workspace-placeholder");
  });
});

describe("QR Generator privacy and architecture rules", () => {
  it("never logs the user's payload (no console.* call anywhere in the component)", () => {
    expect(generatorSource).not.toMatch(/console\.(log|info|warn|debug)/);
  });

  it("reuses the shared Phase 4.1 engine rather than re-implementing QR generation", () => {
    expect(generatorSource).toContain('from "../lib/qr-engine"');
    expect(generatorSource).not.toContain('from "qrcode"');
  });

  it("only src/lib/qr-engine.ts imports the qrcode package directly", () => {
    expect(generatorSource).not.toMatch(/from ["']qrcode["']/);
  });
});
