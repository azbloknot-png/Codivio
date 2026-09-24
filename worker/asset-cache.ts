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

/**
 * The hash segment is matched as *exactly* 8 characters (Vite/Rollup's
 * default content-hash length in this project — confirmed via
 * `vite.config.ts`, which sets no custom `output.hashCharacters`/length,
 * and via every real build hash observed in production) immediately before
 * the extension, rather than "6-or-more word characters after the last
 * hyphen".
 *
 * Real bug this fixes, found via live production verification (Phase 5.2):
 * Vite's hash alphabet includes "-" itself (its default is a URL-safe
 * base64-like charset), so a hash can legitimately contain an internal
 * hyphen — e.g. a real production chunk was named `index-3Lc-fZgU.js`. The
 * previous pattern looked for "-" followed by 6+ word characters at the
 * end, which failed here: splitting on the *last* hyphen left only "fZgU"
 * (4 characters) as the apparent hash, under the 6-character minimum, so
 * this genuinely hashed file incorrectly fell through to non-immutable
 * caching. Matching a fixed 8-character window instead (regardless of what
 * characters, including hyphens, appear inside it) is correct however many
 * internal hyphens the hash itself happens to contain, and was verified
 * against every real chunk name observed this session, including another
 * previously-passing-by-coincidence case (`AdminApp-B-kkFuIp.js`) whose
 * hash also contains an internal hyphen. If Vite's default hash length
 * ever changes, this constant must change with it.
 *
 * `.mjs` extension added (Phase 5.5 follow-up fix): Phase 5.5's PDF-to-Word
 * tool was this codebase's first build output to ever include a `.mjs`
 * asset — pdfjs-dist's worker script, copied by Vite's `?url` import with
 * its original extension preserved (e.g. `pdf.worker.min-BmVo14Nb.mjs`).
 * Found via live production verification: this real, correctly-hashed file
 * fell through to non-immutable caching because the pattern only ever
 * covered `.js`/`.css`. `.mjs` is exactly as content-hashed and safe to
 * cache forever as `.js` — same flat `/assets/` layout, same Vite-generated
 * hash — so it belongs in the same alternation, not a separate rule.
 */
const HASHED_ASSET_PATTERN = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(?:js|mjs|css)$/;

/** True only for a flat `/assets/<name>-<hash>.(js|mjs|css)` path — Vite's
 * own content-hashed build output. Never matches a nested path like
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
