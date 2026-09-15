import type { Language } from "../i18n/languages";
import type { SeoEntity } from "./types";
import { buildTitle } from "./site";

/**
 * Codivio SEO — duplicate/outlier detection (Phase 3.1, Step 15).
 *
 * Pure functions over a list of {key, entity} pairs, used by both
 * tests/seo.test.ts and the read-only Admin SEO preview
 * (src/admin/AdminSeoPage.tsx). Length thresholds are guidance, not a hard
 * SEO rule (the task explicitly warns against treating character counts as
 * absolute) — outliers are flagged for human review, never auto-rejected.
 */

export interface SeoEntityRef {
  key: string;
  entity: SeoEntity;
}

export interface DuplicateGroup {
  value: string;
  keys: string[];
}

function findDuplicateValues(refs: SeoEntityRef[], lang: Language, field: "title" | "description"): DuplicateGroup[] {
  const byValue = new Map<string, string[]>();
  for (const { key, entity } of refs) {
    const value = entity.localized[lang][field];
    const keys = byValue.get(value) ?? [];
    keys.push(key);
    byValue.set(value, keys);
  }
  return [...byValue.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([value, keys]) => ({ value, keys }));
}

export function findDuplicateTitles(refs: SeoEntityRef[], lang: Language): DuplicateGroup[] {
  return findDuplicateValues(refs, lang, "title");
}

export function findDuplicateDescriptions(refs: SeoEntityRef[], lang: Language): DuplicateGroup[] {
  return findDuplicateValues(refs, lang, "description");
}

export interface MissingMetadata {
  key: string;
  lang: Language;
  field: "title" | "description";
}

export function findMissingMetadata(refs: SeoEntityRef[], languages: readonly Language[]): MissingMetadata[] {
  const missing: MissingMetadata[] = [];
  for (const { key, entity } of refs) {
    for (const lang of languages) {
      const copy = entity.localized[lang];
      if (!copy || copy.title.trim().length === 0) missing.push({ key, lang, field: "title" });
      if (!copy || copy.description.trim().length === 0) missing.push({ key, lang, field: "description" });
    }
  }
  return missing;
}

export interface LengthOutlier {
  key: string;
  lang: Language;
  field: "title" | "description";
  length: number;
}

export interface LengthThresholds {
  titleMin: number;
  titleMax: number;
  descriptionMin: number;
  descriptionMax: number;
}

/** Conventional (not absolute) SEO length guidance: titles ~15-60 chars,
 * descriptions ~50-160 chars before search engines typically truncate. */
export const DEFAULT_LENGTH_THRESHOLDS: LengthThresholds = {
  titleMin: 15,
  titleMax: 65,
  descriptionMin: 50,
  descriptionMax: 165,
};

export function findLengthOutliers(
  refs: SeoEntityRef[],
  languages: readonly Language[],
  thresholds: LengthThresholds = DEFAULT_LENGTH_THRESHOLDS
): LengthOutlier[] {
  const outliers: LengthOutlier[] = [];
  for (const { key, entity } of refs) {
    for (const lang of languages) {
      const copy = entity.localized[lang];
      if (!copy) continue;
      // Measured as the actual rendered <title> (with " | Codivio" appended
      // by buildTitle()), not the raw pre-suffix string — that's what a
      // browser tab / search result actually shows, so it's the length
      // that matters for the 15-65 char guidance below.
      const renderedTitleLength = buildTitle(copy.title).length;
      if (renderedTitleLength < thresholds.titleMin || renderedTitleLength > thresholds.titleMax) {
        outliers.push({ key, lang, field: "title", length: renderedTitleLength });
      }
      if (copy.description.length < thresholds.descriptionMin || copy.description.length > thresholds.descriptionMax) {
        outliers.push({ key, lang, field: "description", length: copy.description.length });
      }
    }
  }
  return outliers;
}
