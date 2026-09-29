import { detectImageFormat } from "./format";
import type { ImageFileInput, ImageFormat } from "./types";

/**
 * Codivio Shared Image Validation (Phase 6.6 — Format / Size Validation).
 *
 * Centralizes the empty-file + format-signature check that was previously
 * duplicated identically across src/lib/image-engine.ts's four operations
 * (Resize's `getImageDimensions` and `resizeImage`, Compress, Convert) — a
 * real, evidence-based finding from this sub-phase's own Stage 1 audit
 * (five near-identical `if (file.size === 0 ...) throw ...` blocks across
 * two files), not a stylistic preference.
 *
 * Deliberately does NOT cover src/lib/background-remover-engine.ts: that
 * tool accepts a materially different, larger format set (SVG/PDF) via its
 * own `detectInputFormat`, and already has its own explicit, previously
 * authorized 5 MB / 4096px policy (Phase 6.5) that this sub-phase's
 * authorization explicitly says must remain unchanged. Sharing this
 * image-only validator with it would be incorrect, not merely redundant.
 *
 * SIZE/DIMENSION POLICY (added after explicit product authorization,
 * following this file's own earlier finding that no number was justified by
 * project evidence alone): `MAX_IMAGE_FILE_BYTES` (50 MB) and
 * `MAX_IMAGE_DIMENSION_PX` (8192 px) are conservative PRODUCT ACCEPTANCE
 * limits, explicitly authorized as such — not a benchmarked maximum browser
 * capability, and not Phase 6.7's separate Resource Limits concern (which
 * governs runtime resource behavior *during* processing, not upload/decode
 * acceptance). Revisit only with real evidence. These apply ONLY to Resize/
 * Compress/Convert; Background Remover's own, separately authorized 5 MB /
 * 4096px policy (Phase 6.5, in src/lib/background-remover-engine.ts) is
 * untouched and must never be confused with these.
 */

/** Conservative product acceptance limit for Resize/Compress/Convert's
 * input file size — explicitly authorized, not benchmarked against real
 * browser memory limits (ENVIRONMENT LIMITATION: no browser available in
 * this session). Exactly 50 MB is accepted; anything larger is rejected. */
export const MAX_IMAGE_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

/** Conservative product acceptance limit for Resize/Compress/Convert's
 * decoded pixel dimensions (checked after decode, in either axis) — same
 * authorization/evidence status as MAX_IMAGE_FILE_BYTES above. Exactly
 * 8192px is accepted; anything larger in either dimension is rejected. */
export const MAX_IMAGE_DIMENSION_PX = 8192;

export type ImageValidationErrorCode =
  | "empty_file"
  | "file_too_large"
  | "invalid_image_signature"
  | "dimension_too_large";

export interface ImageValidationError {
  code: ImageValidationErrorCode;
  message: string;
}

export type ImageValidationResult =
  | { ok: true; format: ImageFormat }
  | { ok: false; error: ImageValidationError };

/**
 * Validates that a file is non-empty, within the 50 MB acceptance limit,
 * and has a real, recognized JPEG/PNG/WebP signature — the structural
 * checks every Resize/Compress/Convert operation needs before attempting a
 * decode. Never trusts `file.name`/a client-declared MIME type (mirrors
 * `shared/pdf/validate.ts#hasPdfSignature`'s own already-established
 * principle). Returns a result object rather than throwing, so each caller
 * can wrap the failure in its own existing `*Error` class
 * (`ImageResizeError`/`ImageCompressError`/`ImageConvertError`), preserving
 * the established one-class-per-operation convention unchanged.
 */
export function validateImageFileInput(file: ImageFileInput): ImageValidationResult {
  if (file.size === 0 || file.bytes.length === 0) {
    return { ok: false, error: { code: "empty_file", message: `"${file.name}" is empty.` } };
  }

  if (file.size > MAX_IMAGE_FILE_BYTES) {
    return {
      ok: false,
      error: { code: "file_too_large", message: `"${file.name}" is too large. Maximum supported size is 50 MB.` },
    };
  }

  const format = detectImageFormat(file.bytes);
  if (!format) {
    return {
      ok: false,
      error: {
        code: "invalid_image_signature",
        message: `"${file.name}" does not look like a supported image (JPEG, PNG, or WebP).`,
      },
    };
  }

  return { ok: true, format };
}

export type ImageDimensionValidationResult = { ok: true } | { ok: false; error: ImageValidationError };

/**
 * Validates a real, decoded image's pixel dimensions against the 8192px
 * acceptance limit — checked AFTER decode (the file-level check above
 * cannot know real pixel dimensions), mirroring
 * src/lib/background-remover-engine.ts's own post-decode dimension-guard
 * precedent (Phase 6.5) exactly, at this sub-phase's own authorized limit.
 */
export function validateImageDimensions(width: number, height: number): ImageDimensionValidationResult {
  if (width > MAX_IMAGE_DIMENSION_PX || height > MAX_IMAGE_DIMENSION_PX) {
    return {
      ok: false,
      error: {
        code: "dimension_too_large",
        message: `Image dimensions (${width}×${height}) exceed the ${MAX_IMAGE_DIMENSION_PX}px limit.`,
      },
    };
  }
  return { ok: true };
}
