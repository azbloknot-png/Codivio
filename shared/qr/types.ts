/**
 * Codivio Shared QR Engine — types (Phase 4.1, extended Phase 4.3/4.4).
 *
 * Framework-agnostic: no import of the `qrcode` package or any browser/Node
 * API. Safe to import from both the Worker and the frontend, mirroring the
 * shared/seo/ split (see shared/seo/types.ts).
 *
 * Phase 4.1 shipped the generic text payload only, with URL handling
 * deferred ("a URL is just a string payload... no protocol validation
 * beyond non-empty/length" — see DECISIONS.md). Phase 4.3 fulfilled that by
 * adding a distinct `QrUrlPayload` kind with real http/https validation
 * (see validate.ts#isValidQrUrl). Phase 4.4 adds `QrWifiPayload` — the
 * first payload kind that is genuinely structured (SSID/password/security/
 * hidden) rather than a flat string, because a scannable Wi-Fi QR code
 * encodes a specific `WIFI:...;;` format, not the raw fields (see
 * wifi.ts#buildWifiQrValue). Phase 4.5 adds `QrVCardPayload` — a second
 * structured kind, encoding a standards-compatible vCard 3.0 contact card
 * (see vcard.ts#buildVCardQrValue). To keep the encoder itself branch-free,
 * `QrValidationResult`'s success case carries a pre-computed
 * `encodedValue: string` — for text/url it's just `.value`; for wifi/vcard
 * it's the built format string. `generateQrCode` in src/lib/qr-engine.ts
 * always encodes `encodedValue`, never inspects `payload` shape itself.
 * Email/SMS/WhatsApp/Phone/Location/Calendar structured payload builders
 * remain out of scope, deliberately not modeled here.
 */

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface QrTextPayload {
  kind: "text";
  value: string;
}

export interface QrUrlPayload {
  kind: "url";
  value: string;
}

export type QrWifiSecurity = "WPA" | "WEP" | "nopass";

export interface QrWifiPayload {
  kind: "wifi";
  ssid: string;
  /** Ignored/must be empty when `security === "nopass"`. */
  password: string;
  security: QrWifiSecurity;
  hidden: boolean;
}

/**
 * A "digital business card" contact payload. Only the fields with real
 * scope justification are modeled — a full postal `ADR` component is a
 * complex 7-part structured field (PO box/extended/street/city/region/
 * postal code/country) not needed for the core contact-card use case, so
 * it is deliberately excluded this phase (see `DECISIONS.md`).
 */
export interface QrVCardPayload {
  kind: "vcard";
  firstName: string;
  lastName: string;
  organization: string;
  jobTitle: string;
  phone: string;
  email: string;
  website: string;
}

export type QrPayload = QrTextPayload | QrUrlPayload | QrWifiPayload | QrVCardPayload;

export interface QrEncodingConfig {
  errorCorrectionLevel: QrErrorCorrectionLevel;
  /** Rendered pixel dimension (square). */
  size: number;
  /** Quiet-zone width, in QR modules — matches the `qrcode` library's own `margin` option. */
  margin: number;
  /** Strict hex color, e.g. "#000000". */
  foregroundColor: string;
  /** Strict hex color, e.g. "#ffffff". */
  backgroundColor: string;
}

export const DEFAULT_QR_CONFIG: QrEncodingConfig = {
  errorCorrectionLevel: "M",
  size: 256,
  margin: 4,
  foregroundColor: "#000000",
  backgroundColor: "#ffffff",
};

/**
 * Soft, app-level cap — not the QR spec's real hard capacity (which varies
 * by encoding mode and error-correction level). Chosen so a payload stays
 * comfortably encodable even at error-correction level H.
 */
export const MAX_QR_PAYLOAD_LENGTH = 2000;

export const MIN_QR_SIZE = 16;
export const MAX_QR_SIZE = 2048;
export const MIN_QR_MARGIN = 0;
export const MAX_QR_MARGIN = 20;

export type QrValidationErrorCode =
  | "empty_payload"
  | "payload_too_long"
  | "invalid_url"
  | "wifi_ssid_required"
  | "wifi_ssid_too_long"
  | "wifi_password_required"
  | "wifi_password_too_short"
  | "wifi_password_too_long"
  | "vcard_name_required"
  | "vcard_first_name_too_long"
  | "vcard_last_name_too_long"
  | "vcard_organization_too_long"
  | "vcard_job_title_too_long"
  | "vcard_phone_too_long"
  | "vcard_email_too_long"
  | "vcard_website_too_long"
  | "invalid_error_correction_level"
  | "invalid_size"
  | "invalid_margin"
  | "invalid_foreground_color"
  | "invalid_background_color";

export interface QrValidationError {
  code: QrValidationErrorCode;
  /** Human-readable, safe to show directly in a UI. */
  message: string;
}

export type QrValidationResult =
  | { ok: true; payload: QrPayload; config: QrEncodingConfig; encodedValue: string }
  | { ok: false; errors: QrValidationError[] };
