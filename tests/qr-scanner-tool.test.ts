import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 4.6 — QR Code Scanner UI. Structural/source-level checks, matching
 * the existing pattern for tests/qr-generator-tool.test.ts (no jsdom/RTL
 * setup exists in this project — see Known limitations). Functional decode
 * behavior itself is covered by tests/qr-scanner-engine.test.ts and is not
 * duplicated here.
 */
const source = fs.readFileSync(new URL("../src/tools/QrCodeScannerTool.tsx", import.meta.url), "utf8");
const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");

describe("QrCodeScannerTool lazy-loading and wiring", () => {
  it("is lazily imported (dynamic import), not statically", () => {
    expect(toolPageSource).toMatch(/lazy\(\(\) => import\(["']\.\.\/tools\/QrCodeScannerTool["']\)\)/);
  });

  it("renders only for the qr-code-scanner slug; every other tool's placeholder is unchanged", () => {
    expect(toolPageSource).toContain('QR_CODE_SCANNER_SLUG = "qr-code-scanner"');
    expect(toolPageSource).toContain("Tool coming soon");
  });

  it("does not remove or alter the Phase 4.2 QR generator wiring", () => {
    expect(toolPageSource).toContain('QR_CODE_GENERATOR_SLUG = "qr-code-generator"');
    expect(toolPageSource).toContain("QrCodeGeneratorTool");
  });
});

describe("QrCodeScannerTool privacy and security", () => {
  it("never logs scanned content or camera state (no console.* call anywhere)", () => {
    expect(source).not.toMatch(/console\.(log|info|warn|debug|error)/);
  });

  it("never sends decoded content to a server (no fetch/XMLHttpRequest)", () => {
    expect(source).not.toMatch(/fetch\(|XMLHttpRequest/);
  });

  it("never renders decoded content as unsanitized HTML", () => {
    // Matches only real JSX attribute usage (name=), not this file's own
    // doc comment describing that the API is deliberately never used.
    expect(source).not.toMatch(/dangerouslySetInnerHTML\s*=/);
  });

  it("never auto-navigates to a scanned URL", () => {
    expect(source).not.toMatch(/window\.location\s*=|window\.open\(/);
  });

  it("never places decoded content in a URL/query parameter", () => {
    expect(source).not.toMatch(/URLSearchParams|location\.search/);
  });

  it("stops all camera tracks on explicit stop/reset and on unmount", () => {
    const stopCameraCallCount = (source.match(/stopCamera\(\)/g) ?? []).length;
    // At least: the unmount cleanup, the explicit "Stop" action, and reset.
    expect(stopCameraCallCount).toBeGreaterThanOrEqual(3);
    expect(source).toContain("getTracks().forEach");
  });

  it("does not implement download/export controls (reserved for Phase 4.7)", () => {
    expect(source).not.toMatch(/download=/i);
    expect(source).not.toMatch(/>\s*Download/i);
  });
});

describe("QrCodeScannerTool states and UX", () => {
  it("has both a camera and an image-upload entry point", () => {
    expect(source).toContain("startCamera");
    expect(source).toContain("qr-scanner-file-input");
    expect(source).toContain('accept="image/*"');
  });

  it("provides a copy action using the real Clipboard API", () => {
    expect(source).toMatch(/navigator\.clipboard\??\.writeText/);
  });

  it("provides a reset/scan-again action", () => {
    expect(source).toContain("Scan again");
  });

  it("distinguishes camera permission denial from camera unavailability", () => {
    expect(source).toContain("camera-denied");
    expect(source).toContain("camera-unavailable");
    expect(source).toContain("NotAllowedError");
  });

  it("handles an invalid/unsupported uploaded file distinctly from 'no code found'", () => {
    expect(source).toContain("image-invalid");
    expect(source).toContain("no-code-found");
  });

  it("caps the accepted upload size rather than trusting an arbitrarily large file", () => {
    expect(source).toMatch(/MAX_UPLOAD_BYTES/);
  });
});

describe("QrCodeScannerTool resource/abuse controls (Phase 4.8)", () => {
  it("requests a bounded ideal camera resolution rather than an unconstrained one", () => {
    expect(source).toMatch(/width:\s*\{\s*ideal:\s*1280\s*\}/);
    expect(source).toMatch(/height:\s*\{\s*ideal:\s*720\s*\}/);
  });

  it("applies the same MAX_CANVAS_DIMENSION downscale cap to the camera path as the upload path", () => {
    const capOccurrences = (source.match(/MAX_CANVAS_DIMENSION/g) ?? []).length;
    // Declaration + upload-path use + camera-path use = at least 3.
    expect(capOccurrences).toBeGreaterThanOrEqual(3);
  });
});
