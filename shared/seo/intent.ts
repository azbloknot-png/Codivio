import type { Language } from "../i18n/languages";

/**
 * Codivio SEO — search intent audit (Phase 3.2).
 *
 * Editorial judgment only — a realistic mapping of what a user searching
 * for this tool/page is actually trying to do, in their own words, per
 * language. This is NOT Keyword Intelligence: no search volume, ranking
 * potential, or competitiveness data is claimed or implied anywhere here
 * (Phase 3.1 Step 16 / Phase 3.2's own instruction). Real Keyword
 * Intelligence, backed by actual Search Console data, is later work.
 *
 * `primary` is the single, clearest query the page/tool's title+description
 * are written to satisfy. `secondary` is 1-2 realistic longer/related
 * phrasings the same page could also reasonably satisfy — useful context
 * for a future content/FAQ expansion, not a promise of ranking for them.
 * Pages (informational/navigational) get `primary` only; tools (the
 * commercial/transactional content) get both.
 */
export interface ToolIntent {
  primary: string;
  secondary: string[];
}

export const TOOL_INTENT: Record<string, Record<Language, ToolIntent>> = {
  "qr-code-generator": {
    en: { primary: "create a qr code online", secondary: ["free qr code generator", "make qr code for a link"] },
    az: { primary: "onlayn qr kod yaratmaq", secondary: ["pulsuz qr kod generatoru", "link üçün qr kod yaratmaq"] },
    tr: { primary: "online qr kod oluşturma", secondary: ["ücretsiz qr kod oluşturucu", "link için qr kod yapma"] },
  },
  "qr-code-scanner": {
    en: { primary: "scan a qr code online", secondary: ["qr code reader online", "scan qr code with camera"] },
    az: { primary: "onlayn qr kod skan etmək", secondary: ["qr kod oxuyucu", "kamera ilə qr kod skan etmək"] },
    tr: { primary: "online qr kod okutma", secondary: ["qr kod okuyucu", "kamerayla qr kod tarama"] },
  },
  "url-to-qr": {
    en: { primary: "convert url to qr code", secondary: ["turn website link into qr code", "qr code for a link"] },
    az: { primary: "linki qr koda çevirmək", secondary: ["veb sayt linkindən qr kod", "url üçün qr kod"] },
    tr: { primary: "url'yi qr koda çevirme", secondary: ["web bağlantısından qr kod", "link için qr kod oluşturma"] },
  },
  "text-to-qr": {
    en: { primary: "convert text to qr code", secondary: ["qr code from plain text", "share text with a qr code"] },
    az: { primary: "mətni qr koda çevirmək", secondary: ["mətndən qr kod yaratmaq", "mətn paylaşmaq üçün qr kod"] },
    tr: { primary: "metni qr koda çevirme", secondary: ["düz metinden qr kod", "metin paylaşmak için qr kod"] },
  },
  "wifi-qr": {
    en: { primary: "wifi qr code generator", secondary: ["share wifi password with qr code", "qr code for wifi network"] },
    az: { primary: "wifi üçün qr kod yaratmaq", secondary: ["wifi şifrəsini qr kodla paylaşmaq", "wifi şəbəkəsi üçün qr kod"] },
    tr: { primary: "wifi için qr kod oluşturma", secondary: ["wifi şifresini qr kodla paylaşma", "wifi ağı için qr kod"] },
  },
  "vcard-qr": {
    en: { primary: "vcard qr code generator", secondary: ["qr code for a contact card", "share contact info with qr code"] },
    az: { primary: "vcard qr kod yaratmaq", secondary: ["əlaqə kartı üçün qr kod", "əlaqə məlumatını qr kodla paylaşmaq"] },
    tr: { primary: "vcard qr kod oluşturma", secondary: ["iletişim kartı için qr kod", "iletişim bilgisini qr kodla paylaşma"] },
  },
  "email-qr": {
    en: { primary: "email qr code generator", secondary: ["qr code that opens an email", "create qr code for an email draft"] },
    az: { primary: "e-poçt üçün qr kod yaratmaq", secondary: ["e-poçt açan qr kod", "hazır e-poçt üçün qr kod"] },
    tr: { primary: "e-posta için qr kod oluşturma", secondary: ["e-posta açan qr kod", "hazır e-posta için qr kod"] },
  },
  "sms-qr": {
    en: { primary: "sms qr code generator", secondary: ["qr code that sends a text message", "create qr code for sms"] },
    az: { primary: "sms üçün qr kod yaratmaq", secondary: ["mesaj göndərən qr kod", "hazır sms üçün qr kod"] },
    tr: { primary: "sms için qr kod oluşturma", secondary: ["mesaj gönderen qr kod", "hazır sms için qr kod"] },
  },
  "whatsapp-qr": {
    en: { primary: "whatsapp qr code generator", secondary: ["qr code that opens whatsapp chat", "create qr code for whatsapp number"] },
    az: { primary: "whatsapp üçün qr kod yaratmaq", secondary: ["whatsapp söhbəti açan qr kod", "whatsapp nömrəsi üçün qr kod"] },
    tr: { primary: "whatsapp için qr kod oluşturma", secondary: ["whatsapp sohbeti açan qr kod", "whatsapp numarası için qr kod"] },
  },
  "phone-qr": {
    en: { primary: "phone number qr code generator", secondary: ["qr code that starts a call", "create qr code to dial a number"] },
    az: { primary: "telefon nömrəsi üçün qr kod", secondary: ["zəng başladan qr kod", "nömrəni yığan qr kod"] },
    tr: { primary: "telefon numarası için qr kod", secondary: ["arama başlatan qr kod", "numarayı arayan qr kod"] },
  },
  "location-qr": {
    en: { primary: "location qr code generator", secondary: ["qr code for a map location", "share directions with qr code"] },
    az: { primary: "məkan üçün qr kod yaratmaq", secondary: ["xəritə məkanı üçün qr kod", "yol tərifini qr kodla paylaşmaq"] },
    tr: { primary: "konum için qr kod oluşturma", secondary: ["harita konumu için qr kod", "yol tarifini qr kodla paylaşma"] },
  },
  "calendar-qr": {
    en: { primary: "calendar event qr code generator", secondary: ["qr code that adds a calendar event", "share event details with qr code"] },
    az: { primary: "tədbir üçün qr kod yaratmaq", secondary: ["təqvimə əlavə edən qr kod", "tədbir detallarını qr kodla paylaşmaq"] },
    tr: { primary: "etkinlik için qr kod oluşturma", secondary: ["takvime ekleyen qr kod", "etkinlik bilgisini qr kodla paylaşma"] },
  },

  "pdf-merge": {
    en: { primary: "merge pdf files online", secondary: ["combine multiple pdfs into one", "join pdf files free"] },
    az: { primary: "pdf fayllarını birləşdirmək", secondary: ["bir neçə pdf-i tək sənədə birləşdirmək", "pulsuz pdf birləşdirici"] },
    tr: { primary: "pdf dosyalarını birleştirme", secondary: ["birden fazla pdf'yi tek dosyada birleştirme", "ücretsiz pdf birleştirici"] },
  },
  "pdf-split": {
    en: { primary: "split pdf pages online", secondary: ["separate pdf into multiple files", "extract pages from a pdf"] },
    az: { primary: "pdf səhifələrini bölmək", secondary: ["pdf-i ayrı fayllara bölmək", "pdf-dən səhifə çıxarmaq"] },
    tr: { primary: "pdf sayfalarını ayırma", secondary: ["pdf'yi ayrı dosyalara bölme", "pdf'den sayfa çıkarma"] },
  },
  "pdf-compress": {
    en: { primary: "compress pdf file size online", secondary: ["reduce pdf size free", "make a pdf smaller"] },
    az: { primary: "pdf fayl ölçüsünü sıxmaq", secondary: ["pdf ölçüsünü azaltmaq", "pdf-i kiçiltmək"] },
    tr: { primary: "pdf dosya boyutunu sıkıştırma", secondary: ["pdf boyutunu küçültme", "pdf'yi küçültme"] },
  },
  "pdf-to-jpg": {
    en: { primary: "convert pdf to jpg online", secondary: ["pdf pages to jpg images", "extract jpg images from a pdf"] },
    az: { primary: "pdf-i jpg-yə çevirmək", secondary: ["pdf səhifələrini jpg şəklinə çevirmək", "pdf-dən jpg çıxarmaq"] },
    tr: { primary: "pdf'yi jpg'ye çevirme", secondary: ["pdf sayfalarını jpg'ye çevirme", "pdf'den jpg çıkarma"] },
  },
  "jpg-to-pdf": {
    en: { primary: "convert jpg to pdf online", secondary: ["combine jpg images into a pdf", "make a pdf from photos"] },
    az: { primary: "jpg-ni pdf-ə çevirmək", secondary: ["jpg şəkillərini pdf-ə birləşdirmək", "fotolardan pdf yaratmaq"] },
    tr: { primary: "jpg'yi pdf'ye çevirme", secondary: ["jpg görsellerini pdf'de birleştirme", "fotoğraflardan pdf oluşturma"] },
  },
  "pdf-to-word": {
    en: { primary: "convert pdf to word online", secondary: ["pdf to editable word document", "extract text from pdf to word"] },
    az: { primary: "pdf-i word-ə çevirmək", secondary: ["pdf-i redaktə edilə bilən word-ə çevirmək", "pdf-dən word-ə mətn çıxarmaq"] },
    tr: { primary: "pdf'yi word'e çevirme", secondary: ["pdf'yi düzenlenebilir word'e çevirme", "pdf'den word'e metin çıkarma"] },
  },
  "pdf-to-excel": {
    en: { primary: "convert pdf to excel online", secondary: ["extract tables from pdf to excel", "pdf table to spreadsheet"] },
    az: { primary: "pdf-i excel-ə çevirmək", secondary: ["pdf-dən excel-ə cədvəl çıxarmaq", "pdf cədvəlini excel-ə köçürmək"] },
    tr: { primary: "pdf'yi excel'e çevirme", secondary: ["pdf'den excel'e tablo çıkarma", "pdf tablosunu excel'e aktarma"] },
  },
  "pdf-rotate": {
    en: { primary: "rotate pdf pages online", secondary: ["fix pdf page orientation", "turn pdf pages sideways"] },
    az: { primary: "pdf səhifələrini döndürmək", secondary: ["pdf istiqamətini düzəltmək", "pdf-i düz etmək"] },
    tr: { primary: "pdf sayfalarını döndürme", secondary: ["pdf yönünü düzeltme", "pdf'yi düzeltme"] },
  },

  "image-resize": {
    en: { primary: "resize an image online", secondary: ["change image dimensions free", "resize a photo to an exact size"] },
    az: { primary: "şəkli ölçüləndirmək", secondary: ["şəkil ölçüsünü dəyişmək", "fotonu dəqiq ölçüyə salmaq"] },
    tr: { primary: "görsel boyutlandırma", secondary: ["görsel boyutunu değiştirme", "fotoğrafı tam boyuta getirme"] },
  },
  "image-compress": {
    en: { primary: "compress image file size online", secondary: ["reduce photo size free", "make an image smaller for the web"] },
    az: { primary: "şəkil fayl ölçüsünü sıxmaq", secondary: ["foto ölçüsünü azaltmaq", "veb üçün şəkli kiçiltmək"] },
    tr: { primary: "görsel dosya boyutunu sıkıştırma", secondary: ["fotoğraf boyutunu küçültme", "web için görseli küçültme"] },
  },
  "image-converter": {
    en: { primary: "convert image format online", secondary: ["change image file type", "convert between jpg, png and webp"] },
    az: { primary: "şəkil formatını çevirmək", secondary: ["şəkil fayl növünü dəyişmək", "jpg, png və webp arasında çevirmək"] },
    tr: { primary: "görsel formatını dönüştürme", secondary: ["görsel dosya türünü değiştirme", "jpg, png ve webp arasında dönüştürme"] },
  },
  "jpg-to-png": {
    en: { primary: "convert jpg to png online", secondary: ["jpg to transparent png", "change jpg format to png"] },
    az: { primary: "jpg-ni png-yə çevirmək", secondary: ["jpg-ni şəffaf png-yə çevirmək", "jpg formatını png-yə dəyişmək"] },
    tr: { primary: "jpg'yi png'ye çevirme", secondary: ["jpg'yi şeffaf png'ye çevirme", "jpg formatını png'ye değiştirme"] },
  },
  "png-to-jpg": {
    en: { primary: "convert png to jpg online", secondary: ["png to a smaller jpg file", "change png format to jpg"] },
    az: { primary: "png-ni jpg-yə çevirmək", secondary: ["png-ni kiçik jpg faylına çevirmək", "png formatını jpg-yə dəyişmək"] },
    tr: { primary: "png'yi jpg'ye çevirme", secondary: ["png'yi küçük jpg dosyasına çevirme", "png formatını jpg'ye değiştirme"] },
  },
  "webp-converter": {
    en: { primary: "convert webp image online", secondary: ["webp to jpg or png", "convert an image to webp format"] },
    az: { primary: "webp şəklini çevirmək", secondary: ["webp-dən jpg və ya png-yə", "şəkli webp formatına çevirmək"] },
    tr: { primary: "webp görselini dönüştürme", secondary: ["webp'den jpg veya png'ye", "görseli webp formatına çevirme"] },
  },
  "image-crop": {
    en: { primary: "crop an image online", secondary: ["cut a photo to a specific area", "crop a picture free"] },
    az: { primary: "şəkli kəsmək", secondary: ["fotonu müəyyən sahəyə kəsmək", "şəkli pulsuz kəsmək"] },
    tr: { primary: "görsel kırpma", secondary: ["fotoğrafı belirli alana kırpma", "görseli ücretsiz kırpma"] },
  },
  "image-rotate": {
    en: { primary: "rotate an image online", secondary: ["fix photo orientation", "turn a picture sideways"] },
    az: { primary: "şəkli döndürmək", secondary: ["foto istiqamətini düzəltmək", "şəkli düz etmək"] },
    tr: { primary: "görsel döndürme", secondary: ["fotoğraf yönünü düzeltme", "görseli düzeltme"] },
  },
  "background-remover": {
    en: { primary: "remove background from an image online", secondary: ["automatic background removal", "cut out a photo background free"] },
    az: { primary: "şəkildən fonu silmək", secondary: ["avtomatik fon silmə", "foto fonunu pulsuz silmək"] },
    tr: { primary: "görsel arka planını kaldırma", secondary: ["otomatik arka plan silme", "fotoğraf arka planını ücretsiz kaldırma"] },
  },
  "image-to-pdf": {
    en: { primary: "convert image to pdf online", secondary: ["combine photos into a pdf", "make a pdf from pictures"] },
    az: { primary: "şəkli pdf-ə çevirmək", secondary: ["fotoları pdf-ə birləşdirmək", "şəkillərdən pdf yaratmaq"] },
    tr: { primary: "görseli pdf'ye çevirme", secondary: ["fotoğrafları pdf'de birleştirme", "görsellerden pdf oluşturma"] },
  },
  "pdf-to-image": {
    en: { primary: "convert pdf to image online", secondary: ["pdf pages to picture files", "extract images from a pdf"] },
    az: { primary: "pdf-i şəkilə çevirmək", secondary: ["pdf səhifələrini fotoya çevirmək", "pdf-dən şəkil çıxarmaq"] },
    tr: { primary: "pdf'yi görsele çevirme", secondary: ["pdf sayfalarını fotoğrafa çevirme", "pdf'den görsel çıkarma"] },
  },

  "gif-maker": {
    en: { primary: "create an animated gif online", secondary: ["make a gif from images free", "gif maker from photos"] },
    az: { primary: "animasiyalı gif yaratmaq", secondary: ["şəkillərdən pulsuz gif yaratmaq", "fotolardan gif düzəltmək"] },
    tr: { primary: "animasyonlu gif oluşturma", secondary: ["görsellerden ücretsiz gif yapma", "fotoğraflardan gif oluşturma"] },
  },
  "meme-generator": {
    en: { primary: "create a meme online", secondary: ["make a meme with text and an image", "free meme maker"] },
    az: { primary: "onlayn mem yaratmaq", secondary: ["mətn və şəkillə mem düzəltmək", "pulsuz mem generatoru"] },
    tr: { primary: "online meme oluşturma", secondary: ["metin ve görselle meme yapma", "ücretsiz meme oluşturucu"] },
  },
  "color-palette-generator": {
    en: { primary: "generate a color palette online", secondary: ["color scheme from an image", "create a color palette for design"] },
    az: { primary: "rəng palitrası yaratmaq", secondary: ["şəkildən rəng sxemi", "dizayn üçün rəng palitrası"] },
    tr: { primary: "renk paleti oluşturma", secondary: ["görselden renk şeması", "tasarım için renk paleti"] },
  },
};

export interface PageIntent {
  primary: string;
}

export const PAGE_INTENT: Record<string, Record<Language, PageIntent>> = {
  home: {
    en: { primary: "free online tools for qr codes, pdfs and images" },
    az: { primary: "pulsuz onlayn qr, pdf və şəkil alətləri" },
    tr: { primary: "ücretsiz online qr, pdf ve görsel araçları" },
  },
  tools: {
    en: { primary: "browse all online tools" },
    az: { primary: "bütün onlayn alətlərə baxmaq" },
    tr: { primary: "tüm online araçlara göz atma" },
  },
  blog: {
    en: { primary: "qr code, pdf and image guides" },
    az: { primary: "qr kod, pdf və şəkil bələdçiləri" },
    tr: { primary: "qr kod, pdf ve görsel rehberleri" },
  },
  faq: {
    en: { primary: "codivio frequently asked questions" },
    az: { primary: "codivio tez-tez verilən suallar" },
    tr: { primary: "codivio sıkça sorulan sorular" },
  },
  about: {
    en: { primary: "about codivio's mission" },
    az: { primary: "codivio haqqında məlumat" },
    tr: { primary: "codivio hakkında bilgi" },
  },
  contact: {
    en: { primary: "contact codivio support" },
    az: { primary: "codivio ilə əlaqə" },
    tr: { primary: "codivio ile iletişim" },
  },
  privacy: {
    en: { primary: "codivio privacy policy" },
    az: { primary: "codivio məxfilik siyasəti" },
    tr: { primary: "codivio gizlilik politikası" },
  },
  terms: {
    en: { primary: "codivio terms of service" },
    az: { primary: "codivio istifadə şərtləri" },
    tr: { primary: "codivio kullanım koşulları" },
  },
  cookies: {
    en: { primary: "codivio cookie policy" },
    az: { primary: "codivio kuki siyasəti" },
    tr: { primary: "codivio çerez politikası" },
  },
  pricing: {
    en: { primary: "codivio pricing and plans" },
    az: { primary: "codivio qiymətləri və planları" },
    tr: { primary: "codivio fiyatlandırma ve planları" },
  },
  sitemap: {
    en: { primary: "codivio site map" },
    az: { primary: "codivio sayt xəritəsi" },
    tr: { primary: "codivio site haritası" },
  },
  robots: {
    en: { primary: "codivio robots.txt policy" },
    az: { primary: "codivio robots.txt siyasəti" },
    tr: { primary: "codivio robots.txt politikası" },
  },
};
