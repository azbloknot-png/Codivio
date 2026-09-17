import {
  DEFAULT_QR_CONFIG,
  MAX_QR_MARGIN,
  MAX_QR_PAYLOAD_LENGTH,
  MAX_QR_SIZE,
  MIN_QR_MARGIN,
  MIN_QR_SIZE,
  type QrEncodingConfig,
  type QrTextPayload,
  type QrValidationError,
  type QrValidationResult,
} from "./types";

/** Strict hex color only — `#rgb`, `#rrggbb`, or `#rrggbbaa`. Named CSS
 * colors and rgb()/hsl() are rejected in this phase to keep this a single
 * regex; a future phase can deliberately widen it. */
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const VALID_ERROR_CORRECTION_LEVELS = new Set(["L", "M", "Q", "H"]);

export function validateQrPayload(payload: unknown): QrValidationError[] {
  const errors: QrValidationError[] = [];
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as { kind?: unknown }).kind !== "text" ||
    typeof (payload as { value?: unknown }).value !== "string" ||
    (payload as { value: string }).value.trim().length === 0
  ) {
    errors.push({ code: "empty_payload", message: "Payload text must not be empty." });
    return errors;
  }
  const value = (payload as QrTextPayload).value;
  if (value.length > MAX_QR_PAYLOAD_LENGTH) {
    errors.push({
      code: "payload_too_long",
      message: `Payload text must be at most ${MAX_QR_PAYLOAD_LENGTH} characters.`,
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

  return { ok: true, payload: payload as QrTextPayload, config: mergedConfig };
}
