import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { LANGUAGES } from "../shared/i18n";
import { TOOL_SEO, TOOL_KEYWORDS, CATEGORY_KEYWORD_OPPORTUNITIES, getToolKeywordProfile } from "../shared/seo";

/**
 * Phase 3.3 — keyword & search-intent strategy.
 *
 * One appropriate test per topic per the project's testing rule: full
 * tool coverage, AZ/TR/EN long-tail coverage, no broken tool references,
 * category counts match the real registry, and the combined
 * primary+secondary+long-tail keyword set has no real duplicate-primary
 * conflict (the deeper duplicate-detection itself already lives in
 * tests/seo-intent.test.ts — this file only adds what Phase 3.3 is new).
 */

describe("keyword architecture covers exactly the real 34-tool registry", () => {
  it("TOOL_KEYWORDS has exactly the same 34 slugs as TOOL_SEO — no invented tools, none missing", () => {
    expect(Object.keys(TOOL_KEYWORDS).sort()).toEqual(Object.keys(TOOL_SEO).sort());
    expect(Object.keys(TOOL_KEYWORDS).length).toBe(34);
  });

  it("every tool has 2 long-tail phrases in all 3 languages, and every field is populated", () => {
    for (const [slug, entry] of Object.entries(TOOL_KEYWORDS)) {
      for (const lang of LANGUAGES) {
        expect(entry.longTail[lang].length, `${slug} [${lang}] long-tail count`).toBe(2);
        for (const phrase of entry.longTail[lang]) {
          expect(phrase.trim().length, `${slug} [${lang}] long-tail phrase`).toBeGreaterThan(0);
        }
      }
      expect(entry.futureContentOpportunity.trim().length, `${slug} futureContentOpportunity`).toBeGreaterThan(0);
      expect(entry.notes.trim().length, `${slug} notes`).toBeGreaterThan(0);
      expect(["SAFE", "WATCH", "CONFLICT"]).toContain(entry.cannibalizationRisk);
    }
  });
});

describe("no broken tool/category references", () => {
  it("every relatedToolOpportunity slug refers to a real tool in the registry", () => {
    for (const [slug, entry] of Object.entries(TOOL_KEYWORDS)) {
      for (const related of entry.relatedToolOpportunity) {
        expect(Object.keys(TOOL_SEO), `${slug} -> related "${related}"`).toContain(related);
      }
    }
  });

  it("category assignments exactly match the real registry's 12/8/11/3 QR/PDF/Image/Other split", () => {
    const counts = { "QR Tools": 0, "PDF Tools": 0, "Image Tools": 0, "Other Tools": 0 };
    for (const entry of Object.values(TOOL_KEYWORDS)) {
      counts[entry.category] += 1;
    }
    expect(counts).toEqual({ "QR Tools": 12, "PDF Tools": 8, "Image Tools": 11, "Other Tools": 3 });

    // CATEGORY_KEYWORD_OPPORTUNITIES' derived tool lists must match too.
    for (const [category, opportunity] of Object.entries(CATEGORY_KEYWORD_OPPORTUNITIES)) {
      expect(opportunity.wouldServeTools.length, category).toBe(counts[category as keyof typeof counts]);
    }
  });

  it("getToolKeywordProfile returns a complete profile for a real tool and null for a nonexistent one", () => {
    const profile = getToolKeywordProfile("qr-code-generator", "en");
    expect(profile).not.toBeNull();
    expect(profile?.primaryKeyword).toBe("create a qr code online");
    expect(profile?.category).toBe("QR Tools");

    expect(getToolKeywordProfile("not-a-real-tool", "en")).toBeNull();
  });
});

describe("no numeric keyword metrics are fabricated anywhere in the keyword architecture", () => {
  it("shared/seo/keywords.ts and intent.ts contain no search-volume/CPC/ranking-style numeric claims", () => {
    // Structural guard: these files should never gain a volume/cpc/difficulty/
    // rank/traffic field — if one appears, it must carry a real data source,
    // not an invented number (Phase 3.3's explicit, non-negotiable rule).
    const keywordsSource = fs.readFileSync(new URL("../shared/seo/keywords.ts", import.meta.url), "utf8");
    const intentSource = fs.readFileSync(new URL("../shared/seo/intent.ts", import.meta.url), "utf8");
    // Matches only field/property-style usage (identifier followed by `:` or
    // `=`), not prose explaining that these metrics are intentionally absent
    // (this file's own header comment mentions "CPC" for exactly that reason).
    for (const source of [keywordsSource, intentSource]) {
      expect(source).not.toMatch(/\b(searchVolume|cpc|keywordDifficulty|estimatedTraffic|monthlySearches)\s*[:=]/i);
    }
  });
});
