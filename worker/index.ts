/**
 * Cloudflare Worker entry point.
 *
 * Phase 2.2 established: serving the existing public SPA unchanged, plus a
 * read-only health endpoint reporting real D1 connectivity.
 * Phase 2.3 adds: admin login/logout/session-check + a one-time bootstrap
 * endpoint (see ./auth.ts). No RBAC enforcement, Admin UI, protected
 * routes, audit logging, or settings yet — those are later checkpoints.
 *
 * Shared runtime types live in ./types.ts.
 */

import type { Env } from "./types";
import {
  handleBootstrap,
  handleLogin,
  handleLogout,
  handleSession,
  jsonError,
  methodNotAllowed,
} from "./auth";
import { isKnownPublicRoute, isPageNavigationCandidate, normalizePathname } from "./route-guard";
import { injectStaticSeoMetadata } from "./seo-rewrite";
import { handleGetSettings, handlePatchSettings, handlePublicSettings } from "./settings";
import {
  handleCreatePage,
  handleDeletePage,
  handleGetPage,
  handleListPages,
  handlePublicPage,
  handleUpdatePage,
} from "./pages";
import {
  handleCreateTool,
  handleDeleteTool,
  handleGetTool,
  handleListTools,
  handleUpdateTool,
} from "./tools";
import {
  handleCreateFaq,
  handleDeleteFaq,
  handleGetFaq,
  handleListFaqs,
  handlePublicFaqs,
  handleUpdateFaq,
} from "./faq";
import { withSecurityHeaders } from "./security-headers";

export type { Env };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return withSecurityHeaders(await route(request, env), request);
  },
};

/** The actual request router — factored out so the security-header wrapping
 * above is the one place applied to every response, success or error, API
 * or static asset, without needing to touch each handler individually. */
async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return handleHealth(env);
    }

    if (url.pathname === "/api/auth/login") {
      return request.method === "POST"
        ? handleLogin(request, env)
        : methodNotAllowed(["POST"]);
    }

    if (url.pathname === "/api/auth/logout") {
      return request.method === "POST"
        ? handleLogout(request, env)
        : methodNotAllowed(["POST"]);
    }

    if (url.pathname === "/api/auth/session") {
      return request.method === "GET"
        ? handleSession(request, env)
        : methodNotAllowed(["GET"]);
    }

    if (url.pathname === "/api/auth/bootstrap") {
      return request.method === "POST"
        ? handleBootstrap(request, env)
        : methodNotAllowed(["POST"]);
    }

    if (url.pathname === "/api/settings/public") {
      return request.method === "GET"
        ? handlePublicSettings(request, env)
        : methodNotAllowed(["GET"]);
    }

    if (url.pathname === "/api/admin/settings") {
      if (request.method === "GET") return handleGetSettings(request, env);
      if (request.method === "PATCH") return handlePatchSettings(request, env);
      return methodNotAllowed(["GET", "PATCH"]);
    }

    if (url.pathname === "/api/admin/pages") {
      if (request.method === "GET") return handleListPages(request, env);
      if (request.method === "POST") return handleCreatePage(request, env);
      return methodNotAllowed(["GET", "POST"]);
    }

    const adminPageMatch = url.pathname.match(/^\/api\/admin\/pages\/([^/]+)$/);
    if (adminPageMatch) {
      const id = adminPageMatch[1];
      if (request.method === "GET") return handleGetPage(request, env, id);
      if (request.method === "PATCH") return handleUpdatePage(request, env, id);
      if (request.method === "DELETE") return handleDeletePage(request, env, id);
      return methodNotAllowed(["GET", "PATCH", "DELETE"]);
    }

    const publicPageMatch = url.pathname.match(/^\/api\/pages\/([^/]+)$/);
    if (publicPageMatch) {
      return request.method === "GET"
        ? handlePublicPage(request, env, publicPageMatch[1])
        : methodNotAllowed(["GET"]);
    }

    if (url.pathname === "/api/faqs") {
      return request.method === "GET" ? handlePublicFaqs(request, env) : methodNotAllowed(["GET"]);
    }

    if (url.pathname === "/api/admin/tools") {
      if (request.method === "GET") return handleListTools(request, env);
      if (request.method === "POST") return handleCreateTool(request, env);
      return methodNotAllowed(["GET", "POST"]);
    }

    const adminToolMatch = url.pathname.match(/^\/api\/admin\/tools\/([^/]+)$/);
    if (adminToolMatch) {
      const id = adminToolMatch[1];
      if (request.method === "GET") return handleGetTool(request, env, id);
      if (request.method === "PATCH") return handleUpdateTool(request, env, id);
      if (request.method === "DELETE") return handleDeleteTool(request, env, id);
      return methodNotAllowed(["GET", "PATCH", "DELETE"]);
    }

    if (url.pathname === "/api/admin/faqs") {
      if (request.method === "GET") return handleListFaqs(request, env);
      if (request.method === "POST") return handleCreateFaq(request, env);
      return methodNotAllowed(["GET", "POST"]);
    }

    const adminFaqMatch = url.pathname.match(/^\/api\/admin\/faqs\/([^/]+)$/);
    if (adminFaqMatch) {
      const id = adminFaqMatch[1];
      if (request.method === "GET") return handleGetFaq(request, env, id);
      if (request.method === "PATCH") return handleUpdateFaq(request, env, id);
      if (request.method === "DELETE") return handleDeleteFaq(request, env, id);
      return methodNotAllowed(["GET", "PATCH", "DELETE"]);
    }

    // Every specific /api/* route above has already had its chance to
    // match — an unmatched /api/* path is a genuine 404, not the SPA shell
    // (previously this fell through to env.ASSETS.fetch() below and
    // returned index.html with 200, a real Phase 3.15-audit finding: no
    // caller legitimately depends on an unknown API path returning HTML).
    if (url.pathname.startsWith("/api/")) {
      return jsonError("Not found", 404);
    }

    const assetsResponse = await env.ASSETS.fetch(request);

    // Phase 3.15 SEO Remediation — soft-404 fix (see ./route-guard.ts for
    // the full reasoning). Only reconsider the status for a page-shaped GET
    // request that the SPA-fallback config served as 200; a genuinely
    // unknown page gets its status corrected to 404 while the exact same
    // SPA-shell body is still served, so client-side rendering is
    // unaffected — only the transport-layer status code changes.
    if (assetsResponse.status === 200 && isPageNavigationCandidate(request, url.pathname)) {
      const normalizedPath = normalizePathname(url.pathname);
      const known = await isKnownPublicRoute(normalizedPath, env);
      if (!known) {
        return new Response(assetsResponse.body, {
          status: 404,
          statusText: "Not Found",
          headers: assetsResponse.headers,
        });
      }

      // Phase 3.15 SEO Remediation — HTMLRewriter prototype (see
      // ./seo-rewrite.ts). Narrowly rewrites title/description/canonical/
      // robots/OG-title/OG-description for a known static page or tool
      // route; a no-op everywhere else (unknown routes never reach this
      // line — they returned 404 above).
      return injectStaticSeoMetadata(assetsResponse, normalizedPath);
    }

    return assetsResponse;
}

async function handleHealth(env: Env): Promise<Response> {
  const timestamp = new Date().toISOString();

  try {
    await env.DB.prepare("SELECT 1").first();
    return Response.json({ status: "ok", database: "connected", timestamp });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        database: "unreachable",
        message: error instanceof Error ? error.message : "Unknown D1 error",
        timestamp,
      },
      { status: 503 }
    );
  }
}
