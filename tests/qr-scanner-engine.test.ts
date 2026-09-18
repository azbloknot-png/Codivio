import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { decodeQrFromImageData } from "../src/lib/qr-scanner-engine";

/**
 * Phase 4.6 — QR Code Scanner engine.
 *
 * Rather than mocking `jsqr`, these tests rasterize a REAL QR bit matrix
 * (produced by the already-installed `qrcode` encoding library's
 * `create()` API, which returns the raw module grid without ever touching
 * a Canvas) into raw RGBA pixel data, then feed that through
 * `decodeQrFromImageData`. This exercises the actual decode path against a
 * genuine, correctly-encoded QR pattern (including a real quiet zone) —
 * not a stand-in — without needing a browser Canvas/jsdom in this Node
 * test environment.
 */
function rasterizeQrText(text: string, moduleScale = 4, marginModules = 4) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const moduleCount = qr.modules.size;
  const totalModules = moduleCount + marginModules * 2;
  const pixelSize = totalModules * moduleScale;
  const data = new Uint8ClampedArray(pixelSize * pixelSize * 4);

  // Fill everything white first (background + quiet zone).
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.modules.get(row, col) !== 1) continue;
      const startX = (col + marginModules) * moduleScale;
      const startY = (row + marginModules) * moduleScale;
      for (let y = 0; y < moduleScale; y++) {
        for (let x = 0; x < moduleScale; x++) {
          const offset = ((startY + y) * pixelSize + (startX + x)) * 4;
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
          data[offset + 3] = 255;
        }
      }
    }
  }

  return { data, width: pixelSize, height: pixelSize };
}

describe("decodeQrFromImageData", () => {
  it("decodes a real, freshly-encoded QR pattern back to its original URL text", () => {
    const imageData = rasterizeQrText("https://codivio.online");
    const result = decodeQrFromImageData(imageData);
    expect(result).not.toBeNull();
    expect(result?.data).toBe("https://codivio.online");
  });

  it("decodes a WiFi-format payload the same way as any other text (no special-casing in the decoder)", () => {
    const value = "WIFI:T:WPA;S:MyNetwork;P:hunter2pass;H:false;;";
    const imageData = rasterizeQrText(value);
    const result = decodeQrFromImageData(imageData);
    expect(result?.data).toBe(value);
  });

  it("decodes a vCard-format payload correctly", () => {
    const value = "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;Jane;;;\r\nFN:Jane Doe\r\nEND:VCARD";
    const imageData = rasterizeQrText(value);
    const result = decodeQrFromImageData(imageData);
    expect(result?.data).toBe(value);
  });

  it("returns null (not a thrown error) for random noise with no real QR pattern", () => {
    const width = 200;
    const height = 200;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(Math.random() * 256);
      data[i + 1] = Math.floor(Math.random() * 256);
      data[i + 2] = Math.floor(Math.random() * 256);
      data[i + 3] = 255;
    }
    expect(() => decodeQrFromImageData({ data, width, height })).not.toThrow();
    expect(decodeQrFromImageData({ data, width, height })).toBeNull();
  });

  it("returns null for a blank (all-white) image", () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4).fill(255);
    expect(decodeQrFromImageData({ data, width, height })).toBeNull();
  });
});
