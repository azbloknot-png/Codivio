PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- icon/is_popular/seo_title/seo_description/created_by/updated_by added in
-- migration 0006 (Phase 2.10 — Tools Management). See shared/tools.ts for
-- the validation these fields back. `featured` (not `is_featured`) is the
-- original Phase 0 column name, kept as-is rather than renamed.
CREATE TABLE IF NOT EXISTS tools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  component TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  icon TEXT NOT NULL DEFAULT 'Box',
  is_popular INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  created_by INTEGER,
  updated_by INTEGER,
  -- monetizable/ads_allowed/affiliate_allowed/policy_category/
  -- requires_review/user_generated_content/risk_level/required_plan/
  -- monetization_enforced added in migration 0007 (Phase 3.14 —
  -- monetization foundation). See shared/monetization/tool-monetization.ts
  -- for what these mean; every existing tool defaults to the same honest,
  -- unenforced values (nothing is monetizable or plan-gated yet).
  monetizable INTEGER NOT NULL DEFAULT 0,
  ads_allowed INTEGER NOT NULL DEFAULT 1,
  affiliate_allowed INTEGER NOT NULL DEFAULT 0,
  policy_category TEXT NOT NULL DEFAULT '',
  requires_review INTEGER NOT NULL DEFAULT 0,
  user_generated_content INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  required_plan TEXT NOT NULL DEFAULT 'free',
  monetization_enforced INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Added in migration 0007 (Phase 3.14 — Free Tool -> Premium Monetization
-- Funnel). See migrations/0007_monetization_foundation.sql for the full
-- reasoning, including why there is deliberately no user_entitlements or
-- subscriptions table yet (no public/customer account system exists).
CREATE TABLE IF NOT EXISTS plans (
  plan_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  description TEXT NOT NULL DEFAULT '',
  pricing_amount REAL,
  pricing_currency TEXT,
  pricing_period TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  upgrade_target TEXT REFERENCES plans(plan_key),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_entitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_key TEXT NOT NULL REFERENCES plans(plan_key),
  entitlement_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_available',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (plan_key, entitlement_key)
);

-- Added in migration 0008 (Phase 3.14 remediation -- Finding #1: Customer
-- Accounts). Deliberately separate from `users` (the Admin account table)
-- -- no foreign key to/from `users`, no shared session mechanism, no
-- plan/entitlement link yet. See migrations/0008_customer_accounts.sql
-- for the full reasoning, including why there is deliberately no
-- customer_plan_assignments/subscriptions table yet (no registration
-- mechanism exists to populate real customer rows).
CREATE TABLE IF NOT EXISTS customer_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- description/meta_title/meta_description/canonical_url/is_indexable/
-- created_by/updated_by added in migration 0005 (Phase 2.9 — Pages
-- Management). See shared/pages.ts for the validation these fields back.
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_id INTEGER,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  template TEXT NOT NULL DEFAULT 'tool',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL DEFAULT '',
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  canonical_url TEXT NOT NULL DEFAULT '',
  is_indexable INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  updated_by INTEGER,
  FOREIGN KEY (tool_id) REFERENCES tools(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS seo_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL UNIQUE,
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  canonical TEXT NOT NULL DEFAULT '',
  robots TEXT NOT NULL DEFAULT 'index,follow',
  og_title TEXT NOT NULL DEFAULT '',
  og_description TEXT NOT NULL DEFAULT '',
  og_image TEXT NOT NULL DEFAULT '',
  schema_json TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ad_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  device TEXT NOT NULL DEFAULT 'all',
  width INTEGER,
  height INTEGER,
  code TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);

-- Admin FAQ Management (migrations/0009_faq_management.sql). Separate from
-- the unused `faqs` table above (page_id-bound, no language column) — see
-- that migration's comment for why. scope='global' rows (tool_slug NULL)
-- mirror shared/seo/global-faq.ts; scope='tool' rows (tool_slug set) mirror
-- one shared/seo/content.ts#TOOL_CONTENT FAQ entry for a real tool.
CREATE TABLE IF NOT EXISTS site_faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  tool_slug TEXT,
  language TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_site_faqs_scope_language ON site_faqs(scope, language, sort_order);
CREATE INDEX IF NOT EXISTS idx_site_faqs_tool_slug ON site_faqs(tool_slug);

CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  featured_image TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT 'Codovio',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  tool_id INTEGER,
  country TEXT,
  device TEXT,
  referrer TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tool_id) REFERENCES tools(id)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'analyst',
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

-- Added in migration 0002 (Phase 2.3 — Authentication + Sessions).
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Added in migration 0002. Bounded, time-windowed login-attempt tracking,
-- keyed by the email being attempted (not IP) — see DECISIONS.md.
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identifier TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- actor_email/result/ip_address/user_agent added in migration 0003
-- (Phase 2.6 — Audit Logging). See worker/audit.ts for the writer.
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actor_email TEXT,
  result TEXT NOT NULL DEFAULT 'success',
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category_id);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_blog_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_events_name_date ON analytics_events(event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_time ON login_attempts(identifier, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_result ON audit_logs(result);

-- Added in migration 0004 (Phase 2.7 — Settings Foundation). See
-- shared/settings.ts for the registry of valid keys/types this backs.
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  value_type TEXT NOT NULL,
  category TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
CREATE INDEX IF NOT EXISTS idx_settings_public ON settings(is_public);

INSERT OR IGNORE INTO settings (key, value, value_type, category, is_public, description) VALUES
  ('general.site_name', 'Codivio', 'string', 'general', 1, 'Public site name'),
  ('general.site_description', 'Free online tools for QR codes, PDF files, images and everyday digital tasks.', 'string', 'general', 1, 'Public site description'),
  ('general.default_language', 'en', 'string', 'general', 1, 'Default site language code'),
  ('system.maintenance_mode', 'false', 'boolean', 'system', 1, 'Whether the site is in maintenance mode'),
  ('google.analytics_configured', 'false', 'boolean', 'google', 0, 'Whether Google Analytics has been configured'),
  ('google.search_console_configured', 'false', 'boolean', 'google', 0, 'Whether Search Console has been configured'),
  ('advertising.adsense_configured', 'false', 'boolean', 'advertising', 0, 'Whether AdSense has been configured'),
  ('affiliate.enabled', 'false', 'boolean', 'affiliate', 0, 'Whether the affiliate program is enabled'),
  ('security.registration_enabled', 'false', 'boolean', 'security', 0, 'Whether public admin registration is enabled');

-- Added in migration 0006 (Phase 2.10 — Tools Management). Mirrors the
-- real static tool registry in src/App.tsx exactly (4 categories, 34
-- tools) — see shared/tools.ts for the category/icon allowlists this
-- backs. Seeding these tables does NOT change what the public site
-- renders; see DECISIONS.md.
INSERT OR IGNORE INTO categories (id, name, slug, status, sort_order) VALUES
  (1, 'QR Tools', 'qr', 'active', 0),
  (2, 'PDF Tools', 'pdf', 'active', 1),
  (3, 'Image Tools', 'image', 'active', 2),
  (4, 'Other Tools', 'other', 'active', 3);

INSERT OR IGNORE INTO tools (category_id, name, slug, description, component, status, featured, is_popular, icon, sort_order) VALUES
  (1, 'QR Code Generator', 'qr-code-generator', 'Create custom QR codes for links, text and more.', 'ToolPage', 'active', 1, 1, 'QrCode', 0),
  (1, 'QR Code Scanner', 'qr-code-scanner', 'Scan QR codes using your camera or an uploaded image.', 'ToolPage', 'active', 1, 1, 'QrCode', 1),
  (1, 'URL to QR Code', 'url-to-qr', 'Turn any website URL into a QR code.', 'ToolPage', 'active', 1, 1, 'Globe', 2),
  (1, 'Text to QR Code', 'text-to-qr', 'Convert plain text into a shareable QR code.', 'ToolPage', 'active', 0, 0, 'FileText', 3),
  (1, 'WiFi QR Code', 'wifi-qr', 'Create a QR code for easy WiFi network sharing.', 'ToolPage', 'active', 1, 1, 'Wifi', 4),
  (1, 'vCard QR Code', 'vcard-qr', 'Create QR codes for contact information.', 'ToolPage', 'active', 1, 1, 'Users', 5),
  (1, 'Email QR Code', 'email-qr', 'Create a QR code that opens an email draft.', 'ToolPage', 'active', 0, 0, 'Mail', 6),
  (1, 'SMS QR Code', 'sms-qr', 'Create QR codes for pre-filled SMS messages.', 'ToolPage', 'active', 0, 0, 'MessageSquare', 7),
  (1, 'WhatsApp QR Code', 'whatsapp-qr', 'Create QR codes for WhatsApp conversations.', 'ToolPage', 'active', 0, 0, 'MessageSquare', 8),
  (1, 'Phone QR Code', 'phone-qr', 'Create a QR code that opens a phone call.', 'ToolPage', 'active', 0, 0, 'Phone', 9),
  (1, 'Location QR Code', 'location-qr', 'Create QR codes for maps and locations.', 'ToolPage', 'active', 0, 0, 'MapPin', 10),
  (1, 'Calendar QR Code', 'calendar-qr', 'Create QR codes for calendar events.', 'ToolPage', 'active', 0, 0, 'CalendarDays', 11),
  (2, 'PDF Merge', 'pdf-merge', 'Combine multiple PDF files into one document.', 'ToolPage', 'active', 1, 1, 'FileOutput', 0),
  (2, 'PDF Split', 'pdf-split', 'Split PDF documents into separate files.', 'ToolPage', 'active', 1, 1, 'FileText', 1),
  (2, 'PDF Compress', 'pdf-compress', 'Reduce PDF file size while keeping useful quality.', 'ToolPage', 'active', 1, 1, 'Minimize2', 2),
  (2, 'PDF to JPG', 'pdf-to-jpg', 'Convert PDF pages into JPG images.', 'ToolPage', 'active', 0, 0, 'FileImage', 3),
  (2, 'JPG to PDF', 'jpg-to-pdf', 'Convert JPG images into a PDF document.', 'ToolPage', 'active', 0, 0, 'FileOutput', 4),
  (2, 'PDF to Word', 'pdf-to-word', 'Convert PDF documents into editable Word files.', 'ToolPage', 'active', 1, 1, 'FileText', 5),
  (2, 'PDF to Excel', 'pdf-to-excel', 'Convert suitable PDF tables into Excel files.', 'ToolPage', 'active', 0, 0, 'BarChart3', 6),
  (2, 'PDF Rotate', 'pdf-rotate', 'Rotate PDF pages and save the corrected document.', 'ToolPage', 'active', 0, 0, 'FileText', 7),
  (3, 'Image Resize', 'image-resize', 'Resize images to exact dimensions.', 'ToolPage', 'active', 1, 1, 'Image', 0),
  (3, 'Image Compress', 'image-compress', 'Compress images for smaller file sizes.', 'ToolPage', 'active', 1, 1, 'Minimize2', 1),
  (3, 'Image Converter', 'image-converter', 'Convert images between popular formats.', 'ToolPage', 'active', 0, 0, 'Image', 2),
  (3, 'JPG to PNG', 'jpg-to-png', 'Convert JPG images into PNG format.', 'ToolPage', 'active', 0, 0, 'FileImage', 3),
  (3, 'PNG to JPG', 'png-to-jpg', 'Convert PNG images into JPG format.', 'ToolPage', 'active', 0, 0, 'FileImage', 4),
  (3, 'WebP Converter', 'webp-converter', 'Convert images to or from WebP format.', 'ToolPage', 'active', 0, 0, 'Image', 5),
  (3, 'Image Crop', 'image-crop', 'Crop images to the exact area you need.', 'ToolPage', 'active', 0, 0, 'Image', 6),
  (3, 'Image Rotate', 'image-rotate', 'Rotate images quickly in your browser.', 'ToolPage', 'active', 0, 0, 'Image', 7),
  (3, 'Background Remover', 'background-remover', 'Remove backgrounds from images.', 'ToolPage', 'active', 1, 1, 'Sparkles', 8),
  (3, 'Image to PDF', 'image-to-pdf', 'Turn images into PDF documents.', 'ToolPage', 'active', 0, 0, 'FileOutput', 9),
  (3, 'PDF to Image', 'pdf-to-image', 'Convert PDF pages into image files.', 'ToolPage', 'active', 0, 0, 'FileImage', 10),
  (4, 'GIF Maker', 'gif-maker', 'Create animated GIFs from images or frames.', 'ToolPage', 'active', 0, 0, 'Sparkles', 0),
  (4, 'Meme Generator', 'meme-generator', 'Create simple memes with images and text.', 'ToolPage', 'active', 0, 0, 'MessageSquare', 1),
  (4, 'Color Palette Generator', 'color-palette-generator', 'Generate useful color palettes from images or ideas.', 'ToolPage', 'active', 0, 0, 'Sparkles', 2);

-- policy_category mirrors each tool's existing category name -- real
-- data already in this table via category_id, not a fabricated value.
UPDATE tools
SET policy_category = (SELECT categories.name FROM categories WHERE categories.id = tools.category_id)
WHERE policy_category = '';

-- pricing_amount/currency/period intentionally NULL for all four --
-- undecided, not zero and not a placeholder figure.
INSERT OR IGNORE INTO plans (plan_key, display_name, status, description, priority, visible, upgrade_target) VALUES
  ('free', 'Free', 'planned', 'Access to Codivio''s tools as they become available, at no cost.', 0, 1, 'pro'),
  ('pro', 'Pro', 'planned', 'Planned for individuals who need higher limits and faster processing once tools are live.', 1, 1, 'business'),
  ('business', 'Business', 'planned', 'Planned for teams that need advanced limits and priority processing once tools are live.', 2, 1, 'api'),
  ('api', 'API', 'planned', 'Planned programmatic access to Codivio''s tools for developers and integrations.', 3, 1, NULL);

INSERT OR IGNORE INTO plan_entitlements (plan_key, entitlement_key, status) VALUES
  ('free', 'basic_tool_access', 'planned'),
  ('pro', 'advanced_tool_access', 'not_available'),
  ('pro', 'batch_processing', 'not_available'),
  ('pro', 'larger_file_size', 'not_available'),
  ('pro', 'faster_processing', 'not_available'),
  ('pro', 'storage', 'not_available'),
  ('pro', 'premium_tools', 'not_available'),
  ('pro', 'reduced_ads', 'not_available'),
  ('pro', 'higher_usage_limits', 'not_available'),
  ('business', 'priority_processing', 'not_available'),
  ('business', 'analytics', 'not_available'),
  ('api', 'api_access', 'not_available');

-- The real 12-question global FAQ (shared/seo/global-faq.ts), all 3
-- languages -- see migrations/0009_faq_management.sql for the full seed
-- and the reasoning for seeding only the global scope.
INSERT OR IGNORE INTO site_faqs (scope, tool_slug, language, question, answer, status, sort_order, created_at, updated_at) VALUES
('global', NULL, 'en', 'What is Codivio?', 'Codivio is a collection of free online tools for QR codes, PDFs, images and other everyday digital tasks.', 'active', 0, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'en', 'Are Codivio tools free?', 'The Codivio platform is designed around free online tools. Individual tools may have their own limits when they become available.', 'active', 1, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'en', 'Do I need to install software?', 'No. Codivio is designed to provide useful tools directly in your web browser whenever technically possible.', 'active', 2, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'en', 'Are my files uploaded to a server?', 'Codivio aims to process suitable tools directly in the browser whenever possible. Tool-specific processing details will be clearly explained when each tool launches.', 'active', 3, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'en', 'Can I use Codivio on my phone?', 'Yes. The website is designed to work across desktop, tablet and mobile screen sizes.', 'active', 4, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'en', 'Will more tools be added?', 'Yes. Codivio is being developed as a growing collection of QR, PDF, image and productivity tools.', 'active', 5, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'en', 'Do I need to create an account to use a tool?', 'No account is required for the tools themselves. An account is only relevant to features like saved preferences or a paid plan, which are not available yet.', 'active', 6, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'en', 'What languages does Codivio support?', 'The site is currently available in English, Azerbaijani and Turkish, with a language switch in the header.', 'active', 7, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'en', 'What kinds of tools does Codivio organize its catalog into?', 'The catalog is organized into QR code tools, PDF tools, image tools, and a smaller category of other productivity tools like a GIF maker or color palette generator.', 'active', 8, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'en', 'Why do some tool pages say a tool is not available yet?', 'Codivio is built and released incrementally. A tool''s page goes live with a clear description and FAQ before its functionality is finished, and the page says so honestly rather than pretending the feature already works.', 'active', 9, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'en', 'Does Codivio show advertisements?', 'Codivio has a designated advertisement area used for controlled, clearly labeled ad placements. It does not use pop-ups or intrusive ad formats.', 'active', 10, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'en', 'How can I get help if my question isn''t answered here?', 'Use the Contact page to reach out directly, and check back here as this FAQ grows alongside the tool catalog.', 'active', 11, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Codivio nədir?', 'Codivio — QR kodlar, PDF-lər, şəkillər və digər gündəlik rəqəmsal tapşırıqlar üçün pulsuz onlayn alətlər toplusudur.', 'active', 0, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Codivio alətləri pulsuzdurmu?', 'Codivio platforması pulsuz onlayn alətlər əsasında qurulub. Ayrı-ayrı alətlər aktiv olduqdan sonra öz məhdudiyyətlərinə malik ola bilər.', 'active', 1, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Proqram təminatı quraşdırmalıyammı?', 'Xeyr. Codivio texniki cəhətdən mümkün olduğu yerlərdə faydalı alətləri birbaşa brauzerinizdə təqdim etmək üçün nəzərdə tutulub.', 'active', 2, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Fayllarım serverə yüklənirmi?', 'Codivio uyğun alətləri mümkün olduğu qədər birbaşa brauzerdə emal etməyi hədəfləyir. Alətə xas emal detalları hər alət işə düşəndə aydın izah olunacaq.', 'active', 3, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Codivio-dan telefonumda istifadə edə bilərəmmi?', 'Bəli. Sayt masaüstü, planşet və mobil ekran ölçüləri üçün uyğunlaşdırılıb.', 'active', 4, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Yeni alətlər əlavə olunacaqmı?', 'Bəli. Codivio QR, PDF, şəkil və məhsuldarlıq alətlərinin daim böyüyən toplusu kimi hazırlanır.', 'active', 5, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Bir aləti istifadə etmək üçün hesab yaratmalıyammı?', 'Alətlərin özü üçün hesab tələb olunmur. Hesab yalnız hələ mövcud olmayan yadda saxlanılan tənzimləmələr və ya ödənişli plan kimi funksiyalarla əlaqədardır.', 'active', 6, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Codivio hansı dilləri dəstəkləyir?', 'Sayt hazırda header-dəki dil seçimi ilə Ingilis, Azərbaycan və Türk dillərində mövcuddur.', 'active', 7, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Codivio kataloqu alətləri hansı kateqoriyalara bölür?', 'Kataloq QR kod alətləri, PDF alətləri, şəkil alətləri və GIF yaradıcısı və ya rəng palitrası generatoru kimi daha kiçik digər məhsuldarlıq alətləri kateqoriyasına bölünür.', 'active', 8, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Nəyə görə bəzi alət səhifələrində aləti hələ mövcud deyil deyilir?', 'Codivio tədricən qurulur və buraxılır. Aləti işlək olmadan öncə aydın təsvir və FAQ ilə səhifəsi aktiv olur, funksionallığın artıq işlədiyini iddia etmək əvəzinə bu vəziyyət açıq şəkildə bildirilir.', 'active', 9, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Codivio reklam göstərirmi?', 'Codivio-da nəzarətli, aydın işarələnmiş reklam yerləşdirmələri üçün ayrılmış reklam sahəsi var. Pop-up və ya təhqiredici reklam formatlarından istifadə olunmur.', 'active', 10, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'az', 'Sualım burada cavablanmayıbsa necə kömək ala bilərəm?', 'Birbaşa əlaqə üçün Əlaqə səhifəsindən istifadə edin və alət kataloqu böyüdükcə bu FAQ-a yenidən baxın.', 'active', 11, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Codivio nedir?', 'Codivio; QR kodlar, PDF''ler, görseller ve diğer günlük dijital işler için ücretsiz çevrimiçi araçlar koleksiyonudur.', 'active', 0, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Codivio araçları ücretsiz mi?', 'Codivio platformu ücretsiz çevrimiçi araçlar etrafında tasarlanmıştır. Kullanıma açıldıklarında bazı araçların kendine özgü sınırları olabilir.', 'active', 1, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Bir yazılım kurmam gerekiyor mu?', 'Hayır. Codivio, teknik olarak mümkün olduğunda kullanışlı araçları doğrudan tarayıcınızda sunmak üzere tasarlanmıştır.', 'active', 2, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Dosyalarım bir sunucuya yükleniyor mu?', 'Codivio, uygun araçları mümkün olduğunca doğrudan tarayıcıda işlemeyi hedefler. Araca özgü işleme detayları her araç yayına girdiğinde açıkça belirtilecektir.', 'active', 3, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Codivio''yu telefonumda kullanabilir miyim?', 'Evet. Site masaüstü, tablet ve mobil ekran boyutlarında çalışacak şekilde tasarlanmıştır.', 'active', 4, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Daha fazla araç eklenecek mi?', 'Evet. Codivio, QR, PDF, görsel ve üretkenlik araçlarından oluşan büyüyen bir koleksiyon olarak geliştiriliyor.', 'active', 5, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Bir aracı kullanmak için hesap oluşturmam gerekir mi?', 'Araçların kendisi için hesap gerekmez. Hesap yalnızca henüz mevcut olmayan kaydedilmiş tercihler veya ücretli plan gibi özelliklerle ilgilidir.', 'active', 6, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Codivio hangi dilleri destekliyor?', 'Site şu anda üst menüdeki dil değiştirici ile İngilizce, Azerbaycan Türkçesi ve Türkçe olarak sunulmaktadır.', 'active', 7, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Codivio kataloğu araçları hangi kategorilere ayırıyor?', 'Katalog; QR kod araçları, PDF araçları, görsel araçları ve GIF oluşturucu veya renk paleti oluşturucu gibi daha küçük bir diğer üretkenlik araçları kategorisine ayrılmıştır.', 'active', 8, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Bazı araç sayfalarında aracın henüz kullanılamadığı neden yazıyor?', 'Codivio aşamalı olarak geliştirilip yayınlanıyor. Bir aracın sayfası, işlevi tamamlanmadan önce net bir açıklama ve SSS ile yayına girer ve özelliğin zaten çalıştığını iddia etmek yerine bunu dürüstçe belirtir.', 'active', 9, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Codivio reklam gösteriyor mu?', 'Codivio''da kontrollü, açıkça etiketlenmiş reklam yerleşimleri için ayrılmış bir reklam alanı bulunur. Pop-up veya rahatsız edici reklam formatları kullanılmaz.', 'active', 10, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z'),
('global', NULL, 'tr', 'Sorum burada yanıtlanmadıysa nasıl yardım alabilirim?', 'Doğrudan ulaşmak için İletişim sayfasını kullanın ve araç kataloğu büyüdükçe bu SSS bölümünü tekrar kontrol edin.', 'active', 11, '2026-09-15T00:00:00.000Z', '2026-09-15T00:00:00.000Z');

-- SEO Override Architecture (migrations/0010_seo_overrides.sql). An
-- optional per-language override layer on top of the compile-time
-- PAGE_SEO/TOOL_SEO defaults (shared/seo/pages.ts, shared/seo/tools.ts) —
-- those remain the permanent fallback; a row here only takes effect while
-- status='active'. Covers both entity_type='page' (a real PAGE_SEO key)
-- and entity_type='tool' (a real TOOL_SEO slug) in one shared table. No
-- seed data — starts empty, since the compile-time defaults are already
-- correct until an admin deliberately overrides one.
CREATE TABLE IF NOT EXISTS seo_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  updated_by INTEGER REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_overrides_entity_lang ON seo_overrides(entity_type, entity_key, language);
CREATE INDEX IF NOT EXISTS idx_seo_overrides_status ON seo_overrides(status);
