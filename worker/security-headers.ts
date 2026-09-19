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
 *  - img-src allows data: because inline data-URI images (e.g. a
 *    client-rendered QR code preview) are a plausible near-term need
 *    (Phase 4) and pose no script-execution risk; nothing else is widened
 *    on spec.
 *  - GA4 foundational integration: script-src/img-src/connect-src were each
 *    widened by exactly the hosts Google's own gtag.js CSP guidance names
 *    (googletagmanager.com, google-analytics.com + its regional
 *    subdomains) — no broader pattern, and still no 'unsafe-inline'
 *    anywhere (see src/lib/analytics.ts for why none is needed). AdSense
 *    remains future work (Phase 7) and has not widened anything here.
 */

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // Widened for GA4 (foundational analytics integration): gtag.js itself
  // is loaded from googletagmanager.com. This is the exact host Google's
  // own gtag.js CSP guidance names — no broader than that, and no
  // 'unsafe-inline' was added (src/lib/analytics.ts's dataLayer/gtag
  // bootstrap is same-origin bundled JS, not an inline <script> block).
  "script-src 'self' https://www.googletagmanager.com",
  "style-src 'self'",
  // googletagmanager.com is also allowed here: gtag.js's own fallback
  // image-beacon transport can use it, per Google's documented CSP.
  "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self'",
  // google-analytics.com (+ its regional subdomains) and analytics.google.com
  // receive the actual measurement hits; googletagmanager.com is also
  // contacted by gtag.js for its own remote config. Exactly Google's
  // documented minimum host set for gtag.js — no broader pattern than that.
  // An incomplete list here would silently drop page views (a blocked
  // network request, invisible without browser devtools), so this errs
  // toward Google's full documented set rather than a narrower guess.
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
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
