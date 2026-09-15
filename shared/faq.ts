/**
 * Codivio FAQ — centralized validation (Phase 3 Finalization, Admin FAQ
 * Management).
 *
 * Mirrors the shared/rbac.ts, shared/settings.ts, shared/pages.ts and
 * shared/tools.ts pattern: one framework-agnostic module, imported by both
 * the Worker (authoritative enforcement, see worker/faq.ts) and the React
 * Admin UI (client-side hinting only — the server always re-validates).
 *
 * A FAQ entry has a scope: "global" (site-wide, shown on the public /faq
 * page and Homepage FAQ preview — see shared/seo/global-faq.ts for that
 * page's actual static content source) or "tool" (associated with one real
 * tool via toolSlug, mirroring shared/seo/content.ts#TOOL_CONTENT's FAQ
 * entries). This table is an Admin-managed configuration/reporting surface
 * over that same idea — like Tools Management (migrations/0006) and Pages
 * Management (migrations/0005), it does not yet replace the static content
 * the public site renders; see migrations/0009_faq_management.sql.
 */

import { isValidLanguage, type Language } from "./i18n/languages";

export const FAQ_SCOPES = ["global", "tool"] as const;
export type FaqScope = (typeof FAQ_SCOPES)[number];

export function isValidFaqScope(value: string): value is FaqScope {
  return (FAQ_SCOPES as readonly string[]).includes(value);
}

export const FAQ_STATUSES = ["active", "inactive"] as const;
export type FaqStatus = (typeof FAQ_STATUSES)[number];

export function isValidFaqStatus(value: string): value is FaqStatus {
  return (FAQ_STATUSES as readonly string[]).includes(value);
}

const TOOL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const QUESTION_MAX_LENGTH = 300;
const ANSWER_MAX_LENGTH = 2000;
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 9999;

const NO_ANGLE_BRACKETS = /[<>]/;

export interface FaqInput {
  scope: FaqScope;
  toolSlug: string | null;
  language: Language;
  question: string;
  answer: string;
  status: FaqStatus;
  sortOrder: number;
}

export type FieldValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };
export type FaqValidationResult = FieldValidationResult<FaqInput>;

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
 * The single server-side validation boundary for a FAQ create/update.
 * Callers pass a plain object already merged with any existing row (for a
 * partial PATCH). Whether a scope="tool" toolSlug actually matches a real
 * tool is checked separately by worker/faq.ts (a DB lookup, which this
 * framework-agnostic module cannot perform).
 */
export function validateFaqInput(raw: Record<string, unknown>): FaqValidationResult {
  const scopeRaw = typeof raw.scope === "string" ? raw.scope : "";
  if (!isValidFaqScope(scopeRaw)) {
    return { ok: false, error: "scope must be one of: " + FAQ_SCOPES.join(", ") };
  }

  const toolSlugRaw = raw.toolSlug;
  let toolSlug: string | null = null;
  if (scopeRaw === "tool") {
    if (typeof toolSlugRaw !== "string" || toolSlugRaw.length === 0) {
      return { ok: false, error: "toolSlug is required when scope is 'tool'" };
    }
    if (!TOOL_SLUG_PATTERN.test(toolSlugRaw)) {
      return { ok: false, error: "toolSlug is not a valid slug" };
    }
    toolSlug = toolSlugRaw;
  } else if (toolSlugRaw !== undefined && toolSlugRaw !== null) {
    return { ok: false, error: "toolSlug must not be set when scope is 'global'" };
  }

  const languageRaw = typeof raw.language === "string" ? raw.language : "";
  if (!isValidLanguage(languageRaw)) {
    return { ok: false, error: "language is not supported" };
  }

  const question = validateRequiredText(raw.question, "Question", QUESTION_MAX_LENGTH);
  if (!question.ok) return question;

  const answer = validateRequiredText(raw.answer, "Answer", ANSWER_MAX_LENGTH);
  if (!answer.ok) return answer;

  const statusRaw = typeof raw.status === "string" ? raw.status : "active";
  if (!isValidFaqStatus(statusRaw)) {
    return { ok: false, error: "status must be one of: " + FAQ_STATUSES.join(", ") };
  }

  const sortOrderRaw = raw.sortOrder === undefined ? 0 : raw.sortOrder;
  if (typeof sortOrderRaw !== "number" || !Number.isInteger(sortOrderRaw)) {
    return { ok: false, error: "sortOrder must be an integer" };
  }
  if (sortOrderRaw < SORT_ORDER_MIN || sortOrderRaw > SORT_ORDER_MAX) {
    return { ok: false, error: "sortOrder is out of the allowed range" };
  }

  return {
    ok: true,
    value: {
      scope: scopeRaw,
      toolSlug,
      language: languageRaw,
      question: question.value,
      answer: answer.value,
      status: statusRaw,
      sortOrder: sortOrderRaw,
    },
  };
}
