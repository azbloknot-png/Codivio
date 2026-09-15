# CODIVIO — ARCHITECTURE

## 1. Current architecture

Codivio is a **Modular Monolith**: one deployable Cloudflare Workers application with clear internal module boundaries. The current frontend is a React 19 + TypeScript + Vite SPA. The Cloudflare Worker handles `/api/*` and serves the SPA through the `ASSETS` binding.

### Current stack

- React 19
- TypeScript
- Vite
- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2 — future/when required
- GitHub
- Plain CSS with project design tokens
- Browser APIs for local processing where practical

### Current main areas

```text
C:\Codivio\
├── src/
│   ├── App.tsx
│   ├── pages/
│   │   └── ToolPage.tsx
│   ├── admin/
│   └── seo/
├── shared/
│   └── seo/
├── worker/
│   └── index.ts
├── database/
│   └── schema.sql
├── migrations/
├── public/
│   ├── assets/
│   ├── robots.txt
│   ├── sitemap.xml
│   └── llms.txt
├── tests/
├── scripts/
├── reference/
├── CLAUDE.md
├── PROJECT_STATE.md
├── DECISIONS.md
├── CHANGELOG.md
└── wrangler.jsonc
```

## 2. Architectural principles

- Keep the project modular without premature microservices.
- Split services only when real scale evidence justifies it.
- Prefer the smallest useful implementation.
- Prefer free/minimum-cost infrastructure first.
- Prefer browser-side processing when practical and privacy-preserving.
- Never expose secrets in frontend bundles.
- Never duplicate authoritative registries.
- Server-authoritative security decisions must not depend on client input.

## 3. Frontend

The public application is currently a single React SPA.

Important current files:

- `src/App.tsx` — main routing/public application structure
- `src/pages/ToolPage.tsx` — tool page rendering
- `src/styles.css` — global/plain CSS
- `src/seo/useSeo.ts` — page SEO/schema integration
- `shared/seo/*` — SEO data and architecture

The tool registry currently contains 34 tools across 4 categories.

Homepage intentionally exposes a smaller curated set of 12 tools; the complete registry remains available through the application architecture.

## 4. Worker

`worker/index.ts` is the Cloudflare Worker entry point.

Responsibilities include:

- `/api/*` handling
- authentication/session integration
- admin-protected APIs
- settings/pages/tools management APIs
- security headers
- D1 access

The Worker and SPA remain one deployable unit.

## 5. Database

Cloudflare D1 is the authoritative application database.

Current production D1 is provisioned and connected. The schema is maintained through migrations and `database/schema.sql`.

Do not create duplicate databases or parallel persistence systems.

## 6. Admin architecture

Admin is protected by:

- authentication
- sessions
- RBAC
- audit logging
- server-side authorization

Admin functionality currently includes foundation management for:

- settings
- pages
- tools
- SEO administration

The long-term Admin vision is a full business-management/control center, including analytics, traffic, users, entitlements, monetization, ads, SEO, blog, system health, backups and integrations.

## 7. SEO architecture

SEO is centralized under `shared/seo/` and `src/seo/`.

Current architectural areas include:

- site/page metadata
- tool SEO metadata
- keywords/search intent
- content blueprints
- AI/GEO profiles
- internal links
- Schema.org graphs

Avoid importing heavy content datasets into the initial homepage bundle. Tool-specific content should remain selectively loaded where appropriate.

## 8. Performance architecture

The initial page load is a first-class requirement.

Principle:

**critical-first + selective lazy loading**

Do not lazy-load critical first-viewport/LCP content merely to reduce bundle size.

Lazy-load/code-split:

- non-critical below-the-fold content
- heavy tool-specific content
- route-specific modules
- data that is not needed for the initial viewport

Performance decisions must consider:

- FCP
- LCP
- INP
- CLS
- real production behavior
- mobile performance

## 9. Security boundaries

- Secrets remain server-side/Cloudflare secret storage.
- Plan/entitlement status must be server-authoritative.
- Client input must never grant admin or premium privileges.
- Existing auth/RBAC/security-header architecture must be reused.
- IP is abuse protection, not permanent identity.

## 10. Future scaling

Scale based on measured:

- CPU
- RAM
- DB load
- storage
- bandwidth
- queue pressure
- errors
- latency
- actual cost

Visitor count alone is not a sufficient scaling decision.

---

# SOURCE OF TRUTH RULE

If this document conflicts with real code, tests, Git state, configuration, or `PROJECT_STATE.md`, trust the real project state, report the conflict, and update the documentation.
