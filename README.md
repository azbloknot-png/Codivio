# Codovio V0.1

Initial public-site foundation for Codovio.online.

## Included

- React + TypeScript + Vite foundation
- Responsive Codovio public homepage
- QR / PDF / Image / Other tool categories
- Tool-card architecture
- Blog preview section
- SEO-ready HTML baseline
- robots.txt
- llms.txt (informational/optional; not a Google ranking mechanism)
- Initial D1/SQLite schema for tools, pages, SEO, ads, FAQ, blog, analytics, users and audit logs

## Local setup

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Then open the local Vite address shown in the terminal.

## Local quality gates

Three local Git hooks run automatically, tracked in `.githooks/` and activated via
`core.hooksPath` (set automatically by `npm install`'s postinstall check):

- **post-install** (`scripts/postinstall-check.mjs`) — light environment/dependency health
  check on every `npm install`. No build, test, or network calls.
- **pre-commit** (`scripts/pre-commit-check.mjs`) — typecheck, lint (if configured), and the
  test suite. Blocks the commit on failure; never auto-fixes or modifies files.
- **pre-push** (`scripts/pre-push-check.mjs`) — production build, full test suite, and an
  offline lockfile-consistency check. Blocks the push on failure. `npm audit` is intentionally
  not run here since it requires network access; run it manually or wire it into CI/CD later.

If hooks aren't active in an existing clone, run `git config core.hooksPath .githooks` once.

## Next implementation phase

1. Cloudflare project and D1 binding
2. Real QR Generator
3. QR Scanner
4. Admin authentication
5. Admin dashboard
6. Tool CRUD
7. SEO Manager
8. Ads Manager
9. Blog CMS
10. Analytics events
11. Automated tests
12. Production deployment to codovio.online
