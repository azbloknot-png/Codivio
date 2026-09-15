import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import {
  buildCanonicalUrl,
  buildTitle,
  DEFAULT_OG_IMAGE,
  isSafeAbsoluteHttpsUrl,
  OG_LOCALE,
  robotsToString,
  ROBOTS_INDEX_FOLLOW,
  ROBOTS_NOINDEX_NOFOLLOW,
  SITE_NAME,
  type SeoRobots,
} from "../../shared/seo";
import type { JsonLdGraph } from "../../shared/seo/schema";

/**
 * Codivio SEO — page-level <head> effect (Phase 3.1).
 *
 * Sets title, meta description, canonical link, robots meta, Open
 * Graph and Twitter Card tags, and <html lang>, for whatever page calls
 * it. Every tag is created/updated via setAttribute — never innerHTML or
 * dangerouslySetInnerHTML (Phase 3.1 Step 23) — so there is no HTML
 * injection surface even if a title/description ever originated from
 * admin-supplied content (CMS pages).
 *
 * Robots default: any /admin/* route is noindex,nofollow automatically
 * (defense in depth on top of robots.txt's Disallow: /admin/), everything
 * else defaults to index,follow unless the caller passes an explicit
 * override (tool pages, 404, and non-indexable CMS pages all do).
 */
export interface UsePageMetaOptions {
  robots?: SeoRobots;
  /** An admin-supplied canonical URL (e.g. a CMS page's canonicalUrl). Only
   * used if it's a well-formed absolute https:// URL; otherwise the
   * computed canonical for the current path is used instead. */
  canonicalOverride?: string;
  /** JSON-LD structured data (Phase 3.7) for this page, built by
   * shared/seo/schema.ts. Omitted entirely on /admin routes regardless of
   * what's passed in (defense in depth — see computeDefaultRobots below;
   * no admin page should ever call this with a schema anyway). */
  schemaGraph?: JsonLdGraph | null;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

function computeDefaultRobots(pathname: string): SeoRobots {
  if (pathname.startsWith("/admin")) return ROBOTS_NOINDEX_NOFOLLOW;
  return ROBOTS_INDEX_FOLLOW;
}

const JSON_LD_SCRIPT_ID = "codivio-jsonld";

/**
 * Safely injects/updates/removes the page's JSON-LD script tag.
 *
 * Uses document.createElement("script") + a direct .textContent
 * assignment — never innerHTML, never string-templated into a parent's
 * innerHTML, and never dangerouslySetInnerHTML. Setting .textContent on
 * an element already attached via the DOM API writes the text node's data
 * directly; it is not re-parsed as HTML, so a literal "</script>" inside a
 * JSON value cannot prematurely close the tag the way it could if this
 * were built via an HTML string. The escape below is an extra, cheap
 * defensive layer on top of that (belt-and-suspenders), not a requirement
 * for correctness.
 */
function upsertJsonLd(graph: JsonLdGraph | null | undefined, pathname: string) {
  const existing = document.head.querySelector<HTMLScriptElement>(`script#${JSON_LD_SCRIPT_ID}`);

  // Never emit structured data on /admin routes, regardless of what a
  // caller passes — matches computeDefaultRobots' own admin exclusion.
  if (!graph || pathname.startsWith("/admin")) {
    existing?.remove();
    return;
  }

  const json = JSON.stringify(graph).replace(/</g, "\\u003c");
  let script = existing;
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = JSON_LD_SCRIPT_ID;
    document.head.appendChild(script);
  }
  script.textContent = json;
}

export function usePageMeta(title: string, description: string, options?: UsePageMetaOptions): void {
  const { language } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname;
    const robots = options?.robots ?? computeDefaultRobots(pathname);
    const canonicalUrl =
      options?.canonicalOverride && isSafeAbsoluteHttpsUrl(options.canonicalOverride)
        ? options.canonicalOverride
        : buildCanonicalUrl(pathname);
    const fullTitle = buildTitle(title);

    document.title = fullTitle;
    document.documentElement.lang = language;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robotsToString(robots));
    upsertLink("canonical", canonicalUrl);

    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", DEFAULT_OG_IMAGE);
    upsertMeta("property", "og:locale", OG_LOCALE[language]);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", DEFAULT_OG_IMAGE);

    upsertJsonLd(options?.schemaGraph, pathname);
    // Intentionally keyed on the primitive robots/canonical fields rather
    // than `options` itself, so passing a fresh object literal each render
    // (the common call-site shape) doesn't re-run this effect needlessly.
    // schemaGraph itself is a fresh object per render too, so it's
    // intentionally left out of the deps array — JSON.stringify inside
    // upsertJsonLd is cheap and always reflects the latest value passed.
  }, [title, description, language, location.pathname, options?.robots?.index, options?.robots?.follow, options?.canonicalOverride]);
}
