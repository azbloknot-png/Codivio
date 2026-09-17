/**
 * Codivio SEO Overrides — centralized validation (Phase 3.15-C).
 *
 * Mirrors the shared/rbac.ts, shared/pages.ts, shared/tools.ts, shared/faq.ts
 * pattern: one framework-agnostic module, imported by both the Worker
 * (authoritative enforcement, see worker/seo-overrides.ts) and the React
 * Admin UI (client-side hinting only — the server always re-validates,
 * never trusts the client).
 *
 * An override row represents one (entity_type, entity_key, language)
 * combination — either a real static page (entity_type="page", entity_key
 * one of shared/seo/pages.ts's PAGE_SEO keys) or a real tool
 * (entity_type="tool", entity_key one of shared/seo/tools.ts's TOOL_SEO
 * slugs). Unlike shared/faq.ts's toolSlug (which needs a DB lookup worker/
 * faq.ts performs separately, since tools live in D1), entity_key can be
 * validated directly here against the real, already-loaded PAGE_SEO/
 * TOOL_SEO compile-time datasets — no DB round-trip needed for this check.
 *
 * Field-safety strategy matches shared/pages.ts exactly: title/description
 * are short, single-purpose metadata fields with no legitimate reason to
 * contain HTML, so raw "<"/">" are rejected outright (defense in depth on
 * top of the escaping worker/seo-rewrite.ts and src/seo/useSeo.ts already
 * perform when actually rendering these values).
 */

import { isValidLanguage, type Language } from "./i18n/languages";
import { PAGE_SEO } from "./seo/pages";
import { TOOL_SEO } from "./seo/tools";

export const SEO_OVERRIDE_ENTITY_TYPES = ["page", "tool"] as const;
export type SeoOverrideEntityType = (typeof SEO_OVERRIDE_ENTITY_TYPES)[number];

export function isValidSeoOverrideEntityType(value: string): value is SeoOverrideEntityType {
  return (SEO_OVERRIDE_ENTITY_TYPES as readonly string[]).includes(value);
}

export const SEO_OVERRIDE_STATUSES = ["active", "inactive"] as const;
export type SeoOverrideStatus = (typeof SEO_OVERRIDE_STATUSES)[number];

export function isValidSeoOverrideStatus(value: string): value is SeoOverrideStatus {
  return (SEO_OVERRIDE_STATUSES as readonly string[]).includes(value);
}

/** True only for an entity_key that actually resolves to a real PAGE_SEO
 * key or TOOL_SEO slug for the given entity_type — prevents creating an
 * override for a typo'd/nonexistent key that would silently never take
 * effect (it would never be looked up by worker/seo-rewrite.ts, since
 * that lookup is keyed by the same real PAGE_SEO/TOOL_SEO data). */
export function isValidSeoOverrideEntityKey(entityType: SeoOverrideEntityType, entityKey: string): boolean {
  if (entityType === "page") {
    return Object.prototype.hasOwnProperty.call(PAGE_SEO, entityKey);
  }
  return Object.prototype.hasOwnProperty.call(TOOL_SEO, entityKey);
}

// Same outer ceiling as shared/pages.ts's general title/description
// fields (not its tighter meta_title/meta_description bounds) — a hard
// reject for genuinely broken input, not the ~15-65/~50-165 SEO-length
// *guidance* shared/seo/duplicates.ts#DEFAULT_LENGTH_THRESHOLDS already
// surfaces in the Admin UI (Phase 3.15-A). The two are deliberately
// different: one rejects, the other only warns.
const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 500;
const ENTITY_KEY_MAX_LENGTH = 100;

const NO_ANGLE_BRACKETS = /[<>]/;

export interface SeoOverrideInput {
  entityType: SeoOverrideEntityType;
  entityKey: string;
  language: Language;
  title: string;
  description: string;
  status: SeoOverrideStatus;
}

export type FieldValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };
export type SeoOverrideValidationResult = FieldValidationResult<SeoOverrideInput>;

function validateRequiredText(raw: unknown, field: string, maxLength: number): FieldValidationResult<string> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, error: `${field} is required` };
  }
  if (raw.length > maxLength) {
    return { ok: false, error: `${field} exceeds the maximum allowed length` };
  }
  if (NO_ANGLE_BRACKETS.test(raw)) {
    return { ok: false, error: `${field} contains disallowed characters` };
  }
  return { ok: true, value: raw };
}

/**
 * The single server-side validation boundary for a SEO override create/
 * update. Callers pass a plain object already merged with any existing
 * row (for a partial PATCH), matching shared/faq.ts's own convention.
 */
export function validateSeoOverrideInput(raw: Record<string, unknown>): SeoOverrideValidationResult {
  const entityTypeRaw = typeof raw.entityType === "string" ? raw.entityType : "";
  if (!isValidSeoOverrideEntityType(entityTypeRaw)) {
    return { ok: false, error: "entityType must be one of: " + SEO_OVERRIDE_ENTITY_TYPES.join(", ") };
  }

  if (typeof raw.entityKey !== "string" || raw.entityKey.length === 0) {
    return { ok: false, error: "entityKey is required" };
  }
  if (raw.entityKey.length > ENTITY_KEY_MAX_LENGTH) {
    return { ok: false, error: "entityKey is too long" };
  }
  if (!isValidSeoOverrideEntityKey(entityTypeRaw, raw.entityKey)) {
    return {
      ok: false,
      error: entityTypeRaw === "page" ? "entityKey does not match a real static page" : "entityKey does not match a real tool",
    };
  }

  const languageRaw = typeof raw.language === "string" ? raw.language : "";
  if (!isValidLanguage(languageRaw)) {
    return { ok: false, error: "language is not supported" };
  }

  const title = validateRequiredText(raw.title, "Title", TITLE_MAX_LENGTH);
  if (!title.ok) return title;

  const description = validateRequiredText(raw.description, "Description", DESCRIPTION_MAX_LENGTH);
  if (!description.ok) return description;

  const statusRaw = typeof raw.status === "string" ? raw.status : "active";
  if (!isValidSeoOverrideStatus(statusRaw)) {
    return { ok: false, error: "status must be one of: " + SEO_OVERRIDE_STATUSES.join(", ") };
  }

  return {
    ok: true,
    value: {
      entityType: entityTypeRaw,
      entityKey: raw.entityKey,
      language: languageRaw,
      title: title.value,
      description: description.value,
      status: statusRaw,
    },
  };
}
