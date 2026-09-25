import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Phase 5.7 — captures the real `PDFDocumentLoadingTask` instance
 * convertPdfToWord creates internally, so its real `destroyed` flag
 * (pdfjs-dist's own property, set synchronously as the first line of its
 * real `destroy()`) can be asserted on directly. `vi.spyOn` cannot be used
 * here — empirically confirmed (Phase 5.7 audit) that pdfjs-dist's real ESM
 * named exports are non-configurable, so patching `getDocument` directly
 * throws "Cannot redefine property". `vi.mock`'s module-factory form does
 * not have this restriction: it intercepts module resolution itself, so
 * both this test file and src/lib/pdf-to-word-engine.ts's own import receive
 * the same wrapped module. The wrapper calls straight through to the real
 * `getDocument` for every other behavior (parsing, PasswordException,
 * GlobalWorkerOptions, everything) — only the returned real task is also
 * captured here, never replaced or faked.
 */
let capturedLoadingTask: { destroyed: boolean } | undefined;

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("pdfjs-dist/legacy/build/pdf.mjs")>();
  return {
    ...actual,
    getDocument: (params: Parameters<typeof actual.getDocument>[0]) => {
      const task = actual.getDocument(params);
      capturedLoadingTask = task;
      return task;
    },
  };
});

import { PDFDocument, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import { convertPdfToWord, PdfToWordError } from "../src/lib/pdf-to-word-engine";
import type { PdfFileInput } from "../shared/pdf";

/**
 * Phase 5.5 — PDF to Word engine tests.
 *
 * Real pdf-lib-generated fixtures throughout (never fabricated bytes),
 * matching this project's established discipline. One appropriate test per
 * topic per the project's testing rule.
 */

beforeEach(() => {
  capturedLoadingTask = undefined;
});

async function makeTextPdf(): Promise<PdfFileInput> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([612, 792]);

  page.drawText("Codivio Feasibility Test Document", { x: 50, y: 740, size: 20, font: boldFont });
  page.drawText("Section One: Introduction", { x: 50, y: 700, size: 14, font: boldFont });
  page.drawText("This is the first paragraph of body text.", { x: 50, y: 675, size: 11, font });
  page.drawText("This is a second, separate paragraph.", { x: 50, y: 645, size: 11, font });

  const page2 = doc.addPage([612, 792]);
  page2.drawText("Page 2: Continued Content", { x: 50, y: 740, size: 14, font: boldFont });
  page2.drawText("Text continues here on the second page.", { x: 50, y: 715, size: 11, font });

  const bytes = await doc.save();
  return { name: "text.pdf", size: bytes.length, bytes };
}

async function makeWrappedParagraphPdf(): Promise<PdfFileInput> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  // Two lines, small gap (13pt, close to the 11pt font size) — simulates one
  // paragraph wrapped across two lines, as a real word processor would emit.
  page.drawText("This paragraph wraps across two lines because it is long", { x: 50, y: 700, size: 11, font });
  page.drawText("and continues naturally on the next line without a break.", { x: 50, y: 687, size: 11, font });
  // A real, deliberate paragraph break: much larger vertical gap.
  page.drawText("This is a genuinely separate paragraph further down.", { x: 50, y: 640, size: 11, font });
  const bytes = await doc.save();
  return { name: "wrapped.pdf", size: bytes.length, bytes };
}

async function makeTwoColumnPdf(): Promise<PdfFileInput> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 300]);
  page.drawText("Left col line 1", { x: 50, y: 250, size: 11, font });
  page.drawText("Left col line 2", { x: 50, y: 230, size: 11, font });
  page.drawText("Right col line 1", { x: 350, y: 250, size: 11, font });
  page.drawText("Right col line 2", { x: 350, y: 230, size: 11, font });
  const bytes = await doc.save();
  return { name: "two-column.pdf", size: bytes.length, bytes };
}

async function makeImageOnlyPdf(): Promise<PdfFileInput> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([200, 200]);
  const png1x1 = Buffer.from(
    "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415478da6360000002000155020ea24b5c0000000049454e44ae426082",
    "hex",
  );
  const embeddedImage = await doc.embedPng(png1x1);
  page.drawImage(embeddedImage, { x: 20, y: 20, width: 160, height: 160 });
  const bytes = await doc.save();
  return { name: "image-only.pdf", size: bytes.length, bytes };
}

async function unzipDocx(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  return { zip, documentXml: documentXml ?? "" };
}

describe("convertPdfToWord — real text extraction and DOCX generation", () => {
  it("extracts real text and produces a valid, unzip-inspectable .docx containing it", async () => {
    const file = await makeTextPdf();
    const result = await convertPdfToWord(file);

    expect(result.pageCount).toBe(2);
    const { zip, documentXml } = await unzipDocx(result.bytes);
    expect(Object.keys(zip.files)).toContain("[Content_Types].xml");
    expect(Object.keys(zip.files)).toContain("word/document.xml");
    expect(documentXml).toContain("Codivio Feasibility Test Document");
    expect(documentXml).toContain("This is the first paragraph of body text.");
    expect(documentXml).toContain("Page 2: Continued Content");
  });

  it("reconstructs a genuine wrapped paragraph as one paragraph, distinct from a real paragraph break", async () => {
    const file = await makeWrappedParagraphPdf();
    const result = await convertPdfToWord(file);
    const { documentXml } = await unzipDocx(result.bytes);

    // The two wrapped lines are joined with a space into one paragraph.
    expect(documentXml).toContain("wraps across two lines because it is long and continues naturally");
    // The genuinely separate paragraph remains its own, distinct text.
    expect(documentXml).toContain("This is a genuinely separate paragraph further down.");
  });

  it("preserves left-to-right column reading order on a simple two-column layout (best-effort, per the accepted feasibility report)", async () => {
    const file = await makeTwoColumnPdf();
    const result = await convertPdfToWord(file);
    const { documentXml } = await unzipDocx(result.bytes);

    const leftIndex = documentXml.indexOf("Left col line 1");
    const rightIndex = documentXml.indexOf("Right col line 1");
    expect(leftIndex).toBeGreaterThan(-1);
    expect(rightIndex).toBeGreaterThan(-1);
    expect(leftIndex).toBeLessThan(rightIndex);
  });

  it("inserts a real page break between pages, never merging cross-page text into one paragraph", async () => {
    const file = await makeTextPdf();
    const result = await convertPdfToWord(file);
    const { documentXml } = await unzipDocx(result.bytes);
    expect(documentXml).toMatch(/<w:br w:type="page"\/>/);
  });

  it("refuses a scanned/image-only PDF honestly instead of generating an empty .docx", async () => {
    const file = await makeImageOnlyPdf();
    let caught: unknown;
    try {
      await convertPdfToWord(file);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PdfToWordError);
    expect((caught as PdfToWordError).errors[0].code).toBe("no_extractable_text");
  });

  it("rejects a corrupt/unparseable file with a specific, named PdfToWordError rather than a raw library error", async () => {
    const corrupt: PdfFileInput = {
      name: "corrupt.pdf",
      size: 40,
      bytes: new TextEncoder().encode("%PDF-1.4\nthis is not a real pdf body"),
    };
    let caught: unknown;
    try {
      await convertPdfToWord(corrupt);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PdfToWordError);
    expect((caught as PdfToWordError).errors[0].code).toBe("corrupt_pdf");
  });

  it("rejects invalid file input (empty/bad signature) before attempting to parse it", async () => {
    const file: PdfFileInput = { name: "empty.pdf", size: 0, bytes: new Uint8Array(0) };
    await expect(convertPdfToWord(file)).rejects.toBeInstanceOf(PdfToWordError);
  });
});

describe("convertPdfToWord — pdfjs-dist worker lifecycle (Phase 5.7)", () => {
  it("destroys the pdfjs-dist loading task after a successful conversion", async () => {
    const file = await makeTextPdf();
    await convertPdfToWord(file);
    expect(capturedLoadingTask).toBeDefined();
    expect(capturedLoadingTask?.destroyed).toBe(true);
  });

  it("destroys the pdfjs-dist loading task even when conversion fails", async () => {
    const corrupt: PdfFileInput = {
      name: "corrupt.pdf",
      size: 40,
      bytes: new TextEncoder().encode("%PDF-1.4\nthis is not a real pdf body"),
    };
    await expect(convertPdfToWord(corrupt)).rejects.toBeInstanceOf(PdfToWordError);
    expect(capturedLoadingTask).toBeDefined();
    expect(capturedLoadingTask?.destroyed).toBe(true);
  });
});
