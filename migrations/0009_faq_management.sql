-- Migration 0009 (Phase 3 Finalization — Admin FAQ Management).
--
-- The pre-existing `faqs` table (migration 0001) is tied 1:1 to `page_id`
-- (a CMS page row) via a NOT NULL foreign key and has no language column —
-- it was never wired to any Worker endpoint or Admin UI (grepped and
-- confirmed empty of any real usage) and does not fit a site-wide/
-- multilingual FAQ. Rather than repurpose an unrelated, unused table, this
-- migration adds a new, purpose-built `site_faqs` table and leaves the old
-- `faqs` table untouched.
--
-- `site_faqs` supports both FAQ scopes:
--  - scope='global': site-wide questions (tool_slug NULL) — mirrors the
--    public /faq page and Homepage FAQ preview's real content, which is
--    shared/seo/global-faq.ts (static, not yet read from this table — see
--    that file's own comment for why, matching the same deliberate
--    deferral already documented for Tools Management in 0006).
--  - scope='tool': one FAQ entry tied to a real tool via tool_slug —
--    mirrors shared/seo/content.ts#TOOL_CONTENT's per-tool FAQ entries.
--    Not pre-seeded here (612 existing entries across 34 tools x 6 items x
--    3 languages would be a large, purely-mirrored seed with no consumer
--    yet) — the schema and Admin UI support creating scope='tool' rows,
--    but only the global scope is seeded, from real, already-shipped
--    content, same principle as 0006's tools/categories seed.
--
-- No DB-level CHECK constraint for `scope`/`status`/`language` — the same
-- deliberate deferral already applied to `tools.status`/`pages.status`;
-- shared/faq.ts's isValidFaqScope/isValidFaqStatus/isValidLanguage fail
-- closed at the application layer instead.

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

-- Seed: the real 12-question global FAQ (shared/seo/global-faq.ts), all 3
-- languages, in display order. created_at/updated_at use a fixed
-- migration-time timestamp (not "now") so this migration is idempotent in
-- content terms across environments/replays.
INSERT INTO site_faqs (scope, tool_slug, language, question, answer, status, sort_order, created_at, updated_at) VALUES
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
