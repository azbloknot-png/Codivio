import { TRANSLATIONS, type Language } from "../i18n";
import { TOOL_SEO, PAGE_SEO } from "./index";
import { getToolDisplayName, getToolCategory, getRelatedTools, getToolsInCategory, type ToolCategory } from "./ai";
import { TOOL_KEYWORDS } from "./keywords";

/**
 * Codivio internal-linking architecture (Phase 3.6).
 *
 * Pure data/functions — reuses Phase 3.1 (`TOOL_SEO`/`PAGE_SEO`), Phase 3.3
 * (`TOOL_KEYWORDS.relatedToolOpportunity`), and Phase 3.5 (`ai.ts`'s
 * relationship queries) rather than storing a second relationship graph.
 * No new translation strings were added — anchor text for the site's own
 * pages reuses the existing `shared/i18n` dictionaries (`site.navTools`
 * etc.); tool anchor text reuses `getToolDisplayName(slug, lang)` (Phase
 * 3.8 — a lightweight TOOL_SEO-only lookup; this file originally called
 * the heavier `getAiToolProfile`, which pulled in Phase 3.4's entire
 * TOOL_CONTENT dataset just for a name, a real bundle-size defect found
 * and fixed in Phase 3.8 once this module was actually wired into
 * rendering by Phase 3.7's schema.ts — see DECISIONS.md's Phase 3.8 entry).
 *
 * Originally measured at 0-byte bundle impact in Phase 3.6 (nothing
 * imported it yet); now imported by Phase 3.7's schema.ts for real
 * rendering, so its own dependency weight matters and was deliberately
 * kept light in this fix.
 *
 * Route safety: `isLinkableRoute` is the single gate every link path in
 * this file passes through. It only ever returns true for "/", the 10 real
 * static pages, "/tools", and "/tools/:slug" for a slug that actually
 * exists in TOOL_SEO — /admin, /api, and any nonexistent route always
 * return false, so this module can never produce a link into a private or
 * fake route by construction, not just by convention.
 */

const REAL_STATIC_PAGE_PATHS: readonly string[] = Object.values(PAGE_SEO).map((entity) => entity.path);

export function isLinkableRoute(path: string): boolean {
  if (path.startsWith("/admin") || path.startsWith("/api")) return false;
  if (REAL_STATIC_PAGE_PATHS.includes(path)) return true;
  if (path.startsWith("/tools/")) {
    const slug = path.slice("/tools/".length);
    return slug.length > 0 && slug in TOOL_SEO;
  }
  return false;
}

export type LinkPriority = "primary" | "secondary" | "contextual";

export interface InternalLink {
  /** Real, navigable path, or null if this is a documented future
   * opportunity with no route to link to yet — never a fake URL. */
  path: string | null;
  anchorText: string;
  priority: LinkPriority;
  isLinkable: boolean;
}

function toolLink(slug: string, lang: Language, priority: LinkPriority): InternalLink | null {
  const name = getToolDisplayName(slug, lang);
  if (!name) return null;
  const path = `/tools/${slug}`;
  return { path, anchorText: name, priority, isLinkable: isLinkableRoute(path) };
}

// --- Tool → related tools (Phase 3.3 data, reused, not duplicated) --------

/** Deterministic, category-aware, self-reference-free by construction
 * (filters the tool's own slug out even though Phase 3.3's source data
 * already contains none — defense in depth, not a correction). Ordered
 * list preserved from keywords.ts, capped implicitly by however many
 * Phase 3.3 assigned (2-3 per tool) rather than padded to an arbitrary
 * count — a tool with fewer genuinely relevant related tools keeps fewer
 * links rather than having unrelated ones forced in. */
export function getRelatedToolLinks(slug: string, lang: Language): InternalLink[] {
  const related = getRelatedTools(slug).filter((r) => r !== slug);
  return related
    .map((relatedSlug) => toolLink(relatedSlug, lang, "primary"))
    .filter((link): link is InternalLink => link !== null);
}

// --- Category → tools (Phase 3.3 category assignment, reused) -------------

export function getCategoryToolLinks(category: ToolCategory, lang: Language): InternalLink[] {
  return getToolsInCategory(category)
    .map((slug) => toolLink(slug, lang, "secondary"))
    .filter((link): link is InternalLink => link !== null);
}

// --- Site-level links (reuse existing i18n dictionaries, no new strings) --

export function getToolsIndexLink(lang: Language): InternalLink {
  const t = TRANSLATIONS[lang];
  return { path: "/tools", anchorText: t.site.navTools, priority: "primary", isLinkable: true };
}

export function getHomeLink(lang: Language): InternalLink {
  const t = TRANSLATIONS[lang];
  return { path: "/", anchorText: t.site.navHome, priority: "contextual", isLinkable: true };
}

// --- Breadcrumb (Home -> Tools -> Category [unlinkable, no route yet] ->  --
// --- current tool [unlinkable, current page]) ------------------------------

export interface BreadcrumbEntry {
  label: string;
  /** null = not a link (either no route exists yet, e.g. category, or this
   * is the current page, e.g. the tool itself) — rendered as plain text,
   * never a broken href. */
  path: string | null;
}

/** Category has no dedicated route today (confirmed: src/App.tsx has no
 * /tools/category/* or /tools/qr-style route) — its breadcrumb segment is
 * intentionally non-linkable text, not a fabricated URL. Phase 3.8+ can
 * turn it into a real link the day a category route exists, by changing
 * only this one function. */
export function getToolBreadcrumb(slug: string, lang: Language): BreadcrumbEntry[] | null {
  const name = getToolDisplayName(slug, lang);
  const category = getToolCategory(slug);
  if (!name || !category) return null;
  const t = TRANSLATIONS[lang];
  return [
    { label: t.site.navHome, path: "/" },
    { label: t.site.navTools, path: "/tools" },
    { label: category, path: null },
    { label: name, path: null },
  ];
}

// --- Future content opportunities (Phase 3.3/3.4 data, represented as -----
// --- non-linkable metadata — no blog exists, so no fake URL is created) ---

export interface FutureContentOpportunity {
  kind: "how-to" | "educational" | "comparison";
  description: string;
  isLinkable: false;
  path: null;
}

/** Reuses Phase 3.3's futureContentOpportunity string verbatim (English —
 * consistent with that field's existing editorial-only scope, see Phase
 * 3.4's DECISIONS.md entry) rather than inventing new per-language phrasing
 * for content that doesn't exist yet to link to. */
export function getFutureContentOpportunities(slug: string): FutureContentOpportunity[] {
  const entry = TOOL_KEYWORDS[slug];
  if (!entry) return [];
  return [
    { kind: "how-to", description: entry.futureContentOpportunity, isLinkable: false, path: null },
  ];
}

// --- Relationship coverage helpers (used by tests and future phases) ------

export function getAllLinkableToolSlugs(): string[] {
  return Object.keys(TOOL_SEO);
}
