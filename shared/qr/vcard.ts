import type { QrValidationError, QrVCardPayload } from "./types";

/**
 * Codivio Shared QR Engine — vCard payload (Phase 4.5).
 *
 * Builds a standards-compatible vCard 3.0 (RFC 2426) payload — the format
 * recognized by Android/iOS camera apps and most scanners as an "Add
 * Contact" QR code.
 *
 * Escaping order matters: backslashes must be escaped first, before any
 * other step introduces a new backslash (comma/semicolon/newline escaping),
 * or those newly-inserted backslashes would themselves get re-escaped.
 */

const VCARD_LINE_BREAK = "\r\n";

export function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Practical caps on individual fields — generous enough for real names,
 * organizations, and contact details without risking an unreasonably large
 * (and harder to scan) QR payload. Not the vCard spec's own (effectively
 * unbounded) field-length allowance. */
export const MAX_VCARD_NAME_LENGTH = 100;
export const MAX_VCARD_ORGANIZATION_LENGTH = 100;
export const MAX_VCARD_JOB_TITLE_LENGTH = 100;
/** Generous enough for any real international phone number/formatting
 * (spaces, +, parentheses, dashes) — deliberately not validated for format,
 * only length, per "avoid over-validating legitimate international phone
 * numbers." */
export const MAX_VCARD_PHONE_LENGTH = 30;
/** RFC 5321's own maximum total email address length. */
export const MAX_VCARD_EMAIL_LENGTH = 254;
export const MAX_VCARD_WEBSITE_LENGTH = 500;

export function validateVCardPayload(payload: unknown): QrValidationError[] {
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as { kind?: unknown }).kind !== "vcard" ||
    typeof (payload as { firstName?: unknown }).firstName !== "string" ||
    typeof (payload as { lastName?: unknown }).lastName !== "string" ||
    typeof (payload as { organization?: unknown }).organization !== "string" ||
    typeof (payload as { jobTitle?: unknown }).jobTitle !== "string" ||
    typeof (payload as { phone?: unknown }).phone !== "string" ||
    typeof (payload as { email?: unknown }).email !== "string" ||
    typeof (payload as { website?: unknown }).website !== "string"
  ) {
    return [{ code: "empty_payload", message: "Payload text must not be empty." }];
  }

  const { firstName, lastName, organization, jobTitle, phone, email, website } = payload as QrVCardPayload;
  const errors: QrValidationError[] = [];

  // A contact card needs at least one identifying name; every other field
  // is optional (no reason to force an org/phone/email/website to exist).
  if (firstName.trim().length === 0 && lastName.trim().length === 0) {
    errors.push({ code: "vcard_name_required", message: "Enter a first or last name." });
  }
  if (firstName.length > MAX_VCARD_NAME_LENGTH) {
    errors.push({
      code: "vcard_first_name_too_long",
      message: `First name must be at most ${MAX_VCARD_NAME_LENGTH} characters.`,
    });
  }
  if (lastName.length > MAX_VCARD_NAME_LENGTH) {
    errors.push({
      code: "vcard_last_name_too_long",
      message: `Last name must be at most ${MAX_VCARD_NAME_LENGTH} characters.`,
    });
  }
  if (organization.length > MAX_VCARD_ORGANIZATION_LENGTH) {
    errors.push({
      code: "vcard_organization_too_long",
      message: `Organization must be at most ${MAX_VCARD_ORGANIZATION_LENGTH} characters.`,
    });
  }
  if (jobTitle.length > MAX_VCARD_JOB_TITLE_LENGTH) {
    errors.push({
      code: "vcard_job_title_too_long",
      message: `Job title must be at most ${MAX_VCARD_JOB_TITLE_LENGTH} characters.`,
    });
  }
  if (phone.length > MAX_VCARD_PHONE_LENGTH) {
    errors.push({
      code: "vcard_phone_too_long",
      message: `Phone must be at most ${MAX_VCARD_PHONE_LENGTH} characters.`,
    });
  }
  if (email.length > MAX_VCARD_EMAIL_LENGTH) {
    errors.push({
      code: "vcard_email_too_long",
      message: `Email must be at most ${MAX_VCARD_EMAIL_LENGTH} characters.`,
    });
  }
  if (website.length > MAX_VCARD_WEBSITE_LENGTH) {
    errors.push({
      code: "vcard_website_too_long",
      message: `Website must be at most ${MAX_VCARD_WEBSITE_LENGTH} characters.`,
    });
  }

  return errors;
}

/** Builds the actual scannable vCard 3.0 text block from validated fields.
 * Never called with unvalidated input — see validate.ts#validateQrRequest,
 * which only calls this once validateVCardPayload has already passed.
 * Optional fields are only emitted as a line when they have real content
 * (an all-whitespace value is treated as absent, same convention as the
 * WiFi builder). Un-emitted optional fields are never padded/faked. */
export function buildVCardQrValue(payload: QrVCardPayload): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];

  lines.push(`N:${escapeVCardValue(payload.lastName)};${escapeVCardValue(payload.firstName)};;;`);

  // FN (formatted/display name) is required by the vCard spec and is
  // synthesized, not a direct user-entered field — trimming/joining its
  // two parts here is a display concern, distinct from preserving the raw
  // firstName/lastName values used above and in N.
  const fullName = [payload.firstName.trim(), payload.lastName.trim()].filter((part) => part.length > 0).join(" ");
  lines.push(`FN:${escapeVCardValue(fullName)}`);

  if (payload.organization.trim().length > 0) lines.push(`ORG:${escapeVCardValue(payload.organization)}`);
  if (payload.jobTitle.trim().length > 0) lines.push(`TITLE:${escapeVCardValue(payload.jobTitle)}`);
  if (payload.phone.trim().length > 0) lines.push(`TEL:${escapeVCardValue(payload.phone)}`);
  if (payload.email.trim().length > 0) lines.push(`EMAIL:${escapeVCardValue(payload.email)}`);
  if (payload.website.trim().length > 0) lines.push(`URL:${escapeVCardValue(payload.website)}`);

  lines.push("END:VCARD");
  return lines.join(VCARD_LINE_BREAK);
}
