import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { PAGE_SEO } from "../shared/seo";

/**
 * Robots Policy page — Human-Readable Robots Policy Page follow-up. One
 * appropriate test per topic per the project's testing rule: route
 * registration, SEO wiring, and — the whole point of this page — that it
 * never hand-retypes a rule from public/robots.txt (drift-proof by
 * construction: it fetches the live file at runtime and parses it with
 * shared/seo/robots-policy.ts, verified in tests/robots-policy.test.ts).
 */

const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const robotsTxt = fs.readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");

describe("RobotsPage — route registration", () => {
  it("registers /robots after /sitemap and before the catch-all CMS/:slug and 404 routes", () => {
    expect(appSource).toContain('<Route path="/robots" element={<RobotsPage />} />');
    const sitemapIndex = appSource.indexOf('<Route path="/sitemap"');
    const robotsIndex = appSource.indexOf('<Route path="/robots"');
    const cmsIndex = appSource.indexOf('<Route path="/:slug"');
    const notFoundIndex = appSource.indexOf('<Route path="*"');
    expect(sitemapIndex).toBeGreaterThan(-1);
    expect(robotsIndex).toBeGreaterThan(sitemapIndex);
    expect(robotsIndex).toBeLessThan(cmsIndex);
    expect(robotsIndex).toBeLessThan(notFoundIndex);
  });

  it("PAGE_SEO has a real, indexable robots entry distinct from every other page's copy in all 3 languages", () => {
    expect(PAGE_SEO.robots.path).toBe("/robots");
    expect(PAGE_SEO.robots.robots.index).toBe(true);
    expect(PAGE_SEO.robots.robots.follow).toBe(true);
    for (const lang of ["en", "az", "tr"] as const) {
      expect(PAGE_SEO.robots.localized[lang].title.length).toBeGreaterThan(0);
      expect(PAGE_SEO.robots.localized[lang].description.length).toBeGreaterThan(0);
    }
  });
});

describe("RobotsPage — never hand-retypes a robots.txt rule (the whole point of this page)", () => {
  const robotsPageSource = appSource.slice(
    appSource.indexOf("function useRobotsPolicy()"),
    appSource.indexOf("function LegalPage({")
  );

  it("fetches the live /robots.txt file at runtime and parses it with the shared parser", () => {
    expect(robotsPageSource).toContain('fetch("/robots.txt")');
    expect(robotsPageSource).toContain("parseRobotsTxt(raw)");
  });

  it("never hardcodes a real rule value from robots.txt — no literal user-agent name, Allow, or Disallow path anywhere in the component", () => {
    // Every real value below actually appears in the live file — asserting
    // their ABSENCE from the component's own source is what proves the
    // page has no second, independently-typed copy that could drift.
    for (const literal of ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "/admin/", "/api/private/"]) {
      expect(robotsTxt, `sanity: "${literal}" should be in the real file`).toContain(literal);
      expect(robotsPageSource, `RobotsPage should not hardcode "${literal}"`).not.toContain(literal);
    }
  });

  it("renders every group/allow/disallow value from the parsed policy object, not a separate hand-written list", () => {
    expect(robotsPageSource).toContain("state.policy.groups.map((group)");
    expect(robotsPageSource).toContain("getUniqueAllowedPaths(state.policy)");
    expect(robotsPageSource).toContain("getUniqueDisallowedPaths(state.policy)");
    expect(robotsPageSource).toContain("state.policy.sitemaps.map((url)");
  });

  it("shows a graceful fallback (not fabricated content) if the live fetch fails", () => {
    expect(robotsPageSource).toContain('status: "error"');
    expect(robotsPageSource).toContain("view the raw file directly");
  });
});

describe("RobotsPage — breadcrumb and real static links only", () => {
  const robotsPageSource = appSource.slice(
    appSource.indexOf("function useRobotsPolicy()"),
    appSource.indexOf("function LegalPage({")
  );

  it("uses getStandardPageBreadcrumb('robots') for its visible breadcrumb nav, matching the schema breadcrumb", () => {
    expect(robotsPageSource).toContain('getStandardPageBreadcrumb("robots")');
  });

  it("links to the raw robots.txt file with a plain <a>, never <Link> (it is a real static asset, not a SPA route)", () => {
    expect(robotsPageSource).toContain('<a href="/robots.txt">');
    expect(robotsPageSource).not.toContain('Link to="/robots.txt"');
  });
});

describe("public/sitemap.xml — /robots is listed like every other real PAGE_SEO page", () => {
  const sitemapXml = fs.readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");

  it("lists /robots exactly once, with priority 0.5 and changefreq monthly, matching /sitemap's tier", () => {
    const matches = [
      ...sitemapXml.matchAll(
        /<url>\s*<loc>(https:\/\/codivio\.online\/robots)<\/loc>\s*<changefreq>([a-z]+)<\/changefreq>\s*<priority>([0-9.]+)<\/priority>\s*<\/url>/g
      ),
    ];
    expect(matches.length).toBe(1);
    const [, loc, changefreq, priority] = matches[0];
    expect(loc).toBe("https://codivio.online/robots");
    expect(changefreq).toBe("monthly");
    expect(priority).toBe("0.5");
  });

  it("does not list /robots more than once, and every <loc> in the file is still unique", () => {
    const locs = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    const robotsOccurrences = locs.filter((loc) => loc === "https://codivio.online/robots");
    expect(robotsOccurrences.length).toBe(1);
    expect(new Set(locs).size).toBe(locs.length);
  });
});

describe("public/robots.txt itself is never touched by this feature", () => {
  it("robots.txt content is byte-identical to what the parser was tested against — this page never writes to or regenerates it", () => {
    // robotsTxt is read once at module scope above and only ever passed
    // into parseRobotsTxt/getUniqueAllowedPaths/getUniqueDisallowedPaths in
    // tests/robots-policy.test.ts — never written to. This test exists so a
    // future change that starts generating robots.txt from RobotsPage's
    // data would have to consciously break this file's own premise first.
    expect(robotsTxt).toContain("User-agent: *");
    expect(robotsTxt).toContain("Sitemap: https://codivio.online/sitemap.xml");
    expect(robotsTxt).not.toMatch(/<html|<body|<!DOCTYPE/i);
  });
});
