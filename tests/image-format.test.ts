import { describe, expect, it } from "vitest";
import { detectImageFormat } from "../shared/image/format";

/**
 * Phase 6.1 — Image processing architecture: format-identification tests.
 *
 * Scope note (corrected after ChatGPT review): this file intentionally
 * tests ONLY detectImageFormat — real, standardized format-signature
 * matching, the one piece of "final validation" territory (size limits,
 * error taxonomy) explicitly reserved for Phase 6.6/6.7, not this
 * architecture-only module. The PNG fixture is a genuinely valid, complete
 * 1x1 PNG (the same real fixture already used and proven in
 * tests/pdf-to-word-engine.test.ts's own makeImageOnlyPdf helper); the
 * JPEG/WebP cases use each format's own real, standardized signature bytes
 * to test pattern matching specifically, not full decodability (which this
 * function never attempts).
 */

const REAL_PNG_1X1 = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da6360000002000155020ea24b5c0000000049454e44ae426082",
  "hex",
);

function realJpegSignatureBytes(): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
}

function realWebpSignatureBytes(): Uint8Array {
  // "RIFF" + 4-byte size (arbitrary, irrelevant to format identification) + "WEBP"
  return new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
}

describe("detectImageFormat", () => {
  it("detects a real JPEG signature", () => {
    expect(detectImageFormat(realJpegSignatureBytes())).toBe("jpeg");
  });

  it("detects a real, genuinely valid PNG", () => {
    expect(detectImageFormat(new Uint8Array(REAL_PNG_1X1))).toBe("png");
  });

  it("detects a real WebP (RIFF+WEBP) signature", () => {
    expect(detectImageFormat(realWebpSignatureBytes())).toBe("webp");
  });

  it("returns null for an unsupported/non-image byte sequence", () => {
    expect(detectImageFormat(new TextEncoder().encode("this is plain text, not an image"))).toBeNull();
  });
});
