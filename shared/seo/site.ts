import type { Language } from "../i18n/languages";

/**
 * Codivio SEO — global site configuration (Phase 3.1).
 *
 * CANONICAL_DOMAIN is always the real production domain — never the
 * Cloudflare Worker hostname (codivio.azbloknot.workers.dev) and never
 * derived from window.location at runtime, so a canonical/OG URL is
 * correct even when the site happens to be viewed on the workers.dev
 * host (e.g. during a pre-DNS-cutover check).
 */
export const SITE_NAME = "Codivio";
export const CANONICAL_DOMAIN = "https://codivio.online";
export const TITLE_SUFFIX = ` | ${SITE_NAME}`;

/** No dedicated 1200x630 social-preview image exists yet (see
 * PROJECT_STATE.md "SEO Foundation" — known limitation). The existing
 * square branding logo is used as an honest placeholder rather than
 * fabricating an image asset that doesn't exist. */
export const DEFAULT_OG_IMAGE = `${CANONICAL_DOMAIN}/assets/branding/codivio-logo.png`;

export const OG_LOCALE: Record<Language, string> = {
  az: "az_AZ",
  tr: "tr_TR",
  en: "en_US",
};

export function buildTitle(title: string): string {
  return `${title}${TITLE_SUFFIX}`;
}

/** Builds the canonical/OG URL for a route path. Always rooted at
 * CANONICAL_DOMAIN, never the current window origin. `path` must start
 * with "/"; the homepage's own path is exactly "/" (no trailing-slash
 * duplication for any other route). */
export function buildCanonicalUrl(path: string): string {
  if (path === "/") return `${CANONICAL_DOMAIN}/`;
  return `${CANONICAL_DOMAIN}${path}`;
}

/** Defense in depth for any canonical/OG URL that could ever originate
 * from admin/DB-supplied data (e.g. a CMS page's custom canonicalUrl) —
 * shared/pages.ts already validates this at write time, but the render
 * path re-validates rather than trusting stored data blindly. Only an
 * absolute https:// URL is accepted; anything else (javascript:, a bare
 * path, a non-https scheme) is rejected so the caller can fall back to
 * the computed canonical instead. */
export function isSafeAbsoluteHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}
