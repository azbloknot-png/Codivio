import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from "pdf-lib";
import type { PDFDict } from "pdf-lib";
import { DEFAULT_COMPRESS_JPEG_QUALITY, validatePdfFile, validatePdfMergeRequest } from "../../shared/pdf";
import type { PdfFileInput, PdfPageRange, PdfValidationError } from "../../shared/pdf";

/**
 * Codivio Shared PDF Engine — browser-side merge/split/compress wrapper
 * (Phase 5.2 Merge, Phase 5.3 Split, Phase 5.4 Compress).
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

export class PdfCompressError extends Error {
  errors: PdfValidationError[];

  constructor(errors: PdfValidationError[]) {
    super(errors.map((e) => e.message).join(" "));
    this.name = "PdfCompressError";
    this.errors = errors;
  }
}

export interface PdfCompressResult {
  originalSize: number;
  outputSize: number;
  /** Never larger than `originalSize` — if nothing genuinely shrank, this is
   * the original, untouched bytes, never a re-saved-but-bigger file. */
  bytes: Uint8Array;
  /** True only when `outputSize < originalSize`. */
  reduced: boolean;
  imagesRecompressed: number;
  imagesSkipped: number;
}

/**
 * Phase 5.4's own feasibility audit found only `DeviceRGB`/`DeviceGray`
 * embedded JPEGs are safe to recompress with a plain browser JPEG codec —
 * `DeviceCMYK`/`Indexed`/`Separation`/ICCBased and other color spaces are
 * real, disclosed "cannot compress" cases (a native browser decoder cannot
 * be trusted to interpret them correctly), never silently attempted.
 */
const SAFE_IMAGE_COLOR_SPACES = ["/DeviceRGB", "/DeviceGray"];

/**
 * Decides whether one indirect PDF object is a JPEG image stream this phase
 * is willing to touch. Deliberately narrow and conservative, per the
 * approved Phase 5.4 proposal's engineering rules — every check below is a
 * real, disclosed scope boundary, not an oversight:
 *
 * - `Filter` must be exactly the single name `DCTDecode` (a plain embedded
 *   JPEG) — a filter *array* (chained filters) or any other single filter
 *   (`FlateDecode`, `CCITTFaxDecode`, `JBIG2Decode`, ...) is left untouched.
 * - No `SMask`/`Mask` (soft-mask transparency) — recompressing the base
 *   image without correctly handling its mask risks visibly broken
 *   transparency, which this phase does not attempt to solve.
 * - No `Decode` array — usually signals inverted/non-standard sample
 *   mapping (e.g. some CMYK/Adobe JPEGs), skipped for the same safety
 *   reason.
 * - `ColorSpace` must resolve to `DeviceRGB`/`DeviceGray` and
 *   `BitsPerComponent` must be 8 — the only combination a plain browser
 *   JPEG codec can be trusted to decode/re-encode correctly.
 */
function isEligibleForRecompression(dict: PDFDict): boolean {
  const subtype = dict.lookup(PDFName.of("Subtype"));
  if (!(subtype instanceof PDFName) || subtype.asString() !== "/Image") return false;

  const filter = dict.lookup(PDFName.of("Filter"));
  if (!(filter instanceof PDFName) || filter.asString() !== "/DCTDecode") return false;

  if (dict.has(PDFName.of("SMask")) || dict.has(PDFName.of("Mask"))) return false;
  if (dict.has(PDFName.of("Decode"))) return false;

  const colorSpace = dict.lookup(PDFName.of("ColorSpace"));
  if (!(colorSpace instanceof PDFName) || !SAFE_IMAGE_COLOR_SPACES.includes(colorSpace.asString())) return false;

  const bitsPerComponent = dict.lookup(PDFName.of("BitsPerComponent"));
  if (!(bitsPerComponent instanceof PDFNumber) || bitsPerComponent.asNumber() !== 8) return false;

  return true;
}

/**
 * Re-encodes one JPEG image's raw bytes at a lower quality using the
 * browser's own native codec — `createImageBitmap`/`OffscreenCanvas` are
 * standard Web APIs, not a new dependency. This is the ONLY function in
 * Phase 5.4 that cannot run under this project's Node-based Vitest
 * environment (Node has no `createImageBitmap`/`OffscreenCanvas`) — real
 * interactive browser behavior for this exact function is
 * UNKNOWN — NOT VERIFIED / ENVIRONMENT LIMITATION, disclosed in the Phase
 * 5.4 implementation report. `compressPdfFile` never calls this directly;
 * it always goes through the `recompressJpeg` parameter, which defaults to
 * this real implementation in production and is overridden only by tests
 * (see tests/pdf-engine.test.ts's own compressPdfFile describe block) —
 * never a fake/placeholder production path.
 */
async function reencodeJpegWithCanvas(bytes: Uint8Array, quality: number): Promise<Uint8Array> {
  const blob = new Blob([new Uint8Array(bytes)], { type: "image/jpeg" });
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D canvas context unavailable");
    }
    ctx.drawImage(bitmap, 0, 0);
    const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    return new Uint8Array(await outBlob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

export interface PdfCompressOverrides {
  /** 0-1 JPEG re-encode quality; defaults to DEFAULT_COMPRESS_JPEG_QUALITY. */
  quality?: number;
  /** Test-only seam — see reencodeJpegWithCanvas's own doc comment. Never
   * set by src/tools/PdfCompressTool.tsx; production always uses the real
   * canvas-based implementation. */
  recompressJpeg?: (bytes: Uint8Array, quality: number) => Promise<Uint8Array>;
}

/**
 * Compresses a single PDF file, entirely in memory, in two passes:
 *
 * Pass A (always applied, real but modest): strips document metadata
 * (Title/Author/Subject/Keywords/Creator/Producer) and re-saves the
 * document. Phase 5.4's own empirical verification (see the implementation
 * report) found this does NOT drop generically-unreferenced objects — pdf-lib
 * writes every object `context.enumerateIndirectObjects()` returns — but DOES
 * genuinely shrink a file that was using a classic cross-reference table by
 * upgrading it to a compressed cross-reference stream (pdf-lib's own
 * `save()` default), which was verified to produce a real, substantial size
 * reduction for that specific, common case.
 *
 * Pass B (real, the primary value driver, narrowly scoped): recompresses
 * only embedded JPEG images that pass `isEligibleForRecompression`'s safety
 * checks — every other image encoding/case is left byte-for-byte untouched
 * (a real, disclosed limitation, not a silently-skipped edge case).
 *
 * Never returns a result larger than the original file — if the resaved
 * document (with or without any recompressed images) is not genuinely
 * smaller, the original, untouched bytes are returned instead and
 * `reduced` is `false`. Throws PdfCompressError on invalid input or a file
 * pdf-lib genuinely cannot parse — mirrors mergePdfFiles/splitPdfFile's own
 * honest-failure policy exactly, including the same widened load+process
 * try/catch this project has needed for both prior PDF operations.
 */
export async function compressPdfFile(
  file: PdfFileInput,
  overrides: PdfCompressOverrides = {},
): Promise<PdfCompressResult> {
  const fileErrors = validatePdfFile(file);
  if (fileErrors.length > 0) {
    throw new PdfCompressError(fileErrors);
  }

  const quality = overrides.quality ?? DEFAULT_COMPRESS_JPEG_QUALITY;
  const recompressJpeg = overrides.recompressJpeg ?? reencodeJpegWithCanvas;

  let doc: PDFDocument;
  try {
    // Deliberately does NOT pass { ignoreEncryption: true } — same honest-
    // failure policy as mergePdfFiles/splitPdfFile above.
    doc = await PDFDocument.load(file.bytes);

    doc.setTitle("");
    doc.setAuthor("");
    doc.setSubject("");
    doc.setKeywords([]);
    doc.setCreator("");
    doc.setProducer("");

    let imagesRecompressed = 0;
    let imagesSkipped = 0;

    for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
      if (!(obj instanceof PDFRawStream)) continue;
      if (!isEligibleForRecompression(obj.dict)) continue;

      const originalImageBytes = obj.getContents();
      let newImageBytes: Uint8Array;
      try {
        newImageBytes = await recompressJpeg(originalImageBytes, quality);
      } catch {
        // A real, disclosed possibility: the codec can reject a stream that
        // is labeled DCTDecode but is not actually a decodable JPEG (a
        // genuinely malformed embedded image). Skipped, never fatal to the
        // whole document.
        imagesSkipped += 1;
        continue;
      }

      if (newImageBytes.length >= originalImageBytes.length) {
        imagesSkipped += 1;
        continue;
      }

      const newDict = obj.dict.clone(doc.context);
      newDict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
      newDict.delete(PDFName.of("DecodeParms"));
      doc.context.assign(ref, PDFRawStream.of(newDict, newImageBytes));
      imagesRecompressed += 1;
    }

    const resavedBytes = await doc.save();
    const originalSize = file.bytes.length;

    if (resavedBytes.length < originalSize) {
      return {
        originalSize,
        outputSize: resavedBytes.length,
        bytes: resavedBytes,
        reduced: true,
        imagesRecompressed,
        imagesSkipped,
      };
    }

    // Honest, real outcome (not an error): the file was already efficiently
    // structured, or Pass A/B's changes did not net out smaller. Return the
    // original, untouched bytes — never something bigger than what the user
    // uploaded.
    return {
      originalSize,
      outputSize: originalSize,
      bytes: file.bytes,
      reduced: false,
      imagesRecompressed,
      imagesSkipped,
    };
  } catch (error) {
    if (error instanceof PdfCompressError) throw error;
    throw new PdfCompressError([
      {
        code: "corrupt_pdf",
        message: `"${file.name}" could not be read as a valid PDF (it may be corrupt, password-protected, or not a real PDF).`,
        fileName: file.name,
      },
    ]);
  }
}
