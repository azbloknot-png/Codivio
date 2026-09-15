import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../shared/i18n";
import { PAGE_SEO, TOOL_SEO, TOOL_INTENT, PAGE_INTENT } from "../shared/seo";

/**
 * Phase 3.2 — search-intent audit + cannibalization/misleading-claim checks.
 *
 * TOOL_INTENT/PAGE_INTENT (shared/seo/intent.ts) are editorial judgments
 * about what real query each page/tool serves — never claimed search
 * volume or ranking potential (see that file's own header comment). This
 * suite verifies the audit is actually complete (every real tool/page
 * covered, in all 3 languages) and that it surfaces real problems
 * (duplicate primary intent between two different tools = cannibalization
 * risk) rather than just existing as an unused dataset.
 */

describe("search-intent audit coverage", () => {
  it("every one of the 34 real tools has a primary+secondary intent entry in all 3 languages", () => {
    const toolSlugs = Object.keys(TOOL_SEO).sort();
    const intentSlugs = Object.keys(TOOL_INTENT).sort();
    expect(intentSlugs).toEqual(toolSlugs);

    for (const slug of toolSlugs) {
      for (const lang of LANGUAGES) {
        const entry = TOOL_INTENT[slug][lang];
        expect(entry.primary.trim().length, `${slug} [${lang}] primary intent`).toBeGreaterThan(0);
        expect(entry.secondary.length, `${slug} [${lang}] secondary intent count`).toBeGreaterThanOrEqual(2);
        for (const phrase of entry.secondary) {
          expect(phrase.trim().length, `${slug} [${lang}] secondary phrase`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("every one of the 9 real static pages has a primary intent entry in all 3 languages", () => {
    const pageKeys = Object.keys(PAGE_SEO).sort();
    const intentKeys = Object.keys(PAGE_INTENT).sort();
    expect(intentKeys).toEqual(pageKeys);

    for (const key of pageKeys) {
      for (const lang of LANGUAGES) {
        expect(PAGE_INTENT[key][lang].primary.trim().length, `${key} [${lang}]`).toBeGreaterThan(0);
      }
    }
  });
});

describe("keyword cannibalization check", () => {
  it("no two different tools target the exact same primary search intent, in any language", () => {
    for (const lang of LANGUAGES) {
      const byPrimary = new Map<string, string[]>();
      for (const [slug, byLang] of Object.entries(TOOL_INTENT)) {
        const primary = byLang[lang].primary;
        const slugs = byPrimary.get(primary) ?? [];
        slugs.push(slug);
        byPrimary.set(primary, slugs);
      }
      const collisions = [...byPrimary.entries()].filter(([, slugs]) => slugs.length > 1);
      expect(collisions, `duplicate primary intent in ${lang}: ${JSON.stringify(collisions)}`).toEqual([]);
    }
  });

  it("format-specific converters (e.g. pdf-to-jpg vs pdf-to-image) have distinct primary intents, not just distinct titles", () => {
    // A real, reviewed near-overlap: several tools convert between similar
    // formats. Confirms each targets its own specific query rather than
    // silently duplicating a broader tool's intent.
    const pairs: [string, string][] = [
      ["pdf-to-jpg", "pdf-to-image"],
      ["jpg-to-pdf", "image-to-pdf"],
      ["jpg-to-png", "png-to-jpg"],
    ];
    for (const [a, b] of pairs) {
      for (const lang of LANGUAGES) {
        expect(TOOL_INTENT[a][lang].primary).not.toBe(TOOL_INTENT[b][lang].primary);
      }
    }
  });
});

describe("no misleading or exaggerated SEO claims", () => {
  it("no title/description anywhere contains a superlative, ranking guarantee, or unverifiable claim", () => {
    const bannedPatterns = [
      /\bbest\b/i,
      /#1/,
      /\bguaranteed?\b/i,
      /\btop[- ]rated\b/i,
      /\bnumber one\b/i,
      /\ben yaxşı\b/i,
      /\bbirinci\b/i,
      /\bzəmanət/i,
      /\ben iyi\b/i,
      /\bgaranti/i,
    ];
    const allText: string[] = [];
    for (const entity of [...Object.values(PAGE_SEO), ...Object.values(TOOL_SEO)]) {
      for (const lang of LANGUAGES) {
        allText.push(entity.localized[lang].title, entity.localized[lang].description);
      }
    }
    for (const text of allText) {
      for (const pattern of bannedPatterns) {
        expect(text, `"${text}" should not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
