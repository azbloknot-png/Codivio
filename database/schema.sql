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
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
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
