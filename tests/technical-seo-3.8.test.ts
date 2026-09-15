import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGES } from "../shared/i18n";
import { TOOL_SEO } from "../shared/seo";
import { getToolDisplayName } from "../shared/seo/ai";
import { buildToolPageGraph } from "../shared/seo/schema";

/**
 * Phase 3.8 — technical SEO + performance regression fix.
 *
 * One appropriate test per topic. The most important one here is the
 * build-artifact check: it inspects the ACTUAL shipped dist/ bundle (built
 * immediately before this test file was written) rather than just the
 * source-level call graph, so it proves the Phase 3.7 regression is fixed
 * in what ships, not just in theory.
 */

const DIST_CLIENT_DIR = fileURLToPath(new URL("../dist/client/assets/", import.meta.url));

/**
 * Phase 3.13 note: the build now intentionally produces TWO client JS
 * chunks, not one — src/pages/ToolPage.tsx is lazy-loaded (React.lazy) so
 * that Phase 3.4's ~1,400-line TOOL_CONTENT dataset, now genuinely
 * rendered on tool pages, ships in its own chunk instead of inflating
 * every other route's bundle. The "main" chunk is identified by containing
 * "application/ld+json" (emitted by src/seo/useSeo.ts, which every page
 * calls) — the lazy ToolPage chunk does not call usePageMeta itself.
 */
function readBuiltChunks(): { main: string; all: string[] } {
  const files = fs.readdirSync(DIST_CLIENT_DIR).filter((f) => f.endsWith(".js"));
  expect(files.length, "expected at least one client JS chunk").toBeGreaterThan(0);
  const contents = files.map((f) => fs.readFileSync(path.join(DIST_CLIENT_DIR, f), "utf8"));
  const mainIndex = contents.findIndex((c) => c.includes("application/ld+json"));
  expect(mainIndex, "expected exactly one chunk to be the main entry (containing the JSON-LD injector)").not.toBe(-1);
  return { main: contents[mainIndex], all: contents };
}

describe("Phase 3.7 bundle regression is actually fixed in the shipped build", () => {
  it("the main client chunk no longer contains Phase 3.4 content-blueprint text that has no business being in a lightweight schema/breadcrumb build", () => {
    const { main } = readBuiltChunks();
    // Distinctive phrases that only exist inside TOOL_CONTENT (Phase 3.4's
    // full 34-tool content blueprints) — if the dependency chain were still
    // pulling that dataset into the MAIN chunk, at least one of these would
    // appear literally in the minified output (string literals survive
    // minification). They are expected to exist in the separate, lazy
    // ToolPage chunk instead (Phase 3.13) — see the next test.
    const contentOnlyPhrases = [
      "Combine multiple PDF files into a single document online",
      "A QR code generator turns information like a link or text",
      "This tool is currently in development and does not yet process files",
    ];
    for (const phrase of contentOnlyPhrases) {
      expect(main, `main chunk should not contain: "${phrase}"`).not.toContain(phrase);
    }
  });

  it("the Phase 3.4 content-blueprint text DOES exist somewhere in the build (proves Phase 3.13's rendering shipped, this isn't a false negative from broken content)", () => {
    const { all } = readBuiltChunks();
    expect(all.some((chunk) => chunk.includes("A QR code generator turns information like a link or text"))).toBe(true);
  });

  it("the main client chunk still contains real Phase 3.1 tool titles used by schema/JSON-LD (proves schema still works, this isn't a false-negative from an empty/broken bundle)", () => {
    const { main } = readBuiltChunks();
    expect(main).toContain("PDF Merge");
    expect(main).toContain("application/ld+json");
  });
});

describe("lightweight tool-name lookup is correct for all 34 tools in AZ/TR/EN", () => {
  it("getToolDisplayName matches the real TOOL_SEO title (pre-suffix) for every tool and language, and is null for a fake slug", () => {
    for (const slug of Object.keys(TOOL_SEO)) {
      for (const lang of LANGUAGES) {
        const name = getToolDisplayName(slug, lang);
        const expectedPrefix = TOOL_SEO[slug].localized[lang].title.split("–")[0].trim();
        expect(name, `${slug} [${lang}]`).toBe(expectedPrefix);
      }
    }
    expect(getToolDisplayName("not-a-real-tool", "en")).toBeNull();
  });
});

describe("representative public page still produces correct schema after the refactor", () => {
  it("a tool page's JSON-LD graph still has the right name, a real meta-description-sourced description, and a working breadcrumb", () => {
    const graph = buildToolPageGraph("pdf-merge", "en")!;
    const webPage = graph["@graph"][2] as { name: string; description: string; breadcrumb: { itemListElement: unknown[] } };
    expect(webPage.name).toBe("PDF Merge");
    expect(webPage.description).toBe(TOOL_SEO["pdf-merge"].localized.en.description);
    expect(webPage.breadcrumb.itemListElement.length).toBe(3);
  });
});

describe("CSP is unchanged and remains compatible with JSON-LD (no unsafe-inline added)", () => {
  it("worker/security-headers.ts still uses strict script-src 'self' with no unsafe-inline, and JSON-LD uses a non-executable script type CSP doesn't restrict", () => {
    const headersSource = fs.readFileSync(new URL("../worker/security-headers.ts", import.meta.url), "utf8");
    expect(headersSource).toContain("script-src 'self'");
    // The file's own comment explains (correctly) that 'unsafe-inline' is
    // NOT needed — check the actual CSP directive string doesn't grant it,
    // not the literal substring (which the explanatory comment contains).
    expect(headersSource).not.toMatch(/script-src[^;]*unsafe-inline/);
    const useSeoSource = fs.readFileSync(new URL("../src/seo/useSeo.ts", import.meta.url), "utf8");
    expect(useSeoSource).toContain('script.type = "application/ld+json"');
  });
});

describe("Phase 2.15 carousel CSS is unaffected by this phase's changes", () => {
  it("the desktop/tablet/mobile card-width calc rules are still present", () => {
    const css = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
    expect(css).toContain("calc((100% - 48px) / 4)");
    expect(css).toContain("calc((100% - 16px) / 2)");
  });
});
