import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { parseRobotsTxt, getUniqueAllowedPaths, getUniqueDisallowedPaths } from "../shared/seo/robots-policy";

/**
 * Human-Readable Robots Policy Page follow-up — the parser that makes
 * src/App.tsx's RobotsPage possible without ever hand-retyping a rule from
 * public/robots.txt. These tests run the parser against the REAL file (not
 * a synthetic fixture) so a future edit to robots.txt is exercised by this
 * suite automatically, plus a few small synthetic-input tests for parser
 * edge cases the real file doesn't happen to contain (leading rules with
 * no group yet, comments, blank lines).
 */

const robotsTxt = fs.readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");

describe("parseRobotsTxt — parses the real public/robots.txt correctly", () => {
  it("extracts exactly the 6 real User-agent groups, in file order", () => {
    const policy = parseRobotsTxt(robotsTxt);
    expect(policy.groups.map((g) => g.userAgent)).toEqual([
      "*",
      "OAI-SearchBot",
      "ChatGPT-User",
      "Claude-SearchBot",
      "Claude-User",
      "PerplexityBot",
    ]);
  });

  it("every group has the real Allow: / and the same 2 Disallow paths — repeated per group by the file's own design", () => {
    const policy = parseRobotsTxt(robotsTxt);
    expect(policy.groups.length).toBeGreaterThan(0);
    for (const group of policy.groups) {
      expect(group.allow, group.userAgent).toEqual(["/"]);
      expect(group.disallow, group.userAgent).toEqual(["/admin/", "/api/private/"]);
    }
  });

  it("extracts exactly the one real Sitemap directive", () => {
    const policy = parseRobotsTxt(robotsTxt);
    expect(policy.sitemaps).toEqual(["https://codivio.online/sitemap.xml"]);
  });

  it("ignores comment lines and blank lines, never treating them as directives", () => {
    const policy = parseRobotsTxt("# just a comment\n\nUser-agent: *\nAllow: /\n");
    expect(policy.groups).toEqual([{ userAgent: "*", allow: ["/"], disallow: [] }]);
  });

  it("ignores an Allow/Disallow line that appears before any User-agent, rather than crashing or attaching it to nothing", () => {
    const policy = parseRobotsTxt("Allow: /\nUser-agent: *\nDisallow: /admin/\n");
    expect(policy.groups).toEqual([{ userAgent: "*", allow: [], disallow: ["/admin/"] }]);
  });

  it("ignores an unrecognized directive (e.g. Crawl-delay) instead of throwing", () => {
    expect(() => parseRobotsTxt("User-agent: *\nCrawl-delay: 10\nAllow: /\n")).not.toThrow();
    const policy = parseRobotsTxt("User-agent: *\nCrawl-delay: 10\nAllow: /\n");
    expect(policy.groups).toEqual([{ userAgent: "*", allow: ["/"], disallow: [] }]);
  });
});

describe("getUniqueAllowedPaths / getUniqueDisallowedPaths — dedupe across all groups", () => {
  it("collapses the real file's 6 repeated 'Allow: /' lines into a single unique entry", () => {
    const policy = parseRobotsTxt(robotsTxt);
    expect(getUniqueAllowedPaths(policy)).toEqual(["/"]);
  });

  it("collapses the real file's repeated Disallow lines into the 2 real unique paths, in first-seen order", () => {
    const policy = parseRobotsTxt(robotsTxt);
    expect(getUniqueDisallowedPaths(policy)).toEqual(["/admin/", "/api/private/"]);
  });
});
