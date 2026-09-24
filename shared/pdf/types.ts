/**
 * Codivio Shared PDF Engine — types (Phase 5.2).
 *
 * Framework-agnostic: no import of the `pdf-lib` package or any browser/Node
 * API. Safe to import from both the Worker and the frontend, mirroring the
 * shared/qr/ split established in Phase 4.1 (see shared/qr/types.ts).
 *
 * Phase 5.1's architecture audit found no Phase 5 operation currently in
 * scope requires Worker/R2 processing — everything here runs entirely
 * client-side. Phase 5.2 added Merge; Phase 5.3 adds Split (page-range
 * extraction). Compress/PDF-to-Word payload and config shapes are
 * deliberately not modeled here yet — each later sub-phase adds its own
 * types when it actually needs them, the same incremental growth pattern
 * shared/qr/types.ts followed across Phase 4.1/4.3/4.4/4.5.
 */

/** The real PDF file-format signature — the first 5 bytes of any valid PDF
 * file are the ASCII string "%PDF-" (e.g. "%PDF-1.7"). Checking this is a
 * real, verifiable content check against the actual bytes — never a
 * filename/extension/client-declared MIME type check (see DECISIONS.md's
 * "Image Upload Standard" for why that distinction matters). It is not a
 * full parse: a file can pass this check and still be corrupt further in —
 * src/lib/pdf-engine.ts's actual pdf-lib parse is the real, authoritative
 * validity check. */
export const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d] as const; // "%PDF-"

/**
 * Conservative, documented app-level limits — not a benchmarked hard
 * capacity ceiling. Phase 5.1's architecture audit found no browser is
 * available in this environment to empirically determine a device-safe
 * threshold (UNKNOWN — NOT VERIFIED), so these are deliberately
 * conservative defaults broadly consistent with what other free online PDF
 * tools publicly advertise, chosen to keep this entirely client-side
 * feature's real memory cost bounded to the visiting user's own browser tab
 * — never Codivio's own infrastructure, since nothing here ever reaches a
 * server. Revisit with real device testing in Phase 5.8 (Performance) if
 * evidence suggests otherwise; do not raise these without such evidence.
 */
export const MAX_PDF_FILE_BYTES = 50 * 1024 * 1024; // 50 MB per file
export const MAX_PDF_FILES_PER_MERGE = 20;
export const MIN_PDF_FILES_PER_MERGE = 2;
export const MAX_TOTAL_MERGE_BYTES = 150 * 1024 * 1024; // 150 MB combined

/**
 * Phase 5.3 — a real, documented cap on how many separate output files one
 * Split operation can produce, whether from explicit ranges or from
 * "every page separately" (which is really just one implicit range per
 * page — see shared/pdf/validate.ts#everyPageRanges). Prevents a
 * pathologically large page count from generating hundreds of pdf-lib
 * documents and browser downloads in one click, a real, self-inflicted
 * browser-tab cost with no server involved (Phase 5.1's cost/architecture
 * decision). Same "conservative default, revisit only with real evidence"
 * status as the Merge limits above.
 */
export const MAX_SPLIT_OUTPUT_FILES = 50;

/**
 * Phase 5.4 — the JPEG re-encode quality used by Compress's image pass
 * (0-1, matching the Canvas `convertToBlob`/`toBlob` quality parameter's own
 * scale). A conservative, documented middle-ground value, not a benchmarked
 * "best" number — Phase 5.4's own feasibility audit found no browser
 * available in this environment to empirically tune it against real
 * scanned/photo PDFs. Same "conservative default, revisit only with real
 * evidence" status as the limits above.
 */
export const DEFAULT_COMPRESS_JPEG_QUALITY = 0.7;

/**
 * Phase 5.5 — a real, documented, conservative threshold on total extracted
 * characters (across the whole document) below which a PDF is treated as
 * having no meaningful extractable text — i.e., a scanned/image-only PDF.
 * Not benchmarked against a large real-world corpus (no browser available in
 * this environment); chosen to be comfortably above a blank/near-blank page's
 * incidental extracted whitespace while staying low enough not to falsely
 * reject a genuinely short but real text document. Revisit only with real
 * evidence, same status as every other conservative default in this file.
 */
export const MIN_EXTRACTABLE_TEXT_CHARACTERS = 20;

export type PdfValidationErrorCode =
  | "empty_file"
  | "invalid_pdf_signature"
  | "file_too_large"
  | "too_many_files"
  | "not_enough_files"
  | "total_size_exceeded"
  | "corrupt_pdf"
  | "empty_page_selection"
  | "invalid_page_range"
  | "page_out_of_range"
  | "too_many_output_files"
  | "encrypted_pdf"
  | "no_extractable_text";

export interface PdfValidationError {
  code: PdfValidationErrorCode;
  /** Human-readable, safe to show directly in a UI. */
  message: string;
  /** Which file this error is about, when the error is file-specific — not
   * set for batch-level errors (too_many_files/not_enough_files/
   * total_size_exceeded). */
  fileName?: string;
}

/** A selected file's raw bytes, already read into memory by the caller
 * (src/tools/PdfMergeTool.tsx via the browser File API) — this module never
 * touches `File`/`Blob` itself, keeping it safely importable from a Worker
 * (which has no `File` global) exactly like shared/qr/'s own DOM-free
 * design. */
export interface PdfFileInput {
  name: string;
  size: number;
  bytes: Uint8Array;
}

export type PdfMergeValidationResult =
  | { ok: true; files: PdfFileInput[] }
  | { ok: false; errors: PdfValidationError[] };

/** A single, 1-based, inclusive page range — `{ start: 3, end: 3 }` for a
 * single page, matching the existing SEO/content copy's own framing
 * ("a single page can be treated as a page range of one"). */
export interface PdfPageRange {
  start: number;
  end: number;
}

export type PdfPageRangesResult =
  | { ok: true; ranges: PdfPageRange[] }
  | { ok: false; errors: PdfValidationError[] };
