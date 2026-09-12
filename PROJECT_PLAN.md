# CODIVIO PROJECT PLAN

## Goal
Build codivio.online as a free-first online tools platform with public website, secure admin panel, SEO, Google integrations, analytics, ads, blog and modular tools.

## Infrastructure Direction
GitHub → Cloudflare → Workers/D1/R2

Initial target: $0/minimum cost wherever practical.

## Core Architecture

apps/
  web/
  admin/

packages/
  ui/
  tools/
  ads/
  seo/
  analytics/
  core/

worker/
  api/
  auth/
  services/

database/
  migrations/
  seed/

tests/
public/

## Database Direction

users
roles
tools
categories
pages
page_sections
seo_settings
faqs
ad_slots
site_settings
analytics_events
media
audit_logs
blog_posts
blog_categories
blog_tags
blog_post_tags
redirects

Potential later:
seo_audits
keyword_targets
internal_link_suggestions
brand_entity
crawler_settings
schema_templates

## Admin Navigation

Dashboard
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

## Google Stack

- Google Search Console
- Google Analytics 4
- Google Tag Manager where justified
- Google AdSense

Credentials must remain server-side.

## Development Rule

Never build everything in one step.

Every phase must end with:
TEST → SECURITY REVIEW → BUILD → GIT DIFF → COMMIT.

## First Milestone

Clean repository + React/TypeScript/Vite + security baseline + Git workflow + working build.
