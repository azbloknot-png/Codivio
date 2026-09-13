/**
 * Codivio Pages — centralized validation (Phase 2.9).
 *
 * Mirrors the shared/rbac.ts and shared/settings.ts pattern: one
 * framework-agnostic module, imported by both the Worker (authoritative
 * enforcement, see worker/pages.ts) and the React Admin UI (client-side
 * hinting only — the server always re-validates, never trusts the client).
 *
 * Field-safety strategy is deliberately asymmetric:
 *  - title/description/metaTitle/metaDescription are short, single-purpose
 *    metadata fields with no legitimate reason to contain HTML, so raw
 *    `<`/`>` characters are rejected outright (defense in depth).
 *  - content is real page body text, which legitimately might need to
 *    quote/discuss markup. It is NOT filtered here; its safety instead
 *    comes from how it's rendered (plain React text interpolation only,
 *    never dangerouslySetInnerHTML — see the public page route). Rejecting
 *    "<"/">" here would be either a false sense of security (title/desc
 *    still could carry payloads if rendering ever changed) or actively
 *    harmful (blocking a page from ever documenting a `<script>` tag).
 *  - canonicalUrl is validated as an absolute http(s) URL, rejecting
 *    javascript:/data:/vbscript: and other unsafe schemes outright.
 */

export const PAGE_STATUSES = ["draft", "published", "archived"] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

export function isValidPageStatus(value: string): value is PageStatus {
  return (PAGE_STATUSES as readonly string[]).includes(value);
}

/**
 * Slugs a page can never use — every top-level static route already
 * registered in src/App.tsx's <Routes>. A dynamic `/:slug` public page
 * route always loses to a matching static route under React Router's own
 * ranking, but this list is enforced independently, at write time, as
 * defense in depth rather than relying solely on router behavior. Keep in
 * sync with src/App.tsx's top-level route list.
 */
export const RESERVED_PAGE_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "tools",
  "blog",
  "faq",
  "about",
  "contact",
  "privacy",
  "terms",
  "cookies",
]);

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 100;
const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 500;
const CONTENT_MAX_LENGTH = 200_000;
const META_TITLE_MAX_LENGTH = 70;
const META_DESCRIPTION_MAX_LENGTH = 160;
const CANONICAL_URL_MAX_LENGTH = 2048;

const NO_ANGLE_BRACKETS = /[<>]/;

export interface PageInput {
  title: string;
  slug: string;
  description: string;
  content: string;
  status: PageStatus;
  isIndexable: boolean;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
}

export type FieldValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type PageValidationResult = FieldValidationResult<PageInput>;

/** Rejects: missing/empty, too long, malformed characters (path
 * traversal, protocol prefixes, query strings, and anything outside
 * lowercase-alphanumeric-and-hyphen are all structurally impossible once
 * this pattern matches), and any reserved system-route slug. */
export function validateSlug(rawSlug: unknown): FieldValidationResult<string> {
  if (typeof rawSlug !== "string" || rawSlug.length === 0) {
    return { ok: false, error: "Slug is required" };
  }
  if (rawSlug.length > SLUG_MAX_LENGTH) {
    return { ok: false, error: "Slug is too long" };
  }
  if (!SLUG_PATTERN.test(rawSlug)) {
    return {
      ok: false,
      error:
        "Slug may only contain lowercase letters, numbers and hyphens, and cannot start, end, or repeat with a hyphen",
    };
  }
  if (RESERVED_PAGE_SLUGS.has(rawSlug)) {
    return { ok: false, error: "This slug is reserved and cannot be used" };
  }
  return { ok: true, value: rawSlug };
}

function validateShortText(
  raw: unknown,
  field: string,
  maxLength: number,
  required: boolean
): FieldValidationResult<string> {
  if (raw === undefined || raw === null) {
    if (required) return { ok: false, error: `${field} is required` };
    return { ok: true, value: "" };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: `${field} must be a string` };
  }
  if (required && raw.trim().length === 0) {
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

function validateCanonicalUrl(raw: unknown): FieldValidationResult<string> {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: "" };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "Canonical URL must be a string" };
  }
  if (raw.length > CANONICAL_URL_MAX_LENGTH) {
    return { ok: false, error: "Canonical URL is too long" };
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "Canonical URL must be a valid absolute URL" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Canonical URL must use http or https" };
  }
  return { ok: true, value: raw };
}

/**
 * The single server-side validation boundary for a page create/update.
 * Callers pass a plain object already merged with any existing row (for a
 * partial PATCH) — every field here is treated as required-if-present,
 * with title/slug always required since a page can never exist without
 * them. Never trusts the client for status/isIndexable beyond type/enum
 * checking — publication visibility itself is enforced separately, at
 * query time, by the public read endpoint (see worker/pages.ts).
 */
export function validatePageInput(raw: Record<string, unknown>): PageValidationResult {
  const title = validateShortText(raw.title, "Title", TITLE_MAX_LENGTH, true);
  if (!title.ok) return title;

  const slug = validateSlug(raw.slug);
  if (!slug.ok) return slug;

  const description = validateShortText(raw.description, "Description", DESCRIPTION_MAX_LENGTH, false);
  if (!description.ok) return description;

  if (raw.content !== undefined && raw.content !== null && typeof raw.content !== "string") {
    return { ok: false, error: "Content must be a string" };
  }
  const content = typeof raw.content === "string" ? raw.content : "";
  if (content.length > CONTENT_MAX_LENGTH) {
    return { ok: false, error: "Content exceeds the maximum allowed size" };
  }

  const statusRaw = typeof raw.status === "string" ? raw.status : "draft";
  if (!isValidPageStatus(statusRaw)) {
    return { ok: false, error: "Status must be one of: draft, published, archived" };
  }

  const isIndexableRaw = raw.isIndexable === undefined ? true : raw.isIndexable;
  if (typeof isIndexableRaw !== "boolean") {
    return { ok: false, error: "isIndexable must be a boolean" };
  }

  const metaTitle = validateShortText(raw.metaTitle, "Meta title", META_TITLE_MAX_LENGTH, false);
  if (!metaTitle.ok) return metaTitle;

  const metaDescription = validateShortText(
    raw.metaDescription,
    "Meta description",
    META_DESCRIPTION_MAX_LENGTH,
    false
  );
  if (!metaDescription.ok) return metaDescription;

  const canonicalUrl = validateCanonicalUrl(raw.canonicalUrl);
  if (!canonicalUrl.ok) return canonicalUrl;

  return {
    ok: true,
    value: {
      title: title.value,
      slug: slug.value,
      description: description.value,
      content,
      status: statusRaw,
      isIndexable: isIndexableRaw,
      metaTitle: metaTitle.value,
      metaDescription: metaDescription.value,
      canonicalUrl: canonicalUrl.value,
    },
  };
}
