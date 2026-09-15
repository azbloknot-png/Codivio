# CODIVIO — DATABASE SCHEMA

## 1. Database

Codivio uses **Cloudflare D1** as its application database.

Production D1 is provisioned and connected.

The authoritative schema is maintained through:

```text
database/schema.sql
migrations/
```

## 2. Migration rule

All schema changes must use controlled migrations.

Requirements:

- never modify production schema blindly
- never destroy data through casual migrations
- verify migration order
- keep `database/schema.sql` synchronized with the migration end state
- test migrations locally where possible
- verify critical production migrations against real D1 when authorized

## 3. Core entities

The initial application schema includes the following core areas:

- categories
- tools
- pages
- seo_settings
- ad_slots
- faqs
- blog_posts
- analytics_events
- users
- audit_logs

Later migrations extend the foundation for:

- authentication/sessions
- RBAC
- settings
- pages management
- tools management

## 4. Tools and categories

The current production registry is:

- 34 tools
- 4 categories

The database tool/category registry is seeded from the real product registry.

The database and frontend registry should not silently diverge.

## 5. Users and authentication

The user system supports:

- user identity
- role
- active/deactivated state
- password authentication
- sessions
- administrative authorization

Authentication uses server-side Worker logic.

Password hashes and secrets must never be exposed to frontend code or reports.

## 6. RBAC

Authorization is server-authoritative.

Admin operations must verify:

- authenticated session
- active user
- required role/permission

Client-side route visibility is not a security boundary.

## 7. Audit logs

Administrative/security-sensitive changes should be auditable.

Audit records should preserve enough information to identify:

- actor
- action
- affected resource
- timestamp
- relevant context

Do not log passwords, session secrets or other sensitive credentials.

## 8. Settings

Settings are centrally managed.

Public-safe settings may be exposed through controlled API responses.

Private/admin settings must remain protected.

## 9. SEO data

The existing `seo_settings` table exists in the schema.

The current SEO architecture also uses source-controlled deterministic SEO data under `shared/seo/`.

Do not create a second competing SEO source of truth without an explicit architecture decision.

## 10. Pages

Pages management supports controlled page metadata/content/status through the admin architecture.

Any future user-generated HTML/content must be sanitized or structurally validated before rendering.

## 11. Tools metadata

The tool system can evolve to support:

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

These fields should only be added where justified and must not duplicate the existing registry.

## 12. Future monetization schema

The long-term monetization model may require:

- plans
- entitlements
- plan_entitlements
- user_entitlements
- usage_events
- subscriptions

Do not create all tables automatically.

Phase 3.14 should create only the minimum required foundation.

Billing and entitlement are separate concepts.

## 13. Future analytics

Real analytics may eventually store/aggregate:

- traffic
- tool usage
- processing cost
- storage
- bandwidth
- failures
- revenue
- profitability

No fabricated events or metrics.

## 14. Data integrity

Future hardening should consider database constraints for:

- user roles
- page status
- tool status
- valid foreign keys
- safe enum-like values

Do not add constraints blindly; use controlled migrations and compatibility checks.

## 15. Security

Database security requirements:

- parameterized SQL
- least-privilege access
- server-side authorization
- no client-controlled privilege escalation
- safe migration practices
- no secrets in database reports

---

# CURRENT VERIFIED PRODUCTION FACTS

- D1 database name: `codivio`
- Production D1 is connected
- Production registry: 34 tools / 4 categories
- Migration history through Phase 2 is documented in `PROJECT_STATE.md`

If this document conflicts with the actual migration files, **the migration files and real D1 state win**.
