/**
 * Codivio — Cookie Consent foundation.
 *
 * A small, generic, extensible consent store — deliberately not GA4-
 * specific. GA4 (src/lib/analytics.ts) is only its first real consumer;
 * a future advertising or preferences technology would plug into the same
 * `advertising`/`preferences` categories already modeled here, without
 * changing this file's public shape.
 *
 * Storage: localStorage only, same pattern as
 * src/i18n/LanguageContext.tsx's STORAGE_KEY/try-catch convention — no
 * server round-trip, no D1 table, no personal data (just three booleans
 * plus a schema version). Every read/write is wrapped in try/catch so
 * private browsing or storage-disabled contexts degrade to "not decided
 * yet" rather than throwing.
 *
 * `necessary` is deliberately NOT a field here: it's not a real choice
 * (always active, matches the Cookie Settings modal's own "always active"
 * row), so there is nothing to store or read for it.
 */

export interface ConsentPreferences {
  analytics: boolean;
  /** Reserved for a future advertising/AdSense integration. No advertising
   * technology exists yet, so this is always forced to false in
   * buildConsent() below regardless of what's requested or stored —
   * never trust a `true` here until a real feature actually reads it. */
  advertising: boolean;
  /** Reserved for a future real preference-cookie use case (none exists
   * yet). Forced to false in buildConsent() for the same reason as
   * advertising above. */
  preferences: boolean;
}

export interface StoredConsent extends ConsentPreferences {
  version: number;
  /** false only ever means "read failed/nothing stored" internally — once
   * anything is returned from readConsent(), decided is always true. Kept
   * as an explicit field (rather than using `null` alone) so a future
   * caller can distinguish "no data" from "the record itself says
   * undecided" if the schema ever needs that. */
  decided: boolean;
}

const STORAGE_KEY = "codivio_cookie_consent";
const CONSENT_VERSION = 1;

/**
 * The single place that turns "what the user asked for" into "what is
 * actually true" — advertising/preferences are always forced false here
 * since neither is a real, implemented feature yet, regardless of what a
 * caller passes or what a (possibly hand-edited) stored value claims.
 * When a future phase actually implements one of them, only this function
 * needs to change — every caller already passes the full preferences
 * shape through unchanged.
 */
export function buildConsent(preferences: Partial<ConsentPreferences>): StoredConsent {
  return {
    version: CONSENT_VERSION,
    decided: true,
    analytics: preferences.analytics === true,
    advertising: false,
    preferences: false,
  };
}

export function acceptAllPreferences(): ConsentPreferences {
  return { analytics: true, advertising: false, preferences: false };
}

export function rejectOptionalPreferences(): ConsentPreferences {
  return { analytics: false, advertising: false, preferences: false };
}

function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Returns the stored consent decision, or null if nothing was ever
 * decided, storage is unavailable, or the stored record is from an
 * incompatible schema version (never guess/migrate silently — treat an
 * unrecognized version the same as "never decided" so the banner reappears
 * and a fresh, correctly-shaped decision is recorded). */
export function readConsent(): StoredConsent | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredConsent>;
    if (parsed.version !== CONSENT_VERSION || parsed.decided !== true) return null;
    return buildConsent(parsed);
  } catch {
    return null;
  }
}

/** Persists a decision and returns the resulting record. Always succeeds
 * from the caller's point of view even if storage is unavailable (private
 * browsing, storage disabled) — the choice still applies for this page
 * view via React state, it just won't survive a reload, matching
 * LanguageContext's existing degrade-gracefully behavior. */
export function writeConsent(preferences: Partial<ConsentPreferences>): StoredConsent {
  const consent = buildConsent(preferences);
  if (isStorageAvailable()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch {
      // Private browsing / storage disabled — in-memory state still applies.
    }
  }
  return consent;
}
