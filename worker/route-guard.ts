/**
 * Phase 3.15 SEO Remediation — soft-404 fix.
 *
 * `wrangler.jsonc`'s `assets.not_found_handling` is `"single-page-application"`
 * — Cloudflare's own documented, correct setting for a client-side-routed
 * SPA like this one: any request that doesn't match a real static file gets
 * `index.html` with HTTP 200, by design, so React Router can render the
 * right page client-side. Switching this to `"404-page"` would be WRONG —
 * every real client-side route (`/tools`, `/faq`, `/tools/:slug`, …) is
 * also not a real static file, so it would 404 every real page too.
 *
 * The actual gap: a genuinely nonexistent page (no matching client route at
 * all) also got 200 — an unintentional "soft 404" that misrepresents a
 * missing page as valid content to anything reading the HTTP status alone
 * (most non-Google crawlers/tools, and any status-code-based check).
 *
 * `isKnownPublicRoute()` answers the exact same question the client router
 * (`src/App.tsx`) already answers when deciding whether to render real
 * content or `NotFoundPage` — reusing the same source-of-truth data
 * (`PAGE_SEO`, `TOOL_SEO`, and the same published-pages D1 query
 * `worker/pages.ts#handlePublicPage` already uses) rather than a second,
 * competing route list that could drift out of sync. `worker/index.ts`
 * calls this once, after `env.ASSETS.fetch()` returns, to override the HTTP
 * status to 404 for a genuinely unknown page while leaving the served body
 * (the SPA shell) completely untouched — client-side rendering and UX are
 * unaffected; only the transport-layer status code changes.
 *
 * Deliberately NOT covered here (see the Phase 3.15 remediation report for
 * the full reasoning):
 *  - `/admin/*` sub-routes — already `noindex,nofollow`, already blocked by
 *    `robots.txt`, already auth-gated. A wrong 404 here risks breaking real
 *    Admin navigation for a problem with near-zero real SEO exposure.
 *  - Static asset paths with a file extension (e.g. a mistyped `.js`/`.png`
 *    URL) — Cloudflare's own asset-fallback behavior for the same
 *    `not_found_handling` setting; a different problem category (asset
 *    delivery, not page indexability), out of scope for this fix.
 */

import type { Env } from "./types";
import { PAGE_SEO } from "../shared/seo/pages";
import { TOOL_SEO } from "../shared/seo/tools";

const STATIC_PAGE_PATHS = new Set(Object.values(PAGE_SEO).map((entity) => entity.path));

/** Strips exactly one trailing slash (except for the root "/") so
 * `/tools/` is recognized the same as `/tools` — matching how the client
 * router's real routes are usually reached, without introducing a redirect. */
export function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function isRealToolPath(pathname: string): boolean {
  const match = pathname.match(/^\/tools\/([^/]+)$/);
  return match !== null && Object.prototype.hasOwnProperty.call(TOOL_SEO, match[1]);
}

async function isPublishedCmsSlug(env: Env, pathname: string): Promise<boolean> {
  const match = pathname.match(/^\/([^/]+)$/);
  if (!match) return false;
  const slug = decodeURIComponent(match[1]);
  const row = await env.DB.prepare("SELECT id FROM pages WHERE slug = ? AND status = 'published'")
    .bind(slug)
    .first();
  return row !== null;
}

/** True if `pathname` is a real, currently-routable public page — the exact
 * set of paths the client-side router renders real content for, not a
 * `NotFoundPage` fallback. Callers should normalize the pathname first. */
export async function isKnownPublicRoute(pathname: string, env: Env): Promise<boolean> {
  if (STATIC_PAGE_PATHS.has(pathname)) return true;
  if (isRealToolPath(pathname)) return true;
  return isPublishedCmsSlug(env, pathname);
}

/** Only a GET request for a page-shaped path (no file extension, not an
 * `/admin/*` sub-route) is a candidate for the soft-404 fix — everything
 * else (real static assets, admin, non-GET methods) is left exactly as the
 * existing routing already serves it. */
export function isPageNavigationCandidate(request: Request, pathname: string): boolean {
  if (request.method !== "GET") return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.includes(".")) return false;
  return true;
}
