import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { classifyLength, DEFAULT_LENGTH_THRESHOLDS } from "../shared/seo";

/**
 * Phase 3.15-A — Admin SEO Google Search Preview + length guidance.
 *
 * `classifyLength` (shared/seo/duplicates.ts) is a real, unit-testable
 * pure function. `AdminSeoPage.tsx`'s actual rendering (the mockups, the
 * color-coded counters) has no component-rendering test harness in this
 * project (no React Testing Library anywhere in package.json) — matching
 * the project's own established pattern (see tests/admin-ui.test.ts), this
 * verifies structurally that the source file actually wires the new UI
 * pieces together and that the CSS classes it references really exist in
 * styles.css, rather than claiming a render test that doesn't exist here.
 */

const adminSeoSource = fs.readFileSync(new URL("../src/admin/AdminSeoPage.tsx", import.meta.url), "utf8");
const styleSource = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("classifyLength", () => {
  const { titleMin, titleMax } = DEFAULT_LENGTH_THRESHOLDS;

  it("classifies below the minimum as short, above the maximum as long, and the boundary/middle as good", () => {
    expect(classifyLength(titleMin - 1, titleMin, titleMax)).toBe("short");
    expect(classifyLength(titleMax + 1, titleMin, titleMax)).toBe("long");
    expect(classifyLength(titleMin, titleMin, titleMax)).toBe("good");
    expect(classifyLength(titleMax, titleMin, titleMax)).toBe("good");
    expect(classifyLength(Math.round((titleMin + titleMax) / 2), titleMin, titleMax)).toBe("good");
  });

  it("agrees with findLengthOutliers' own boundary semantics (strict < / >, not <=/>=)", () => {
    // findLengthOutliers flags a value only when strictly outside the
    // range — classifyLength must treat the exact boundary the same way
    // (as "good"), so the two never disagree about the same value.
    expect(classifyLength(titleMin, titleMin, titleMax)).not.toBe("short");
    expect(classifyLength(titleMax, titleMin, titleMax)).not.toBe("long");
  });
});

describe("AdminSeoPage.tsx RBAC gate (Phase 3.15-B)", () => {
  it("gates on seo.view via the same useAdminUser/hasPermission pattern AdminSettingsPage.tsx already uses, before rendering the real content", () => {
    expect(adminSeoSource).toContain('import { useAdminUser } from "./AdminApp"');
    expect(adminSeoSource).toContain('import { hasPermission } from "../../shared/rbac"');
    expect(adminSeoSource).toMatch(/hasPermission\(user\.role,\s*"seo\.view"\)/);
    // The denial branch must come before the real "SEO Overview" content
    // section renders — i.e. it's a real gate, not just decoration mixed
    // into the always-rendered output.
    const denialIndex = adminSeoSource.indexOf("admin-seo-denied");
    const summarySectionIndex = adminSeoSource.indexOf("admin-seo-summary");
    expect(denialIndex).toBeGreaterThan(-1);
    expect(denialIndex).toBeLessThan(summarySectionIndex);
  });

  it("does not call any hook conditionally — useLanguage/useAdminUser/usePageMeta all run before the permission check", () => {
    const componentBody = adminSeoSource.slice(
      adminSeoSource.indexOf("export default function AdminSeoPage"),
      adminSeoSource.indexOf('if (!hasPermission(user.role, "seo.view"))')
    );
    expect(componentBody).toContain("useLanguage()");
    expect(componentBody).toContain("useAdminUser()");
    expect(componentBody).toContain("usePageMeta(");
  });
});

describe("AdminSeoPage.tsx override editing gate (Phase 3.15-C)", () => {
  it("gates the Edit control and editor on seo.manage, separately from the seo.view page-level gate", () => {
    expect(adminSeoSource).toMatch(/hasPermission\(user\.role,\s*"seo\.manage"\)/);
    expect(adminSeoSource).toContain("canManage && !editing");
    expect(adminSeoSource).toContain("canManage && editing");
  });

  it("fetches /api/admin/seo-overrides and posts to the real create/update/delete endpoints — not a fake, non-saving form", () => {
    expect(adminSeoSource).toContain('fetch("/api/admin/seo-overrides")');
    expect(adminSeoSource).toMatch(/method:\s*override\s*\?\s*"PATCH"\s*:\s*"POST"/);
    expect(adminSeoSource).toContain("method: \"DELETE\"");
  });

  it("every admin-seo-override-badge/admin-seo-editor* class referenced in the component actually exists in styles.css", () => {
    const referencedClasses = [...adminSeoSource.matchAll(/admin-seo-(?:override-badge|edit-button|editor[a-z-]*)/g)].map(
      (m) => m[0]
    );
    expect(referencedClasses.length).toBeGreaterThan(0);
    for (const className of new Set(referencedClasses)) {
      expect(styleSource, `expected styles.css to define .${className}`).toContain(`.${className}`);
    }
  });
});

describe("AdminSeoPage.tsx structural wiring (Phase 3.15-A)", () => {
  it("renders a Google Search Preview with both a Desktop and a Mobile mockup", () => {
    expect(adminSeoSource).toContain("GoogleSearchPreview");
    expect(adminSeoSource).toContain("admin-seo-serp-mock-desktop");
    expect(adminSeoSource).toContain("admin-seo-serp-mock-mobile");
    expect(adminSeoSource).toMatch(/>Desktop</);
    expect(adminSeoSource).toMatch(/>Mobile</);
  });

  it("uses the shared DEFAULT_LENGTH_THRESHOLDS/classifyLength guidance, not a second, invented set of numbers", () => {
    expect(adminSeoSource).toContain("DEFAULT_LENGTH_THRESHOLDS");
    expect(adminSeoSource).toContain("classifyLength");
    // No other numeric length-guidance thresholds should exist in this
    // file — the only real thresholds are shared/seo/duplicates.ts's own.
    expect(adminSeoSource).not.toMatch(/titleMin\s*=\s*\d/);
    expect(adminSeoSource).not.toMatch(/titleMax\s*=\s*\d/);
  });

  it("every admin-seo-serp*/admin-seo-length* class referenced in the component actually exists in styles.css", () => {
    const referencedClasses = [...adminSeoSource.matchAll(/admin-seo-(?:serp|length)[a-z-]*/g)].map((m) => m[0]);
    expect(referencedClasses.length).toBeGreaterThan(0);
    for (const className of new Set(referencedClasses)) {
      // Template-literal classes like `admin-seo-length-${status}` resolve
      // to admin-seo-length-short/-good/-long in styles.css, not a literal
      // "admin-seo-length-" selector — skip the unresolved template stem.
      if (className === "admin-seo-length-") continue;
      expect(styleSource, `expected styles.css to define .${className}`).toContain(`.${className}`);
    }
  });
});
