/**
 * Phase 3.15 SEO Remediation — HTMLRewriter prototype.
 *
 * The standing CSR SEO gap (see PROJECT_STATE.md's Phase 3.15 sections):
 * `src/seo/useSeo.ts` sets the real per-route title/description/canonical/
 * robots/OG tags via a React `useEffect`, so a crawler or tool that reads
 * raw HTTP HTML without executing JavaScript sees only the static
 * `index.html` shell's homepage values for every route.
 *
 * This module narrowly closes part of that gap — title, meta description,
 * canonical URL, robots directive, and OG title/description only, for the
 * exact set of routes already described by `PAGE_SEO`/`TOOL_SEO` (the same
 * sources of truth worker/route-guard.ts already reuses) — without any
 * SSR, prerendering, JSON-LD injection, or real page content. It is a
 * prototype: see the Phase 3.15 HTMLRewriter handoff report for the
 * Change Control decision on whether this ships to real traffic.
 *
 * Explicitly NOT done here (out of scope for this step, would need
 * separate Change Control per the task that produced this file):
 *  - JSON-LD, og:locale, og:url, Twitter tags, or any real page content —
 *    Step 5 of the task explicitly lists only the five fields below.
 *  - Published CMS pages (the `pages` table) — `route-guard.ts` already
 *    proves a CMS slug is a *known* route, but this module has no CMS-page
 *    metadata source of its own (that lives in D1, read by
 *    worker/pages.ts#handlePublicPage) and adding a second D1 read here to
 *    fetch it would be new architecture, not a narrow prototype step.
 *  - Per-language resolution — see the "language limitation" doc comment
 *    below on DEFAULT_LANGUAGE. Every route is rewritten using the same
 *    fixed default language regardless of the visitor's real preference.
 */

import { PAGE_SEO } from "../shared/seo/pages";
import { TOOL_SEO } from "../shared/seo/tools";
import { buildCanonicalUrl, buildTitle } from "../shared/seo/site";
import { robotsToString, type SeoEntity } from "../shared/seo/types";
import { DEFAULT_LANGUAGE } from "../shared/i18n/languages";

const PATH_TO_STATIC_ENTITY = new Map<string, SeoEntity>(
  Object.values(PAGE_SEO).map((entity) => [entity.path, entity])
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
 * Rewrites `<title>`, `meta[name=description]`, `meta[name=robots]`,
 * `link[rel=canonical]`, `meta[property=og:title]` and
 * `meta[property=og:description]` in an already-fetched SPA-shell
 * response, using `DEFAULT_LANGUAGE`'s copy for the resolved route.
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
 *    and CMS pages are out of scope, see the module doc comment).
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
   * of scope for this prototype.
   */
  const copy = entity.localized[DEFAULT_LANGUAGE];
  const fullTitle = buildTitle(copy.title);
  const canonicalUrl = buildCanonicalUrl(entity.path);
  const robotsValue = robotsToString(entity.robots);

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
    .transform(response);
}
