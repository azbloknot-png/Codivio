import { describe, expect, it } from "vitest";
import {
  handleCreateBlogPost,
  handleDeleteBlogPost,
  handleGetBlogPost,
  handleListBlogCategories,
  handleListBlogPosts,
  handleUpdateBlogPost,
} from "../worker/blog";
import { validateBlogPostInput } from "../shared/blog";
import { hashPassword, hashToken } from "../worker/auth";
import { FakeD1, makeEnv } from "./helpers/fake-d1";

/**
 * Phase 8.2 — Admin Blog CRUD tests.
 *
 * Mirrors tests/ad-slots.test.ts's exact structure/coverage shape: shared
 * validation (fail-closed), RBAC authorization (view/manage/unauthenticated/
 * editor-can-manage since Blog follows the content-module admin+editor
 * pattern, analyst-forbidden), mass-assignment protection, audit logging,
 * delete-safety (blocked while published), actor-identity integrity, and a
 * static parameterized-SQL check. No test is fabricated beyond what this
 * sub-phase's own CRUD requires to prove.
 */

async function seedUser(env: ReturnType<typeof makeEnv>, role: string) {
  const fake = env.DB as FakeD1;
  const passwordHash = await hashPassword("correct-password");
  fake.users.push({ id: 1, email: "user@codivio.online", password_hash: passwordHash, role, status: "active" });
  const token = "test-token";
  const tokenHash = await hashToken(token);
  fake.sessions.push({ id: tokenHash, user_id: 1, expires_at: new Date(Date.now() + 3_600_000).toISOString() });
  return token;
}

function withCookie(path: string, token?: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...(token ? { Cookie: `codivio_session=${token}` } : {}) },
  });
}

function listBlogPosts(env: ReturnType<typeof makeEnv>, token?: string): Promise<Response> {
  return handleListBlogPosts(withCookie("/api/admin/blog-posts", token), env);
}

function getBlogPost(env: ReturnType<typeof makeEnv>, token: string, id: number): Promise<Response> {
  return handleGetBlogPost(withCookie(`/api/admin/blog-posts/${id}`, token), env, String(id));
}

function createBlogPost(env: ReturnType<typeof makeEnv>, token: string, body: unknown, extraHeaders: Record<string, string> = {}): Promise<Response> {
  return handleCreateBlogPost(
    withCookie("/api/admin/blog-posts", token, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    }),
    env
  );
}

function updateBlogPost(
  env: ReturnType<typeof makeEnv>,
  token: string,
  id: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<Response> {
  return handleUpdateBlogPost(
    withCookie(`/api/admin/blog-posts/${id}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    }),
    env,
    String(id)
  );
}

function deleteBlogPost(env: ReturnType<typeof makeEnv>, token: string, id: number): Promise<Response> {
  return handleDeleteBlogPost(withCookie(`/api/admin/blog-posts/${id}`, token, { method: "DELETE" }), env, String(id));
}

const VALID_POST = { title: "How to make a QR code", slug: "how-to-make-a-qr-code" };

// --- 1: shared validation (fail-closed) -------------------------------------

describe("validateBlogPostInput (shared validation)", () => {
  it("accepts a minimal valid input and applies documented defaults", () => {
    const result = validateBlogPostInput({ title: "Test Post", slug: "test-post" });
    expect(result).toEqual({
      ok: true,
      value: {
        title: "Test Post",
        slug: "test-post",
        excerpt: "",
        content: "",
        status: "draft",
        scheduledAt: null,
        categoryId: null,
        featuredImage: "",
        seoTitle: "",
        seoDescription: "",
        canonicalUrl: "",
        ogImage: "",
        tagNames: [],
        relatedToolSlugs: [],
      },
    });
  });

  it("rejects a missing title", () => {
    expect(validateBlogPostInput({ slug: "test-post" }).ok).toBe(false);
  });

  it("rejects an invalid slug format", () => {
    expect(validateBlogPostInput({ title: "X", slug: "Not A Slug!" }).ok).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(validateBlogPostInput({ title: "X", slug: "x", status: "archived" }).ok).toBe(false);
  });

  it("requires scheduledAt when status is 'scheduled'", () => {
    expect(validateBlogPostInput({ title: "X", slug: "x", status: "scheduled" }).ok).toBe(false);
    expect(
      validateBlogPostInput({ title: "X", slug: "x", status: "scheduled", scheduledAt: "2026-01-01T00:00:00Z" }).ok
    ).toBe(true);
  });

  it("rejects an invalid scheduledAt date string", () => {
    expect(
      validateBlogPostInput({ title: "X", slug: "x", status: "scheduled", scheduledAt: "not-a-date" }).ok
    ).toBe(false);
  });

  it("rejects a non-positive categoryId", () => {
    expect(validateBlogPostInput({ title: "X", slug: "x", categoryId: 0 }).ok).toBe(false);
    expect(validateBlogPostInput({ title: "X", slug: "x", categoryId: -1 }).ok).toBe(false);
  });

  it("rejects a canonical URL that isn't a valid absolute http(s) URL", () => {
    expect(validateBlogPostInput({ title: "X", slug: "x", canonicalUrl: "not a url" }).ok).toBe(false);
  });

  it("does not angle-bracket-filter content/excerpt (real body text may legitimately discuss markup)", () => {
    const result = validateBlogPostInput({ title: "X", slug: "x", content: "Use <strong>this</strong> tag." });
    expect(result.ok).toBe(true);
  });

  it("does angle-bracket-filter short label fields like title/seoTitle", () => {
    expect(validateBlogPostInput({ title: "<script>", slug: "x" }).ok).toBe(false);
  });
});

// --- 2/3/4: authenticated/unauthenticated/unauthorized read -----------------

describe("GET /api/admin/blog-posts authorization", () => {
  it("returns the blog post list for a role with blog.view", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor"); // editor has both blog.view and blog.manage
    const response = await listBlogPosts(env, token);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.blogPosts).toEqual([]);
  });

  it("returns 401 for no session at all", async () => {
    const env = makeEnv();
    const response = await listBlogPosts(env);
    expect(response.status).toBe(401);
  });

  it("returns 403 for an authenticated role without blog.view (analyst)", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst");
    const response = await listBlogPosts(env, token);
    expect(response.status).toBe(403);
  });
});

// --- 5/6/7: authorized create/update, editor CAN manage, analyst cannot -----

describe("POST/PATCH /api/admin/blog-posts authorization", () => {
  it("creates a blog post for a role with blog.manage (admin)", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const response = await createBlogPost(env, token, VALID_POST);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.blogPost.slug).toBe("how-to-make-a-qr-code");
    expect(body.blogPost.status).toBe("draft");
  });

  it("creates a blog post for editor too — Blog follows the pages/tools/faq/seo admin+editor pattern, not the advertising admin-only exception", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "editor");
    const response = await createBlogPost(env, token, VALID_POST);
    expect(response.status).toBe(201);
  });

  it("updates a blog post for a role with blog.manage", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const created = await (await createBlogPost(env, token, VALID_POST)).json();
    const response = await updateBlogPost(env, token, created.blogPost.id, { title: "Renamed title" });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.blogPost.title).toBe("Renamed title");
  });

  it("returns 403 for analyst (lacks blog.view and blog.manage)", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst");
    const response = await createBlogPost(env, token, VALID_POST);
    expect(response.status).toBe(403);
  });
});

// --- 8: validation failure surfaces as 400 -----------------------------------

describe("blog post write validation (fail closed)", () => {
  it("rejects an invalid slug at the API layer", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const response = await createBlogPost(env, token, { title: "X", slug: "Not Valid!" });
    expect(response.status).toBe(400);
  });

  it("rejects a categoryId that does not reference a real blog_categories row", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const response = await createBlogPost(env, token, { ...VALID_POST, categoryId: 999 });
    expect(response.status).toBe(400);
  });
});

// --- 9: mass-assignment protection -------------------------------------------

describe("mass-assignment protection", () => {
  it("ignores id/createdAt/authorId fields forged in the request body", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const response = await createBlogPost(env, token, { ...VALID_POST, id: 9999, createdAt: "2000-01-01", authorId: 999 });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.blogPost.id).toBe(1); // server-assigned, not the forged 9999
    expect(body.blogPost.authorId).toBe(1); // the real session user, not the forged 999
  });
});

// --- 10: delete safety + audit logging ---------------------------------------

describe("blog post mutations are audited", () => {
  it("logs BLOG_POST_CREATED, then BLOG_POST_PUBLISHED on a draft->published transition, then BLOG_POST_DELETED", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const fake = env.DB as FakeD1;

    const created = await (await createBlogPost(env, token, VALID_POST)).json();
    expect(fake.auditLogs.some((e) => e.action === "BLOG_POST_CREATED" && e.entity_id === created.blogPost.id)).toBe(true);

    await updateBlogPost(env, token, created.blogPost.id, { status: "published" });
    expect(fake.auditLogs.some((e) => e.action === "BLOG_POST_PUBLISHED")).toBe(true);

    await updateBlogPost(env, token, created.blogPost.id, { status: "draft" });
    const deleteResult = await deleteBlogPost(env, token, created.blogPost.id);
    expect(deleteResult.status).toBe(200);
    expect(fake.auditLogs.some((e) => e.action === "BLOG_POST_DELETED")).toBe(true);
  });

  it("blocks deleting a published blog post until it is unpublished first", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const created = await (await createBlogPost(env, token, VALID_POST)).json();
    await updateBlogPost(env, token, created.blogPost.id, { status: "published" });
    const response = await deleteBlogPost(env, token, created.blogPost.id);
    expect(response.status).toBe(409);
  });

  it("sets published_at the first time a post becomes published, and preserves it on later edits", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const created = await (await createBlogPost(env, token, VALID_POST)).json();
    expect(created.blogPost.publishedAt).toBeNull();

    const published = await (await updateBlogPost(env, token, created.blogPost.id, { status: "published" })).json();
    expect(published.blogPost.publishedAt).not.toBeNull();
    const firstPublishedAt = published.blogPost.publishedAt;

    const edited = await (await updateBlogPost(env, token, created.blogPost.id, { title: "Edited after publish" })).json();
    expect(edited.blogPost.publishedAt).toBe(firstPublishedAt);
  });
});

// --- 11: actor identity cannot be forged -------------------------------------

describe("actor identity cannot be forged", () => {
  it("records the real session user in the audit log, never a forged X-User-Id", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const fake = env.DB as FakeD1;
    const created = await (await createBlogPost(env, token, VALID_POST)).json();

    await updateBlogPost(env, token, created.blogPost.id, { title: "Renamed" }, { "X-User-Id": "999" });

    const entry = fake.auditLogs.find((e) => e.action === "BLOG_POST_UPDATED");
    expect(entry?.user_id).toBe(1);
    expect(entry?.actor_email).toBe("user@codivio.online");
  });
});

// --- 12: single-record GET works (unlike ad-slots, Blog needs an edit-by-id load) --

describe("GET /api/admin/blog-posts/:id", () => {
  it("retrieves a single post for editing", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const created = await (await createBlogPost(env, token, VALID_POST)).json();
    const response = await getBlogPost(env, token, created.blogPost.id);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.blogPost.slug).toBe("how-to-make-a-qr-code");
  });

  it("returns 404 for a nonexistent id", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const response = await getBlogPost(env, token, 999);
    expect(response.status).toBe(404);
  });
});

// --- 12b: category / tag / related-tool persistence --------------------------

describe("category / tag / related-tool persistence", () => {
  it("rejects a categoryId with no matching blog_categories row, as already covered above — this test instead proves a VALID category round-trips", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const fake = env.DB as FakeD1;
    fake.blogCategories.push({ id: 1, name: "QR Codes", slug: "qr-codes" });

    const created = await (await createBlogPost(env, token, { ...VALID_POST, categoryId: 1 })).json();
    expect(created.blogPost.categoryId).toBe(1);
    expect(created.blogPost.categoryName).toBe("QR Codes");
  });

  it("find-or-creates tags by name and reuses an existing tag across two posts instead of duplicating it", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const fake = env.DB as FakeD1;

    const first = await (await createBlogPost(env, token, { ...VALID_POST, tagNames: ["Security", "privacy"] })).json();
    expect(first.blogPost.tagNames.sort()).toEqual(["Security", "privacy"].sort());
    expect(fake.blogTags.length).toBe(2);

    const second = await (
      await createBlogPost(env, token, { title: "Second post", slug: "second-post", tagNames: ["security"] })
    ).json();
    // "security" (lowercase) slugifies to the same tag as "Security" — reused, not duplicated.
    expect(fake.blogTags.length).toBe(2);
    expect(second.blogPost.tagNames).toEqual(["Security"]);
  });

  it("links a post to a real, existing tool by slug and rejects an unknown tool slug", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const fake = env.DB as FakeD1;
    fake.tools.push({ id: 1, slug: "qr-code-generator" });

    const ok = await createBlogPost(env, token, { ...VALID_POST, relatedToolSlugs: ["qr-code-generator"] });
    expect(ok.status).toBe(201);
    const okBody = await ok.json();
    expect(okBody.blogPost.relatedToolSlugs).toEqual(["qr-code-generator"]);

    const bad = await createBlogPost(env, token, {
      title: "Bad tool link",
      slug: "bad-tool-link",
      relatedToolSlugs: ["not-a-real-tool"],
    });
    expect(bad.status).toBe(400);
  });

  it("replaces (not accumulates) tags and related tools on update", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const fake = env.DB as FakeD1;
    fake.tools.push({ id: 1, slug: "qr-code-generator" }, { id: 2, slug: "pdf-merge" });

    const created = await (
      await createBlogPost(env, token, { ...VALID_POST, tagNames: ["one"], relatedToolSlugs: ["qr-code-generator"] })
    ).json();

    const updated = await (
      await updateBlogPost(env, token, created.blogPost.id, { tagNames: ["two"], relatedToolSlugs: ["pdf-merge"] })
    ).json();
    expect(updated.blogPost.tagNames).toEqual(["two"]);
    expect(updated.blogPost.relatedToolSlugs).toEqual(["pdf-merge"]);
    expect(fake.blogPostTags.length).toBe(1);
    expect(fake.blogPostRelatedTools.length).toBe(1);
  });

  it("preserves tags/related tools on an update that doesn't mention them", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "admin");
    const fake = env.DB as FakeD1;
    fake.tools.push({ id: 1, slug: "qr-code-generator" });

    const created = await (
      await createBlogPost(env, token, { ...VALID_POST, tagNames: ["kept"], relatedToolSlugs: ["qr-code-generator"] })
    ).json();

    const updated = await (await updateBlogPost(env, token, created.blogPost.id, { title: "Renamed only" })).json();
    expect(updated.blogPost.tagNames).toEqual(["kept"]);
    expect(updated.blogPost.relatedToolSlugs).toEqual(["qr-code-generator"]);
  });
});

// --- 12c: GET /api/admin/blog-categories --------------------------------------

describe("GET /api/admin/blog-categories", () => {
  it("lists existing categories for a role with blog.view", async () => {
    const env = makeEnv();
    const fake = env.DB as FakeD1;
    fake.blogCategories.push({ id: 1, name: "QR Codes", slug: "qr-codes" });
    const token = await seedUser(env, "editor");

    const response = await handleListBlogCategories(withCookie("/api/admin/blog-categories", token), env);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.blogCategories).toEqual([{ id: 1, name: "QR Codes", slug: "qr-codes" }]);
  });

  it("is forbidden for analyst (lacks blog.view)", async () => {
    const env = makeEnv();
    const token = await seedUser(env, "analyst");
    const denied = await handleListBlogCategories(withCookie("/api/admin/blog-categories", token), env);
    expect(denied.status).toBe(403);
  });
});

// --- 13: parameterized SQL (static check) ------------------------------------

describe("blog writer uses parameterized SQL", () => {
  it("worker/blog.ts never string-interpolates a value into a SQL string", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync(new URL("../worker/blog.ts", import.meta.url), "utf8");
    const sanitized = source.replace(/\$\{BLOG_POST_COLUMNS\}/g, "BLOG_POST_COLUMNS_LITERAL");
    expect(/prepare\(\s*`[^`]*\$\{/.test(sanitized)).toBe(false);
    expect(source).toContain(".bind(");
  });

  it("never reads, writes, or serializes the retired category/author_name columns", async () => {
    const fs = await import("node:fs");
    const workerSource = fs.readFileSync(new URL("../worker/blog.ts", import.meta.url), "utf8");
    // Checked against the exact SQL the Worker actually sends (the column
    // list constant plus the literal INSERT/UPDATE statements), not the
    // whole file — a whole-file bare-word match would also flag legitimate,
    // unrelated uses of "category" (a local variable holding the resolved
    // blog_categories row, or the human-readable "This category does not
    // exist" message), neither of which touches the retired column.
    const columnsLine = workerSource.match(/const BLOG_POST_COLUMNS =[\s\S]*?;/)?.[0] ?? "";
    const insertStatement = workerSource.match(/INSERT INTO blog_posts[\s\S]*?VALUES[^)]*\)/)?.[0] ?? "";
    const updateStatement = workerSource.match(/UPDATE blog_posts[\s\S]*?WHERE id = \?/)?.[0] ?? "";
    expect(columnsLine).not.toBe("");
    expect(insertStatement).not.toBe("");
    expect(updateStatement).not.toBe("");
    for (const sql of [columnsLine, insertStatement, updateStatement]) {
      expect(sql).not.toMatch(/\bauthor_name\b/);
      expect(sql).not.toMatch(/(?<!_)\bcategory\b(?!_id)/);
    }
  });
});
