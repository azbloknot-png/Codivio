import {
  MAX_PDF_FILE_BYTES,
  MAX_PDF_FILES_PER_MERGE,
  MAX_SPLIT_OUTPUT_FILES,
  MAX_TOTAL_MERGE_BYTES,
  MIN_PDF_FILES_PER_MERGE,
  PDF_HEADER_SEARCH_WINDOW_BYTES,
  PDF_MAGIC_BYTES,
  type PdfFileInput,
  type PdfMergeValidationResult,
  type PdfPageRange,
  type PdfPageRangesResult,
  type PdfValidationError,
} from "./types";

/**
 * Checks for the real PDF file signature (the ASCII string "%PDF-") — a
 * genuine content check against the actual bytes, never a filename,
 * extension, or client-declared MIME type check. Not a full parse; a file
 * can pass this and still be corrupt further in — src/lib/pdf-engine.ts's
 * actual pdf-lib parse is the real, authoritative validity check.
 *
 * Searches the first PDF_HEADER_SEARCH_WINDOW_BYTES bytes, not only byte 0
 * (Phase 5.6, empirically verified — see that constant's own doc comment):
 * a real PDF with a few bytes of leading garbage (e.g. a UTF-8 BOM) still
 * loads successfully via pdf-lib, so a byte-0-only check would wrongly
 * reject a file the engine can actually parse.
 */
export function hasPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC_BYTES.length) return false;
  const windowEnd = Math.min(bytes.length, PDF_HEADER_SEARCH_WINDOW_BYTES);
  for (let offset = 0; offset <= windowEnd - PDF_MAGIC_BYTES.length; offset += 1) {
    if (PDF_MAGIC_BYTES.every((byte, index) => bytes[offset + index] === byte)) {
      return true;
    }
  }
  return false;
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

const PAGE_TOKEN_PATTERN = /^(\d+)(?:-(\d+))?$/;

/**
 * Parses a comma-separated page-selection string (e.g. "1-3, 5, 8-10") into
 * real, bounds-checked 1-based page ranges — the same "collect every error
 * at once" design as validatePdfMergeRequest above. A bare number ("5") is
 * a single-page range (`{start:5, end:5}`), matching the existing
 * SEO/content copy's framing exactly ("a single page can be treated as a
 * page range of one").
 */
export function parsePageRanges(input: string, pageCount: number): PdfPageRangesResult {
  const tokens = input
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) {
    return { ok: false, errors: [{ code: "empty_page_selection", message: "Enter at least one page or page range." }] };
  }

  const errors: PdfValidationError[] = [];
  const ranges: PdfPageRange[] = [];

  for (const token of tokens) {
    const match = PAGE_TOKEN_PATTERN.exec(token);
    if (!match) {
      errors.push({ code: "invalid_page_range", message: `"${token}" is not a valid page or page range.` });
      continue;
    }

    const start = Number(match[1]);
    const end = match[2] === undefined ? start : Number(match[2]);

    if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
      errors.push({
        code: "page_out_of_range",
        message: `"${token}" is outside this document's real page range (1–${pageCount}).`,
      });
      continue;
    }
    if (start > end) {
      errors.push({ code: "invalid_page_range", message: `"${token}" is not a valid range — the start page must come before the end page.` });
      continue;
    }

    ranges.push({ start, end });
  }

  if (ranges.length > MAX_SPLIT_OUTPUT_FILES) {
    errors.push({
      code: "too_many_output_files",
      message: `A maximum of ${MAX_SPLIT_OUTPUT_FILES} output files can be created from one split.`,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, ranges };
}

/** Generates one singleton range per page — the "every page separately"
 * mode is really just this list, reusing the exact same
 * splitPdfFile()/range-extraction path as a manually-entered range list
 * (src/lib/pdf-engine.ts), never a second, parallel code path. */
export function everyPageRanges(pageCount: number): PdfPageRangesResult {
  if (pageCount > MAX_SPLIT_OUTPUT_FILES) {
    return {
      ok: false,
      errors: [
        {
          code: "too_many_output_files",
          message: `This document has ${pageCount} pages — "every page separately" supports at most ${MAX_SPLIT_OUTPUT_FILES} pages. Use a custom page range instead.`,
        },
      ],
    };
  }
  const ranges: PdfPageRange[] = Array.from({ length: pageCount }, (_, index) => ({
    start: index + 1,
    end: index + 1,
  }));
  return { ok: true, ranges };
}
