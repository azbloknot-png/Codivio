import { LANGUAGES, LANGUAGE_NATIVE_NAMES, type Language } from "../i18n/languages";
import { TOOL_SEO, PAGE_SEO } from "./index";
import {
  TOOL_CONTENT,
  CATEGORY_CONTENT_BLUEPRINT,
  getContentBlueprint,
  type ToolContentBlueprint,
} from "./content";
import { TOOL_KEYWORDS, type ToolKeywordEntry } from "./keywords";

/**
 * Codivio AI discoverability / GEO foundation (Phase 3.5).
 *
 * This file introduces NO new content-authoring dataset. Every fact below
 * is read from data already audited in Phases 3.1-3.4 (shared/seo/{tools,
 * pages,content,keywords}.ts) or computed from it — this is an
 * orchestration/answer layer, not a second source of truth. See
 * DECISIONS.md's Phase 3.5 entry for why.
 *
 * Not wired into any rendered UI or bundled into the client (not
 * re-exported from shared/seo/index.ts, matching the Phase 3.4 pattern for
 * content.ts) — measured 0-byte bundle impact, see PROJECT_STATE.md.
 *
 * Nothing here is a chatbot, an AI API, or an LLM call. Every "answer*"
 * function is a deterministic string builder over structured data that
 * already exists — the same kind of thing a static FAQ page does.
 *
 * Every fact in SITE_IDENTITY is independently verifiable from this
 * repository (tool count is computed, not hardcoded, so it can never
 * silently drift from the real registry). No founding date, employee
 * count, user count, traffic, awards, reviews, certifications,
 * headquarters, revenue, or "trusted by" claim exists anywhere here —
 * none of that is knowable from this codebase, so none of it is asserted.
 */

export type ToolCategory = ToolKeywordEntry["category"];

const TOOL_CATEGORIES: readonly ToolCategory[] = ["QR Tools", "PDF Tools", "Image Tools", "Other Tools"];

export interface SiteIdentity {
  name: string;
  domain: string;
  officialWebsite: string;
  productType: string;
  categories: readonly ToolCategory[];
  toolCount: number;
  supportedLanguages: readonly Language[];
  /** No social profile is configured/verified anywhere in this codebase
   * today — an empty list is the honest value, not a placeholder. */
  verifiedSocialProfiles: readonly string[];
}

export const SITE_IDENTITY: SiteIdentity = {
  name: "Codivio",
  domain: "codivio.online",
  officialWebsite: "https://codivio.online/",
  productType: "Free online tools platform (QR codes, PDF files, images and everyday digital tasks)",
  categories: TOOL_CATEGORIES,
  toolCount: Object.keys(TOOL_SEO).length,
  supportedLanguages: LANGUAGES,
  verifiedSocialProfiles: [],
};

// --- AI-readable tool/category profiles (reuse, not duplication) -----------

export interface AiToolProfile {
  slug: string;
  category: ToolCategory;
  name: string;
  purpose: string;
  description: string;
  primarySearchIntent: string;
  status: "coming-soon";
  supportedLanguages: readonly Language[];
  benefits: string[];
  generalWorkflow: string[];
  useCases: string[];
  relatedTools: string[];
  futureContentOpportunity: string;
}

/**
 * Lightweight tool display name (Phase 3.8) — reads ONLY the already-loaded
 * TOOL_SEO title, never TOOL_CONTENT. Extracted so callers that just need a
 * name/label (breadcrumbs, JSON-LD) don't have to pull in the entire Phase
 * 3.4 content dataset (~1,400 lines, 34 tools × 3 languages of intro/
 * benefits/how-to/use-cases/FAQ) the way getAiToolProfile does. See
 * DECISIONS.md's Phase 3.8 entry — this is the fix for the bundle-size
 * finding recorded in Phase 3.7.
 */
export function getToolDisplayName(slug: string, lang: Language): string | null {
  const seoEntity = TOOL_SEO[slug];
  if (!seoEntity) return null;
  return seoEntity.localized[lang].title.split("–")[0].trim();
}

/** Reads a tool's AI-readable profile from the already-audited Phase 3.1
 * (title/description), 3.3 (keywords/related tools) and 3.4 (content)
 * data. Returns null for any slug not in the real registry — never
 * fabricates a profile for a tool that doesn't exist.
 *
 * Deliberately heavier than getToolDisplayName above — this pulls in the
 * full Phase 3.4 content blueprint (benefits/how-to/use-cases/FAQ/etc.),
 * which is correct for genuine "AI profile" consumers (tests, future rich
 * content rendering) but wrong for anything that only needs a name or a
 * one-line description (see getToolDisplayName, and schema.ts/
 * internal-links.ts, which no longer call this function for that reason). */
export function getAiToolProfile(slug: string, lang: Language): AiToolProfile | null {
  const seoEntity = TOOL_SEO[slug];
  const blueprint = getContentBlueprint(slug, lang);
  if (!seoEntity || !blueprint) return null;

  return {
    slug,
    category: blueprint.category,
    name: getToolDisplayName(slug, lang) ?? "",
    purpose: blueprint.valueProposition,
    description: blueprint.introduction,
    primarySearchIntent: blueprint.primaryKeyword,
    status: "coming-soon",
    supportedLanguages: LANGUAGES,
    benefits: blueprint.benefits,
    generalWorkflow: blueprint.howToSteps,
    useCases: blueprint.useCases,
    relatedTools: blueprint.relatedToolOpportunity,
    futureContentOpportunity: blueprint.futureContentOpportunity,
  };
}

export interface AiCategoryProfile {
  category: ToolCategory;
  purpose: string;
  toolSlugs: string[];
  supportingTopics: string[];
}

export function getAiCategoryProfile(category: ToolCategory, lang: Language): AiCategoryProfile {
  const blueprint = CATEGORY_CONTENT_BLUEPRINT[category];
  const toolSlugs = Object.entries(TOOL_KEYWORDS)
    .filter(([, entry]) => entry.category === category)
    .map(([slug]) => slug);
  return {
    category,
    purpose: blueprint.purpose[lang],
    toolSlugs,
    supportingTopics: blueprint.supportingTopics,
  };
}

// --- Relationship queries (data only — the full internal-linking ENGINE ---
// --- that consumes these belongs to Phase 3.6, not this file) -------------

export function getToolCategory(slug: string): ToolCategory | null {
  return TOOL_KEYWORDS[slug]?.category ?? null;
}

export function getRelatedTools(slug: string): string[] {
  return TOOL_KEYWORDS[slug]?.relatedToolOpportunity ?? [];
}

export function getToolsInCategory(category: ToolCategory): string[] {
  return Object.entries(TOOL_KEYWORDS)
    .filter(([, entry]) => entry.category === category)
    .map(([slug]) => slug);
}

export function getAllToolSlugs(): string[] {
  return Object.keys(TOOL_SEO);
}

export function getAllCategories(): readonly ToolCategory[] {
  return TOOL_CATEGORIES;
}

// --- Deterministic "answer" builders (Section 13) ---------------------------
// Pure string construction from the structured data above — no model call,
// no external API, no chatbot. Each mirrors what a human editor would type
// into an FAQ by hand, just computed instead of copy-pasted so it can never
// drift from the real registry.

export function answerWhatIsCodivio(lang: Language): string {
  const { copy } = { copy: PAGE_SEO.home.localized[lang] };
  return `${SITE_IDENTITY.name} (${SITE_IDENTITY.officialWebsite}) is ${SITE_IDENTITY.productType.toLowerCase()}. ${copy.description}`;
}

export function answerWhatToolsDoesCodivioProvide(lang: Language): string {
  const perCategory = TOOL_CATEGORIES.map((category) => {
    const count = getToolsInCategory(category).length;
    return `${category} (${count})`;
  });
  return `${SITE_IDENTITY.name} provides ${SITE_IDENTITY.toolCount} tools across ${TOOL_CATEGORIES.length} categories: ${perCategory.join(", ")}.`;
}

export function answerWhatIsTool(slug: string, lang: Language): string | null {
  const profile = getAiToolProfile(slug, lang);
  if (!profile) return null;
  return `${profile.name} is a ${profile.category} tool on Codivio. ${profile.description} Status: ${profile.status === "coming-soon" ? "in development, not yet processing files" : profile.status}.`;
}

export function answerToolCategory(slug: string): string | null {
  const category = getToolCategory(slug);
  if (!category) return null;
  return `${slug} belongs to the ${category} category.`;
}

export function answerSupportedLanguages(): string {
  const names = LANGUAGES.map((lang) => LANGUAGE_NATIVE_NAMES[lang]).join(", ");
  return `Codivio supports ${LANGUAGES.length} languages: ${names}.`;
}

export function answerRelatedTools(slug: string): string | null {
  const related = getRelatedTools(slug);
  if (related.length === 0) return null;
  return `Tools related to ${slug}: ${related.join(", ")}.`;
}

export type { ToolContentBlueprint };
