import { describe, expect, it } from "vitest";
import { withSecurityHeaders } from "../worker/security-headers";

describe("security headers baseline (Phase 2.11)", () => {
  it("applies CSP/X-Content-Type-Options/Referrer-Policy/Permissions-Policy/X-Frame-Options to every response", () => {
    const inner = Response.json({ ok: true });
    const wrapped = withSecurityHeaders(inner, new Request("http://localhost/api/health"));

    expect(wrapped.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(wrapped.headers.get("Content-Security-Policy")).not.toContain("unsafe-inline");
    // The broad 'unsafe-eval' token (which would also permit eval()/
    // new Function()) must never appear — only the narrower, Phase 6.5-
    // disclosed 'wasm-unsafe-eval' token (WebAssembly compilation only) is
    // present, so this checks for the exact quoted broad token, not a bare
    // substring match that 'wasm-unsafe-eval' would also satisfy.
    expect(wrapped.headers.get("Content-Security-Policy")).not.toContain("'unsafe-eval'");
    expect(wrapped.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(wrapped.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    // Exact full-string match (not just toContain) so any future accidental
    // widening of microphone/geolocation/payment, or of camera beyond
    // same-origin, fails loudly instead of silently passing a loose check.
    expect(wrapped.headers.get("Permissions-Policy")).toBe("camera=(self), microphone=(), geolocation=(), payment=()");
    expect(wrapped.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("adds Strict-Transport-Security only for an https request, never for plain http (local dev)", async () => {
    const httpsResponse = withSecurityHeaders(Response.json({}), new Request("https://codivio.online/"));
    expect(httpsResponse.headers.get("Strict-Transport-Security")).toContain("max-age=");

    const httpResponse = withSecurityHeaders(Response.json({}), new Request("http://localhost/"));
    expect(httpResponse.headers.get("Strict-Transport-Security")).toBeNull();
  });

  it("preserves the wrapped response's status and existing headers (e.g. Set-Cookie)", async () => {
    const inner = new Response("nope", { status: 404, headers: { "Set-Cookie": "codivio_session=; Max-Age=0" } });
    const wrapped = withSecurityHeaders(inner, new Request("http://localhost/x"));
    expect(wrapped.status).toBe(404);
    expect(wrapped.headers.get("Set-Cookie")).toBe("codivio_session=; Max-Age=0");
  });

  // GA4 foundational integration: the CSP was widened by exactly the hosts
  // Google's own gtag.js CSP guidance names, nothing broader, and with no
  // new 'unsafe-inline'/'unsafe-eval' exception introduced alongside it.
  it("allows exactly the GA4/gtag.js hosts needed, with no broader script/style exception", () => {
    const csp = withSecurityHeaders(Response.json({}), new Request("http://localhost/")).headers.get(
      "Content-Security-Policy",
    );
    expect(csp).toContain("script-src 'self' https://www.googletagmanager.com");
    expect(csp).toContain("https://www.google-analytics.com");
    expect(csp).toContain("https://*.google-analytics.com");
    expect(csp).toContain("https://*.analytics.google.com");
    expect(csp).toMatch(/connect-src[^;]*https:\/\/www\.googletagmanager\.com/);
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).not.toContain("'unsafe-eval'");
    // style-src stays untouched by the GA4 widening — gtag.js needs no CSS.
    expect(csp).toContain("style-src 'self'");
  });

  // Phase 6.5 (Background Remover) REAL PROJECT PROBLEM fix: the CSP
  // previously omitted the two exact external hosts that tool's own
  // disclosed MediaPipe WASM/model fetch depends on, which would have
  // blocked every real-browser attempt to use it. Regression guard for that
  // specific fix — see worker/security-headers.ts's own header comment.
  it("allows exactly the MediaPipe WASM/model hosts Background Remover needs, with no broader eval exception", () => {
    const csp = withSecurityHeaders(Response.json({}), new Request("http://localhost/")).headers.get(
      "Content-Security-Policy",
    );
    expect(csp).toContain("https://cdn.jsdelivr.net");
    expect(csp).toMatch(/connect-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
    expect(csp).toMatch(/connect-src[^;]*https:\/\/storage\.googleapis\.com/);
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});
