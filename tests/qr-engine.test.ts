import { describe, expect, it } from "vitest";
import { DEFAULT_QR_CONFIG, MAX_QR_PAYLOAD_LENGTH, validateQrRequest } from "../shared/qr";
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

  // Phase 4.7 — export formats. JPG reuses the exact same validation/
  // encoding path as PNG, just a different `type` passed to the qrcode
  // library's own toDataURL — no new branching per payload kind.
  //
  // Note on what this test can and cannot verify: `qrcode` resolves to a
  // different implementation for Node (`lib/index.js`, used here under
  // Vitest) than for a real browser bundle (`lib/browser.js`, per the
  // package's own `browser` field — what `vite build` actually ships).
  // Node's server-side PNG renderer has no JPEG support and silently
  // substitutes PNG; the real browser renderer (verified by reading
  // node_modules/qrcode/lib/renderer/canvas.js) passes the requested
  // `type` straight through to the native, universally-supported
  // `HTMLCanvasElement#toDataURL(type)` API, which genuinely does encode
  // JPEG. This test therefore only asserts what's true in both
  // environments (a correctly-tagged, valid, non-empty image data URL) —
  // whether the bytes are genuinely JPEG-encoded in a real browser is
  // `UNKNOWN — NOT VERIFIED` in this Node-based test/dev environment.
  it("renders a valid payload to a tagged, non-empty image data URL for the jpg-data-url format", async () => {
    const payload = { kind: "text" as const, value: "https://codivio.online" };
    const jpg = await generateQrCode(payload, undefined, "jpg-data-url");
    expect(jpg.format).toBe("jpg-data-url");
    expect(jpg.data.startsWith("data:image/")).toBe(true);
    const base64 = jpg.data.split(",")[1];
    expect(Buffer.from(base64, "base64").length).toBeGreaterThan(0);
  });

  it("rejects invalid input for the jpg-data-url and svg formats too, not just the default", async () => {
    await expect(generateQrCode({ kind: "text", value: "" }, undefined, "jpg-data-url")).rejects.toBeInstanceOf(
      QrGenerationError,
    );
    await expect(generateQrCode({ kind: "text", value: "" }, undefined, "svg")).rejects.toBeInstanceOf(
      QrGenerationError,
    );
  });

  // Phase 4.7 export-safety check: the SVG renderer must never embed the
  // raw encoded text anywhere in its markup (it only ever emits numeric
  // path/color/size data derived from the QR bit matrix) — verified here
  // as a permanent regression guard, not just inspected once by hand.
  it("never embeds the raw encoded payload value inside the exported SVG markup", async () => {
    const sentinel = "UNIQUE_SENTINEL_VALUE_1234";
    const svg = await generateQrCode({ kind: "text", value: sentinel }, undefined, "svg");
    expect(svg.data).not.toContain(sentinel);

    const wifiSvg = await generateQrCode(
      { kind: "wifi", ssid: "MySensitiveNetwork", password: "supersecretpass1", security: "WPA", hidden: false },
      undefined,
      "svg",
    );
    expect(wifiSvg.data).not.toContain("MySensitiveNetwork");
    expect(wifiSvg.data).not.toContain("supersecretpass1");
  });

  // Phase 4.8 — a real, empirically-confirmed gap: a payload can pass the
  // flat MAX_QR_PAYLOAD_LENGTH check and still be too much data for the
  // `qrcode` library to actually encode at a higher error-correction level
  // (verified directly against the library: a 2000-character payload
  // throws at "H" but not at "L"/"M"). Without the Phase 4.8 fix this would
  // reach the caller as a raw, un-wrapped library error instead of the same
  // clean QrGenerationError every other validation failure uses.
  it("converts an encoding-time capacity overflow into a clean QrGenerationError, not a raw library error", async () => {
    const payload = { kind: "text" as const, value: "a".repeat(MAX_QR_PAYLOAD_LENGTH) };

    // Confirmed safe at the default level (M) — this must keep working.
    const ok = await generateQrCode(payload, { errorCorrectionLevel: "M" });
    expect(ok.format).toBe("png-data-url");

    // Confirmed to overflow real QR capacity at level "H" — must be a
    // QrGenerationError with the new, specific code, not an unhandled throw.
    let caught: unknown;
    try {
      await generateQrCode(payload, { errorCorrectionLevel: "H" });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(QrGenerationError);
    expect((caught as InstanceType<typeof QrGenerationError>).errors.map((e) => e.code)).toContain(
      "payload_exceeds_capacity",
    );
  });
});
