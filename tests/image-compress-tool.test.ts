import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 6.3 — structural checks for the Image Compress tool UI, mirroring
 * tests/pdf-compress-tool.test.ts's and tests/image-resize-tool.test.ts's
 * exact pattern. No component-testing setup (jsdom/@testing-library/react)
 * exists in this project — these are real, source-level regression guards
 * for the lazy-loading boundary, the "never log file content/names" rule,
 * and the Phase 6.3 scope boundary (no format conversion, no resize
 * controls, no batch input). Functional compress behavior itself is already
 * covered by tests/image-engine.test.ts and is not re-tested here.
 */

const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const compressToolSource = fs.readFileSync(new URL("../src/tools/ImageCompressTool.tsx", import.meta.url), "utf8");

describe("Image Compress lazy-loading boundary (bundle-impact regression guard)", () => {
  it("ToolPage.tsx loads ImageCompressTool via a dynamic import, not a static one", () => {
    expect(toolPageSource).toContain('lazy(() => import("../tools/ImageCompressTool"))');
    expect(toolPageSource).not.toMatch(/^import ImageCompressTool from/m);
  });

  it("the real compress UI renders only for the image-compress slug, never for any other tool", () => {
    expect(toolPageSource).toContain("tool-workspace image-compress-workspace");
    expect(toolPageSource).toContain("slug === IMAGE_COMPRESS_SLUG");
    expect(toolPageSource).toContain('const IMAGE_COMPRESS_SLUG = "image-compress";');
  });

  it("the placeholder markup for every other tool is unchanged (still renders 'Tool coming soon')", () => {
    expect(toolPageSource).toContain("Tool coming soon");
    expect(toolPageSource).toContain("tool-workspace-placeholder");
  });
});

describe("Image Compress privacy and architecture rules", () => {
  it("never logs a file's name or content (no console.* call anywhere in the component)", () => {
    expect(compressToolSource).not.toMatch(/console\.(log|info|warn|debug|error)/);
  });

  it("reuses the shared Phase 6.2/6.3 engine rather than re-implementing image compression", () => {
    expect(compressToolSource).toContain('from "../lib/image-engine"');
  });

  it("never imports a browser Canvas/Image decode API directly — only src/lib/image-engine.ts may", () => {
    expect(compressToolSource).not.toMatch(/createImageBitmap|OffscreenCanvas/);
  });

  it("reuses the shared format-detection helper rather than a bespoke per-tool check", () => {
    expect(compressToolSource).toContain('from "../../shared/image/format"');
    expect(compressToolSource).toContain("detectImageFormat");
  });

  it("reuses the shared file-size formatter rather than a duplicated one", () => {
    expect(compressToolSource).toContain('from "../lib/format"');
    expect(compressToolSource).not.toMatch(/function formatFileSize/);
  });

  it("makes no network request of any kind (no fetch/XMLHttpRequest anywhere in the component)", () => {
    expect(compressToolSource).not.toMatch(/\bfetch\(|XMLHttpRequest/);
  });
});

describe("Image Compress required functionality and scope boundary (Phase 6.3)", () => {
  it("accepts exactly one real image file via a real file input, restricted to the three supported formats", () => {
    expect(compressToolSource).toContain('type="file"');
    expect(compressToolSource).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(compressToolSource).not.toMatch(/\n\s*multiple\s*\n/);
  });

  it("routes through exactly one shared engine call, never a bespoke per-tool compression path", () => {
    expect(compressToolSource).toContain("compressImage(file)");
    expect(compressToolSource.match(/compressImage\(/g) ?? []).toHaveLength(1);
  });

  it("never offers a resize (width/height) or format-conversion control", () => {
    expect(compressToolSource).not.toMatch(/id="image-compress-width"|id="image-compress-height"/);
    expect(compressToolSource).not.toMatch(/<select[^>]*format/i);
  });

  it("shows the real original file size before compressing, never a fabricated one", () => {
    expect(compressToolSource).toContain("formatFileSize(file.size)");
  });

  it("shows a percentage only when the engine reports a genuine reduction, and an honest message otherwise", () => {
    expect(compressToolSource).toContain("result.reduced");
    expect(compressToolSource).toContain("reductionPercent");
    expect(compressToolSource).toContain("already efficiently compressed");
    expect(compressToolSource).not.toMatch(/\b\d{1,3}%\s*(smaller|reduction|compression)/i);
  });

  it("downloads using the format the engine actually returned, via the shared download utility", () => {
    expect(compressToolSource).toContain('from "../lib/download-file"');
    expect(compressToolSource).toContain("downloadBytesAsFile(result.bytes");
    expect(compressToolSource).toContain("FORMAT_MIME_TYPES[result.format]");
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

describe("Image Compress analytics wiring (Phase 3.21 generic tool-lifecycle events)", () => {
  it("imports and calls the same generic wrappers every other real tool uses", () => {
    expect(compressToolSource).toContain(
      'import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";',
    );
    expect(compressToolSource).toContain("trackToolStart(TOOL_SLUG)");
    expect(compressToolSource).toContain("trackToolComplete(TOOL_SLUG)");
    expect(compressToolSource).toContain("trackDownload(TOOL_SLUG, result.format)");
  });
});
