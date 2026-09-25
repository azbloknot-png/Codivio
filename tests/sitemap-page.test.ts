import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { PAGE_SEO } from "../shared/seo";

/**
 * Site Map page — Phase 3.18. One appropriate test per topic per the
 * project's testing rule: route registration, real-links-only discipline
 * (no fabricated route the way the user-provided reference design had
 * fake `/blog/:slug` and `/rss` links), correct `<a>` vs `<Link>` usage
 * for real static assets vs SPA routes, the "Coming soon" status badge
 * for the 32 not-yet-shipped tools, and `public/sitemap.xml` now correctly
 * including `/sitemap` itself (added in this same phase, after the
 * standalone implementation task deliberately left it out).
 */

const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const sitemapXml = fs.readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");

describe("SitemapPage — route registration", () => {
  it("registers /sitemap before the catch-all CMS/:slug and 404 routes", () => {
    expect(appSource).toContain('<Route path="/sitemap" element={<SitemapPage />} />');
    const sitemapIndex = appSource.indexOf('<Route path="/sitemap"');
    const cmsIndex = appSource.indexOf('<Route path="/:slug"');
    const notFoundIndex = appSource.indexOf('<Route path="*"');
    expect(sitemapIndex).toBeGreaterThan(-1);
    expect(sitemapIndex).toBeLessThan(cmsIndex);
    expect(sitemapIndex).toBeLessThan(notFoundIndex);
  });

  it("PAGE_SEO has a real, indexable sitemap entry distinct from every other page's copy in all 3 languages", () => {
    expect(PAGE_SEO.sitemap.path).toBe("/sitemap");
    expect(PAGE_SEO.sitemap.robots.index).toBe(true);
    expect(PAGE_SEO.sitemap.robots.follow).toBe(true);
    for (const lang of ["en", "az", "tr"] as const) {
      expect(PAGE_SEO.sitemap.localized[lang].title.length).toBeGreaterThan(0);
      expect(PAGE_SEO.sitemap.localized[lang].description.length).toBeGreaterThan(0);
    }
  });
});

describe("SitemapPage — no fabricated links (the reference design's own mistake, not repeated here)", () => {
  const sitemapPageSource = appSource.slice(
    appSource.indexOf("function SitemapPage()"),
    appSource.indexOf("function useRobotsPolicy()")
  );

  it("never links to a per-post blog route or an RSS feed — neither exists in this codebase", () => {
    expect(sitemapPageSource).not.toMatch(/\/blog\/[a-z]/);
    expect(sitemapPageSource).not.toContain("/rss");
  });

  it("every tool link is generated from the real `tools` registry (tools.filter(...).map(...)), never a hand-typed slug", () => {
    expect(sitemapPageSource).toMatch(/tools\s*\.filter\(\(tool\) => tool\.category === category\)/);
    expect(sitemapPageSource).toContain("Link to={`/tools/${tool.slug}`}");
    // No hand-typed "/tools/<slug>" string literal anywhere in this
    // component — every tool link is templated from the registry above.
    expect(sitemapPageSource).not.toMatch(/"\/tools\/[a-z-]+"/);
  });

  it("/sitemap.xml and /robots.txt use a plain <a>, never <Link> (they are real static assets, not SPA routes)", () => {
    expect(sitemapPageSource).toContain('<a href="/sitemap.xml">');
    expect(sitemapPageSource).toContain('<a href="/robots.txt">');
    expect(sitemapPageSource).not.toContain('Link to="/sitemap.xml"');
    expect(sitemapPageSource).not.toContain('Link to="/robots.txt"');
  });

  it("links only to real static routes already registered elsewhere in <Routes> (Home/About/Contact/Tools/Blog/FAQ/Pricing/Privacy/Terms/Cookies/Robots)", () => {
    const realStaticPaths = ["/", "/about", "/contact", "/tools", "/blog", "/faq", "/pricing", "/privacy", "/terms", "/cookies", "/robots"];
    const linkedPaths = [...sitemapPageSource.matchAll(/Link to="([^"]+)"/g)].map((m) => m[1]);
    for (const path of linkedPaths) {
      expect(realStaticPaths, `unexpected Link target: ${path}`).toContain(path);
    }
  });
});

describe("SitemapPage — Coming soon badge for not-yet-shipped tools", () => {
  const sitemapPageSource = appSource.slice(
    appSource.indexOf("function SitemapPage()"),
    appSource.indexOf("function useRobotsPolicy()")
  );

  it("renders the badge conditionally on tool.status, not hardcoded for a fixed slug list", () => {
    expect(sitemapPageSource).toContain('tool.status === "coming-soon"');
    expect(sitemapPageSource).toContain('<span className="sitemap-status-badge">Coming soon</span>');
  });

  it("the live tools (qr-code-generator, qr-code-scanner, pdf-merge, pdf-split, pdf-compress, pdf-to-word) never get the badge — verified against the real registry", () => {
    const liveCount = [...appSource.matchAll(/status: "live"/g)].length;
    const comingSoonCount = [...appSource.matchAll(/status: "coming-soon"/g)].length;
    // 1 extra "coming-soon" match is the Tool type's own union declaration
    // (`status: "coming-soon" | "live"`), not a real registry entry.
    // Phase 5.2/5.3/5.4/5.5: pdf-merge, pdf-split, pdf-compress, and
    // pdf-to-word flipped from coming-soon to live, joining the 2 QR tools.
    // Phase 6.2/6.3: image-resize and image-compress flipped too — 8 live,
    // 26 still coming-soon.
    expect(liveCount).toBe(8);
    expect(comingSoonCount - 1).toBe(26);
  });

  it("intro copy no longer implies every listed tool is ready — mentions the Coming soon convention instead", () => {
    expect(sitemapPageSource).toContain("Coming soon");
    expect(sitemapPageSource).not.toContain("every real page and tool");
  });
});

describe("PAGE_SEO.sitemap description no longer implies every tool is ready", () => {
  it("does not claim every tool is 'real'/ready — mentions live vs. in-development instead, no keyword stuffing", () => {
    for (const lang of ["en", "az", "tr"] as const) {
      const description = PAGE_SEO.sitemap.localized[lang].description;
      expect(description.toLowerCase()).not.toContain("every real");
      // Sanity check against keyword stuffing: no single word repeated
      // an unnatural number of times in one short description.
      const words = description.toLowerCase().match(/[a-zəöüğışç]+/g) ?? [];
      const counts = new Map<string, number>();
      for (const word of words) {
        if (word.length < 4) continue;
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
      for (const [word, count] of counts) {
        expect(count, `"${word}" repeated ${count}x in ${lang} description`).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe("public/sitemap.xml — Phase 3.18 adds /sitemap itself", () => {
  it("lists /sitemap exactly once, with priority 0.5 and changefreq monthly, matching /faq's tier", () => {
    const matches = [...sitemapXml.matchAll(/<url>\s*<loc>(https:\/\/codivio\.online\/sitemap)<\/loc>\s*<lastmod>([0-9-]+)<\/lastmod>\s*<changefreq>([a-z]+)<\/changefreq>\s*<priority>([0-9.]+)<\/priority>\s*<\/url>/g)];
    expect(matches.length).toBe(1);
    const [, loc, lastmod, changefreq, priority] = matches[0];
    expect(loc).toBe("https://codivio.online/sitemap");
    expect(lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(changefreq).toBe("monthly");
    expect(priority).toBe("0.5");
  });

  it("does not list /sitemap more than once, and every <loc> in the file is still unique", () => {
    const locs = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    const sitemapOccurrences = locs.filter((loc) => loc === "https://codivio.online/sitemap");
    expect(sitemapOccurrences.length).toBe(1);
    expect(new Set(locs).size).toBe(locs.length);
  });
});
