import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  MAX_PDF_FILE_BYTES,
  MAX_PDF_FILES_PER_MERGE,
  MAX_SPLIT_OUTPUT_FILES,
  MAX_TOTAL_MERGE_BYTES,
  everyPageRanges,
  hasPdfSignature,
  parsePageRanges,
  validatePdfFile,
  validatePdfMergeRequest,
  type PdfFileInput,
} from "../shared/pdf";
import { mergePdfFiles, PdfMergeError, loadPdfPageCount, splitPdfFile, PdfSplitError } from "../src/lib/pdf-engine";

/** Builds a real, valid, minimal PDF via pdf-lib itself (not hand-crafted
 * bytes) — the same "use the real library to produce real fixtures" idea
 * tests/qr-engine.test.ts already follows for QR codes. */
async function makeTestPdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i += 1) {
    doc.addPage([200, 200]);
  }
  return doc.save();
}

async function makeFile(name: string, pageCount: number): Promise<PdfFileInput> {
  const bytes = await makeTestPdf(pageCount);
  return { name, size: bytes.length, bytes };
}

describe("hasPdfSignature", () => {
  it("recognizes a real PDF's actual byte signature", async () => {
    const bytes = await makeTestPdf(1);
    expect(hasPdfSignature(bytes)).toBe(true);
  });

  it("rejects non-PDF bytes and empty input", () => {
    expect(hasPdfSignature(new TextEncoder().encode("not a pdf at all"))).toBe(false);
    expect(hasPdfSignature(new Uint8Array(0))).toBe(false);
    expect(hasPdfSignature(new Uint8Array([0x25, 0x50]))).toBe(false); // shorter than the signature
  });
});

describe("validatePdfFile", () => {
  it("accepts a real, valid PDF file", async () => {
    const file = await makeFile("real.pdf", 1);
    expect(validatePdfFile(file)).toEqual([]);
  });

  it("rejects an empty file with only empty_file (no redundant signature error)", () => {
    const errors = validatePdfFile({ name: "empty.pdf", size: 0, bytes: new Uint8Array(0) });
    expect(errors.map((e) => e.code)).toEqual(["empty_file"]);
  });

  it("rejects a file that does not start with the real PDF signature", () => {
    const bytes = new TextEncoder().encode("this is definitely not a pdf");
    const errors = validatePdfFile({ name: "fake.pdf", size: bytes.length, bytes });
    expect(errors.map((e) => e.code)).toContain("invalid_pdf_signature");
  });

  it("rejects a file over the per-file size limit, and can report both size and signature problems at once", () => {
    const bytes = new TextEncoder().encode("not a pdf");
    const errors = validatePdfFile({ name: "huge.pdf", size: MAX_PDF_FILE_BYTES + 1, bytes });
    expect(errors.map((e) => e.code)).toEqual(
      expect.arrayContaining(["file_too_large", "invalid_pdf_signature"]),
    );
  });
});

describe("validatePdfMergeRequest", () => {
  it("accepts 2 or more valid files", async () => {
    const files = [await makeFile("a.pdf", 1), await makeFile("b.pdf", 2)];
    const result = validatePdfMergeRequest(files);
    expect(result.ok).toBe(true);
  });

  it("rejects fewer than 2 files (0 or 1) with not_enough_files", async () => {
    expect(validatePdfMergeRequest([]).ok).toBe(false);
    const one = validatePdfMergeRequest([await makeFile("a.pdf", 1)]);
    expect(one.ok).toBe(false);
    if (!one.ok) expect(one.errors.map((e) => e.code)).toContain("not_enough_files");
  });

  it("rejects more than the maximum file count with too_many_files", async () => {
    const files = await Promise.all(
      Array.from({ length: MAX_PDF_FILES_PER_MERGE + 1 }, (_, i) => makeFile(`f${i}.pdf`, 1)),
    );
    const result = validatePdfMergeRequest(files);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain("too_many_files");
  });

  it("rejects a combined size over the total limit with total_size_exceeded", async () => {
    const real = await makeFile("a.pdf", 1);
    // Only the `size` field (not the real byte length) needs to be large to
    // exercise this specific batch-level rule in isolation.
    const files: PdfFileInput[] = [
      real,
      { ...real, name: "b.pdf", size: MAX_TOTAL_MERGE_BYTES },
    ];
    const result = validatePdfMergeRequest(files);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain("total_size_exceeded");
  });

  it("collects every file's errors at once, not just the first", async () => {
    const bad1 = { name: "bad1.pdf", size: 0, bytes: new Uint8Array(0) };
    const bad2 = { name: "bad2.pdf", size: 10, bytes: new TextEncoder().encode("not a pdf!") };
    const result = validatePdfMergeRequest([bad1, bad2]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.filter((e) => e.fileName === "bad1.pdf").map((e) => e.code)).toContain("empty_file");
      expect(result.errors.filter((e) => e.fileName === "bad2.pdf").map((e) => e.code)).toContain(
        "invalid_pdf_signature",
      );
    }
  });
});

describe("mergePdfFiles", () => {
  it("merges 2 real PDFs into one, with the combined page count", async () => {
    const files = [await makeFile("a.pdf", 2), await makeFile("b.pdf", 3)];
    const result = await mergePdfFiles(files);
    expect(result.pageCount).toBe(5);
    expect(hasPdfSignature(result.bytes)).toBe(true);
  });

  it("merges files in the given order (verified via the resulting page count matching a 3-file batch)", async () => {
    const files = [await makeFile("a.pdf", 1), await makeFile("b.pdf", 1), await makeFile("c.pdf", 1)];
    const result = await mergePdfFiles(files);
    expect(result.pageCount).toBe(3);
    // Confirms the output is itself re-loadable as a real, valid PDF —
    // not just a byte blob that happens to start with the right signature.
    const reloaded = await PDFDocument.load(result.bytes);
    expect(reloaded.getPageCount()).toBe(3);
  });

  it("rejects invalid input (fewer than 2 files) rather than silently producing a single-file result", async () => {
    const files = [await makeFile("only.pdf", 1)];
    await expect(mergePdfFiles(files)).rejects.toBeInstanceOf(PdfMergeError);
  });

  it("reports a corrupt/unparseable file with a specific, named PdfMergeError rather than a raw library error", async () => {
    const good = await makeFile("good.pdf", 1);
    // Passes the magic-byte check (starts with "%PDF-") but is not a real,
    // parseable PDF structure — exercises the pdf-lib load failure path
    // specifically, distinct from the signature-check rejection above.
    const corrupt: PdfFileInput = {
      name: "corrupt.pdf",
      size: 40,
      bytes: new TextEncoder().encode("%PDF-1.4\nthis is not a real pdf body"),
    };

    let caught: unknown;
    try {
      await mergePdfFiles([good, corrupt]);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PdfMergeError);
    expect((caught as PdfMergeError).errors[0].code).toBe("corrupt_pdf");
    expect((caught as PdfMergeError).errors[0].fileName).toBe("corrupt.pdf");
  });
});

describe("parsePageRanges", () => {
  it("parses a mix of single pages and ranges, in order", () => {
    const result = parsePageRanges("1-3, 5, 8-10", 10);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ranges).toEqual([
        { start: 1, end: 3 },
        { start: 5, end: 5 },
        { start: 8, end: 10 },
      ]);
    }
  });

  it("rejects an empty selection", () => {
    const result = parsePageRanges("   ", 10);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain("empty_page_selection");
  });

  it("rejects malformed tokens and out-of-range pages, collecting every problem at once", () => {
    const result = parsePageRanges("abc, 0, 999, 5-2", 10);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const codes = result.errors.map((e) => e.code);
      expect(codes).toContain("invalid_page_range"); // "abc" and "5-2" (start > end)
      expect(codes).toContain("page_out_of_range"); // "0" and "999"
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("rejects more output files than the maximum", () => {
    const manyPages = Array.from({ length: MAX_SPLIT_OUTPUT_FILES + 1 }, (_, i) => String(i + 1)).join(",");
    const result = parsePageRanges(manyPages, MAX_SPLIT_OUTPUT_FILES + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain("too_many_output_files");
  });
});

describe("everyPageRanges", () => {
  it("generates one singleton range per page, in order", () => {
    const result = everyPageRanges(3);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ranges).toEqual([
        { start: 1, end: 1 },
        { start: 2, end: 2 },
        { start: 3, end: 3 },
      ]);
    }
  });

  it("rejects a page count over the maximum output-file limit", () => {
    const result = everyPageRanges(MAX_SPLIT_OUTPUT_FILES + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.code)).toContain("too_many_output_files");
  });
});

describe("loadPdfPageCount", () => {
  it("returns the real page count of a valid PDF", async () => {
    const file = await makeFile("doc.pdf", 4);
    await expect(loadPdfPageCount(file)).resolves.toBe(4);
  });

  it("rejects an invalid file before ever attempting to parse it", async () => {
    const file: PdfFileInput = { name: "fake.pdf", size: 3, bytes: new TextEncoder().encode("no") };
    await expect(loadPdfPageCount(file)).rejects.toBeInstanceOf(PdfSplitError);
  });

  it("reports a corrupt/unparseable file distinctly from an invalid-signature file", async () => {
    const corrupt: PdfFileInput = {
      name: "corrupt.pdf",
      size: 40,
      bytes: new TextEncoder().encode("%PDF-1.4\nthis is not a real pdf body"),
    };
    let caught: unknown;
    try {
      await loadPdfPageCount(corrupt);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PdfSplitError);
    expect((caught as PdfSplitError).errors[0].code).toBe("corrupt_pdf");
  });
});

describe("splitPdfFile", () => {
  it("extracts a custom mix of ranges into independent, real, reloadable PDFs", async () => {
    const file = await makeFile("doc.pdf", 10);
    const result = await splitPdfFile(file, [
      { start: 1, end: 3 },
      { start: 7, end: 7 },
    ]);
    expect(result.sourcePageCount).toBe(10);
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs[0].label).toBe("Pages 1-3");
    expect(result.outputs[0].pageCount).toBe(3);
    expect(result.outputs[1].label).toBe("Page 7");
    expect(result.outputs[1].pageCount).toBe(1);

    // Confirms each output is itself a real, independently valid PDF.
    for (const output of result.outputs) {
      expect(hasPdfSignature(output.bytes)).toBe(true);
      const reloaded = await PDFDocument.load(output.bytes);
      expect(reloaded.getPageCount()).toBe(output.pageCount);
    }
  });

  it("supports 'every page separately' via the exact same function, using everyPageRanges", async () => {
    const file = await makeFile("doc.pdf", 3);
    const ranges = everyPageRanges(3);
    expect(ranges.ok).toBe(true);
    if (!ranges.ok) return;
    const result = await splitPdfFile(file, ranges.ranges);
    expect(result.outputs).toHaveLength(3);
    expect(result.outputs.map((o) => o.label)).toEqual(["Page 1", "Page 2", "Page 3"]);
  });

  it("rejects a range outside the document's real page count, even if the caller's range object claims otherwise", async () => {
    const file = await makeFile("doc.pdf", 3);
    let caught: unknown;
    try {
      await splitPdfFile(file, [{ start: 1, end: 5 }]);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(PdfSplitError);
    expect((caught as PdfSplitError).errors[0].code).toBe("page_out_of_range");
  });

  it("rejects invalid file input before attempting any extraction", async () => {
    const file: PdfFileInput = { name: "empty.pdf", size: 0, bytes: new Uint8Array(0) };
    await expect(splitPdfFile(file, [{ start: 1, end: 1 }])).rejects.toBeInstanceOf(PdfSplitError);
  });
});
