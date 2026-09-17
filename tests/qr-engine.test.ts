import { describe, expect, it } from "vitest";
import { DEFAULT_QR_CONFIG, validateQrRequest } from "../shared/qr";
import { generateQrCode, QrGenerationError } from "../src/lib/qr-engine";

describe("validateQrRequest", () => {
  it("accepts a valid text payload with no config override, filling in defaults", () => {
    const result = validateQrRequest({ kind: "text", value: "https://codivio.online" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config).toEqual(DEFAULT_QR_CONFIG);
    }
  });

  it("rejects empty, whitespace-only, and over-length payloads with the correct codes", () => {
    const empty = validateQrRequest({ kind: "text", value: "" });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors.map((e) => e.code)).toContain("empty_payload");

    const whitespace = validateQrRequest({ kind: "text", value: "   " });
    expect(whitespace.ok).toBe(false);
    if (!whitespace.ok) expect(whitespace.errors.map((e) => e.code)).toContain("empty_payload");

    const tooLong = validateQrRequest({ kind: "text", value: "a".repeat(2001) });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(tooLong.errors.map((e) => e.code)).toContain("payload_too_long");

    // Multiple simultaneous errors are all collected, not just the first.
    const both = validateQrRequest({ kind: "text", value: "" }, { size: 1 });
    expect(both.ok).toBe(false);
    if (!both.ok) {
      expect(both.errors.map((e) => e.code)).toEqual(
        expect.arrayContaining(["empty_payload", "invalid_size"]),
      );
    }
  });

  it("fills in a partial config from defaults and flags one bad value per field", () => {
    const partial = validateQrRequest({ kind: "text", value: "hello" }, { errorCorrectionLevel: "H" });
    expect(partial.ok).toBe(true);
    if (partial.ok) {
      expect(partial.config).toEqual({ ...DEFAULT_QR_CONFIG, errorCorrectionLevel: "H" });
    }

    const badLevel = validateQrRequest({ kind: "text", value: "hello" }, { errorCorrectionLevel: "X" as never });
    if (!badLevel.ok) expect(badLevel.errors.map((e) => e.code)).toContain("invalid_error_correction_level");

    const badSize = validateQrRequest({ kind: "text", value: "hello" }, { size: 4096 });
    if (!badSize.ok) expect(badSize.errors.map((e) => e.code)).toContain("invalid_size");

    const badMargin = validateQrRequest({ kind: "text", value: "hello" }, { margin: -1 });
    if (!badMargin.ok) expect(badMargin.errors.map((e) => e.code)).toContain("invalid_margin");

    const badFg = validateQrRequest({ kind: "text", value: "hello" }, { foregroundColor: "blue" });
    if (!badFg.ok) expect(badFg.errors.map((e) => e.code)).toContain("invalid_foreground_color");

    const badBg = validateQrRequest({ kind: "text", value: "hello" }, { backgroundColor: "rgb(0,0,0)" });
    if (!badBg.ok) expect(badBg.errors.map((e) => e.code)).toContain("invalid_background_color");
  });
});

describe("generateQrCode", () => {
  it("renders a valid short payload to a well-formed PNG data URL and to SVG markup", async () => {
    const payload = { kind: "text" as const, value: "https://codivio.online" };

    const png = await generateQrCode(payload);
    expect(png.format).toBe("png-data-url");
    expect(png.data.startsWith("data:image/png;base64,")).toBe(true);
    const base64 = png.data.split(",")[1];
    expect(Buffer.from(base64, "base64").length).toBeGreaterThan(0);

    const svg = await generateQrCode(payload, undefined, "svg");
    expect(svg.format).toBe("svg");
    expect(svg.data).toContain("<svg");
    expect(svg.data).toMatch(/viewBox|width/);
  });

  it("rejects invalid input rather than silently rendering a blank QR", async () => {
    await expect(generateQrCode({ kind: "text", value: "" })).rejects.toBeInstanceOf(QrGenerationError);
  });

  it("produces deterministic output for the same payload and config", async () => {
    const payload = { kind: "text" as const, value: "Codivio" };
    const first = await generateQrCode(payload);
    const second = await generateQrCode(payload);
    expect(first.data).toBe(second.data);
  });
});
