import { describe, expect, it } from "vitest";
import {
  validateImageFileInput,
  validateImageDimensions,
  MAX_IMAGE_FILE_BYTES,
  MAX_IMAGE_DIMENSION_PX,
} from "../shared/image/validate";
import type { ImageFileInput } from "../shared/image/types";

/**
 * Phase 6.6 — Format / Size Validation: shared image-file validation tests.
 *
 * Covers the checks `validateImageFileInput`/`validateImageDimensions`
 * centralize for Resize/Compress/Convert (previously duplicated identically
 * across src/lib/image-engine.ts's four operations — see that module's own
 * Stage 1/Stage 2 report). The 50 MB file-size and 8192px dimension limits
 * were explicitly product-authorized after this sub-phase's own evidence
 * review found no number was justified by project evidence alone — see
 * shared/image/validate.ts's own header comment. Background Remover's
 * separate, unchanged 5 MB / 4096px policy is not this file's concern
 * (covered by tests/background-remover-engine.test.ts).
 */

const REAL_PNG_1X1 = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da6360000002000155020ea24b5c0000000049454e44ae426082",
  "hex",
);

function realPngFile(): ImageFileInput {
  return { name: "photo.png", size: REAL_PNG_1X1.length, bytes: new Uint8Array(REAL_PNG_1X1) };
}

describe("validateImageFileInput", () => {
  it("accepts a real, valid PNG and reports its detected format", () => {
    const result = validateImageFileInput(realPngFile());
    expect(result).toEqual({ ok: true, format: "png" });
  });

  it("rejects an empty file before any format check, with the exact error code/message every operation already used", () => {
    const file: ImageFileInput = { name: "empty.png", size: 0, bytes: new Uint8Array() };
    const result = validateImageFileInput(file);
    expect(result).toEqual({ ok: false, error: { code: "empty_file", message: '"empty.png" is empty.' } });
  });

  it("treats a zero-length byte array as empty even if `size` claims otherwise (defensive, matches every prior duplicated check)", () => {
    const file: ImageFileInput = { name: "mismatched.png", size: 10, bytes: new Uint8Array() };
    expect(validateImageFileInput(file).ok).toBe(false);
  });

  it("rejects a file with no recognized JPEG/PNG/WebP signature", () => {
    const file: ImageFileInput = { name: "fake.png", size: 4, bytes: new Uint8Array([1, 2, 3, 4]) };
    const result = validateImageFileInput(file);
    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid_image_signature",
        message: '"fake.png" does not look like a supported image (JPEG, PNG, or WebP).',
      },
    });
  });

  it("never trusts the file name/extension alone — a .png-named file with no real signature is still rejected", () => {
    const file: ImageFileInput = { name: "totally-a-real.png", size: 3, bytes: new Uint8Array([0, 0, 0]) };
    expect(validateImageFileInput(file).ok).toBe(false);
  });

  it("accepts a file exactly at the 50 MB boundary (size check happens before format check, but a real PNG signature still passes both)", () => {
    const bytes = new Uint8Array(MAX_IMAGE_FILE_BYTES);
    bytes.set(REAL_PNG_1X1.subarray(0, 8)); // real PNG magic bytes at the start
    const file: ImageFileInput = { name: "boundary.png", size: bytes.length, bytes };
    expect(validateImageFileInput(file)).toEqual({ ok: true, format: "png" });
  });

  it("rejects a file one byte over the 50 MB limit, before any format check, with the exact required message", () => {
    const oversized = new Uint8Array(MAX_IMAGE_FILE_BYTES + 1);
    const file: ImageFileInput = { name: "huge.png", size: oversized.length, bytes: oversized };
    expect(validateImageFileInput(file)).toEqual({
      ok: false,
      error: { code: "file_too_large", message: '"huge.png" is too large. Maximum supported size is 50 MB.' },
    });
  });
});

describe("validateImageDimensions", () => {
  it("accepts dimensions exactly at the 8192px boundary in both axes", () => {
    expect(validateImageDimensions(MAX_IMAGE_DIMENSION_PX, MAX_IMAGE_DIMENSION_PX)).toEqual({ ok: true });
  });

  it("accepts ordinary, well-below-limit dimensions", () => {
    expect(validateImageDimensions(1920, 1080)).toEqual({ ok: true });
  });

  it("rejects a width one pixel over the 8192px limit", () => {
    const result = validateImageDimensions(MAX_IMAGE_DIMENSION_PX + 1, 100);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("dimension_too_large");
      expect(result.error.message).toContain(`${MAX_IMAGE_DIMENSION_PX}px`);
    }
  });

  it("rejects a height one pixel over the 8192px limit", () => {
    expect(validateImageDimensions(100, MAX_IMAGE_DIMENSION_PX + 1).ok).toBe(false);
  });
});
