import { CANONICAL_DOMAIN } from "../../shared/seo/site";

/**
 * Codivio — Google Analytics 4 integration (foundational GA4 page-view
 * tracking).
 *
 * The only file that talks to gtag.js. Deliberately small, reusable, and
 * consent-agnostic — it exposes `enableAnalytics()`/`disableAnalytics()`
 * as low-level primitives and leaves the decision of *when* to call them
 * entirely to the caller (src/App.tsx's Analytics component, informed by
 * src/consent/ConsentContext.tsx). This module has no knowledge of the
 * cookie-consent storage schema; it only ever does what it's told, which
 * keeps it reusable if a future integration (e.g. a different analytics
 * provider) needs the same enable/disable shape.
 *
 * Never imported by `worker/` or `shared/` — GA4 is a browser-only,
 * frontend concern with nothing for the Worker to do, so it cannot affect
 * Worker/SSR compatibility or the server build.
 *
 * CSP note: gtag.js is loaded via a same-origin-appended
 * `<script src="https://www.googletagmanager.com/gtag/js?...">` tag (a
 * real external-script-src load — see `worker/security-headers.ts`, whose
 * CSP now allows exactly that host), never as an inline `<script>` block.
 * This project's CSP has no `'unsafe-inline'` and never should (see that
 * file's own header comment) — the `dataLayer`/`gtag` bootstrap below is
 * plain same-origin JS inside this bundled module, not inline HTML, so it
 * needs no CSP exception of its own.
 *
 * Phase 3.21 — Measurement ID is read from `VITE_GA4_MEASUREMENT_ID`
 * (Vite build-time env var, see `.env.example`), not hardcoded. It is not
 * a secret — GA4 Measurement IDs are meant to be public and are visible in
 * every page's rendered HTML/network requests on any GA4-instrumented site
 * — but making it configurable (rather than compiled into every fork/
 * environment of this codebase) is still the correct default: a staging
 * deploy, a fork, or a contributor's local build should never silently
 * send real events into Codivio's own GA4 property. If the env var is
 * missing or doesn't look like a real Measurement ID, analytics is safely
 * disabled end-to-end: `enableAnalytics()` never loads gtag.js or
 * initializes `dataLayer`, and every tracking call remains a guaranteed
 * no-op — never a thrown error, never a fabricated/placeholder ID sent to
 * Google.
 */
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

function resolveMeasurementId(): string | null {
  const raw = import.meta.env.VITE_GA4_MEASUREMENT_ID;
  return typeof raw === "string" && MEASUREMENT_ID_PATTERN.test(raw) ? raw : null;
}

export const GA4_MEASUREMENT_ID: string | null = resolveMeasurementId();

/** True only when a real-looking Measurement ID was actually configured —
 * exported so callers (e.g. an Admin diagnostics view, or this module's own
 * tests) can report the missing-setup state honestly instead of inferring
 * it from `GA4_MEASUREMENT_ID`'s nullability. */
export function isAnalyticsConfigured(): boolean {
  return GA4_MEASUREMENT_ID !== null;
}

const GA_DISABLE_FLAG = GA4_MEASUREMENT_ID ? `ga-disable-${GA4_MEASUREMENT_ID}` : null;

const PRODUCTION_HOSTNAME = new URL(CANONICAL_DOMAIN).hostname;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Google's documented gtag.js opt-out flag is a dynamic, measurement-ID-
 * keyed global property (`window['ga-disable-G-XXXXXXX']`) — not a fixed
 * property name TypeScript's `Window` interface can declare directly, so
 * it's accessed through this narrow, single-purpose cast rather than
 * widening `Window` itself with a generic index signature. */
function setGaDisableFlag(value: boolean): void {
  if (!GA_DISABLE_FLAG) return;
  (window as unknown as Record<string, boolean>)[GA_DISABLE_FLAG] = value;
}

let initialized = false;
let disabled = false;

/** Only ever measure real production traffic on the canonical apex host —
 * never localhost, the `codivio.azbloknot.workers.dev` preview host, or
 * (defense in depth; a real browser should never even reach this host
 * with a page load, since `worker/index.ts` now 301s it to the apex first)
 * `www.codivio.online`. Keeps local/dev/preview activity out of real GA4
 * data. Exported as a pure function so it's testable without a DOM. */
export function isProductionHost(hostname: string): boolean {
  return hostname === PRODUCTION_HOSTNAME;
}

/** Admin routes are excluded from public traffic measurement — mirrors the
 * existing noindex/no-JSON-LD treatment `/admin` already gets in
 * `src/seo/useSeo.ts`. Internal Admin navigation isn't the "real traffic"
 * this integration is meant to measure. Exported as a pure function so
 * it's testable without a DOM. */
export function isTrackablePath(pathname: string): boolean {
  return !pathname.startsWith("/admin");
}

/** Best-effort removal of GA's own cookies (`_ga`, `_ga_<container>`,
 * `_gid`, `_gat`) when consent is withdrawn. Not required for gtag.js to
 * stop collecting (the `ga-disable-<id>` flag below is what actually does
 * that, per Google's own documented opt-out mechanism), but removing the
 * cookies too is the more privacy-conscious, complete behavior on revoke. */
function clearAnalyticsCookies(): void {
  if (typeof document === "undefined") return;
  const names = document.cookie
    .split(";")
    .map((entry) => entry.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name));
  for (const name of names) {
    if (name === "_ga" || name === "_gid" || name === "_gat" || name.startsWith("_ga_")) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}

/**
 * Grants analytics consent: loads gtag.js and initializes the dataLayer on
 * first call, and clears Google's own `ga-disable-<id>` opt-out flag on
 * every call (so re-enabling after a prior `disableAnalytics()` call in
 * the same session works without reloading the page). Safe to call more
 * than once, outside a browser, or off the production host (no-ops).
 * gtag's own automatic initial page_view is disabled
 * (`send_page_view: false`) because `trackPageView` below sends every page
 * view explicitly, including the first — avoiding a double-counted first
 * pageview, per Google's documented pattern for client-side-routed SPAs
 * using gtag.js directly.
 *
 * Also safely no-ops when `GA4_MEASUREMENT_ID` is missing/invalid (see this
 * module's own header comment) — no script is ever injected and
 * `initialized` never becomes true, so every `track*` call below stays a
 * guaranteed no-op for the lifetime of the page.
 */
export function enableAnalytics(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!isProductionHost(window.location.hostname)) return;
  if (!GA4_MEASUREMENT_ID) return;

  disabled = false;
  setGaDisableFlag(false);

  if (initialized) return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", GA4_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/**
 * Withdraws analytics consent: sets Google's own documented
 * `window['ga-disable-<measurement-id>'] = true` flag, which gtag.js
 * itself checks before sending anything (the correct way to stop an
 * already-loaded gtag.js, rather than trying to remove the script tag,
 * which wouldn't undo anything already registered), and best-effort clears
 * existing GA cookies. `trackPageView` below also checks this state
 * directly, as a second, independently-verifiable guarantee that no event
 * is sent — not solely relying on gtag.js's own internal behavior.
 */
export function disableAnalytics(): void {
  disabled = true;
  if (typeof window !== "undefined") {
    setGaDisableFlag(true);
  }
  clearAnalyticsCookies();
}

/**
 * Sends a page_view event for the given pathname. No-ops safely unless
 * consent has been granted via `enableAnalytics()` and not since withdrawn
 * via `disableAnalytics()`, or if the path is excluded (see
 * `isTrackablePath`). Only the pathname is sent as `page_path` — never a
 * query string or hash — since no Codivio route encodes identity or other
 * personal data in either; `page_location` uses the real current URL,
 * matching GA4's own default field for a manually-sent page_view.
 */
export function trackPageView(pathname: string): void {
  if (!initialized || disabled) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (!isTrackablePath(pathname)) return;

  window.gtag("event", "page_view", {
    page_path: pathname,
    page_location: window.location.href,
  });
}

/**
 * Sends a generic custom GA4 event (Phase 4.9 — QR Analytics Architecture's
 * `qr_generate`/`qr_scan`, and Phase 3.21's `tool_open`/`tool_start`/
 * `tool_complete`/`download`, are its callers; see `src/lib/qr-analytics.ts`
 * and `src/lib/tool-analytics.ts` for those typed wrappers). Applies exactly
 * the same guards as `trackPageView` above: no-ops unless consent has been
 * granted via `enableAnalytics()` and not since withdrawn, and excludes
 * `/admin/*` (via the current `window.location.pathname`, since a generic
 * event has no pathname parameter of its own the way a page view does).
 *
 * This function itself is content-agnostic — it will send whatever `params`
 * it's given. It is deliberately NOT exported for direct use by tool
 * components; callers should go through a typed wrapper (like
 * `src/lib/qr-analytics.ts`'s/`src/lib/tool-analytics.ts`'s functions) that
 * restricts `params` to a closed shape known not to contain payload/personal
 * content, rather than calling this with a free-form object built ad hoc at
 * the call site.
 */
export function trackEvent(name: string, params: Record<string, string> = {}): void {
  if (!initialized || disabled) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  if (!isTrackablePath(window.location.pathname)) return;

  window.gtag("event", name, params);
}
