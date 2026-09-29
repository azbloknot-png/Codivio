/**
 * Codivio Ad Slots — centralized validation (Phase 7.4 — Admin Ad
 * Management), implementing the controlled model reviewed and approved in
 * Phase 7.3 (Ad Slot Architecture, zero-code-change audit).
 *
 * Mirrors shared/tools.ts's exact pattern: one framework-agnostic module,
 * imported by both the Worker (authoritative enforcement, see
 * worker/ad-slots.ts) and the React Admin UI (client-side hinting only —
 * the server always re-validates).
 *
 * CONTROLLED MODEL, NOT ARBITRARY CODE (CLAUDE.md §14): `provider` and
 * `adUnitId` are the only fields describing *which* ad to show — there is
 * deliberately no field here for raw HTML, JavaScript, or an iframe source.
 * The existing `ad_slots.code TEXT` database column is NOT modeled here and
 * must never be read, written, or exposed through this validator or its
 * Worker caller — see database/schema.sql's own comment on that column and
 * migrations/0011_ad_slots_controlled_model.sql for why it is retired in
 * place rather than dropped.
 *
 * AD_SLOT_PROVIDERS/AD_SLOT_POSITIONS/AD_SLOT_DEVICES/AD_SLOT_STATUSES are
 * deliberately narrow, evidence-based allowlists (Phase 7.3's own findings):
 * exactly one real provider candidate (AdSense), exactly the 3 real existing
 * `AdSlot` placements in src/App.tsx, the device/status values already
 * present in database/schema.sql's `ad_slots` table. None of these invent a
 * value with no current evidence.
 */

export const AD_SLOT_PROVIDERS = ["adsense"] as const;
export type AdSlotProvider = (typeof AD_SLOT_PROVIDERS)[number];

export function isValidAdSlotProvider(value: string): value is AdSlotProvider {
  return (AD_SLOT_PROVIDERS as readonly string[]).includes(value);
}

/** Exactly the 3 real `AdSlot` usages in src/App.tsx (Phase 7.1/7.3 finding)
 * — never widened speculatively; add a value here only once a real fourth
 * placement exists in the frontend. */
export const AD_SLOT_POSITIONS = ["homepage-hero", "homepage-mid", "blog-page"] as const;
export type AdSlotPosition = (typeof AD_SLOT_POSITIONS)[number];

export function isValidAdSlotPosition(value: string): value is AdSlotPosition {
  return (AD_SLOT_POSITIONS as readonly string[]).includes(value);
}

export const AD_SLOT_DEVICES = ["all", "desktop", "mobile"] as const;
export type AdSlotDevice = (typeof AD_SLOT_DEVICES)[number];

export function isValidAdSlotDevice(value: string): value is AdSlotDevice {
  return (AD_SLOT_DEVICES as readonly string[]).includes(value);
}

export const AD_SLOT_STATUSES = ["active", "inactive"] as const;
export type AdSlotStatus = (typeof AD_SLOT_STATUSES)[number];

export function isValidAdSlotStatus(value: string): value is AdSlotStatus {
  return (AD_SLOT_STATUSES as readonly string[]).includes(value);
}

const NAME_MAX_LENGTH = 200;
const NO_ANGLE_BRACKETS = /[<>]/;

/** Real AdSense ad-unit IDs are short alphanumeric/hyphenated tokens (e.g.
 * a slot ID or a "ca-pub-.../..." style reference) — never markup, never a
 * URL, never a script. Optional: an empty string means "not configured
 * yet" (the honest default before a real provider is connected), matching
 * shared/settings.ts's own `advertising.adsense_configured` boolean's
 * "not yet configured" default. Not treated as a secret (mirrors
 * src/lib/analytics.ts's GA4 Measurement ID precedent), but still never
 * blindly trusted — format-validated here, same as every other field. */
const AD_UNIT_ID_PATTERN = /^[A-Za-z0-9_-]*$/;
const AD_UNIT_ID_MAX_LENGTH = 64;

const WIDTH_HEIGHT_MIN = 1;
const WIDTH_HEIGHT_MAX = 4000;
const PRIORITY_MIN = 0;
const PRIORITY_MAX = 9999;

export interface AdSlotInput {
  name: string;
  provider: AdSlotProvider;
  adUnitId: string;
  position: AdSlotPosition;
  device: AdSlotDevice;
  width: number | null;
  height: number | null;
  priority: number;
  status: AdSlotStatus;
}

export type FieldValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type AdSlotValidationResult = FieldValidationResult<AdSlotInput>;

function validateName(raw: unknown): FieldValidationResult<string> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, error: "Name is required" };
  }
  if (raw.length > NAME_MAX_LENGTH) {
    return { ok: false, error: "Name exceeds the maximum allowed length" };
  }
  if (NO_ANGLE_BRACKETS.test(raw)) {
    return { ok: false, error: "Name contains disallowed characters" };
  }
  return { ok: true, value: raw };
}

function validateAdUnitId(raw: unknown): FieldValidationResult<string> {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: "" };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "Ad unit ID must be a string" };
  }
  if (raw.length > AD_UNIT_ID_MAX_LENGTH) {
    return { ok: false, error: "Ad unit ID exceeds the maximum allowed length" };
  }
  if (!AD_UNIT_ID_PATTERN.test(raw)) {
    return { ok: false, error: "Ad unit ID may only contain letters, numbers, hyphens and underscores" };
  }
  return { ok: true, value: raw };
}

function validateDimension(raw: unknown, field: string): FieldValidationResult<number | null> {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: null };
  }
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return { ok: false, error: `${field} must be a whole number` };
  }
  if (raw < WIDTH_HEIGHT_MIN || raw > WIDTH_HEIGHT_MAX) {
    return { ok: false, error: `${field} is out of the allowed range` };
  }
  return { ok: true, value: raw };
}

/**
 * The single server-side validation boundary for an ad-slot create/update.
 * Callers pass a plain object already merged with any existing row (for a
 * partial PATCH), mirroring shared/tools.ts#validateToolInput's exact
 * contract. Every field is checked against a closed allowlist or a strict
 * format/range — nothing here ever accepts raw HTML, JavaScript, or an
 * iframe source, by construction (no such field exists in AdSlotInput).
 */
export function validateAdSlotInput(raw: Record<string, unknown>): AdSlotValidationResult {
  const name = validateName(raw.name);
  if (!name.ok) return name;

  const providerRaw = typeof raw.provider === "string" && raw.provider.length > 0 ? raw.provider : AD_SLOT_PROVIDERS[0];
  if (!isValidAdSlotProvider(providerRaw)) {
    return { ok: false, error: "Provider must be one of: " + AD_SLOT_PROVIDERS.join(", ") };
  }

  const adUnitId = validateAdUnitId(raw.adUnitId);
  if (!adUnitId.ok) return adUnitId;

  const positionRaw = typeof raw.position === "string" ? raw.position : "";
  if (!isValidAdSlotPosition(positionRaw)) {
    return { ok: false, error: "Position must be one of: " + AD_SLOT_POSITIONS.join(", ") };
  }

  const deviceRaw = typeof raw.device === "string" && raw.device.length > 0 ? raw.device : "all";
  if (!isValidAdSlotDevice(deviceRaw)) {
    return { ok: false, error: "Device must be one of: " + AD_SLOT_DEVICES.join(", ") };
  }

  const width = validateDimension(raw.width, "Width");
  if (!width.ok) return width;

  const height = validateDimension(raw.height, "Height");
  if (!height.ok) return height;

  const priorityRaw = raw.priority === undefined ? 0 : raw.priority;
  if (typeof priorityRaw !== "number" || !Number.isInteger(priorityRaw)) {
    return { ok: false, error: "Priority must be an integer" };
  }
  if (priorityRaw < PRIORITY_MIN || priorityRaw > PRIORITY_MAX) {
    return { ok: false, error: "Priority is out of the allowed range" };
  }

  const statusRaw = typeof raw.status === "string" ? raw.status : "active";
  if (!isValidAdSlotStatus(statusRaw)) {
    return { ok: false, error: "Status must be one of: " + AD_SLOT_STATUSES.join(", ") };
  }

  return {
    ok: true,
    value: {
      name: name.value,
      provider: providerRaw,
      adUnitId: adUnitId.value,
      position: positionRaw,
      device: deviceRaw,
      width: width.value,
      height: height.value,
      priority: priorityRaw,
      status: statusRaw,
    },
  };
}
