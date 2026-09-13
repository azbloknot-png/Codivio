/**
 * Codivio Tools — centralized validation (Phase 2.10).
 *
 * Mirrors the shared/rbac.ts, shared/settings.ts and shared/pages.ts
 * pattern: one framework-agnostic module, imported by both the Worker
 * (authoritative enforcement, see worker/tools.ts) and the React Admin UI
 * (client-side hinting only — the server always re-validates).
 *
 * TOOL_CATEGORIES is deliberately broader than what the `categories` DB
 * table currently holds (see migrations/0006_tools_management.sql, which
 * only seeds qr/pdf/image/other — the 4 that have real tools today).
 * "video"/"gif"/"ai"/"utilities" are here to document that the category
 * vocabulary is meant to grow, matching CLAUDE.md §4/§11's tool roadmap —
 * a new category becomes available by inserting one `categories` row, not
 * a schema or code change. worker/tools.ts still resolves a category slug
 * against the real `categories` table before accepting it, so listing a
 * category here does not, by itself, make it usable yet (fail-closed: no
 * auto-created categories).
 *
 * Icons are identifiers, never markup: ICON_NAMES is a controlled
 * allowlist of lucide-react icon names actually used by the existing
 * tool registry (src/App.tsx) plus a safe generic fallback ("Box", already
 * used elsewhere in the Admin UI). The server rejects any value outside
 * this list; nothing here ever stores or renders raw HTML/SVG from a
 * database value.
 */

export const TOOL_CATEGORIES = ["qr", "pdf", "image", "video", "gif", "ai", "utilities", "other"] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export function isValidToolCategory(value: string): value is ToolCategory {
  return (TOOL_CATEGORIES as readonly string[]).includes(value);
}

export const TOOL_STATUSES = ["active", "inactive"] as const;
export type ToolStatus = (typeof TOOL_STATUSES)[number];

export function isValidToolStatus(value: string): value is ToolStatus {
  return (TOOL_STATUSES as readonly string[]).includes(value);
}

/** Every icon name actually used by src/App.tsx's tool registry today,
 * plus "Box" as the safe generic fallback (already used for the Admin
 * "Tools" nav icon). Keep in sync if the registry ever adopts a new icon —
 * an icon name outside this list is rejected on write (fail closed) and
 * should fall back to "Box" if one is ever encountered on render. */
export const ICON_NAMES = [
  "Box",
  "QrCode",
  "Globe",
  "FileText",
  "Wifi",
  "Users",
  "Mail",
  "MessageSquare",
  "Phone",
  "MapPin",
  "CalendarDays",
  "FileOutput",
  "Minimize2",
  "FileImage",
  "BarChart3",
  "Image",
  "Sparkles",
] as const;
export type IconName = (typeof ICON_NAMES)[number];

export function isValidIconName(value: string): value is IconName {
  return (ICON_NAMES as readonly string[]).includes(value);
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 100;
const NAME_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 500;
const SEO_TITLE_MAX_LENGTH = 70;
const SEO_DESCRIPTION_MAX_LENGTH = 160;
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 9999;

const NO_ANGLE_BRACKETS = /[<>]/;

export interface ToolInput {
  name: string;
  slug: string;
  description: string;
  category: ToolCategory;
  icon: IconName;
  status: ToolStatus;
  featured: boolean;
  isPopular: boolean;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
}

export type FieldValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export type ToolValidationResult = FieldValidationResult<ToolInput>;

export function validateToolSlug(rawSlug: unknown): FieldValidationResult<string> {
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

/**
 * The single server-side validation boundary for a tool create/update.
 * Callers pass a plain object already merged with any existing row (for a
 * partial PATCH) — name/slug/category are always required since a tool
 * can never exist without them. Category membership in TOOL_CATEGORIES is
 * checked here; whether that category actually exists in the `categories`
 * table is checked separately by worker/tools.ts (a DB lookup, which this
 * framework-agnostic module cannot perform).
 */
export function validateToolInput(raw: Record<string, unknown>): ToolValidationResult {
  const name = validateShortText(raw.name, "Name", NAME_MAX_LENGTH, true);
  if (!name.ok) return name;

  const slug = validateToolSlug(raw.slug);
  if (!slug.ok) return slug;

  const description = validateShortText(raw.description, "Description", DESCRIPTION_MAX_LENGTH, false);
  if (!description.ok) return description;

  const categoryRaw = typeof raw.category === "string" ? raw.category : "";
  if (!isValidToolCategory(categoryRaw)) {
    return { ok: false, error: "Category must be one of: " + TOOL_CATEGORIES.join(", ") };
  }

  const iconRaw = typeof raw.icon === "string" && raw.icon.length > 0 ? raw.icon : "Box";
  if (!isValidIconName(iconRaw)) {
    return { ok: false, error: "Unknown icon identifier" };
  }

  const statusRaw = typeof raw.status === "string" ? raw.status : "active";
  if (!isValidToolStatus(statusRaw)) {
    return { ok: false, error: "Status must be one of: active, inactive" };
  }

  const featuredRaw = raw.featured === undefined ? false : raw.featured;
  if (typeof featuredRaw !== "boolean") {
    return { ok: false, error: "featured must be a boolean" };
  }

  const isPopularRaw = raw.isPopular === undefined ? false : raw.isPopular;
  if (typeof isPopularRaw !== "boolean") {
    return { ok: false, error: "isPopular must be a boolean" };
  }

  const sortOrderRaw = raw.sortOrder === undefined ? 0 : raw.sortOrder;
  if (typeof sortOrderRaw !== "number" || !Number.isInteger(sortOrderRaw)) {
    return { ok: false, error: "sortOrder must be an integer" };
  }
  if (sortOrderRaw < SORT_ORDER_MIN || sortOrderRaw > SORT_ORDER_MAX) {
    return { ok: false, error: "sortOrder is out of the allowed range" };
  }

  const seoTitle = validateShortText(raw.seoTitle, "SEO title", SEO_TITLE_MAX_LENGTH, false);
  if (!seoTitle.ok) return seoTitle;

  const seoDescription = validateShortText(raw.seoDescription, "SEO description", SEO_DESCRIPTION_MAX_LENGTH, false);
  if (!seoDescription.ok) return seoDescription;

  return {
    ok: true,
    value: {
      name: name.value,
      slug: slug.value,
      description: description.value,
      category: categoryRaw,
      icon: iconRaw,
      status: statusRaw,
      featured: featuredRaw,
      isPopular: isPopularRaw,
      sortOrder: sortOrderRaw,
      seoTitle: seoTitle.value,
      seoDescription: seoDescription.value,
    },
  };
}
