import { PDFDocument } from "pdf-lib";
import { validatePdfFile, validatePdfMergeRequest } from "../../shared/pdf";
import type { PdfFileInput, PdfPageRange, PdfValidationError } from "../../shared/pdf";

/**
 * Codivio Shared PDF Engine — browser-side merge/split wrapper (Phase 5.2
 * Merge, Phase 5.3 Split).
 *
 * This is the only file that imports the `pdf-lib` package. Pure types and
 * validation live in shared/pdf/ so they stay importable from anywhere
 * (including a future Worker, which has no such need today per Phase 5.1's
 * architecture decision) without ever pulling in the actual PDF library —
 * mirrors src/lib/qr-engine.ts's exact split from shared/qr/.
 *
 * Everything here runs entirely client-side: no network call, no upload, no
 * file ever leaves the browser tab. Phase 5.1's architecture audit found no
 * Phase 5 operation currently in scope requires Worker/R2 involvement.
 */

export class PdfMergeError extends Error {
  errors: PdfValidationError[];

  constructor(errors: PdfValidationError[]) {
    super(errors.map((e) => e.message).join(" "));
    this.name = "PdfMergeError";
    this.errors = errors;
  }
}

export interface PdfMergeResult {
  bytes: Uint8Array;
  pageCount: number;
}

/**
 * Validates every file (shared/pdf/validate.ts), then merges them in the
 * given order into one new PDF, entirely in memory. Throws PdfMergeError on
 * invalid input or a file pdf-lib genuinely cannot parse — never silently
 * produces a partial or empty result.
 */
export async function mergePdfFiles(files: PdfFileInput[]): Promise<PdfMergeResult> {
  const validation = validatePdfMergeRequest(files);
  if (!validation.ok) {
    throw new PdfMergeError(validation.errors);
  }

  const mergedPdf = await PDFDocument.create();

  for (const file of validation.files) {
    try {
      // Deliberately does NOT pass { ignoreEncryption: true } — an
      // encrypted PDF is honestly reported as unreadable here, never
      // silently processed as if its protection weren't there.
      //
      // The whole per-file pipeline (load + copyPages) is wrapped in one
      // try/catch, not just `load()` — a real, empirically-found gap: for
      // some malformed-but-signature-matching input, pdf-lib's `load()`
      // does not throw, and the failure only surfaces later inside
      // `copyPages()`/`getPageIndices()` (confirmed by a real failing test
      // during this phase's own implementation, mirroring the project's
      // existing "verify empirically, don't assume library behavior"
      // discipline from Phase 4.8's QR capacity finding).
      const sourcePdf = await PDFDocument.load(file.bytes);
      const copiedPages = await mergedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    } catch {
      throw new PdfMergeError([
        {
          code: "corrupt_pdf",
          message: `"${file.name}" could not be read as a valid PDF (it may be corrupt, password-protected, or not a real PDF).`,
          fileName: file.name,
        },
      ]);
    }
  }

  const bytes = await mergedPdf.save();
  return { bytes, pageCount: mergedPdf.getPageCount() };
}

export class PdfSplitError extends Error {
  errors: PdfValidationError[];

  constructor(errors: PdfValidationError[]) {
    super(errors.map((e) => e.message).join(" "));
    this.name = "PdfSplitError";
    this.errors = errors;
  }
}

export interface PdfSplitOutput {
  /** Human-readable label for this output file, e.g. "Page 5" or "Pages 8-10". */
  label: string;
  bytes: Uint8Array;
  pageCount: number;
}

export interface PdfSplitResult {
  sourcePageCount: number;
  outputs: PdfSplitOutput[];
}

function rangeLabel(range: PdfPageRange): string {
  return range.start === range.end ? `Page ${range.start}` : `Pages ${range.start}-${range.end}`;
}

/**
 * Loads a file and returns its real page count — used by the UI immediately
 * after file selection, before the user has chosen any page range, so the
 * real page count (never guessed) can be shown and used to validate
 * whatever range the user later enters. Throws PdfSplitError on an invalid
 * or unparseable file, exactly like splitPdfFile below.
 */
export async function loadPdfPageCount(file: PdfFileInput): Promise<number> {
  const fileErrors = validatePdfFile(file);
  if (fileErrors.length > 0) {
    throw new PdfSplitError(fileErrors);
  }
  try {
    const doc = await PDFDocument.load(file.bytes);
    return doc.getPageCount();
  } catch {
    throw new PdfSplitError([
      {
        code: "corrupt_pdf",
        message: `"${file.name}" could not be read as a valid PDF (it may be corrupt, password-protected, or not a real PDF).`,
        fileName: file.name,
      },
    ]);
  }
}

/**
 * Extracts one real, independent output PDF per given range, entirely in
 * memory. Every range becomes its own complete document (not a single
 * combined file) — this is what makes "every page separately" (Phase 5.3's
 * other required mode) just a list of singleton ranges rather than a
 * second code path; see shared/pdf/validate.ts#everyPageRanges. Throws
 * PdfSplitError on invalid input or a range pdf-lib genuinely cannot
 * extract — never silently produces a partial or empty result.
 */
export async function splitPdfFile(file: PdfFileInput, ranges: PdfPageRange[]): Promise<PdfSplitResult> {
  const fileErrors = validatePdfFile(file);
  if (fileErrors.length > 0) {
    throw new PdfSplitError(fileErrors);
  }

  let sourceDoc: PDFDocument;
  try {
    // Deliberately does NOT pass { ignoreEncryption: true } — same honest-
    // failure policy as mergePdfFiles above.
    sourceDoc = await PDFDocument.load(file.bytes);
  } catch {
    throw new PdfSplitError([
      {
        code: "corrupt_pdf",
        message: `"${file.name}" could not be read as a valid PDF (it may be corrupt, password-protected, or not a real PDF).`,
        fileName: file.name,
      },
    ]);
  }

  const sourcePageCount = sourceDoc.getPageCount();
  for (const range of ranges) {
    if (range.start < 1 || range.end > sourcePageCount || range.start > range.end) {
      throw new PdfSplitError([
        {
          code: "page_out_of_range",
          message: `"${rangeLabel(range)}" is outside this document's real page range (1–${sourcePageCount}).`,
          fileName: file.name,
        },
      ]);
    }
  }

  const outputs: PdfSplitOutput[] = [];
  for (const range of ranges) {
    try {
      const outDoc = await PDFDocument.create();
      const indices: number[] = [];
      for (let page = range.start; page <= range.end; page += 1) {
        indices.push(page - 1); // pdf-lib page indices are 0-based; our ranges are 1-based.
      }
      const copiedPages = await outDoc.copyPages(sourceDoc, indices);
      for (const page of copiedPages) {
        outDoc.addPage(page);
      }
      const bytes = await outDoc.save();
      outputs.push({ label: rangeLabel(range), bytes, pageCount: copiedPages.length });
    } catch {
      // Mirrors mergePdfFiles's own widened try/catch (load + copyPages both
      // covered) — a real, empirically-found gap from Phase 5.2 where
      // pdf-lib can fail inside copyPages() rather than at load() time.
      throw new PdfSplitError([
        {
          code: "corrupt_pdf",
          message: `Could not extract "${rangeLabel(range)}" from "${file.name}".`,
          fileName: file.name,
        },
      ]);
    }
  }

  return { sourcePageCount, outputs };
}
