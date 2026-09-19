import QRCode from "qrcode";
import { validateQrRequest } from "../../shared/qr";
import type { QrEncodingConfig, QrPayload, QrValidationError } from "../../shared/qr";

/**
 * Codivio Shared QR Engine — browser-side rendering wrapper (Phase 4.1,
 * extended Phase 4.3/4.4 to accept every payload kind, extended Phase 4.7
 * to add a JPG export format alongside the existing PNG/SVG ones).
 *
 * This is the only file that imports the `qrcode` package. Pure types and
 * validation live in shared/qr/ so they stay importable from the Worker
 * (which has no Canvas API) without ever pulling in a rendering path.
 * `generateQrCode` itself needs no branching per payload kind — it always
 * encodes `result.encodedValue`, a string `validateQrRequest` has already
 * computed (the raw `.value` for text/url, the built `WIFI:...;;` string
 * for wifi, the vCard text block for vcard). This keeps the encoder itself
 * unaware of how many payload shapes exist, so export (Phase 4.7) never
 * needs a separate code path per payload kind either — it just calls this
 * same function again with a different `format`.
 */

export class QrGenerationError extends Error {
  errors: QrValidationError[];

  constructor(errors: QrValidationError[]) {
    super(errors.map((e) => e.message).join(" "));
    this.name = "QrGenerationError";
    this.errors = errors;
  }
}

export type QrOutputFormat = "png-data-url" | "jpg-data-url" | "svg";

export interface QrGenerateResult {
  format: QrOutputFormat;
  /** A `data:image/png;base64,...` or `data:image/jpeg;base64,...` URL for
   * the two data-url formats, or raw `<svg>` markup for "svg". */
  data: string;
}

/**
 * Validates the payload/config, then renders a QR code entirely client-side
 * (no network calls, no payload logged). Throws QrGenerationError on invalid
 * input rather than silently producing a blank-but-valid-looking QR.
 */
export async function generateQrCode(
  payload: QrPayload,
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
    const svg = await QRCode.toString(result.encodedValue, { ...options, type: "svg" });
    return { format: "svg", data: svg };
  }

  if (format === "jpg-data-url") {
    // JPEG is lossy — acceptable for a casual download, but PNG/SVG remain
    // the recommended formats for a QR code that must stay reliably
    // scannable at small sizes or after further compression/printing.
    const dataUrl = await QRCode.toDataURL(result.encodedValue, { ...options, type: "image/jpeg" });
    return { format: "jpg-data-url", data: dataUrl };
  }

  const dataUrl = await QRCode.toDataURL(result.encodedValue, options);
  return { format: "png-data-url", data: dataUrl };
}
