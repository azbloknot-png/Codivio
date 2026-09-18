import {
  DEFAULT_QR_CONFIG,
  MAX_QR_MARGIN,
  MAX_QR_PAYLOAD_LENGTH,
  MAX_QR_SIZE,
  MIN_QR_MARGIN,
  MIN_QR_SIZE,
  type QrEncodingConfig,
  type QrPayload,
  type QrTextPayload,
  type QrUrlPayload,
  type QrValidationError,
  type QrValidationResult,
} from "./types";
import { buildWifiQrValue, validateWifiPayload } from "./wifi";
import { buildVCardQrValue, validateVCardPayload } from "./vcard";

/** Strict hex color only — `#rgb`, `#rrggbb`, or `#rrggbbaa`. Named CSS
 * colors and rgb()/hsl() are rejected in this phase to keep this a single
 * regex; a future phase can deliberately widen it. */
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const VALID_ERROR_CORRECTION_LEVELS = new Set(["L", "M", "Q", "H"]);
const VALID_QR_URL_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Phase 4.3 — real http/https format check, used only for the `"url"`
 * payload kind. A `"text"` payload is never run through this (it may
 * legitimately be anything, including a string that isn't a URL at all).
 */
export function isValidQrUrl(value: string): boolean {
  try {
    return VALID_QR_URL_PROTOCOLS.has(new URL(value.trim()).protocol);
  } catch {
    return false;
  }
}

/** Shared by both payload kinds — empty/length bounds only. Kept as one
 * function so a future third kind reuses it instead of re-deriving it. */
function validatePayloadValueBounds(value: string): QrValidationError[] {
  if (value.trim().length === 0) {
    return [{ code: "empty_payload", message: "Payload text must not be empty." }];
  }
  if (value.length > MAX_QR_PAYLOAD_LENGTH) {
    return [
      {
        code: "payload_too_long",
        message: `Payload text must be at most ${MAX_QR_PAYLOAD_LENGTH} characters.`,
      },
    ];
  }
  return [];
}

export function validateQrPayload(payload: unknown): QrValidationError[] {
  if ((payload as { kind?: unknown } | null)?.kind === "wifi") {
    return validateWifiPayload(payload);
  }
  if ((payload as { kind?: unknown } | null)?.kind === "vcard") {
    return validateVCardPayload(payload);
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    ((payload as { kind?: unknown }).kind !== "text" && (payload as { kind?: unknown }).kind !== "url") ||
    typeof (payload as { value?: unknown }).value !== "string"
  ) {
    return [{ code: "empty_payload", message: "Payload text must not be empty." }];
  }

  const { kind, value } = payload as QrTextPayload | QrUrlPayload;
  const errors = validatePayloadValueBounds(value);
  // An empty/over-length value is already fully reported — don't also run
  // the URL-format check against it (an empty string is trivially "not a
  // URL," which would be a redundant, less useful second error).
  if (errors.length > 0) return errors;

  if (kind === "url" && !isValidQrUrl(value)) {
    errors.push({
      code: "invalid_url",
      message: "Enter a valid URL starting with http:// or https://.",
    });
  }

  return errors;
}

export function validateQrConfig(config: Partial<QrEncodingConfig> | undefined): {
  config: QrEncodingConfig;
  errors: QrValidationError[];
} {
  const merged: QrEncodingConfig = { ...DEFAULT_QR_CONFIG, ...config };
  const errors: QrValidationError[] = [];

  if (!VALID_ERROR_CORRECTION_LEVELS.has(merged.errorCorrectionLevel)) {
    errors.push({
      code: "invalid_error_correction_level",
      message: 'Error correction level must be one of "L", "M", "Q", or "H".',
    });
  }
  if (!Number.isInteger(merged.size) || merged.size < MIN_QR_SIZE || merged.size > MAX_QR_SIZE) {
    errors.push({
      code: "invalid_size",
      message: `Size must be an integer between ${MIN_QR_SIZE} and ${MAX_QR_SIZE} pixels.`,
    });
  }
  if (!Number.isInteger(merged.margin) || merged.margin < MIN_QR_MARGIN || merged.margin > MAX_QR_MARGIN) {
    errors.push({
      code: "invalid_margin",
      message: `Margin must be an integer between ${MIN_QR_MARGIN} and ${MAX_QR_MARGIN} modules.`,
    });
  }
  if (!HEX_COLOR_PATTERN.test(merged.foregroundColor)) {
    errors.push({
      code: "invalid_foreground_color",
      message: "Foreground color must be a hex color (e.g. #000000).",
    });
  }
  if (!HEX_COLOR_PATTERN.test(merged.backgroundColor)) {
    errors.push({
      code: "invalid_background_color",
      message: "Background color must be a hex color (e.g. #ffffff).",
    });
  }

  return { config: merged, errors };
}

/**
 * Primary validation entry point. Collects *all* errors at once (payload and
 * config) rather than failing fast on the first, so a future form UI can
 * show every problem together.
 */
export function validateQrRequest(
  payload: unknown,
  config?: Partial<QrEncodingConfig>,
): QrValidationResult {
  const payloadErrors = validateQrPayload(payload);
  const { config: mergedConfig, errors: configErrors } = validateQrConfig(config);
  const errors = [...payloadErrors, ...configErrors];

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const typedPayload = payload as QrPayload;
  const encodedValue =
    typedPayload.kind === "wifi"
      ? buildWifiQrValue(typedPayload)
      : typedPayload.kind === "vcard"
        ? buildVCardQrValue(typedPayload)
        : typedPayload.value;

  return { ok: true, payload: typedPayload, config: mergedConfig, encodedValue };
}
