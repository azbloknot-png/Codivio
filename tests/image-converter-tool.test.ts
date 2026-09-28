import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 6.4 — structural checks for the Image Converter tool UI, mirroring
 * tests/image-resize-tool.test.ts's and tests/image-compress-tool.test.ts's
 * exact pattern. No component-testing setup (jsdom/@testing-library/react)
 * exists in this project — these are real, source-level regression guards
 * for the lazy-loading boundary, the "never log file content/names" rule,
 * and the Phase 6.4 scope boundary (no resize, no quality control, no
 * batch, no metadata-preservation claim). Functional convert behavior
 * itself is already covered by tests/image-engine.test.ts and is not
 * re-tested here.
 */

const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const converterToolSource = fs.readFileSync(new URL("../src/tools/ImageConverterTool.tsx", import.meta.url), "utf8");

describe("Image Converter lazy-loading boundary (bundle-impact regression guard)", () => {
  it("ToolPage.tsx loads ImageConverterTool via a dynamic import, not a static one", () => {
    expect(toolPageSource).toContain('lazy(() => import("../tools/ImageConverterTool"))');
    expect(toolPageSource).not.toMatch(/^import ImageConverterTool from/m);
  });

  it("the real converter UI renders only for the image-converter slug, never for any other tool", () => {
    expect(toolPageSource).toContain("tool-workspace image-converter-workspace");
    expect(toolPageSource).toContain("slug === IMAGE_CONVERTER_SLUG");
    expect(toolPageSource).toContain('const IMAGE_CONVERTER_SLUG = "image-converter";');
  });

  it("the placeholder markup for every other tool is unchanged (still renders 'Tool coming soon')", () => {
    expect(toolPageSource).toContain("Tool coming soon");
    expect(toolPageSource).toContain("tool-workspace-placeholder");
  });
});

describe("Image Converter privacy and architecture rules", () => {
  it("never logs a file's name or content (no console.* call anywhere in the component)", () => {
    expect(converterToolSource).not.toMatch(/console\.(log|info|warn|debug|error)/);
  });

  it("reuses the shared Phase 6.2/6.3/6.4 engine rather than re-implementing image conversion", () => {
    expect(converterToolSource).toContain('from "../lib/image-engine"');
  });

  it("never imports a browser Canvas/Image decode API directly — only src/lib/image-engine.ts may", () => {
    expect(converterToolSource).not.toMatch(/createImageBitmap|OffscreenCanvas/);
  });

  it("reuses the shared format-detection helper rather than a bespoke per-tool check", () => {
    expect(converterToolSource).toContain('from "../../shared/image/format"');
    expect(converterToolSource).toContain("detectImageFormat");
  });

  it("makes no network request of any kind (no fetch/XMLHttpRequest anywhere in the component)", () => {
    expect(converterToolSource).not.toMatch(/\bfetch\(|XMLHttpRequest/);
  });
});

describe("Image Converter required functionality and scope boundary (Phase 6.4)", () => {
  it("accepts exactly one real image file via a real file input, restricted to the three supported formats", () => {
    expect(converterToolSource).toContain('type="file"');
    expect(converterToolSource).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(converterToolSource).not.toMatch(/\n\s*multiple\s*\n/);
  });

  it("routes through exactly one shared engine call, never a bespoke per-tool conversion path", () => {
    expect(converterToolSource).toContain("convertImage(file, targetFormat)");
    expect(converterToolSource.match(/convertImage\(/g) ?? []).toHaveLength(1);
  });

  it("never offers the same source format as a conversion target (filtered, not just disabled)", () => {
    expect(converterToolSource).toContain("CONVERTIBLE_FORMATS.filter((format) => format !== sourceFormat)");
  });

  it("never offers resize (width/height) or compression-quality controls", () => {
    // Stripped of the component's own /** ... */ header comment, which
    // honestly disclaims both ("never a quality control...") — the same
    // class of over-broad-regex mistake this codebase already found and
    // fixed once (Phase 5.5, again in tests/image-resize-tool.test.ts).
    const codeOnly = converterToolSource.replace(/\/\*\*[\s\S]*?\*\//, "");
    expect(codeOnly).not.toMatch(/id="image-converter-width"|id="image-converter-height"/);
    expect(codeOnly).not.toMatch(/type="range"|quality/i);
  });

  it("discloses the real white-background compositing behavior for a JPG target, never silently", () => {
    expect(converterToolSource).toContain("shouldCompositeWhiteBackground");
    expect(converterToolSource).toMatch(/white background/i);
  });

  it("never claims metadata/EXIF preservation anywhere in the component's actual rendered copy", () => {
    // The component's own header comment honestly discloses the opposite
    // ("never a claim of metadata/EXIF preservation ... has none to
    // preserve") — stripped here for the same reason as the check above.
    const codeOnly = converterToolSource.replace(/\/\*\*[\s\S]*?\*\//, "");
    expect(codeOnly).not.toMatch(/preserves?.{0,20}(metadata|exif)|(metadata|exif).{0,20}preserv/i);
  });

  it("downloads using the format the engine actually returned, via the shared download utility", () => {
    expect(converterToolSource).toContain('from "../lib/download-file"');
    expect(converterToolSource).toContain("downloadBytesAsFile(result.bytes");
    expect(converterToolSource).toContain("FORMAT_MIME_TYPES[result.format]");
  });

  it("never renders a result before a real convert result exists (no fabricated success state)", () => {
    expect(converterToolSource).toMatch(/\{result && \(/);
  });

  it("never shows fake/animated progress — a single real busy state tied to the async call", () => {
    expect(converterToolSource).toContain("isConverting");
    expect(converterToolSource).not.toMatch(/setInterval|progress\s*%|fakeProgress/i);
  });

  it("shows a distinct, visible error state for file problems and convert failures, never a silent failure", () => {
    expect(converterToolSource).toContain("fileErrors");
    expect(converterToolSource).toContain("convertErrors");
    expect(converterToolSource.match(/role="alert"/g) ?? []).toHaveLength(2);
  });
});

describe("Image Converter analytics wiring (Phase 3.21 generic tool-lifecycle events)", () => {
  it("imports and calls the same generic wrappers every other real tool uses", () => {
    expect(converterToolSource).toContain(
      'import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";',
    );
    expect(converterToolSource).toContain("trackToolStart(TOOL_SLUG)");
    expect(converterToolSource).toContain("trackToolComplete(TOOL_SLUG)");
    expect(converterToolSource).toContain("trackDownload(TOOL_SLUG, result.format)");
  });
});

describe("Phase 6.4 registry activation scope (only image-converter, not its sibling converters)", () => {
  it("image-converter is live", () => {
    const entryStart = appSource.indexOf('slug: "image-converter"');
    const entryBlock = appSource.slice(entryStart, entryStart + 200);
    expect(entryBlock).toContain('status: "live"');
  });

  it("jpg-to-png, png-to-jpg, and webp-converter remain coming-soon — explicitly out of Phase 6.4's authorized scope", () => {
    for (const slug of ["jpg-to-png", "png-to-jpg", "webp-converter"]) {
      const entryStart = appSource.indexOf(`slug: "${slug}"`);
      expect(entryStart, slug).toBeGreaterThan(-1);
      const entryBlock = appSource.slice(entryStart, entryStart + 200);
      expect(entryBlock, slug).toContain('status: "coming-soon"');
    }
  });
});
