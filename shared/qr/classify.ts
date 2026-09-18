export type ScannedQrContentKind =
  | "url"
  | "wifi"
  | "vcard"
  | "email"
  | "phone"
  | "sms"
  | "location"
  | "calendar"
  | "text";

export interface ScannedQrClassification {
  kind: ScannedQrContentKind;
  /** Short, human-readable label for the UI — never the raw decoded value. */
  label: string;
}

/**
 * Codivio Shared QR Engine — scanned-content classification (Phase 4.6).
 *
 * Pure, prefix-based best-effort labeling of decoded QR text, so the
 * scanner UI can show "Wi-Fi network" instead of a raw `WIFI:...` string.
 * This is deliberately NOT a full parser for any of these formats — the
 * Master Plan and this phase's own scope only require Codivio to display
 * decoded content safely, not to fully parse every possible payload type.
 * No branch here inspects anything beyond a fixed literal prefix, so this
 * can never itself become an injection/parsing risk.
 */
export function classifyScannedQrContent(value: string): ScannedQrClassification {
  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) return { kind: "url", label: "Link" };
  if (/^WIFI:/i.test(trimmed)) return { kind: "wifi", label: "Wi-Fi network" };
  if (/^BEGIN:VCARD/i.test(trimmed)) return { kind: "vcard", label: "Contact card" };
  if (/^BEGIN:VCALENDAR/i.test(trimmed) || /^BEGIN:VEVENT/i.test(trimmed)) {
    return { kind: "calendar", label: "Calendar event" };
  }
  if (/^mailto:/i.test(trimmed)) return { kind: "email", label: "Email address" };
  if (/^tel:/i.test(trimmed)) return { kind: "phone", label: "Phone number" };
  if (/^(sms|smsto):/i.test(trimmed)) return { kind: "sms", label: "Text message" };
  if (/^geo:/i.test(trimmed)) return { kind: "location", label: "Location" };

  return { kind: "text", label: "Text" };
}
