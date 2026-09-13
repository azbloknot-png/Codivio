-- Migration 0006 (Phase 2.10 — Tools Management).
--
-- The `tools` and `categories` tables already existed from migration 0001
-- with nearly the right shape (slug UNIQUE, name, description, component,
-- status, featured, sort_order, category_id -> categories) but were never
-- seeded — the public frontend has always used its own static array in
-- src/App.tsx. This migration extends `tools` in place with the columns
-- Admin management needs, then seeds BOTH tables from that real, already
-- shipped registry (4 categories, 34 tools) so the Admin-managed
-- configuration starts as an accurate mirror of what already exists.
--
-- This does NOT change what the public site renders. The static registry
-- in src/App.tsx remains the live source for Homepage/tool routes this
-- phase — wiring the public site to read from these tables is documented,
-- deliberate future work, not done here. See DECISIONS.md.
--
-- No DB-level CHECK constraint is added for `status` (active/inactive) —
-- the same deliberate deferral already applied to `users.role` and
-- `pages.status`. shared/tools.ts#isValidToolStatus fails closed at the
-- application layer instead.
--
-- Verified empirically against a real SQLite engine (node:sqlite) before
-- finalizing: the new columns apply cleanly, the category_id foreign key
-- is genuinely enforced, and the pre-existing slug UNIQUE constraint still
-- rejects a duplicate.

ALTER TABLE tools ADD COLUMN icon TEXT NOT NULL DEFAULT 'Box';
ALTER TABLE tools ADD COLUMN is_popular INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tools ADD COLUMN seo_title TEXT NOT NULL DEFAULT '';
ALTER TABLE tools ADD COLUMN seo_description TEXT NOT NULL DEFAULT '';
ALTER TABLE tools ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE tools ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- categories.slug is the controlled, extensible category vocabulary (see
-- shared/tools.ts#TOOL_CATEGORIES) — only the 4 that actually have real
-- tools today are seeded; a future category (video/gif/ai/utilities) is
-- added as one more row here, never a schema change.
INSERT OR IGNORE INTO categories (id, name, slug, status, sort_order) VALUES
  (1, 'QR Tools', 'qr', 'active', 0),
  (2, 'PDF Tools', 'pdf', 'active', 1),
  (3, 'Image Tools', 'image', 'active', 2),
  (4, 'Other Tools', 'other', 'active', 3);

-- One row per real tool in src/App.tsx's `tools` array — same slug, name,
-- description, category and icon; sort_order mirrors each tool's position
-- within its category in that array. `component` is 'ToolPage' for every
-- row because that is the actual generic implementation component every
-- tool route renders today (see src/pages/ToolPage.tsx) — not a per-tool
-- value that doesn't exist yet.
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
