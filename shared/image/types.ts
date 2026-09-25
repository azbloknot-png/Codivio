/**
 * Codivio Shared Image Engine — types (Phase 6.1).
 *
 * Framework-agnostic: no import of any browser Canvas/Image API and no
 * processing dependency (Phase 6.1's own architecture audit found none is
 * needed for the baseline Resize/Compress/Converter tools). Safe to import
 * from both the Worker and the frontend, mirroring shared/pdf/types.ts's and
 * shared/qr/types.ts's own split.
 *
 * Scope note (corrected after ChatGPT review): unlike shared/pdf/types.ts,
 * this file deliberately does NOT define a byte-size limit, a validation
 * error taxonomy, or any other policy-shaped constant. CODIVIO_MASTER_PLAN.md
 * explicitly splits Image Tools' "Format / Size Validation" (6.6) and
 * "Image Processing Resource Limits" (6.7) into their own later sub-phases —
 * unlike PDF, where Phase 5.6 combined both into one sub-phase after Merge
 * (5.2) had already shipped with a provisional limit. Because no Phase 6.2+
 * operation has been authorized or implemented yet, there is no real
 * evidence in this codebase to justify any specific number now, and
 * inventing one (as an earlier draft of this file did, at 25 MB) would be
 * exactly the un-evidenced limit-setting the Master Plan reserves for 6.6/6.7.
 * This file therefore carries only the format/type model an engine boundary
 * genuinely needs to exist at all — real format identification and a shared
 * file-input shape — nothing shaped like a validation policy.
 */

/** Real, standardized file-format signatures — genuine content checks
 * against the actual bytes, never a filename/extension/client-declared MIME
 * type check (same principle as shared/pdf/types.ts's PDF_MAGIC_BYTES).
 * These three are well-established, unambiguous format specifications, not
 * empirically-discovered tolerances — each format's magic bytes are
 * conventionally always at a fixed offset. */
export const JPEG_MAGIC_BYTES = [0xff, 0xd8, 0xff] as const;
export const PNG_MAGIC_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
/** WebP is a RIFF container: bytes 0-3 are the literal ASCII "RIFF", bytes
 * 4-7 are a 4-byte little-endian file size (skipped — irrelevant to format
 * identification), and bytes 8-11 are the literal ASCII "WEBP" format tag. */
export const WEBP_RIFF_MAGIC_BYTES = [0x52, 0x49, 0x46, 0x46] as const; // "RIFF"
export const WEBP_FORMAT_MAGIC_BYTES = [0x57, 0x45, 0x42, 0x50] as const; // "WEBP", at byte offset 8
export const WEBP_FORMAT_TAG_OFFSET = 8;

/** The image formats Phase 6.1's own architecture audit found are directly
 * supported by native browser APIs (`createImageBitmap` decode,
 * `OffscreenCanvas`/`HTMLCanvasElement` `convertToBlob`/`toBlob` encode) with
 * no new dependency — real, already-proven in this exact codebase via
 * src/lib/pdf-engine.ts's own `reencodeJpegWithCanvas` (Phase 5.4). AVIF
 * encode support via Canvas is inconsistent across browsers (UNKNOWN — NOT
 * VERIFIED without a real browser in this environment) and is deliberately
 * not included until real evidence justifies it. This is format/capability
 * representation the future engine boundary genuinely needs to exist at
 * all — not a validation policy. */
export type ImageFormat = "jpeg" | "png" | "webp";

/** A selected file's raw bytes, already read into memory by the caller (a
 * future src/tools/Image*.tsx via the browser File API) — this module never
 * touches `File`/`Blob` itself, keeping it safely importable from a Worker
 * exactly like shared/pdf/types.ts's own PdfFileInput. Deliberately carries
 * no validation-result variant here (see this file's header comment) — a
 * future Phase 6.6 owns defining what "valid" means and how errors are
 * represented. */
export interface ImageFileInput {
  name: string;
  size: number;
  bytes: Uint8Array;
}
