import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { buildVCardQrValue, escapeVCardValue, validateQrRequest, validateVCardPayload } from "../shared/qr";
import { generateQrCode } from "../src/lib/qr-engine";

/**
 * Phase 4.5 — vCard QR Builder.
 *
 * Only the genuinely new logic is tested here: vCard field escaping, the
 * "BEGIN:VCARD...END:VCARD" formatting, and required/length validation.
 * The generic config validation and real PNG/SVG output checks are already
 * covered by tests/qr-engine.test.ts and are not duplicated.
 */

const BLANK_VCARD = {
  kind: "vcard" as const,
  firstName: "",
  lastName: "",
  organization: "",
  jobTitle: "",
  phone: "",
  email: "",
  website: "",
};

describe("escapeVCardValue", () => {
  it("escapes backslash, comma, semicolon, and newline", () => {
    expect(escapeVCardValue("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });

  it("leaves ordinary characters untouched", () => {
    expect(escapeVCardValue("Jane O'Connor")).toBe("Jane O'Connor");
  });
});

describe("buildVCardQrValue", () => {
  it("builds a minimal vCard with only a first name", () => {
    const value = buildVCardQrValue({ ...BLANK_VCARD, firstName: "Jane" });
    expect(value).toBe(["BEGIN:VCARD", "VERSION:3.0", "N:;Jane;;;", "FN:Jane", "END:VCARD"].join("\r\n"));
  });

  it("builds a full vCard with every optional field present", () => {
    const value = buildVCardQrValue({
      kind: "vcard",
      firstName: "Jane",
      lastName: "Doe",
      organization: "Codivio",
      jobTitle: "Engineer",
      phone: "+1 555 123 4567",
      email: "jane@example.com",
      website: "https://example.com",
    });
    expect(value).toBe(
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "N:Doe;Jane;;;",
        "FN:Jane Doe",
        "ORG:Codivio",
        "TITLE:Engineer",
        "TEL:+1 555 123 4567",
        "EMAIL:jane@example.com",
        "URL:https://example.com",
        "END:VCARD",
      ].join("\r\n"),
    );
  });

  it("omits empty optional fields rather than emitting blank lines", () => {
    const value = buildVCardQrValue({ ...BLANK_VCARD, lastName: "Doe" });
    expect(value).not.toContain("ORG:");
    expect(value).not.toContain("TITLE:");
    expect(value).not.toContain("TEL:");
    expect(value).not.toContain("EMAIL:");
    expect(value).not.toContain("URL:");
  });

  it("escapes special characters in name and organization fields", () => {
    const value = buildVCardQrValue({ ...BLANK_VCARD, firstName: "Jane;Q", lastName: "Doe,Jr", organization: "A\\B" });
    expect(value).toContain("N:Doe\\,Jr;Jane\\;Q;;;");
    expect(value).toContain("ORG:A\\\\B");
  });
});

describe("validateVCardPayload / validateQrRequest with the vcard kind", () => {
  it("accepts a minimal payload with only a first name", () => {
    const result = validateQrRequest({ ...BLANK_VCARD, firstName: "Jane" });
    expect(result.ok).toBe(true);
  });

  it("requires at least a first or last name", () => {
    const errors = validateVCardPayload(BLANK_VCARD);
    expect(errors.map((e) => e.code)).toContain("vcard_name_required");
  });

  it("accepts a last-name-only payload (first/last are independently sufficient)", () => {
    const errors = validateVCardPayload({ ...BLANK_VCARD, lastName: "Doe" });
    expect(errors).toEqual([]);
  });

  it("enforces per-field length caps without requiring any optional field", () => {
    const errors = validateVCardPayload({ ...BLANK_VCARD, firstName: "Jane", organization: "x".repeat(101) });
    expect(errors.map((e) => e.code)).toEqual(["vcard_organization_too_long"]);
  });

  it("multiple simultaneous errors are all collected, not just the first", () => {
    const errors = validateVCardPayload({ ...BLANK_VCARD, phone: "x".repeat(31), email: "x".repeat(255) });
    expect(errors.map((e) => e.code)).toEqual(
      expect.arrayContaining(["vcard_name_required", "vcard_phone_too_long", "vcard_email_too_long"]),
    );
  });

  it("a text/url/wifi payload is never run through vCard validation", () => {
    const result = validateQrRequest({ kind: "text", value: "not a vcard at all" });
    expect(result.ok).toBe(true);
  });
});

describe("generateQrCode with a vcard payload", () => {
  it("renders the built vCard text block, not the raw fields", async () => {
    const result = await generateQrCode({ ...BLANK_VCARD, firstName: "Jane" });
    expect(result.format).toBe("png-data-url");
    expect(result.data.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("rejects an invalid vcard payload (no name at all) rather than encoding it anyway", async () => {
    await expect(generateQrCode(BLANK_VCARD)).rejects.toThrow();
  });
});

describe("QrCodeGeneratorTool vCard mode UI", () => {
  const source = fs.readFileSync(new URL("../src/tools/QrCodeGeneratorTool.tsx", import.meta.url), "utf8");

  it("has a vCard mode toggle with first/last/organization/job title/phone/email/website controls", () => {
    expect(source).toContain('aria-pressed={mode === "vcard"}');
    expect(source).toContain("qr-vcard-first-name");
    expect(source).toContain("qr-vcard-last-name");
    expect(source).toContain("qr-vcard-organization");
    expect(source).toContain("qr-vcard-job-title");
    expect(source).toContain("qr-vcard-phone");
    expect(source).toContain("qr-vcard-email");
    expect(source).toContain("qr-vcard-website");
  });

  it("never logs vCard contact data (no console.* call anywhere in the component)", () => {
    expect(source).not.toMatch(/console\.(log|info|warn|debug)/);
  });

  it("the phone and email fields never appear in the QR preview's accessible alt text", () => {
    expect(source).not.toMatch(/alt=\{[^}]*vcardPhone/);
    expect(source).not.toMatch(/alt=\{[^}]*vcardEmail/);
  });

  // The Phase 4.5 "does not implement download/export controls (reserved
  // for Phase 4.7)" guard was removed here: Phase 4.7 has now legitimately
  // added Download PNG/JPG/SVG controls (see tests/qr-generator-tool.test.ts
  // for their coverage), so that guard's premise is intentionally no longer
  // true — this is a deliberate removal of an obsolete assertion, not a
  // hidden failure or a weakened check.
});
