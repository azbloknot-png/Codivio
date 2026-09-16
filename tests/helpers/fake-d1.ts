import type { D1Database, D1PreparedStatement, Env } from "../../worker/types";

/**
 * A minimal in-memory D1 stand-in, shared across test files (Phase 2.3
 * auth tests and Phase 2.5 RBAC tests both exercise the same
 * users/sessions/login_attempts queries). Query-matching mirrors the exact
 * SQL strings in worker/auth.ts and was cross-checked query-by-query
 * against a real SQLite engine (node:sqlite) before this was written — see
 * the Phase 2.3 report for that verification. This is a mocked-D1 unit
 * test helper, not a live Workers-runtime/D1 integration test (the local
 * `workerd` runtime cannot boot on this machine — see codivio-test-gate).
 */
export class FakeD1 implements D1Database {
  users: Record<string, unknown>[] = [];
  sessions: Record<string, unknown>[] = [];
  loginAttempts: Record<string, unknown>[] = [];
  auditLogs: Record<string, unknown>[] = [];
  settings: Record<string, unknown>[] = [];
  pages: Record<string, unknown>[] = [];
  categories: Record<string, unknown>[] = [];
  tools: Record<string, unknown>[] = [];
  siteFaqs: Record<string, unknown>[] = [];
  private nextUserId = 1;
  private nextAuditId = 1;
  private nextPageId = 1;
  private nextToolId = 1;
  private nextFaqId = 1;

  /** Seeds the same 4 category rows migrations/0006_tools_management.sql
   * inserts. Real tool rows are seeded separately per-test via
   * seedTool(), since most tool tests only need one or two, not all 34. */
  seedToolCategories(): void {
    this.categories.push(
      { id: 1, slug: "qr", name: "QR Tools" },
      { id: 2, slug: "pdf", name: "PDF Tools" },
      { id: 3, slug: "image", name: "Image Tools" },
      { id: 4, slug: "other", name: "Other Tools" }
    );
  }

  /** Seeds the same rows migrations/0004_settings.sql inserts, so tests
   * exercise realistic data without duplicating the list by hand. */
  seedDefaultSettings(): void {
    const rows: [string, string, string, string, number, string][] = [
      ["general.site_name", "Codivio", "string", "general", 1, "Public site name"],
      ["general.site_description", "Free online tools.", "string", "general", 1, "Public site description"],
      ["general.default_language", "en", "string", "general", 1, "Default site language code"],
      ["system.maintenance_mode", "false", "boolean", "system", 1, "Whether the site is in maintenance mode"],
      ["google.analytics_configured", "false", "boolean", "google", 0, "Whether Google Analytics has been configured"],
      ["google.search_console_configured", "false", "boolean", "google", 0, "Whether Search Console has been configured"],
      ["advertising.adsense_configured", "false", "boolean", "advertising", 0, "Whether AdSense has been configured"],
      ["affiliate.enabled", "false", "boolean", "affiliate", 0, "Whether the affiliate program is enabled"],
      ["security.registration_enabled", "false", "boolean", "security", 0, "Whether public admin registration is enabled"],
    ];
    for (const [key, value, value_type, category, is_public, description] of rows) {
      this.settings.push({
        key,
        value,
        value_type,
        category,
        is_public,
        description,
        updated_at: new Date().toISOString(),
        updated_by: null,
      });
    }
  }

  prepare(query: string): D1PreparedStatement {
    const q = query.replace(/\s+/g, " ").trim();
    const db = this;
    let bound: unknown[] = [];
    const stmt: D1PreparedStatement = {
      bind(...values: unknown[]) {
        bound = values;
        return stmt;
      },
      async first<T>() {
        return db.run(q, bound).first as T | null;
      },
      async run() {
        const result = db.run(q, bound);
        return { results: [], success: true, meta: { last_row_id: result.lastRowId ?? 0, changes: 0 } };
      },
      async all<T>() {
        return { results: db.run(q, bound).all as T[], success: true, meta: { last_row_id: 0, changes: 0 } };
      },
    };
    return stmt;
  }

  private run(
    q: string,
    v: unknown[]
  ): { first: Record<string, unknown> | null; all: Record<string, unknown>[]; lastRowId?: number } {
    if (q.startsWith("SELECT id, email, password_hash, role, status FROM users WHERE email")) {
      const row = this.users.find((u) => u.email === v[0]) ?? null;
      return { first: row, all: row ? [row] : [] };
    }
    if (q.startsWith("SELECT COUNT(*) as count FROM users")) {
      return { first: { count: this.users.length }, all: [] };
    }
    if (q.startsWith("INSERT INTO users")) {
      const [email, password_hash, role] = v;
      this.users.push({ id: this.nextUserId++, email, password_hash, role, status: "active" });
      return { first: null, all: [] };
    }
    if (q.startsWith("UPDATE users SET last_login_at")) {
      return { first: null, all: [] };
    }
    if (q.startsWith("INSERT INTO sessions")) {
      const [id, user_id, expires_at] = v;
      this.sessions.push({ id, user_id, expires_at });
      return { first: null, all: [] };
    }
    if (q.includes("FROM sessions JOIN users")) {
      const [id] = v;
      const session = this.sessions.find((s) => s.id === id);
      if (!session) return { first: null, all: [] };
      const user = this.users.find((u) => u.id === session.user_id);
      if (!user) return { first: null, all: [] };
      return {
        first: {
          session_id: session.id,
          expires_at: session.expires_at,
          user_id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        all: [],
      };
    }
    if (q.startsWith("DELETE FROM sessions")) {
      const [id] = v;
      this.sessions = this.sessions.filter((s) => s.id !== id);
      return { first: null, all: [] };
    }
    if (q.startsWith("UPDATE sessions SET last_used_at")) {
      return { first: null, all: [] };
    }
    if (q.startsWith("SELECT COUNT(*) as count FROM login_attempts")) {
      const [identifier, since] = v as [string, string];
      const count = this.loginAttempts.filter(
        (a) => a.identifier === identifier && (a.created_at as string) >= since
      ).length;
      return { first: { count }, all: [] };
    }
    if (q.startsWith("INSERT INTO login_attempts")) {
      const [identifier, created_at] = v;
      this.loginAttempts.push({ identifier, created_at });
      return { first: null, all: [] };
    }
    if (q.startsWith("INSERT INTO audit_logs")) {
      const [user_id, actor_email, action, entity_type, entity_id, result, ip_address, user_agent, metadata_json] = v;
      this.auditLogs.push({
        id: this.nextAuditId++,
        user_id,
        actor_email,
        action,
        entity_type,
        entity_id,
        result,
        ip_address,
        user_agent,
        metadata_json,
        created_at: new Date().toISOString(),
      });
      return { first: null, all: [] };
    }
    if (q.startsWith("SELECT key, value, value_type, category, is_public, description, updated_at FROM settings WHERE is_public = 1")) {
      const rows = this.settings.filter((s) => s.is_public === 1);
      return { first: rows[0] ?? null, all: rows };
    }
    if (q.startsWith("SELECT key, value, value_type, category, is_public, description, updated_at FROM settings ORDER BY")) {
      return { first: this.settings[0] ?? null, all: [...this.settings] };
    }
    if (q.startsWith("SELECT key, value, value_type, category, is_public, description, updated_at FROM settings WHERE key")) {
      const row = this.settings.find((s) => s.key === v[0]) ?? null;
      return { first: row, all: row ? [row] : [] };
    }
    if (q.startsWith("UPDATE settings SET value")) {
      const [value, updated_at, updated_by, key] = v;
      const row = this.settings.find((s) => s.key === key);
      if (row) {
        row.value = value;
        row.updated_at = updated_at;
        row.updated_by = updated_by;
      }
      return { first: null, all: [] };
    }
    if (q.startsWith("SELECT id, title, slug, content, status, description, meta_title, meta_description, canonical_url, is_indexable, created_at, updated_at, created_by, updated_by FROM pages")) {
      // Rows are shallow-copied before being returned — real D1 hands back
      // an independent snapshot per query, never a live reference into
      // server-side state. Returning the same object twice (e.g. once
      // before and once after an UPDATE) would otherwise let an in-place
      // Object.assign in the UPDATE branch silently mutate an
      // already-returned "before" snapshot, which previously broke a
      // before/after status-comparison in worker/pages.ts's audit logic.
      if (q.includes("WHERE id = ?")) {
        const row = this.pages.find((p) => p.id === v[0]) ?? null;
        return { first: row ? { ...row } : null, all: row ? [{ ...row }] : [] };
      }
      if (q.includes("WHERE slug = ? AND status = 'published'")) {
        const row = this.pages.find((p) => p.slug === v[0] && p.status === "published") ?? null;
        return { first: row ? { ...row } : null, all: row ? [{ ...row }] : [] };
      }
      if (q.includes("WHERE slug = ?")) {
        const row = this.pages.find((p) => p.slug === v[0]) ?? null;
        return { first: row ? { ...row } : null, all: row ? [{ ...row }] : [] };
      }
      // ORDER BY updated_at DESC (list-all query)
      const rows = [...this.pages]
        .sort((a, b) => (b.updated_at as string).localeCompare(a.updated_at as string))
        .map((r) => ({ ...r }));
      return { first: rows[0] ?? null, all: rows };
    }
    if (q.startsWith("INSERT INTO pages")) {
      const [
        title,
        slug,
        description,
        content,
        status,
        is_indexable,
        meta_title,
        meta_description,
        canonical_url,
        created_at,
        updated_at,
        created_by,
        updated_by,
      ] = v;
      this.pages.push({
        id: this.nextPageId++,
        title,
        slug,
        description,
        content,
        status,
        is_indexable,
        meta_title,
        meta_description,
        canonical_url,
        created_at,
        updated_at,
        created_by,
        updated_by,
      });
      return { first: null, all: [] };
    }
    if (q.startsWith("UPDATE pages SET title")) {
      const [
        title,
        slug,
        description,
        content,
        status,
        is_indexable,
        meta_title,
        meta_description,
        canonical_url,
        updated_at,
        updated_by,
        id,
      ] = v;
      const row = this.pages.find((p) => p.id === id);
      if (row) {
        Object.assign(row, {
          title,
          slug,
          description,
          content,
          status,
          is_indexable,
          meta_title,
          meta_description,
          canonical_url,
          updated_at,
          updated_by,
        });
      }
      return { first: null, all: [] };
    }
    if (q.startsWith("DELETE FROM pages")) {
      const [id] = v;
      this.pages = this.pages.filter((p) => p.id !== id);
      return { first: null, all: [] };
    }
    if (q.startsWith("SELECT id, slug, name FROM categories")) {
      if (q.includes("WHERE slug = ?")) {
        const row = this.categories.find((c) => c.slug === v[0]) ?? null;
        return { first: row ? { ...row } : null, all: row ? [{ ...row }] : [] };
      }
      if (q.includes("WHERE id = ?")) {
        const row = this.categories.find((c) => c.id === v[0]) ?? null;
        return { first: row ? { ...row } : null, all: row ? [{ ...row }] : [] };
      }
      const rows = this.categories.map((c) => ({ ...c }));
      return { first: rows[0] ?? null, all: rows };
    }
    if (q.startsWith("SELECT id, category_id, name, slug, description, component, status, featured, is_popular, icon, sort_order, seo_title, seo_description, created_at, updated_at, created_by, updated_by FROM tools")) {
      if (q.includes("WHERE id = ?")) {
        const row = this.tools.find((t) => t.id === v[0]) ?? null;
        return { first: row ? { ...row } : null, all: row ? [{ ...row }] : [] };
      }
      if (q.includes("WHERE slug = ?")) {
        const row = this.tools.find((t) => t.slug === v[0]) ?? null;
        return { first: row ? { ...row } : null, all: row ? [{ ...row }] : [] };
      }
      // ORDER BY category_id ASC, sort_order ASC (list-all query)
      const rows = [...this.tools]
        .sort((a, b) => {
          const catDiff = (a.category_id as number) - (b.category_id as number);
          return catDiff !== 0 ? catDiff : (a.sort_order as number) - (b.sort_order as number);
        })
        .map((t) => ({ ...t }));
      return { first: rows[0] ?? null, all: rows };
    }
    if (q.startsWith("INSERT INTO tools")) {
      const [
        category_id,
        name,
        slug,
        description,
        status,
        featured,
        is_popular,
        icon,
        sort_order,
        seo_title,
        seo_description,
        created_at,
        updated_at,
        created_by,
        updated_by,
      ] = v;
      this.tools.push({
        id: this.nextToolId++,
        category_id,
        name,
        slug,
        description,
        component: "ToolPage",
        status,
        featured,
        is_popular,
        icon,
        sort_order,
        seo_title,
        seo_description,
        created_at,
        updated_at,
        created_by,
        updated_by,
      });
      return { first: null, all: [] };
    }
    if (q.startsWith("UPDATE tools SET name")) {
      const [
        name,
        slug,
        description,
        category_id,
        status,
        featured,
        is_popular,
        icon,
        sort_order,
        seo_title,
        seo_description,
        updated_at,
        updated_by,
        id,
      ] = v;
      const row = this.tools.find((t) => t.id === id);
      if (row) {
        Object.assign(row, {
          name,
          slug,
          description,
          category_id,
          status,
          featured,
          is_popular,
          icon,
          sort_order,
          seo_title,
          seo_description,
          updated_at,
          updated_by,
        });
      }
      return { first: null, all: [] };
    }
    if (q.startsWith("DELETE FROM tools")) {
      const [id] = v;
      this.tools = this.tools.filter((t) => t.id !== id);
      return { first: null, all: [] };
    }
    if (q.startsWith("SELECT id FROM tools WHERE slug = ?")) {
      const row = this.tools.find((t) => t.slug === v[0]) ?? null;
      return { first: row ? { id: row.id } : null, all: row ? [{ id: row.id }] : [] };
    }
    if (q.startsWith("SELECT id, scope, tool_slug, language, question, answer, status, sort_order, created_at, updated_at, created_by, updated_by FROM site_faqs")) {
      if (q.includes("WHERE id = ?")) {
        const row = this.siteFaqs.find((f) => f.id === v[0]) ?? null;
        return { first: row ? { ...row } : null, all: row ? [{ ...row }] : [] };
      }
      // ORDER BY scope ASC, language ASC, sort_order ASC (admin list-all query)
      const rows = [...this.siteFaqs]
        .sort((a, b) => {
          const scopeDiff = (a.scope as string).localeCompare(b.scope as string);
          if (scopeDiff !== 0) return scopeDiff;
          const langDiff = (a.language as string).localeCompare(b.language as string);
          if (langDiff !== 0) return langDiff;
          return (a.sort_order as number) - (b.sort_order as number);
        })
        .map((f) => ({ ...f }));
      return { first: rows[0] ?? null, all: rows };
    }
    if (q.startsWith("SELECT question, answer FROM site_faqs")) {
      const [language] = v as [string];
      const rows = this.siteFaqs
        .filter((f) => f.scope === "global" && f.status === "active" && f.language === language)
        .sort((a, b) => {
          const orderDiff = (a.sort_order as number) - (b.sort_order as number);
          return orderDiff !== 0 ? orderDiff : (a.id as number) - (b.id as number);
        })
        .map((f) => ({ question: f.question, answer: f.answer }));
      return { first: rows[0] ?? null, all: rows };
    }
    if (q.startsWith("INSERT INTO site_faqs")) {
      const [scope, tool_slug, language, question, answer, status, sort_order, created_at, updated_at, created_by, updated_by] = v;
      const id = this.nextFaqId++;
      this.siteFaqs.push({
        id,
        scope,
        tool_slug,
        language,
        question,
        answer,
        status,
        sort_order,
        created_at,
        updated_at,
        created_by,
        updated_by,
      });
      return { first: null, all: [], lastRowId: id };
    }
    if (q.startsWith("UPDATE site_faqs SET scope")) {
      const [scope, tool_slug, language, question, answer, status, sort_order, updated_at, updated_by, id] = v;
      const row = this.siteFaqs.find((f) => f.id === id);
      if (row) {
        Object.assign(row, { scope, tool_slug, language, question, answer, status, sort_order, updated_at, updated_by });
      }
      return { first: null, all: [] };
    }
    if (q.startsWith("DELETE FROM site_faqs")) {
      const [id] = v;
      this.siteFaqs = this.siteFaqs.filter((f) => f.id !== id);
      return { first: null, all: [] };
    }
    throw new Error(`FakeD1: unhandled query: ${q}`);
  }
}

export function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: new FakeD1(),
    ASSETS: { fetch: async () => new Response("") },
    ...overrides,
  };
}

export function extractCookieValue(response: Response): string {
  const setCookie = response.headers.get("Set-Cookie") ?? "";
  return setCookie.split(";")[0] ?? "";
}
