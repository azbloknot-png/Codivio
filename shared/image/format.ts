import {
  JPEG_MAGIC_BYTES,
  PNG_MAGIC_BYTES,
  WEBP_FORMAT_MAGIC_BYTES,
  WEBP_FORMAT_TAG_OFFSET,
  WEBP_RIFF_MAGIC_BYTES,
  type ImageFormat,
} from "./types";

function matchesBytesAt(bytes: Uint8Array, offset: number, signature: readonly number[]): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/**
 * Detects a real, supported image format from the file's actual bytes — a
 * genuine content check, never a filename/extension/client-declared MIME
 * type check (mirrors shared/pdf/validate.ts#hasPdfSignature's own
 * principle). Returns `null` for anything that doesn't match one of the
 * formats Phase 6.1's architecture audit found supportable via native
 * browser APIs (see shared/image/types.ts#ImageFormat's own doc comment).
 *
 * This is format IDENTIFICATION only — a factual, non-tunable "what is
 * this" question the future engine boundary needs answered before it can
 * decide how to process a file. It deliberately does not decide whether a
 * file is otherwise acceptable (size, dimensions, emptiness) — that is a
 * validation POLICY question, explicitly reserved for Phase 6.6 (Format /
 * Size Validation), not this architecture-only module.
 */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (matchesBytesAt(bytes, 0, JPEG_MAGIC_BYTES)) return "jpeg";
  if (matchesBytesAt(bytes, 0, PNG_MAGIC_BYTES)) return "png";
  if (matchesBytesAt(bytes, 0, WEBP_RIFF_MAGIC_BYTES) && matchesBytesAt(bytes, WEBP_FORMAT_TAG_OFFSET, WEBP_FORMAT_MAGIC_BYTES)) {
    return "webp";
  }
  return null;
}
