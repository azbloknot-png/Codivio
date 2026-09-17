export {
  ROBOTS_INDEX_FOLLOW,
  ROBOTS_NOINDEX_FOLLOW,
  ROBOTS_NOINDEX_NOFOLLOW,
  robotsToString,
} from "./types";
export type { SeoRobots, LocalizedSeoCopy, LocalizedSeoMap, SeoEntity } from "./types";

export {
  SITE_NAME,
  CANONICAL_DOMAIN,
  TITLE_SUFFIX,
  DEFAULT_OG_IMAGE,
  OG_LOCALE,
  buildTitle,
  buildCanonicalUrl,
  isSafeAbsoluteHttpsUrl,
} from "./site";

export { PAGE_SEO } from "./pages";
export type { PageSeoKey } from "./pages";

export { TOOL_SEO } from "./tools";

export { TOOL_INTENT, PAGE_INTENT } from "./intent";
export type { ToolIntent, PageIntent } from "./intent";

export { TOOL_KEYWORDS, CATEGORY_KEYWORD_OPPORTUNITIES, getToolKeywordProfile } from "./keywords";
export type { ToolKeywordEntry, SearchIntentType, CannibalizationRisk, LongTailEntry } from "./keywords";

export {
  findDuplicateTitles,
  findDuplicateDescriptions,
  findMissingMetadata,
  findLengthOutliers,
  classifyLength,
  DEFAULT_LENGTH_THRESHOLDS,
} from "./duplicates";
export type {
  SeoEntityRef,
  DuplicateGroup,
  MissingMetadata,
  LengthOutlier,
  LengthThresholds,
  LengthStatus,
} from "./duplicates";

import type { Language } from "../i18n/languages";
import type { LocalizedSeoCopy, SeoEntity } from "./types";
import { PAGE_SEO, type PageSeoKey } from "./pages";
import { TOOL_SEO } from "./tools";

export function getPageSeo(key: PageSeoKey, lang: Language): { entity: SeoEntity; copy: LocalizedSeoCopy } {
  const entity = PAGE_SEO[key];
  return { entity, copy: entity.localized[lang] };
}

export function getToolSeo(slug: string, lang: Language): { entity: SeoEntity; copy: LocalizedSeoCopy } | null {
  const entity = TOOL_SEO[slug];
  if (!entity) return null;
  return { entity, copy: entity.localized[lang] };
}
