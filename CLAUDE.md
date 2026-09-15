# CODIVIO — MASTER PROJECT INSTRUCTIONS

Version: 1.2
Project: Codivio
Domain: codivio.online
Repository: azbloknot-png/Codivio

Priority legend used throughout: **[CRITICAL]** never violate · **[REQUIRED]** must do every relevant phase · **[DEFAULT]** do unless the user says otherwise · **[FUTURE]** not yet — plan for it, don't build it early.

## 1. Role & Workflow

You are the development agent for Codivio: a professional, secure, scalable free online-tools platform, built incrementally. **[CRITICAL]** Do not build the entire platform at once; do not advance to the next phase until the current milestone is tested and stable.

**Standard workflow:** UNDERSTAND → INSPECT → PLAN → MODIFY → TEST → VERIFY → REPORT

**Debug workflow:** DETECT → CLASSIFY → REPRODUCE → ROOT CAUSE → FIX → TEST → REGRESSION → REPORT

**Architecture strategy — Modular Monolith [CRITICAL]:** one deployable Cloudflare Workers application with clear internal module boundaries (routing, admin, tools, blog, SEO, etc.). Do not split into separate services/repos until concrete scale evidence requires it — see §22.

**Language [DEFAULT]:** communicate with the user in Azerbaijani. All code, identifiers, comments, commit messages, and technical documentation stay in English.

## 2. Core Principles

- **[DEFAULT]** Smallest useful implementation first; free/minimum-cost infrastructure first; prefer browser-side processing when practical and privacy-preserving.
- **[REQUIRED]** No paid APIs without a clear business/technical reason.
- **[CRITICAL]** No unrelated functionality and no unnecessary changes — scope beyond what was asked needs explicit approval (see §19 Change Control).
- **[CRITICAL]** Never expose secrets in frontend code or Git (full rules in §9).
- **[CRITICAL]** Never claim a security/privacy property that has not been verified, and never say a test passed unless it was actually run.

## 3. Technology Direction

**Primary:** React, TypeScript, Vite, Cloudflare (Workers, D1, R2), GitHub. Use browser APIs for local processing where appropriate.

**Possible future integrations [FUTURE]:** Google Search Console, GA4, GTM, Google AdSense, search/AI discoverability tooling.

**[CRITICAL]** Secrets live in server-side/Cloudflare secret storage only, never in client bundles.

## 4. Project Phases (15)

Each phase is REQUIRED in order; do not skip ahead.

- **0 — Foundation:** clean repo, React/TS/Vite, lint/typecheck/test/build, base routing/layout, security baseline, Git workflow, documentation.
- **1 — Public Website MVP:** header, hero, search, categories, popular tools, tool cards, responsive design, footer, basic SEO.
- **2 — Admin Foundation:** secure admin route, authentication, authorization/RBAC, admin layout, audit logging, settings foundation.
- **3 — Google / SEO / Analytics:** Search Console, sitemap, robots.txt, canonical URLs, structured data, GA4/GTM where appropriate, SEO audit foundation, AI discoverability.
- **4 — QR Tools**
- **5 — PDF Tools**
- **6 — Image Tools**
- **7 — Ads / Google AdSense Manager**
- **8 — Blog CMS**
- **9 — Analytics / Backups / System Health**
- **10 — Optimization and Scale**
- **11 — Extended Tools:** GIF Maker, Meme Generator, Color Palette Generator, File Converter; Video Converter only after a dedicated resource/security review.
- **12 — Monetization Expansion:** AdSense placement/performance reporting maturity, Admin revenue dashboard; any user-facing paid tier requires a separate Change Control review (§19) — stays free-first by default.
- **13 — Public API & Ecosystem [FUTURE]:** optional public API for the tool registry/status and integration hooks, under the same security/privacy/rate-limiting rules as the rest of the platform. Speculative — not committed.
- **14 — Scale & Reliability Hardening:** caching strategy, multi-region considerations, load/performance testing, incident-response runbook — builds on Phase 10.

## 5. Main Tool Categories

- **QR:** Generator, Scanner, URL/Text/WiFi/vCard/Email/SMS/WhatsApp/Phone/Location/Calendar QR
- **PDF:** Merge, Split, Compress, PDF↔JPG, JPG→PDF, PDF→Word, PDF→Excel, Rotate
- **Image:** Resize, Compress, Convert, JPG/PNG/WebP, Crop, Rotate, Background Remover, Image↔PDF
- **Other:** GIF Maker, Meme Generator, Color Palette Generator, File Converter, Video Converter (later, after resource/security review)

## 6. Tool Registry

**[REQUIRED]** Tools are registry-driven. Suggested fields: id, name, slug, category_id, icon, description, component, status, featured, sort_order, created_at, updated_at. Adding or disabling a tool must not require unrelated code changes.

## 7. Admin Panel

**Dashboard:** visitors, page views, tool uses, downloads, traffic, countries, devices, revenue where legitimately available.

**Modules:** Tools, Pages, Page Builder, Advertisements, SEO & AI, FAQ, Blog/Content, Analytics, Media, Users, Backups, System, Settings.

**SEO & AI submodule:** SEO Dashboard, Site SEO, Tool SEO, Blog SEO, Schema Manager, Sitemap, Robots.txt, Search Console, SEO Audit, Redirects, AI Discoverability, Brand Entity.

## 8. Google Search Console [FUTURE]

Requirements when built: verification support; sitemap submission/discovery; index coverage integration where API access is legitimately available; search performance data in Admin when OAuth/API is configured; credentials stored server-side, never in frontend; clear setup documentation. **[CRITICAL]** Do not promise ranking improvements merely because Search Console or schema is implemented.

## 9. Security — Mandatory [CRITICAL]

Security is part of every phase, not a final step.

**Secrets:** never commit API keys, OAuth secrets, access tokens, passwords, Cloudflare API tokens, database credentials, or private certificates. Use env vars locally, Cloudflare Secrets in production, GitHub secret scanning where available. Maintain `.env.example`; never commit a real `.env`.

**Frontend:** audit for XSS, unsafe HTML injection/`innerHTML`, `eval`/`new Function`/dynamic executable code, unsafe iframes or external scripts, open redirects, untrusted URL navigation. Prefer safe DOM/React rendering and explicit URL validation.

**Backend/Workers:** audit authentication, authorization/RBAC, input validation, output encoding, rate limiting, CORS, CSRF where applicable, secure cookies/sessions, request size limits, error handling, information leakage. Never trust client-side authorization.

**Database:** parameterized queries only, SQL-injection protection, least-privilege access, schema constraints, appropriate indexes, migration discipline, backup/restore verification.

**File uploads (PDF/image/file tools):** validate MIME type and extension, enforce size limits, generate safe server-side filenames, never execute uploaded content, isolate and clean temporary files, rate-limit expensive processing, never trust user-supplied filenames.

**Admin:** secure auth, role-based permissions, session protection, login-attempt protection, audit log; restore/delete/credential actions restricted to authorized roles. Roles: Super Admin, Admin, Editor, Analyst.

**Security headers:** plan and verify CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame protection, HTTPS enforcement. Do not ship a CSP that breaks required functionality — test it.

**Dependencies:** before adding one — explain why it's needed, check if native APIs suffice, prefer minimal/maintained packages, run `npm audit`, review bundle/security implications.

## 10. Google / Third-Party Scripts

**[CRITICAL]** No arbitrary remote scripts. Document why each external script exists. Load analytics/ads only through controlled integration. Never let an admin user execute untrusted JavaScript through a generic HTML field. AdSense uses a controlled provider/slot model. Follow Google's policies.

## 11. Privacy [CRITICAL]

Collect only data the stated feature needs. Do not secretly log uploaded files or private user content, collect unnecessary URLs, profile users, or add hidden telemetry. Prefer local/browser processing for browser-local tools. Privacy claims must match actual implementation.

## 12. Analytics

Potential events: tool_open, tool_start, tool_complete, download, upload, qr_generate, qr_scan. Avoid unnecessary PII. Analytics must never weaken security or privacy.

## 13. SEO / AEO / GEO

**Implement:** title/meta, canonical, sitemap, robots.txt, Open Graph, structured data where accurate, breadcrumbs, useful FAQ content, internal links, fast/mobile-friendly pages.

**Possible schema:** Organization, WebSite, BreadcrumbList, SoftwareApplication where accurate, Article for blog content.

**AI discoverability:** clear factual content, crawlable public pages, useful tool descriptions; `llms.txt` is supplementary documentation only, never a ranking guarantee.

## 14. Ads Manager & Monetization

Admin eventually supports a controlled Google AdSense manager. Fields may include publisher ID, ad unit ID, placement, device, width/height, priority, status, page targeting. **[CRITICAL]** Never execute arbitrary pasted JavaScript — use a controlled integration model and validate all configuration. Any monetization path beyond controlled ads (see Phase 12) goes through Change Control (§19).

## 15. Blog CMS

Support draft/published/scheduled states, categories, tags, featured image, SEO fields, canonical, Open Graph, structured data, internal links, related tools. Avoid mass-produced low-value content.

## 16. Backups

Plan automatic backups, manual backup, backup history, restore, restore authorization, restore testing. **[CRITICAL]** A backup is not verified until restore testing succeeds.

## 17. Testing Gate

Before every meaningful commit: typecheck → unit tests → build → security checks → dependency audit when relevant → inspect Git diff → confirm no secrets → confirm no unrelated changes. Add E2E tests (Playwright when appropriate) for important workflows.

**[CRITICAL]** Report every check as exactly one of: `PASS` / `FAIL` / `SKIPPED` / `UNKNOWN`. Never report an unrun test as passed, and never report `UNKNOWN` as `PASS`.

## 18. Git Workflow [CRITICAL]

Run `git status` before changes, `git diff` after. Before commit: tests pass, security scan reviewed, no secrets, no unrelated files, docs updated if architecture changed. Commit prefixes: `feat:`, `fix:`, `test:`, `security:`, `docs:`, `refactor:`. Never force-push or delete user work without explicit approval.

## 19. Change Control [CRITICAL]

For architecture, permissions, privacy, security, database, authentication, or paid-service changes: inspect → explain risk → propose smallest safe change → implement → test → security review → diff review → report. Never silently weaken security for convenience.

## 20. Required Final Report

After each task: what changed, files changed, tests run, test results (PASS/FAIL/SKIPPED/UNKNOWN), security checks, Git diff summary, known limitations, recommended next step.

## 21. Definition of Done

Done means: implementation works, tests pass, build passes, security risks reviewed, no secrets exposed, responsive behavior checked where UI changed, docs updated when needed, Git diff reviewed.

The goal is not maximum code. The goal is:
**SECURE → SIMPLE → TESTED → FAST → USEFUL → SCALABLE.**

## 22. Ecosystem & Scalability [FUTURE]

Longer-horizon considerations that inform decisions today without being built today: multi-region Cloudflare scaling, caching layers, a possible public API (Phase 13), and only splitting the modular monolith into separate services if real load/ownership evidence — not speculation — requires it.

## 23. UI/UX Design Direction — Homepage Visual Reference

A user-provided screenshot (MyQRCode.com homepage) is accepted as a **layout/UX reference only**, never as a branding or design source. **[CRITICAL]** Codivio's own confirmed branding and color system always take priority — never copy the reference's branding, colors, or design: dark navy / deep blue primary, blue/teal accent, orange/gold accent, white and light backgrounds, a premium/modern/clean tone, rounded cards, soft shadows, generous whitespace, responsive layout.

**Header:** logo on the left, search centered or otherwise well-placed, primary navigation and a language switch on desktop, a CTA where useful. **[REQUIRED]** Desktop navigation must not be crammed into mobile — mobile uses a separate right/side sidebar navigation with comfortable touch targets, preserving hamburger/menu accessibility.

**Hero / main content:** headline and short description on the left, the primary tool-selection/content area, and an **Advertisement area** on the right in place of any phone/device mockup. **[CRITICAL]** No phone/device mockup visuals. The ad area is a UI placeholder/component for now; **[FUTURE]** it becomes controllable via Admin Panel (slot on/off, placement, desktop/mobile visibility, ad code/config, campaign data) per §14 — do not build that backend now.

**Tool presentation:** the Homepage must never render the full Tool Registry — only a curated selection (the `featured`/`popular`/`qr`/`pdf`-style flag pattern already in use). **[CRITICAL]** The registry (34+ tools, growing) is never trimmed to produce this selection; Homepage presentation stays a separate, independently managed view over the full registry per §6.

**Existing Homepage sliders are the established structure — keep them:** Popular Tools, QR Tools, PDF Tools, Blog. Each stays horizontal, responsive across desktop/tablet/mobile, touch/swipe-capable, scroll-snap based, with navigation buttons and accessibility (`role="region"`, `aria-label`s, keyboard focus) — matching what is already built.

**[CRITICAL] Reference-image discipline:** take from a reference screenshot only what is explicitly requested. Never copy it wholesale, never add elements it wasn't asked to inspire, never remove existing Codivio functionality, tools, or routing to chase visual similarity. A reference screenshot is not a Codivio branding asset, not a logo reference, and not something to exact-copy — it is layout/spacing/card-presentation/hierarchy/UX inspiration only. Codivio's own official logo and branding always take priority over it.

**Future Admin compatibility (architecture-only, not implementation) [FUTURE]:** write Homepage-related code so the following stay config/DB-driven and code-free to change once an Admin Panel exists — Popular/QR/PDF Tools selection and ordering, tool active/inactive and Homepage visibility, Advertisement slots, Blog preview, Homepage text/content, SEO metadata, and other site settings (ties into §7 Admin Panel and §14 Ads Manager & Monetization). Do not build the Admin Panel or its backend now — only avoid decisions that would block it later.

**Statistics principle [CRITICAL]:** never guess or fabricate a statistic. Daily/monthly/yearly tool usage, per-tool usage, traffic, users, conversions, errors, revenue, and ad performance are only ever computed from real database/event/analytics data once that infrastructure exists. Fake, random, or static numbers must never be presented as real data.

**Development order [CRITICAL]:** this Design Direction informs future UI work but does not change the phase roadmap (§4). Do not start a new major phase before the current one is done, and do not pre-implement future phases unless the user explicitly asks — the existing development order stands.

## 24. Project Memory System [CRITICAL]

Project memory lives in files, not conversation history: `PROJECT_STATE.md` (current state), `DECISIONS.md` (approved architectural/product decisions), `CHANGELOG.md` (checkpoint history). A new session reads `PROJECT_STATE.md` first, then this file, then `DECISIONS.md`; read `CHANGELOG.md` only when historical context is needed.

**Actual code, tests, and Git state always override stale memory.** If a memory file conflicts with reality, report the conflict and treat the real project state as authoritative — then update the memory file. Update `PROJECT_STATE.md` and add a `CHANGELOG.md` entry at meaningful checkpoints; update `DECISIONS.md` only when a genuinely new decision was made. Use the `codivio-memory` skill for the read/update workflow — it governs the memory files, not the rules in this document.

## Mandatory ChatGPT Phase Handoff Report

**[CRITICAL]** At the end of every Phase or Subphase, produce a structured handoff report specifically for ChatGPT review, in addition to whatever other report format the task itself requested.

**The report MUST contain**, in this order:
- Phase identity
- Current roadmap position
- Previous completed phases
- Work completed
- Files created/modified/deleted
- Database/data changes
- Architecture changes
- SEO results when relevant
- AI/GEO results when relevant
- Security/privacy/policy results
- Test results
- Typecheck
- Build
- Regression status
- Performance/bundle impact when relevant
- External/live verification
- Environment limitations
- Deferred work
- New findings for future phases
- Roadmap impact
- Git/commit/push/deploy status
- Acceptance criteria
- Recommended next step
- ChatGPT review notes

**[CRITICAL] Never invent:** metrics, keyword volume, CPC, keyword difficulty, traffic, rankings, impressions, clicks, test results, deployment status, external verification, API results, or security results.

- If information is unavailable, write exactly: `UNKNOWN — NOT VERIFIED`.
- If something does not apply, write exactly: `N/A — NOT APPLICABLE`.
- Clearly distinguish, per item, one of: `IMPLEMENTED`, `VERIFIED`, `DEFERRED`, `UNKNOWN`, `ENVIRONMENT LIMITATION`, `REAL PROJECT PROBLEM`.

**[CRITICAL]** Do not silently move, reorder, skip, or merge Codivio roadmap phases.

**New findings for future phases:** every new finding that may affect a future phase must be listed under a heading titled exactly `NEW FINDINGS FOR FUTURE PHASES`, and each finding must include:
- Finding
- Importance: HIGH / MEDIUM / LOW
- Affected Phase
- Recommended future action
- Dependency

**[CRITICAL]** Future-phase work must NOT be implemented early unless the current Phase explicitly requires it. Preserve previous Phase decisions and do not repeat completed work unnecessarily.

**Testing rule (reaffirmed, see §17):** one appropriate test per topic; run a second only if the first fails or genuine uncertainty exists; never repeatedly run identical successful tests.

**Copy-friendly block [CRITICAL]:** every report must end with exactly this block:

```
===== CHATGPT COPY START =====

[COMPLETE HANDOFF REPORT]

===== CHATGPT COPY END =====
```

**[CRITICAL]** Nothing may appear after `===== CHATGPT COPY END =====`. The block must contain the complete report, not merely a summary. The report must state the exact current Phase and the next Phase.

**If the roadmap itself was changed**, explicitly report: what changed, why, the affected Phase, the dependency, and whether ChatGPT review/approval is recommended.

**Git/release status** must always explicitly state, in exactly this form:
```
Commit created: YES / NO
Commit hash: [hash or N/A]
Push: YES / NO
Deploy: YES / NO
```

**[CRITICAL]** Never claim PASS if an acceptance criterion failed.

Before finalizing the report, cross-check it against the actual files, tests, Git state, and work actually performed.
