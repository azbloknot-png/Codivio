import {
  MAX_PDF_FILE_BYTES,
  MAX_PDF_FILES_PER_MERGE,
  MAX_TOTAL_MERGE_BYTES,
  MIN_PDF_FILES_PER_MERGE,
  PDF_MAGIC_BYTES,
  type PdfFileInput,
  type PdfMergeValidationResult,
  type PdfValidationError,
} from "./types";

/**
 * Checks the real PDF file signature (the first 5 bytes, ASCII "%PDF-") —
 * a genuine content check against the actual bytes, never a filename,
 * extension, or client-declared MIME type check. Not a full parse; a file
 * can pass this and still be corrupt further in — src/lib/pdf-engine.ts's
 * actual pdf-lib parse is the real, authoritative validity check.
 */
export function hasPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC_BYTES.length) return false;
  return PDF_MAGIC_BYTES.every((byte, index) => bytes[index] === byte);
}

/** Validates one file's basic properties (empty/size/signature) — used both
 * per-file, as each file is added in the UI, and again for every file at
 * actual merge time via validatePdfMergeRequest, so a check can never be
 * silently skipped either way. */
export function validatePdfFile(file: PdfFileInput): PdfValidationError[] {
  const errors: PdfValidationError[] = [];

  if (file.size === 0 || file.bytes.length === 0) {
    // An empty file is trivially not a valid PDF; reporting only this (not
    // also "invalid signature") avoids a redundant, less useful second error.
    return [{ code: "empty_file", message: `"${file.name}" is empty.`, fileName: file.name }];
  }

  if (file.size > MAX_PDF_FILE_BYTES) {
    errors.push({
      code: "file_too_large",
      message: `"${file.name}" is larger than the ${Math.round(MAX_PDF_FILE_BYTES / (1024 * 1024))} MB limit per file.`,
      fileName: file.name,
    });
  }

  if (!hasPdfSignature(file.bytes)) {
    errors.push({
      code: "invalid_pdf_signature",
      message: `"${file.name}" does not look like a real PDF file.`,
      fileName: file.name,
    });
  }

  return errors;
}

/**
 * Primary validation entry point for a merge request. Collects *all* errors
 * across every file and every batch-level rule at once — mirrors
 * shared/qr/validate.ts#validateQrRequest's "never fail fast on the first
 * error" design, so a form UI can show every problem together.
 */
export function validatePdfMergeRequest(files: PdfFileInput[]): PdfMergeValidationResult {
  const errors: PdfValidationError[] = [];

  if (files.length < MIN_PDF_FILES_PER_MERGE) {
    errors.push({
      code: "not_enough_files",
      message: `Add at least ${MIN_PDF_FILES_PER_MERGE} PDF files to merge.`,
    });
  }
  if (files.length > MAX_PDF_FILES_PER_MERGE) {
    errors.push({
      code: "too_many_files",
      message: `A maximum of ${MAX_PDF_FILES_PER_MERGE} files can be merged at once.`,
    });
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_MERGE_BYTES) {
    errors.push({
      code: "total_size_exceeded",
      message: `The combined size of all files must be under ${Math.round(MAX_TOTAL_MERGE_BYTES / (1024 * 1024))} MB.`,
    });
  }

  for (const file of files) {
    errors.push(...validatePdfFile(file));
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, files };
}
