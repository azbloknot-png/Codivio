import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { useConsent } from "./ConsentContext";

/** A small, accessible on/off control using role="switch" (native <button>
 * gives Enter/Space activation for free — no custom keyboard handler
 * needed). Locked (disabled + always a fixed value) for categories with no
 * real technology behind them yet (Necessary, Advertising, Preferences). */
function CategorySwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="cookie-switch"
      data-checked={checked}
      onClick={disabled ? undefined : () => onChange?.(!checked)}
    >
      <span className="cookie-switch-thumb" />
    </button>
  );
}

/**
 * Codivio — Cookie Settings modal.
 *
 * Rendered once at the top of <App> (see src/App.tsx), returning null
 * unless useConsent().isSettingsOpen is true. Opened either from the
 * banner's "Cookie settings" button or from the /cookies page's "Manage
 * cookie preferences" button (see CookiePolicyPage) — both go through the
 * same useConsent().openSettings().
 *
 * Analytics starts from the current saved consent (or off, if nothing was
 * ever decided) as a local draft — closing without pressing "Save
 * preferences" (Escape, backdrop click, or the Close button) discards the
 * draft and leaves any existing decision untouched.
 */
export function CookieSettingsModal() {
  const { t } = useLanguage();
  const { consent, isSettingsOpen, closeSettings, savePreferences } = useConsent();
  const [analyticsDraft, setAnalyticsDraft] = useState(consent?.analytics ?? false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSettingsOpen) {
      setAnalyticsDraft(consent?.analytics ?? false);
      dialogRef.current?.focus();
    }
  }, [isSettingsOpen, consent?.analytics]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSettings();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isSettingsOpen, closeSettings]);

  if (!isSettingsOpen) return null;

  const categories = t.cookieConsent.categories;

  return (
    <div className="cookie-settings-backdrop" onClick={closeSettings}>
      <div
        className="cookie-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="cookie-settings-title">{t.cookieConsent.modalTitle}</h2>
        <p className="cookie-settings-intro">{t.cookieConsent.modalIntro}</p>

        <div className="cookie-settings-category">
          <div>
            <h3>{categories.necessary.name}</h3>
            <p>{categories.necessary.description}</p>
            <span className="cookie-settings-status">{t.cookieConsent.alwaysActive}</span>
          </div>
          <CategorySwitch checked disabled label={categories.necessary.name} />
        </div>

        <div className="cookie-settings-category">
          <div>
            <h3>{categories.analytics.name}</h3>
            <p>{categories.analytics.description}</p>
          </div>
          <CategorySwitch checked={analyticsDraft} onChange={setAnalyticsDraft} label={categories.analytics.name} />
        </div>

        <div className="cookie-settings-category">
          <div>
            <h3>{categories.advertising.name}</h3>
            <p>{categories.advertising.description}</p>
            <span className="cookie-settings-status">{t.cookieConsent.reservedForFuture}</span>
          </div>
          <CategorySwitch checked={false} disabled label={categories.advertising.name} />
        </div>

        <div className="cookie-settings-category">
          <div>
            <h3>{categories.preferences.name}</h3>
            <p>{categories.preferences.description}</p>
            <span className="cookie-settings-status">{t.cookieConsent.reservedForFuture}</span>
          </div>
          <CategorySwitch checked={false} disabled label={categories.preferences.name} />
        </div>

        <div className="cookie-settings-actions">
          <button type="button" className="cookie-consent-button cookie-consent-button--ghost" onClick={closeSettings}>
            {t.cookieConsent.closeSettings}
          </button>
          <button
            type="button"
            className="cookie-consent-button cookie-consent-button--primary"
            onClick={() =>
              savePreferences({ analytics: analyticsDraft, advertising: false, preferences: false })
            }
          >
            {t.cookieConsent.savePreferences}
          </button>
        </div>
      </div>
    </div>
  );
}
