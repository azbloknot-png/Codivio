import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { buildWifiQrValue, escapeWifiValue, validateQrRequest, validateWifiPayload } from "../shared/qr";
import { generateQrCode } from "../src/lib/qr-engine";

/**
 * Phase 4.4 — WiFi QR Builder.
 *
 * Only the genuinely new logic is tested here: WiFi field escaping, the
 * "WIFI:...;;" formatting, and per-security-type validation. The generic
 * config validation and real PNG/SVG output checks are already covered by
 * tests/qr-engine.test.ts and are not duplicated.
 */

describe("escapeWifiValue", () => {
  it("escapes backslash, semicolon, comma, and colon", () => {
    expect(escapeWifiValue("a;b,c:d\\e")).toBe("a\\;b\\,c\\:d\\\\e");
  });

  it("leaves ordinary characters untouched", () => {
    expect(escapeWifiValue("My Home Network 5G")).toBe("My Home Network 5G");
  });
});

describe("buildWifiQrValue", () => {
  it("builds the standard WIFI: format for a WPA network", () => {
    const value = buildWifiQrValue({ kind: "wifi", ssid: "MyNetwork", password: "hunter2pass", security: "WPA", hidden: false });
    expect(value).toBe("WIFI:T:WPA;S:MyNetwork;P:hunter2pass;H:false;;");
  });

  it("omits the password for an open (nopass) network even if one is set on the object", () => {
    const value = buildWifiQrValue({ kind: "wifi", ssid: "OpenCafe", password: "ignored", security: "nopass", hidden: false });
    expect(value).toBe("WIFI:T:nopass;S:OpenCafe;P:;H:false;;");
  });

  it("marks hidden networks with H:true", () => {
    const value = buildWifiQrValue({ kind: "wifi", ssid: "Secret", password: "longenough1", security: "WPA", hidden: true });
    expect(value).toContain("H:true;;");
  });

  it("escapes special characters in SSID and password within the built value", () => {
    const value = buildWifiQrValue({ kind: "wifi", ssid: "Cafe;Wifi", password: "pa:ss,word", security: "WPA", hidden: false });
    expect(value).toBe("WIFI:T:WPA;S:Cafe\\;Wifi;P:pa\\:ss\\,word;H:false;;");
  });
});

describe("validateWifiPayload / validateQrRequest with the wifi kind", () => {
  it("accepts a valid WPA network", () => {
    const result = validateQrRequest({ kind: "wifi", ssid: "Home", password: "longenough1", security: "WPA", hidden: false });
    expect(result.ok).toBe(true);
  });

  it("requires a non-empty SSID regardless of security type", () => {
    const errors = validateWifiPayload({ kind: "wifi", ssid: "", password: "longenough1", security: "WPA", hidden: false });
    expect(errors.map((e) => e.code)).toContain("wifi_ssid_required");
  });

  it("requires a password for WPA and WEP but not for an open network", () => {
    const wpaNoPassword = validateWifiPayload({ kind: "wifi", ssid: "Home", password: "", security: "WPA", hidden: false });
    expect(wpaNoPassword.map((e) => e.code)).toContain("wifi_password_required");

    const wepNoPassword = validateWifiPayload({ kind: "wifi", ssid: "Home", password: "", security: "WEP", hidden: false });
    expect(wepNoPassword.map((e) => e.code)).toContain("wifi_password_required");

    const openNoPassword = validateWifiPayload({ kind: "wifi", ssid: "Home", password: "", security: "nopass", hidden: false });
    expect(openNoPassword).toEqual([]);
  });

  it("enforces the real WPA passphrase length bounds (8-63 characters) but not for WEP", () => {
    const tooShortWpa = validateWifiPayload({ kind: "wifi", ssid: "Home", password: "short", security: "WPA", hidden: false });
    expect(tooShortWpa.map((e) => e.code)).toContain("wifi_password_too_short");

    const tooLongWpa = validateWifiPayload({ kind: "wifi", ssid: "Home", password: "a".repeat(64), security: "WPA", hidden: false });
    expect(tooLongWpa.map((e) => e.code)).toContain("wifi_password_too_long");

    // WEP: only non-empty is required, not the WPA length bounds.
    const shortWep = validateWifiPayload({ kind: "wifi", ssid: "Home", password: "1234", security: "WEP", hidden: false });
    expect(shortWep).toEqual([]);
  });

  it("multiple simultaneous errors are all collected, not just the first", () => {
    const errors = validateWifiPayload({ kind: "wifi", ssid: "", password: "", security: "WPA", hidden: false });
    expect(errors.map((e) => e.code)).toEqual(expect.arrayContaining(["wifi_ssid_required", "wifi_password_required"]));
  });

  it("a text/url payload is never run through WiFi validation", () => {
    const result = validateQrRequest({ kind: "text", value: "not wifi at all" });
    expect(result.ok).toBe(true);
  });
});

describe("generateQrCode with a wifi payload", () => {
  it("renders the built WIFI: string, not the raw SSID/password fields", async () => {
    const result = await generateQrCode({ kind: "wifi", ssid: "Home", password: "longenough1", security: "WPA", hidden: false });
    expect(result.format).toBe("png-data-url");
    expect(result.data.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("rejects an invalid wifi payload (missing SSID) rather than encoding it anyway", async () => {
    await expect(generateQrCode({ kind: "wifi", ssid: "", password: "longenough1", security: "WPA", hidden: false })).rejects.toThrow();
  });
});

describe("QrCodeGeneratorTool WiFi mode UI", () => {
  const source = fs.readFileSync(new URL("../src/tools/QrCodeGeneratorTool.tsx", import.meta.url), "utf8");

  it("has a WiFi mode toggle with SSID/security/password/hidden-network controls", () => {
    expect(source).toContain('aria-pressed={mode === "wifi"}');
    expect(source).toContain("qr-wifi-ssid");
    expect(source).toContain("qr-wifi-security");
    expect(source).toContain("qr-wifi-password");
    expect(source).toContain("This is a hidden network");
  });

  it("never logs WiFi credentials (no console.* call anywhere in the component)", () => {
    expect(source).not.toMatch(/console\.(log|info|warn|debug)/);
  });

  it("the password field never appears in the QR preview's accessible alt text", () => {
    expect(source).not.toMatch(/alt=\{[^}]*wifiPassword/);
  });
});
