import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { LANGUAGES } from "../shared/i18n";
import { TRANSLATIONS } from "../shared/i18n";
import { TOOL_SEO } from "../shared/seo";
import { getAllLinkableToolSlugs, getRelatedToolLinks, getToolBreadcrumb, isLinkableRoute } from "../shared/seo/internal-links";
import { getContentBlueprint } from "../shared/seo/content";

/**
 * Phase 3.13 — SEO content expansion + topical authority.
 *
 * One appropriate test per topic. Bundle-size regression is covered by the
 * updated tests/technical-seo-3.8.test.ts (not duplicated here); Phase 3.4's
 * own content-quality/banned-phrase checks live in tests/seo-content.test.ts
 * and are not repeated here either.
 */

describe("related-tool links rendered on a tool page are self-link-free and duplicate-free for every real tool", () => {
  it("no tool's related-links list contains a link back to itself or a duplicate path, in any supported language", () => {
    for (const slug of getAllLinkableToolSlugs()) {
      for (const lang of LANGUAGES) {
        const links = getRelatedToolLinks(slug, lang);
        const paths = links.map((link) => link.path);
        expect(paths, `${slug} [${lang}] should not link to itself`).not.toContain(`/tools/${slug}`);
        expect(new Set(paths).size, `${slug} [${lang}] should have no duplicate related-link paths`).toBe(paths.length);
      }
    }
  });
});

describe("every link a tool page can render resolves to a real, existing route", () => {
  it("every related-tool link and every linkable breadcrumb entry passes isLinkableRoute for all 34 tools", () => {
    for (const slug of getAllLinkableToolSlugs()) {
      for (const lang of LANGUAGES) {
        for (const link of getRelatedToolLinks(slug, lang)) {
          expect(link.path, `${slug} [${lang}] related link`).not.toBeNull();
          expect(isLinkableRoute(link.path as string), `${slug} [${lang}] related link ${link.path}`).toBe(true);
        }
        const crumbs = getToolBreadcrumb(slug, lang);
        expect(crumbs, `${slug} [${lang}] should have a breadcrumb`).not.toBeNull();
        for (const crumb of crumbs ?? []) {
          if (crumb.path !== null) {
            expect(isLinkableRoute(crumb.path), `${slug} [${lang}] breadcrumb ${crumb.path}`).toBe(true);
          }
        }
      }
    }
  });
});

describe("visible breadcrumb and JSON-LD breadcrumb share the same source data", () => {
  it("ToolPage.tsx imports getToolBreadcrumb from the same module schema.ts uses for BreadcrumbList, so they can never disagree", () => {
    const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
    const schemaSource = fs.readFileSync(new URL("../shared/seo/schema.ts", import.meta.url), "utf8");
    expect(toolPageSource).toContain("getToolBreadcrumb");
    expect(toolPageSource).toContain("from \"../../shared/seo/internal-links\"");
    expect(schemaSource).toContain("getToolBreadcrumb");
  });
});

describe("content is rendered for every real tool in every supported language", () => {
  it("getContentBlueprint returns a full blueprint (intro/benefits/steps/useCases/FAQ) for all 34 tools in AZ/TR/EN", () => {
    for (const slug of Object.keys(TOOL_SEO)) {
      for (const lang of LANGUAGES) {
        const blueprint = getContentBlueprint(slug, lang);
        expect(blueprint, `${slug} [${lang}]`).not.toBeNull();
        expect(blueprint!.introduction.length).toBeGreaterThan(0);
        expect(blueprint!.benefits.length).toBeGreaterThan(0);
        expect(blueprint!.howToSteps.length).toBeGreaterThan(0);
        expect(blueprint!.useCases.length).toBeGreaterThan(0);
        expect(blueprint!.faq.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("no FAQPage structured data was introduced for the newly-visible FAQ content", () => {
  it("schema.ts contains no FAQPage schema type anywhere (Phase 3.7 explicitly deferred it; visible FAQ is content, not a rich-result strategy)", () => {
    const schemaSource = fs.readFileSync(new URL("../shared/seo/schema.ts", import.meta.url), "utf8");
    expect(schemaSource).not.toMatch(/"@type"\s*:\s*"FAQPage"/);
  });
});

describe("new tool-page UI chrome strings are translated, not English-only fallbacks", () => {
  it("toolPage section headings exist and are non-empty for AZ/TR/EN, and are not byte-identical across all three languages", () => {
    for (const lang of LANGUAGES) {
      const toolPage = TRANSLATIONS[lang].toolPage;
      for (const [key, value] of Object.entries(toolPage)) {
        expect(value.length, `toolPage.${key} [${lang}]`).toBeGreaterThan(0);
      }
    }
    expect(TRANSLATIONS.az.toolPage.benefitsHeading).not.toBe(TRANSLATIONS.en.toolPage.benefitsHeading);
    expect(TRANSLATIONS.tr.toolPage.benefitsHeading).not.toBe(TRANSLATIONS.en.toolPage.benefitsHeading);
  });
});

describe("ToolPage is lazy-loaded so its content dataset does not inflate every route's bundle", () => {
  it("App.tsx imports ToolPage via React.lazy, not a static import", () => {
    const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    expect(appSource).toContain('const ToolPage = lazy(() => import("./pages/ToolPage"));');
    expect(appSource).not.toMatch(/^import ToolPage from ["']\.\/pages\/ToolPage["'];?$/m);
    expect(appSource).toContain("<Suspense");
  });
});
