import jsQR from "jsqr";

/**
 * Codivio Shared QR Engine — browser-side scanning wrapper (Phase 4.6).
 *
 * This is the only file that imports the `jsqr` package, mirroring how
 * `qr-engine.ts` is the only file importing `qrcode` (Phase 4.1). Pure
 * classification logic lives in shared/qr/classify.ts so it stays
 * importable from anywhere without pulling in a decoding path.
 *
 * The parameter is a minimal structural type — not the full DOM `ImageData`
 * interface — so this function stays testable under plain Node/Vitest
 * (no `ImageData` global exists there) while a real, browser-produced
 * `ImageData` object (from `CanvasRenderingContext2D#getImageData`)
 * satisfies it without any cast.
 */
export interface DecodableImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface ScannedQrResult {
  data: string;
}

/**
 * Decodes a QR code from raw pixel data entirely client-side (no network
 * call, no image ever leaves the browser). Returns null — never throws —
 * when no QR code is found, so callers can treat "not found" as a normal,
 * expected outcome rather than an error.
 */
export function decodeQrFromImageData(imageData: DecodableImageData): ScannedQrResult | null {
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  if (!result || typeof result.data !== "string" || result.data.length === 0) {
    return null;
  }
  return { data: result.data };
}
