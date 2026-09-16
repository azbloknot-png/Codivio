/**
 * Phase 3.15 SEO Remediation — HTMLRewriter route metadata + JSON-LD.
 *
 * The standing CSR SEO gap (see PROJECT_STATE.md's Phase 3.15 sections):
 * `src/seo/useSeo.ts` sets the real per-route title/description/canonical/
 * robots/OG/Twitter tags and JSON-LD via a React `useEffect`, so a crawler
 * or tool that reads raw HTTP HTML without executing JavaScript sees only
 * the static `index.html` shell's homepage values for every route.
 *
 * This module narrowly closes part of that gap for the exact set of
 * routes already described by `PAGE_SEO`/`TOOL_SEO` (the same sources of
 * truth worker/route-guard.ts already reuses):
 *  - title, meta description, canonical URL, robots directive (Phase 3.15
 *    HTMLRewriter prototype — already live).
 *  - og:title, og:description, og:url, twitter:title, twitter:description
 *    (Phase 3.15 Change Control — this change).
 *  - JSON-LD (Organization + WebSite + WebPage/CollectionPage/AboutPage/
 *    ContactPage, or + BreadcrumbList for a tool page) — built with the
 *    EXACT SAME `buildStandardPageGraph`/`buildToolPageGraph` functions
 *    (`shared/seo/schema.ts`) that `src/App.tsx` already calls
 *    client-side, and serialized with the same `serializeJsonLdGraph`
 *    escaping helper — not a second, independently-maintained schema
 *    implementation (Phase 3.15 Change Control — this change).
 *
 * Explicitly still NOT done here (out of scope, would need separate
 * Change Control):
 *  - `og:image`/`twitter:image`/`og:type`/`twitter:card` — deliberately
 *    left untouched. Every route already shares one sitewide default
 *    image/type (`DEFAULT_OG_IMAGE`, "website", "summary_large_image" —
 *    no per-page image exists anywhere in this codebase), so index.html's
 *    static shell value is already correct for every route; rewriting it
 *    to the identical value would add code with zero behavioral effect.
 *  - `FAQPage` schema — deliberately not built, matching
 *    `shared/seo/schema.ts`'s own existing, documented decision (Google
 *    retired FAQ rich results May 7, 2026; zero verified benefit).
 *  - Published CMS pages (the `pages` table) — `route-guard.ts` already
 *    proves a CMS slug is a *known* route, but this module has no CMS-page
 *    metadata/schema source of its own (that lives in D1, read by
 *    worker/pages.ts#handlePublicPage) and adding a second D1 read here
 *    would be new architecture, not a narrow, low-risk step.
 *  - Real visible page content, SSR, prerendering, or a language-URL
 *    architecture — unchanged, still explicitly out of scope.
 *  - Per-language resolution — see the "language limitation" doc comment
 *    below on DEFAULT_LANGUAGE. Every route is rewritten using the same
 *    fixed default language regardless of the visitor's real preference.
 *  - `www` → apex redirection — a Cloudflare zone/routing concern, not
 *    something this Worker module can safely express; not attempted here.
 */

import { PAGE_SEO, type PageSeoKey } from "../shared/seo/pages";
import { TOOL_SEO } from "../shared/seo/tools";
import { buildCanonicalUrl, buildTitle } from "../shared/seo/site";
import { robotsToString, type SeoEntity } from "../shared/seo/types";
import {
  buildStandardPageGraph,
  buildToolPageGraph,
  JSON_LD_SCRIPT_ID,
  serializeJsonLdGraph,
  type JsonLdGraph,
} from "../shared/seo/schema";
import { DEFAULT_LANGUAGE } from "../shared/i18n/languages";

const PATH_TO_STATIC_ENTITY = new Map<string, SeoEntity>(
  Object.values(PAGE_SEO).map((entity) => [entity.path, entity])
);

const PATH_TO_PAGE_KEY = new Map<string, PageSeoKey>(
  (Object.keys(PAGE_SEO) as PageSeoKey[]).map((key) => [PAGE_SEO[key].path, key])
);

/** Looks up the SeoEntity for a real static page or real tool page path —
 * the same two sources `worker/route-guard.ts#isKnownPublicRoute` already
 * checks first, before it falls through to the D1 CMS-page lookup this
 * module deliberately does not cover (see the module doc comment).
 * `pathname` must already be normalized (no trailing slash). */
export function resolveStaticSeoEntity(pathname: string): SeoEntity | null {
  const staticEntity = PATH_TO_STATIC_ENTITY.get(pathname);
  if (staticEntity) return staticEntity;

  const toolMatch = pathname.match(/^\/tools\/([^/]+)$/);
  if (toolMatch && Object.prototype.hasOwnProperty.call(TOOL_SEO, toolMatch[1])) {
    return TOOL_SEO[toolMatch[1]];
  }

  return null;
}

/**
 * Builds the exact same JSON-LD graph the client already renders after
 * hydration — `buildStandardPageGraph`/`buildToolPageGraph`
 * (`shared/seo/schema.ts`), the same two functions `src/App.tsx` calls for
 * every real route — for a known static page or tool path, using
 * `DEFAULT_LANGUAGE` for the same reason `injectStaticSeoMetadata` does
 * (see its own language-limitation doc comment below).
 *
 * A tool page gets a graph even though it's `noindex,follow`: this matches
 * the existing, already-shipped client-side behavior exactly —
 * `ToolRouteContent` in `src/App.tsx` passes
 * `schemaGraph: buildToolPageGraph(...)` to `usePageMeta` unconditionally,
 * regardless of the tool's robots directive — so raw HTML and the
 * post-hydration DOM never disagree about whether a tool page carries
 * structured data. Returns `null` for anything `resolveStaticSeoEntity`
 * would also reject (CMS pages, unknown paths), and for the rare case
 * where `buildToolPageGraph` itself can't resolve a tool's breadcrumb/
 * display name (the same null-safety it already has for its client caller).
 */
export function resolveJsonLdGraph(pathname: string): JsonLdGraph | null {
  const pageKey = PATH_TO_PAGE_KEY.get(pathname);
  if (pageKey) return buildStandardPageGraph(pageKey, DEFAULT_LANGUAGE);

  const toolMatch = pathname.match(/^\/tools\/([^/]+)$/);
  if (toolMatch) return buildToolPageGraph(toolMatch[1], DEFAULT_LANGUAGE);

  return null;
}

/**
 * Rewrites `<title>`, `meta[name=description]`, `meta[name=robots]`,
 * `link[rel=canonical]`, `meta[property=og:title]`,
 * `meta[property=og:description]`, `meta[property=og:url]`,
 * `meta[name=twitter:title]`, `meta[name=twitter:description]`, and
 * appends a JSON-LD `<script>` into `<head>`, in an already-fetched
 * SPA-shell response, using `DEFAULT_LANGUAGE`'s copy for the resolved
 * route.
 *
 * The JSON-LD script carries `id={JSON_LD_SCRIPT_ID}` — the same id
 * `src/seo/useSeo.ts#upsertJsonLd` looks for via
 * `document.head.querySelector` — so once client-side hydration runs, it
 * finds and updates this same server-rendered tag in place instead of
 * creating a second, duplicate one. Its content is escaped via the shared
 * `serializeJsonLdGraph` helper before being embedded in an HTML string,
 * preventing a literal `</script>` from ever prematurely closing the tag.
 *
 * No-ops (returns `response` completely untouched) when:
 *  - the real `HTMLRewriter` global isn't available — true in this
 *    project's own Vitest/Node test environment (workerd-only API, not
 *    polyfilled here; see worker/route-guard.ts's own header comment for
 *    the project's precedent of documenting a workerd-specific
 *    environment limitation rather than working around it);
 *  - the response isn't HTML (defense in depth — callers only pass a
 *    page-navigation-candidate's 200 response today, which is always the
 *    SPA shell, but this guard costs nothing and matches the task's own
 *    "process only HTML document responses" requirement);
 *  - `pathname` doesn't resolve to a known static page or tool entity
 *    (unknown routes never reach here — route-guard already 404s them —
 *    and CMS pages are out of scope, see the module doc comment). No
 *    JSON-LD script is appended in this case either, since the whole
 *    rewriter is skipped.
 */
export function injectStaticSeoMetadata(response: Response, normalizedPathname: string): Response {
  if (typeof HTMLRewriter === "undefined") return response;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const entity = resolveStaticSeoEntity(normalizedPathname);
  if (!entity) return response;

  /**
   * Language limitation (documented, not solved here): the Worker has no
   * reliable per-request signal for a visitor's chosen language. Language
   * selection (src/i18n/LanguageContext.tsx) lives entirely client-side —
   * `localStorage`, invisible to the Worker — with a D1-configured site
   * default as the fallback layer. No language cookie exists, and
   * `Accept-Language` reflects browser/OS locale, not the visitor's actual
   * in-app choice (and is not read anywhere in this codebase today). Using
   * it here would be a new, separate, unreviewed signal, and a wrong guess
   * would be worse than a consistent, honest default. Every route is
   * therefore rewritten using the same fixed DEFAULT_LANGUAGE ("az") that
   * index.html's own static shell already hardcodes — this keeps the
   * raw-HTML default internally consistent (still one language sitewide,
   * same as before this change) rather than introducing a second,
   * differently-resolved default. Real per-language SEO would require a
   * genuine URL-per-language or cookie-based architecture decision — out
   * of scope for this change.
   */
  const copy = entity.localized[DEFAULT_LANGUAGE];
  const fullTitle = buildTitle(copy.title);
  const canonicalUrl = buildCanonicalUrl(entity.path);
  const robotsValue = robotsToString(entity.robots);

  const jsonLdGraph = resolveJsonLdGraph(normalizedPathname);
  const jsonLdScriptTag = jsonLdGraph
    ? `<script type="application/ld+json" id="${JSON_LD_SCRIPT_ID}">${serializeJsonLdGraph(jsonLdGraph)}</script>`
    : null;

  return new HTMLRewriter()
    .on("title", {
      element(element) {
        element.setInnerContent(fullTitle);
      },
    })
    .on('meta[name="description"]', {
      element(element) {
        element.setAttribute("content", copy.description);
      },
    })
    .on('meta[name="robots"]', {
      element(element) {
        element.setAttribute("content", robotsValue);
      },
    })
    .on('link[rel="canonical"]', {
      element(element) {
        element.setAttribute("href", canonicalUrl);
      },
    })
    .on('meta[property="og:title"]', {
      element(element) {
        element.setAttribute("content", fullTitle);
      },
    })
    .on('meta[property="og:description"]', {
      element(element) {
        element.setAttribute("content", copy.description);
      },
    })
    .on('meta[property="og:url"]', {
      element(element) {
        element.setAttribute("content", canonicalUrl);
      },
    })
    .on('meta[name="twitter:title"]', {
      element(element) {
        element.setAttribute("content", fullTitle);
      },
    })
    .on('meta[name="twitter:description"]', {
      element(element) {
        element.setAttribute("content", copy.description);
      },
    })
    .on("head", {
      element(element) {
        if (jsonLdScriptTag) element.append(jsonLdScriptTag, { html: true });
      },
    })
    .transform(response);
}
