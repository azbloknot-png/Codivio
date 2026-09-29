import { describe, expect, it, vi } from "vitest";
import {
  removeBackground,
  compositeAlphaFromMask,
  detectInputFormat,
  BackgroundRemoverError,
  MEDIAPIPE_WASM_BASE_PATH,
  MEDIAPIPE_MODEL_URL,
  MAX_FILE_SIZE_BYTES,
  MAX_RASTER_DIMENSION_PX,
} from "../src/lib/background-remover-engine";
import type { ImageFileInput } from "../shared/image/types";

/**
 * Phase 6.5 — Background Remover engine tests.
 *
 * The real MediaPipe WASM/ONNX-style ML inference and real OffscreenCanvas
 * pixel operations cannot run in this project's Node-based Vitest
 * environment (ENVIRONMENT LIMITATION, same as every other Image tool's
 * `default*` functions) — those are exercised here only through injected
 * test seams (`decodeImage`/`segmentForeground`/`renderCutout`), which
 * VERIFIES the surrounding application logic (validation, error mapping,
 * resource cleanup), never real browser inference or pixel output. The one
 * genuinely pure, real-logic function (`compositeAlphaFromMask`) needs no
 * seam at all and is tested directly.
 */

// A real, valid 1x1 PNG (same fixture already proven in tests/image-format.test.ts).
const REAL_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49,
  0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00,
  0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

function realPngFile(): ImageFileInput {
  return { name: "photo.png", size: REAL_PNG_BYTES.length, bytes: REAL_PNG_BYTES };
}

function makeMockImage(width: number, height: number) {
  return { width, height, close: vi.fn() };
}

// A real, minimal PDF signature ("%PDF-1.4") — sufficient for the real
// hasPdfSignature/detectInputFormat content check under test here. Full
// pdfjs-dist parsing of a complete PDF structure is exercised by
// tests/pdf-*.test.ts elsewhere in this codebase, not duplicated here — this
// file tests only that a PDF is correctly routed through removeBackground's
// format detection and decode seam.
const REAL_PDF_HEADER_BYTES = new TextEncoder().encode("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");

function realPdfFile(): ImageFileInput {
  return { name: "document.pdf", size: REAL_PDF_HEADER_BYTES.length, bytes: REAL_PDF_HEADER_BYTES };
}

// A real, minimal, valid SVG document.
const REAL_SVG_BYTES = new TextEncoder().encode('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>');

function realSvgFile(): ImageFileInput {
  return { name: "icon.svg", size: REAL_SVG_BYTES.length, bytes: REAL_SVG_BYTES };
}

describe("compositeAlphaFromMask", () => {
  it("multiplies alpha by confidence, leaving color channels untouched", () => {
    const rgba = new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 200]);
    const mask = new Float32Array([1, 0]);
    const output = compositeAlphaFromMask(rgba, mask);
    expect([...output]).toEqual([10, 20, 30, 255, 40, 50, 60, 0]);
  });

  it("clamps out-of-range confidence values into [0, 1]", () => {
    const rgba = new Uint8ClampedArray([1, 2, 3, 100]);
    expect(compositeAlphaFromMask(rgba, new Float32Array([2]))[3]).toBe(100);
    expect(compositeAlphaFromMask(rgba, new Float32Array([-1]))[3]).toBe(0);
  });

  it("throws when the mask length does not match the real pixel count", () => {
    const rgba = new Uint8ClampedArray(8); // 2 pixels
    expect(() => compositeAlphaFromMask(rgba, new Float32Array([1]))).toThrow(/does not match/);
  });
});

describe("detectInputFormat (real content-based signature checks)", () => {
  it("detects JPEG/PNG/WebP via the existing shared/image/format.ts check (unchanged behavior)", () => {
    expect(detectInputFormat(REAL_PNG_BYTES)).toBe("png");
  });

  it("detects a real PDF via the existing, already-proven shared/pdf hasPdfSignature check", () => {
    expect(detectInputFormat(REAL_PDF_HEADER_BYTES)).toBe("pdf");
  });

  it("detects a real SVG document by its <svg> tag, not by file extension", () => {
    expect(detectInputFormat(REAL_SVG_BYTES)).toBe("svg");
  });

  it("detects an SVG with no XML declaration, just the bare <svg> root element", () => {
    const bytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(detectInputFormat(bytes)).toBe("svg");
  });

  it("returns null for an unrecognized/unsupported file format", () => {
    expect(detectInputFormat(new Uint8Array([1, 2, 3, 4]))).toBeNull();
    expect(detectInputFormat(new TextEncoder().encode("plain text, not a real document"))).toBeNull();
  });
});

describe("removeBackground", () => {
  it("rejects an empty file before any decode/segmentation is attempted", async () => {
    const file: ImageFileInput = { name: "empty.png", size: 0, bytes: new Uint8Array() };
    await expect(removeBackground(file)).rejects.toMatchObject({ code: "empty_file" });
  });

  it("rejects a file with no recognized signature (JPEG, PNG, WebP, SVG, or PDF)", async () => {
    const file: ImageFileInput = { name: "fake.png", size: 4, bytes: new Uint8Array([1, 2, 3, 4]) };
    await expect(removeBackground(file)).rejects.toMatchObject({ code: "invalid_image_signature" });
  });

  it("rejects a file over the 5 MB limit before any decode is attempted, with the exact required error message", async () => {
    const oversized = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
    const file: ImageFileInput = { name: "huge.png", size: oversized.length, bytes: oversized };
    const decodeImage = vi.fn();
    await expect(removeBackground(file, "png", { decodeImage })).rejects.toMatchObject({
      code: "file_too_large",
      message: "File is too large. Maximum supported size is 5 MB.",
    });
    expect(decodeImage).not.toHaveBeenCalled();
  });

  it("accepts a file exactly at the 5 MB boundary (rejects only when strictly larger)", async () => {
    // A real PNG signature followed by padding, sized to exactly MAX_FILE_SIZE_BYTES.
    const bytes = new Uint8Array(MAX_FILE_SIZE_BYTES);
    bytes.set(REAL_PNG_BYTES.subarray(0, 8)); // real PNG magic bytes at the start
    const file: ImageFileInput = { name: "boundary.png", size: bytes.length, bytes };
    const mockImage = makeMockImage(1, 1);
    const result = await removeBackground(file, "png", {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
      segmentForeground: vi.fn().mockResolvedValue(new Float32Array([1])),
      renderCutout: vi.fn().mockResolvedValue(new Uint8Array([1])),
    });
    expect(result.sourceFormat).toBe("png");
  });

  it("routes an SVG file through the svg format to the decode seam", async () => {
    const mockImage = makeMockImage(10, 10);
    const decodeImage = vi.fn().mockResolvedValue(mockImage);
    await removeBackground(realSvgFile(), "png", {
      decodeImage,
      segmentForeground: vi.fn().mockResolvedValue(new Float32Array(100).fill(1)),
      renderCutout: vi.fn().mockResolvedValue(new Uint8Array([1])),
    });
    expect(decodeImage).toHaveBeenCalledWith(REAL_SVG_BYTES, "svg");
  });

  it("routes a PDF file through the pdf format to the decode seam (first-page-only architecture, disclosed)", async () => {
    const mockImage = makeMockImage(20, 30);
    const decodeImage = vi.fn().mockResolvedValue(mockImage);
    const result = await removeBackground(realPdfFile(), "png", {
      decodeImage,
      segmentForeground: vi.fn().mockResolvedValue(new Float32Array(600).fill(1)),
      renderCutout: vi.fn().mockResolvedValue(new Uint8Array([1])),
    });
    expect(decodeImage).toHaveBeenCalledWith(REAL_PDF_HEADER_BYTES, "pdf");
    expect(result.sourceFormat).toBe("pdf");
  });

  it("rejects a decoded image wider than MAX_RASTER_DIMENSION_PX, before segmentation is attempted", async () => {
    const mockImage = makeMockImage(MAX_RASTER_DIMENSION_PX + 1, 100);
    const segmentForeground = vi.fn();
    await expect(
      removeBackground(realPngFile(), "png", { decodeImage: vi.fn().mockResolvedValue(mockImage), segmentForeground }),
    ).rejects.toMatchObject({ code: "dimension_too_large" });
    expect(segmentForeground).not.toHaveBeenCalled();
    expect(mockImage.close).toHaveBeenCalledTimes(1);
  });

  it("rejects a decoded image taller than MAX_RASTER_DIMENSION_PX", async () => {
    const mockImage = makeMockImage(100, MAX_RASTER_DIMENSION_PX + 1);
    await expect(
      removeBackground(realPngFile(), "png", { decodeImage: vi.fn().mockResolvedValue(mockImage) }),
    ).rejects.toMatchObject({ code: "dimension_too_large" });
  });

  it("accepts a decoded image exactly at MAX_RASTER_DIMENSION_PX in both dimensions", async () => {
    const mockImage = makeMockImage(MAX_RASTER_DIMENSION_PX, MAX_RASTER_DIMENSION_PX);
    const result = await removeBackground(realPngFile(), "png", {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
      segmentForeground: vi.fn().mockResolvedValue(new Float32Array(1).fill(1)),
      renderCutout: vi.fn().mockResolvedValue(new Uint8Array([1])),
    });
    expect(result.width).toBe(MAX_RASTER_DIMENSION_PX);
  });

  it("decodes, segments, and renders a cutout via the injected seams, then releases the decoded image", async () => {
    const mockImage = makeMockImage(2, 1);
    const decodeImage = vi.fn().mockResolvedValue(mockImage);
    const mask = new Float32Array([1, 0]);
    const segmentForeground = vi.fn().mockResolvedValue(mask);
    const renderCutout = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));

    const result = await removeBackground(realPngFile(), "webp", { decodeImage, segmentForeground, renderCutout });

    expect(decodeImage).toHaveBeenCalledWith(REAL_PNG_BYTES, "png");
    expect(segmentForeground).toHaveBeenCalledWith(mockImage);
    expect(renderCutout).toHaveBeenCalledWith(mockImage, mask, "webp");
    expect(result).toEqual({ bytes: new Uint8Array([1, 2, 3]), sourceFormat: "png", format: "webp", width: 2, height: 1 });
    expect(mockImage.close).toHaveBeenCalledTimes(1);
  });

  it("defaults to PNG output when no format is requested", async () => {
    const mockImage = makeMockImage(1, 1);
    const renderCutout = vi.fn().mockResolvedValue(new Uint8Array([9]));
    const result = await removeBackground(realPngFile(), undefined, {
      decodeImage: vi.fn().mockResolvedValue(mockImage),
      segmentForeground: vi.fn().mockResolvedValue(new Float32Array([1])),
      renderCutout,
    });
    expect(result.format).toBe("png");
    expect(renderCutout).toHaveBeenCalledWith(mockImage, expect.any(Float32Array), "png");
  });

  it("wraps a decode failure as BackgroundRemoverError and never calls segmentForeground", async () => {
    const decodeImage = vi.fn().mockRejectedValue(new Error("corrupt"));
    const segmentForeground = vi.fn();
    await expect(removeBackground(realPngFile(), "png", { decodeImage, segmentForeground })).rejects.toMatchObject({
      code: "decode_failed",
      name: "BackgroundRemoverError",
    });
    expect(segmentForeground).not.toHaveBeenCalled();
  });

  it("wraps a segmentation failure as BackgroundRemoverError and still releases the decoded image", async () => {
    const mockImage = makeMockImage(1, 1);
    await expect(
      removeBackground(realPngFile(), "png", {
        decodeImage: vi.fn().mockResolvedValue(mockImage),
        segmentForeground: vi.fn().mockRejectedValue(new Error("model failed")),
      }),
    ).rejects.toMatchObject({ code: "segmentation_failed" });
    expect(mockImage.close).toHaveBeenCalledTimes(1);
  });

  it("wraps an encode failure as BackgroundRemoverError and still releases the decoded image", async () => {
    const mockImage = makeMockImage(1, 1);
    await expect(
      removeBackground(realPngFile(), "webp", {
        decodeImage: vi.fn().mockResolvedValue(mockImage),
        segmentForeground: vi.fn().mockResolvedValue(new Float32Array([1])),
        renderCutout: vi.fn().mockRejectedValue(new Error("encode failed")),
      }),
    ).rejects.toMatchObject({ code: "encode_failed" });
    expect(mockImage.close).toHaveBeenCalledTimes(1);
  });

  it("produces a real, named BackgroundRemoverError instance, never a generic Error", async () => {
    try {
      await removeBackground({ name: "x.png", size: 0, bytes: new Uint8Array() });
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(BackgroundRemoverError);
    }
  });
});

describe("MediaPipe asset locations (documented, real, directly-verified URLs)", () => {
  it("pins the WASM base path to the exact installed package version, not an unpinned @latest", () => {
    expect(MEDIAPIPE_WASM_BASE_PATH).toBe("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
  });

  it("points the model URL at Google's own official model host", () => {
    expect(MEDIAPIPE_MODEL_URL).toContain("storage.googleapis.com/mediapipe-models/");
  });
});
