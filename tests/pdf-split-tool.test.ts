import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 5.3 — structural checks for the PDF Split tool UI, mirroring
 * tests/pdf-merge-tool.test.ts's exact pattern. No component-testing setup
 * (jsdom/@testing-library/react) exists in this project — these are real,
 * source-level regression guards for the lazy-loading boundary and the
 * "never log file content/names" rule. Functional split behavior itself is
 * already covered by tests/pdf-engine.test.ts and is not re-tested here.
 */

const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const splitToolSource = fs.readFileSync(new URL("../src/tools/PdfSplitTool.tsx", import.meta.url), "utf8");

describe("PDF Split lazy-loading boundary (bundle-impact regression guard)", () => {
  it("ToolPage.tsx loads PdfSplitTool via a dynamic import, not a static one", () => {
    expect(toolPageSource).toContain('lazy(() => import("../tools/PdfSplitTool"))');
    expect(toolPageSource).not.toMatch(/^import PdfSplitTool from/m);
  });

  it("the real split UI renders only for the pdf-split slug, never for any other tool", () => {
    expect(toolPageSource).toContain("tool-workspace pdf-split-workspace");
    expect(toolPageSource).toContain("slug === PDF_SPLIT_SLUG");
    expect(toolPageSource).toContain('const PDF_SPLIT_SLUG = "pdf-split";');
  });

  it("the placeholder markup for every other tool is unchanged (still renders 'Tool coming soon')", () => {
    expect(toolPageSource).toContain("Tool coming soon");
    expect(toolPageSource).toContain("tool-workspace-placeholder");
  });
});

describe("PDF Split privacy and architecture rules", () => {
  it("never logs a file's name or content (no console.* call anywhere in the component)", () => {
    expect(splitToolSource).not.toMatch(/console\.(log|info|warn|debug|error)/);
  });

  it("reuses the shared Phase 5.2/5.3 engine rather than re-implementing PDF splitting", () => {
    expect(splitToolSource).toContain('from "../lib/pdf-engine"');
    expect(splitToolSource).not.toContain('from "pdf-lib"');
  });

  it("only src/lib/pdf-engine.ts imports the pdf-lib package directly", () => {
    expect(splitToolSource).not.toMatch(/from ["']pdf-lib["']/);
  });

  it("reuses the shared, centralized validation and range parsing rather than a bespoke per-tool check", () => {
    expect(splitToolSource).toContain('from "../../shared/pdf"');
    expect(splitToolSource).toContain("validatePdfFile");
    expect(splitToolSource).toContain("parsePageRanges");
    expect(splitToolSource).toContain("everyPageRanges");
  });

  it("reuses the shared file-size formatter rather than a duplicated one", () => {
    expect(splitToolSource).toContain('from "../lib/format"');
    expect(splitToolSource).not.toMatch(/function formatFileSize/);
  });
});

describe("PDF Split required functionality (Phase 5.3 scope)", () => {
  it("accepts exactly one real PDF file via a real file input (not multiple, unlike Merge)", () => {
    expect(splitToolSource).toContain('type="file"');
    expect(splitToolSource).toContain('accept="application/pdf"');
    // Checks the JSX boolean attribute specifically (its own line), not
    // just the word "multiple" anywhere — this file's own doc comment
    // legitimately talks about "multiple output files" in prose.
    expect(splitToolSource).not.toMatch(/\n\s*multiple\s*\n/);
  });

  it("determines the real page count before offering any split action", () => {
    expect(splitToolSource).toContain("loadPdfPageCount");
    expect(splitToolSource).toContain("pageCount");
  });

  it("supports both required modes — custom range and every page separately — via one shared engine call", () => {
    expect(splitToolSource).toContain('"range"');
    expect(splitToolSource).toContain('"everyPage"');
    expect(splitToolSource).toContain("splitPdfFile(file");
    // Exactly one call site for splitPdfFile — both modes route through it,
    // never two separate split code paths.
    expect(splitToolSource.match(/splitPdfFile\(/g) ?? []).toHaveLength(1);
  });

  it("offers a real download for every output file, plus a convenience download-all, never a fabricated ZIP dependency", () => {
    expect(splitToolSource).toContain('from "../lib/download-file"');
    expect(splitToolSource).toContain("downloadBytesAsFile(output.bytes");
    expect(splitToolSource).toContain('"application/pdf"');
    // No zip-library import — this file's own doc comment honestly explains
    // why (see the "No ZIP library was added" note), it doesn't ban the
    // word itself from that explanatory prose.
    expect(splitToolSource).not.toMatch(/from ["'][^"']*zip[^"']*["']/i);
    expect(splitToolSource).toContain("handleDownloadAll");
  });

  it("never renders a download or result before a real split result exists (no fabricated success state)", () => {
    expect(splitToolSource).toMatch(/\{result && \(/);
  });

  it("shows a distinct, visible error state for file problems and split failures, never a silent failure", () => {
    expect(splitToolSource).toContain("fileErrors");
    expect(splitToolSource).toContain("splitErrors");
    expect(splitToolSource.match(/role="alert"/g) ?? []).toHaveLength(2);
  });

  it("disables the split action while a split is in progress", () => {
    expect(splitToolSource).toContain("isSplitting");
    expect(splitToolSource).toContain("disabled={isSplitting}");
  });
});

describe("PDF Split analytics wiring (Phase 3.21 generic tool-lifecycle events)", () => {
  it("imports and calls the same generic wrappers every other real tool uses", () => {
    expect(splitToolSource).toContain(
      'import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";',
    );
    expect(splitToolSource).toContain("trackToolStart(TOOL_SLUG)");
    expect(splitToolSource).toContain("trackToolComplete(TOOL_SLUG)");
    expect(splitToolSource).toContain('trackDownload(TOOL_SLUG, "pdf")');
  });
});
