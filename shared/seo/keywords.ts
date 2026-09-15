import type { Language } from "../i18n/languages";
import { TOOL_INTENT } from "./intent";

/**
 * Codivio SEO — keyword & search-intent strategy (Phase 3.3).
 *
 * Extends shared/seo/intent.ts rather than duplicating it: `primaryKeyword`
 * and `secondaryKeywords` below are read directly from TOOL_INTENT (the
 * same primary/secondary phrases audited in Phase 3.2) — this file adds
 * only what Phase 3.2 didn't already cover: long-tail phrasing, explicit
 * search-intent classification, commercial-intent applicability, future
 * content/related-tool opportunities, and a cannibalization-risk rating.
 *
 * NO NUMERIC KEYWORD DATA (search volume, CPC, difficulty, rankings,
 * impressions, clicks) appears anywhere in this file. No keyword-data API
 * (Search Console, Keyword Planner, or similar) is connected in this
 * environment — see PROJECT_STATE.md's "Keyword & Search-Intent Strategy"
 * section for what was actually checked. Every field here is qualitative,
 * editorial judgment grounded in the tool's real function and in publicly
 * observable competitor page structure (see DECISIONS.md's Phase 3.3
 * entry for the specific competitor pages reviewed) — never a fabricated
 * metric presented as real.
 */

export type SearchIntentType = "transactional" | "informational" | "commercial-investigation" | "navigational";

export type CannibalizationRisk = "SAFE" | "WATCH" | "CONFLICT";

export interface LongTailEntry {
  en: string[];
  az: string[];
  tr: string[];
}

export interface ToolKeywordEntry {
  category: "QR Tools" | "PDF Tools" | "Image Tools" | "Other Tools";
  longTail: LongTailEntry;
  /** The dominant real-world intent behind the tool's own primary keyword.
   * Almost every tool here is "transactional" (the user wants to do the
   * task right now) — that's an honest finding, not a template default;
   * see PROJECT_STATE.md for why forcing artificial variety here would be
   * inaccurate. The "informational" ("how to X") variant of the same
   * keyword is captured in `futureContentOpportunity`, not here. */
  searchIntent: SearchIntentType;
  /** Whether a real "which tool is better/free/best" comparison query
   * realistically exists for this specific function (true only for the
   * handful of broad, frequently-compared categories — see DECISIONS.md). */
  commercialIntentApplicable: boolean;
  futureContentOpportunity: string;
  relatedToolOpportunity: string[];
  cannibalizationRisk: CannibalizationRisk;
  notes: string;
}

export const TOOL_KEYWORDS: Record<string, ToolKeywordEntry> = {
  "qr-code-generator": {
    category: "QR Tools",
    longTail: {
      en: ["create a qr code with logo online free", "generate qr code for a business card"],
      az: ["loqolu qr kod pulsuz yaratmaq", "biznes kartı üçün qr kod yaratmaq"],
      tr: ["logolu qr kod ücretsiz oluşturma", "kartvizit için qr kod oluşturma"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: true,
    futureContentOpportunity: "Blog/how-to: \"How to create a QR code for free\" + a QR-code basics explainer.",
    relatedToolOpportunity: ["url-to-qr", "text-to-qr"],
    cannibalizationRisk: "WATCH",
    notes:
      "Broad hub tool vs. 11 content-specific QR generators. Phase 3.2 confirmed no primary-intent collision, but this is the closest hub-vs-specific relationship in the registry — worth monitoring as content grows, not a real conflict today.",
  },
  "qr-code-scanner": {
    category: "QR Tools",
    longTail: {
      en: ["scan qr code without downloading an app", "scan qr code from a saved image"],
      az: ["tətbiq yükləmədən qr kod skan etmək", "yaddaşdakı şəkildən qr kod skan etmək"],
      tr: ["uygulama indirmeden qr kod okutma", "kaydedilmiş görselden qr kod okutma"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to scan a QR code without a phone app\".",
    relatedToolOpportunity: ["qr-code-generator"],
    cannibalizationRisk: "SAFE",
    notes: "Read direction (scan) vs. every other QR tool's write direction (generate) — no overlap.",
  },
  "url-to-qr": {
    category: "QR Tools",
    longTail: {
      en: ["generate qr code for a website link free", "create a trackable qr code for a url"],
      az: ["veb sayt linki üçün pulsuz qr kod", "url üçün izlənilə bilən qr kod"],
      tr: ["web bağlantısı için ücretsiz qr kod", "url için izlenebilir qr kod oluşturma"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to turn a link into a QR code for a flyer or menu\".",
    relatedToolOpportunity: ["qr-code-generator", "text-to-qr"],
    cannibalizationRisk: "WATCH",
    notes: "Overlaps qr-code-generator's own copy (\"website links\") — reviewed in Phase 3.2, distinct enough by exact-match query specificity, not a conflict.",
  },
  "text-to-qr": {
    category: "QR Tools",
    longTail: {
      en: ["create qr code for a short message", "generate qr code without a link"],
      az: ["qısa mesaj üçün qr kod yaratmaq", "linksiz mətn üçün qr kod"],
      tr: ["kısa mesaj için qr kod oluşturma", "bağlantısız metin için qr kod"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to share plain text with a QR code\".",
    relatedToolOpportunity: ["qr-code-generator", "url-to-qr"],
    cannibalizationRisk: "WATCH",
    notes: "Same hub-vs-specific relationship as url-to-qr — same conclusion.",
  },
  "wifi-qr": {
    category: "QR Tools",
    longTail: {
      en: ["create qr code for guest wifi access", "generate wifi qr code for a home network"],
      az: ["qonaq wifi girişi üçün qr kod", "ev şəbəkəsi üçün wifi qr kodu"],
      tr: ["misafir wifi erişimi için qr kod", "ev ağı için wifi qr kodu"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to share your WiFi password with a QR code\".",
    relatedToolOpportunity: ["qr-code-generator"],
    cannibalizationRisk: "SAFE",
    notes: "Unambiguous, unique data type (network credentials) — no overlap with any other tool.",
  },
  "vcard-qr": {
    category: "QR Tools",
    longTail: {
      en: ["create a digital business card qr code", "generate qr code with name phone and email"],
      az: ["rəqəmsal vizit kartı üçün qr kod", "ad telefon və e-poçtla qr kod"],
      tr: ["dijital kartvizit için qr kod", "ad telefon ve e-postayla qr kod"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to make a digital business card with a QR code\".",
    relatedToolOpportunity: ["qr-code-generator", "email-qr"],
    cannibalizationRisk: "SAFE",
    notes: "Contact-card data type is unique among the QR set.",
  },
  "email-qr": {
    category: "QR Tools",
    longTail: {
      en: ["create qr code with a pre-written email subject", "generate qr code to contact by email"],
      az: ["hazır mövzulu e-poçt üçün qr kod", "e-poçtla əlaqə üçün qr kod"],
      tr: ["hazır konulu e-posta için qr kod", "e-posta ile iletişim için qr kod"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to create a QR code that opens a pre-filled email\".",
    relatedToolOpportunity: ["vcard-qr", "sms-qr"],
    cannibalizationRisk: "SAFE",
    notes: "Distinct contact-method channel from SMS/WhatsApp/Phone QR — no overlap.",
  },
  "sms-qr": {
    category: "QR Tools",
    longTail: {
      en: ["create qr code with a pre-written text message", "generate qr code to send an sms fast"],
      az: ["hazır mətnli sms üçün qr kod", "sürətli sms göndərmək üçün qr kod"],
      tr: ["hazır metinli sms için qr kod", "hızlı sms göndermek için qr kod"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to create a QR code that sends a text message\".",
    relatedToolOpportunity: ["email-qr", "whatsapp-qr"],
    cannibalizationRisk: "SAFE",
    notes: "Distinct channel from Email/WhatsApp QR.",
  },
  "whatsapp-qr": {
    category: "QR Tools",
    longTail: {
      en: ["create qr code to message on whatsapp", "generate a whatsapp qr code for a business"],
      az: ["whatsapp-da mesajlaşmaq üçün qr kod", "biznes üçün whatsapp qr kodu"],
      tr: ["whatsapp'ta mesajlaşmak için qr kod", "işletme için whatsapp qr kodu"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to add a WhatsApp QR code to your storefront\".",
    relatedToolOpportunity: ["phone-qr", "sms-qr"],
    cannibalizationRisk: "SAFE",
    notes: "WhatsApp is a distinct, named platform query — no overlap with generic SMS/Phone QR.",
  },
  "phone-qr": {
    category: "QR Tools",
    longTail: {
      en: ["create qr code for click to call", "generate qr code to dial a phone number"],
      az: ["klikləyib zəng etmək üçün qr kod", "nömrəyə zəng üçün qr kod"],
      tr: ["tıkla ve ara için qr kod", "numarayı aramak için qr kod"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to create a click-to-call QR code\".",
    relatedToolOpportunity: ["whatsapp-qr", "sms-qr"],
    cannibalizationRisk: "SAFE",
    notes: "Distinct action (dial) from messaging-channel QR tools.",
  },
  "location-qr": {
    category: "QR Tools",
    longTail: {
      en: ["create qr code for a store location", "generate qr code with gps coordinates"],
      az: ["mağaza ünvanı üçün qr kod", "gps koordinatları ilə qr kod"],
      tr: ["mağaza konumu için qr kod", "gps koordinatlarıyla qr kod"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to create a QR code that opens directions to your store\".",
    relatedToolOpportunity: ["calendar-qr"],
    cannibalizationRisk: "SAFE",
    notes: "Unique data type (map coordinates).",
  },
  "calendar-qr": {
    category: "QR Tools",
    longTail: {
      en: ["create qr code to add an event to a calendar", "generate qr code for a meeting invite"],
      az: ["təqvimə tədbir əlavə etmək üçün qr kod", "görüş dəvəti üçün qr kod"],
      tr: ["takvime etkinlik eklemek için qr kod", "toplantı daveti için qr kod"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to share an event with a QR code invite\".",
    relatedToolOpportunity: ["location-qr", "vcard-qr"],
    cannibalizationRisk: "SAFE",
    notes: "Unique data type (calendar event).",
  },

  "pdf-merge": {
    category: "PDF Tools",
    longTail: {
      en: ["merge pdf files without installing software", "combine pdf files in a specific order"],
      az: ["proqram quraşdırmadan pdf birləşdirmək", "müəyyən sırada pdf faylları birləşdirmək"],
      tr: ["yazılım kurmadan pdf birleştirme", "belirli sırada pdf dosyaları birleştirme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to merge PDF files online for free\".",
    relatedToolOpportunity: ["pdf-split", "pdf-compress"],
    cannibalizationRisk: "SAFE",
    notes: "Distinct action from split/compress — no overlap.",
  },
  "pdf-split": {
    category: "PDF Tools",
    longTail: {
      en: ["extract specific pages from a pdf file", "split a large pdf into smaller files"],
      az: ["pdf-dən konkret səhifələri çıxarmaq", "böyük pdf-i kiçik fayllara bölmək"],
      tr: ["pdf'den belirli sayfaları çıkarma", "büyük pdf'yi küçük dosyalara bölme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to extract pages from a PDF\".",
    relatedToolOpportunity: ["pdf-merge", "pdf-compress"],
    cannibalizationRisk: "SAFE",
    notes: "Inverse of merge — distinct query.",
  },
  "pdf-compress": {
    category: "PDF Tools",
    longTail: {
      en: ["compress pdf to email attachment size", "reduce pdf size without losing quality"],
      az: ["pdf-i e-poçta əlavə üçün sıxmaq", "keyfiyyəti itirmədən pdf ölçüsünü azaltmaq"],
      tr: ["pdf'yi e-posta eki boyutuna sıkıştırma", "kalite kaybetmeden pdf boyutunu küçültme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: true,
    futureContentOpportunity: "How-to: \"How to reduce PDF file size for email\".",
    relatedToolOpportunity: ["pdf-merge", "pdf-split"],
    cannibalizationRisk: "SAFE",
    notes: "One of the few PDF tools with real \"best PDF compressor\" comparison search behavior.",
  },
  "pdf-to-jpg": {
    category: "PDF Tools",
    longTail: {
      en: ["convert scanned pdf pages to jpg images", "save a pdf page as a jpg photo"],
      az: ["skan edilmiş pdf səhifələrini jpg-yə çevirmək", "pdf səhifəsini jpg foto kimi saxlamaq"],
      tr: ["taranmış pdf sayfalarını jpg'ye çevirme", "pdf sayfasını jpg fotoğraf olarak kaydetme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to convert a PDF page to a JPG image\".",
    relatedToolOpportunity: ["pdf-to-image", "jpg-to-pdf"],
    cannibalizationRisk: "WATCH",
    notes: "Format-specific (JPG) vs. pdf-to-image's generic output. Phase 3.2 confirmed distinct primary intent; kept on WATCH since the two are conceptually close and should be re-checked if either tool's copy changes.",
  },
  "jpg-to-pdf": {
    category: "PDF Tools",
    longTail: {
      en: ["combine multiple photos into one pdf document", "create a pdf from scanned photos"],
      az: ["bir neçə fotonu tək pdf sənədinə birləşdirmək", "skan edilmiş fotolardan pdf yaratmaq"],
      tr: ["birden fazla fotoğrafı tek pdf'de birleştirme", "taranmış fotoğraflardan pdf oluşturma"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to turn photos into a single PDF\".",
    relatedToolOpportunity: ["image-to-pdf", "pdf-to-jpg"],
    cannibalizationRisk: "WATCH",
    notes: "Format-specific (JPG input) vs. image-to-pdf's generic input. Same reasoning as pdf-to-jpg/pdf-to-image.",
  },
  "pdf-to-word": {
    category: "PDF Tools",
    longTail: {
      en: ["convert pdf to word without losing formatting", "extract editable text from a scanned pdf"],
      az: ["formatı itirmədən pdf-i word-ə çevirmək", "skan edilmiş pdf-dən redaktə olunan mətn çıxarmaq"],
      tr: ["biçimi bozmadan pdf'yi word'e çevirme", "taranmış pdf'den düzenlenebilir metin çıkarma"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to convert a PDF into an editable Word document\".",
    relatedToolOpportunity: ["pdf-to-excel", "pdf-compress"],
    cannibalizationRisk: "SAFE",
    notes: "Distinct output format from pdf-to-excel — no overlap.",
  },
  "pdf-to-excel": {
    category: "PDF Tools",
    longTail: {
      en: ["convert a pdf financial table to excel", "extract data from a pdf report to a spreadsheet"],
      az: ["pdf maliyyə cədvəlini excel-ə çevirmək", "pdf hesabatından cədvələ məlumat çıxarmaq"],
      tr: ["pdf mali tablosunu excel'e çevirme", "pdf raporundan tabloya veri çıkarma"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to extract a table from a PDF into Excel\".",
    relatedToolOpportunity: ["pdf-to-word"],
    cannibalizationRisk: "SAFE",
    notes: "Distinct output format from pdf-to-word.",
  },
  "pdf-rotate": {
    category: "PDF Tools",
    longTail: {
      en: ["rotate a sideways scanned pdf page", "fix an upside-down pdf page orientation"],
      az: ["yan skan edilmiş pdf səhifəsini düzəltmək", "baş-ayaq pdf səhifəsini düzəltmək"],
      tr: ["yan taranmış pdf sayfasını düzeltme", "baş aşağı pdf sayfasını düzeltme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to fix a sideways-scanned PDF\".",
    relatedToolOpportunity: ["pdf-merge", "pdf-compress"],
    cannibalizationRisk: "SAFE",
    notes: "Unique action (orientation fix) among PDF tools.",
  },

  "image-resize": {
    category: "Image Tools",
    longTail: {
      en: ["resize a photo for an instagram post", "resize an image to a specific pixel width and height"],
      az: ["instagram postu üçün foto ölçüsü", "şəkli konkret piksel ölçüsünə salmaq"],
      tr: ["instagram gönderisi için fotoğraf boyutu", "görseli belirli piksel boyutuna getirme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to resize a photo for social media\".",
    relatedToolOpportunity: ["image-compress", "image-crop"],
    cannibalizationRisk: "SAFE",
    notes: "Dimension change vs. compress's file-size change — distinct, commonly-confused-but-different actions worth a comparison FAQ.",
  },
  "image-compress": {
    category: "Image Tools",
    longTail: {
      en: ["compress an image for a website without losing quality", "reduce a photo's file size for email"],
      az: ["keyfiyyəti itirmədən veb üçün şəkli sıxmaq", "e-poçt üçün foto ölçüsünü azaltmaq"],
      tr: ["kalite kaybetmeden web için görsel sıkıştırma", "e-posta için fotoğraf boyutunu küçültme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: true,
    futureContentOpportunity: "Blog: \"How image compression affects website loading speed\" (a real competitor content angle — see DECISIONS.md).",
    relatedToolOpportunity: ["image-resize", "image-converter"],
    cannibalizationRisk: "SAFE",
    notes: "One of the tools with genuine \"best image compressor\" comparison search behavior.",
  },
  "image-converter": {
    category: "Image Tools",
    longTail: {
      en: ["convert an image to a different file format online", "batch convert images between formats"],
      az: ["şəkli başqa fayl formatına onlayn çevirmək", "toplu şəkil format çevirmə"],
      tr: ["görseli farklı dosya formatına online çevirme", "toplu görsel format dönüştürme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: true,
    futureContentOpportunity: "Blog: \"JPG vs PNG vs WebP: which format should you use?\"",
    relatedToolOpportunity: ["jpg-to-png", "png-to-jpg", "webp-converter"],
    cannibalizationRisk: "SAFE",
    notes: "Generic hub for format conversion — the 3 specific-pair tools below serve exact-match queries this one doesn't directly target.",
  },
  "jpg-to-png": {
    category: "Image Tools",
    longTail: {
      en: ["convert jpg to png with a transparent background", "change a jpg photo to png format free"],
      az: ["jpg-ni şəffaf fonlu png-yə çevirmək", "jpg fotonu pulsuz png formatına dəyişmək"],
      tr: ["jpg'yi şeffaf arka planlı png'ye çevirme", "jpg fotoğrafı ücretsiz png formatına değiştirme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "Folds into the image-converter blog angle above — no separate article needed.",
    relatedToolOpportunity: ["png-to-jpg", "image-converter"],
    cannibalizationRisk: "SAFE",
    notes: "Direction-specific (JPG→PNG) vs. png-to-jpg's reverse direction — both are real, independently-searched queries.",
  },
  "png-to-jpg": {
    category: "Image Tools",
    longTail: {
      en: ["convert png to jpg for a smaller file size", "change a png image to jpg format free"],
      az: ["kiçik fayl ölçüsü üçün png-ni jpg-yə çevirmək", "png şəklini pulsuz jpg formatına dəyişmək"],
      tr: ["daha küçük dosya için png'yi jpg'ye çevirme", "png görseli ücretsiz jpg formatına değiştirme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "Folds into the image-converter blog angle above.",
    relatedToolOpportunity: ["jpg-to-png", "image-converter"],
    cannibalizationRisk: "SAFE",
    notes: "Reverse direction of jpg-to-png — distinct query, same reasoning.",
  },
  "webp-converter": {
    category: "Image Tools",
    longTail: {
      en: ["convert a webp image to jpg for compatibility", "change an old photo format to modern webp"],
      az: ["uyğunluq üçün webp şəklini jpg-yə çevirmək", "köhnə foto formatını müasir webp-ə dəyişmək"],
      tr: ["uyumluluk için webp görselini jpg'ye çevirme", "eski fotoğraf formatını modern webp'ye değiştirme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "Folds into the image-converter blog angle above.",
    relatedToolOpportunity: ["image-converter"],
    cannibalizationRisk: "SAFE",
    notes: "WebP is a distinct, named format query, bidirectional (to/from) — no overlap with the JPG↔PNG pair.",
  },
  "image-crop": {
    category: "Image Tools",
    longTail: {
      en: ["crop a photo to a square for a profile picture", "cut an unwanted part out of an image"],
      az: ["profil şəkli üçün fotonu kvadrat kəsmək", "şəkildən lazımsız hissəni kəsib atmaq"],
      tr: ["profil fotoğrafı için kare kırpma", "görselden istenmeyen kısmı kesip atma"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to crop a photo for a profile picture\".",
    relatedToolOpportunity: ["image-resize", "image-rotate"],
    cannibalizationRisk: "SAFE",
    notes: "Distinct action (area selection) from resize (dimension scaling).",
  },
  "image-rotate": {
    category: "Image Tools",
    longTail: {
      en: ["rotate a sideways phone photo online", "fix an upside-down image orientation free"],
      az: ["yan çəkilmiş telefon fotosunu düzəltmək", "baş-ayaq şəkli pulsuz düzəltmək"],
      tr: ["yan çekilmiş telefon fotoğrafını düzeltme", "baş aşağı görseli ücretsiz düzeltme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "Folds into a general \"fix photo orientation\" FAQ alongside pdf-rotate.",
    relatedToolOpportunity: ["image-crop"],
    cannibalizationRisk: "SAFE",
    notes: "Distinct media type from pdf-rotate — no overlap despite the similar action name.",
  },
  "background-remover": {
    category: "Image Tools",
    longTail: {
      en: ["remove background from a product photo for ecommerce", "make an image background transparent for a logo"],
      az: ["e-ticarət üçün məhsul fotosunun fonunu silmək", "loqo üçün şəkil fonunu şəffaf etmək"],
      tr: ["e-ticaret için ürün fotoğrafının arka planını kaldırma", "logo için görsel arka planını şeffaf yapma"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: true,
    futureContentOpportunity: "Blog: \"How to get a transparent product photo for an online store\".",
    relatedToolOpportunity: ["image-converter", "image-crop"],
    cannibalizationRisk: "SAFE",
    notes: "High-value, frequently-compared category (\"best background remover\") — real commercial-investigation intent exists.",
  },
  "image-to-pdf": {
    category: "Image Tools",
    longTail: {
      en: ["combine scanned document photos into one pdf", "turn phone photos into a pdf file"],
      az: ["skan edilmiş sənəd fotolarını tək pdf-ə birləşdirmək", "telefon fotolarını pdf faylına çevirmək"],
      tr: ["taranmış belge fotoğraflarını tek pdf'de birleştirme", "telefon fotoğraflarını pdf dosyasına çevirme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "Folds into the jpg-to-pdf how-to above (generic vs. JPG-specific).",
    relatedToolOpportunity: ["jpg-to-pdf", "pdf-to-image"],
    cannibalizationRisk: "WATCH",
    notes: "Generic (any image format) vs. jpg-to-pdf's JPG-specific input — same reasoning as the other converter pairs.",
  },
  "pdf-to-image": {
    category: "Image Tools",
    longTail: {
      en: ["save every pdf page as a separate picture", "convert pdf to image without losing quality"],
      az: ["hər pdf səhifəsini ayrı şəkil kimi saxlamaq", "keyfiyyəti itirmədən pdf-i şəkilə çevirmək"],
      tr: ["her pdf sayfasını ayrı görsel olarak kaydetme", "kalite kaybetmeden pdf'yi görsele çevirme"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "Folds into the pdf-to-jpg how-to above (generic vs. JPG-specific).",
    relatedToolOpportunity: ["pdf-to-jpg", "image-to-pdf"],
    cannibalizationRisk: "WATCH",
    notes: "Generic output format vs. pdf-to-jpg's JPG-specific output — the pair Phase 3.2 originally flagged for review.",
  },

  "gif-maker": {
    category: "Other Tools",
    longTail: {
      en: ["create a looping gif from multiple photos", "make a gif for social media free"],
      az: ["bir neçə fotodan dövri gif yaratmaq", "sosial media üçün pulsuz gif yaratmaq"],
      tr: ["birden fazla fotoğraftan döngülü gif yapma", "sosyal medya için ücretsiz gif oluşturma"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "How-to: \"How to make a GIF from photos for free\".",
    relatedToolOpportunity: ["meme-generator"],
    cannibalizationRisk: "SAFE",
    notes: "No other tool produces animated output — unique.",
  },
  "meme-generator": {
    category: "Other Tools",
    longTail: {
      en: ["add top and bottom text to a photo", "create a meme from a template image"],
      az: ["fotoya yuxarı və aşağı mətn əlavə etmək", "şablon şəkildən mem yaratmaq"],
      tr: ["fotoğrafa üst ve alt metin ekleme", "şablon görselden meme oluşturma"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "No dedicated article planned — high novelty/low informational depth for a how-to.",
    relatedToolOpportunity: ["gif-maker", "image-crop"],
    cannibalizationRisk: "SAFE",
    notes: "Distinct from gif-maker (static vs. animated output).",
  },
  "color-palette-generator": {
    category: "Other Tools",
    longTail: {
      en: ["extract a color palette from an uploaded photo", "generate matching colors for a website design"],
      az: ["yüklənmiş fotodan rəng palitrası çıxarmaq", "veb dizaynı üçün uyğun rənglər yaratmaq"],
      tr: ["yüklenen fotoğraftan renk paleti çıkarma", "web tasarımı için uyumlu renkler oluşturma"],
    },
    searchIntent: "transactional",
    commercialIntentApplicable: false,
    futureContentOpportunity: "Blog: \"How to build a color palette from a photo for your brand\".",
    relatedToolOpportunity: ["background-remover"],
    cannibalizationRisk: "SAFE",
    notes: "Unique function among the registry — no overlap.",
  },
};

/**
 * Future category-page keyword targets (Phase 3.3 architecture only — see
 * Step 5/9 of this checkpoint's brief). No category routes exist today
 * (confirmed: src/App.tsx has no /tools/category/* or similar route) and
 * none are created here. This documents what a future category page
 * WOULD target, so Phase 3.4+ doesn't have to re-derive it from scratch.
 */
function toolSlugsInCategory(category: ToolKeywordEntry["category"]): string[] {
  return Object.entries(TOOL_KEYWORDS)
    .filter(([, entry]) => entry.category === category)
    .map(([slug]) => slug);
}

export const CATEGORY_KEYWORD_OPPORTUNITIES: Record<
  ToolKeywordEntry["category"],
  { en: string; az: string; tr: string; wouldServeTools: string[] }
> = {
  "QR Tools": { en: "qr code tools", az: "qr kod alətləri", tr: "qr kod araçları", wouldServeTools: toolSlugsInCategory("QR Tools") },
  "PDF Tools": { en: "pdf tools", az: "pdf alətləri", tr: "pdf araçları", wouldServeTools: toolSlugsInCategory("PDF Tools") },
  "Image Tools": { en: "image tools", az: "şəkil alətləri", tr: "görsel araçları", wouldServeTools: toolSlugsInCategory("Image Tools") },
  "Other Tools": { en: "other online tools", az: "digər onlayn alətlər", tr: "diğer online araçlar", wouldServeTools: toolSlugsInCategory("Other Tools") },
};

/** Read the reused primary/secondary keyword for a tool in one language —
 * the single accessor Phase 3.4+ should use instead of reaching into both
 * TOOL_INTENT and TOOL_KEYWORDS separately. */
export function getToolKeywordProfile(slug: string, lang: Language) {
  const intent = TOOL_INTENT[slug]?.[lang];
  const extra = TOOL_KEYWORDS[slug];
  if (!intent || !extra) return null;
  return {
    primaryKeyword: intent.primary,
    secondaryKeywords: intent.secondary,
    longTailOpportunities: extra.longTail[lang],
    category: extra.category,
    searchIntent: extra.searchIntent,
    commercialIntentApplicable: extra.commercialIntentApplicable,
    futureContentOpportunity: extra.futureContentOpportunity,
    relatedToolOpportunity: extra.relatedToolOpportunity,
    cannibalizationRisk: extra.cannibalizationRisk,
    notes: extra.notes,
  };
}
