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

  it("matches a real hash that itself contains an internal hyphen, wherever it falls (real bug, found in production during Phase 5.2's live verification)", () => {
    // Vite's default hash alphabet includes "-", so an 8-character hash can
    // legitimately contain one — e.g. a real production main-bundle chunk
    // was actually named exactly this. The previous pattern (looking for
    // "-" followed by 6+ word characters at the very end) failed on this
    // real file: splitting on the *last* hyphen left only "fZgU" (4
    // characters), under its 6-character minimum, so this genuinely
    // hashed, immutable-safe file incorrectly fell through to
    // non-immutable caching in production.
    expect(isHashedBuildAsset("/assets/index-3Lc-fZgU.js")).toBe(true);
    // A second real example from the same deploy, with the internal hyphen
    // at a different position within the 8-character hash — confirms the
    // fix isn't sensitive to exactly where the hyphen falls.
    expect(isHashedBuildAsset("/assets/AdminApp-B-kkFuIp.js")).toBe(true);
  });

  it("matches a real .mjs asset the same way as .js/.css (Phase 5.5 follow-up fix, found in production)", () => {
    // Phase 5.5's PDF-to-Word tool was this codebase's first build output to
    // ever include a .mjs asset (pdfjs-dist's worker script, copied by
    // Vite's `?url` import with its original extension preserved). The
    // pattern previously only covered .js/.css, so this real, correctly
    // 8-character-hashed file incorrectly fell through to non-immutable
    // caching in production — the exact real filename from that deploy.
    expect(isHashedBuildAsset("/assets/pdf.worker.min-BmVo14Nb.mjs")).toBe(true);
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
    // Exactly 8 characters — Vite's real default hash length (see
    // worker/asset-cache.ts's own doc comment on why this must be exact).
    const request = new Request("https://codivio.online/assets/index-realHash.js");
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
    // Also exactly 8 characters — this test exists to prove the SPA-
    // fallback guard still works, not to test the hash-length matching
    // itself (already covered by the "realHash" case above).
    const request = new Request("https://codivio.online/assets/index-staleHas.js");
    const response = await worker.fetch(request, env);
    expect(response.headers.get("Cache-Control")).not.toBe("public, max-age=31536000, immutable");
  });
});
