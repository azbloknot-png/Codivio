import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 5.5 — structural checks for the PDF to Word tool UI, mirroring
 * tests/pdf-compress-tool.test.ts's exact pattern. No component-testing
 * setup (jsdom/@testing-library/react) exists in this project — these are
 * real, source-level regression guards. Functional conversion behavior
 * itself is already covered by tests/pdf-to-word-engine.test.ts and is not
 * re-tested here.
 */

const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const toolSource = fs.readFileSync(new URL("../src/tools/PdfToWordTool.tsx", import.meta.url), "utf8");
const engineSource = fs.readFileSync(new URL("../src/lib/pdf-to-word-engine.ts", import.meta.url), "utf8");
const pdfEngineSource = fs.readFileSync(new URL("../src/lib/pdf-engine.ts", import.meta.url), "utf8");

describe("PDF to Word lazy-loading boundary (bundle-impact regression guard)", () => {
  it("ToolPage.tsx loads PdfToWordTool via a dynamic import, not a static one", () => {
    expect(toolPageSource).toContain('lazy(() => import("../tools/PdfToWordTool"))');
    expect(toolPageSource).not.toMatch(/^import PdfToWordTool from/m);
  });

  it("the real tool UI renders only for the pdf-to-word slug, never for any other tool", () => {
    expect(toolPageSource).toContain("tool-workspace pdf-to-word-workspace");
    expect(toolPageSource).toContain("slug === PDF_TO_WORD_SLUG");
    expect(toolPageSource).toContain('const PDF_TO_WORD_SLUG = "pdf-to-word";');
  });

  it("the placeholder markup for every other tool is unchanged (still renders 'Tool coming soon')", () => {
    expect(toolPageSource).toContain("Tool coming soon");
    expect(toolPageSource).toContain("tool-workspace-placeholder");
  });
});

describe("PDF to Word / pdf-lib isolation (approved scope requirement)", () => {
  it("PdfToWordTool.tsx and its engine never import pdf-lib", () => {
    expect(toolSource).not.toMatch(/from ["']pdf-lib["']/);
    expect(engineSource).not.toMatch(/from ["']pdf-lib["']/);
  });

  it("src/lib/pdf-engine.ts (Merge/Split/Compress) never imports pdfjs-dist or docx", () => {
    expect(pdfEngineSource).not.toMatch(/from ["']pdfjs-dist/);
    expect(pdfEngineSource).not.toMatch(/from ["']docx["']/);
  });

  it("PdfToWordTool.tsx never imports pdfjs-dist/docx directly — only through the dedicated engine", () => {
    expect(toolSource).not.toMatch(/from ["']pdfjs-dist/);
    expect(toolSource).not.toMatch(/from ["']docx["']/);
    expect(toolSource).toContain('from "../lib/pdf-to-word-engine"');
  });
});

describe("PDF to Word privacy and architecture rules", () => {
  it("never logs a file's name or content (no console.* call anywhere in the component)", () => {
    expect(toolSource).not.toMatch(/console\.(log|info|warn|debug|error)/);
  });

  it("reuses the shared, centralized file validation rather than a bespoke per-tool check", () => {
    expect(toolSource).toContain('from "../../shared/pdf"');
    expect(toolSource).toContain("validatePdfFile");
  });

  it("reuses the shared file-size formatter and download utility rather than duplicating them", () => {
    expect(toolSource).toContain('from "../lib/format"');
    expect(toolSource).toContain('from "../lib/download-file"');
    expect(toolSource).not.toMatch(/function formatFileSize/);
  });
});

describe("PDF to Word honest product scope (Phase 5.5 approved constraints)", () => {
  it("routes through exactly one shared engine call, never a bespoke per-tool conversion path", () => {
    expect(toolSource).toContain("convertPdfToWord(file)");
    expect(toolSource.match(/convertPdfToWord\(/g) ?? []).toHaveLength(1);
  });

  it("UI copy honestly describes text extraction, never affirmatively claims layout/table/image preservation or OCR support", () => {
    expect(toolSource).toContain("Extract text from a PDF into an editable Word document");
    // Checks specifically for an AFFIRMATIVE capability claim (e.g. "preserves
    // layout", "supports OCR") — the component's own honest doc comment
    // legitimately says "never claims exact layout, table, or image
    // preservation" as a disclosure, which must not trip this check.
    expect(toolSource.toLowerCase()).not.toMatch(
      /\b(preserves|supports|guarantees) (exact layout|tables?|images?|ocr|bold\/italic|full font)/,
    );
    expect(toolSource.toLowerCase()).not.toMatch(/guaranteed (accura|conversion)/);
  });

  it("never generates or offers a fake/empty success for a scanned PDF — a distinct, honest refusal state exists", () => {
    expect(toolSource).toContain("noExtractableText");
    expect(toolSource).toContain("no_extractable_text");
    // The download button only ever renders inside the real `result` block,
    // never inside the noExtractableText block.
    const scannedBlock = toolSource.slice(toolSource.indexOf("{noExtractableText &&"), toolSource.indexOf("{result &&"));
    expect(scannedBlock).not.toContain("handleDownload");
  });

  it("never shows fake/animated progress — a single real busy state tied to the async call", () => {
    expect(toolSource).toContain("isConverting");
    expect(toolSource).toContain("disabled={isConverting}");
    expect(toolSource).not.toMatch(/setInterval|progress\s*%|fakeProgress/i);
  });

  it("shows a distinct, visible error state for file problems and conversion failures, never a silent failure", () => {
    expect(toolSource).toContain("fileErrors");
    expect(toolSource).toContain("conversionErrors");
    expect(toolSource.match(/role="alert"/g) ?? []).toHaveLength(3);
  });

  it("engine never implements table or embedded-image reconstruction, or OCR — only honestly discloses their absence", () => {
    // The engine legitimately mentions "OCR" twice, both as an honest
    // disclosure that it is NOT supported (a required part of the approved
    // scope) — this checks that OCR is never claimed as something the tool
    // DOES, and that no image-embedding API (docx's ImageRun) is used at all.
    expect(engineSource.toLowerCase()).not.toMatch(/\b(performs|does|supports|provides) ocr\b/);
    expect(engineSource).not.toMatch(/ImageRun/);
  });
});

describe("PDF to Word analytics wiring (Phase 3.21 generic tool-lifecycle events)", () => {
  it("imports and calls the same generic wrappers every other real tool uses, with the real docx format", () => {
    expect(toolSource).toContain(
      'import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";',
    );
    expect(toolSource).toContain("trackToolStart(TOOL_SLUG)");
    expect(toolSource).toContain("trackToolComplete(TOOL_SLUG)");
    expect(toolSource).toContain('trackDownload(TOOL_SLUG, "docx")');
  });
});
