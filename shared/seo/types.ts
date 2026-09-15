import type { Language } from "../i18n/languages";

/**
 * Codivio SEO — shared types (Phase 3.1).
 *
 * Framework-agnostic, imported by the frontend only today (see
 * src/seo/useSeo.ts). Nothing here is Worker/D1-facing yet — see
 * DECISIONS.md's "SEO Metadata Architecture" entry for why this stays a
 * code-level dataset (mirroring how the tool registry itself works) rather
 * than a new/extended D1 table.
 */

/** Search-engine directives for one page. Kept as two explicit booleans
 * (not a single "index,follow" string) so a caller can never typo a
 * combination — `robotsToString()` is the only place that formats it. */
export interface SeoRobots {
  index: boolean;
  follow: boolean;
}

export const ROBOTS_INDEX_FOLLOW: SeoRobots = { index: true, follow: true };
export const ROBOTS_NOINDEX_FOLLOW: SeoRobots = { index: false, follow: true };
export const ROBOTS_NOINDEX_NOFOLLOW: SeoRobots = { index: false, follow: false };

export function robotsToString(robots: SeoRobots): string {
  return `${robots.index ? "index" : "noindex"},${robots.follow ? "follow" : "nofollow"}`;
}

/** One language's title + description for a single SEO entity. Both are
 * required — there is no "fall back to English" allowed for a real entity,
 * since Step 11 of Phase 3.1 explicitly forbids mechanical translation
 * standing in for real per-language copy. */
export interface LocalizedSeoCopy {
  title: string;
  description: string;
}

export type LocalizedSeoMap = Record<Language, LocalizedSeoCopy>;

/** A complete SEO entity for one route (a static page or a tool). `path`
 * is the real public route (e.g. "/tools/qr-code-generator") used to build
 * the canonical URL — never guessed, always matching a route actually
 * registered in src/App.tsx. */
export interface SeoEntity {
  path: string;
  robots: SeoRobots;
  localized: LocalizedSeoMap;
}
