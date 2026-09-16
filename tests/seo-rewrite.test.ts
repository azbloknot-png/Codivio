import { describe, expect, it } from "vitest";
import worker from "../worker/index";
import { injectStaticSeoMetadata, resolveStaticSeoEntity } from "../worker/seo-rewrite";
import { makeEnv } from "./helpers/fake-d1";

/**
 * Phase 3.15 SEO Remediation — HTMLRewriter prototype. One appropriate
 * test per topic (per the task's own testing rule):
 *
 *  1. The pure lookup function (`resolveStaticSeoEntity`) — fully
 *     Node-testable, no runtime dependency on the real `HTMLRewriter`
 *     global.
 *  2. The environment-limitation guard in `injectStaticSeoMetadata` — this
 *     project's Vitest/Node environment has no real `HTMLRewriter` global
 *     (it's workerd-only), so this test proves the documented
 *     feature-detection fallback actually engages and leaves the response
 *     completely untouched, rather than throwing. It does NOT and cannot
 *     prove what the real Cloudflare runtime's HTMLRewriter output looks
 *     like — see the Phase 3.15 HTMLRewriter handoff report's Testing
 *     section for that honest limitation.
 *  3. A full `worker.fetch()` integration check that wiring this into
 *     worker/index.ts introduced no regression to the already-covered
 *     soft-404 fix or to normal 200 routes (reusing the same pattern as
 *     tests/route-guard.test.ts).
 */

describe("resolveStaticSeoEntity", () => {
  it("resolves a real static page and a real tool page, and rejects everything else", () => {
    expect(resolveStaticSeoEntity("/faq")?.path).toBe("/faq");
    expect(resolveStaticSeoEntity("/tools/qr-code-generator")?.path).toBe("/tools/qr-code-generator");
    expect(resolveStaticSeoEntity("/tools/not-a-real-tool")).toBeNull();
    expect(resolveStaticSeoEntity("/some-cms-page")).toBeNull();
    expect(resolveStaticSeoEntity("/this-page-does-not-exist")).toBeNull();
  });
});

describe("injectStaticSeoMetadata", () => {
  it("no-ops and returns the response untouched when the real HTMLRewriter global is unavailable (this test environment)", async () => {
    expect(typeof (globalThis as { HTMLRewriter?: unknown }).HTMLRewriter).toBe("undefined");

    const original = new Response("<html><head><title>Original</title></head></html>", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    const result = injectStaticSeoMetadata(original, "/faq");

    expect(result).toBe(original);
    expect(await result.text()).toContain("Original");
  });
});

describe("Worker fetch() end to end — SEO rewrite wiring introduces no regression", () => {
  it("known static/tool routes and the existing soft-404 fix behave exactly as before", async () => {
    const env = makeEnv();

    const knownPage = await worker.fetch(new Request("http://localhost/faq"), env);
    expect(knownPage.status).toBe(200);

    const knownTool = await worker.fetch(new Request("http://localhost/tools/qr-code-generator"), env);
    expect(knownTool.status).toBe(200);

    const unknownPage = await worker.fetch(new Request("http://localhost/this-page-does-not-exist"), env);
    expect(unknownPage.status).toBe(404);

    const api = await worker.fetch(new Request("http://localhost/api/faqs?language=en"), env);
    expect(api.status).toBe(200);
  });
});
