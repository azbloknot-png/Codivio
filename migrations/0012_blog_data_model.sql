-- Migration 0012 (Phase 8.1 -- Blog Data Model).
--
-- Extends the existing, previously-inert `blog_posts` table (defined since
-- migration 0001; confirmed via a project-wide grep before writing this
-- migration that no Worker code or test has ever read or written it) with
-- the fields CLAUDE.md §15 requires for a real Blog CMS: author
-- attribution, dedicated SEO metadata, and a genuine scheduled state
-- distinct from `published_at`. Also adds four new, normalized tables, per
-- the explicit Phase 8.1 Stage 1 decisions:
--   - one category per post (not many-to-many) -- a single `category_id`
--     FK on `blog_posts`, mirroring the exact shape of `tools.category_id`
--     -> `categories(id)`, but pointing at a separate `blog_categories`
--     table (blog topics and tool categories are related concepts, not
--     identical taxonomies -- no evidence supports merging them);
--   - normalized many-to-many tags (`blog_tags` + `blog_post_tags`);
--   - normalized many-to-many related tools (`blog_post_related_tools`),
--     reusing the real Tool Registry (`tools(id)`) directly -- never
--     duplicating a tool's name/description into Blog data, consistent
--     with shared/seo/internal-links.ts's existing reuse-not-duplicate
--     principle;
--   - single-language blog posts for now -- no language column is added,
--     mirroring the existing table's own single-language shape; revisit
--     only if a future phase makes a real per-language content decision.
--
-- `category` TEXT and `author_name` TEXT are retired IN PLACE, not
-- dropped -- mirrors migration 0011's own DROP-COLUMN-avoidance precedent
-- (D1/SQLite `ALTER TABLE ... DROP COLUMN` support remains UNKNOWN -- NOT
-- VERIFIED in this environment, no live D1 instance was available to test
-- it during this phase's Stage 1 audit). Both columns keep their existing
-- defaults but are superseded by `category_id` (a real FK) and `author_id`
-- (a real `users(id)` FK) respectively. No future Worker code should read
-- or write the two retired columns -- this will be enforced the same way
-- Phase 7.4 enforced `ad_slots.code`'s retirement: by never referencing it
-- in `shared/blog.ts`/`worker/blog.ts` once those are built (Phase 8.2),
-- and by a static source-scan test asserting that.
--
-- Column/table order: the two new lookup tables (`blog_categories`,
-- `blog_tags`) are created BEFORE the `ALTER TABLE blog_posts ADD COLUMN
-- category_id ...` statement that references `blog_categories(id)`, and
-- the two join tables are created AFTER `blog_posts`/`blog_tags`/`tools`
-- all already exist, so every REFERENCES clause always points at an
-- already-defined table.
--
-- Indexes are added only for query patterns Phase 8.5 (Blog Listing +
-- Post Pages) will genuinely need -- no speculative composite index:
--   - `idx_blog_posts_category_id` / `idx_blog_posts_author_id` -- future
--     Admin list filters and public "posts in this category" pages.
--   - `idx_blog_posts_status_published_at` -- the real "list published
--     posts, newest first" query every blog index page needs.
--   - `idx_blog_post_tags_tag_id` / `idx_blog_post_related_tools_tool_id`
--     -- reverse lookups ("posts with this tag" / "posts linking to this
--     tool"), mirroring `idx_ad_slots_position`'s own reverse-lookup
--     justification from migration 0011.

CREATE TABLE IF NOT EXISTS blog_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS blog_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

ALTER TABLE blog_posts ADD COLUMN category_id INTEGER REFERENCES blog_categories(id);
ALTER TABLE blog_posts ADD COLUMN author_id INTEGER REFERENCES users(id);
ALTER TABLE blog_posts ADD COLUMN scheduled_at TEXT;
ALTER TABLE blog_posts ADD COLUMN seo_title TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN seo_description TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN canonical_url TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN og_image TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_posts ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE blog_posts ADD COLUMN updated_by INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES blog_tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS blog_post_related_tools (
  post_id INTEGER NOT NULL,
  tool_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, tool_id),
  FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at ON blog_posts(status, published_at);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag_id ON blog_post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_related_tools_tool_id ON blog_post_related_tools(tool_id);
