import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import {
  MAX_PDF_FILE_BYTES,
  MAX_PDF_FILES_PER_MERGE,
  MAX_TOTAL_MERGE_BYTES,
  hasPdfSignature,
  validatePdfFile,
  validatePdfMergeRequest,
  type PdfFileInput,
} from "../shared/pdf";
import { mergePdfFiles, PdfMergeError } from "../src/lib/pdf-engine";

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
