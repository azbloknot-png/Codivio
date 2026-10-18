import { describe, expect, it } from "vitest";
import { handlePublicBlogPost, handlePublicBlogPosts } from "../worker/blog";
import { FakeD1, makeEnv } from "./helpers/fake-d1";

/**
 * Phase 8.5 — Public Blog, Post Pages, and Blog Navigation.
 *
 * Covers exactly the privacy boundary this sub-phase's acceptance criteria
 * require: draft/scheduled posts are never exposed, an unpublished slug's
 * 404 is indistinguishable from a nonexistent one, the list never leaks
 * `content`/author fields, and neither endpoint requires authentication
 * (they are genuinely public, unlike every /api/admin/blog-* route).
 */

function seedPost(env: ReturnType<typeof makeEnv>, overrides: Partial<Record<string, unknown>> = {}) {
  const fake = env.DB as FakeD1;
  const id = fake.blogPosts.length + 1;
  fake.blogPosts.push({
    id,
    title: `Post ${id}`,
    slug: `post-${id}`,
    excerpt: "An excerpt",
    content: "# Heading\n\nSome **markdown** body.",
    featured_image: "",
    status: "published",
    published_at: "2026-10-01T00:00:00.000Z",
    created_at: "2026-09-30T00:00:00.000Z",
    updated_at: "2026-09-30T00:00:00.000Z",
    category_id: null,
    author_id: 1,
    scheduled_at: null,
    seo_title: "SEO title",
    seo_description: "SEO description",
    canonical_url: "",
    og_image: "",
    created_by: 1,
    updated_by: 1,
    ...overrides,
  });
  return id;
}

function listPublicPosts(env: ReturnType<typeof makeEnv>): Promise<Response> {
  return handlePublicBlogPosts(new Request("http://localhost/api/blog-posts"), env);
}

function getPublicPost(env: ReturnType<typeof makeEnv>, slug: string): Promise<Response> {
  return handlePublicBlogPost(new Request(`http://localhost/api/blog-posts/${slug}`), env, slug);
}

describe("GET /api/blog-posts (public list)", () => {
  it("requires no authentication at all", async () => {
    const env = makeEnv();
    seedPost(env, { slug: "no-auth-needed" });
    const response = await listPublicPosts(env);
    expect(response.status).toBe(200);
  });

  it("returns only published posts, never draft or scheduled", async () => {
    const env = makeEnv();
    seedPost(env, { slug: "a-published", status: "published" });
    seedPost(env, { slug: "b-draft", status: "draft", published_at: null });
    seedPost(env, { slug: "c-scheduled", status: "scheduled", published_at: null, scheduled_at: "2099-01-01T00:00:00.000Z" });

    const response = await listPublicPosts(env);
    const data = (await response.json()) as { blogPosts: Array<{ slug: string }> };

    expect(data.blogPosts.map((p) => p.slug)).toEqual(["a-published"]);
  });

  it("orders by publishedAt, newest first", async () => {
    const env = makeEnv();
    seedPost(env, { slug: "older", published_at: "2026-01-01T00:00:00.000Z" });
    seedPost(env, { slug: "newer", published_at: "2026-06-01T00:00:00.000Z" });

    const response = await listPublicPosts(env);
    const data = (await response.json()) as { blogPosts: Array<{ slug: string }> };

    expect(data.blogPosts.map((p) => p.slug)).toEqual(["newer", "older"]);
  });

  it("returns an empty array, never a fabricated post, when nothing is published", async () => {
    const env = makeEnv();
    const response = await listPublicPosts(env);
    const data = (await response.json()) as { blogPosts: unknown[] };
    expect(data.blogPosts).toEqual([]);
  });

  it("never includes `content`, author, tag, or related-tool fields in the list", async () => {
    const env = makeEnv();
    seedPost(env, { slug: "summary-only" });

    const response = await listPublicPosts(env);
    const data = (await response.json()) as { blogPosts: Array<Record<string, unknown>> };

    const keys = Object.keys(data.blogPosts[0]);
    expect(keys).toEqual(["title", "slug", "excerpt", "featuredImage", "publishedAt", "categoryName"]);
    expect(keys).not.toContain("content");
    expect(keys).not.toContain("authorId");
    expect(keys).not.toContain("createdBy");
    expect(keys).not.toContain("updatedBy");
  });

  it("resolves a real category name from category_id, never fabricates one", async () => {
    const env = makeEnv();
    (env.DB as FakeD1).blogCategories.push({ id: 7, name: "QR Codes", slug: "qr-codes" });
    seedPost(env, { slug: "categorized", category_id: 7 });
    seedPost(env, { slug: "uncategorized", category_id: null });

    const response = await listPublicPosts(env);
    const data = (await response.json()) as { blogPosts: Array<{ slug: string; categoryName: string | null }> };

    expect(data.blogPosts.find((p) => p.slug === "categorized")?.categoryName).toBe("QR Codes");
    expect(data.blogPosts.find((p) => p.slug === "uncategorized")?.categoryName).toBeNull();
  });
});

describe("GET /api/blog-posts/:slug (public single article)", () => {
  it("requires no authentication and returns the full article for a published post", async () => {
    const env = makeEnv();
    seedPost(env, { slug: "real-article", content: "# Hello\n\nBody text." });

    const response = await getPublicPost(env, "real-article");
    expect(response.status).toBe(200);
    const data = (await response.json()) as { blogPost: Record<string, unknown> };
    expect(data.blogPost.content).toBe("# Hello\n\nBody text.");
    expect(data.blogPost.seoTitle).toBe("SEO title");
  });

  it("never includes author/created-by/updated-by/tag/related-tool fields", async () => {
    const env = makeEnv();
    seedPost(env, { slug: "no-author-leak" });

    const response = await getPublicPost(env, "no-author-leak");
    const data = (await response.json()) as { blogPost: Record<string, unknown> };

    const keys = Object.keys(data.blogPost);
    expect(keys).not.toContain("authorId");
    expect(keys).not.toContain("createdBy");
    expect(keys).not.toContain("updatedBy");
    expect(keys).not.toContain("tagNames");
    expect(keys).not.toContain("relatedToolSlugs");
  });

  it("returns 404 (not the draft content) for a draft post's real slug", async () => {
    const env = makeEnv();
    seedPost(env, { slug: "secret-draft", status: "draft", published_at: null, content: "SHOULD NEVER BE EXPOSED" });

    const response = await getPublicPost(env, "secret-draft");
    expect(response.status).toBe(404);
    const body = await response.text();
    expect(body).not.toContain("SHOULD NEVER BE EXPOSED");
  });

  it("returns 404 for a scheduled-but-not-yet-published post's real slug", async () => {
    const env = makeEnv();
    seedPost(env, {
      slug: "future-post",
      status: "scheduled",
      published_at: null,
      scheduled_at: "2099-01-01T00:00:00.000Z",
      content: "SHOULD NEVER BE EXPOSED EARLY",
    });

    const response = await getPublicPost(env, "future-post");
    expect(response.status).toBe(404);
  });

  it("returns an identical 404 for a genuinely nonexistent slug as for an unpublished one (no disclosure via status code or body)", async () => {
    const env = makeEnv();
    seedPost(env, { slug: "draft-exists", status: "draft", published_at: null });

    const [unpublishedResponse, nonexistentResponse] = await Promise.all([
      getPublicPost(env, "draft-exists"),
      getPublicPost(env, "this-slug-was-never-created"),
    ]);

    expect(unpublishedResponse.status).toBe(nonexistentResponse.status);
    expect(await unpublishedResponse.text()).toBe(await nonexistentResponse.text());
  });
});
