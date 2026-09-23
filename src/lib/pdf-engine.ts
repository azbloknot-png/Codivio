import { PDFDocument } from "pdf-lib";
import { validatePdfMergeRequest } from "../../shared/pdf";
import type { PdfFileInput, PdfValidationError } from "../../shared/pdf";

/**
 * Codivio Shared PDF Engine — browser-side merge wrapper (Phase 5.2).
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
