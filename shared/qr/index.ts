export {
  DEFAULT_QR_CONFIG,
  MAX_QR_PAYLOAD_LENGTH,
  MIN_QR_SIZE,
  MAX_QR_SIZE,
  MIN_QR_MARGIN,
  MAX_QR_MARGIN,
} from "./types";
export type {
  QrErrorCorrectionLevel,
  QrTextPayload,
  QrUrlPayload,
  QrWifiSecurity,
  QrWifiPayload,
  QrPayload,
  QrEncodingConfig,
  QrValidationErrorCode,
  QrValidationError,
  QrValidationResult,
} from "./types";

export { validateQrPayload, validateQrConfig, validateQrRequest, isValidQrUrl } from "./validate";

export {
  escapeWifiValue,
  buildWifiQrValue,
  validateWifiPayload,
  MAX_WIFI_SSID_LENGTH,
  MIN_WIFI_WPA_PASSWORD_LENGTH,
  MAX_WIFI_PASSWORD_LENGTH,
} from "./wifi";
