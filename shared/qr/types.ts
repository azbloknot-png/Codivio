/**
 * Codivio Shared QR Engine — types (Phase 4.1).
 *
 * Framework-agnostic: no import of the `qrcode` package or any browser/Node
 * API. Safe to import from both the Worker and the frontend, mirroring the
 * shared/seo/ split (see shared/seo/types.ts).
 *
 * Phase 4.1 scope: a generic text/URL payload only. vCard/WiFi/Email/SMS/
 * WhatsApp/Phone/Location/Calendar structured payload builders are Phase
 * 4.2+ work and are deliberately not modeled here — adding an unused
 * discriminant now would be speculative.
 */

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface QrTextPayload {
  kind: "text";
  value: string;
}

export type QrPayload = QrTextPayload;

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
  | { ok: true; payload: QrTextPayload; config: QrEncodingConfig }
  | { ok: false; errors: QrValidationError[] };
