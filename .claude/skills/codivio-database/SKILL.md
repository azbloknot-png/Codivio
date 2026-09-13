---
name: codivio-database
description: Summarizes Codivio's D1 schema, migration convention, and binding status so database-related tasks don't require a full read of database/schema.sql. Use before writing D1 queries, a new migration, or Worker code touching env.DB. Do not use for frontend-only tasks that never touch the database.
---

# Codivio Database

Operational summary only — CLAUDE.md §9 (Database: parameterized queries, least-privilege, schema constraints, indexes, migration discipline, backup/restore) states the *rules*; this skill states *what already exists* so it doesn't need re-reading in full each time.

## Current tables (see `database/schema.sql` for exact DDL — don't copy it here, grep it)

| Table | Purpose |
|---|---|
| `categories` | Tool categories (QR/PDF/Image/Other) |
| `tools` | Tool registry: name, slug, category_id, status, featured, sort_order — mirrors the frontend `Tool` type in `src/App.tsx` |
| `pages` | CMS-style pages, one optionally per tool |
| `seo_settings` | Per-page SEO fields (meta title/description, canonical, OG, schema_json) |
| `ad_slots` | Ad placement config (position, device, dimensions, priority) |
| `faqs` | Per-page FAQ entries |
| `blog_posts` | Blog content with draft/published/scheduled-style status |
| `analytics_events` | Event log (event_name, tool_id, country, device, referrer) |
| `users` | Admin users; `role` is a plain TEXT column today, not a separate RBAC table |
| `audit_logs` | Sensitive-action log, keyed to `users` |

Not yet in the schema (deliberately deferred, see `codivio-admin` for when): `sessions`, `settings`, dedicated `roles`/`permissions` tables.

## D1 binding status (as of Checkpoint 2.2)

- Binding name: `DB` (declared in `worker/index.ts`'s `Env` interface, wired in `wrangler.jsonc`).
- `wrangler.jsonc`'s `database_id` is a **placeholder** (`REPLACE_WITH_REAL_D1_DATABASE_ID`) — a real one requires `wrangler d1 create`, which needs Cloudflare account access not available in this environment. Local `wrangler dev` resolves the binding in local mode without it; `--remote` dev or a real deploy needs the real ID first. Don't fabricate one.
- Assets binding: `ASSETS` (serves the existing SPA; the Worker falls through to it for everything except `/api/*`).

## Migration convention

- Migrations live in `migrations/` (wrangler's own default `migrations_dir` — confirmed by inspecting the plugin's generated config; no explicit `migrations_dir` override was needed).
- Naming: `NNNN_description.sql` (wrangler's own convention for `wrangler d1 migrations create`).
- `migrations/0001_init_schema.sql` currently **duplicates** `database/schema.sql`'s content (a deliberate, minimal choice at Checkpoint 2.2 to avoid moving/deleting the original reference file). Not yet consolidated — flag this if asked to touch either file.
- No migration has been applied against any real or local D1 instance yet — only the file structure exists.

## Non-negotiable query rule

Every D1 query uses `.bind()` parameterization — e.g. `env.DB.prepare("SELECT * FROM tools WHERE slug = ?").bind(slug)`. Never string-concatenate user input into SQL. This is CLAUDE.md §9's SQL-injection rule made concrete for D1's API shape.

## Migration safety workflow

1. Write the new `.sql` file under `migrations/` with the next sequence number.
2. Structurally review it (matches intent, `FOREIGN KEY`/`INDEX` statements correct, uses `IF NOT EXISTS` for idempotency like the existing migration does).
3. Do not run `wrangler d1 migrations apply` unless explicitly asked — applying changes real (even if local-only) database state, which is a Change Control (§19) -level action.
4. If it changes a table `tools`/`pages`/etc. already mirrors in the frontend registry, check `src/App.tsx`'s `Tool` type for drift before considering the change complete.
