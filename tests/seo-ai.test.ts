import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { LANGUAGES } from "../shared/i18n";
import { TOOL_SEO } from "../shared/seo";
import {
  SITE_IDENTITY,
  getToolCategory,
  getRelatedTools,
  getToolsInCategory,
  getAllToolSlugs,
  getAllCategories,
  answerWhatIsCodivio,
  answerWhatToolsDoesCodivioProvide,
  answerToolCategory,
  answerSupportedLanguages,
  answerRelatedTools,
} from "../shared/seo/ai";
// Phase 3.13 — getAiToolProfile/getAiCategoryProfile/answerWhatIsTool moved
// to content.ts (see DECISIONS.md's Phase 3.13 entry: keeping any reference
// to the heavy content dataset out of ai.ts, which is imported eagerly by
// every page, is what lets the bundler tree-shake it out of the main chunk
// now that content.ts also has a genuine lazy caller, ToolPage.tsx).
import { getAiToolProfile, getAiCategoryProfile, answerWhatIsTool } from "../shared/seo/content";

/**
 * Phase 3.5 — AI-structured content / AI discoverability / GEO.
 *
 * One appropriate test per topic per the project's testing rule. Phase
 * 3.1-3.4 regression is covered by re-running the existing suites once
 * (see the full-suite run alongside this file), not duplicated here.
 */

describe("AI content structure covers the real 34-tool / 4-category registry", () => {
  it("every one of the 34 real tools has an AI-readable profile in all 3 languages", () => {
    const slugs = getAllToolSlugs();
    expect(slugs.length).toBe(34);
    // Phase 3.18/5.2/5.3/5.4 content-consistency fixes: qr-code-generator/
    // qr-code-scanner (Phase 4.1/4.6), pdf-merge (Phase 5.2), pdf-split
    // (Phase 5.3), and pdf-compress (Phase 5.4) shipped real functionality —
    // their AI profile status is the deliberate exception, checked
    // separately below.
    const liveSlugs = new Set([
      "qr-code-generator",
      "qr-code-scanner",
      "pdf-merge",
      "pdf-split",
      "pdf-compress",
      "pdf-to-word",
      "image-resize",
      "image-compress",
    ]);
    for (const slug of slugs) {
      for (const lang of LANGUAGES) {
        const profile = getAiToolProfile(slug, lang);
        expect(profile, `${slug} [${lang}]`).not.toBeNull();
        expect(profile?.status, slug).toBe(liveSlugs.has(slug) ? "live" : "coming-soon");
        expect(profile?.name.trim().length).toBeGreaterThan(0);
        expect(profile?.benefits.length).toBeGreaterThan(0);
      }
    }
  });

  it("every one of the 4 real categories has an AI-readable profile in all 3 languages, matching the real 12/8/11/3 split", () => {
    const categories = getAllCategories();
    expect(categories).toEqual(["QR Tools", "PDF Tools", "Image Tools", "Other Tools"]);
    const expectedCounts = { "QR Tools": 12, "PDF Tools": 8, "Image Tools": 11, "Other Tools": 3 };
    for (const category of categories) {
      for (const lang of LANGUAGES) {
        const profile = getAiCategoryProfile(category, lang);
        expect(profile.purpose.trim().length, `${category} [${lang}]`).toBeGreaterThan(0);
      }
      expect(getToolsInCategory(category).length, category).toBe(expectedCounts[category]);
    }
  });

  it("returns null/empty for a nonexistent tool rather than fabricating a profile", () => {
    expect(getAiToolProfile("not-a-real-tool", "en")).toBeNull();
    expect(getToolCategory("not-a-real-tool")).toBeNull();
    expect(getRelatedTools("not-a-real-tool")).toEqual([]);
  });
});

describe("SITE_IDENTITY is factual and cannot silently drift from the real registry", () => {
  it("tool count and categories are computed from the real data, not hardcoded, and no unverifiable fact is present", () => {
    expect(SITE_IDENTITY.toolCount).toBe(Object.keys(TOOL_SEO).length);
    expect(SITE_IDENTITY.toolCount).toBe(34);
    expect(SITE_IDENTITY.categories).toEqual(["QR Tools", "PDF Tools", "Image Tools", "Other Tools"]);
    expect(SITE_IDENTITY.supportedLanguages).toEqual(["az", "tr", "en"]);
    expect(SITE_IDENTITY.verifiedSocialProfiles).toEqual([]);
    // No fabricated business fact fields exist on the object at all.
    expect(SITE_IDENTITY).not.toHaveProperty("foundingDate");
    expect(SITE_IDENTITY).not.toHaveProperty("userCount");
    expect(SITE_IDENTITY).not.toHaveProperty("employeeCount");
  });
});

describe("deterministic answer builders work in AZ/TR/EN and never fabricate", () => {
  it("each answer function produces real, non-empty text in every language for a real tool, and null for a fake one", () => {
    for (const lang of LANGUAGES) {
      expect(answerWhatIsCodivio(lang).length).toBeGreaterThan(0);
      expect(answerWhatToolsDoesCodivioProvide(lang)).toContain("34");
      // The tool name itself is correctly localized per language (e.g. AZ
      // "PDF Birləşdirmə") — only assert the literal English name for "en".
      const answer = answerWhatIsTool("pdf-merge", lang);
      expect(answer, `${lang} answer should exist`).not.toBeNull();
      if (lang === "en") expect(answer).toContain("PDF Merge");
      expect(answerWhatIsTool("not-a-real-tool", lang)).toBeNull();
    }
    expect(answerToolCategory("pdf-merge")).toContain("PDF Tools");
    expect(answerToolCategory("not-a-real-tool")).toBeNull();
    expect(answerSupportedLanguages()).toContain("Azərbaycan dili");
    expect(answerRelatedTools("pdf-merge")).toContain("pdf-split");
  });

  it("answerWhatIsTool reports the real status honestly — 'in development' for a placeholder tool, 'live' for a shipped one", () => {
    // Phase 5.2/5.3/5.4/5.5: pdf-merge/pdf-split/pdf-compress/pdf-to-word
    // shipped real functionality, so they moved from the "placeholder"
    // example to the "live" checks below; pdf-to-jpg (still a placeholder)
    // takes their place as the "in development" exemplar.
    expect(answerWhatIsTool("pdf-to-jpg", "en")).toContain("Status: in development, not yet processing files.");
    expect(answerWhatIsTool("qr-code-generator", "en")).toContain("Status: live.");
    expect(answerWhatIsTool("qr-code-scanner", "en")).toContain("Status: live.");
    expect(answerWhatIsTool("pdf-merge", "en")).toContain("Status: live.");
    expect(answerWhatIsTool("pdf-split", "en")).toContain("Status: live.");
    expect(answerWhatIsTool("pdf-compress", "en")).toContain("Status: live.");
    expect(answerWhatIsTool("pdf-to-word", "en")).toContain("Status: live.");
  });
});

describe("no unsupported functionality claims in AI-readable output (reuses Phase 3.2/3.4's banned-phrase list)", () => {
  it("no answer-function output or tool profile field claims live processing or an absolute guarantee", () => {
    const bannedPatterns = [
      /upload your file and download instantly/i,
      /we process your file/i,
      /automatically deleted after/i,
      /\bunlimited\b/i,
      /100%\s*private/i,
      /no files? (is|are) stored/i,
      /\bfastest tool\b/i,
      /\bbest tool\b/i,
      /\bmillions of users\b/i,
      /\btrusted by\b/i,
    ];
    const allText: string[] = [answerWhatIsCodivio("en"), answerWhatToolsDoesCodivioProvide("en")];
    for (const slug of getAllToolSlugs()) {
      const profile = getAiToolProfile(slug, "en");
      if (!profile) continue;
      allText.push(profile.purpose, profile.description, ...profile.benefits, ...profile.generalWorkflow, ...profile.useCases);
      allText.push(answerWhatIsTool(slug, "en") ?? "");
    }
    for (const text of allText) {
      for (const pattern of bannedPatterns) {
        expect(text, `"${text}" should not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

describe("llms.txt is factual and exposes nothing sensitive", () => {
  const llmsTxt = fs.readFileSync(new URL("../public/llms.txt", import.meta.url), "utf8");

  it("lists the real domain, all 3 languages, the real 34-tool/4-category split, and an honest status disclosure", () => {
    expect(llmsTxt).toContain("codivio.online");
    expect(llmsTxt).toContain("Azerbaijani");
    expect(llmsTxt).toContain("Turkish");
    expect(llmsTxt).toContain("English");
    expect(llmsTxt).toContain("34 tools");
    expect(llmsTxt.toLowerCase()).toContain("development");
    expect(llmsTxt).not.toContain("codovio"); // regression guard for the earlier typo
  });

  it("exposes no admin routes, API internals, secrets, or exaggerated ranking/authority claims", () => {
    expect(llmsTxt).not.toMatch(/\/admin/i);
    expect(llmsTxt).not.toMatch(/api[_-]?key|password|token|secret/i);
    // "does not guarantee visibility" is the correct, honest disclaimer this
    // file is supposed to make (Phase 3.5 Section 3) — only an affirmative
    // guarantee claim ("we guarantee", "guaranteed to rank") is banned.
    expect(llmsTxt).not.toMatch(/\bwe guarantee\b|\bguaranteed to (rank|appear)\b|#1|best in|millions of|trusted by/i);
  });
});

describe("robots.txt crawler policy is correctly grouped and uses only real, documented bot names", () => {
  const robotsTxt = fs.readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");

  it("does not reference the fabricated 'OAI-AdsBot' and only lists documented AI crawler user-agents", () => {
    expect(robotsTxt).not.toContain("OAI-AdsBot");
    for (const bot of ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot"]) {
      expect(robotsTxt).toContain(bot);
    }
  });

  it("every User-agent group disallows /admin/ and /api/private/ directly (regression guard for the grouping bug where Disallow only applied to the last-declared bot)", () => {
    const groups = robotsTxt.split(/\nUser-agent:/).slice(1).map((g) => "User-agent:" + g);
    expect(groups.length).toBeGreaterThanOrEqual(6);
    for (const group of groups) {
      expect(group).toContain("Disallow: /admin/");
      expect(group).toContain("Disallow: /api/private/");
    }
  });

  it("still allows general crawling and references the real sitemap", () => {
    expect(robotsTxt).toMatch(/User-agent: \*\nAllow: \//);
    expect(robotsTxt).toContain("Sitemap: https://codivio.online/sitemap.xml");
  });
});
