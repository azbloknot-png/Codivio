import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  acceptAllPreferences,
  readConsent,
  rejectOptionalPreferences,
  writeConsent,
  type ConsentPreferences,
  type StoredConsent,
} from "../lib/consent";
import { disableAnalytics, enableAnalytics } from "../lib/analytics";

/**
 * Codivio — Cookie Consent context.
 *
 * Same provider/hook shape as src/i18n/LanguageContext.tsx: a single
 * top-level provider (wired in src/main.tsx) holding the one piece of
 * cross-cutting state every page/component needs read/write access to.
 *
 * This is the one place that reacts to a consent change by actually
 * calling into src/lib/analytics.ts (enableAnalytics/disableAnalytics) —
 * src/lib/consent.ts itself stays fully analytics-agnostic, and
 * src/lib/analytics.ts stays fully consent-agnostic. A future advertising
 * or preferences technology would plug in here the same way, reacting to
 * `consent.advertising`/`consent.preferences` once either is real.
 */
interface ConsentContextValue {
  /** null = never decided yet (the banner should show). */
  consent: StoredConsent | null;
  acceptAll: () => void;
  rejectOptional: () => void;
  /** Used by the Cookie Settings modal's "Save preferences" action. */
  savePreferences: (preferences: ConsentPreferences) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<StoredConsent | null>(() => readConsent());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // The one place analytics consent is actually acted on — reacts to every
  // change of `consent.analytics`, including the very first read on mount
  // (a returning visitor who already accepted analytics gets it enabled
  // immediately, without re-prompting).
  useEffect(() => {
    if (consent?.analytics) {
      enableAnalytics();
    } else {
      disableAnalytics();
    }
  }, [consent?.analytics]);

  const acceptAll = useCallback(() => {
    setConsent(writeConsent(acceptAllPreferences()));
    setIsSettingsOpen(false);
  }, []);

  const rejectOptional = useCallback(() => {
    setConsent(writeConsent(rejectOptionalPreferences()));
    setIsSettingsOpen(false);
  }, []);

  const savePreferences = useCallback((preferences: ConsentPreferences) => {
    setConsent(writeConsent(preferences));
    setIsSettingsOpen(false);
  }, []);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const value = useMemo<ConsentContextValue>(
    () => ({ consent, acceptAll, rejectOptional, savePreferences, isSettingsOpen, openSettings, closeSettings }),
    [consent, acceptAll, rejectOptional, savePreferences, isSettingsOpen, openSettings, closeSettings],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return context;
}
