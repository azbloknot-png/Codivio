/**
 * Performance Fix — long-lived immutable caching for Vite's content-hashed
 * build output.
 *
 * Vite emits every JS/CSS chunk as `assets/<name>-<hash>.<ext>` (flat,
 * directly under `assets/`, never nested) — the hash is derived from the
 * file's own content, so a byte-for-byte identical file always keeps the
 * same URL and a changed file always gets a new URL. This makes it safe, by
 * construction, to tell every cache (browser, Cloudflare edge) to keep such
 * a file forever without ever re-validating it: a new deploy can never
 * silently serve stale content at the same URL, because the URL itself
 * changes whenever the content does.
 *
 * Deliberately kept separate from worker/security-headers.ts (a different
 * concern — those headers are security policy, this is cache policy — see
 * that file's own "one place these headers are set" comment, which this
 * module does not touch) and NOT applied to:
 *  - `index.html` / any page-navigation response — must keep revalidating
 *    on every request (`public, max-age=0, must-revalidate`, unchanged),
 *    since the same URL's content legitimately changes across deploys.
 *  - `public/assets/branding/*` (logo/favicon) — plain static passthrough
 *    files with STABLE, unhashed filenames; the same URL could later point
 *    at different bytes (e.g. a future logo refresh), so immutable caching
 *    would risk serving a stale image forever. The pattern below excludes
 *    any path with a further "/" after "assets/" for exactly this reason.
 *  - `robots.txt`/`sitemap.xml`/`sitemap.xsl`/`sitemap.css`/`llms.txt` —
 *    also stable, unhashed filenames, and don't live under `/assets/` at
 *    all regardless.
 *  - `/api/*` and every other dynamic response — out of scope here.
 */

const HASHED_ASSET_PATTERN = /^\/assets\/[^/]+-[A-Za-z0-9_]{6,}\.(?:js|css)$/;

/** True only for a flat `/assets/<name>-<hash>.(js|css)` path — Vite's own
 * content-hashed build output. Never matches a nested path like
 * `/assets/branding/codivio-logo.png` (no hash, one directory deeper). */
export function isHashedBuildAsset(pathname: string): boolean {
  return HASHED_ASSET_PATTERN.test(pathname);
}

/** Overrides Cache-Control to a long-lived, immutable policy — safe only
 * because the URL itself is content-derived (see module doc comment).
 * Every other header (Content-Type, Content-Encoding, the security headers
 * `worker/index.ts` applies afterward, etc.) is left completely untouched. */
export function withImmutableAssetCache(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
