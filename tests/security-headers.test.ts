import { describe, expect, it } from "vitest";
import { withSecurityHeaders } from "../worker/security-headers";

describe("security headers baseline (Phase 2.11)", () => {
  it("applies CSP/X-Content-Type-Options/Referrer-Policy/Permissions-Policy/X-Frame-Options to every response", () => {
    const inner = Response.json({ ok: true });
    const wrapped = withSecurityHeaders(inner, new Request("http://localhost/api/health"));

    expect(wrapped.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(wrapped.headers.get("Content-Security-Policy")).not.toContain("unsafe-inline");
    expect(wrapped.headers.get("Content-Security-Policy")).not.toContain("unsafe-eval");
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
});
