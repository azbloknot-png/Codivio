# CODIVIO — CHANGELOG

Chronological, checkpoint-based project history. Where a real Git commit exists, its short hash is given — **no hash is invented for uncommitted work.** Most Phase 2 work in this log is still uncommitted in the working tree (expected; see `PROJECT_STATE.md` → Git status expectations).

## Phase 0 — Foundation

- `c3c1594`, `21ee301`, `97ab1fb` — Initial Codivio project foundation (React/TypeScript/Vite scaffold, repo history merge).
- `d033834` — React root mounting completed.
- `3a912d4` — Cloudflare Workers foundation added (dependencies, `vite.config.ts`, initial `wrangler.jsonc` — Assets-only, no Worker script yet, no D1).
- `6baac88` — Cloudflare SPA asset routing aligned.
- `84e0425` — Codivio branding/metadata normalized.
- **Result:** clean repo, working build, base Cloudflare Assets deployment plumbing. **Test status:** build passing.

## Phase 1 — Public Website MVP

- `5a3b18e` — Public navigation routes added.
- `cff7d57` — Homepage hero section.
- `4b9540c` — Tool slugs + coming-soon status.
- `386f010` — MVP tool registry expanded.
- `b1f3f8d`, `46b7c71`, `890700e` — Shared tool-page foundation, routing, responsive styling.
- `c6e7446` — App wrapped with `BrowserRouter`.
- **Uncommitted (this session), building on the above:**
  - Full Phase 1 UI/CSS fix pass: missing CSS classes filled in (verified against real JSX, not copied blindly from a WIP reference file), `.content-section` grid bug fixed, footer link contrast fixed for WCAG AA, mobile tap-target sizing fixed, `aria-pressed`/`aria-expanded` added.
  - Homepage 12-tool selection: `featured` flag introduced on the 34-tool registry, `HOMEPAGE_FEATURED_TOOLS` derived view, redundant per-category preview sections removed from Home.
  - Popular Tools slider, QR Tools slider, PDF Tools slider, Blog slider — each an independently-flagged (`popular`/`qr`/`pdf`) horizontal, touch/swipe, scroll-snap slider reusing the same established track/nav pattern (see `codivio-ui` skill).
  - Basic SEO: `usePageMeta` hook sets `document.title` + meta description per route.
  - 404 handling: `NotFoundPage` replaces silent redirects for unknown routes and invalid tool slugs.
  - **Test status:** `npm run typecheck` / `npm run build` passing at each step; registry count verified at 34 throughout; no regressions found via build-output hash comparison.

## Phase 2.1 — Admin Architecture Audit

- Read-only inspection and plan (no code changes). Produced the Phase 2 checkpoint sequence (2.1–2.11) now tracked in `PROJECT_STATE.md` and the `codivio-admin` skill.
- **Test status:** N/A (audit only).

## Phase 2.2 — Worker + D1 Foundation

- **Uncommitted.** Added `worker/index.ts` (minimal Worker: serves the SPA via `env.ASSETS`, real `/api/health` querying `env.DB`), `migrations/0001_init_schema.sql` (mirrors `database/schema.sql`), and wired `main`/`assets.binding`/`d1_databases` into `wrangler.jsonc`.
- **Test status:** `npm run build` passing (both Worker and client bundles). `wrangler dev` resolved bindings correctly in local mode, then the local `workerd` runtime crashed (access violation) on this Windows machine — an environment limitation, not a code/config defect. Live `/api/health` could not be verified locally as a result. Public SPA regression confirmed via identical build-output file hashes before/after.

## Asset Normalization

- **Uncommitted.** `public/Assets/branding/codivio-logo.png.png` → `public/assets/branding/codivio-logo.png`; `Reference/homepage-reference.png.png` → `reference/homepage-reference.png`. Case-only directory renames done via a two-step swap (required on Windows' case-insensitive filesystem). Image content verified byte-identical before/after.
- **Test status:** `npm run build` passing; confirmed the previous `Assets`/`assets` case-collision in `dist/client/` no longer occurs.

## Local Git Quality Gates

- **Uncommitted.** `.githooks/pre-commit` + `pre-push`, `scripts/{postinstall,pre-commit,pre-push}-check.mjs`, `core.hooksPath` configured, `postinstall` script added to `package.json`.
- **Test status:** each hook script run directly and confirmed to PASS/FAIL correctly; verified they do not modify source or run network calls.

## GitHub Connection Verification

- Read-only check. Confirmed `origin` → `github.com/azbloknot-png/Codivio.git`, `main` tracks `origin/main`, remote reachable. No changes made.

## Security Review (Taste Skill install request)

- Read-only review of the external `Leonxlnx/taste-skill` GitHub repository before allowing any installation. Declined to execute the third-party `npx skills add` CLI; instead manually copied the one requested, reviewed-safe `redesign-skill/SKILL.md` into `.claude/skills/redesign-skill/`.
- **Test status:** N/A (review only; no code execution).

## Skill System Creation

- **Uncommitted.** Audited 12 candidate project-skill ideas, created 4: `codivio-test-gate`, `codivio-database`, `codivio-admin`, `codivio-ui` (each cross-checked for zero duplication with `CLAUDE.md` or each other). `codivio-memory` deliberately deferred to this checkpoint.
- **Test status:** file existence, frontmatter validity, and cross-skill duplication all checked manually; no application tests applicable.

## Phase 2.3 — Authentication + Sessions

- **Uncommitted.** Added `worker/auth.ts` (login/logout/session/bootstrap endpoints, PBKDF2 password hashing, hashed session tokens, email-keyed failed-login lockout), `worker/types.ts` (shared D1/Env types, factored out of `worker/index.ts`), `migrations/0002_auth_sessions.sql` (`sessions` + `login_attempts` tables, `users.updated_at`/`last_login_at` columns). `worker/index.ts` extended with routing to the new endpoints; its existing `/api/health` logic untouched.
- Added `vitest.config.ts` (kept separate from `vite.config.ts` — see `DECISIONS.md`) after discovering `npm test` had started silently trying to boot the local `workerd` runtime and crashing, once Checkpoint 2.2 added `main` to `wrangler.jsonc`. This was a real, newly-surfaced regression in the test setup, not a Phase 2.3 code defect — fixed before any auth tests were written against it.
- Added `tests/auth.test.ts`: 19 real, executed tests covering password hashing/verification, session token generation/hashing, bootstrap (including the "already bootstrapped" refusal), login success/failure/lockout/inactive-user rejection, session validation/expiry, logout invalidation, and a static SQL-parameterization check. All run against a lightweight in-memory D1 mock, itself cross-checked query-by-query against a real SQLite engine (`node:sqlite`) — which caught and fixed one real bug (SQLite's `CURRENT_TIMESTAMP` format not string-comparing correctly against JS `toISOString()`, which would have silently disabled the login-lockout feature).
- **Test status:** `npm run typecheck` — PASS. `npm test` — PASS, 20/20 (1 pre-existing + 19 new). `npm run build` — PASS, public SPA output byte-identical to before (regression check via file hash). Live Worker/D1 integration (`wrangler dev` → real HTTP round-trip) remains unverified — same pre-existing local `workerd` limitation as Checkpoint 2.2, re-confirmed rather than re-diagnosed from scratch.

## Phase 2.4 — Admin UI + Protected Route

- **Uncommitted.** Added `src/admin/AdminApp.tsx`: `AdminLoginPage` (`/admin/login`, calls the real `POST /api/auth/login`, no frontend-only auth, no password/token storage), `useSession`/`resolveSessionState` (server-session-backed auth state via `GET /api/auth/session`), `ProtectedAdminRoute` (`/admin` — loading/unauthenticated/authenticated states, redirects unauthenticated visitors to `/admin/login` with no redirect loop), and `AdminShell` (header with user email + logout, responsive sidebar with 7 nav placeholders — only Dashboard live, the rest marked "Soon" and non-clickable, no dead links, no fake statistics).
- `src/App.tsx`: exported the existing `usePageMeta` hook for reuse, added the `/admin/login` and `/admin` routes without touching any existing route.
- `src/styles.css`: new Admin-scoped CSS reusing existing tokens/patterns (`.brand`, `.contact-form`, `.primary-button`, `.empty-state`) per `codivio-ui`; mobile sidebar becomes a drawer at ≤900px with a 44px+ touch-target toggle; explicit `:focus-visible` styles added for the new interactive elements.
- `worker/auth.ts`/`worker/index.ts` **not modified** — Phase 2.4 only consumes the existing Phase 2.3 API.
- **Test status:** `npm run typecheck` — PASS. `npm test` — PASS, 32/32 (1 foundation + 19 auth + 12 new admin-UI). The 12 new tests combine real unit tests of extracted pure logic (`describeLoginError`, `resolveSessionState`) with structural/static source checks for redirect/routing behavior — no `@testing-library/react`/jsdom is installed, and adding one was out of scope; this distinction is documented in the test file itself. `npm run build` — PASS (Worker bundle unchanged at 10.31kB, confirming zero backend impact; client CSS/JS grew as expected for the new UI).

## Phase 2.5 — RBAC

- **Uncommitted.** Added `shared/rbac.ts` (centralized role/permission matrix: 4 roles, 12 permissions, `hasPermission`/`getPermissions`/`isValidRole`/`displayName`, all fail-closed for unrecognized roles). Added `worker/rbac.ts` (`authorize()` — the reusable authenticate→authorize(permission) pipeline for future protected endpoints, correctly returning 401 vs 403). Extended `worker/auth.ts`: factored out `resolveAuthenticatedUser` from `handleSession`'s inline logic (now reusable), exported `jsonError`, applied `hasPermission(..., "admin.access")` to `GET /api/auth/session`. Extended `src/admin/AdminApp.tsx`: role badge now uses `shared/rbac.ts#displayName`; sidebar nav items are filtered per-role via the same shared matrix (a role without the permission doesn't see the item; a role with it but no built feature sees "Soon").
- Reviewed the user-specified initial permission matrix for security/architectural problems before implementing — found none; implemented as given (see `DECISIONS.md`).
- Deliberately did **not** add Pages/Tools/Users CRUD endpoints just to exercise `authorize()` — none exist yet (Phase 2.9/2.10+); the only current real integration point is `GET /api/auth/session`. Documented as a limitation, not worked around with fake endpoints.
- Extracted the shared `FakeD1` test mock from `tests/auth.test.ts` into `tests/helpers/fake-d1.ts` so `tests/rbac.test.ts` doesn't duplicate it.
- **Test status:** `npm run typecheck` — PASS. `npm test` — PASS, 49/49 (32 pre-existing + 17 new RBAC tests: permission-matrix correctness including fail-closed behavior, `authorize()` 401-vs-403 distinction, role-spoofing resistance via a request with a forged body/header, expired-session-is-401-not-403, error responses not leaking role/permission details, and a structural check that `ProtectedAdminRoute` never uses a client-side permission function to decide access). `npm run build` — PASS (Worker bundle 10.31→13.80kB; client CSS unchanged, JS +~1kB).

## Phase 2.6 — Audit Logging

- **Uncommitted.** Added `worker/audit.ts` (`auditLog(env, event)` — closed action vocabulary today: `AUTH_LOGIN_SUCCESS`/`AUTH_LOGIN_FAILURE`/`AUTH_LOGOUT`/`AUTH_BOOTSTRAP`/`AUTH_SESSION_EXPIRED`/`AUTHZ_DENIED`, controlled `result` vocabulary, fail-open write policy). Added `migrations/0003_audit_logs.sql` — extends the existing (Phase 0) `audit_logs` table with `actor_email`/`result`/`ip_address`/`user_agent` and 5 indexes (created_at, user_id, action, entity_type, result); no new table needed.
- Wired `auditLog` into every real current event: `handleLogin` (success, wrong-password, inactive-user, rate-limited), `handleLogout` (only when a real session existed), `handleBootstrap` (success, already-bootstrapped denial), `resolveAuthenticatedUser`'s session-expiry branch, and `worker/rbac.ts#authorize()`'s 403 path (plus `handleSession`'s own inline 403 check, for consistency). Plain 401s are deliberately not logged.
- **Discovered and fixed a real drift bug**: `database/schema.sql` had not been updated when migration `0002` (Phase 2.3, sessions/login_attempts/users columns) was added — it still only reflected migration `0001`. Brought back in sync with both `0002` and `0003` this checkpoint; re-verified to apply standalone against a real SQLite engine and produce the exact same schema as applying all three migrations in sequence.
- Extended `tests/helpers/fake-d1.ts` to handle `INSERT INTO audit_logs`, so every existing auth/RBAC test (which now triggers audit calls) kept passing without modification.
- **Test status:** `npm run typecheck` — PASS. `npm test` — PASS, 64/64 (49 pre-existing + 15 new: audit-record creation with real server-derived actors, null-actor safety for unauthenticated events, actor-spoofing resistance via forged headers/body, zero secrets/passwords/tokens ever written across a full login+logout+denial cycle, `AUTHZ_DENIED`/`AUTH_BOOTSTRAP`-denial logging, parameterized-SQL static check, fail-open behavior under a simulated D1 write failure, and a real `node:sqlite` migration-structure test now part of the permanent suite). `npm run build` — PASS (Worker bundle 13.80→16.77kB; client CSS/JS byte-identical to Phase 2.5 — confirms this checkpoint made zero frontend change, as scoped).
- No Admin Audit Log UI or read endpoint was built — judged not "genuinely necessary" for verification, since unit/structural/real-SQLite tests fully cover this checkpoint's scope without one.

## Phase 2.7 — Settings Foundation

- **Uncommitted.** Added `shared/settings.ts` (centralized, fail-closed registry: 9 real setting keys across `general`/`system`/`google`/`advertising`/`affiliate`/`security`, 18 category names and 5 value types reserved for future growth; `validateSettingValue`/`parseSettingValue` for type/length/range validation — never `eval`, JSON only ever `JSON.parse`/`stringify`d). Added `migrations/0004_settings.sql` (new `settings` table, 2 indexes, 9 seed rows matching the registry exactly). Added `worker/settings.ts` (`GET /api/settings/public` — no auth, public rows only; `GET /api/admin/settings` — `settings.view`; `PATCH /api/admin/settings` — `settings.manage`, one key at a time, audited on both success and validation failure). Extended `worker/audit.ts` with the `SETTING_UPDATED` action.
- Refactored `src/admin/AdminApp.tsx`'s `/admin` route to nested routing (`Outlet`/`useOutletContext` — a `useAdminUser()` hook threads the already-verified session user to child pages) so `/admin` (Dashboard) and `/admin/settings` (new) are siblings instead of one hardcoded view — the extension point left as a comment in Phase 2.4.
- Added `src/admin/AdminSettingsPage.tsx`: General/Branding/Integrations/Security/System groups, all real data from `GET /api/admin/settings`; Branding shown as an honest "Coming soon" (zero registered settings there); Google/AdSense/Affiliate shown as read-only "Not configured" status badges (never editable, even for `settings.manage` — see `DECISIONS.md`, no real integration flow exists yet to legitimately flip them); General/Security/System settings are genuinely editable for a role with `settings.manage`, read-only text otherwise (`admin` role has `settings.view` but not `settings.manage`, so it now correctly sees a read-only Settings page).
- **Discovered and fixed test-writing mistakes while building this** (not production bugs): the Phase 2.4 structural test asserting the exact old `/admin` route JSX needed updating for the new nested-route structure; a new test helper (`patchSettings`) had to replace several call sites that were awaiting a raw `Request` object instead of invoking the handler; `seedDefaultSettings()` initially only seeded 6 of the 9 real rows. All caught by running the suite, none shipped.
- **Test status:** `npm run typecheck` — PASS. `npm test` — PASS, 81/81 (64 pre-existing + 17 new: real-SQLite migration validation, authorized/unauthorized/unauthenticated read, authorized/unauthorized write, unknown-key and wrong-type/oversized-value rejection, public/private exposure boundary, audit logging on success and failure, actor-spoofing resistance, parameterized-SQL static check, and an honest "no JSON setting registered yet" check rather than a fabricated one). `npm run build` — PASS (Worker bundle 16.77→27.33kB; client CSS 19.75→21.90kB, JS 310.51→315.76kB for the new Settings page).

## Project Memory System

- Created `PROJECT_STATE.md`, `DECISIONS.md`, this `CHANGELOG.md`, and `.claude/skills/codivio-memory/SKILL.md`; added a minimal integration section to `CLAUDE.md` (§24).
- **Test status:** documentation-only; verified via file-existence and content-consistency checks, not the application test suite.

## Phase 2.9 — Pages Management

- **Uncommitted.** Extended the existing (Phase 0) `pages` table in place via `migrations/0005_pages_management.sql` — `description`/`meta_title`/`meta_description`/`canonical_url`/`is_indexable`/`created_by`/`updated_by` columns, the latter two FK'd to `users(id)` (empirically verified enforced via `node:sqlite`, including `ALTER TABLE ADD COLUMN ... REFERENCES`). The existing, still-unused `seo_settings` table was deliberately left alone (see `DECISIONS.md`).
- Added `shared/pages.ts`: centralized fail-closed validation (slug format + `RESERVED_PAGE_SLUGS` allowlist, per-field length limits, `draft`/`published`/`archived` status enum, canonical-URL scheme check rejecting `javascript:`/etc.) — asymmetric by design: `title`/`description`/`metaTitle`/`metaDescription` reject raw `<`/`>`, `content` does not (its safety boundary is the render side, not input filtering).
- Added `worker/pages.ts`: `GET/POST /api/admin/pages` and `GET/PATCH/DELETE /api/admin/pages/:id` (via `authorize()` — `pages.view`/`pages.manage`, both pre-existing in the Phase 2.5 matrix), plus unauthenticated `GET /api/pages/:slug` (`status='published'` enforced inside the SQL `WHERE`, never post-filtered; draft/archived/missing all return the same generic 404). Mass-assignment protection is structural (only named fields ever read from the body). Deleting a published page is blocked (409) until it's archived. Extended `worker/audit.ts` with `PAGE_CREATED`/`PAGE_UPDATED`/`PAGE_PUBLISHED`/`PAGE_ARCHIVED`/`PAGE_DELETED`.
- Added `src/admin/AdminPagesPage.tsx` (list + shared create/edit form, real data only — "No pages yet" when empty) and wired `/admin/pages` into the nested Admin route tree; the Pages nav item now links instead of showing "Soon".
- Added a public rendering foundation: a top-level `/:slug` route (`CmsPageRoute`/`CmsPageContent` in `src/App.tsx`) fetches the public endpoint and renders title/description/content as plain React text (never `dangerouslySetInnerHTML`), reusing the existing `.legal-content`/`.page-intro` styling. Route-collision safety is defense-in-depth: React Router's static-beats-dynamic ranking plus the explicit `RESERVED_PAGE_SLUGS` check both independently stop a page slug from shadowing `/admin`/`/api`/`/tools`/etc.
- **Discovered and fixed one test-mock bug while building this** (not a production bug): the shared `FakeD1` test helper was returning live object references from SELECT queries instead of independent snapshots, which silently broke a before/after status-comparison used by the audit-action logic (an UPDATE's in-place mutation was retroactively "changing" an already-returned "before" row, since both were secretly the same JS object). Fixed by shallow-copying rows on return from the mock's SELECT branches; caught by a failing test, not by inspection.
- **Test status:** `npm run typecheck` — PASS. `npm test` — PASS, 103/103 (81 pre-existing + 22 new: real-SQLite migration validation with FK enforcement, unique-slug constraint, authenticated/unauthenticated/unauthorized read, authorized/unauthorized write, validation rejection incl. reserved slug and unsafe canonical URL scheme, duplicate-slug 409, draft-not-public/published-is-public, mass-assignment protection, XSS/content-safety incl. a static dangerouslySetInnerHTML-usage check, audit logging across create/publish/archive/delete plus the publish-before-delete guard, actor-spoofing resistance, and a parameterized-SQL static check). `npm run build` — PASS.

## Phase 2.10 — Tools Management

- **Uncommitted.** Extended the existing (Phase 0) `tools`/`categories` tables in place via `migrations/0006_tools_management.sql` — `tools` gained `icon`/`is_popular`/`seo_title`/`seo_description`/`created_by`/`updated_by` (pre-existing `featured`/`status`/`component`/`sort_order` columns reused as-is, not renamed). Seeded BOTH tables for the first time ever, from the real static registry in `src/App.tsx`: 4 categories (qr/pdf/image/other) and all 34 real tools — same slugs/names/descriptions/icons, `component='ToolPage'` for every row (the actual generic implementation component every tool route renders today).
- Added `shared/tools.ts`: centralized fail-closed validation (slug format, per-field length limits, a forward-looking `TOOL_CATEGORIES` allowlist broader than what's actually seeded, a controlled `ICON_NAMES` allowlist so icons are always identifiers, never markup).
- Added `worker/tools.ts`: `GET/POST /api/admin/tools` and `GET/PATCH/DELETE /api/admin/tools/:id` (via `authorize()` — `tools.view`/`tools.manage`, both pre-existing in the Phase 2.5 matrix). A tool category is only accepted once a real `categories` row exists for it (looked up, never auto-created). Mass-assignment protection is structural. Deleting an active tool is blocked (409) until deactivated. Extended `worker/audit.ts` with `TOOL_CREATED`/`TOOL_UPDATED`/`TOOL_ACTIVATED`/`TOOL_DEACTIVATED`/`TOOL_DELETED`.
- **No public `GET /api/tools` endpoint was built — a deliberate, documented decision** (see `DECISIONS.md`), not an oversight: the public site (Homepage, `/tools`, `/tools/:slug`) continues to read exclusively from the static registry in `src/App.tsx`, completely unchanged this checkpoint. The new tables are a real, fully CRUD-manageable Admin configuration surface with no public consumer yet; wiring the public site to it is explicit future work.
- Added `src/admin/AdminToolsPage.tsx` (list + shared create/edit form, real data only) and wired `/admin/tools` into the nested Admin route tree; the Tools nav item now links instead of showing "Soon". Category and Icon are both `<select>` pickers (Category limited to the 4 real seeded categories, Icon limited to `ICON_NAMES`) rather than free text.
- **Test status:** `npm run typecheck` — PASS. `npm test` — PASS, 126/126 (103 pre-existing + 23 new: real-SQLite migration validation confirming all 34 tools/4 categories seeded correctly with FK/unique-slug enforcement, a static check that the existing 34-tool registry is untouched, duplicate-slug 409, authenticated/unauthenticated/unauthorized read, authorized create/update, unauthorized-mutation 403, validation rejection incl. an unseeded-but-allowlisted category, mass-assignment protection, actor-spoofing resistance, a static check confirming no `/api/tools` route was added plus that the admin payload excludes internal `category_id`/`component` fields, audit logging across create/deactivate/delete plus the deactivate-before-delete guard, icon-allowlist rejection of a raw `<svg onload=...>` payload, existing tool/admin/homepage route regression, and a parameterized-SQL static check). `npm run build` — PASS. No new HIGH/MEDIUM-confidence vulnerability found on a focused self-review against the full checklist (IDOR, privilege escalation, mass assignment, icon/SVG injection, SQL injection, route manipulation, inactive-tool exposure, forged actor/role).

## Phase 2.11 — Admin Security + Final Tests (Phase 2 Final Checkpoint)

- **Uncommitted.** Implemented the previously-open Security Headers item: `worker/security-headers.ts#withSecurityHeaders`, applied once at `worker/index.ts`'s single top-level `fetch()` to every response (API and static-asset alike) — `Content-Security-Policy` (strict: `script-src 'self'`, `style-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, no `unsafe-inline`/`unsafe-eval`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/microphone/geolocation/payment denied), `X-Frame-Options: DENY`, and conditional `Strict-Transport-Security` (HTTPS requests only). The CSP was derived by actually inspecting the built `index.html`/bundle (one same-origin script, one same-origin stylesheet, zero external hosts) rather than copied from a template.
- Replaced the one pre-existing inline `style={{ whiteSpace: "pre-wrap" }}` (the Phase 2.9 public CMS page body) with a CSS class (`.cms-page-content`) specifically so the CSP's `style-src` needs no `'unsafe-inline'` exception — a one-line, zero-risk change, not a refactor.
- **CSRF reviewed, no change made:** `SameSite=Strict` + `HttpOnly` + `Secure` (Phase 2.3) already blocks the session cookie on any cross-site request for this same-origin architecture; a token mechanism would add complexity with no additional protection. Documented as a final decision in `DECISIONS.md`.
- **Password hashing reviewed, no change made:** PBKDF2 at 100,000 iterations is below OWASP's current 600,000 recommendation, but raising it without being able to verify it stays inside Cloudflare Workers' per-request CPU budget (blocked by the standing `workerd`-on-Windows limitation) would trade a documented low-severity gap for an unverified one. Recorded as a deferred, environment-gated item — zero migration cost whenever it's raised, since the stored hash format self-describes its own iteration count.
- **Found and closed one real test gap:** `resolveAuthenticatedUser` already re-checks the live `users.status` on every request (not just at login), so deactivating a user mid-session correctly invalidates their still-unexpired session — this had never been directly tested (only login-time deactivation was). Added one test (`tests/rbac.test.ts`) confirming the existing behavior; no code change was needed, the implementation was already correct.
- **Full Phase 2 review performed** across authentication, sessions, RBAC, audit logging, settings, pages, tools, admin UI, and the database — re-verified via the existing (now 130-test) suite, a whole-tree static grep for `eval`/`new Function`/`dangerouslySetInnerHTML`/`document.write`/`innerHTML=`/hardcoded secrets/localStorage-for-auth (all clean, no matches outside comments/tests explaining their absence), and a fresh real-SQLite check that all 6 migrations apply both sequentially and via `database/schema.sql` standalone to an identical end state (table-by-table column comparison, not just table-name comparison).
- **Git hygiene note (no action taken):** a handful of pre-existing, unrelated-to-Phase-2 WIP artifacts remain untracked (`add_phase1f_b1.ps1`, `app_diff.txt`, `phase1f-b1.css`, `src/styles.css.phase1f-b1.backup`) — flagged for the user's own judgment, not created or deleted this session.
- **Test status:** `npm run typecheck` — PASS. `npm test` — PASS, 130/130 (126 pre-existing + 3 security-header tests + 1 mid-session-deactivation test). `npm run build` — PASS. No FAIL-level finding anywhere in Phase 2.
- **PHASE 2 FINAL CHECKPOINT: PASS.** See `PROJECT_STATE.md`'s "Phase 2 Final Checkpoint" table for the full per-area breakdown. The only DEGRADED item is production readiness (no live Cloudflare deployment/real D1 has ever been attempted — an access/environment limitation, not a code defect).
