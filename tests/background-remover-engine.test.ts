import { describe, expect, it, vi } from "vitest";
import {
  removeBackground,
  compositeAlphaFromMask,
  BackgroundRemoverError,
  MEDIAPIPE_WASM_BASE_PATH,
  MEDIAPIPE_MODEL_URL,
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

describe("removeBackground", () => {
  it("rejects an empty file before any decode/segmentation is attempted", async () => {
    const file: ImageFileInput = { name: "empty.png", size: 0, bytes: new Uint8Array() };
    await expect(removeBackground(file)).rejects.toMatchObject({ code: "empty_file" });
  });

  it("rejects a file with no recognized image signature", async () => {
    const file: ImageFileInput = { name: "fake.png", size: 4, bytes: new Uint8Array([1, 2, 3, 4]) };
    await expect(removeBackground(file)).rejects.toMatchObject({ code: "invalid_image_signature" });
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
