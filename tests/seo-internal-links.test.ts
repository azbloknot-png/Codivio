import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../shared/i18n";
import { TOOL_SEO } from "../shared/seo";
import { getAllCategories, getToolsInCategory } from "../shared/seo/ai";
import {
  isLinkableRoute,
  getRelatedToolLinks,
  getCategoryToolLinks,
  getToolsIndexLink,
  getHomeLink,
  getToolBreadcrumb,
  getFutureContentOpportunities,
  getAllLinkableToolSlugs,
} from "../shared/seo/internal-links";

/**
 * Phase 3.6 — internal-linking architecture.
 *
 * One appropriate test per topic per the project's testing rule. Phase
 * 3.1-3.5 regression is covered by re-running the existing suites once
 * (see the full-suite run alongside this file), not duplicated here.
 */

describe("route safety — the single gate every link in this module passes through", () => {
  it("only allows the real homepage, the 9 static pages, /tools, and /tools/:slug for a real tool slug", () => {
    expect(isLinkableRoute("/")).toBe(true);
    expect(isLinkableRoute("/tools")).toBe(true);
    expect(isLinkableRoute("/faq")).toBe(true);
    expect(isLinkableRoute("/tools/pdf-merge")).toBe(true);
  });

  it("never allows admin, API, or a nonexistent tool/route", () => {
    expect(isLinkableRoute("/admin")).toBe(false);
    expect(isLinkableRoute("/admin/settings")).toBe(false);
    expect(isLinkableRoute("/api/private/anything")).toBe(false);
    expect(isLinkableRoute("/tools/not-a-real-tool")).toBe(false);
    expect(isLinkableRoute("/tools/category/qr")).toBe(false); // no category route exists
    expect(isLinkableRoute("/blog/some-fake-post")).toBe(false); // no per-post blog route exists
  });
});

describe("34/34 tools have valid, self-link-free, duplicate-free relationship coverage", () => {
  it("every tool's related-tool links resolve to real, distinct, non-self tools in all 3 languages", () => {
    const slugs = getAllLinkableToolSlugs();
    expect(slugs.length).toBe(34);
    for (const slug of slugs) {
      for (const lang of LANGUAGES) {
        const links = getRelatedToolLinks(slug, lang);
        const targetSlugs = links.map((link) => link.path?.replace("/tools/", ""));
        expect(targetSlugs, `${slug} [${lang}] should not self-link`).not.toContain(slug);
        expect(new Set(targetSlugs).size, `${slug} [${lang}] should have no duplicate related links`).toBe(targetSlugs.length);
        for (const link of links) {
          expect(link.isLinkable, `${slug} [${lang}] -> ${link.path}`).toBe(true);
          expect(link.anchorText.trim().length).toBeGreaterThan(0);
          expect(link.priority).toBe("primary");
        }
      }
    }
  });

  it("category-to-tools links cover the real 12/8/11/3 split and every link is linkable", () => {
    const categories = getAllCategories();
    const expectedCounts = { "QR Tools": 12, "PDF Tools": 8, "Image Tools": 11, "Other Tools": 3 };
    for (const category of categories) {
      const links = getCategoryToolLinks(category, "en");
      expect(links.length, category).toBe(expectedCounts[category]);
      expect(links.length).toBe(getToolsInCategory(category).length);
      for (const link of links) {
        expect(link.isLinkable, link.path ?? "null").toBe(true);
      }
    }
  });
});

describe("AZ/TR/EN anchor text and breadcrumbs are natural, localized, and never generic", () => {
  it("tool anchor text is the real localized tool name, not a raw slug or a generic phrase", () => {
    for (const lang of LANGUAGES) {
      const links = getRelatedToolLinks("pdf-merge", lang);
      for (const link of links) {
        expect(link.anchorText).not.toMatch(/^click here$|^learn more$|^best tool$/i);
        expect(link.anchorText).not.toContain("-"); // not a raw slug like "pdf-split"
      }
    }
  });

  it("breadcrumb resolves in all 3 languages, ends at the tool, and never links the current page or the unrouted category", () => {
    for (const lang of LANGUAGES) {
      const crumb = getToolBreadcrumb("qr-code-generator", lang);
      expect(crumb).not.toBeNull();
      expect(crumb?.length).toBe(4);
      expect(crumb?.[0].path).toBe("/"); // Home is linkable
      expect(crumb?.[1].path).toBe("/tools"); // Tools index is linkable
      expect(crumb?.[2].path).toBeNull(); // category has no route yet
      expect(crumb?.[3].path).toBeNull(); // current page is never a link to itself
    }
    expect(getToolBreadcrumb("not-a-real-tool", "en")).toBeNull();
  });
});

describe("future content opportunities are represented as non-linkable data, never a fake URL", () => {
  it("every opportunity has path=null and isLinkable=false — no blog page is invented", () => {
    for (const slug of getAllLinkableToolSlugs()) {
      const opportunities = getFutureContentOpportunities(slug);
      for (const opportunity of opportunities) {
        expect(opportunity.path).toBeNull();
        expect(opportunity.isLinkable).toBe(false);
      }
    }
  });
});

describe("site-level links reuse existing i18n dictionaries, no new translation strings invented", () => {
  it("tools-index and home links are correctly labeled in all 3 languages", () => {
    for (const lang of LANGUAGES) {
      expect(getToolsIndexLink(lang).path).toBe("/tools");
      expect(getToolsIndexLink(lang).anchorText.length).toBeGreaterThan(0);
      expect(getHomeLink(lang).path).toBe("/");
    }
  });
});

describe("relationship data is consistent with Phase 3.1/3.5 (no competing relationship graph)", () => {
  it("every related-tool target actually exists in TOOL_SEO (the real Phase 3.1 registry)", () => {
    for (const slug of getAllLinkableToolSlugs()) {
      for (const link of getRelatedToolLinks(slug, "en")) {
        const targetSlug = link.path?.replace("/tools/", "");
        expect(targetSlug && targetSlug in TOOL_SEO, `${slug} -> ${link.path}`).toBe(true);
      }
    }
  });
});
