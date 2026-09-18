import { describe, expect, it } from "vitest";
import { classifyScannedQrContent } from "../shared/qr";

/**
 * Phase 4.6 — scanned-content classification. Deliberately minimal:
 * prefix-based labeling only, never a full per-format parser (see
 * shared/qr/classify.ts's own header comment for why).
 */
describe("classifyScannedQrContent", () => {
  it("classifies http/https as a link", () => {
    expect(classifyScannedQrContent("https://codivio.online").kind).toBe("url");
    expect(classifyScannedQrContent("http://example.com").kind).toBe("url");
  });

  it("classifies WIFI: as a Wi-Fi network", () => {
    expect(classifyScannedQrContent("WIFI:T:WPA;S:Home;P:pass;H:false;;").kind).toBe("wifi");
  });

  it("classifies BEGIN:VCARD as a contact card", () => {
    expect(classifyScannedQrContent("BEGIN:VCARD\r\nVERSION:3.0\r\nEND:VCARD").kind).toBe("vcard");
  });

  it("classifies BEGIN:VCALENDAR/VEVENT as a calendar event", () => {
    expect(classifyScannedQrContent("BEGIN:VCALENDAR\r\nEND:VCALENDAR").kind).toBe("calendar");
    expect(classifyScannedQrContent("BEGIN:VEVENT\r\nEND:VEVENT").kind).toBe("calendar");
  });

  it("classifies mailto:/tel:/sms:/geo: correctly", () => {
    expect(classifyScannedQrContent("mailto:a@b.com").kind).toBe("email");
    expect(classifyScannedQrContent("tel:+15551234567").kind).toBe("phone");
    expect(classifyScannedQrContent("SMSTO:+15551234567").kind).toBe("sms");
    expect(classifyScannedQrContent("sms:+15551234567").kind).toBe("sms");
    expect(classifyScannedQrContent("geo:37.7,-122.4").kind).toBe("location");
  });

  it("falls back to plain text for anything else, including arbitrary/malformed content", () => {
    expect(classifyScannedQrContent("just some plain text").kind).toBe("text");
    expect(classifyScannedQrContent("<script>alert(1)</script>").kind).toBe("text");
    expect(classifyScannedQrContent("").kind).toBe("text");
  });
});
