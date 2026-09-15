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
  methodNotAllowed,
} from "./auth";
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

    return env.ASSETS.fetch(request);
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
