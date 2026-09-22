import { describe, expect, it } from "vitest";
import { isHashedBuildAsset, withImmutableAssetCache } from "../worker/asset-cache";
import worker from "../worker/index";
import { makeEnv } from "./helpers/fake-d1";

/**
 * Performance Fix — long-lived immutable caching for Vite's content-hashed
 * build output. One appropriate test per topic: the pure path-classifier
 * function, then the header-rewrite function, covering exactly the
 * boundary cases the module's own doc comment names (hashed chunks yes,
 * stable-filename branding/SEO-file assets no).
 */

describe("isHashedBuildAsset", () => {
  it("matches real, current Vite-hashed JS/CSS chunk paths", () => {
    expect(isHashedBuildAsset("/assets/index-CYmGTOMx.js")).toBe(true);
    expect(isHashedBuildAsset("/assets/index-BnSPAWfm.css")).toBe(true);
    expect(isHashedBuildAsset("/assets/ToolPage-BdDKsSI8.js")).toBe(true);
    expect(isHashedBuildAsset("/assets/QrCodeGeneratorTool-BxphjM4p.js")).toBe(true);
    expect(isHashedBuildAsset("/assets/qr-analytics-DyYx_8jy.js")).toBe(true);
  });

  it("rejects nested, stable-filename static assets (branding logo/favicon) — never safe to cache forever", () => {
    expect(isHashedBuildAsset("/assets/branding/codivio-logo.png")).toBe(false);
    expect(isHashedBuildAsset("/assets/branding/codivio-logo-header.webp")).toBe(false);
    expect(isHashedBuildAsset("/assets/branding/codivio-favicon.png")).toBe(false);
  });

  it("rejects stable-filename technical SEO files (not under /assets/ at all)", () => {
    for (const path of ["/robots.txt", "/sitemap.xml", "/sitemap.xsl", "/sitemap.css", "/llms.txt", "/index.html", "/"]) {
      expect(isHashedBuildAsset(path), path).toBe(false);
    }
  });

  it("rejects a plain, unhashed filename even if it were placed directly under /assets/", () => {
    expect(isHashedBuildAsset("/assets/app.js")).toBe(false);
    expect(isHashedBuildAsset("/assets/styles.css")).toBe(false);
  });

  it("rejects non-JS/CSS extensions and API/admin paths", () => {
    expect(isHashedBuildAsset("/assets/index-CYmGTOMx.js.map")).toBe(false);
    expect(isHashedBuildAsset("/api/health")).toBe(false);
    expect(isHashedBuildAsset("/admin")).toBe(false);
  });
});

describe("withImmutableAssetCache", () => {
  it("sets exactly the long-lived immutable Cache-Control, replacing whatever was there before", () => {
    const original = new Response("body", {
      status: 200,
      headers: { "Cache-Control": "public, max-age=0, must-revalidate", "Content-Type": "text/javascript" },
    });
    const rewritten = withImmutableAssetCache(original);
    expect(rewritten.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("leaves every other header (Content-Type, status) completely untouched", () => {
    const original = new Response("body", {
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "text/css", "ETag": "\"abc123\"" },
    });
    const rewritten = withImmutableAssetCache(original);
    expect(rewritten.status).toBe(200);
    expect(rewritten.headers.get("Content-Type")).toBe("text/css");
    expect(rewritten.headers.get("ETag")).toBe('"abc123"');
  });
});

describe("worker/index.ts integration — real edge case found during this fix's own live-deploy verification", () => {
  it("applies immutable caching to a real, current hashed JS chunk", async () => {
    const env = makeEnv({
      ASSETS: {
        fetch: async () =>
          new Response("console.log(1)", { status: 200, headers: { "Content-Type": "text/javascript" } }),
      },
    });
    const request = new Request("https://codivio.online/assets/index-realHash1.js");
    const response = await worker.fetch(request, env);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
  });

  it("does NOT apply immutable caching when a hashed-looking path no longer matches a real deployed file — Cloudflare's own SPA fallback (not_found_handling) returns the HTML shell with status 200 instead of a real 404, and this must not be cached forever as if it were the JS/CSS file the URL implies", async () => {
    const env = makeEnv({
      ASSETS: {
        fetch: async () =>
          new Response("<!doctype html>...", { status: 200, headers: { "Content-Type": "text/html" } }),
      },
    });
    const request = new Request("https://codivio.online/assets/index-staleHash1.js");
    const response = await worker.fetch(request, env);
    expect(response.headers.get("Cache-Control")).not.toBe("public, max-age=31536000, immutable");
  });
});
