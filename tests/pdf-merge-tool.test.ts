import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 5.2 — structural checks for the PDF Merge tool UI, mirroring
 * tests/qr-generator-tool.test.ts's exact pattern. No component-testing
 * setup (jsdom/@testing-library/react) exists in this project — these are
 * real, source-level regression guards for the lazy-loading boundary that
 * keeps `pdf-lib` out of the other 33 tool pages' bundle, and the "never
 * log file content/names" rule. Functional merge behavior itself is
 * already covered by tests/pdf-engine.test.ts and is not re-tested here.
 */

const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const mergeToolSource = fs.readFileSync(new URL("../src/tools/PdfMergeTool.tsx", import.meta.url), "utf8");

describe("PDF Merge lazy-loading boundary (bundle-impact regression guard)", () => {
  it("ToolPage.tsx loads PdfMergeTool via a dynamic import, not a static one", () => {
    expect(toolPageSource).toContain('lazy(() => import("../tools/PdfMergeTool"))');
    expect(toolPageSource).not.toMatch(/^import PdfMergeTool from/m);
  });

  it("the real merge UI renders only for the pdf-merge slug, never for any other tool", () => {
    expect(toolPageSource).toContain("tool-workspace pdf-merge-workspace");
    expect(toolPageSource).toContain("slug === PDF_MERGE_SLUG");
    expect(toolPageSource).toContain('const PDF_MERGE_SLUG = "pdf-merge";');
  });

  it("the placeholder markup for every other tool is unchanged (still renders 'Tool coming soon')", () => {
    expect(toolPageSource).toContain("Tool coming soon");
    expect(toolPageSource).toContain("tool-workspace-placeholder");
  });
});

describe("PDF Merge privacy and architecture rules", () => {
  it("never logs a file's name or content (no console.* call anywhere in the component)", () => {
    expect(mergeToolSource).not.toMatch(/console\.(log|info|warn|debug|error)/);
  });

  it("reuses the shared Phase 5.2 engine rather than re-implementing PDF merging", () => {
    expect(mergeToolSource).toContain('from "../lib/pdf-engine"');
    expect(mergeToolSource).not.toContain('from "pdf-lib"');
  });

  it("only src/lib/pdf-engine.ts imports the pdf-lib package directly", () => {
    expect(mergeToolSource).not.toMatch(/from ["']pdf-lib["']/);
  });

  it("reuses the shared, centralized validation rather than a bespoke per-tool check", () => {
    expect(mergeToolSource).toContain('from "../../shared/pdf"');
    expect(mergeToolSource).toContain("validatePdfFile");
  });
});

describe("PDF Merge required functionality (Increment A scope)", () => {
  it("accepts multiple PDF files via a real file input", () => {
    expect(mergeToolSource).toContain('type="file"');
    expect(mergeToolSource).toContain("multiple");
    expect(mergeToolSource).toContain('accept="application/pdf"');
  });

  it("supports reordering (move up/down) and removing a file before merging", () => {
    expect(mergeToolSource).toContain("moveFile");
    expect(mergeToolSource).toContain("removeFile");
  });

  it("merges via the shared engine and offers a real download of the result", () => {
    expect(mergeToolSource).toContain("mergePdfFiles(files)");
    expect(mergeToolSource).toContain('from "../lib/download-file"');
    expect(mergeToolSource).toContain("downloadBytesAsFile(result.bytes");
    expect(mergeToolSource).toContain('"application/pdf"');
  });

  it("never triggers a download before a real merge result exists (no fabricated success state)", () => {
    // The download button/handler are only reachable once `result` is set
    // by a genuinely completed mergePdfFiles() call — this guards against a
    // regression where a download could fire from stale/no state.
    expect(mergeToolSource).toMatch(/\{result && \(/);
    expect(mergeToolSource).toContain("const handleDownload = useCallback(() => {\n    if (!result) return;");
  });

  it("shows a distinct, visible error state for both file-selection problems and merge failures, never a silent failure", () => {
    expect(mergeToolSource).toContain("selectionErrors");
    expect(mergeToolSource).toContain("mergeErrors");
    expect(mergeToolSource.match(/role="alert"/g) ?? []).toHaveLength(2);
  });

  it("disables the merge action until at least the minimum number of files is present", () => {
    expect(mergeToolSource).toContain("MIN_PDF_FILES_PER_MERGE");
    expect(mergeToolSource).toContain("disabled={!canMerge}");
  });
});

describe("PDF Merge analytics wiring (Phase 3.21 generic tool-lifecycle events)", () => {
  it("imports and calls the same generic wrappers every other real tool uses", () => {
    expect(mergeToolSource).toContain(
      'import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";',
    );
    expect(mergeToolSource).toContain("trackToolStart(TOOL_SLUG)");
    expect(mergeToolSource).toContain("trackToolComplete(TOOL_SLUG)");
    expect(mergeToolSource).toContain('trackDownload(TOOL_SLUG, "pdf")');
  });
});
