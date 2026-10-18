/**
 * Codivio Blog — centralized validation (Phase 8.2 — Admin Blog CRUD).
 *
 * Mirrors shared/tools.ts / shared/pages.ts's exact pattern: one
 * framework-agnostic module, imported by both the Worker (authoritative
 * enforcement, see worker/blog.ts) and the React Admin UI (client-side
 * hinting only — the server always re-validates, never trusts the client).
 *
 * Authoring format: `content` is authored as Markdown (an explicit Stage 2
 * decision) — plain text as far as this validator and the database are
 * concerned, never raw HTML-authoring. No Markdown-to-HTML rendering
 * exists anywhere in this phase (no public render path exists yet); when
 * a future phase (8.5/8.6) builds one, it must render through a safe
 * Markdown parser and must never use dangerouslySetInnerHTML on
 * unsanitized output. Content-safety note (mirrors shared/pages.ts's own
 * documented reasoning): `content`/`excerpt` are NOT angle-bracket
 * filtered here, since Markdown source legitimately may contain "<"/">"
 * (inline HTML spans, comparison text, code samples) — safety comes from
 * how it is eventually rendered, not from stripping characters at write
 * time. `title`/`excerpt`-as-a-short-label fields that have no legitimate
 * reason to contain markup (seoTitle, seoDescription) DO reject raw
 * "<"/">", matching shared/tools.ts's convention.
 *
 * `category_id`/`author_id` existence is checked separately by
 * worker/blog.ts (a DB lookup this framework-agnostic module cannot
 * perform) — this module only validates shape/format.
 *
 * Tags (`tagNames`) use a find-or-create-by-name contract: worker/blog.ts
 * resolves each name to an existing `blog_tags` row or creates one, then
 * replaces `blog_post_tags` to match exactly the given set. This is the
 * "minimum backend functionality needed for Admin Blog CRUD" to make
 * tagging genuinely usable in this phase — a full tag *management* surface
 * (rename, merge, browse-all, bulk-edit) remains Phase 8.3's scope.
 *
 * Related tools (`relatedToolSlugs`) reference the existing Tool Registry
 * by slug ONLY — never auto-created, mirroring shared/tools.ts's own
 * "no category is ever auto-created by this API" precedent applied to
 * tools: a slug that doesn't match a real `tools` row is rejected, never
 * silently ignored or used to fabricate a tool record.
 *
 * Category (`categoryId`) remains existing-row-only (no find-or-create) —
 * unlike tags, category membership is a more structural classification
 * Phase 8.3 owns curating; Phase 8.2 only lets a post reference one that
 * already exists (see worker/blog.ts's new read-only
 * GET /api/admin/blog-categories for how the Admin UI lists real options).
 */

export const BLOG_POST_STATUSES = ["draft", "published", "scheduled"] as const;
export type BlogPostStatus = (typeof BLOG_POST_STATUSES)[number];

export function isValidBlogPostStatus(value: string): value is BlogPostStatus {
  return (BLOG_POST_STATUSES as readonly string[]).includes(value);
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 100;
const TITLE_MAX_LENGTH = 200;
const EXCERPT_MAX_LENGTH = 500;
const CONTENT_MAX_LENGTH = 200_000;
const FEATURED_IMAGE_MAX_LENGTH = 500;
const SEO_TITLE_MAX_LENGTH = 70;
const SEO_DESCRIPTION_MAX_LENGTH = 160;
const CANONICAL_URL_MAX_LENGTH = 2048;
const OG_IMAGE_MAX_LENGTH = 500;
const TAG_NAME_MAX_LENGTH = 50;
const MAX_TAGS = 12;
const MAX_RELATED_TOOLS = 10;
const TOOL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const NO_ANGLE_BRACKETS = /[<>]/;

export interface BlogPostInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: BlogPostStatus;
  scheduledAt: string | null;
  categoryId: number | null;
  featuredImage: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImage: string;
  tagNames: string[];
  relatedToolSlugs: string[];
}

export type FieldValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };
export type BlogPostValidationResult = FieldValidationResult<BlogPostInput>;

export function validateBlogPostSlug(rawSlug: unknown): FieldValidationResult<string> {
  if (typeof rawSlug !== "string" || rawSlug.length === 0) {
    return { ok: false, error: "Slug is required" };
  }
  if (rawSlug.length > SLUG_MAX_LENGTH) {
    return { ok: false, error: "Slug is too long" };
  }
  if (!SLUG_PATTERN.test(rawSlug)) {
    return {
      ok: false,
      error: "Slug may only contain lowercase letters, numbers and hyphens, and cannot start, end, or repeat with a hyphen",
    };
  }
  return { ok: true, value: rawSlug };
}

function validateShortText(raw: unknown, field: string, maxLength: number, required: boolean): FieldValidationResult<string> {
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

function validateBodyText(raw: unknown, field: string, maxLength: number): FieldValidationResult<string> {
  if (raw === undefined || raw === null) return { ok: true, value: "" };
  if (typeof raw !== "string") return { ok: false, error: `${field} must be a string` };
  if (raw.length > maxLength) return { ok: false, error: `${field} exceeds the maximum allowed size` };
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

function validateCategoryId(raw: unknown): FieldValidationResult<number | null> {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: null };
  }
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw <= 0) {
    return { ok: false, error: "categoryId must be a positive integer" };
  }
  return { ok: true, value: raw };
}

function validateScheduledAt(raw: unknown, status: BlogPostStatus): FieldValidationResult<string | null> {
  if (raw === undefined || raw === null || raw === "") {
    if (status === "scheduled") {
      return { ok: false, error: "scheduledAt is required when status is 'scheduled'" };
    }
    return { ok: true, value: null };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "scheduledAt must be a string" };
  }
  if (Number.isNaN(Date.parse(raw))) {
    return { ok: false, error: "scheduledAt must be a valid date/time string" };
  }
  return { ok: true, value: raw };
}

function validateTagNames(raw: unknown): FieldValidationResult<string[]> {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "tagNames must be an array of strings" };
  if (raw.length > MAX_TAGS) return { ok: false, error: `A post may have at most ${MAX_TAGS} tags` };
  const names: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      return { ok: false, error: "Each tag name must be a non-empty string" };
    }
    if (entry.length > TAG_NAME_MAX_LENGTH) {
      return { ok: false, error: "A tag name exceeds the maximum allowed length" };
    }
    if (NO_ANGLE_BRACKETS.test(entry)) {
      return { ok: false, error: "A tag name contains disallowed characters" };
    }
    names.push(entry.trim());
  }
  return { ok: true, value: [...new Set(names)] };
}

function validateRelatedToolSlugs(raw: unknown): FieldValidationResult<string[]> {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "relatedToolSlugs must be an array of strings" };
  if (raw.length > MAX_RELATED_TOOLS) return { ok: false, error: `A post may link at most ${MAX_RELATED_TOOLS} related tools` };
  const slugs: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || !TOOL_SLUG_PATTERN.test(entry)) {
      return { ok: false, error: "Each related tool must be a valid tool slug" };
    }
    slugs.push(entry);
  }
  return { ok: true, value: [...new Set(slugs)] };
}

/**
 * The single server-side validation boundary for a blog post create/
 * update. Callers pass a plain object already merged with any existing row
 * (for a partial PATCH), matching shared/tools.ts's exact contract.
 */
export function validateBlogPostInput(raw: Record<string, unknown>): BlogPostValidationResult {
  const title = validateShortText(raw.title, "Title", TITLE_MAX_LENGTH, true);
  if (!title.ok) return title;

  const slug = validateBlogPostSlug(raw.slug);
  if (!slug.ok) return slug;

  const excerpt = validateShortText(raw.excerpt, "Excerpt", EXCERPT_MAX_LENGTH, false);
  if (!excerpt.ok) return excerpt;

  const content = validateBodyText(raw.content, "Content", CONTENT_MAX_LENGTH);
  if (!content.ok) return content;

  const statusRaw = typeof raw.status === "string" ? raw.status : "draft";
  if (!isValidBlogPostStatus(statusRaw)) {
    return { ok: false, error: "Status must be one of: " + BLOG_POST_STATUSES.join(", ") };
  }

  const scheduledAt = validateScheduledAt(raw.scheduledAt, statusRaw);
  if (!scheduledAt.ok) return scheduledAt;

  const categoryId = validateCategoryId(raw.categoryId);
  if (!categoryId.ok) return categoryId;

  const featuredImage = validateShortText(raw.featuredImage, "Featured image", FEATURED_IMAGE_MAX_LENGTH, false);
  if (!featuredImage.ok) return featuredImage;

  const seoTitle = validateShortText(raw.seoTitle, "SEO title", SEO_TITLE_MAX_LENGTH, false);
  if (!seoTitle.ok) return seoTitle;

  const seoDescription = validateShortText(raw.seoDescription, "SEO description", SEO_DESCRIPTION_MAX_LENGTH, false);
  if (!seoDescription.ok) return seoDescription;

  const canonicalUrl = validateCanonicalUrl(raw.canonicalUrl);
  if (!canonicalUrl.ok) return canonicalUrl;

  const ogImage = validateShortText(raw.ogImage, "OG image", OG_IMAGE_MAX_LENGTH, false);
  if (!ogImage.ok) return ogImage;

  const tagNames = validateTagNames(raw.tagNames);
  if (!tagNames.ok) return tagNames;

  const relatedToolSlugs = validateRelatedToolSlugs(raw.relatedToolSlugs);
  if (!relatedToolSlugs.ok) return relatedToolSlugs;

  return {
    ok: true,
    value: {
      title: title.value,
      slug: slug.value,
      excerpt: excerpt.value,
      content: content.value,
      status: statusRaw,
      scheduledAt: scheduledAt.value,
      categoryId: categoryId.value,
      featuredImage: featuredImage.value,
      seoTitle: seoTitle.value,
      seoDescription: seoDescription.value,
      canonicalUrl: canonicalUrl.value,
      ogImage: ogImage.value,
      tagNames: tagNames.value,
      relatedToolSlugs: relatedToolSlugs.value,
    },
  };
}
