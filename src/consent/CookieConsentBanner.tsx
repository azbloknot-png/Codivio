import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { useConsent } from "./ConsentContext";

/**
 * Codivio — Cookie Consent banner.
 *
 * Rendered once at the top of <App> (see src/App.tsx), same single-point
 * pattern as ScrollRestoration/Analytics. Shows only when nothing has been
 * decided yet (consent === null) and the Cookie Settings modal isn't open
 * (avoids the two overlapping). Making any of the three choices — Accept
 * All, Reject Optional, or Save from the modal — persists a decision and
 * the banner never reappears automatically afterward; it can still be
 * reopened later from the /cookies page (see CookiePolicyPage).
 */
export function CookieConsentBanner() {
  const { t } = useLanguage();
  const { consent, isSettingsOpen, acceptAll, rejectOptional, openSettings } = useConsent();

  if (consent !== null || isSettingsOpen) return null;

  return (
    <div className="cookie-consent-banner" role="region" aria-label={t.cookieConsent.modalTitle}>
      <div className="cookie-consent-banner-inner">
        <p>
          {t.cookieConsent.bannerMessage}{" "}
          <Link to="/cookies">{t.cookieConsent.bannerLearnMore}</Link>
        </p>
        <div className="cookie-consent-actions">
          <button type="button" className="cookie-consent-button cookie-consent-button--ghost" onClick={rejectOptional}>
            {t.cookieConsent.rejectOptional}
          </button>
          <button
            type="button"
            className="cookie-consent-button cookie-consent-button--secondary"
            onClick={openSettings}
          >
            {t.cookieConsent.openSettings}
          </button>
          <button type="button" className="cookie-consent-button cookie-consent-button--primary" onClick={acceptAll}>
            {t.cookieConsent.acceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}
