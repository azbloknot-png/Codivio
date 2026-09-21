/**
 * Codivio robots.txt parser — Human-Readable Robots Policy Page follow-up.
 *
 * A pure, dependency-free parser for the real robots.txt format this
 * project actually uses (User-agent/Allow/Disallow/Sitemap directives,
 * "#" comments, blank lines). It exists so `/robots` (see src/App.tsx's
 * RobotsPage) never hand-retypes a single rule from public/robots.txt —
 * the page fetches the live file at runtime and parses it with this
 * module, so the two can never drift out of sync. public/robots.txt
 * itself is never touched by this file or by RobotsPage.
 *
 * Scope: this project's robots.txt always writes one User-agent per
 * group (confirmed: every group in public/robots.txt has exactly one
 * User-agent line followed by its own Allow/Disallow lines — see that
 * file's own header comment on why rules are deliberately repeated per
 * group rather than shared). The robots.txt spec also allows several
 * consecutive User-agent lines to share one set of following rules —
 * that grouped form is intentionally not handled here, since it does not
 * occur in the real file and speculative handling would be unverifiable
 * complexity for an input that never arises.
 */

export interface RobotsGroup {
  userAgent: string;
  allow: string[];
  disallow: string[];
}

export interface RobotsPolicy {
  groups: RobotsGroup[];
  sitemaps: string[];
}

/** Parses robots.txt directives into structured groups. Unknown directives
 * (e.g. "Crawl-delay", not used by this project) are silently ignored
 * rather than rejected — a real, forward-compatible robots.txt parser
 * should never throw on a directive it doesn't specifically model. */
export function parseRobotsTxt(raw: string): RobotsPolicy {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const directive = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();
    if (!value) continue;

    if (directive === "user-agent") {
      current = { userAgent: value, allow: [], disallow: [] };
      groups.push(current);
    } else if (directive === "allow" && current) {
      current.allow.push(value);
    } else if (directive === "disallow" && current) {
      current.disallow.push(value);
    } else if (directive === "sitemap") {
      sitemaps.push(value);
    }
  }

  return { groups, sitemaps };
}

/** Every distinct Allow path across all groups, in first-seen order — the
 * "Allowed Crawling Areas" a human reader cares about, not a per-group
 * repeat of the same "/" five times. */
export function getUniqueAllowedPaths(policy: RobotsPolicy): string[] {
  return dedupeInOrder(policy.groups.flatMap((group) => group.allow));
}

/** Every distinct Disallow path across all groups, in first-seen order —
 * the "Disallowed Areas" a human reader cares about. */
export function getUniqueDisallowedPaths(policy: RobotsPolicy): string[] {
  return dedupeInOrder(policy.groups.flatMap((group) => group.disallow));
}

function dedupeInOrder(values: string[]): string[] {
  return [...new Set(values)];
}
