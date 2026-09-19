import { describe, expect, it } from "vitest";
import worker from "../worker/index";
import { makeEnv } from "./helpers/fake-d1";

/**
 * Phase 3.15 SEO canonicalization follow-up — www → apex consolidation.
 * One appropriate test per topic (per the project's testing philosophy),
 * exercising the real `worker.fetch()` end to end (same pattern as
 * tests/route-guard.test.ts and tests/seo-rewrite.test.ts) rather than unit
 * testing a helper in isolation, since the whole point of this change is
 * the actual HTTP redirect a request receives.
 */

describe("www.codivio.online → codivio.online redirect (Phase 3.15 follow-up)", () => {
  it("redirects the www homepage to the apex homepage with a permanent 301", async () => {
    const env = makeEnv();
    const response = await worker.fetch(new Request("https://www.codivio.online/"), env);
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://codivio.online/");
  });

  it("redirects a nested www route to the same path on the apex", async () => {
    const env = makeEnv();
    const response = await worker.fetch(
      new Request("https://www.codivio.online/tools/qr-code-generator"),
      env,
    );
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://codivio.online/tools/qr-code-generator");
  });

  it("preserves the query string on redirect", async () => {
    const env = makeEnv();
    const response = await worker.fetch(
      new Request("https://www.codivio.online/tools?x=1&y=2"),
      env,
    );
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://codivio.online/tools?x=1&y=2");
  });

  it("does not redirect the apex, the workers.dev host, or localhost", async () => {
    const env = makeEnv();

    const apex = await worker.fetch(new Request("https://codivio.online/"), env);
    expect(apex.status).toBe(200);
    expect(apex.headers.get("Location")).toBeNull();

    const workersDev = await worker.fetch(new Request("https://codivio.azbloknot.workers.dev/"), env);
    expect(workersDev.status).toBe(200);
    expect(workersDev.headers.get("Location")).toBeNull();

    const local = await worker.fetch(new Request("http://localhost/"), env);
    expect(local.status).toBe(200);
    expect(local.headers.get("Location")).toBeNull();
  });

  it("never loops: following the redirect's own Location does not redirect again", async () => {
    const env = makeEnv();
    const first = await worker.fetch(new Request("https://www.codivio.online/faq"), env);
    const location = first.headers.get("Location");
    expect(location).toBeTruthy();

    const second = await worker.fetch(new Request(location as string), env);
    expect(second.status).toBe(200);
    expect(second.headers.get("Location")).toBeNull();
  });
});
