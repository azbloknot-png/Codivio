import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 6.5 — structural checks for the Background Remover tool UI,
 * mirroring tests/image-converter-tool.test.ts's exact pattern. No
 * component-testing setup (jsdom/@testing-library/react) exists in this
 * project — these are real, source-level regression guards for the
 * lazy-loading boundary, the privacy/network boundary, and the Phase 6.5
 * scope-honesty requirement (must disclose person/subject-only scope,
 * never claim universal object removal). Functional removeBackground
 * behavior itself is already covered by tests/background-remover-engine.test.ts
 * and is not re-tested here.
 */

const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
const toolSource = fs.readFileSync(new URL("../src/tools/BackgroundRemoverTool.tsx", import.meta.url), "utf8");
const engineSource = fs.readFileSync(new URL("../src/lib/background-remover-engine.ts", import.meta.url), "utf8");

describe("Background Remover lazy-loading boundary (bundle-impact regression guard)", () => {
  it("ToolPage.tsx loads BackgroundRemoverTool via a dynamic import, not a static one", () => {
    expect(toolPageSource).toContain('lazy(() => import("../tools/BackgroundRemoverTool"))');
    expect(toolPageSource).not.toMatch(/^import BackgroundRemoverTool from/m);
  });

  it("the real tool UI renders only for the background-remover slug, never for any other tool", () => {
    expect(toolPageSource).toContain("tool-workspace background-remover-workspace");
    expect(toolPageSource).toContain("slug === BACKGROUND_REMOVER_SLUG");
    expect(toolPageSource).toContain('const BACKGROUND_REMOVER_SLUG = "background-remover";');
  });

  it("the placeholder markup for every other tool is unchanged (still renders 'Tool coming soon')", () => {
    expect(toolPageSource).toContain("Tool coming soon");
    expect(toolPageSource).toContain("tool-workspace-placeholder");
  });

  it("uses its own dedicated engine module, never the unrelated image-engine.ts file", () => {
    expect(toolSource).toContain('from "../lib/background-remover-engine"');
    expect(toolSource).not.toMatch(/from ["']\.\.\/lib\/image-engine["']/);
  });
});

describe("Background Remover privacy and network boundary", () => {
  it("never logs a file's name or content (no console.* call anywhere in the component or engine)", () => {
    expect(toolSource).not.toMatch(/console\.(log|info|warn|debug|error)/);
    expect(engineSource).not.toMatch(/console\.(log|info|warn|debug|error)/);
  });

  it("never fetches or uploads the user's own image bytes (no fetch/XHR call over `file`/`bytes` in the component)", () => {
    expect(toolSource).not.toMatch(/\bfetch\(|XMLHttpRequest/);
  });

  it("the engine's only network-capable calls are the disclosed, documented MediaPipe WASM/model URLs, not a generic upload endpoint", () => {
    expect(engineSource).not.toMatch(/env\.DB|R2Bucket|\/api\//);
    expect(engineSource).toContain("MEDIAPIPE_WASM_BASE_PATH");
    expect(engineSource).toContain("MEDIAPIPE_MODEL_URL");
  });

  it("honestly discloses that this tool is not fully offline, rather than claiming a blanket offline guarantee", () => {
    expect(engineSource).toMatch(/NOT FULLY OFFLINE/);
  });
});

describe("Background Remover required functionality and honest scope boundary (Phase 6.5)", () => {
  it("accepts exactly one real file via a real file input, restricted to the five supported formats (Phase 6.5 format expansion)", () => {
    expect(toolSource).toContain('type="file"');
    expect(toolSource).toContain('accept="image/jpeg,image/png,image/webp,image/svg+xml,application/pdf"');
    expect(toolSource).not.toMatch(/\n\s*multiple\s*\n/);
  });

  it("discloses the 5 MB maximum file size and the PDF first-page-only behavior in its own rendered copy", () => {
    expect(toolSource).toMatch(/maximum file size:\s*5\s*mb/i);
    expect(toolSource.toLowerCase()).toMatch(/pdf.{0,20}first page|first page.{0,20}pdf/);
  });

  it("shows the exact required error message for an oversized file, via the shared MAX_FILE_SIZE_BYTES constant", () => {
    expect(toolSource).toContain("MAX_FILE_SIZE_BYTES");
    expect(toolSource).toContain("File is too large. Maximum supported size is 5 MB.");
  });

  it("routes through exactly one shared engine call, never a bespoke per-tool inference path", () => {
    expect(toolSource).toContain("removeBackground(file, outputFormat)");
    expect(toolSource.match(/removeBackground\(/g) ?? []).toHaveLength(1);
  });

  it("offers only alpha-capable output formats (PNG/WebP), never JPEG", () => {
    expect(toolSource).toContain('<option value="png">PNG</option>');
    expect(toolSource).toContain('<option value="webp">WebP</option>');
    expect(toolSource).not.toMatch(/<option value="jpeg">/);
  });

  it("discloses the real person/subject-focused scope in its own rendered copy — never a universal-removal claim", () => {
    expect(toolSource.toLowerCase()).toMatch(/photos? of people|portrait|subject photos/);
    // Only bans an affirmative universal-removal claim — the component's own
    // honest disclaimer ("not a general tool for ... arbitrary objects")
    // legitimately contains the word "arbitrary", so a bare substring ban
    // would flag the disclosure itself (the same class of over-broad-regex
    // mistake already found and fixed in tests/image-resize-tool.test.ts and
    // tests/image-converter-tool.test.ts).
    expect(toolSource.toLowerCase()).not.toMatch(/works (on|with) any (image|photo|object)|removes? backgrounds? from any/);
  });

  it("never claims metadata/EXIF preservation anywhere in the component's actual rendered copy", () => {
    const codeOnly = toolSource.replace(/\/\*\*[\s\S]*?\*\//, "");
    expect(codeOnly).not.toMatch(/preserves?.{0,20}(metadata|exif)|(metadata|exif).{0,20}preserv/i);
  });

  it("never offers a quality/compression control (this operation has none)", () => {
    const codeOnly = toolSource.replace(/\/\*\*[\s\S]*?\*\//, "");
    expect(codeOnly).not.toMatch(/type="range"|quality/i);
  });

  it("downloads using the format the engine actually returned, via the shared download utility", () => {
    expect(toolSource).toContain('from "../lib/download-file"');
    expect(toolSource).toContain("downloadBytesAsFile(result.bytes");
  });

  it("never renders a result before a real removeBackground result exists (no fabricated success state)", () => {
    expect(toolSource).toMatch(/\{result && previewUrl && \(/);
  });

  it("never shows fake/animated progress — a single real busy state tied to the async call", () => {
    expect(toolSource).toContain("isProcessing");
    expect(toolSource).not.toMatch(/setInterval|progress\s*%|fakeProgress/i);
  });

  it("shows a distinct, visible error state for file problems and processing failures, never a silent failure", () => {
    expect(toolSource).toContain("fileErrors");
    expect(toolSource).toContain("processErrors");
    expect(toolSource.match(/role="alert"/g) ?? []).toHaveLength(2);
  });

  it("revokes its own preview object URL, never leaking it across selections or unmounts", () => {
    expect(toolSource).toContain("URL.revokeObjectURL");
    expect(toolSource).toContain("useEffect");
  });
});

describe("Background Remover analytics wiring (Phase 3.21 generic tool-lifecycle events)", () => {
  it("imports and calls the same generic wrappers every other real tool uses", () => {
    expect(toolSource).toContain(
      'import { trackToolStart, trackToolComplete, trackDownload } from "../lib/tool-analytics";',
    );
    expect(toolSource).toContain("trackToolStart(TOOL_SLUG)");
    expect(toolSource).toContain("trackToolComplete(TOOL_SLUG)");
    expect(toolSource).toContain("trackDownload(TOOL_SLUG, result.format)");
  });
});

describe("Phase 6.5 registry activation", () => {
  it("background-remover is live", () => {
    const entryStart = appSource.indexOf('slug: "background-remover"');
    expect(entryStart).toBeGreaterThan(-1);
    const entryBlock = appSource.slice(entryStart, entryStart + 200);
    expect(entryBlock).toContain('status: "live"');
  });
});
