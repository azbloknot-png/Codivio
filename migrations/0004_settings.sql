-- D1 migration 0004: Settings Foundation (Phase 2.7).
-- Inspected first: no existing table covered this — `settings` is new.
-- A single generic, category/type-tagged key-value table, not one table
-- per future integration (Google/Social/AdSense/etc.) — see shared/settings.ts
-- for the centralized, fail-closed registry of which keys are allowed and
-- how each is validated. Applied via:
--   wrangler d1 migrations apply <DB_NAME> [--local | --remote]

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

-- Seed exactly the keys shared/settings.ts registers as valid today. Every
-- value here is a real, honest default (a name, a language code, or a
-- "not configured yet" false flag) — never a fake connection status. When
-- a future migration adds a new registered key, it must seed it here too,
-- the same way this one does, or PATCH /api/admin/settings will 400 with
-- "Unknown setting key" for it (the registry fails closed by design).
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
