import type { QrValidationError, QrWifiPayload } from "./types";

/**
 * Codivio Shared QR Engine — WiFi payload (Phase 4.4).
 *
 * Format reference: the de facto "WIFI:" QR format recognized by Android,
 * iOS, and most third-party scanner apps (not a formal RFC/IEEE standard,
 * but a long-established convention — see e.g. the ZXing project's
 * documented barcode contents):
 *
 *   WIFI:T:<WPA|WEP|nopass>;S:<SSID>;P:<password>;H:<true|false>;;
 *
 * `\`, `;`, `,`, and `:` inside the SSID/password fields must be escaped
 * with a backslash so a value containing one of those characters can't be
 * misread as a field separator.
 */

const WIFI_ESCAPE_PATTERN = /([\\;,:])/g;

export function escapeWifiValue(value: string): string {
  return value.replace(WIFI_ESCAPE_PATTERN, "\\$1");
}

/** Practical simplification, not an exact byte-length claim — the real
 * 802.11 SSID limit is 32 *bytes*, which can be fewer than 32 characters
 * for non-ASCII SSIDs. A 32-character cap is deliberately simple rather
 * than attempting exact UTF-8 byte accounting for an edge case this tool
 * doesn't need to get byte-perfect. */
export const MAX_WIFI_SSID_LENGTH = 32;

/** Real WPA/WPA2 passphrase bounds (8–63 ASCII characters) — genuine spec
 * values, not arbitrary. WEP key length/format rules are stricter and more
 * varied (5/13 ASCII or 10/26 hex characters) and are deliberately NOT
 * enforced here — WEP is legacy/rare, and getting an exact-length WEP rule
 * wrong would itself be an "incorrect restriction"; only a non-empty check
 * applies to WEP passwords. */
export const MIN_WIFI_WPA_PASSWORD_LENGTH = 8;
export const MAX_WIFI_PASSWORD_LENGTH = 63;

export function validateWifiPayload(payload: unknown): QrValidationError[] {
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as { kind?: unknown }).kind !== "wifi" ||
    typeof (payload as { ssid?: unknown }).ssid !== "string" ||
    typeof (payload as { password?: unknown }).password !== "string" ||
    typeof (payload as { hidden?: unknown }).hidden !== "boolean" ||
    !isValidWifiSecurity((payload as { security?: unknown }).security)
  ) {
    return [{ code: "empty_payload", message: "Payload text must not be empty." }];
  }

  const { ssid, password, security } = payload as QrWifiPayload;
  const errors: QrValidationError[] = [];

  if (ssid.trim().length === 0) {
    errors.push({ code: "wifi_ssid_required", message: "Network name (SSID) must not be empty." });
  } else if (ssid.length > MAX_WIFI_SSID_LENGTH) {
    errors.push({
      code: "wifi_ssid_too_long",
      message: `Network name (SSID) must be at most ${MAX_WIFI_SSID_LENGTH} characters.`,
    });
  }

  if (security !== "nopass") {
    if (password.length === 0) {
      errors.push({ code: "wifi_password_required", message: "Password is required for a secured network." });
    } else if (security === "WPA" && password.length < MIN_WIFI_WPA_PASSWORD_LENGTH) {
      errors.push({
        code: "wifi_password_too_short",
        message: `WPA/WPA2 passwords must be at least ${MIN_WIFI_WPA_PASSWORD_LENGTH} characters.`,
      });
    } else if (password.length > MAX_WIFI_PASSWORD_LENGTH) {
      errors.push({
        code: "wifi_password_too_long",
        message: `Password must be at most ${MAX_WIFI_PASSWORD_LENGTH} characters.`,
      });
    }
  }

  return errors;
}

function isValidWifiSecurity(value: unknown): value is QrWifiPayload["security"] {
  return value === "WPA" || value === "WEP" || value === "nopass";
}

/** Builds the actual scannable `WIFI:...;;` string from validated fields.
 * Never called with unvalidated input — see validate.ts#validateQrRequest,
 * which only calls this once validateWifiPayload has already passed. */
export function buildWifiQrValue(payload: QrWifiPayload): string {
  const password = payload.security === "nopass" ? "" : escapeWifiValue(payload.password);
  return `WIFI:T:${payload.security};S:${escapeWifiValue(payload.ssid)};P:${password};H:${payload.hidden ? "true" : "false"};;`;
}
