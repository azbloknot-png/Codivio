import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { isValidQrUrl, validateQrRequest } from "../shared/qr";
import { generateQrCode } from "../src/lib/qr-engine";

/**
 * Phase 4.3 — URL → QR Builder.
 *
 * Only the genuinely new logic is tested here: URL-format validation and
 * the "url" payload kind flowing through the existing engine unchanged.
 * The shared empty/length/config validation and the real PNG/SVG output
 * checks are already covered by tests/qr-engine.test.ts and are not
 * duplicated — this file only adds what's new.
 */

describe("isValidQrUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isValidQrUrl("https://codivio.online")).toBe(true);
    expect(isValidQrUrl("http://example.com/path?query=1")).toBe(true);
  });

  it("rejects non-http(s) schemes and malformed input", () => {
    expect(isValidQrUrl("ftp://example.com")).toBe(false);
    expect(isValidQrUrl("javascript:alert(1)")).toBe(false);
    expect(isValidQrUrl("not a url")).toBe(false);
    expect(isValidQrUrl("")).toBe(false);
  });
});

describe("validateQrRequest with the url payload kind", () => {
  it("accepts a valid https URL", () => {
    const result = validateQrRequest({ kind: "url", value: "https://codivio.online" });
    expect(result.ok).toBe(true);
  });

  it("rejects a non-URL value with invalid_url, reusing (not duplicating) the shared empty-payload check", () => {
    const malformed = validateQrRequest({ kind: "url", value: "not a url" });
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.errors.map((e) => e.code)).toEqual(["invalid_url"]);

    // Empty input reports empty_payload only — it never also runs the
    // URL-format check against an already-empty value.
    const empty = validateQrRequest({ kind: "url", value: "" });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors.map((e) => e.code)).toEqual(["empty_payload"]);
  });

  it("a text-kind payload is never run through URL validation (unrelated to the url kind)", () => {
    const result = validateQrRequest({ kind: "text", value: "this is plainly not a url" });
    expect(result.ok).toBe(true);
  });
});

describe("generateQrCode with a url payload", () => {
  it("renders a valid URL the same way as a text payload (no separate rendering path)", async () => {
    const result = await generateQrCode({ kind: "url", value: "https://codivio.online" });
    expect(result.format).toBe("png-data-url");
    expect(result.data.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("rejects an invalid URL rather than encoding it anyway", async () => {
    await expect(generateQrCode({ kind: "url", value: "not a url" })).rejects.toThrow();
  });
});

describe("QrCodeGeneratorTool URL mode UI", () => {
  const source = fs.readFileSync(new URL("../src/tools/QrCodeGeneratorTool.tsx", import.meta.url), "utf8");

  it("has a Text/URL mode toggle and sends the selected kind to generateQrCode", () => {
    expect(source).toContain('aria-pressed={mode === "text"}');
    expect(source).toContain('aria-pressed={mode === "url"}');
    // Phase 4.4 introduced a third (wifi) mode with its own payload shape,
    // so the text/url payload is now built into a `payload` variable
    // (branched on `mode`) before the single generateQrCode(payload, ...)
    // call site, rather than constructed inline at the call itself.
    expect(source).toContain('{ kind: mode, value: text }');
    expect(source).toContain("generateQrCode(payload,");
  });

  it("never logs the entered URL/text (no console.* call)", () => {
    expect(source).not.toMatch(/console\.(log|info|warn|debug)/);
  });
});
