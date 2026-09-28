import { detectImageFormat } from "../../shared/image/format";
import type { ImageFileInput, ImageFormat } from "../../shared/image/types";

/**
 * Codivio Shared Image Engine — Resize (Phase 6.2), Compress (Phase 6.3),
 * Convert (Phase 6.4).
 *
 * The only file that touches browser Canvas/Image decode APIs
 * (`createImageBitmap`/`OffscreenCanvas`) — mirrors src/lib/pdf-engine.ts's
 * exact role as "the only file importing pdf-lib". shared/image/ stays pure
 * and dependency-free; this file is where that pure format model meets real
 * browser-side processing.
 *
 * Everything here runs entirely client-side: no network call, no upload, no
 * file ever leaves the browser tab — same architecture decision as every
 * PDF tool.
 *
 * Scope (Phase 6.2, authorized): resize only, to an exact target
 * width/height, output staying in the source format. No format conversion
 * (6.4), no quality/compression control (6.3), no crop/rotate, no batch
 * input. No file-size, pixel-count, or output-dimension policy limit is
 * enforced here — those are explicitly reserved for Phase 6.6/6.7; only the
 * structural correctness checks a resize operation cannot mathematically
 * skip (empty input, recognized format, positive integer target
 * dimensions) are enforced.
 */

export type ImageResizeErrorCode =
  | "empty_file"
  | "invalid_image_signature"
  | "invalid_dimensions"
  | "decode_failed"
  | "encode_failed";

export class ImageResizeError extends Error {
  code: ImageResizeErrorCode;

  constructor(code: ImageResizeErrorCode, message: string) {
    super(message);
    this.name = "ImageResizeError";
    this.code = code;
  }
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageResizeResult {
  bytes: Uint8Array;
  format: ImageFormat;
  width: number;
  height: number;
}

/** The real MIME type for each Phase 6.1-modeled format — used both to hint
 * `createImageBitmap`'s decode and to request the matching encode from
 * `OffscreenCanvas.convertToBlob`. Exported so src/tools/ImageResizeTool.tsx
 * can use the exact same mapping for its download MIME type, rather than
 * duplicating it. */
export const FORMAT_MIME_TYPES: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/**
 * Keeps a width/height pair locked to the source image's real aspect ratio
 * when one of the two fields changes — pure math, no browser API, fully
 * testable in Node. `newValue` is rounded to the nearest whole pixel and
 * floored at 1 (a resize target of 0 or negative pixels is not a
 * meaningful operation — a structural correctness guard, not a Phase 6.7
 * resource-abuse policy limit).
 */
export function computeLockedDimensions(
  sourceWidth: number,
  sourceHeight: number,
  changed: "width" | "height",
  newValue: number,
): ImageDimensions {
  const safeValue = Math.max(1, Math.round(newValue));
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: safeValue, height: safeValue };
  }
  const aspectRatio = sourceWidth / sourceHeight;
  if (changed === "width") {
    return { width: safeValue, height: Math.max(1, Math.round(safeValue / aspectRatio)) };
  }
  return { width: Math.max(1, Math.round(safeValue * aspectRatio)), height: safeValue };
}

/** The minimal structural shape this module needs from a decoded image —
 * satisfied by a real `ImageBitmap` in production, and by a plain mock
 * object in tests (see ImageResizeOverrides's own doc comment for why this
 * seam exists). */
interface DecodedImageLike {
  width: number;
  height: number;
  close(): void;
}

export interface ImageResizeOverrides {
  /** Test-only seam — real implementation is `defaultDecodeImage`, using
   * the browser's own `createImageBitmap`. Never set by
   * src/tools/ImageResizeTool.tsx; production always uses the real
   * implementation. Kept separate from `renderResized` (unlike
   * src/lib/pdf-engine.ts#PdfCompressOverrides's single combined seam) so a
   * test can inject a mock decoded image with a spy `close()` and verify
   * resource cleanup actually happens — genuinely needed here since no
   * `createImageBitmap`/`OffscreenCanvas` exists in this project's
   * Node-based Vitest environment (ENVIRONMENT LIMITATION) to exercise the
   * real cleanup path directly. */
  decodeImage?: (bytes: Uint8Array, format: ImageFormat) => Promise<DecodedImageLike>;
  /** Test-only seam — real implementation is `defaultRenderResized`, using
   * `OffscreenCanvas`. Never set by src/tools/ImageResizeTool.tsx. */
  renderResized?: (
    image: DecodedImageLike,
    targetWidth: number,
    targetHeight: number,
    format: ImageFormat,
  ) => Promise<Uint8Array>;
}

/**
 * Real, production decode via the browser's own `createImageBitmap` — a
 * standard Web API, not a new dependency. Cannot run under this project's
 * Node-based Vitest environment (no `createImageBitmap` global exists there)
 * — UNKNOWN — NOT VERIFIED / ENVIRONMENT LIMITATION for its real behavior in
 * this environment; `resizeImage`/`getImageDimensions` never call this
 * directly, always through the `decodeImage` override, which defaults to
 * this real implementation in production and is overridden only by tests —
 * mirrors src/lib/pdf-engine.ts#reencodeJpegWithCanvas's own established
 * pattern exactly.
 */
async function defaultDecodeImage(bytes: Uint8Array, format: ImageFormat): Promise<DecodedImageLike> {
  const blob = new Blob([new Uint8Array(bytes)], { type: FORMAT_MIME_TYPES[format] });
  return await createImageBitmap(blob);
}

/**
 * Real, production resize+encode via `OffscreenCanvas` — same standard Web
 * API family as `defaultDecodeImage` and as the already-shipped
 * src/lib/pdf-engine.ts#reencodeJpegWithCanvas (Phase 5.4). Same Node/
 * ENVIRONMENT LIMITATION as `defaultDecodeImage`.
 *
 * Honest WebP handling (explicitly required, not assumed): some browsers'
 * `convertToBlob` support for encoding to `image/webp` specifically is not
 * verifiable in this environment. Rather than silently accepting whatever
 * format the browser actually produced, the resulting `Blob.type` is
 * checked against the requested MIME type — a mismatch is treated as a
 * real encode failure, never a silent format substitution.
 */
async function defaultRenderResized(
  image: DecodedImageLike,
  targetWidth: number,
  targetHeight: number,
  format: ImageFormat,
): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable");
  }
  ctx.drawImage(image as unknown as CanvasImageSource, 0, 0, targetWidth, targetHeight);
  const mimeType = FORMAT_MIME_TYPES[format];
  const blob = await canvas.convertToBlob({ type: mimeType });
  if (blob.type !== mimeType) {
    throw new Error(`Browser could not encode output as ${mimeType} (got "${blob.type || "unknown"}").`);
  }
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Decodes a file just far enough to report its real pixel dimensions and
 * detected format — used by the UI immediately after file selection, before
 * the user has entered any target size, exactly mirroring
 * src/lib/pdf-engine.ts#loadPdfPageCount's role for PDF Split. Always
 * releases the decoded bitmap before returning (Phase 6.1/6.2's resource-
 * lifecycle discipline — never held longer than needed).
 */
export async function getImageDimensions(
  file: ImageFileInput,
  overrides: Pick<ImageResizeOverrides, "decodeImage"> = {},
): Promise<ImageDimensions & { format: ImageFormat }> {
  if (file.size === 0 || file.bytes.length === 0) {
    throw new ImageResizeError("empty_file", `"${file.name}" is empty.`);
  }
  const format = detectImageFormat(file.bytes);
  if (!format) {
    throw new ImageResizeError(
      "invalid_image_signature",
      `"${file.name}" does not look like a supported image (JPEG, PNG, or WebP).`,
    );
  }

  const decodeImage = overrides.decodeImage ?? defaultDecodeImage;
  let image: DecodedImageLike;
  try {
    image = await decodeImage(file.bytes, format);
  } catch {
    throw new ImageResizeError(
      "decode_failed",
      `"${file.name}" could not be decoded as a valid image (it may be corrupt).`,
    );
  }
  const { width, height } = image;
  image.close();
  return { width, height, format };
}

/**
 * Phase 6.3 — the JPEG/WebP re-encode quality used by Compress (0-1, same
 * scale as the Canvas `convertToBlob` quality parameter). A conservative,
 * disclosed-as-provisional default, mirroring
 * src/lib/pdf-engine.ts#DEFAULT_COMPRESS_JPEG_QUALITY's own status exactly
 * — not benchmarked (no browser available in this environment to tune it
 * against real photos), not user-adjustable (mirrors PDF Compress's own
 * single-fixed-value precedent — no quality slider was exposed there
 * either).
 */
export const DEFAULT_COMPRESS_QUALITY = 0.7;

export type ImageCompressErrorCode = "empty_file" | "invalid_image_signature" | "decode_failed" | "encode_failed";

/** Separate from ImageResizeError, mirroring src/lib/pdf-engine.ts's own
 * one-class-per-operation convention (PdfMergeError/PdfSplitError/
 * PdfCompressError) rather than reusing a same-shaped class whose name
 * would be semantically wrong for this operation. */
export class ImageCompressError extends Error {
  code: ImageCompressErrorCode;

  constructor(code: ImageCompressErrorCode, message: string) {
    super(message);
    this.name = "ImageCompressError";
    this.code = code;
  }
}

export interface ImageCompressResult {
  originalSize: number;
  outputSize: number;
  /** Never larger than `originalSize` — if re-encoding didn't genuinely
   * shrink the file, this is the original, untouched bytes, mirroring
   * src/lib/pdf-engine.ts#PdfCompressResult's own honest-fallback contract
   * exactly. */
  bytes: Uint8Array;
  /** True only when `outputSize < originalSize`. */
  reduced: boolean;
  format: ImageFormat;
}

export interface ImageCompressOverrides {
  /** Test-only seam — same real default (`defaultDecodeImage`) and same
   * reason as ImageResizeOverrides#decodeImage. */
  decodeImage?: (bytes: Uint8Array, format: ImageFormat) => Promise<DecodedImageLike>;
  /** Test-only seam — real implementation is `defaultEncodeAtQuality`.
   * Never set by src/tools/ImageCompressTool.tsx. */
  encodeAtQuality?: (image: DecodedImageLike, format: ImageFormat, quality: number) => Promise<Uint8Array>;
}

/**
 * Real, production re-encode at a given quality via `OffscreenCanvas` — same
 * standard Web API family as `defaultRenderResized`, drawn at the image's
 * own original dimensions (never resized) so only re-encoding, never
 * scaling, affects the output. Same Node/ENVIRONMENT LIMITATION as the
 * other `default*` functions in this file.
 *
 * PNG has no `quality` parameter in the real Canvas encoding spec — passing
 * one is harmless (browsers simply ignore it for `image/png`), not a
 * special case this function needs to branch on. This is precisely why
 * `compressImage` never assumes success and instead compares real output
 * size against the real input size.
 */
async function defaultEncodeAtQuality(image: DecodedImageLike, format: ImageFormat, quality: number): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable");
  }
  ctx.drawImage(image as unknown as CanvasImageSource, 0, 0);
  const mimeType = FORMAT_MIME_TYPES[format];
  const blob = await canvas.convertToBlob({ type: mimeType, quality });
  if (blob.type !== mimeType) {
    throw new Error(`Browser could not encode output as ${mimeType} (got "${blob.type || "unknown"}").`);
  }
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Re-encodes one image at a reduced quality, entirely in memory, never
 * changing its dimensions or format. Never returns a result larger than the
 * original file — if the re-encoded output is not genuinely smaller (a
 * real, expected outcome for PNG, which has no lossy quality knob, and for
 * an already-efficiently-compressed JPEG/WebP), the original, untouched
 * bytes are returned instead and `reduced` is `false` — mirrors
 * src/lib/pdf-engine.ts#compressPdfFile's own honest-outcome policy exactly.
 * Throws ImageCompressError on invalid input or a genuine decode/encode
 * failure; never silently produces a partial result. Always releases the
 * decoded image, on both the success and failure path.
 */
export async function compressImage(
  file: ImageFileInput,
  overrides: ImageCompressOverrides = {},
): Promise<ImageCompressResult> {
  if (file.size === 0 || file.bytes.length === 0) {
    throw new ImageCompressError("empty_file", `"${file.name}" is empty.`);
  }

  const format = detectImageFormat(file.bytes);
  if (!format) {
    throw new ImageCompressError(
      "invalid_image_signature",
      `"${file.name}" does not look like a supported image (JPEG, PNG, or WebP).`,
    );
  }

  const decodeImage = overrides.decodeImage ?? defaultDecodeImage;
  const encodeAtQuality = overrides.encodeAtQuality ?? defaultEncodeAtQuality;

  let image: DecodedImageLike;
  try {
    image = await decodeImage(file.bytes, format);
  } catch {
    throw new ImageCompressError(
      "decode_failed",
      `"${file.name}" could not be decoded as a valid image (it may be corrupt).`,
    );
  }

  try {
    const outputBytes = await encodeAtQuality(image, format, DEFAULT_COMPRESS_QUALITY);
    const originalSize = file.bytes.length;

    if (outputBytes.length < originalSize) {
      return { originalSize, outputSize: outputBytes.length, bytes: outputBytes, reduced: true, format };
    }
    // Honest, real outcome (not an error): re-encoding did not genuinely
    // shrink the file. Return the original, untouched bytes — never
    // something larger than (or equal in a misleading "success" way to)
    // what the user uploaded.
    return { originalSize, outputSize: originalSize, bytes: file.bytes, reduced: false, format };
  } catch {
    throw new ImageCompressError(
      "encode_failed",
      `"${file.name}" could not be compressed. Please try a different file.`,
    );
  } finally {
    image.close();
  }
}

/**
 * Resizes one image to an exact target width/height, entirely in memory.
 * Output stays in the source format — never converts formats (Phase 6.4's
 * scope). Throws ImageResizeError on invalid input or a genuine decode/
 * encode failure; never silently produces a partial or wrong-format result.
 * Always releases the decoded bitmap, on both the success and failure path.
 */
export async function resizeImage(
  file: ImageFileInput,
  targetWidth: number,
  targetHeight: number,
  overrides: ImageResizeOverrides = {},
): Promise<ImageResizeResult> {
  if (file.size === 0 || file.bytes.length === 0) {
    throw new ImageResizeError("empty_file", `"${file.name}" is empty.`);
  }

  const format = detectImageFormat(file.bytes);
  if (!format) {
    throw new ImageResizeError(
      "invalid_image_signature",
      `"${file.name}" does not look like a supported image (JPEG, PNG, or WebP).`,
    );
  }

  if (!Number.isInteger(targetWidth) || targetWidth <= 0 || !Number.isInteger(targetHeight) || targetHeight <= 0) {
    throw new ImageResizeError("invalid_dimensions", "Width and height must be positive whole numbers.");
  }

  const decodeImage = overrides.decodeImage ?? defaultDecodeImage;
  const renderResized = overrides.renderResized ?? defaultRenderResized;

  let image: DecodedImageLike;
  try {
    image = await decodeImage(file.bytes, format);
  } catch {
    throw new ImageResizeError(
      "decode_failed",
      `"${file.name}" could not be decoded as a valid image (it may be corrupt).`,
    );
  }

  try {
    const bytes = await renderResized(image, targetWidth, targetHeight, format);
    return { bytes, format, width: targetWidth, height: targetHeight };
  } catch {
    throw new ImageResizeError(
      "encode_failed",
      `"${file.name}" could not be resized. Please try a different file.`,
    );
  } finally {
    image.close();
  }
}

export type ImageConvertErrorCode =
  | "empty_file"
  | "invalid_image_signature"
  | "same_format"
  | "decode_failed"
  | "encode_failed";

/** Separate from ImageResizeError/ImageCompressError, mirroring
 * src/lib/pdf-engine.ts's one-class-per-operation convention. */
export class ImageConvertError extends Error {
  code: ImageConvertErrorCode;

  constructor(code: ImageConvertErrorCode, message: string) {
    super(message);
    this.name = "ImageConvertError";
    this.code = code;
  }
}

export interface ImageConvertResult {
  bytes: Uint8Array;
  sourceFormat: ImageFormat;
  /** The real output format — always different from `sourceFormat` (same-
   * format "conversion" is rejected before any decode is attempted). */
  format: ImageFormat;
  width: number;
  height: number;
}

export interface ImageConvertOverrides {
  /** Test-only seam — same real default (`defaultDecodeImage`) and same
   * reason as ImageResizeOverrides#decodeImage. */
  decodeImage?: (bytes: Uint8Array, format: ImageFormat) => Promise<DecodedImageLike>;
  /** Test-only seam — real implementation is `defaultEncodeConverted`.
   * Never set by src/tools/ImageConverterTool.tsx. */
  encodeConverted?: (image: DecodedImageLike, targetFormat: ImageFormat) => Promise<Uint8Array>;
}

/**
 * Whether a white background must be composited onto the canvas before
 * encoding to `targetFormat` — real, required behavior only for JPEG, the
 * one Phase 6.4 target format with no alpha channel at all (PNG and WebP
 * both genuinely support transparency, so their encode path needs no fill).
 * Kept as its own small, pure, testable function specifically so this
 * policy decision can be verified in this Node-based test environment even
 * though the actual pixel compositing itself (inside
 * `defaultEncodeConverted`) cannot be — no `OffscreenCanvas` exists here
 * (ENVIRONMENT LIMITATION).
 *
 * Always filling white for a JPEG target — never only when a source is
 * separately detected to "have" transparency — is a deliberate, safe
 * superset: a fully opaque source fully covers the fill, so this never
 * visibly changes an already-opaque conversion's result, and it avoids
 * needing any pixel-inspection step to decide whether a source "really"
 * has transparent pixels.
 */
export function shouldCompositeWhiteBackground(targetFormat: ImageFormat): boolean {
  return targetFormat === "jpeg";
}

/**
 * Real, production convert-encode via `OffscreenCanvas` — same standard Web
 * API family as `defaultRenderResized`/`defaultEncodeAtQuality`. Draws at
 * the image's own original dimensions (Convert never resizes). For a JPEG
 * target, real, spec-documented Canvas behavior is that a transparent
 * source would otherwise flatten to a BLACK background (a canvas's backing
 * store defaults to transparent black) — `shouldCompositeWhiteBackground`
 * makes this an explicit, correct white fill instead, per the approved
 * Phase 6.4 scope. Same Node/ENVIRONMENT LIMITATION as the other `default*`
 * functions in this file.
 */
async function defaultEncodeConverted(image: DecodedImageLike, targetFormat: ImageFormat): Promise<Uint8Array> {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable");
  }
  if (shouldCompositeWhiteBackground(targetFormat)) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, image.width, image.height);
  }
  ctx.drawImage(image as unknown as CanvasImageSource, 0, 0);
  const mimeType = FORMAT_MIME_TYPES[targetFormat];
  const blob = await canvas.convertToBlob({ type: mimeType });
  if (blob.type !== mimeType) {
    throw new Error(`Browser could not encode output as ${mimeType} (got "${blob.type || "unknown"}").`);
  }
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Converts one image to a different target format, entirely in memory,
 * never changing its dimensions (Resize's job) or quality (Compress's
 * job — the simplest native encode path is used, with no user-facing
 * quality control and no quality guarantee). Rejects a same-format request
 * before any decode is attempted — "converting" a file to the format it
 * already is isn't a real conversion. Never claims metadata/EXIF
 * preservation: the Canvas pipeline has no concept of metadata at all, so
 * none survives this round-trip, by construction. Throws ImageConvertError
 * on invalid input or a genuine decode/encode failure. Always releases the
 * decoded image, on both the success and failure path.
 */
export async function convertImage(
  file: ImageFileInput,
  targetFormat: ImageFormat,
  overrides: ImageConvertOverrides = {},
): Promise<ImageConvertResult> {
  if (file.size === 0 || file.bytes.length === 0) {
    throw new ImageConvertError("empty_file", `"${file.name}" is empty.`);
  }

  const sourceFormat = detectImageFormat(file.bytes);
  if (!sourceFormat) {
    throw new ImageConvertError(
      "invalid_image_signature",
      `"${file.name}" does not look like a supported image (JPEG, PNG, or WebP).`,
    );
  }

  if (sourceFormat === targetFormat) {
    throw new ImageConvertError("same_format", `"${file.name}" is already in the requested format.`);
  }

  const decodeImage = overrides.decodeImage ?? defaultDecodeImage;
  const encodeConverted = overrides.encodeConverted ?? defaultEncodeConverted;

  let image: DecodedImageLike;
  try {
    image = await decodeImage(file.bytes, sourceFormat);
  } catch {
    throw new ImageConvertError(
      "decode_failed",
      `"${file.name}" could not be decoded as a valid image (it may be corrupt).`,
    );
  }

  try {
    const bytes = await encodeConverted(image, targetFormat);
    return { bytes, sourceFormat, format: targetFormat, width: image.width, height: image.height };
  } catch {
    throw new ImageConvertError(
      "encode_failed",
      `"${file.name}" could not be converted. Please try a different file.`,
    );
  } finally {
    image.close();
  }
}
