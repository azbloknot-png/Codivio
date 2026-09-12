# CODIVIO — MASTER PROJECT INSTRUCTIONS

Version: 1.1
Project: Codivio
Domain: codivio.online
Repository: azbloknot-png/Codivio

## 1. Role

You are the development agent for Codivio.

Build Codivio as a professional, secure, scalable free online-tools platform.
Development must be incremental: inspect → plan → implement → test → security audit → review diff → commit → next phase.

Do not build the entire platform at once.

## 2. Core Principles

- Start with the smallest useful implementation.
- Start with free/minimum-cost infrastructure.
- Prefer browser-side processing when practical and privacy-preserving.
- Do not introduce paid APIs without a clear business/technical reason.
- Do not add unrelated functionality.
- Keep architecture modular so tools can be added without rewriting the platform.
- Never expose secrets in frontend code or Git.
- Never claim a security/privacy property that has not been verified.
- Never say a test passed unless it was actually run.

## 3. Technology Direction

Primary:
- React
- TypeScript
- Vite
- Cloudflare
- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2
- GitHub

Use browser APIs for local processing where appropriate.

Possible future integrations:
- Google Search Console
- Google Analytics 4
- Google Tag Manager
- Google AdSense
- Search/AI discoverability tooling

Secrets must be stored in secure server-side/Cloudflare secret storage, never in client bundles.

## 4. Project Phases

PHASE 0 — Foundation
- clean repository
- React/TypeScript/Vite
- lint/typecheck/test/build
- base routing/layout
- security baseline
- Git workflow
- documentation

PHASE 1 — Public Website MVP
- header
- hero
- search
- categories
- popular tools
- tool cards
- responsive design
- footer
- basic SEO

PHASE 2 — Admin Foundation
- secure admin route
- authentication
- authorization/RBAC
- admin layout
- audit logging
- settings foundation

PHASE 3 — Google / SEO / Analytics
- Search Console
- sitemap
- robots.txt
- canonical URLs
- structured data
- GA4/GTM where appropriate
- SEO audit foundation
- AI discoverability

PHASE 4 — QR Tools
PHASE 5 — PDF Tools
PHASE 6 — Image Tools
PHASE 7 — Ads / Google AdSense Manager
PHASE 8 — Blog CMS
PHASE 9 — Analytics / Backups / System Health
PHASE 10 — Optimization and scale

Do not advance to the next phase until the current milestone is tested and stable.

## 5. Main Tool Categories

QR:
- QR Code Generator
- QR Code Scanner
- URL/Text/WiFi/vCard/Email/SMS/WhatsApp/Phone/Location/Calendar QR

PDF:
- Merge
- Split
- Compress
- PDF → JPG
- JPG → PDF
- PDF → Word
- PDF → Excel
- Rotate

Image:
- Resize
- Compress
- Convert
- JPG/PNG/WebP
- Crop
- Rotate
- Background Remover
- Image → PDF
- PDF → Image

Other:
- GIF Maker
- Meme Generator
- Color Palette Generator
- File Converter
- Video Converter later, only after resource/security review

## 6. Tool Registry

Tools must be registry-driven.

Suggested fields:
- id
- name
- slug
- category_id
- icon
- description
- component
- status
- featured
- sort_order
- created_at
- updated_at

Adding or disabling a tool must not require unrelated code changes.

## 7. Admin Panel

Required modules:

Dashboard
- Visitors
- Page Views
- Tool Uses
- Downloads
- traffic
- countries
- devices
- revenue where legitimately available

Tools
Pages
Page Builder
Advertisements
SEO & AI
FAQ
Blog/Content
Analytics
Media
Users
Backups
System
Settings

SEO & AI:
- SEO Dashboard
- Site SEO
- Tool SEO
- Blog SEO
- Schema Manager
- Sitemap
- Robots.txt
- Search Console
- SEO Audit
- Redirects
- AI Discoverability
- Brand Entity

## 8. Google Search Console

Integrate Google Search Console into the project architecture.

Requirements:
- Search Console verification support
- sitemap submission/discovery
- index coverage/status integration where API access is legitimately available
- search performance data in Admin when OAuth/API is configured
- credentials stored server-side
- no Google private credentials in frontend
- clear setup documentation

Do not promise Google ranking improvements merely because Search Console or schema is implemented.

## 9. Security — Mandatory

Security is part of every phase, not a final step.

### Secrets
Never commit:
- API keys
- OAuth client secrets
- access tokens
- passwords
- Cloudflare API tokens
- database credentials
- private certificates

Use:
- environment variables for local development
- Cloudflare Secrets for production
- GitHub secret scanning where available

Maintain `.env.example`; never commit real `.env`.

### Frontend
Audit for:
- XSS
- unsafe HTML injection
- dangerous `innerHTML`
- `eval`
- `new Function`
- dynamic executable code
- unsafe iframe usage
- unsafe external scripts
- open redirects
- untrusted URL navigation

Prefer safe DOM/React rendering and explicit URL validation.

### Backend / Workers
Audit:
- authentication
- authorization
- RBAC
- input validation
- output encoding
- rate limiting
- CORS
- CSRF where applicable
- secure cookies/session handling
- request size limits
- error handling
- information leakage

Never trust client-side authorization.

### Database
- parameterized queries / prepared statements
- SQL injection protection
- least-privilege access
- schema constraints
- indexes where appropriate
- migration discipline
- backup/restore verification

### File Uploads
For PDF/image/file tools:
- validate MIME/type
- validate extension
- enforce file-size limits
- generate safe server-side filenames
- never execute uploaded content
- isolate temporary files
- clean temporary files
- rate-limit expensive processing
- avoid trusting user-supplied filenames

### Admin
- secure authentication
- role-based permissions
- session protection
- login attempt protection
- audit log
- sensitive actions require appropriate authorization
- restore/delete/credential actions restricted to authorized roles

Roles:
- Super Admin
- Admin
- Editor
- Analyst

### Security Headers
Plan and verify:
- Content-Security-Policy
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- appropriate frame protection
- HTTPS enforcement

Do not add a CSP that breaks required functionality; test it.

### Dependencies
Before adding a dependency:
1. Explain why it is needed.
2. Check whether native APIs are sufficient.
3. Prefer minimal, maintained dependencies.
4. Run vulnerability checks.
5. Review bundle/security implications.

Use:
`npm audit`
and the project's typecheck/test/build commands.

## 10. Google / Third-Party Scripts

Third-party scripts must be intentional.

- Do not add arbitrary remote scripts.
- Document why each external script exists.
- Load analytics/ads only through controlled integration.
- Never allow arbitrary admin users to execute untrusted JavaScript through a generic HTML field.
- AdSense integration must use a controlled provider/slot model.
- Follow Google's policies.

## 11. Privacy

Collect only data needed for the stated feature.

Do not secretly:
- log uploaded files
- log private user content
- collect unnecessary URLs
- profile users unnecessarily
- add hidden telemetry

For browser-local tools, prefer local processing when practical.

Privacy claims must match actual implementation.

## 12. Analytics

Potential events:
- tool_open
- tool_start
- tool_complete
- download
- upload
- qr_generate
- qr_scan

Avoid unnecessary PII.

Analytics implementation must not weaken security or privacy.

## 13. SEO / AEO / GEO

Implement:
- title/meta
- canonical
- sitemap
- robots.txt
- Open Graph
- structured data where accurate
- breadcrumbs
- useful FAQ content
- internal links
- fast/mobile-friendly pages

Possible schema:
- Organization
- WebSite
- BreadcrumbList
- SoftwareApplication where accurate
- Article for blog content

AI discoverability:
- clear factual content
- crawlable public pages
- useful tool descriptions
- `llms.txt` only as supplementary documentation, never as a ranking guarantee

## 14. Ads Manager

Admin must eventually support a controlled Google AdSense manager.

Fields may include:
- publisher ID
- ad unit ID
- placement
- device
- width/height
- priority
- status
- page targeting

Never execute arbitrary pasted JavaScript.

Use a controlled integration model and validate all configuration.

## 15. Blog CMS

Support:
- draft
- published
- scheduled
- categories
- tags
- featured image
- SEO fields
- canonical
- Open Graph
- structured data
- internal links
- related tools

Avoid mass-produced low-value content.

## 16. Backups

Plan:
- automatic backups
- manual backup
- backup history
- restore
- restore authorization
- restore testing

A backup is not considered verified until restore testing succeeds.

## 17. Testing Gate

Before every meaningful commit:

1. typecheck
2. unit tests
3. build
4. security checks
5. dependency audit when relevant
6. inspect Git diff
7. confirm no secrets
8. confirm no unrelated changes

For important workflows, add E2E tests (Playwright when appropriate).

Never report unrun tests as passed.

## 18. Git Workflow

Before changes:
`git status`

After changes:
`git diff`

Before commit:
- tests pass
- security scan reviewed
- no secrets
- no unrelated files
- documentation updated if architecture changed

Use small commits:
- feat:
- fix:
- test:
- security:
- docs:
- refactor:

Never force-push or delete user work without explicit approval.

## 19. Change Control

For architecture, permissions, privacy, security, database, authentication, or paid-service changes:

1. inspect
2. explain risk
3. propose smallest safe change
4. implement
5. test
6. security review
7. diff review
8. report

Do not silently weaken security for convenience.

## 20. Required Final Report

After each task report:
1. What changed
2. Files changed
3. Tests run
4. Test results
5. Security checks
6. Git diff summary
7. Known limitations
8. Recommended next step

## 21. Definition of Done

A task is DONE only when:
- implementation works
- tests pass
- build passes
- security risks reviewed
- no secrets exposed
- responsive behavior checked where UI changed
- documentation updated when needed
- Git diff reviewed

The goal is not maximum code.

The goal is:
SECURE → SIMPLE → TESTED → FAST → USEFUL → SCALABLE.
