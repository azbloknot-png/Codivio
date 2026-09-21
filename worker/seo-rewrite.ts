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
 *  - A real, visible H1 and one introduction paragraph, appended into
 *    `#root` (Phase 3.15 Change Control: "critical content injection" —
 *    this change). This is deliberately NOT full content parity — no FAQ,
 *    no benefits/how-to/use-cases lists, no related tools, no blog, no
 *    CMS. It is safe specifically because `src/main.tsx` calls
 *    `createRoot(...).render(...)`, never `hydrateRoot(...)` — React does
 *    not reconcile against `#root`'s existing children, it simply replaces
 *    them once it mounts, so there is no hydration-mismatch risk (verified
 *    by reading `src/main.tsx`).
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
 *
 * Phase 3.15-C adds one more source, checked BEFORE the compile-time
 * default: an optional per-(entity, language) row in the new
 * `seo_overrides` D1 table (see worker/seo-overrides.ts,
 * shared/seo-overrides.ts, migrations/0010_seo_overrides.sql). It affects
 * ONLY `<title>`/meta description/og:title/og:description/twitter:title/
 * twitter:description — the exact fields Admin can edit
 * (AdminSeoPage.tsx). It deliberately does NOT affect the injected H1/
 * intro paragraph (`resolveCriticalContent`) or the JSON-LD graph's
 * name/description (`resolveJsonLdGraph`), which still always reflect the
 * compile-time default — a known, documented inconsistency risk (editing
 * a title override without a matching future H1/JSON-LD override leaves
 * the visible H1 and the meta title saying different things) accepted for
 * this phase as explicit "future extensibility" scope, not solved here.
 * The D1 lookup is wrapped so ANY failure (D1 unavailable, no row, a
 * transient error) transparently falls back to the untouched compile-time
 * default — the existing, already-proven rendering behavior is never at
 * risk of breaking because of this addition.
 */

import { PAGE_SEO, type PageSeoKey } from "../shared/seo/pages";
import { TOOL_SEO } from "../shared/seo/tools";
import { buildCanonicalUrl, buildTitle } from "../shared/seo/site";
import { robotsToString, type SeoEntity, type LocalizedSeoCopy } from "../shared/seo/types";
import {
  buildStandardPageGraph,
  buildToolPageGraph,
  JSON_LD_SCRIPT_ID,
  serializeJsonLdGraph,
  type JsonLdGraph,
} from "../shared/seo/schema";
import { getToolDisplayName } from "../shared/seo/ai";
import { TOOL_INTRODUCTIONS } from "../shared/seo/tool-intro";
import { DEFAULT_LANGUAGE } from "../shared/i18n/languages";
import type { SeoOverrideEntityType } from "../shared/seo-overrides";
import { fetchActiveOverride } from "./seo-overrides";
import type { Env } from "./types";

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

export interface EntityIdentity {
  entityType: SeoOverrideEntityType;
  entityKey: string;
}

/** Identifies which (entityType, entityKey) a path corresponds to, for the
 * `seo_overrides` lookup (Phase 3.15-C) — reuses the exact same two
 * sources `resolveStaticSeoEntity` does, so a path resolves an identity if
 * and only if it also resolves an entity (never one without the other). */
export function resolveEntityIdentity(pathname: string): EntityIdentity | null {
  const pageKey = PATH_TO_PAGE_KEY.get(pathname);
  if (pageKey) return { entityType: "page", entityKey: pageKey };

  const toolMatch = pathname.match(/^\/tools\/([^/]+)$/);
  if (toolMatch && Object.prototype.hasOwnProperty.call(TOOL_SEO, toolMatch[1])) {
    return { entityType: "tool", entityKey: toolMatch[1] };
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

/** Escapes the 3 characters that matter for safely embedding plain text
 * inside HTML element content (as opposed to inside a `<script>` JSON
 * payload, which `serializeJsonLdGraph` handles separately): `&`, `<`,
 * `>`. Real, live example this actually matters for: `PAGE_SEO.home`'s own
 * title is `"Codivio – Free Online Tools for QR Codes, PDFs & Images"` —
 * the literal `&` must become `&amp;` to keep the generated HTML valid,
 * not just "probably fine" under lenient browser parsing. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface CriticalContent {
  h1: string;
  intro: string;
}

/**
 * Resolves the real, visible H1 + one introduction paragraph for a known
 * static page or tool route — reusing existing, already-reviewed data
 * only, never inventing new copy:
 *  - Static pages: `PAGE_SEO[key]`'s own title/description (the exact
 *    values already used for `<title>`/`meta description`/`og:title`/
 *    `og:description` on the same route).
 *  - Tool pages: `getToolDisplayName` (`shared/seo/ai.ts`) for the H1 —
 *    the same lightweight, TOOL_SEO-only accessor `buildToolPageGraph`
 *    already uses, and the same plain tool name (title text before the
 *    "–") the client actually renders as `<h1>{tool.name}</h1>` in
 *    `src/pages/ToolPage.tsx` — plus `TOOL_INTRODUCTIONS[slug]`
 *    (`shared/seo/tool-intro.ts`, extracted from `shared/seo/content.ts`'s
 *    existing Phase 3.4 blueprint specifically so the Worker doesn't need
 *    to import that file's full ~1900-line dataset — see tool-intro.ts's
 *    own header comment).
 *
 * Known, documented limitation: a small number of static pages currently
 * render a different, hardcoded-English on-page `<h1>` client-side (a
 * pre-existing inconsistency in `src/App.tsx`, unrelated to this change
 * and out of this task's scope to fix) — the server-injected H1 here uses
 * the already-canonical `PAGE_SEO` title instead, which is consistent with
 * this route's own raw-HTML `<title>`/`og:title`, even where it briefly
 * differs from the pre-existing client H1 text until `createRoot()`
 * replaces it.
 */
export function resolveCriticalContent(pathname: string): CriticalContent | null {
  const pageKey = PATH_TO_PAGE_KEY.get(pathname);
  if (pageKey) {
    const copy = PAGE_SEO[pageKey].localized[DEFAULT_LANGUAGE];
    return { h1: copy.title, intro: copy.description };
  }

  const toolMatch = pathname.match(/^\/tools\/([^/]+)$/);
  if (toolMatch) {
    const slug = toolMatch[1];
    const h1 = getToolDisplayName(slug, DEFAULT_LANGUAGE);
    const intro = TOOL_INTRODUCTIONS[slug]?.[DEFAULT_LANGUAGE];
    if (h1 && intro) return { h1, intro };
  }

  return null;
}

/**
 * Rewrites `<title>`, `meta[name=description]`, `meta[name=robots]`,
 * `link[rel=canonical]`, `meta[property=og:title]`,
 * `meta[property=og:description]`, `meta[property=og:url]`,
 * `meta[name=twitter:title]`, `meta[name=twitter:description]`, and
 * appends a JSON-LD `<script>` into `<head>` plus a real `<h1>`+`<p>` into
 * `#root`, in an already-fetched SPA-shell response, using
 * `DEFAULT_LANGUAGE`'s copy for the resolved route.
 *
 * The `#root` content is appended, not used to replace anything — `#root`
 * is empty in `index.html`, so this is the page's only visible content
 * until `createRoot()` mounts and replaces it (see `resolveCriticalContent`
 * for why this carries no hydration risk here).
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
 *
 * Now `async` (Phase 3.15-C) and takes `env` so it can look up an active
 * `seo_overrides` row before falling back to the compile-time default —
 * see the module doc comment for the override lookup's safety guarantees.
 */
export async function injectStaticSeoMetadata(response: Response, normalizedPathname: string, env: Env): Promise<Response> {
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
   * therefore rewritten using the same fixed DEFAULT_LANGUAGE ("en") that
   * index.html's own static shell already hardcodes — this keeps the
   * raw-HTML default internally consistent (still one language sitewide,
   * same as before this change) rather than introducing a second,
   * differently-resolved default. Real per-language SEO would require a
   * genuine URL-per-language or cookie-based architecture decision — out
   * of scope for this change. The Phase 3.15-C override lookup below is
   * subject to the exact same limitation — it looks up an override for
   * DEFAULT_LANGUAGE only, same as everything else in this function.
   */
  let copy: LocalizedSeoCopy = entity.localized[DEFAULT_LANGUAGE];
  const identity = resolveEntityIdentity(normalizedPathname);
  if (identity) {
    try {
      const override = await fetchActiveOverride(env, identity.entityType, identity.entityKey, DEFAULT_LANGUAGE);
      if (override) {
        copy = { title: override.title, description: override.description };
      }
    } catch {
      // D1 unavailable, table missing, or any other failure — silently
      // keep the compile-time default. This is the one place in this
      // function allowed to swallow an error: the whole point of an
      // "override" is that its absence (for any reason) must be
      // indistinguishable from "no override was ever created".
    }
  }
  const fullTitle = buildTitle(copy.title);
  const canonicalUrl = buildCanonicalUrl(entity.path);
  const robotsValue = robotsToString(entity.robots);

  const jsonLdGraph = resolveJsonLdGraph(normalizedPathname);
  const jsonLdScriptTag = jsonLdGraph
    ? `<script type="application/ld+json" id="${JSON_LD_SCRIPT_ID}">${serializeJsonLdGraph(jsonLdGraph)}</script>`
    : null;

  const criticalContent = resolveCriticalContent(normalizedPathname);
  const criticalContentHtml = criticalContent
    ? `<h1>${escapeHtml(criticalContent.h1)}</h1><p>${escapeHtml(criticalContent.intro)}</p>`
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
    .on("#root", {
      element(element) {
        if (criticalContentHtml) element.append(criticalContentHtml, { html: true });
      },
    })
    .transform(response);
}
