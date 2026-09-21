import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * XML Sitemap XSLT visual layer — Phase 3.18 follow-up.
 *
 * public/sitemap.xml gets a <?xml-stylesheet?> processing instruction so a
 * browser opening it directly renders a Codivio-branded HTML view via
 * public/sitemap.xsl + public/sitemap.css, while search engines keep
 * reading the exact same <urlset>/<url> XML as before. These tests guard
 * the two things that would silently break this: the sitemap's own XML
 * staying schema-valid and URL-complete, and the XSLT/CSS files staying
 * free of anything (inline <style>, external CDN, <script>) that the
 * site's CSP (worker/security-headers.ts's `style-src 'self'`, no
 * `'unsafe-inline'`) would silently block from rendering.
 */

const sitemapXml = fs.readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
const sitemapXsl = fs.readFileSync(new URL("../public/sitemap.xsl", import.meta.url), "utf8");
const sitemapCss = fs.readFileSync(new URL("../public/sitemap.css", import.meta.url), "utf8");

describe("public/sitemap.xml — XSLT stylesheet reference", () => {
  it("declares the xml-stylesheet processing instruction pointing at /sitemap.xsl, after the XML declaration and before the urlset root", () => {
    const declIndex = sitemapXml.indexOf('<?xml version="1.0"');
    const piIndex = sitemapXml.indexOf('<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>');
    const urlsetIndex = sitemapXml.indexOf("<urlset");
    expect(declIndex).toBe(0);
    expect(piIndex).toBeGreaterThan(declIndex);
    expect(urlsetIndex).toBeGreaterThan(piIndex);
  });

  it("keeps the real sitemaps.org namespace and exactly one urlset root, unchanged by the stylesheet addition", () => {
    expect(sitemapXml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemapXml.match(/<urlset[\s>]/g)?.length).toBe(1);
    expect(sitemapXml.match(/<\/urlset>/g)?.length).toBe(1);
  });

  it("lists only unique URLs, with no duplicate introduced by the XSLT/stylesheet change itself", () => {
    const locs = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    expect(new Set(locs).size).toBe(locs.length);
  });

  it("every url/loc/changefreq/priority tag is still balanced (open/close counts match)", () => {
    for (const tag of ["url", "loc", "changefreq", "priority"]) {
      const opens = sitemapXml.match(new RegExp(`<${tag}>`, "g"))?.length ?? 0;
      const closes = sitemapXml.match(new RegExp(`</${tag}>`, "g"))?.length ?? 0;
      expect(opens, `${tag} open/close mismatch`).toBe(closes);
      expect(opens).toBeGreaterThan(0);
    }
  });
});

describe("public/sitemap.xsl — XSLT transform", () => {
  it("is a well-formed XSLT 1.0 stylesheet bound to the sitemap namespace", () => {
    expect(sitemapXsl.startsWith("<?xml")).toBe(true);
    expect(sitemapXsl).toContain('<xsl:stylesheet version="1.0"');
    expect(sitemapXsl).toContain('xmlns:xsl="http://www.w3.org/1999/XSL/Transform"');
    expect(sitemapXsl).toContain('xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(sitemapXsl.match(/<xsl:stylesheet\b/g)?.length).toBe(1);
    expect(sitemapXsl.match(/<\/xsl:stylesheet>/g)?.length).toBe(1);
  });

  it("renders every real sitemap field (a clickable loc link, changefreq, priority) and a total-URL count", () => {
    expect(sitemapXsl).toContain('select="/sm:urlset/sm:url"');
    expect(sitemapXsl).toContain('<a href="{sm:loc}">');
    expect(sitemapXsl).toContain("sm:changefreq");
    expect(sitemapXsl).toContain("sm:priority");
    expect(sitemapXsl).toContain("count(/sm:urlset/sm:url)");
  });

  it("links to a local stylesheet only — no inline <style> block, no <script>, no external CDN host", () => {
    expect(sitemapXsl).toContain('<link rel="stylesheet" href="/sitemap.css"/>');
    expect(sitemapXsl).not.toMatch(/<style[ >]/);
    expect(sitemapXsl).not.toContain("<script");
    // www.w3.org/www.sitemaps.org appear only as XML namespace URIs (identifiers,
    // never dereferenced/fetched per the XML Namespaces spec), not loaded resources.
    expect(sitemapXsl).not.toMatch(/https?:\/\/(?!codivio\.online|www\.sitemaps\.org|www\.w3\.org)/);
  });

  it("stays a client-side XSLT transform, not a build step that turns sitemap.xml into an HTML file", () => {
    expect(sitemapXsl).toContain('<xsl:output method="html"');
  });
});

describe("public/sitemap.css — Codivio-branded styling, no CDN", () => {
  it("reuses Codivio's real brand tokens, not invented colors", () => {
    expect(sitemapCss).toContain("--color-primary: #1769e0");
    expect(sitemapCss).toContain("--color-ink: #172b49");
    expect(sitemapCss).toContain("--color-muted: #68778d");
    expect(sitemapCss).toContain("Inter");
  });

  it("has no @import of an external CDN and no url() pointing off-origin", () => {
    expect(sitemapCss).not.toMatch(/@import\s+url\(\s*['"]?https?:/);
    expect(sitemapCss).not.toMatch(/url\(\s*['"]?https?:/);
  });

  it("has a responsive rule for narrow/mobile widths", () => {
    expect(sitemapCss).toMatch(/@media\s*\(max-width:\s*720px\)/);
  });
});
