# CODIVIO — DEPLOYMENT

## 1. Production platform

Codivio is deployed as a Cloudflare Workers application.

Architecture:

```text
User
 ↓
Cloudflare
 ↓
Workers
 ├── SPA Assets
 └── /api/*
      ↓
     D1
```

The application remains a modular monolith and one deployable unit.

## 2. Domain

Primary domain:

`https://codivio.online`

Registrar:

Namecheap

Authoritative DNS:

Cloudflare

## 3. DNS principle

Never change DNS blindly.

Before any DNS modification:

1. inspect current configuration
2. document current state
3. identify dependencies
4. make the smallest safe change
5. test
6. verify
7. document final state

## 4. Cloudflare

Cloudflare services currently relevant:

- Workers
- D1
- DNS
- CDN/edge delivery

R2 remains a future storage option when the product actually requires it.

## 5. D1

Production D1 is configured through `wrangler.jsonc`.

The real production database is provisioned and connected.

Schema changes must be applied through migrations.

## 6. GitHub

Repository:

`azbloknot-png/Codivio`

Primary branch:

`main`

Git is the source-control system.

Do not reset/clean the repository to hide unrelated WIP.

Known unrelated WIP has included:

- `add_phase1f_b1.ps1`
- `app_diff.txt`
- `phase1f-b1.css`
- `src/styles.css.phase1f-b1.backup`

These must not be accidentally deleted or modified during unrelated work.

## 7. Release process

Recommended controlled sequence:

```text
INSPECT
→ TEST
→ BUILD
→ REVIEW GIT DIFF
→ REVIEW SECURITY
→ APPROVAL
→ COMMIT
→ PUSH
→ DEPLOY
→ LIVE VERIFY
→ UPDATE PROJECT STATE
```

A phase can be technically PASS while its changes are still local and not production-deployed.

### 7.1 D1 migration rule (established 2026-09-15)

Production D1 is intended to stay schema-synchronized with the committed migration chain — `database/schema.sql` is documented (§9 of this file, and `DATABASE_SCHEMA.md` §2) as reflecting the migration end state, which is only true in production if every committed migration has actually been applied there. Migrations are **not** applied automatically (no CI/CD pipeline, no build/deploy script step) — applying them is a deliberate, explicit, controlled action, separate from deploying code/assets.

Every production release that introduces a required D1 schema migration must:

1. Verify migration order.
2. Deploy code/migration files (the normal release process above).
3. Apply pending production D1 migrations through the controlled Wrangler mechanism: `wrangler d1 migrations apply <database_name> --remote`.
4. Verify migration state: `wrangler d1 migrations list <database_name> --remote` should report no pending migrations.
5. Run production health verification (`/api/health`, plus one endpoint that reads the changed table).
6. Record the applied migration state in `PROJECT_STATE.md`/`CHANGELOG.md`.

Do not introduce automatic migration execution inside application/Worker startup — this project's architecture explicitly prefers a controlled, manual deployment/migration step over application-startup schema mutation, so a migration failure can never take down a live request path.

Do not claim production status from local tests alone.

## 8. Live verification

After an authorized deployment, verify at minimum the relevant:

- homepage
- tool route
- admin route where applicable
- API health
- authentication boundary where applicable
- robots.txt
- sitemap.xml
- security headers
- critical assets

Do not repeat broad tests unnecessarily; one appropriate live verification per topic is preferred.

## 9. Current production checkpoint

Phase 3.1–3.12 SEO release was deployed under:

- Commit: `4c558a6`
- Cloudflare Version ID: `f8f48a76-be36-4cea-a80b-806a831691f5`

Phase 3.13 was implemented/tested locally but was not yet committed/deployed at the last documented project-state checkpoint.

Therefore production status must always be checked against the latest real deployment, not assumed from local files.

## 10. Security

Secrets:

- must remain in server-side/Cloudflare secret storage
- must never be committed
- must never be printed in reports
- must never enter frontend bundles

Existing security headers include:

- CSP
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- X-Frame-Options
- conditional HSTS

## 11. Local development limitation

The Windows environment has a known Cloudflare `workerd` native runtime crash during local Worker startup.

This is an environment limitation, not evidence that the production Worker is broken.

Real Cloudflare production deployment/live HTTP verification is therefore important when Worker behavior changes.

## 12. Deployment safety

Do not:

- change DNS as a workaround
- expose credentials
- disable security mechanisms to make tests pass
- deploy unreviewed phase work
- overwrite unrelated WIP
- claim live verification without actually performing it

## 13. Rollback

Rollback decisions should be based on:

- real production errors
- deployment state
- affected functionality
- database compatibility
- security impact

Never roll back database migrations casually. Assess forward-fix vs rollback compatibility first.

---

# SOURCE OF TRUTH

For current production state use:

- `PROJECT_STATE.md`
- `git`
- `wrangler.jsonc`
- actual Cloudflare deployment output
- real HTTP verification

This document is an operational guide, not a substitute for live state.
