# CODIVIO — SEO STRATEGY

## 1. Objective

Build durable search visibility for Codivio through technically correct SEO, useful tool content, topical authority, AI discoverability and real product quality.

SEO must never depend on fake content, fabricated metrics or unsupported structured data.

## 2. Phase 3 sequence

1. SEO Foundation + Rendering Diagnostic
2. Complete Page & Tool SEO Metadata
3. Keyword & Search Intent Strategy
4. Structured SEO Content Architecture
5. AI-Structured Content / AI Discoverability / GEO
6. Internal Linking Architecture
7. Schema.org / Structured Data
8. Technical SEO + Performance
9. E-E-A-T + Trust
10. Competitor SEO Gap Analysis
11. Backlink / Off-Page SEO Strategy
12. Google Search Console + Search Performance
13. SEO Content Expansion + Topical Authority
14. Free Tool → Premium Monetization Funnel
15. Professional SEO + AI SEO Master Audit

## 3. Current SEO architecture

Centralized under:

```text
shared/seo/
src/seo/
public/
```

Current areas include:

- site metadata
- page metadata
- tool metadata
- keywords
- intent
- content blueprints
- AI/GEO profiles
- internal links
- schema graphs
- robots.txt
- sitemap.xml
- llms.txt

## 4. Metadata

Each relevant public page should have appropriate:

- title
- meta description
- canonical
- Open Graph
- Twitter/X metadata
- language information

Do not create duplicate or misleading metadata.

## 5. Content

Tool content should answer real user intent.

Tool pages should provide:

- what the tool does
- value proposition
- benefits
- how it works
- use cases
- FAQ
- related tools
- trust/privacy context

Content must accurately reflect implementation status.

## 6. Internal linking

Use a centralized relationship model.

Related links must:

- point to valid routes
- avoid self-links
- avoid duplicates
- use localized anchors
- reflect topical relationships

Breadcrumbs should remain consistent between visible UI and structured data.

## 7. Structured data

Use only schemas justified by actual page/entity content.

Current architecture supports:

- Organization
- WebSite
- WebPage
- AboutPage
- ContactPage
- CollectionPage
- BreadcrumbList

Tool pages should not be represented as SoftwareApplication/WebApplication unless the real product state and requirements justify it.

Do not create:

- fake ratings
- fake reviews
- fake offers
- fake prices
- unsupported Product schema

## 8. AI discoverability / GEO

AI-readable architecture should include:

- deterministic tool profiles
- category profiles
- canonical questions/answers
- clear site identity
- AI crawler policy
- llms.txt where maintained
- readable page content

No claim should be made that AI crawler rules guarantee AI visibility.

## 9. Technical SEO

Monitor:

- crawlability
- robots.txt
- sitemap.xml
- canonical consistency
- HTTPS
- status codes
- rendered content
- mobile performance
- Core Web Vitals
- JavaScript bundle size
- image size
- caching

## 10. Rendering

The current application is a client-rendered SPA.

Per-page SEO/schema is applied through the client application.

CSR crawlability remains an architectural issue to evaluate with real evidence. SSR/SSG should not be introduced speculatively; use Search Console/crawl evidence and controlled change management.

## 11. Performance + SEO

Initial load is critical.

For SEO and UX:

- LCP content must be discoverable early
- first viewport should not be delayed by unnecessary lazy loading
- non-critical heavy content can be deferred
- route-level/code splitting should be used where beneficial
- FCP/LCP/INP/CLS should guide decisions

## 12. Trust / E-E-A-T

Maintain honest:

- About
- Contact
- Privacy
- Terms
- Cookies

Do not fabricate:

- reviews
- social proof
- business claims
- authors
- credentials
- support contacts

## 13. Search Console

Search Console is the authoritative source for:

- indexing status
- queries
- impressions
- clicks
- CTR
- average position
- URL inspection
- search appearance
- country/device performance

If GSC access is unavailable, report the data as UNKNOWN/BLOCKED rather than estimating.

## 14. Backlinks

Off-page strategy should prioritize:

- genuine editorial mentions
- useful tool/resource links
- Product Hunt
- AlternativeTo
- legitimate community participation
- digital PR
- original research once real usage data exists

Avoid:

- paid link schemes
- exact-match anchor manipulation
- bulk low-quality directories
- spam outreach

## 15. Topical authority

Future content should build clusters around:

- QR use cases
- PDF workflows
- image workflows
- tool comparisons/guides
- practical tutorials
- genuine product capabilities

Content expansion must follow actual tool availability and user intent.

## 16. SEO release rule

SEO changes are not production-complete until:

- tests pass
- build passes
- Git state is reviewed
- deployment is explicitly authorized
- live verification succeeds

---

# SOURCE OF TRUTH

Use `PROJECT_STATE.md` and real code/tests when current implementation differs from this strategy document.
