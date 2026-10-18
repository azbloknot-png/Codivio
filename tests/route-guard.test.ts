import { describe, expect, it } from "vitest";
import worker from "../worker/index";
import { isKnownPublicRoute, isPageNavigationCandidate, normalizePathname } from "../worker/route-guard";
import { makeEnv } from "./helpers/fake-d1";

/**
 * Phase 3.15 SEO Remediation — soft-404 fix. One appropriate test per
 * topic: the pure route-classification functions directly, then the full
 * Worker fetch() end to end (via a FakeD1-backed env, the same pattern
 * every other worker/*.test.ts file uses) to prove the actual HTTP status
 * a request receives, not just the classification logic in isolation.
 */

describe("isKnownPublicRoute", () => {
  it("recognizes every real static page path", async () => {
    const env = makeEnv();
    for (const path of ["/", "/tools", "/blog", "/faq", "/about", "/contact", "/privacy", "/terms", "/cookies", "/pricing"]) {
      expect(await isKnownPublicRoute(path, env)).toBe(true);
    }
  });

  it("recognizes a real tool slug and rejects a fake one", async () => {
    const env = makeEnv();
    expect(await isKnownPublicRoute("/tools/qr-code-generator", env)).toBe(true);
    expect(await isKnownPublicRoute("/tools/not-a-real-tool", env)).toBe(false);
  });

  it("recognizes a published CMS page slug and rejects an unpublished or nonexistent one", async () => {
    const env = makeEnv();
    const fake = env.DB as import("./helpers/fake-d1").FakeD1;
    fake.pages.push({ id: 1, slug: "real-cms-page", status: "published" });
    fake.pages.push({ id: 2, slug: "draft-cms-page", status: "draft" });

    expect(await isKnownPublicRoute("/real-cms-page", env)).toBe(true);
    expect(await isKnownPublicRoute("/draft-cms-page", env)).toBe(false);
    expect(await isKnownPublicRoute("/totally-made-up-page", env)).toBe(false);
  });

  // Post-Phase-8.5 fix: a real published article was previously
  // indistinguishable from a nonexistent one (both fell through every
  // existing case to "unknown"). Mirrors the CMS-page test immediately
  // above exactly, for the /blog/:slug shape instead.
  it("recognizes a published blog article slug and rejects a draft, scheduled, or nonexistent one", async () => {
    const env = makeEnv();
    const fake = env.DB as import("./helpers/fake-d1").FakeD1;
    fake.blogPosts.push({ id: 1, slug: "real-published-article", status: "published" });
    fake.blogPosts.push({ id: 2, slug: "draft-article", status: "draft" });
    fake.blogPosts.push({ id: 3, slug: "scheduled-article", status: "scheduled" });

    expect(await isKnownPublicRoute("/blog/real-published-article", env)).toBe(true);
    expect(await isKnownPublicRoute("/blog/draft-article", env)).toBe(false);
    expect(await isKnownPublicRoute("/blog/scheduled-article", env)).toBe(false);
    expect(await isKnownPublicRoute("/blog/totally-made-up-article", env)).toBe(false);
  });
});

describe("normalizePathname", () => {
  it("strips exactly one trailing slash, except for the root", () => {
    expect(normalizePathname("/tools/")).toBe("/tools");
    expect(normalizePathname("/tools")).toBe("/tools");
    expect(normalizePathname("/")).toBe("/");
  });
});

describe("isPageNavigationCandidate", () => {
  it("excludes non-GET requests, /admin/* paths, and asset-shaped paths with an extension", () => {
    expect(isPageNavigationCandidate(new Request("http://localhost/foo", { method: "POST" }), "/foo")).toBe(false);
    expect(isPageNavigationCandidate(new Request("http://localhost/admin/tools"), "/admin/tools")).toBe(false);
    expect(isPageNavigationCandidate(new Request("http://localhost/assets/x.js"), "/assets/x.js")).toBe(false);
    expect(isPageNavigationCandidate(new Request("http://localhost/faq"), "/faq")).toBe(true);
  });
});

describe("Worker fetch() end to end — soft-404 fix", () => {
  it("a genuinely unknown page path now returns a real 404, not the SPA shell's 200", async () => {
    const env = makeEnv();
    const response = await worker.fetch(new Request("http://localhost/this-page-does-not-exist"), env);
    expect(response.status).toBe(404);
  });

  it("every real static page, a real tool page, and a published CMS page still return 200 (no regression)", async () => {
    const env = makeEnv();
    const fake = env.DB as import("./helpers/fake-d1").FakeD1;
    fake.pages.push({ id: 1, slug: "real-cms-page", status: "published" });

    for (const path of ["/", "/tools", "/faq", "/tools/qr-code-generator", "/real-cms-page"]) {
      const response = await worker.fetch(new Request(`http://localhost${path}`), env);
      expect(response.status, path).toBe(200);
    }
  });

  // Post-Phase-8.5 fix, end-to-end proof: before this fix, both of these
  // requests returned 404 — a real published article was indistinguishable
  // from a draft one at the actual HTTP layer, not just in the pure
  // isKnownPublicRoute() unit above.
  it("a real published blog article now returns 200; a draft article's slug still returns 404", async () => {
    const env = makeEnv();
    const fake = env.DB as import("./helpers/fake-d1").FakeD1;
    fake.blogPosts.push({ id: 1, slug: "real-published-article", status: "published" });
    fake.blogPosts.push({ id: 2, slug: "draft-article", status: "draft" });

    const publishedResponse = await worker.fetch(new Request("http://localhost/blog/real-published-article"), env);
    expect(publishedResponse.status).toBe(200);

    const draftResponse = await worker.fetch(new Request("http://localhost/blog/draft-article"), env);
    expect(draftResponse.status).toBe(404);

    const nonexistentResponse = await worker.fetch(new Request("http://localhost/blog/totally-made-up-article"), env);
    expect(nonexistentResponse.status).toBe(404);
  });

  it("an unmatched /api/* path returns a real JSON 404, not the SPA shell's HTML", async () => {
    const env = makeEnv();
    const response = await worker.fetch(new Request("http://localhost/api/totally-invalid-endpoint"), env);
    expect(response.status).toBe(404);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBeTruthy();
  });

  it("an unmatched /admin/* sub-route is left unchanged (still 200), not newly 404'd", async () => {
    const env = makeEnv();
    const response = await worker.fetch(new Request("http://localhost/admin/some-unknown-subpage"), env);
    expect(response.status).toBe(200);
  });
});
