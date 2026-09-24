import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 5.4 — structural checks for the PDF Compress tool UI, mirroring
 * tests/pdf-split-tool.test.ts's exact pattern. No component-testing setup
 * (jsdom/@testing-library/react) exists in this project — these are real,
 * source-level regression guards for the lazy-loading boundary and the
 * "never log file content/names" rule. Functional compress behavior itself
 * is already covered by tests/pdf-engine.test.ts and is not re-tested here.
 */

const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const compressToolSource = fs.readFileSync(new URL("../src/tools/PdfCompressTool.tsx", import.meta.url), "utf8");

describe("PDF Compress lazy-loading boundary (bundle-impact regression guard)", () => {
  it("ToolPage.tsx loads PdfCompressTool via a dynamic import, not a static one", () => {
    expect(toolPageSource).toContain('lazy(() => import("../tools/PdfCompressTool"))');
    expect(toolPageSource).not.toMatch(/^import PdfCompressTool from/m);
  });

  it("the real compress UI renders only for the pdf-compress slug, never for any other tool", () => {
    expect(toolPageSource).toContain("tool-workspace pdf-compress-workspace");
    expect(toolPageSource).toContain("slug === PDF_COMPRESS_SLUG");
    expect(toolPageSource).toContain('const PDF_COMPRESS_SLUG = "pdf-compress";');
  });

  it("the placeholder markup for every other tool is unchanged (still renders 'Tool coming soon')", () => {
    expect(toolPageSource).toContain("Tool coming soon");
    expect(toolPageSource).toContain("tool-workspace-placeholder");
  });
});

describe("PDF Compress privacy and architecture rules", () => {
  it("never logs a file's name or content (no console.* call anywhere in the component)", () => {
    expect(compressToolSource).not.toMatch(/console\.(log|info|warn|debug|error)/);
  });

  it("reuses the shared Phase 5.2/5.3/5.4 engine rather than re-implementing PDF compression", () => {
    expect(compressToolSource).toContain('from "../lib/pdf-engine"');
    expect(compressToolSource).not.toContain('from "pdf-lib"');
  });

  it("only src/lib/pdf-engine.ts imports the pdf-lib package directly", () => {
    expect(compressToolSource).not.toMatch(/from ["']pdf-lib["']/);
  });

  it("reuses the shared, centralized file validation rather than a bespoke per-tool check", () => {
    expect(compressToolSource).toContain('from "../../shared/pdf"');
    expect(compressToolSource).toContain("validatePdfFile");
  });

  it("reuses the shared file-size formatter rather than a duplicated one", () => {
    expect(compressToolSource).toContain('from "../lib/format"');
    expect(compressToolSource).not.toMatch(/function formatFileSize/);
  });
});

describe("PDF Compress required functionality (Phase 5.4 scope)", () => {
  it("accepts exactly one real PDF file via a real file input", () => {
    expect(compressToolSource).toContain('type="file"');
    expect(compressToolSource).toContain('accept="application/pdf"');
    expect(compressToolSource).not.toMatch(/\n\s*multiple\s*\n/);
  });

  it("routes through exactly one shared engine call, never a bespoke per-tool compression path", () => {
    expect(compressToolSource).toContain("compressPdfFile(file)");
    expect(compressToolSource.match(/compressPdfFile\(/g) ?? []).toHaveLength(1);
  });

  it("shows the real original file size before compressing, never a fabricated one", () => {
    expect(compressToolSource).toContain("formatFileSize(file.size)");
  });

  it("shows a percentage only when the engine reports a genuine reduction, and an honest message otherwise", () => {
    expect(compressToolSource).toContain("result.reduced");
    expect(compressToolSource).toContain("reductionPercent");
    expect(compressToolSource).toContain("already efficiently compressed");
    // The percentage must be computed from the real reported sizes, never a
    // hardcoded or promised number anywhere in the component.
    expect(compressToolSource).not.toMatch(/\b\d{1,3}%\s*(smaller|reduction|compression)/i);
  });

  it("offers a real download of whichever bytes the engine returned — compressed or original — never a fabricated ZIP/second dependency", () => {
    expect(compressToolSource).toContain('from "../lib/download-file"');
    expect(compressToolSource).toContain("downloadBytesAsFile(result.bytes");
    expect(compressToolSource).toContain('"application/pdf"');
    expect(compressToolSource).not.toMatch(/from ["'][^"']*zip[^"']*["']/i);
  });

  it("never renders a result before a real compress result exists (no fabricated success state)", () => {
    expect(compressToolSource).toMatch(/\{result && \(/);
  });

  it("never shows fake/animated progress — a single real busy state tied to the async call", () => {
    expect(compressToolSource).toContain("isCompressing");
    expect(compressToolSource).toContain("disabled={isCompressing}");
    expect(compressToolSource).not.toMatch(/setInterval|progress\s*%|fakeProgress/i);
  });

  it("shows a distinct, visible error state for file problems and compress failures, never a silent failure", () => {
    expect(compressToolSource).toContain("fileErrors");
    expect(compressToolSource).toContain("compressErrors");
    expect(compressToolSource.match(/role="alert"/g) ?? []).toHaveLength(2);
  });
});

describe("PDF Compress analytics wiring (Phase 3.21 generic tool-lifecycle events)", () => {
  it("imports and calls the same generic wrappers every other real tool uses", () => {
    expect(compressToolSource).toContain(
      'import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";',
    );
    expect(compressToolSource).toContain("trackToolStart(TOOL_SLUG)");
    expect(compressToolSource).toContain("trackToolComplete(TOOL_SLUG)");
    expect(compressToolSource).toContain('trackDownload(TOOL_SLUG, "pdf")');
  });
});
