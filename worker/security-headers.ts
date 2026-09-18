/**
 * Phase 2.11 — security headers baseline.
 *
 * Applied once, uniformly, to every response this Worker returns (both its
 * own /api/* responses and whatever env.ASSETS.fetch() returns for the SPA)
 * by wrapping the single top-level fetch() return in worker/index.ts. This
 * is the one place these headers are set — do not duplicate header-setting
 * logic in individual handlers.
 *
 * The CSP was derived from actually inspecting the shipped app (see
 * DECISIONS.md), not copied from a generic template:
 *  - index.html/dist/client/index.html load exactly one same-origin
 *    <script type="module"> and one same-origin <link rel="stylesheet"> —
 *    no inline <script>, no external script/style/font host, no CDN.
 *  - The only inline `style={}` in the whole frontend (the public CMS page
 *    body) was replaced with a CSS class this same checkpoint specifically
 *    so style-src does not need 'unsafe-inline'.
 *  - No analytics/ads/third-party embed exists yet (Phase 3/7 future work)
 *    — this policy is intentionally strict now and should be *loosened*
 *    deliberately, directive by directive, only when a real integration
 *    (e.g. GA4/AdSense) actually needs it, never widened speculatively.
 *  - img-src allows data: because inline data-URI images (e.g. a
 *    client-rendered QR code preview) are a plausible near-term need
 *    (Phase 4) and pose no script-execution risk; nothing else is widened
 *    on spec.
 */

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const STATIC_SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["Content-Security-Policy", CONTENT_SECURITY_POLICY],
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(self), microphone=(), geolocation=(), payment=()"],
  // Legacy fallback for browsers that don't honor CSP's frame-ancestors yet.
  ["X-Frame-Options", "DENY"],
];

/**
 * Wraps a Response with the security headers above, preserving its status,
 * statusText, and existing headers (Content-Type, Set-Cookie, etc. are
 * untouched). HSTS is added only when the request actually arrived over
 * HTTPS — mirroring the same isHttps check worker/auth.ts already uses for
 * the session cookie's Secure attribute, so local HTTP dev is unaffected.
 */
export function withSecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of STATIC_SECURITY_HEADERS) {
    headers.set(name, value);
  }
  if (new URL(request.url).protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
