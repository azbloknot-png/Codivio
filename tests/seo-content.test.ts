import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../shared/i18n";
import { TOOL_SEO } from "../shared/seo";
import {
  TOOL_CONTENT,
  CATEGORY_CONTENT_BLUEPRINT,
  SHARED_TRUST_MESSAGE,
  TOOL_STATUS_NOTE,
  getContentBlueprint,
} from "../shared/seo/content";

/**
 * Phase 3.4 — structured SEO content architecture.
 *
 * One appropriate test per topic per the project's testing rule: full
 * tool coverage, AZ/TR/EN coverage, no broken tool references, no
 * duplicate content where uniqueness matters, and no unsupported
 * functionality claims (the banned-phrase list from this checkpoint's
 * own brief). Phase 3.1-3.3 regression is covered by re-running the
 * existing suites once, not duplicating their assertions here.
 */

describe("34/34 tools have a complete content blueprint", () => {
  it("TOOL_CONTENT has exactly the same 34 slugs as TOOL_SEO — no invented tools, none missing", () => {
    expect(Object.keys(TOOL_CONTENT).sort()).toEqual(Object.keys(TOOL_SEO).sort());
    expect(Object.keys(TOOL_CONTENT).length).toBe(34);
  });

  it("every tool has a populated blueprint (intro, value prop, 3 benefits, 3 how-to steps, 3 use cases, 2 FAQ) in all 3 languages", () => {
    for (const [slug, byLang] of Object.entries(TOOL_CONTENT)) {
      for (const lang of LANGUAGES) {
        const blueprint = byLang[lang];
        expect(blueprint.introduction.trim().length, `${slug} [${lang}] introduction`).toBeGreaterThan(0);
        expect(blueprint.valueProposition.trim().length, `${slug} [${lang}] valueProposition`).toBeGreaterThan(0);
        expect(blueprint.benefits.length, `${slug} [${lang}] benefits count`).toBe(3);
        expect(blueprint.howToSteps.length, `${slug} [${lang}] howToSteps count`).toBe(3);
        expect(blueprint.useCases.length, `${slug} [${lang}] useCases count`).toBe(3);
        expect(blueprint.faq.length, `${slug} [${lang}] faq count`).toBe(2);
        for (const item of blueprint.faq) {
          expect(item.question.trim().length, `${slug} [${lang}] faq question`).toBeGreaterThan(0);
          expect(item.answer.trim().length, `${slug} [${lang}] faq answer`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("no duplicate content where uniqueness is required", () => {
  it("every tool's introduction and value proposition are unique within each language", () => {
    for (const lang of LANGUAGES) {
      const introductions = Object.values(TOOL_CONTENT).map((byLang) => byLang[lang].introduction);
      const valueProps = Object.values(TOOL_CONTENT).map((byLang) => byLang[lang].valueProposition);
      expect(new Set(introductions).size, `duplicate introductions in ${lang}`).toBe(introductions.length);
      expect(new Set(valueProps).size, `duplicate value propositions in ${lang}`).toBe(valueProps.length);
    }
  });
});

describe("no unsupported functionality claims (Phase 3.4's explicit banned phrases)", () => {
  it("no tool content anywhere claims live processing, unlimited use, or absolute guarantees", () => {
    const bannedPatterns = [
      /upload your file and download instantly/i,
      /we process your file/i,
      /automatically deleted after/i,
      /\bunlimited\b/i,
      /100%\s*private/i,
      /no files? (is|are) stored/i,
      /\bfastest tool\b/i,
      /\bbest tool\b/i,
    ];
    const allText: string[] = [SHARED_TRUST_MESSAGE.en, TOOL_STATUS_NOTE.en];
    for (const byLang of Object.values(TOOL_CONTENT)) {
      const en = byLang.en;
      allText.push(en.introduction, en.valueProposition, ...en.benefits, ...en.howToSteps, ...en.useCases);
      for (const item of en.faq) allText.push(item.question, item.answer);
    }
    for (const text of allText) {
      for (const pattern of bannedPatterns) {
        expect(text, `"${text}" should not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

describe("getContentBlueprint combines content + keyword data without broken references", () => {
  it("returns a complete blueprint for a real tool, including reused keyword-architecture fields", () => {
    const blueprint = getContentBlueprint("pdf-merge", "en");
    expect(blueprint).not.toBeNull();
    expect(blueprint?.introduction).toContain("PDF merging");
    expect(blueprint?.primaryKeyword).toBe("merge pdf files online");
    expect(blueprint?.relatedToolOpportunity).toEqual(["pdf-split", "pdf-compress"]);
    expect(blueprint?.trustMessage).toBe(SHARED_TRUST_MESSAGE.en);
  });

  it("returns null for a tool that doesn't exist — no invented tool is ever silently served", () => {
    expect(getContentBlueprint("not-a-real-tool", "en")).toBeNull();
  });

  it("every related-tool reference resolves to a real tool with its own content blueprint", () => {
    for (const slug of Object.keys(TOOL_CONTENT)) {
      const blueprint = getContentBlueprint(slug, "en");
      for (const related of blueprint?.relatedToolOpportunity ?? []) {
        expect(TOOL_CONTENT, `${slug} -> related "${related}"`).toHaveProperty(related);
      }
    }
  });
});

describe("category content foundation covers exactly the 4 real categories", () => {
  it("every category has a purpose statement in all 3 languages and at least one supporting topic", () => {
    expect(Object.keys(CATEGORY_CONTENT_BLUEPRINT).sort()).toEqual(
      ["Image Tools", "Other Tools", "PDF Tools", "QR Tools"].sort()
    );
    for (const blueprint of Object.values(CATEGORY_CONTENT_BLUEPRINT)) {
      for (const lang of LANGUAGES) {
        expect(blueprint.purpose[lang].trim().length).toBeGreaterThan(0);
      }
      expect(blueprint.supportingTopics.length).toBeGreaterThan(0);
    }
  });
});
