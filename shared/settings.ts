/**
 * Codivio Settings — centralized registry and validation (Phase 2.7).
 *
 * Mirrors the shared/rbac.ts pattern: one framework-agnostic module,
 * imported by both the Worker (authoritative enforcement) and the React
 * frontend (rendering/labels only). The frontend must never be trusted as
 * the validation boundary — see worker/settings.ts for the server-side
 * enforcement this registry backs.
 *
 * This is a foundation, not a full settings system: it registers a small,
 * real set of keys across several categories to prove the architecture
 * (see migrations/0004_settings.sql for the matching seed data), not a
 * complete Google/Social/AdSense/Affiliate/etc. configuration surface.
 * Adding a new setting later means adding one entry here (and a seed row
 * in a new migration) — never inventing an ad-hoc key at a call site.
 */

export const SETTING_CATEGORIES = [
  "general",
  "branding",
  "domain",
  "email",
  "google",
  "analytics",
  "social",
  "advertising",
  "affiliate",
  "premium",
  "seo",
  "ai",
  "security",
  "api",
  "system",
  "notifications",
  "storage",
  "processing",
] as const;
export type SettingCategory = (typeof SETTING_CATEGORIES)[number];

export const SETTING_VALUE_TYPES = ["string", "boolean", "integer", "number", "json"] as const;
export type SettingValueType = (typeof SETTING_VALUE_TYPES)[number];

export interface SettingDefinition {
  key: string;
  category: SettingCategory;
  valueType: SettingValueType;
  /** Whether this key may ever appear in the unauthenticated public
   * settings response (GET /api/settings/public). */
  isPublic: boolean;
  /** Whether this key's *value* is sensitive enough to omit from audit
   * metadata (only the fact that it changed is logged, never old/new
   * value). Independent of isPublic — a setting can be private without
   * being sensitive (e.g. an "is this integration configured" flag).
   * True secrets (API keys, OAuth client secrets, SMTP passwords) belong
   * in Cloudflare Worker Secrets, never in this table at all — see
   * DECISIONS.md. */
  isSensitive: boolean;
  description: string;
  maxLength?: number;
  min?: number;
  max?: number;
}

export const SETTING_DEFINITIONS: readonly SettingDefinition[] = [
  {
    key: "general.site_name",
    category: "general",
    valueType: "string",
    isPublic: true,
    isSensitive: false,
    description: "Public site name",
    maxLength: 120,
  },
  {
    key: "general.site_description",
    category: "general",
    valueType: "string",
    isPublic: true,
    isSensitive: false,
    description: "Public site description",
    maxLength: 500,
  },
  {
    key: "general.default_language",
    category: "general",
    valueType: "string",
    isPublic: true,
    isSensitive: false,
    description: "Default site language code",
    maxLength: 10,
  },
  {
    key: "system.maintenance_mode",
    category: "system",
    valueType: "boolean",
    isPublic: true,
    isSensitive: false,
    description: "Whether the site is in maintenance mode",
  },
  {
    key: "google.analytics_configured",
    category: "google",
    valueType: "boolean",
    isPublic: false,
    isSensitive: false,
    description: "Whether Google Analytics has been configured",
  },
  {
    key: "google.search_console_configured",
    category: "google",
    valueType: "boolean",
    isPublic: false,
    isSensitive: false,
    description: "Whether Search Console has been configured",
  },
  {
    key: "advertising.adsense_configured",
    category: "advertising",
    valueType: "boolean",
    isPublic: false,
    isSensitive: false,
    description: "Whether AdSense has been configured",
  },
  {
    key: "affiliate.enabled",
    category: "affiliate",
    valueType: "boolean",
    isPublic: false,
    isSensitive: false,
    description: "Whether the affiliate program is enabled",
  },
  {
    key: "security.registration_enabled",
    category: "security",
    valueType: "boolean",
    isPublic: false,
    isSensitive: false,
    description: "Whether public admin registration is enabled",
  },
] as const;

const DEFINITIONS_BY_KEY: ReadonlyMap<string, SettingDefinition> = new Map(
  SETTING_DEFINITIONS.map((d) => [d.key, d])
);

/** Fail-closed lookup — an unregistered key is simply absent, never
 * guessed at or auto-created. */
export function getSettingDefinition(key: string): SettingDefinition | undefined {
  return DEFINITIONS_BY_KEY.get(key);
}

export type SettingValidationResult =
  | { ok: true; stored: string }
  | { ok: false; error: string };

const UNSAFE_STRING_PATTERN = /[<>]/; // defense in depth — settings are never rendered as HTML anyway

/**
 * The single server-side validation boundary for a settings write.
 * Rejects (fails closed) on: unknown key, wrong JS type for the
 * definition's valueType, oversized strings/JSON, out-of-range numbers,
 * and a small set of unsafe characters in strings. Never evaluates the
 * value as code — JSON is only ever JSON.stringify/parse'd, never eval'd.
 */
export function validateSettingValue(key: string, rawValue: unknown): SettingValidationResult {
  const definition = getSettingDefinition(key);
  if (!definition) {
    return { ok: false, error: "Unknown setting key" };
  }

  switch (definition.valueType) {
    case "string": {
      if (typeof rawValue !== "string") {
        return { ok: false, error: "Expected a string value" };
      }
      if (definition.maxLength !== undefined && rawValue.length > definition.maxLength) {
        return { ok: false, error: "Value exceeds the maximum allowed length" };
      }
      if (UNSAFE_STRING_PATTERN.test(rawValue)) {
        return { ok: false, error: "Value contains disallowed characters" };
      }
      return { ok: true, stored: rawValue };
    }
    case "boolean": {
      if (typeof rawValue !== "boolean") {
        return { ok: false, error: "Expected a boolean value" };
      }
      return { ok: true, stored: rawValue ? "true" : "false" };
    }
    case "integer": {
      if (typeof rawValue !== "number" || !Number.isInteger(rawValue)) {
        return { ok: false, error: "Expected an integer value" };
      }
      if (definition.min !== undefined && rawValue < definition.min) {
        return { ok: false, error: "Value is below the allowed minimum" };
      }
      if (definition.max !== undefined && rawValue > definition.max) {
        return { ok: false, error: "Value is above the allowed maximum" };
      }
      return { ok: true, stored: String(rawValue) };
    }
    case "number": {
      if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
        return { ok: false, error: "Expected a numeric value" };
      }
      if (definition.min !== undefined && rawValue < definition.min) {
        return { ok: false, error: "Value is below the allowed minimum" };
      }
      if (definition.max !== undefined && rawValue > definition.max) {
        return { ok: false, error: "Value is above the allowed maximum" };
      }
      return { ok: true, stored: String(rawValue) };
    }
    case "json": {
      if (rawValue === undefined || typeof rawValue === "function") {
        return { ok: false, error: "Value is not valid JSON-serializable data" };
      }
      let serialized: string;
      try {
        serialized = JSON.stringify(rawValue);
      } catch {
        return { ok: false, error: "Value is not valid JSON-serializable data" };
      }
      if (definition.maxLength !== undefined && serialized.length > definition.maxLength) {
        return { ok: false, error: "Value exceeds the maximum allowed size" };
      }
      return { ok: true, stored: serialized };
    }
  }
}

/** The inverse of validateSettingValue's storage encoding — turns the
 * stored TEXT column back into the typed JS value for API responses. */
export function parseSettingValue(valueType: SettingValueType, stored: string | null): unknown {
  if (stored === null) return null;
  switch (valueType) {
    case "string":
      return stored;
    case "boolean":
      return stored === "true";
    case "integer":
      return Number.parseInt(stored, 10);
    case "number":
      return Number.parseFloat(stored);
    case "json":
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
  }
}
