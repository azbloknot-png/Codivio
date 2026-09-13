---
name: codivio-admin
description: Tracks the Phase 2 Admin Foundation checkpoint sequence, module list, and RBAC roles for Codivio, so an Admin task doesn't re-derive the roadmap from scratch. Use for any Phase 2 / Admin Panel task. Do not use to justify implementing a future checkpoint the user hasn't asked for — this documents the approved plan, it is not authorization.
---

# Codivio Admin (Phase 2)

This is the checkpoint plan produced during the Phase 2.1 architecture audit. It is a *plan reference*, not live status — **current checkpoint status must come from `PROJECT_STATE.md` once the Memory System exists**. Until then, ask the user or verify directly against the code (e.g. does `worker/index.ts` exist, is there an `/admin` route) rather than assuming.

## Checkpoint sequence

| # | Checkpoint | Scope |
|---|---|---|
| 2.1 | Admin Architecture Audit | Read-only inspection + plan (done) |
| 2.2 | Worker + D1 Foundation | Minimal Worker entry, D1 binding, migration structure, `/api/health` — no auth/UI (done; see `codivio-database` for what it wired) |
| 2.3 | Authentication + Sessions | `/api/admin/login`/`/logout`/`/session` Worker endpoints, `sessions` table, password hashing via Web Crypto — no UI yet |
| 2.4 | Admin UI + Protected Route | `/admin/login` page, `AdminLayout` shell with sidebar, route guard wired to 2.3's session API |
| 2.5 | RBAC | Role-based menu/section visibility + server-side role checks per endpoint |
| 2.6 | Audit Logging | Sensitive admin actions write to the existing `audit_logs` table |
| 2.7 | Settings Foundation | Minimal key-value `settings` table + one working settings field end to end |

Each checkpoint is independently testable — use `codivio-test-gate`'s Worker/D1 or React-logic rows as appropriate, not a blanket "test everything" pass.

## Admin modules (full detail in CLAUDE.md §7 — not repeated here)

Dashboard, Pages, Tools, Blog, SEO, Advertisements, Analytics, Users, Backups, System, Settings.

## RBAC roles (CLAUDE.md §9)

Super Admin, Admin, Editor, Analyst.

## Rules specific to this area

- Full CRUD UI for each module (Pages editor, Tools manager, Blog CMS, etc.) is **beyond** "Admin Foundation" as CLAUDE.md §4 defines Phase 2 — those are later expansion work, not part of 2.1–2.7.
- Any new Admin backend route must go through the same Change Control process as other auth/database/permission changes (CLAUDE.md §19): inspect → explain risk → smallest safe change → implement → test → security review → diff review → report.
- Do not build Premium/Affiliate/monetization structures while doing Admin Foundation work — CLAUDE.md and the project's own decisions keep those logically separate and deferred.
