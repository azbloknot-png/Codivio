// Uses pdfjs-dist's `legacy` build, not the modern default entry — a real,
// empirically-found requirement (see the Phase 5.5 implementation report):
// the modern build's own runtime check prints "Please use the `legacy`
// build in Node.js environments" and produces a genuinely broken parse
// under this project's Node-based Vitest suite. The legacy build is
// pdfjs-dist's own documented, fully-supported answer to needing one code
// path that works correctly under both a real browser (production) and
// Node (this project's test runner) — not a workaround or a divergent
// test-only path.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// PasswordException must come from this SAME legacy module, not the main
// "pdfjs-dist" entry — they are separately-built bundles, so an exception
// thrown by the legacy build's getDocument() would otherwise fail an
// `instanceof` check against the modern build's own class (a real,
// empirically-relevant risk once two different builds of the same package
// are involved).
const { PasswordException } = pdfjsLib;
// Vite's `?url` suffix gives the real, hashed, deployable URL of this
// worker script as a plain string — the standard bundler-compatible way to
// wire pdfjs-dist's worker, served as its own separate asset rather than
// inlined into whatever imports this file. Deliberately the pre-minified
// `.min.mjs` file, not the plain `.mjs` one: a `?url` import is copied
// verbatim as an opaque static asset and never passes through Rollup's own
// JS minifier, so using the already-minified file is a real, measured ~45%
// size reduction for this one asset (see the Phase 5.5 implementation
// report for the actual before/after numbers).
// eslint-disable-next-line import/no-unresolved
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { Document, HeadingLevel, Packer, PageBreak, Paragraph, TextRun } from "docx";
import { MIN_EXTRACTABLE_TEXT_CHARACTERS, validatePdfFile } from "../../shared/pdf";
import type { PdfFileInput, PdfValidationError } from "../../shared/pdf";

/**
 * Codivio PDF → Word engine (Phase 5.5).
 *
 * Deliberately its own file, separate from src/lib/pdf-engine.ts: it never
 * imports `pdf-lib`, and pdf-engine.ts never imports `pdfjs-dist`/`docx` —
 * per the approved scope's "keep pdf-lib isolated from the new extraction/
 * generation logic where practical." This also means Merge/Split/Compress
 * never load this file's much heavier dependencies, and this tool never
 * loads pdf-lib; each gets its own separate lazy chunk (verified in the
 * implementation report's real build output).
 *
 * Honest product scope (explicitly NOT a full-fidelity converter): extracts
 * real text from a PDF and reconstructs it into a real, valid .docx using a
 * disclosed, best-effort heuristic — never a fabricated "conversion."
 * Explicitly unsupported: scanned/image-only PDFs (detected and refused,
 * never silently emptied), tables, embedded images, guaranteed font/bold/
 * italic fidelity, exact visual layout, OCR.
 */

// A real, empirically-found runtime split (see the Phase 5.5 implementation
// report): in a real browser, `pdfWorkerUrl` (Vite's `?url`-resolved,
// hashed, deployed asset path) is exactly right. Under this project's
// Node-based Vitest suite, pdfjs-dist falls back to its own "fake worker"
// mode (no real browser Worker global exists) and dynamically imports
// `workerSrc` directly — a web-root-relative `?url` string like
// "/node_modules/pdfjs-dist/..." is not a valid Node import specifier and
// fails with "Setting up fake worker failed". The bare package specifier
// string below is what Node's own module resolution needs instead. Both
// branches load the exact same real pdfjs-dist worker code — this is a
// runtime path-resolution difference between two real environments, never a
// mocked or fake extraction behavior.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  typeof window !== "undefined" ? pdfWorkerUrl : "pdfjs-dist/legacy/build/pdf.worker.mjs";

export class PdfToWordError extends Error {
  errors: PdfValidationError[];

  constructor(errors: PdfValidationError[]) {
    super(errors.map((e) => e.message).join(" "));
    this.name = "PdfToWordError";
    this.errors = errors;
  }
}

export interface PdfToWordResult {
  bytes: Uint8Array;
  pageCount: number;
}

interface ExtractedLine {
  text: string;
  /** Rounded font size, used only as a relative signal (heading vs body,
   * same-size line joining) — never presented to the user as an exact fact. */
  fontSize: number;
  /** PDF y-coordinate (points from the page bottom) of the line's first
   * real text item — used only to detect ordinary line-wrap vs a real
   * paragraph break. */
  y: number;
  page: number;
}

/**
 * A line's font size counts as a "heading" only when it is meaningfully
 * larger than the document's own most common (body) font size. A PDF has no
 * native heading concept — this is a disclosed, best-effort heuristic, not
 * a structural extraction. Not benchmarked against a large real-world PDF
 * corpus (no browser available in this environment).
 */
const HEADING_FONT_SIZE_RATIO = 1.15;

/**
 * Two consecutive same-size lines on the same page are treated as one
 * wrapped paragraph (joined with a space) only when the vertical gap between
 * them is no more than this multiple of the font size — i.e., looks like
 * ordinary single-spaced line wrap, not a deliberate paragraph break. A
 * disclosed heuristic, not a guarantee; see the implementation report's
 * real fixture-based test coverage for what this was actually verified
 * against.
 */
const LINE_JOIN_GAP_RATIO = 1.6;

function roundFontSize(size: number): number {
  return Math.round(size * 10) / 10;
}

/** Real pdf.js text-content items can be either genuine text runs (with a
 * `str` field) or `TextMarkedContent` objects (no `str`) — this narrows to
 * the former, the only shape this engine cares about. */
function hasStr(item: unknown): item is { str: string; hasEOL?: boolean; transform?: number[] } {
  return typeof item === "object" && item !== null && "str" in item;
}

async function extractLines(pdf: pdfjsLib.PDFDocumentProxy): Promise<ExtractedLine[]> {
  const lines: ExtractedLine[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    let buffer = "";
    let maxSize = 0;
    let firstY: number | null = null;

    const flushLine = () => {
      const trimmed = buffer.trim();
      if (trimmed.length > 0) {
        lines.push({ text: trimmed, fontSize: roundFontSize(maxSize || 1), y: firstY ?? 0, page: pageNum });
      }
      buffer = "";
      maxSize = 0;
      firstY = null;
    };

    for (const item of content.items) {
      if (!hasStr(item)) continue;
      if (item.str) {
        buffer += item.str;
        const size = item.transform ? Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 0 : 0;
        if (size > maxSize) maxSize = size;
        if (firstY === null && item.transform) firstY = item.transform[5];
      }
      if (item.hasEOL) flushLine();
    }
    flushLine();
  }

  return lines;
}

function modeFontSize(lines: ExtractedLine[]): number {
  const counts = new Map<number, number>();
  for (const line of lines) counts.set(line.fontSize, (counts.get(line.fontSize) ?? 0) + 1);
  let best = 0;
  let bestCount = 0;
  for (const [size, count] of counts) {
    if (count > bestCount) {
      best = size;
      bestCount = count;
    }
  }
  return best || 1;
}

/**
 * Turns the extracted lines into real docx.js paragraph nodes: consecutive
 * same-size, small-vertical-gap lines on one page are joined into a single
 * wrapped paragraph; a page change inserts a real page break; a line whose
 * size clears HEADING_FONT_SIZE_RATIO over the document's body size becomes
 * a Heading 1 paragraph. Every other line is a plain paragraph.
 */
function buildDocxChildren(lines: ExtractedLine[], bodyFontSize: number) {
  const children: (Paragraph)[] = [];
  let previous: ExtractedLine | null = null;
  let currentText = "";
  let currentIsHeading = false;

  const flush = () => {
    if (!currentText) return;
    children.push(
      currentIsHeading
        ? new Paragraph({ text: currentText, heading: HeadingLevel.HEADING_1 })
        : new Paragraph({ children: [new TextRun(currentText)] }),
    );
    currentText = "";
  };

  for (const line of lines) {
    const isHeading = line.fontSize > bodyFontSize * HEADING_FONT_SIZE_RATIO;
    const samePage = previous !== null && previous.page === line.page;

    if (previous !== null && previous.page !== line.page) {
      flush();
      children.push(new Paragraph({ children: [new PageBreak()] }));
      previous = null;
    }

    const gap = previous ? previous.y - line.y : Infinity;
    const looksLikeWrap =
      previous !== null &&
      samePage &&
      !isHeading &&
      !currentIsHeading &&
      line.fontSize === previous.fontSize &&
      gap > 0 &&
      gap <= line.fontSize * LINE_JOIN_GAP_RATIO;

    if (looksLikeWrap) {
      currentText += ` ${line.text}`;
    } else {
      flush();
      currentText = line.text;
      currentIsHeading = isHeading;
    }
    previous = line;
  }
  flush();

  return children;
}

/**
 * Extracts real text from a PDF and reconstructs it into a real, valid
 * .docx. Throws PdfToWordError on invalid input, an encrypted PDF, a file
 * pdf.js genuinely cannot parse, or — the critical honest-UX case — a PDF
 * with no meaningful extractable text (a real, disclosed refusal, never a
 * silently-empty "success").
 */
export async function convertPdfToWord(file: PdfFileInput): Promise<PdfToWordResult> {
  const fileErrors = validatePdfFile(file);
  if (fileErrors.length > 0) {
    throw new PdfToWordError(fileErrors);
  }

  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    pdf = await pdfjsLib.getDocument({ data: file.bytes }).promise;
  } catch (error) {
    if (error instanceof PasswordException) {
      throw new PdfToWordError([
        {
          code: "encrypted_pdf",
          message: `"${file.name}" is password-protected. Password-protected PDFs are not supported.`,
          fileName: file.name,
        },
      ]);
    }
    throw new PdfToWordError([
      {
        code: "corrupt_pdf",
        message: `"${file.name}" could not be read as a valid PDF (it may be corrupt or not a real PDF).`,
        fileName: file.name,
      },
    ]);
  }

  const pageCount = pdf.numPages;
  const lines = await extractLines(pdf);
  const totalCharacters = lines.reduce((sum, line) => sum + line.text.length, 0);

  if (totalCharacters < MIN_EXTRACTABLE_TEXT_CHARACTERS) {
    throw new PdfToWordError([
      {
        code: "no_extractable_text",
        message: `"${file.name}" does not appear to contain extractable text — it may be a scanned or image-only PDF. This tool does not support OCR.`,
        fileName: file.name,
      },
    ]);
  }

  const bodyFontSize = modeFontSize(lines);
  const children = buildDocxChildren(lines, bodyFontSize);
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const bytes = new Uint8Array(await blob.arrayBuffer());

  return { bytes, pageCount };
}
