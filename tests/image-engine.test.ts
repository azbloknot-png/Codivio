import { describe, expect, it, vi } from "vitest";
import {
  computeLockedDimensions,
  getImageDimensions,
  resizeImage,
  compressImage,
  convertImage,
  shouldCompositeWhiteBackground,
  ImageResizeError,
  ImageCompressError,
  ImageConvertError,
  type ImageResizeOverrides,
  type ImageCompressOverrides,
  type ImageConvertOverrides,
} from "../src/lib/image-engine";
import type { ImageFileInput, ImageFormat } from "../shared/image/types";
import { MAX_IMAGE_DIMENSION_PX } from "../shared/image/validate";

/**
 * Phase 6.2 (Resize) + Phase 6.3 (Compress) — Image engine tests.
 *
 * `computeLockedDimensions` is pure and tested directly (no environment
 * limitation). `getImageDimensions`/`resizeImage`/`compressImage` cannot
 * exercise real `createImageBitmap`/`OffscreenCanvas` in this Node-based
 * Vitest environment (ENVIRONMENT LIMITATION, same as
 * src/lib/pdf-engine.ts#reencodeJpegWithCanvas in Phase 5.4) — they are
 * tested through the real `decodeImage`/`renderResized`/`encodeAtQuality`
 * override seams, which are genuinely necessary here, not a convenience.
 * Real format signature bytes throughout (the same fixtures already proven
 * in tests/image-format.test.ts), never fabricated "counts as an image"
 * bytes.
 */

const REAL_PNG_1X1 = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da6360000002000155020ea24b5c0000000049454e44ae426082",
  "hex",
);

function realPngFile(name = "photo.png"): ImageFileInput {
  return { name, size: REAL_PNG_1X1.length, bytes: new Uint8Array(REAL_PNG_1X1) };
}

// Real, standardized JPEG/WebP signature bytes (same values proven in
// tests/image-format.test.ts) — sufficient for detectImageFormat, which is
// all these fixtures need to exercise since the actual decode is always
// mocked via the decodeImage override in this file's tests.
function realJpegFile(name = "photo.jpg"): ImageFileInput {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  return { name, size: bytes.length, bytes };
}

function realWebpFile(name = "photo.webp"): ImageFileInput {
  const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  return { name, size: bytes.length, bytes };
}

function makeMockImage(width: number, height: number) {
  return { width, height, close: vi.fn() };
}

describe("computeLockedDimensions", () => {
  it("derives height from a changed width, preserving the source aspect ratio", () => {
    // 200x100 source (2:1) resized to width 100 -> height 50
    expect(computeLockedDimensions(200, 100, "width", 100)).toEqual({ width: 100, height: 50 });
  });

  it("derives width from a changed height, preserving the source aspect ratio", () => {
    // 200x100 source (2:1) resized to height 25 -> width 50
    expect(computeLockedDimensions(200, 100, "height", 25)).toEqual({ width: 50, height: 25 });
  });

  it("never derives a dimension below 1 pixel, even for an extreme aspect ratio", () => {
    const result = computeLockedDimensions(10000, 1, "width", 1);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});

describe("getImageDimensions", () => {
  it("reports the real decoded dimensions and format, and releases the decoded image", async () => {
    const mockImage = makeMockImage(400, 300);
    const overrides: Pick<ImageResizeOverrides, "decodeImage"> = {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
    };
    const result = await getImageDimensions(realPngFile(), overrides);
    expect(result).toEqual({ width: 400, height: 300, format: "png" });
    expect(mockImage.close).toHaveBeenCalledOnce();
  });

  it("rejects an empty file before attempting to decode", async () => {
    const file: ImageFileInput = { name: "empty.png", size: 0, bytes: new Uint8Array(0) };
    await expect(getImageDimensions(file)).rejects.toMatchObject({ code: "empty_file" });
  });

  it("rejects a file with an unrecognized signature before attempting to decode", async () => {
    const file: ImageFileInput = { name: "not-image.txt", size: 10, bytes: new TextEncoder().encode("not-image!") };
    await expect(getImageDimensions(file)).rejects.toMatchObject({ code: "invalid_image_signature" });
  });

  it("rejects a decoded image wider than the Phase 6.6 MAX_IMAGE_DIMENSION_PX limit, releasing the decoded image", async () => {
    const mockImage = makeMockImage(MAX_IMAGE_DIMENSION_PX + 1, 100);
    const overrides: Pick<ImageResizeOverrides, "decodeImage"> = {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
    };
    await expect(getImageDimensions(realPngFile(), overrides)).rejects.toMatchObject({ code: "dimension_too_large" });
    expect(mockImage.close).toHaveBeenCalledOnce();
  });

  it("accepts a decoded image exactly at the MAX_IMAGE_DIMENSION_PX boundary", async () => {
    const mockImage = makeMockImage(MAX_IMAGE_DIMENSION_PX, MAX_IMAGE_DIMENSION_PX);
    const overrides: Pick<ImageResizeOverrides, "decodeImage"> = {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
    };
    const result = await getImageDimensions(realPngFile(), overrides);
    expect(result.width).toBe(MAX_IMAGE_DIMENSION_PX);
  });
});

describe("resizeImage", () => {
  it("rejects an empty file", async () => {
    const file: ImageFileInput = { name: "empty.png", size: 0, bytes: new Uint8Array(0) };
    await expect(resizeImage(file, 100, 100)).rejects.toMatchObject({ code: "empty_file" });
  });

  it("rejects a file with an unrecognized signature", async () => {
    const file: ImageFileInput = { name: "not-image.txt", size: 10, bytes: new TextEncoder().encode("not-image!") };
    await expect(resizeImage(file, 100, 100)).rejects.toMatchObject({ code: "invalid_image_signature" });
  });

  it("rejects non-positive or non-integer target dimensions", async () => {
    const file = realPngFile();
    for (const [width, height] of [
      [0, 100],
      [100, -5],
      [10.5, 100],
    ] as const) {
      await expect(resizeImage(file, width, height)).rejects.toMatchObject({ code: "invalid_dimensions" });
    }
  });

  it("resizes successfully: returns the target dimensions, preserves the source format, and releases the decoded image", async () => {
    const mockImage = makeMockImage(400, 300);
    const outputBytes = new Uint8Array([1, 2, 3, 4]);
    const overrides: ImageResizeOverrides = {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
      renderResized: vi.fn().mockResolvedValue(outputBytes),
    };
    const result = await resizeImage(realPngFile(), 200, 150, overrides);
    expect(result).toEqual({ bytes: outputBytes, format: "png", width: 200, height: 150 });
    expect(overrides.renderResized).toHaveBeenCalledWith(mockImage, 200, 150, "png");
    expect(mockImage.close).toHaveBeenCalledOnce();
  });

  it("reports a specific decode_failed error when the browser cannot decode the file", async () => {
    const overrides: ImageResizeOverrides = {
      decodeImage: vi.fn().mockRejectedValue(new Error("simulated real decode failure")),
    };
    await expect(resizeImage(realPngFile(), 100, 100, overrides)).rejects.toMatchObject({ code: "decode_failed" });
  });

  it("reports a specific encode_failed error and still releases the decoded image when resizing/encoding fails", async () => {
    const mockImage = makeMockImage(400, 300);
    const overrides: ImageResizeOverrides = {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
      renderResized: vi.fn().mockRejectedValue(new Error("simulated real encode failure")),
    };
    await expect(resizeImage(realPngFile(), 100, 100, overrides)).rejects.toMatchObject({ code: "encode_failed" });
    expect(mockImage.close).toHaveBeenCalledOnce();
  });

  it("throws a named ImageResizeError, never a raw library error", async () => {
    const file: ImageFileInput = { name: "empty.png", size: 0, bytes: new Uint8Array(0) };
    await expect(resizeImage(file, 100, 100)).rejects.toBeInstanceOf(ImageResizeError);
  });

  it("rejects a decoded source image taller than MAX_IMAGE_DIMENSION_PX, before attempting to render, releasing the decoded image", async () => {
    const mockImage = makeMockImage(100, MAX_IMAGE_DIMENSION_PX + 1);
    const renderResized = vi.fn();
    const overrides: ImageResizeOverrides = { decodeImage: vi.fn().mockResolvedValue(mockImage), renderResized };
    await expect(resizeImage(realPngFile(), 50, 50, overrides)).rejects.toMatchObject({ code: "dimension_too_large" });
    expect(renderResized).not.toHaveBeenCalled();
    expect(mockImage.close).toHaveBeenCalledOnce();
  });
});

describe("compressImage", () => {
  it("rejects an empty file", async () => {
    const file: ImageFileInput = { name: "empty.png", size: 0, bytes: new Uint8Array(0) };
    await expect(compressImage(file)).rejects.toMatchObject({ code: "empty_file" });
  });

  it("rejects a file with an unrecognized signature", async () => {
    const file: ImageFileInput = { name: "not-image.txt", size: 10, bytes: new TextEncoder().encode("not-image!") };
    await expect(compressImage(file)).rejects.toMatchObject({ code: "invalid_image_signature" });
  });

  it("compresses successfully when re-encoding genuinely shrinks the file: reports reduced:true with the real output size, and releases the decoded image", async () => {
    const mockImage = makeMockImage(400, 300);
    const smallerBytes = new Uint8Array(REAL_PNG_1X1.length - 10); // genuinely smaller than the real input
    const overrides: ImageCompressOverrides = {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
      encodeAtQuality: vi.fn().mockResolvedValue(smallerBytes),
    };
    const result = await compressImage(realPngFile(), overrides);
    expect(result.reduced).toBe(true);
    expect(result.bytes).toBe(smallerBytes);
    expect(result.outputSize).toBe(smallerBytes.length);
    expect(result.originalSize).toBe(REAL_PNG_1X1.length);
    expect(result.format).toBe("png");
    expect(overrides.encodeAtQuality).toHaveBeenCalledWith(mockImage, "png", 0.7);
    expect(mockImage.close).toHaveBeenCalledOnce();
  });

  it("honestly reports reduced:false and returns the original untouched bytes when re-encoding does not shrink the file (the real, expected PNG case)", async () => {
    const mockImage = makeMockImage(400, 300);
    const file = realPngFile();
    // Simulates PNG's real lack of a lossy quality knob: re-encoding
    // produces output the same size as (or larger than) the original.
    const notSmallerBytes = new Uint8Array(REAL_PNG_1X1.length + 5);
    const overrides: ImageCompressOverrides = {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
      encodeAtQuality: vi.fn().mockResolvedValue(notSmallerBytes),
    };
    const result = await compressImage(file, overrides);
    expect(result.reduced).toBe(false);
    expect(result.bytes).toBe(file.bytes);
    expect(result.outputSize).toBe(result.originalSize);
    expect(mockImage.close).toHaveBeenCalledOnce();
  });

  it("reports a specific decode_failed error when the browser cannot decode the file", async () => {
    const overrides: ImageCompressOverrides = {
      decodeImage: vi.fn().mockRejectedValue(new Error("simulated real decode failure")),
    };
    await expect(compressImage(realPngFile(), overrides)).rejects.toMatchObject({ code: "decode_failed" });
  });

  it("reports a specific encode_failed error and still releases the decoded image when re-encoding fails", async () => {
    const mockImage = makeMockImage(400, 300);
    const overrides: ImageCompressOverrides = {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
      encodeAtQuality: vi.fn().mockRejectedValue(new Error("simulated real encode failure")),
    };
    await expect(compressImage(realPngFile(), overrides)).rejects.toMatchObject({ code: "encode_failed" });
    expect(mockImage.close).toHaveBeenCalledOnce();
  });

  it("throws a named ImageCompressError, never a raw library error", async () => {
    const file: ImageFileInput = { name: "empty.png", size: 0, bytes: new Uint8Array(0) };
    await expect(compressImage(file)).rejects.toBeInstanceOf(ImageCompressError);
  });

  it("rejects a decoded image wider than MAX_IMAGE_DIMENSION_PX, before attempting to re-encode, releasing the decoded image", async () => {
    const mockImage = makeMockImage(MAX_IMAGE_DIMENSION_PX + 1, 100);
    const encodeAtQuality = vi.fn();
    const overrides: ImageCompressOverrides = { decodeImage: vi.fn().mockResolvedValue(mockImage), encodeAtQuality };
    await expect(compressImage(realPngFile(), overrides)).rejects.toMatchObject({ code: "dimension_too_large" });
    expect(encodeAtQuality).not.toHaveBeenCalled();
    expect(mockImage.close).toHaveBeenCalledOnce();
  });
});

describe("convertImage", () => {
  it("rejects an empty file", async () => {
    const file: ImageFileInput = { name: "empty.png", size: 0, bytes: new Uint8Array(0) };
    await expect(convertImage(file, "jpeg")).rejects.toMatchObject({ code: "empty_file" });
  });

  it("rejects a file with an unrecognized signature", async () => {
    const file: ImageFileInput = { name: "not-image.txt", size: 10, bytes: new TextEncoder().encode("not-image!") };
    await expect(convertImage(file, "jpeg")).rejects.toMatchObject({ code: "invalid_image_signature" });
  });

  it("rejects converting a file to the format it already is", async () => {
    await expect(convertImage(realPngFile(), "png")).rejects.toMatchObject({ code: "same_format" });
  });

  it("converts correctly across all 6 real supported source/target combinations, preserving dimensions and reporting the real output format", async () => {
    const cases: Array<{ file: ImageFileInput; sourceFormat: ImageFormat; targetFormat: ImageFormat }> = [
      { file: realJpegFile(), sourceFormat: "jpeg", targetFormat: "png" },
      { file: realJpegFile(), sourceFormat: "jpeg", targetFormat: "webp" },
      { file: realPngFile(), sourceFormat: "png", targetFormat: "jpeg" },
      { file: realPngFile(), sourceFormat: "png", targetFormat: "webp" },
      { file: realWebpFile(), sourceFormat: "webp", targetFormat: "jpeg" },
      { file: realWebpFile(), sourceFormat: "webp", targetFormat: "png" },
    ];

    for (const { file, sourceFormat, targetFormat } of cases) {
      const mockImage = makeMockImage(320, 240);
      const outputBytes = new Uint8Array([9, 9, 9]);
      const overrides: ImageConvertOverrides = {
        decodeImage: vi.fn().mockResolvedValue(mockImage),
        encodeConverted: vi.fn().mockResolvedValue(outputBytes),
      };
      const result = await convertImage(file, targetFormat, overrides);
      expect(result.sourceFormat, `${sourceFormat}->${targetFormat}`).toBe(sourceFormat);
      expect(result.format, `${sourceFormat}->${targetFormat}`).toBe(targetFormat);
      expect(result.bytes).toBe(outputBytes);
      expect(result.width).toBe(320);
      expect(result.height).toBe(240);
      expect(overrides.encodeConverted).toHaveBeenCalledWith(mockImage, targetFormat);
      expect(mockImage.close).toHaveBeenCalledOnce();
    }
  });

  it("reports a specific decode_failed error when the browser cannot decode the file", async () => {
    const overrides: ImageConvertOverrides = {
      decodeImage: vi.fn().mockRejectedValue(new Error("simulated real decode failure")),
    };
    await expect(convertImage(realPngFile(), "jpeg", overrides)).rejects.toMatchObject({ code: "decode_failed" });
  });

  it("reports a specific encode_failed error and still releases the decoded image when conversion fails", async () => {
    const mockImage = makeMockImage(100, 100);
    const overrides: ImageConvertOverrides = {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
      encodeConverted: vi.fn().mockRejectedValue(new Error("simulated real encode failure")),
    };
    await expect(convertImage(realPngFile(), "jpeg", overrides)).rejects.toMatchObject({ code: "encode_failed" });
    expect(mockImage.close).toHaveBeenCalledOnce();
  });

  it("throws a named ImageConvertError, never a raw library error", async () => {
    const file: ImageFileInput = { name: "empty.png", size: 0, bytes: new Uint8Array(0) };
    await expect(convertImage(file, "jpeg")).rejects.toBeInstanceOf(ImageConvertError);
  });

  it("rejects a decoded image taller than MAX_IMAGE_DIMENSION_PX, before attempting to convert, releasing the decoded image", async () => {
    const mockImage = makeMockImage(100, MAX_IMAGE_DIMENSION_PX + 1);
    const encodeConverted = vi.fn();
    const overrides: ImageConvertOverrides = { decodeImage: vi.fn().mockResolvedValue(mockImage), encodeConverted };
    await expect(convertImage(realPngFile(), "jpeg", overrides)).rejects.toMatchObject({ code: "dimension_too_large" });
    expect(encodeConverted).not.toHaveBeenCalled();
    expect(mockImage.close).toHaveBeenCalledOnce();
  });
});

describe("shouldCompositeWhiteBackground (Phase 6.4 transparency policy)", () => {
  it("requires a white background fill only for a JPEG target — the one format with no alpha channel", () => {
    expect(shouldCompositeWhiteBackground("jpeg")).toBe(true);
    expect(shouldCompositeWhiteBackground("png")).toBe(false);
    expect(shouldCompositeWhiteBackground("webp")).toBe(false);
  });
});
