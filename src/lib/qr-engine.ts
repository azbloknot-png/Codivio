import QRCode from "qrcode";
import { validateQrRequest } from "../../shared/qr";
import type { QrEncodingConfig, QrTextPayload, QrValidationError } from "../../shared/qr";

/**
 * Codivio Shared QR Engine — browser-side rendering wrapper (Phase 4.1).
 *
 * This is the only file that imports the `qrcode` package. Pure types and
 * validation live in shared/qr/ so they stay importable from the Worker
 * (which has no Canvas API) without ever pulling in a rendering path.
 */

export class QrGenerationError extends Error {
  errors: QrValidationError[];

  constructor(errors: QrValidationError[]) {
    super(errors.map((e) => e.message).join(" "));
    this.name = "QrGenerationError";
    this.errors = errors;
  }
}

export type QrOutputFormat = "png-data-url" | "svg";

export interface QrGenerateResult {
  format: QrOutputFormat;
  /** A `data:image/png;base64,...` URL for "png-data-url", or raw `<svg>` markup for "svg". */
  data: string;
}

/**
 * Validates the payload/config, then renders a QR code entirely client-side
 * (no network calls, no payload logged). Throws QrGenerationError on invalid
 * input rather than silently producing a blank-but-valid-looking QR.
 */
export async function generateQrCode(
  payload: QrTextPayload,
  config?: Partial<QrEncodingConfig>,
  format: QrOutputFormat = "png-data-url",
): Promise<QrGenerateResult> {
  const result = validateQrRequest(payload, config);
  if (!result.ok) {
    throw new QrGenerationError(result.errors);
  }

  const options = {
    errorCorrectionLevel: result.config.errorCorrectionLevel,
    width: result.config.size,
    margin: result.config.margin,
    color: {
      dark: result.config.foregroundColor,
      light: result.config.backgroundColor,
    },
  };

  if (format === "svg") {
    const svg = await QRCode.toString(result.payload.value, { ...options, type: "svg" });
    return { format: "svg", data: svg };
  }

  const dataUrl = await QRCode.toDataURL(result.payload.value, options);
  return { format: "png-data-url", data: dataUrl };
}
