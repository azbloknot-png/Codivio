# CODIVIO MASTER PLAN

**Version:** 1.0  
**Project:** Codivio.online  
**Scope:** Phase 0 → Phase 14  
**Purpose:** Codivio layihəsinin rəsmi uzunmüddətli development roadmapı.

---

## 1. Roadmap qaydaları

- Fazalar müəyyən edilmiş ardıcıllıqla icra olunur.
- Phase dəyişdirilmir, birləşdirilmir və atlanmır.
- Hər mərhələ PASS / FAIL / DEGRADED / BLOCKED statusları ilə qiymətləndirilir.
- Hər mövzu üçün **1 uyğun test** edilir.
- Yalnız ilk test uğursuz olarsa və ya ciddi qeyri-müəyyənlik qalarsa 2-ci test edilir.
- Uğurlu testlər 4–5 dəfə təkrarlanmır.
- Saxta statistika, saxta gəlir, saxta payment, saxta subscription və uydurma performans göstəriciləri yaradılmır.
- Git commit / push / deploy ayrıca release checkpoint ilə idarə olunur.
- Security, SEO, performance, database və production readiness uyğun mərhələlərdə yoxlanılır.
- Roadmap statusları real nəticələrə əsaslanır; UNKNOWN məlumat uydurularaq PASS edilmir.
- **Sənədləşmə qaydası (`CLAUDE.md` §27-də tam mətn):** yeni bir sub-phase yarandıqda, o, öz aid olduğu Phase-in mövcud nömrələmə ardıcıllığına (məs. `4.x`) əlavə olunur — mövcud işlər lazımsız yeni Phase-ə bölünmür, və heç bir Phase/sub-phase səssiz yaradılmır və ya silinmir. Yeni Phase yaradılması yalnız aydın əsaslandırma ilə mümkündür. Hər tapşırıqdan sonra bu fayl, `CLAUDE.md`, `PROJECT_STATE.md` və `CHANGELOG.md`-in birlikdə yenilənib-yenilənmədiyi son hesabatda göstərilməlidir.

---

# PHASE 0 — Foundation & Project Setup

### 0.1 Məqsəd, scope və məhsul strategiyası
### 0.2 Texniki stack və modular-monolith arxitekturası
### 0.3 Git / repository / branch / change-control
### 0.4 CLAUDE.md, project memory və agent workflow
### 0.5 Environment və secrets
### 0.6 Namecheap + Cloudflare + DNS
### 0.7 D1 database və migration foundation
### 0.8 Logging, error handling və security baseline
### 0.9 Build / test foundation
### 0.10 Foundation audit və checkpoint

---

# PHASE 1 — Public Website MVP

### 1.1 Public architecture və routing
### 1.2 Codivio branding və design system
### 1.3 Homepage + Hero
### 1.4 Homepage-də 12 əsas tool
### 1.5 Tool cards və responsive carousel sistemi
### 1.6 Tools index və tool routing
### 1.7 Header / Footer / Navigation
### 1.8 Desktop / Tablet / Mobile responsive UX
### 1.9 About / Contact / Privacy / Terms / Cookies
### 1.10 Public MVP QA və release

---

# PHASE 2 — Admin, Authentication & Management Foundation

### 2.1 Admin Architecture Audit
### 2.2 Worker + D1 Foundation
### 2.3 Authentication + Sessions
### 2.4 Admin UI + Protected Route
### 2.5 RBAC
### 2.6 Audit Logging
### 2.7 Settings Foundation
### 2.8 Project Memory System
### 2.9 Pages Management
### 2.10 Tools Management
### 2.11 Admin Security + Final Tests
### 2.12 Phase 2 Final Checkpoint
### 2.13 Admin/Public UI integration follow-up
### 2.14 Multilingual UI Foundation
### 2.15 Release + Responsive Tool Carousels

**Historical checkpoint:** Phase 2 tamamlandıqda ümumi Master Plan üçün əvvəlcədən **20% checkpoint** müəyyən edilmişdir.

---

# PHASE 3 — SEO, AI SEO & Discoverability

### 3.1 SEO Foundation + Rendering Diagnostic
### 3.2 Complete Page & Tool SEO Metadata
### 3.3 Keyword & Search Intent Strategy
### 3.4 Structured SEO Content Architecture
### 3.5 AI-Structured Content / AI Discoverability / GEO
### 3.6 Internal Linking Architecture
### 3.7 Schema.org / Structured Data
### 3.8 Technical SEO + Performance
### 3.9 E-E-A-T + Trust
### 3.10 Competitor SEO Gap Analysis
### 3.11 Backlink / Off-Page SEO Strategy
### 3.12 Google Search Console + Search Performance
### 3.13 SEO Content Expansion + Topical Authority
### 3.14 Free Tool → Premium Monetization Funnel
### 3.15 Professional SEO + AI SEO Master Audit

### 3.16 GA4 Analytics Foundation

Phase 3-ün öz təsviri ("Google / SEO / Analytics... GA4/GTM where appropriate") artıq bu işi nəzərdə tuturdu — 3.15-dən sonra, ayrıca, aydın şəkildə əhatə edilmiş tapşırıqla yerinə yetirildi (Phase 3 rəsmi bağlandıqdan — 2026-09-17 — sonra). gtag.js əsaslı GA4 inteqrasiyası, SPA route-dəyişikliklərinə uyğun `page_view` izlənməsi, yalnız `codivio.online` apex domenində işləmə, `/admin` marşrutlarının istisna edilməsi, CSP-nin minimal genişləndirilməsi (yalnız Google-un rəsmi sənədləşdirdiyi host-lar, `unsafe-inline`/`unsafe-eval` olmadan). Görün: `PROJECT_STATE.md`-in "GA4 Analytics Foundation status (Phase 3.16)" bölməsi tam detal üçün.

### 3.17 Cookie Consent & Privacy Foundation

3.16-nın birbaşa davamı — genişləndirilə bilən, privacy-conscious cookie consent sistemi (banner, Cookie Settings modalı, 4 kateqoriya: Necessary/Analytics/Advertising/Preferences), GA4-ü consent-ə bağlayır (razılıq olmadan GA4 script belə yüklənmir), `/cookies` səhifəsini real davranışa uyğunlaşdırır. Advertising/Preferences kateqoriyaları yalnız gələcək texnologiyalar üçün struktur kimi mövcuddur, hələ funksional deyil. Görün: `PROJECT_STATE.md`-in "Cookie Consent & Privacy Foundation status (Phase 3.17)" bölməsi tam detal üçün.

### 3.18 HTML Site Map (Human-Readable Sitemap Page)

Codivio-nun texniki SEO auditləri zamanı (Phase 4.9-dan sonrakı ayrıca SEO review) tapılan bir boşluğu bağlayır: `public/sitemap.xml` yalnız maşın-oxunaqlı formatdadır, saytda real ziyarətçilər üçün insan-oxunaqlı bir sayt xəritəsi yox idi. Yeni `/sitemap` route-u (`src/App.tsx`-də `SitemapPage`) 6 kateqoriya kartı ilə (Main Pages, Tools, Blog, Information, Legal & Policies, Resources) bütün real səhifə və 34 aləti göstərir — Tools kartı birbaşa mövcud `tools[]`/`categories` registrindən generasiya olunur (əl ilə yazılmış link yoxdur). Hər hazır olmayan (`status: "coming-soon"`) alət üçün aydın **"Coming soon"** etiketi göstərilir ki, istifadəçidə bütün alətlərin hazır olduğu təəssüratı yaranmasın. `shared/seo/pages.ts`-ə yeni `PAGE_SEO.sitemap` girişi (`index,follow`, 3 dildə real, differensasiya olunmuş mətn), `shared/seo/schema.ts`-ə statik səhifələr üçün opt-in `BreadcrumbList` dəstəyi (yalnız `/sitemap` üçün aktivdir, digər 10 səhifəyə təsir etmir) əlavə olundu. `/sitemap` özü də `public/sitemap.xml`-ə əlavə edilib (`priority: 0.5`, `changefreq: monthly` — `/faq`/`pricing` ilə eyni səviyyə). Bu sub-phase həmçinin `shared/seo/content.ts`-in content-status-consistency düzəlişini (2 canlı QR alətinin öz səhifələrində yanlış "hələ hazır deyil" mətninin göstərilməsi) və `public/sitemap.xml`-in XSLT vizual dizaynını (`public/sitemap.xsl`/`sitemap.css` — brauzerdə açıldıqda Codivio brend görünüşü, axtarış sistemləri üçün XML strukturu dəyişmədən) əhatə edir. Görün: `PROJECT_STATE.md`-in "HTML Site Map status (Phase 3.18)" bölməsi tam detal üçün.

### 3.19 Human-Readable Robots Policy Page

`/sitemap`-in eyni ideyasının `robots.txt`-ə tətbiqi: `public/robots.txt` maşın-oxunaqlı, plain-text formatda qalır (heç bir baytı dəyişməyib), amma yeni `/robots` route-u (`src/App.tsx`-də `RobotsPage`) real ziyarətçilər üçün onun izahını verir — nə üçün mövcuddur, hansı botlara nə icazə var, sitemap ünvanı haradadır. Drift-təhlükəsizlik üçün heç bir qayda əl ilə təkrar yazılmayıb: `RobotsPage` `/robots.txt` faylını runtime-da fetch edir və yeni `shared/seo/robots-policy.ts`-in xalis (`parseRobotsTxt`) parser-i ilə emal edir — beləliklə fayl dəyişəndə səhifə avtomatik uyğunlaşır, ikinci, müstəqil saxlanılan surət heç vaxt yaranmır. Kartlar: Sitemap Reference, Allowed Crawling Areas, Disallowed Areas, User-agent Groups (hər bot öz tam qayda dəstəsi ilə), Robots.txt Raw File. `shared/seo/pages.ts`-ə yeni `PAGE_SEO.robots` girişi (`index,follow`, 3 dildə real mətn — `/sitemap`-lə eyni qərar: qısa, faydalı, unikal məzmun), `shared/seo/schema.ts`-ə `/sitemap`-in eyni opt-in `BreadcrumbList` nümunəsi (Home → Robots Policy) əlavə olundu. `/robots` özü də `public/sitemap.xml`-ə əlavə edilib (`priority: 0.5`, `changefreq: monthly` — `/sitemap` ilə eyni səviyyə; bu, mövcud testin "hər PAGE_SEO path-i sitemap.xml-də olmalıdır" qaydasının tələbidir). Görün: `PROJECT_STATE.md`-in "Robots Policy Page status (Phase 3.19)" bölməsi tam detal üçün.

### 3.21 GA4 Konfiqurasiya Sərtləşdirilməsi + Ümumi Alət-Həyat-Dövrü Hadisələri

GA4 artıq tətbiq olunub və canlıdır (Phase 3.16) — bu sub-phase onu sıfırdan qurmur, yalnız konfiqurasiyasını sərtləşdirir və real hadisə-örtük boşluğunu bağlayır. İki dəyişiklik: (1) `GA4_MEASUREMENT_ID` `src/lib/analytics.ts`-də əl ilə yazılmış sabitdən `import.meta.env.VITE_GA4_MEASUREMENT_ID`-yə keçirildi (yeni `src/vite-env.d.ts`, `.env.example`-də sənədləşdirilib) — format təsdiqlənir, dəyişən yoxdursa/səhvdirsə `enableAnalytics()` tam təhlükəsiz heç nə etmir (`gtag.js` heç vaxt yüklənmir, `dataLayer` heç vaxt başladılmır) ki, fork/staging build heç vaxt Codivio-nun öz GA4 profilinə real hadisə göndərməsin. (2) Yeni `src/lib/tool-analytics.ts` CLAUDE.md §12-nin adlandırdığı, Phase 4.9-un QR-spesifik `qr_generate`/`qr_scan`-ının əhatə etmədiyi 4 ümumi, alət-ailəsindən-asılı-olmayan hadisəni əlavə edir: `tool_open` (bütün 34 alət səhifəsi, `src/pages/ToolPage.tsx` vasitəsilə), və `tool_start`/`tool_complete`/`download` (yalnız 2 canlı QR aləti, real, artıq mövcud istifadəçi əməllərində — ilk real giriş, uğurlu generate/scan və uğurlu PNG/JPG/SVG ixracı — 32 hələ-placeholder alət üçün heç vaxt uydurulmayıb). Görün: `PROJECT_STATE.md`-in "GA4 Configuration Hardening (Phase 3.21)" bölməsi tam detal üçün.

### 3.x Release / Live Verification Checkpoints

Phase 3 tamamlandıqdan sonra bütün Master Plan üzrə çəkili tamamlanma faizi yenidən hesablanmalıdır.

---

# PHASE 4 — QR Tools

### 4.1 Shared QR Engine
### 4.2 QR Code Generator
### 4.3 URL to QR Code
### 4.4 WiFi QR Code
### 4.5 vCard QR Code
### 4.6 QR Code Scanner
### 4.7 QR Customization + Export
### 4.8 Validation / Security / Abuse Controls
### 4.9 QR Analytics Architecture

Phase 3.16/3.17-də quraşdırılmış consent-aware GA4 inteqrasiyasının üzərində — yeni Admin Analytics dashboard (Phase 9.4) və ya yeni D1 cədvəli deyil, `CLAUDE.md` §12-də adlandırılmış `qr_generate`/`qr_scan` hadisələrinin arxitekturası. `src/lib/analytics.ts`-ə generic, consent-aware `trackEvent(name, params)` əlavə olundu (eyni `initialized`/`disabled`/production-host/`/admin` mühafizələri ilə). Yeni, ayrıca `src/lib/qr-analytics.ts` faylı `trackQrGenerate(kind)`/`trackQrScan(kind)` tipli wrapper-lərini təqdim edir — hər ikisi yalnız qapalı literal union ("text"|"url"|"wifi"|"vcard" generasiya üçün; `shared/qr/classify.ts`-in `ScannedQrContentKind`-i skan üçün) qəbul edir, heç vaxt xam mətn/decode edilmiş məzmun deyil — bu, tip səviyyəsində məcburiyyətdir, sadəcə konvensiya deyil. `QrCodeGeneratorTool.tsx`/`QrCodeScannerTool.tsx` uğurlu generasiya/skan nöqtələrində bu funksiyaları çağırır. Görün: `PROJECT_STATE.md`-in "QR Analytics Architecture status (Phase 4.9)" bölməsi tam detal üçün.

### 4.10 QR Tools QA + Production Release

Phase 4.1–4.9-un tam istehsalat QA/release audit-i — yeni kod yazılmayıb, yalnız Master Plan/repo state uyğunluğu, QR Generator/Scanner funksionallığı, analitika, validasiya/təhlükəsizlik, SEO/indeksləmə, bundle ölçüsü, test/typecheck/build və canlı production vəziyyəti bir dəfə tam yoxlanılıb. Nəticə: **PASS**, heç bir blocking tapıntı yoxdur. Audit zamanı `PROJECT_STATE.md`-də Phase 4.9-un status sətirlərinin köhnəlmiş ("hələ commit edilməyib") olduğu aşkarlandı və real Git tarixçəsinə əsasən düzəldildi (`CLAUDE.md` §24-ün override qaydası). Görün: `PROJECT_STATE.md`-in "QR Tools QA + Production Release status (Phase 4.10)" bölməsi tam detal üçün.

---

# PHASE 5 — PDF Tools

### 5.1 PDF Processing Architecture
### 5.2 PDF Merge
### 5.3 PDF Split
### 5.4 PDF Compress
### 5.5 PDF to Word
### 5.6 File Type / Size Validation
### 5.7 Secure Temporary File Lifecycle
### 5.8 PDF Processing Performance
### 5.9 PDF Tools QA + Production Release

---

# PHASE 6 — Image Tools

### 6.1 Image Processing Architecture
### 6.2 Image Resize
### 6.3 Image Compress
### 6.4 Image Converter
### 6.5 Background Remover
### 6.6 Format / Size Validation
### 6.7 Image Processing Resource Limits
### 6.8 Image Tools QA + Production Release

---

# PHASE 7 — Ads & Google AdSense Manager

### 7.1 Monetization Policy Audit
### 7.2 AdSense Readiness
### 7.3 Ad Slot Architecture
### 7.4 Admin Ad Management
### 7.5 Desktop / Mobile Ad Placement
### 7.6 Activation / Visibility Controls
### 7.7 Policy-Safe Ad / Content Separation
### 7.8 Ad Performance / Event Measurement
### 7.9 AdSense Production Validation

---

# PHASE 8 — Blog CMS & Content Engine

### 8.1 Blog Data Model
### 8.2 Admin Blog CRUD
### 8.3 Categories / Tags / Content Status
### 8.4 Author / Date / Editorial Metadata
### 8.5 Blog Listing + Post Pages
### 8.6 Blog SEO / Schema / Internal Links
### 8.7 AI-Readable Topical Content Structure
### 8.8 Editorial Workflow + Content Quality Controls
### 8.9 Blog Production Release

---

# PHASE 9 — Analytics, Backups & System Health

### 9.1 First-Party Analytics / Event Architecture
### 9.2 Traffic / Source / Device / Tool Analytics
### 9.3 Revenue & Monetization Analytics
### 9.4 Admin Analytics Dashboard
### 9.5 System Health Dashboard
### 9.6 Error / Incident Monitoring
### 9.7 Automated Backups
### 9.8 Google Cloud Storage Backup / Restore
### 9.9 Restore Testing + Disaster Recovery
### 9.10 Scheduled Reports / Exports
### 9.11 Phase 9 Reliability Audit

---

# PHASE 10 — Optimization & Scale

### 10.1 Real Production Performance Baseline
### 10.2 Core Web Vitals Optimization
### 10.3 Critical-First + Selective Lazy Loading
### 10.4 Code Splitting / Route-Level Loading
### 10.5 Image / Font / Cache Optimization
### 10.6 Worker / DB / Query Optimization
### 10.7 Queue / Background Processing Where Justified
### 10.8 Capacity Tests: 100K → 50M+ Monthly Visitors
### 10.9 CPU / RAM / DB / Storage / Bandwidth / Error / Cost Analysis
### 10.10 Scaling / Infrastructure Upgrade Decision
### 10.11 Reliability + Cost Optimization

## Performance requirement

Codivio-nun **ilk açılışı maksimum sürətli** olmalıdır.

- İlk viewport və LCP üçün kritik content gecikdirilməməlidir.
- Critical CSS/JS və ilkin görünən content prioritetli yüklənməlidir.
- Yalnız qeyri-kritik, aşağıda yerləşən və ilk açılış üçün lazım olmayan ağır JS/data/component-lər selective lazy-load ilə sonraya keçirilməlidir.
- Lazy-load qərarı yalnız bundle ölçüsünə əsaslanmamalıdır.
- FCP, LCP, INP və CLS əsas göstəricilər kimi izlənməlidir.
- Mobil initial load ayrıca prioritetdir.
- Phase 10-da real production performance və Google PageSpeed Insights / Lighthouse metodologiyası ilə optimallaşdırma aparılmalıdır.
- Phase 3.15-də performance/SEO master audit zamanı da bu prinsip yoxlanılmalıdır.

---

# PHASE 11 — Extended Tools

### 11.1 PDF Merge / Split / Compress Expansion
### 11.2 Image Compress / Advanced Conversion Expansion
### 11.3 Video Converter
### 11.4 GIF Maker
### 11.5 Meme Generator
### 11.6 Color Palette Generator
### 11.7 Additional Background / Image Utilities
### 11.8 Tool Registry + Homepage Selection Expansion
### 11.9 Extended Tools QA + Policy Review

---

# PHASE 12 — Monetization Expansion

### 12.1 FREE / PRO / BUSINESS Entitlement Expansion
### 12.2 Usage Quotas + Premium Limits
### 12.3 Real Payment Provider Integration
### 12.4 Checkout + Subscription Lifecycle
### 12.5 Webhook Verification + Entitlement Synchronization
### 12.6 Payment Failure / Cancellation / Refund Handling
### 12.7 Premium Tool Gating
### 12.8 Affiliate Architecture + Disclosure
### 12.9 Revenue Analytics
### 12.10 Monetization Security + Policy Audit

**Qayda:** Real payment provider yalnız ayrıca authorization olduqda inteqrasiya edilir.

---

# PHASE 13 — Public API & Ecosystem

### 13.1 Public API Architecture
### 13.2 API Authentication + API Keys
### 13.3 Rate Limits + Quotas
### 13.4 API Usage Metering
### 13.5 Developer Documentation
### 13.6 API Plans + Entitlements
### 13.7 Webhooks Where Justified
### 13.8 API Security + Abuse Prevention
### 13.9 Developer Onboarding
### 13.10 API Production Release

---

# PHASE 14 — Scale & Reliability Hardening

### 14.1 Full Production Architecture Audit
### 14.2 Security Hardening + Penetration-Oriented Review
### 14.3 Database Resilience + Migration Safety
### 14.4 Queue / Job Reliability
### 14.5 Observability + Alerting
### 14.6 Backup / Restore Disaster-Recovery Drill
### 14.7 High-Traffic Load / Capacity Validation
### 14.8 Multi-Region / CDN Strategy Where Justified
### 14.9 Cost Governance + SLO / SLA Readiness
### 14.10 Final Production Readiness Audit
### 14.11 Long-Term Roadmap + Next-Generation Architecture

---

# CROSS-PHASE ARCHITECTURE REQUIREMENTS

## Authentication & Users

Long-term model:

- User
- FREE
- PRO
- BUSINESS
- API
- Central entitlement system
- Usage/quota system
- Admin/RBAC

Premium status server-authoritative olmalıdır.

Client-side:

- localStorage
- query parameter
- cookie
- request body

ilə plan dəyişdirilməsi mümkün olmamalıdır.

---

## Tool Registry

Tool registry gələcəkdə aşağıdakı metadata-nı dəstəkləyə bilməlidir:

- active
- monetizable
- ads_allowed
- affiliate_allowed
- policy_category
- requires_review
- seo_indexable
- user_generated_content
- risk_level
- required_plan
- usage_cost

Mövcud registry təkrarlanmamalıdır.

---

## Analytics

Real data olmadan aşağıdakılar yaradılmamalıdır:

- visitors
- users
- revenue
- MRR
- ARR
- conversion rate
- ARPU
- LTV
- usage statistics

Gələcək analytics real DB/event/analytics/billing məlumatlarından qidalanmalıdır.

---

## Social Integrations

Gələcəkdə:

- Instagram
- Facebook
- YouTube
- TikTok
- X
- digər uyğun platformalar

yalnız rəsmi API/webhook və real authorization imkanları ilə inteqrasiya ediləcək.

Real / near-real-time metric və referral data göstərilməlidir.

Statistika təxmin edilməməlidir.

---

## SEO / AI SEO

Uzunmüddətli SEO sistemi:

- robots.txt
- sitemap.xml
- canonical
- hreflang
- metadata
- Open Graph
- Twitter/X metadata
- Schema.org
- Organization
- WebSite
- WebPage
- BreadcrumbList
- SoftwareApplication / uyğun tool schema yalnız həqiqətən əsaslandırıldıqda
- AI-friendly content
- AI crawler policy
- AI discoverability / GEO
- internal linking
- topical authority
- backlinks
- Google Search Console

üzərində inkişaf etdirilir.

---

## Monetization Policy

Codivio monetization sistemi:

- Google Publisher Policies
- deceptive UX-dan qorunma
- fake scarcity-dən qorunma
- fake testimonials olmaması
- fake metrics olmaması
- fake download/upgrade düymələrinin olmaması
- ad/content separation
- affiliate disclosure
- real user value

prinsiplərinə uyğun qurulmalıdır.

---

# MASTER PLAN WEIGHT / PERCENTAGE RULE

Master Plan-da 15 əsas phase var:

**Phase 0 → Phase 14**

Lakin phase-lər eyni çəkidə qəbul edilməməlidir.

Dəqiq ümumi faiz hesablamaq üçün:

1. Hər əsas phase-ə weight təyin edilir.
2. Lazım gəldikdə hər yarım-fazaya ayrıca weight verilir.
3. Yalnız real PASS olan işlərin çəkisi tamamlanmış hesab edilir.
4. FAIL / BLOCKED işlər tamamlanmış sayılmır.
5. DEGRADED ayrıca qiymətləndirilir.
6. UNKNOWN məlumat tamamlanmış kimi hesablanmır.
7. Phase 2 üçün əvvəlcədən müəyyən edilmiş **20% checkpoint** qorunur.
8. Phase 3 tam bitdikdən sonra bütün Master Plan üzrə çəkili faiz yenidən hesablanır.

---

# CURRENT ROADMAP POSITION

- Phase 0 — COMPLETE / historical
- Phase 1 — COMPLETE / historical
- Phase 2 — COMPLETE
- Phase 3.1–3.13 — PASS
- Phase 3.14 — CURRENT
- Phase 3.15 — NEXT
- Phase 4–14 — FUTURE

**Production:** Phase 3.13 dəyişiklikləri ayrıca release checkpoint-dən keçməlidir; production statusu yalnız real deployment ilə dəyişdirilir.

---

# CHANGE CONTROL

Roadmap-a yeni böyük funksiya əlavə edilərsə:

1. Mövcud phase-lər pozulmur.
2. Əvvəl uyğun phase/subphase müəyyən edilir.
3. Əgər ayrıca phase lazımdırsa, roadmap revision yaradılır.
4. Mövcud numbering mümkün qədər qorunur.
5. Yeni tələb başqa phase-in işini gizli şəkildə əvəz etmir.
6. Security və production riskləri ayrıca qeyd olunur.

---

# CLAUDE EXECUTION RULE

Claude hər phase üçün:

1. Current architecture audit
2. Scope confirmation
3. Implementation
4. Targeted tests
5. Typecheck
6. Build
7. Regression check
8. Git status
9. New findings
10. Acceptance criteria
11. Mandatory ChatGPT Handoff

hazırlamalıdır.

Phase tamamlanmadan növbəti phase başlanmamalıdır.

---

# MANDATORY CHATGPT HANDOFF

Hər phase sonunda:

```text
===== CHATGPT COPY START =====

[COMPLETE HANDOFF REPORT]

===== CHATGPT COPY END =====
```

İşarədən sonra heç bir mətn olmamalıdır.

Handoff minimum bunları əhatə etməlidir:

1. Phase
2. Status
3. Objective
4. Architecture
5. Implementation
6. Database
7. Security
8. SEO
9. AI/GEO
10. UX/accessibility
11. Performance
12. Tests
13. Typecheck
14. Build
15. Regression
16. Git changes
17. Unrelated WIP
18. Production status
19. New findings
20. Deferred issues
21. Roadmap integrity
22. Acceptance criteria
23. Recommended next step
24. ChatGPT review notes

---

# END OF CODIVIO MASTER PLAN
