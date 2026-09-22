/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** GA4 Measurement ID (e.g. "G-XXXXXXXXXX"). Not a secret — see
   * src/lib/analytics.ts's own comment on why it's safe to expose in the
   * client bundle. Left unset in any environment that shouldn't send real
   * analytics (local dev, previews); src/lib/analytics.ts safely disables
   * itself when this is missing or malformed. */
  readonly VITE_GA4_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
