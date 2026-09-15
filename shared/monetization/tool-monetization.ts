import { TOOL_SEO } from "../seo/tools";
import { getToolCategory } from "../seo/ai";
import type { ToolMonetizationMetadata } from "./types";

/**
 * Codivio tool monetization metadata (Phase 3.14).
 *
 * Deliberately reuses shared/seo/tools.ts (existence + real robots/index
 * status) and shared/seo/ai.ts#getToolCategory (existing category
 * assignment) rather than creating a second, parallel tool registry — see
 * CLAUDE.md's "no duplicate tool registries" instruction.
 *
 * Every one of the 34 tools gets the SAME honest metadata today
 * (active: false, monetizable: false, requiredPlan: "free",
 * enforced: false) because none of them has any real processing yet —
 * there is currently no basis to distinguish one tool's monetization
 * policy from another's. This function exists so a future phase, once
 * real tools ship, can start returning genuinely different values per
 * tool without any caller needing to change — not because different
 * values exist to return today.
 *
 * This is a pure, synchronous, code-level default. The D1 `tools` table
 * (migrations/0007_monetization_foundation.sql) mirrors these same
 * columns as admin-editable business data for once the public site is
 * wired to read tools from D1 (still not the case as of this phase — see
 * PROJECT_STATE.md) — until then, this function is the actual source of
 * truth used anywhere in the app.
 */
export function getToolMonetization(slug: string): ToolMonetizationMetadata | null {
  const seoEntity = TOOL_SEO[slug];
  if (!seoEntity) return null;

  const category = getToolCategory(slug);

  return {
    slug,
    active: false,
    monetizable: false,
    adsAllowed: true,
    affiliateAllowed: false,
    policyCategory: category ?? "Other Tools",
    requiresReview: false,
    seoIndexable: seoEntity.robots.index,
    userGeneratedContent: false,
    riskLevel: "low",
    requiredPlan: "free",
    enforced: false,
    usageCost: "N/A — NOT APPLICABLE",
  };
}

export function getAllToolMonetizationSlugs(): string[] {
  return Object.keys(TOOL_SEO);
}
