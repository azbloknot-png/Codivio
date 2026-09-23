import { describe, expect, it } from "vitest";
import { LANGUAGES } from "../shared/i18n";
import { TOOL_SEO } from "../shared/seo";
import { getToolDisplayName } from "../shared/seo/ai";
import { TOOL_CONTENT, getToolFaqs } from "../shared/seo/content";

/**
 * FAQ Expansion + AI Discoverability (pre-Phase-3.15). One appropriate test
 * per topic, per the project's testing rule. Phase 3.4's own coverage
 * (every tool populated, no empty question/answer, banned-phrase scan) is
 * already re-verified by tests/seo-content.test.ts's updated 6-per-tool
 * assertion — not duplicated here.
 */

describe("no accidentally-identical FAQ content was pasted across languages", () => {
  it("every tool's AZ and TR FAQ questions are genuinely distinct from the EN ones, not copy-pasted placeholders", () => {
    for (const [slug, byLang] of Object.entries(TOOL_CONTENT)) {
      const enQuestions = byLang.en.faq.map((f) => f.question);
      const azQuestions = byLang.az.faq.map((f) => f.question);
      const trQuestions = byLang.tr.faq.map((f) => f.question);
      for (let i = 0; i < enQuestions.length; i++) {
        expect(azQuestions[i], `${slug} faq[${i}] AZ should differ from EN`).not.toBe(enQuestions[i]);
        expect(trQuestions[i], `${slug} faq[${i}] TR should differ from EN`).not.toBe(enQuestions[i]);
        expect(azQuestions[i], `${slug} faq[${i}] AZ should differ from TR`).not.toBe(trQuestions[i]);
      }
    }
  });
});

describe("no duplicate questions within a single tool's FAQ list", () => {
  it("every tool has 6 unique questions per language (no repeated question text)", () => {
    for (const [slug, byLang] of Object.entries(TOOL_CONTENT)) {
      for (const lang of LANGUAGES) {
        const questions = byLang[lang].faq.map((f) => f.question);
        expect(new Set(questions).size, `${slug} [${lang}] should have no duplicate questions`).toBe(questions.length);
      }
    }
  });
});

describe("cross-tool FAQ references point only to real, existing Codivio tools", () => {
  it("every EN FAQ answer that names another tool (\"The X tool is designed for...\") names a real tool from the registry", () => {
    const realToolNames = new Set(Object.keys(TOOL_SEO).map((slug) => getToolDisplayName(slug, "en")));
    for (const [slug, byLang] of Object.entries(TOOL_CONTENT)) {
      for (const item of byLang.en.faq) {
        const match = item.answer.match(/The ([A-Z][A-Za-z0-9 /]+?) tool (?:is|are) designed/);
        if (match) {
          const referencedName = match[1].trim();
          expect(realToolNames.has(referencedName), `${slug} references "${referencedName}"`).toBe(true);
        }
      }
    }
  });
});

describe("getToolFaqs is a lightweight, correct, deterministic accessor", () => {
  it("returns the same FAQ array getContentBlueprint would, for every tool and language, and null for a fake slug", () => {
    for (const slug of Object.keys(TOOL_SEO)) {
      for (const lang of LANGUAGES) {
        expect(getToolFaqs(slug, lang)).toEqual(TOOL_CONTENT[slug][lang].faq);
      }
    }
    expect(getToolFaqs("not-a-real-tool", "en")).toBeNull();
  });
});

describe("the new availability-status FAQ is present and consistently honest", () => {
  it("every placeholder tool's FAQ list includes a status question whose answer says the tool is not yet available", () => {
    // Phase 3.18/5.2/5.3 content-consistency fixes: qr-code-generator/
    // qr-code-scanner (Phase 4.1/4.6), pdf-merge (Phase 5.2), and pdf-split
    // (Phase 5.3) shipped real functionality — their final FAQ answer is
    // the deliberate exception, checked separately below.
    const liveSlugs = new Set(["qr-code-generator", "qr-code-scanner", "pdf-merge", "pdf-split"]);
    for (const [slug, byLang] of Object.entries(TOOL_CONTENT)) {
      if (liveSlugs.has(slug)) continue;
      for (const lang of LANGUAGES) {
        const lastFaq = byLang[lang].faq[byLang[lang].faq.length - 1];
        expect(lastFaq.answer.toLowerCase(), `${slug} [${lang}] final FAQ`).toMatch(/not yet|hələ yox|henüz değil/i);
      }
    }
  });

  it("the 4 live tools' final FAQ answer honestly says the tool is available now, in all 3 languages", () => {
    for (const slug of ["qr-code-generator", "qr-code-scanner", "pdf-merge", "pdf-split"]) {
      for (const lang of LANGUAGES) {
        const lastFaq = TOOL_CONTENT[slug][lang].faq[TOOL_CONTENT[slug][lang].faq.length - 1];
        expect(lastFaq.answer.toLowerCase(), `${slug} [${lang}] final FAQ`).not.toMatch(/not yet|hələ yox|henüz değil/i);
        expect(lastFaq.answer.toLowerCase(), `${slug} [${lang}] final FAQ`).toMatch(/yes|bəli|evet/i);
      }
    }
  });
});
