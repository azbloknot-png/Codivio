import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { LANGUAGES } from "../shared/i18n";
import {
  PAGE_SEO,
  TOOL_SEO,
  CANONICAL_DOMAIN,
  buildCanonicalUrl,
  buildTitle,
  robotsToString,
  findDuplicateTitles,
  findDuplicateDescriptions,
  findMissingMetadata,
  findLengthOutliers,
  type SeoEntityRef,
} from "../shared/seo";

/**
 * Phase 3.1 — SEO metadata foundation.
 *
 * One appropriate test per topic (route/tool inventory coverage, duplicate
 * detection, multilingual coverage, canonical/robots correctness), per the
 * project's testing rule.
 */

const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

// --- topic: route/tool inventory coverage ------------------------------------

describe("SEO metadata coverage matches the real route/tool inventory", () => {
  it("every one of the 34 real tools in the registry has a shared/seo/tools.ts entry, and vice versa", () => {
    const registryMatches = [...appSource.matchAll(/slug:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
    // The Tool[] registry is the only place this pattern appears with this
    // exact shape in App.tsx (blog posts/pages use different field names).
    expect(registryMatches.length).toBe(34);

    const seoSlugs = Object.keys(TOOL_SEO).sort();
    expect(seoSlugs).toEqual([...registryMatches].sort());
  });

  it("all 11 real static public pages have a shared/seo/pages.ts entry with the correct path", () => {
    const expected: Record<string, string> = {
      home: "/",
      tools: "/tools",
      blog: "/blog",
      faq: "/faq",
      about: "/about",
      contact: "/contact",
      privacy: "/privacy",
      terms: "/terms",
      cookies: "/cookies",
      pricing: "/pricing",
      sitemap: "/sitemap",
    };
    expect(Object.keys(PAGE_SEO).sort()).toEqual(Object.keys(expected).sort());
    for (const [key, path] of Object.entries(expected)) {
      expect(PAGE_SEO[key as keyof typeof PAGE_SEO].path).toBe(path);
    }
  });
});

// --- topic: duplicate detection ----------------------------------------------

describe("no duplicate SEO titles/descriptions across pages and tools", () => {
  function allRefs(): SeoEntityRef[] {
    return [
      ...Object.entries(PAGE_SEO).map(([key, entity]) => ({ key: `page:${key}`, entity })),
      ...Object.entries(TOOL_SEO).map(([key, entity]) => ({ key: `tool:${key}`, entity })),
    ];
  }

  it("every language has zero duplicate titles and zero duplicate descriptions across all 45 entities", () => {
    const refs = allRefs();
    for (const lang of LANGUAGES) {
      expect(findDuplicateTitles(refs, lang), `duplicate titles in ${lang}`).toEqual([]);
      expect(findDuplicateDescriptions(refs, lang), `duplicate descriptions in ${lang}`).toEqual([]);
    }
  });

  it("no rendered title (with the ' | Codivio' suffix) or description falls outside the conventional length guidance (Phase 3.2 audit)", () => {
    const refs: SeoEntityRef[] = [
      ...Object.entries(PAGE_SEO).map(([key, entity]) => ({ key: `page:${key}`, entity })),
      ...Object.entries(TOOL_SEO).map(([key, entity]) => ({ key: `tool:${key}`, entity })),
    ];
    expect(findLengthOutliers(refs, LANGUAGES)).toEqual([]);
  });

  it("the three legal pages (privacy/terms/cookies) no longer share one identical meta description (the pre-Phase-3.1 bug)", () => {
    const descriptions = new Set([
      PAGE_SEO.privacy.localized.en.description,
      PAGE_SEO.terms.localized.en.description,
      PAGE_SEO.cookies.localized.en.description,
    ]);
    expect(descriptions.size).toBe(3);
    for (const description of descriptions) {
      expect(description).not.toBe("Information about using Codivio and its services.");
    }
  });
});

// --- topic: multilingual coverage --------------------------------------------

describe("full AZ/TR/EN metadata coverage, not mechanical translation", () => {
  function allRefs(): SeoEntityRef[] {
    return [
      ...Object.entries(PAGE_SEO).map(([key, entity]) => ({ key: `page:${key}`, entity })),
      ...Object.entries(TOOL_SEO).map(([key, entity]) => ({ key: `tool:${key}`, entity })),
    ];
  }

  it("every page and tool has a non-empty title and description in all 3 languages", () => {
    expect(findMissingMetadata(allRefs(), LANGUAGES)).toEqual([]);
  });

  it("AZ/TR/EN copy is genuinely distinct per entity (not the same string copy-pasted across languages)", () => {
    for (const { key, entity } of allRefs()) {
      const { az, tr, en } = entity.localized;
      expect(az.title, `${key} az/en title should differ`).not.toBe(en.title);
      expect(tr.title, `${key} tr/en title should differ`).not.toBe(en.title);
      expect(az.description, `${key} az/en description should differ`).not.toBe(en.description);
      expect(tr.description, `${key} tr/en description should differ`).not.toBe(en.description);
    }
  });
});

// --- topic: canonical/robots correctness -------------------------------------

describe("canonical URLs and robots directives", () => {
  it("buildCanonicalUrl always uses the real production domain, never the Worker hostname", () => {
    expect(CANONICAL_DOMAIN).toBe("https://codivio.online");
    expect(buildCanonicalUrl("/")).toBe("https://codivio.online/");
    expect(buildCanonicalUrl("/tools/qr-code-generator")).toBe("https://codivio.online/tools/qr-code-generator");
    expect(buildCanonicalUrl("/faq")).not.toContain("workers.dev");
  });

  it("buildTitle appends the site suffix exactly once", () => {
    expect(buildTitle("FAQ")).toBe("FAQ | Codivio");
  });

  it("every placeholder tool page is noindex,follow (no real functionality yet — see shared/seo/tools.ts)", () => {
    // Phase 4.9 SEO follow-up: qr-code-generator/qr-code-scanner shipped
    // real functionality and are the one deliberate exception — checked
    // separately below, not looped over here.
    const liveSlugs = new Set(["qr-code-generator", "qr-code-scanner"]);
    for (const [slug, entity] of Object.entries(TOOL_SEO)) {
      if (liveSlugs.has(slug)) continue;
      expect(robotsToString(entity.robots), slug).toBe("noindex,follow");
    }
  });

  it("the 2 tools with real functionality (qr-code-generator, qr-code-scanner) are index,follow", () => {
    expect(robotsToString(TOOL_SEO["qr-code-generator"].robots)).toBe("index,follow");
    expect(robotsToString(TOOL_SEO["qr-code-scanner"].robots)).toBe("index,follow");
  });

  it("every static public page is index,follow (all are real, functioning pages)", () => {
    for (const [key, entity] of Object.entries(PAGE_SEO)) {
      expect(robotsToString(entity.robots), key).toBe("index,follow");
    }
  });

  it("ToolPage.tsx still renders the placeholder for every non-live tool, confirming their noindex decision is still accurate", () => {
    const toolPageSource = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
    expect(toolPageSource).toContain("Tool coming soon");
  });

  it("NotFoundPage and CMS pages wire robots overrides through usePageMeta (structural check)", () => {
    expect(appSource).toContain("usePageMeta(title, message, { robots: ROBOTS_NOINDEX_NOFOLLOW });");
    expect(appSource).toContain("robots: page.isIndexable ? undefined : ROBOTS_NOINDEX_NOFOLLOW");
  });
});

// --- topic: technical SEO files (robots.txt/sitemap.xml) --------------------

describe("technical SEO files", () => {
  it("robots.txt and llms.txt reference the correct domain (regression guard for the codovio.online typo)", () => {
    const robotsTxt = fs.readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");
    const llmsTxt = fs.readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8");
    expect(robotsTxt).toContain("https://codivio.online/sitemap.xml");
    expect(robotsTxt).not.toContain("codovio");
    expect(llmsTxt).not.toContain("Codovio");
    expect(llmsTxt).not.toContain("codovio.online");
  });

  it("sitemap.xml lists all 11 real static pages plus the 2 live tool pages, and no noindex tool URL", () => {
    const sitemap = fs.readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
    const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBe(13);
    // No duplicate URLs anywhere in the file.
    expect(new Set(locs).size).toBe(locs.length);
    // Phase 3.18: /sitemap (the HTML Site Map page) is now included — every
    // PAGE_SEO path, with no exceptions, must appear here.
    for (const [key, entity] of Object.entries(PAGE_SEO)) {
      expect(locs, key).toContain(buildCanonicalUrl(entity.path));
    }
    // Phase 4.9 SEO follow-up: exactly the 2 tools that flipped to
    // index,follow in shared/seo/tools.ts are listed here — no other tool
    // URL should ever appear while it's still noindex.
    expect(locs).toContain(buildCanonicalUrl("/tools/qr-code-generator"));
    expect(locs).toContain(buildCanonicalUrl("/tools/qr-code-scanner"));
    const toolLocs = locs.filter((loc) => loc.includes("/tools/") && loc !== buildCanonicalUrl("/tools"));
    expect(toolLocs.sort()).toEqual(
      [buildCanonicalUrl("/tools/qr-code-generator"), buildCanonicalUrl("/tools/qr-code-scanner")].sort()
    );
  });
});
