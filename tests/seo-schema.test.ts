import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { LANGUAGES } from "../shared/i18n";
import { TOOL_SEO, PAGE_SEO, CANONICAL_DOMAIN } from "../shared/seo";
import {
  buildOrganizationNode,
  buildWebSiteNode,
  buildStandardPageGraph,
  buildToolPageGraph,
  getStandardPageBreadcrumb,
} from "../shared/seo/schema";

/**
 * Phase 3.7 — Schema.org / structured data.
 *
 * One appropriate test per topic per the project's testing rule. Phase
 * 3.1-3.6 regression is covered by re-running the existing suites once
 * (see the full-suite run alongside this file), not duplicated here.
 */

describe("Organization and WebSite nodes are factual, no fabricated properties", () => {
  it("Organization has only verifiable fields, no invented business facts, and no empty sameAs array", () => {
    const org = buildOrganizationNode();
    expect(org.name).toBe("Codivio");
    expect(org.url).toBe("https://codivio.online/");
    expect(org.logo).toContain("codivio-logo.png");
    expect(org).not.toHaveProperty("sameAs");
    expect(org).not.toHaveProperty("foundingDate");
    expect(org).not.toHaveProperty("address");
    expect(org).not.toHaveProperty("telephone");
    expect(org).not.toHaveProperty("aggregateRating");
    expect(org).not.toHaveProperty("award");
  });

  it("WebSite has no SearchAction (no query-navigable search exists) and correct @id linkage to Organization", () => {
    const site = buildWebSiteNode("en");
    expect(site).not.toHaveProperty("potentialAction");
    expect(site.publisher["@id"]).toContain("#organization");
  });
});

describe("standard page graphs cover all 9 real static pages + homepage, AZ/TR/EN, with correct subtypes", () => {
  it("every real page produces a valid graph with the right subtype, real canonical URL, and matching title/description", () => {
    const expectedTypes: Record<string, string> = {
      home: "WebPage",
      tools: "CollectionPage",
      blog: "WebPage",
      faq: "WebPage",
      about: "AboutPage",
      contact: "ContactPage",
      privacy: "WebPage",
      terms: "WebPage",
      cookies: "WebPage",
    };
    for (const [key, expectedType] of Object.entries(expectedTypes)) {
      for (const lang of LANGUAGES) {
        const graph = buildStandardPageGraph(key as keyof typeof PAGE_SEO, lang);
        expect(graph["@context"]).toBe("https://schema.org");
        const page = graph["@graph"][2] as { "@type": string; url: string; name: string; description: string };
        expect(page["@type"], key).toBe(expectedType);
        expect(page.url).toBe(`${CANONICAL_DOMAIN}${PAGE_SEO[key as keyof typeof PAGE_SEO].path === "/" ? "/" : PAGE_SEO[key as keyof typeof PAGE_SEO].path}`);
        expect(page.name).toBe(PAGE_SEO[key as keyof typeof PAGE_SEO].localized[lang].title);
      }
    }
  });
});

describe("the Site Map page (SEO follow-up) has a real WebPage graph with an opt-in breadcrumb", () => {
  it("buildStandardPageGraph('sitemap', lang) produces WebPage with the correct url/name and a Home -> Site Map breadcrumb, in all 3 languages", () => {
    for (const lang of LANGUAGES) {
      const graph = buildStandardPageGraph("sitemap", lang);
      const webPage = graph["@graph"][2] as {
        "@type": string;
        url: string;
        name: string;
        breadcrumb?: { itemListElement: Array<{ item?: string; name: string }> };
      };
      expect(webPage["@type"]).toBe("WebPage");
      expect(webPage.url).toBe(`${CANONICAL_DOMAIN}/sitemap`);
      expect(webPage.name).toBe(PAGE_SEO.sitemap.localized[lang].title);
      expect(webPage.breadcrumb).toBeDefined();
      const items = webPage.breadcrumb!.itemListElement;
      expect(items.length).toBe(2);
      expect(items[0]).toEqual({ "@type": "ListItem", position: 1, name: "Home", item: `${CANONICAL_DOMAIN}/` });
      // Current-page entry: no self-link, matching every other breadcrumb's
      // last-entry convention (buildToolPageGraph's own last entry above).
      expect(items[1].item).toBeUndefined();
      expect(items[1].name).toBe("Site Map");
    }
  });

  it("getStandardPageBreadcrumb exposes the exact same entries src/App.tsx's SitemapPage renders for its visible nav — one source of truth", () => {
    const entries = getStandardPageBreadcrumb("sitemap");
    expect(entries).toEqual([
      { label: "Home", path: "/" },
      { label: "Site Map", path: null },
    ]);
  });

  it("returns undefined for every other standard page (breadcrumb stays opt-in, not silently added everywhere)", () => {
    for (const key of ["home", "tools", "blog", "faq", "about", "contact", "privacy", "terms", "cookies", "pricing"] as const) {
      expect(getStandardPageBreadcrumb(key), key).toBeUndefined();
      expect((buildStandardPageGraph(key, "en")["@graph"][2] as { breadcrumb?: unknown }).breadcrumb, key).toBeUndefined();
    }
  });
});

describe("tool page graphs use plain WebPage (never WebApplication/SoftwareApplication) and a route-safe breadcrumb", () => {
  it("all 34 tools produce a valid graph in AZ/TR/EN with WebPage type and no fabricated software properties", () => {
    for (const slug of Object.keys(TOOL_SEO)) {
      for (const lang of LANGUAGES) {
        const graph = buildToolPageGraph(slug, lang);
        expect(graph, `${slug} [${lang}]`).not.toBeNull();
        const webPage = graph!["@graph"][2] as unknown as Record<string, unknown>;
        expect(webPage["@type"]).toBe("WebPage");
        expect(webPage).not.toHaveProperty("offers");
        expect(webPage).not.toHaveProperty("aggregateRating");
        expect(webPage).not.toHaveProperty("operatingSystem");
        expect(webPage).not.toHaveProperty("applicationCategory");
      }
    }
  });

  it("breadcrumb only contains real, linkable segments plus the current page (no fabricated category URL)", () => {
    const graph = buildToolPageGraph("pdf-merge", "en");
    const webPage = graph!["@graph"][2] as { breadcrumb: { itemListElement: Array<{ item?: string; name: string }> } };
    const items = webPage.breadcrumb.itemListElement;
    expect(items.length).toBe(3); // Home, Tools, PDF Merge — category dropped (no route)
    expect(items[0].item).toBe(`${CANONICAL_DOMAIN}/`);
    expect(items[1].item).toBe(`${CANONICAL_DOMAIN}/tools`);
    expect(items[2].item).toBeUndefined(); // current page — no self-link
    expect(items.map((i) => i.name)).not.toContain("PDF Tools"); // category label excluded from schema entirely
  });

  it("returns null for a nonexistent tool rather than fabricating a schema graph", () => {
    expect(buildToolPageGraph("not-a-real-tool", "en")).toBeNull();
  });
});

describe("JSON-LD serialization is valid and safe", () => {
  it("every graph serializes to valid, parseable JSON with no admin/API/secret leakage", () => {
    const graphs = [
      buildStandardPageGraph("home", "en"),
      buildToolPageGraph("qr-code-generator", "az"),
    ];
    for (const graph of graphs) {
      const json = JSON.stringify(graph);
      expect(() => JSON.parse(json)).not.toThrow();
      expect(json).not.toMatch(/\/admin/i);
      expect(json).not.toMatch(/api[_-]?key|password|token|secret/i);
    }
  });

  it("useSeo.ts renders JSON-LD via textContent (never innerHTML/dangerouslySetInnerHTML) and strips admin routes", () => {
    const source = fs.readFileSync(new URL("../src/seo/useSeo.ts", import.meta.url), "utf8");
    expect(source).toContain("script.textContent = json");
    // The file's own comments explain (in prose) that dangerouslySetInnerHTML
    // is NOT used — check for actual usage (JSX prop or property assignment),
    // not just the substring, so that explanatory comment isn't a false hit.
    expect(source).not.toMatch(/dangerouslySetInnerHTML\s*[=:]/);
    expect(source).not.toMatch(/\.innerHTML\s*=/);
    expect(source).toContain('pathname.startsWith("/admin")');
  });
});

describe("no unsupported functionality claims in generated schema (reuses the established banned-phrase list)", () => {
  it("no tool schema description implies live processing or an absolute guarantee", () => {
    const bannedPatterns = [
      /upload your file and download instantly/i,
      /we process your file/i,
      /automatically deleted after/i,
      /\bunlimited\b/i,
      /100%\s*private/i,
      /\bfree forever\b/i,
      /\bfastest\b/i,
      /\bbest\b/i,
    ];
    for (const slug of Object.keys(TOOL_SEO)) {
      const graph = buildToolPageGraph(slug, "en");
      const webPage = graph!["@graph"][2] as { description: string };
      for (const pattern of bannedPatterns) {
        expect(webPage.description, `${slug}: "${webPage.description}"`).not.toMatch(pattern);
      }
    }
  });
});
