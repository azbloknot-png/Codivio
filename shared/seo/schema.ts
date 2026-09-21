import type { Language } from "../i18n/languages";
import { PAGE_SEO, TOOL_SEO, CANONICAL_DOMAIN, buildCanonicalUrl, type PageSeoKey } from "./index";
import { SITE_IDENTITY, getToolDisplayName } from "./ai";
import { getToolBreadcrumb, type BreadcrumbEntry } from "./internal-links";

/**
 * Codivio Schema.org / JSON-LD architecture (Phase 3.7).
 *
 * Every builder here reads from already-audited data — Phase 3.1's
 * PAGE_SEO/TOOL_SEO (titles, descriptions, canonical paths), Phase 3.5's
 * SITE_IDENTITY, and Phase 3.6's getToolBreadcrumb — never a second,
 * independently maintained copy of a fact already established elsewhere.
 *
 * Schema-type decisions made this phase, and why (see DECISIONS.md for
 * the full reasoning):
 *  - Organization/WebSite: implemented, factual only (name/url/logo;
 *    no sameAs — SITE_IDENTITY.verifiedSocialProfiles is empty, no
 *    founding date/address/phone/awards/ratings exist to include).
 *  - WebSite has NO SearchAction: the homepage's search input filters
 *    tools client-side with no query-navigable URL — SearchAction would
 *    describe a capability that doesn't exist.
 *  - WebPage (+ CollectionPage for /tools, AboutPage for /about,
 *    ContactPage for /contact): implemented for all 9 static pages plus
 *    the homepage — exact-match subtypes only where genuinely accurate,
 *    generic WebPage everywhere else.
 *  - Tool pages use plain WebPage, NOT WebApplication/SoftwareApplication.
 *    Verified via current (2026) Google documentation that
 *    SoftwareApplication's rich-result eligibility requires
 *    `offers.price` and either `aggregateRating` or `review` — Codivio's
 *    tools are "coming soon" placeholders with no real pricing/ratings,
 *    so satisfying those properties honestly is impossible today, and
 *    fabricating them is explicitly forbidden. WebPage avoids implying a
 *    working installable/functional application that doesn't exist yet.
 *  - BreadcrumbList (tool pages only): reuses Phase 3.6's
 *    getToolBreadcrumb, but ONLY the segments with a real path are
 *    included (Home, Tools) plus the current page's name with no item
 *    URL (standard practice for the last breadcrumb entry) — the
 *    category segment is DROPPED from the schema entirely, since it has
 *    no real route and Schema.org's BreadcrumbList ListItem is meant to
 *    represent real navigable hierarchy, not a label with no destination.
 *  - FAQPage: DEFERRED / NOT APPLICABLE. Verified via current (2026)
 *    search: Google fully retired FAQ rich results in Search as of
 *    May 7, 2026, for every site (not just previously-restricted
 *    authoritative sites) — the schema vocabulary itself still exists but
 *    produces no search-appearance benefit for anyone. Implementing it
 *    now would add maintenance surface with zero verified benefit.
 *  - Article: DEFERRED / NOT APPLICABLE. /blog is an index-only page
 *    (confirmed: no /blog/:slug route exists, every post preview links
 *    back to /blog itself) — there is no real per-article entity/URL for
 *    Article schema to describe.
 */

export interface JsonLdOrganization {
  "@type": "Organization";
  "@id": string;
  name: string;
  url: string;
  logo?: string;
}

export interface JsonLdWebSite {
  "@type": "WebSite";
  "@id": string;
  name: string;
  url: string;
  publisher: { "@id": string };
  inLanguage: Language;
}

export interface JsonLdBreadcrumbItem {
  "@type": "ListItem";
  position: number;
  name: string;
  item?: string;
}

export interface JsonLdBreadcrumbList {
  "@type": "BreadcrumbList";
  itemListElement: JsonLdBreadcrumbItem[];
}

export interface JsonLdWebPage {
  "@type": "WebPage" | "CollectionPage" | "AboutPage" | "ContactPage";
  "@id": string;
  url: string;
  name: string;
  description: string;
  isPartOf: { "@id": string };
  inLanguage: Language;
  breadcrumb?: JsonLdBreadcrumbList;
}

export type JsonLdGraphNode = JsonLdOrganization | JsonLdWebSite | JsonLdWebPage;

export interface JsonLdGraph {
  "@context": "https://schema.org";
  "@graph": JsonLdGraphNode[];
}

/** The DOM id for the page's JSON-LD `<script>` tag, shared between the
 * client (`src/seo/useSeo.ts`) and the server-side Worker rewrite
 * (`worker/seo-rewrite.ts`, Phase 3.15 Change Control). Using the SAME id
 * in both places lets `useSeo.ts`'s `upsertJsonLd` find and update the tag
 * the Worker already rendered server-side, instead of creating a second,
 * duplicate script element once client-side hydration runs. */
export const JSON_LD_SCRIPT_ID = "codivio-jsonld";

/** Serializes a JSON-LD graph for safe embedding inside a
 * `<script type="application/ld+json">` tag. Escaping every `<` prevents a
 * literal `</script>` sequence from ever appearing in the output (wherever
 * it would fall inside the JSON string content), which would otherwise
 * prematurely close the script element. Shared by both the client
 * (`useSeo.ts`) and the Worker so there is exactly one implementation of
 * this escape, not two independently-maintained copies. */
export function serializeJsonLdGraph(graph: JsonLdGraph): string {
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}

const ORGANIZATION_ID = `${CANONICAL_DOMAIN}#organization`;
const WEBSITE_ID = `${CANONICAL_DOMAIN}#website`;

export function buildOrganizationNode(): JsonLdOrganization {
  const node: JsonLdOrganization = {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_IDENTITY.name,
    url: SITE_IDENTITY.officialWebsite,
  };
  // Logo is a real, existing asset — included because it's verifiable,
  // not because Organization schema "should" have one.
  node.logo = `${CANONICAL_DOMAIN}/assets/branding/codivio-logo.png`;
  // SITE_IDENTITY.verifiedSocialProfiles is empty today — sameAs is
  // omitted entirely rather than emitted as an empty array.
  return node;
}

export function buildWebSiteNode(lang: Language): JsonLdWebSite {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_IDENTITY.name,
    url: SITE_IDENTITY.officialWebsite,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: lang,
  };
}

/** Exact-match subtypes only where genuinely accurate; every other real
 * static page gets generic WebPage. Deliberately a small, explicit map
 * rather than inferring a subtype from the page key's name. */
const PAGE_SCHEMA_TYPE: Partial<Record<PageSeoKey, JsonLdWebPage["@type"]>> = {
  tools: "CollectionPage",
  about: "AboutPage",
  contact: "ContactPage",
};

/** Breadcrumb for a static page — opt-in, per page key, deliberately NOT
 * added to every standard page (most have no meaningful hierarchy beyond
 * "Home"). Added for "sitemap" (Site Map Phase — SEO follow-up) and
 * "robots" (Robots Policy Page follow-up) so each page's schema matches
 * its own real, visible on-page breadcrumb nav; the labels are plain
 * English, matching each page's own English-only content decision (see
 * src/App.tsx's SitemapPage/RobotsPage), not translated per `lang` — same
 * precedent as ToolsPage/BlogPage's hardcoded-English visible body text
 * already has, regardless of the site's active language. */
const PAGE_BREADCRUMB: Partial<Record<PageSeoKey, BreadcrumbEntry[]>> = {
  sitemap: [
    { label: "Home", path: "/" },
    { label: "Site Map", path: null },
  ],
  robots: [
    { label: "Home", path: "/" },
    { label: "Robots Policy", path: null },
  ],
};

/** Exposes the same breadcrumb data `buildStandardPageGraph` uses for its
 * JSON-LD, so a page's own visible breadcrumb nav (e.g. SitemapPage in
 * src/App.tsx) can render the identical entries — one source of truth,
 * never two independently-maintained breadcrumb lists that could drift. */
export function getStandardPageBreadcrumb(pageKey: PageSeoKey): BreadcrumbEntry[] | undefined {
  return PAGE_BREADCRUMB[pageKey];
}

export function buildStandardPageGraph(pageKey: PageSeoKey, lang: Language): JsonLdGraph {
  const entity = PAGE_SEO[pageKey];
  const copy = entity.localized[lang];
  const url = buildCanonicalUrl(entity.path);
  const breadcrumbEntries = PAGE_BREADCRUMB[pageKey];
  const webPage: JsonLdWebPage = {
    "@type": PAGE_SCHEMA_TYPE[pageKey] ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: copy.title,
    description: copy.description,
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: lang,
    ...(breadcrumbEntries ? { breadcrumb: toBreadcrumbList(breadcrumbEntries) } : {}),
  };
  return {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationNode(), buildWebSiteNode(lang), webPage],
  };
}

/** Converts Phase 3.6's breadcrumb data into a schema-safe BreadcrumbList:
 * only segments with a real `path` become a linked ListItem; the final
 * (current-page) entry is included with just a name, no `item` URL, which
 * is the standard, spec-compliant way to represent "you are here" without
 * linking a page to itself. Any segment with path=null that is NOT the
 * last entry (i.e. the un-routed category label) is dropped entirely —
 * never converted into a fabricated URL. */
function toBreadcrumbList(entries: BreadcrumbEntry[]): JsonLdBreadcrumbList {
  const linkable = entries.filter((entry, index) => entry.path !== null || index === entries.length - 1);
  const itemListElement: JsonLdBreadcrumbItem[] = linkable.map((entry, index) => {
    const item: JsonLdBreadcrumbItem = { "@type": "ListItem", position: index + 1, name: entry.label };
    if (entry.path) item.item = buildCanonicalUrl(entry.path);
    return item;
  });
  return { "@type": "BreadcrumbList", itemListElement };
}

/** Uses TOOL_SEO's own meta description (Phase 3.1) rather than Phase 3.4's
 * content-blueprint introduction — both are accurate, but this keeps
 * buildToolPageGraph's entire dependency graph limited to TOOL_SEO +
 * getToolDisplayName/getToolBreadcrumb (all lightweight), avoiding the
 * Phase 3.4 TOOL_CONTENT dataset that caused Phase 3.7's measured
 * bundle-size regression (see DECISIONS.md's Phase 3.8 entry). It also
 * keeps the schema description consistent with what search engines already
 * see in <meta name="description"> for the same page — one fact, one
 * source, instead of two independently-worded descriptions of the same
 * tool. */
export function buildToolPageGraph(slug: string, lang: Language): JsonLdGraph | null {
  const seoEntity = TOOL_SEO[slug];
  const name = getToolDisplayName(slug, lang);
  const breadcrumbEntries = getToolBreadcrumb(slug, lang);
  if (!seoEntity || !name || !breadcrumbEntries) return null;

  const url = buildCanonicalUrl(seoEntity.path);
  const webPage: JsonLdWebPage = {
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name,
    description: seoEntity.localized[lang].description,
    isPartOf: { "@id": WEBSITE_ID },
    inLanguage: lang,
    breadcrumb: toBreadcrumbList(breadcrumbEntries),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [buildOrganizationNode(), buildWebSiteNode(lang), webPage],
  };
}
