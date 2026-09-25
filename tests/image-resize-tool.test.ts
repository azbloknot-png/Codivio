import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 6.2 — structural checks for the Image Resize tool UI, mirroring
 * tests/pdf-compress-tool.test.ts's exact pattern. No component-testing
 * setup (jsdom/@testing-library/react) exists in this project — these are
 * real, source-level regression guards for the lazy-loading boundary, the
 * "never log file content/names" rule, and the Phase 6.2 scope boundary
 * (no format conversion, no compression control, no crop/rotate, no batch
 * input). Functional resize behavior itself is already covered by
 * tests/image-engine.test.ts and is not re-tested here.
 */

const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const resizeToolSource = fs.readFileSync(new URL("../src/tools/ImageResizeTool.tsx", import.meta.url), "utf8");

describe("Image Resize lazy-loading boundary (bundle-impact regression guard)", () => {
  it("ToolPage.tsx loads ImageResizeTool via a dynamic import, not a static one", () => {
    expect(toolPageSource).toContain('lazy(() => import("../tools/ImageResizeTool"))');
    expect(toolPageSource).not.toMatch(/^import ImageResizeTool from/m);
  });

  it("the real resize UI renders only for the image-resize slug, never for any other tool", () => {
    expect(toolPageSource).toContain("tool-workspace image-resize-workspace");
    expect(toolPageSource).toContain("slug === IMAGE_RESIZE_SLUG");
    expect(toolPageSource).toContain('const IMAGE_RESIZE_SLUG = "image-resize";');
  });

  it("the placeholder markup for every other tool is unchanged (still renders 'Tool coming soon')", () => {
    expect(toolPageSource).toContain("Tool coming soon");
    expect(toolPageSource).toContain("tool-workspace-placeholder");
  });
});

describe("Image Resize privacy and architecture rules", () => {
  it("never logs a file's name or content (no console.* call anywhere in the component)", () => {
    expect(resizeToolSource).not.toMatch(/console\.(log|info|warn|debug|error)/);
  });

  it("reuses the shared Phase 6.2 engine rather than re-implementing image resizing", () => {
    expect(resizeToolSource).toContain('from "../lib/image-engine"');
  });

  it("never imports a browser Canvas/Image decode API directly — only src/lib/image-engine.ts may", () => {
    expect(resizeToolSource).not.toMatch(/createImageBitmap|OffscreenCanvas/);
  });

  it("reuses the shared file-size formatter rather than a duplicated one", () => {
    expect(resizeToolSource).toContain('from "../lib/format"');
    expect(resizeToolSource).not.toMatch(/function formatFileSize/);
  });

  it("makes no network request of any kind (no fetch/XMLHttpRequest anywhere in the component)", () => {
    expect(resizeToolSource).not.toMatch(/\bfetch\(|XMLHttpRequest/);
  });
});

describe("Image Resize required functionality and scope boundary (Phase 6.2)", () => {
  it("accepts exactly one real image file via a real file input, restricted to the three supported formats", () => {
    expect(resizeToolSource).toContain('type="file"');
    expect(resizeToolSource).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(resizeToolSource).not.toMatch(/\n\s*multiple\s*\n/);
  });

  it("routes through exactly one shared engine call, never a bespoke per-tool resize path", () => {
    expect(resizeToolSource).toContain("resizeImage(file");
    expect(resizeToolSource.match(/resizeImage\(/g) ?? []).toHaveLength(1);
  });

  it("offers width, height, and an aspect-ratio lock control — no other image-editing control", () => {
    expect(resizeToolSource).toContain("image-resize-width");
    expect(resizeToolSource).toContain("image-resize-height");
    expect(resizeToolSource).toContain("lockAspectRatio");
    // Narrowed to actual interactive elements/ids, not the header comment's
    // own honest "no crop, no rotate" scope disclosure (which legitimately
    // contains these words) — the same class of over-broad-regex mistake
    // Phase 5.5 already found and fixed once in this codebase.
    expect(resizeToolSource).not.toMatch(/id="[^"]*(quality|crop|rotate)[^"]*"/i);
    expect(resizeToolSource).not.toMatch(/<input[^>]*type="range"/);
  });

  it("never offers a format-conversion control — output format is not user-selectable", () => {
    expect(resizeToolSource).not.toMatch(/<select[^>]*format/i);
    expect(resizeToolSource).not.toMatch(/convert.*format|format.*convert/i);
  });

  it("downloads using the format the engine actually returned, via the shared download utility", () => {
    expect(resizeToolSource).toContain('from "../lib/download-file"');
    expect(resizeToolSource).toContain("downloadBytesAsFile(result.bytes");
    expect(resizeToolSource).toContain("FORMAT_MIME_TYPES[result.format]");
  });

  it("never renders a result before a real resize result exists (no fabricated success state)", () => {
    expect(resizeToolSource).toMatch(/\{result && \(/);
  });

  it("never shows fake/animated progress — a single real busy state tied to the async call", () => {
    expect(resizeToolSource).toContain("isResizing");
    expect(resizeToolSource).toContain("disabled={!canResize}");
    expect(resizeToolSource).not.toMatch(/setInterval|progress\s*%|fakeProgress/i);
  });

  it("shows a distinct, visible error state for file problems and resize failures, never a silent failure", () => {
    expect(resizeToolSource).toContain("fileErrors");
    expect(resizeToolSource).toContain("resizeErrors");
    expect(resizeToolSource.match(/role="alert"/g) ?? []).toHaveLength(2);
  });
});

describe("Image Resize analytics wiring (Phase 3.21 generic tool-lifecycle events)", () => {
  it("imports and calls the same generic wrappers every other real tool uses", () => {
    expect(resizeToolSource).toContain(
      'import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";',
    );
    expect(resizeToolSource).toContain("trackToolStart(TOOL_SLUG)");
    expect(resizeToolSource).toContain("trackToolComplete(TOOL_SLUG)");
    expect(resizeToolSource).toContain("trackDownload(TOOL_SLUG, result.format)");
  });
});
