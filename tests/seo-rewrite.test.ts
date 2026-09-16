import { describe, expect, it } from "vitest";
import worker from "../worker/index";
import {
  escapeHtml,
  injectStaticSeoMetadata,
  resolveCriticalContent,
  resolveJsonLdGraph,
  resolveStaticSeoEntity,
} from "../worker/seo-rewrite";
import { buildCanonicalUrl } from "../shared/seo/site";
import { serializeJsonLdGraph } from "../shared/seo/schema";
import { PAGE_SEO } from "../shared/seo/pages";
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

describe("resolveJsonLdGraph", () => {
  it("builds a valid, parseable JSON-LD graph for a static page, with the correct route-specific canonical URL", () => {
    const graph = resolveJsonLdGraph("/faq");
    expect(graph).not.toBeNull();

    // Must survive the same escaping used before embedding in a <script>
    // tag, then parse back to valid JSON (Step: "valid JSON-LD parsing").
    const serialized = serializeJsonLdGraph(graph!);
    const parsed = JSON.parse(serialized.replace(/\\u003c/g, "<"));
    expect(parsed["@context"]).toBe("https://schema.org");

    const types = parsed["@graph"].map((node: { "@type": string }) => node["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");

    const webPage = parsed["@graph"].find((node: { "@type": string }) => node["@type"] !== "Organization" && node["@type"] !== "WebSite");
    expect(webPage.url).toBe(buildCanonicalUrl("/faq"));
  });

  it("builds a JSON-LD graph (with BreadcrumbList) for a real tool page even though it is noindex,follow", () => {
    const graph = resolveJsonLdGraph("/tools/qr-code-generator");
    expect(graph).not.toBeNull();

    const webPage = graph!["@graph"].find((node) => "breadcrumb" in node) as { breadcrumb?: unknown; url: string };
    expect(webPage.url).toBe(buildCanonicalUrl("/tools/qr-code-generator"));
    expect(webPage.breadcrumb).toBeDefined();
  });

  it("returns null for a fake tool, a CMS-shaped path, and a genuinely unknown path (no JSON-LD on invalid routes)", () => {
    expect(resolveJsonLdGraph("/tools/not-a-real-tool")).toBeNull();
    expect(resolveJsonLdGraph("/some-cms-page")).toBeNull();
    expect(resolveJsonLdGraph("/this-page-does-not-exist")).toBeNull();
  });
});

describe("resolveCriticalContent", () => {
  it("returns the real static page's own title/description as h1/intro (same values already used for <title>/meta description)", () => {
    const content = resolveCriticalContent("/faq");
    expect(content).not.toBeNull();
    expect(content!.h1).toBe(PAGE_SEO.faq.localized.az.title);
    expect(content!.intro).toBe(PAGE_SEO.faq.localized.az.description);
  });

  it("returns the tool's plain display name (not the full SEO title) as h1, and its content-blueprint introduction", () => {
    const content = resolveCriticalContent("/tools/qr-code-generator");
    expect(content).not.toBeNull();
    // getToolDisplayName strips everything from "–" onward.
    expect(content!.h1).not.toContain("–");
    expect(content!.h1.length).toBeGreaterThan(0);
    expect(content!.intro.length).toBeGreaterThan(0);
  });

  it("returns null for a fake tool, a CMS-shaped path, and a genuinely unknown path (no injected content on invalid routes)", () => {
    expect(resolveCriticalContent("/tools/not-a-real-tool")).toBeNull();
    expect(resolveCriticalContent("/some-cms-page")).toBeNull();
    expect(resolveCriticalContent("/this-page-does-not-exist")).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("escapes &, < and > so injected text can never break out of its HTML element or inject a tag", () => {
    expect(escapeHtml("QR Codes, PDFs & Images")).toBe("QR Codes, PDFs &amp; Images");
    expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    // Real data this matters for (not a hypothetical): the homepage's own
    // English PAGE_SEO title contains a literal "&" (AZ/TR use "və"/"ve"
    // instead, so DEFAULT_LANGUAGE's own injected string happens not to
    // need this today — but the helper must handle it correctly
    // regardless, since it isn't specific to one language's data).
    expect(PAGE_SEO.home.localized.en.title).toContain("&");
    expect(escapeHtml(PAGE_SEO.home.localized.en.title)).toContain("&amp;");
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
