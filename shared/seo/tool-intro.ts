import type { Language } from "../i18n/languages";

/**
 * Codivio SEO — tool introduction sentences, extracted from
 * `shared/seo/content.ts`'s `TOOL_CONTENT` (Phase 3.4) into their own
 * small, standalone module (Phase 3.15 Change Control: HTMLRewriter
 * critical content injection).
 *
 * Why this file exists rather than importing `content.ts` directly from
 * the Worker: `content.ts` is ~1900 lines (34 tools × 3 languages ×
 * introduction/valueProposition/benefits/howToSteps/useCases/faq) and is
 * deliberately kept out of the Worker bundle and out of eagerly-loaded
 * client code (see `shared/seo/ai.ts`'s own header comment and
 * DECISIONS.md's Phase 3.8 entry — the same bundle-size concern that led
 * to `getToolDisplayName` there reading only `TOOL_SEO`, not
 * `TOOL_CONTENT`). The Worker's HTMLRewriter content injection needs only
 * the one-sentence introduction, not the full blueprint, so only that
 * field is factored out here — a narrowly-scoped, single-purpose export,
 * not a second copy of the full content dataset.
 *
 * `content.ts`'s `TOOL_CONTENT` imports and reuses this exact object for
 * its own `introduction` field (see below) — there is exactly one
 * canonical copy of each tool's introduction sentence, not two
 * independently-maintained ones.
 */
export const TOOL_INTRODUCTIONS: Record<string, Record<Language, string>> = {
  "qr-code-generator": {
    en: "A QR code generator turns information like a link or text into a scannable square code.",
    az: "QR kod generatoru link və ya mətn kimi məlumatı skan edilə bilən kvadrat koda çevirir.",
    tr: "QR kod oluşturucu, bir bağlantı veya metin gibi bilgiyi taranabilir kare bir koda dönüştürür.",
  },
  "qr-code-scanner": {
    en: "A QR code scanner reads a QR code using a camera or an uploaded image and reveals what it contains.",
    az: "QR kod skaneri kamera və ya yüklənmiş şəkil vasitəsilə QR kodu oxuyur və içindəkiləri göstərir.",
    tr: "QR kod okuyucu, bir kamera veya yüklenen görsel aracılığıyla QR kodu okur ve içeriğini gösterir.",
  },
  "url-to-qr": {
    en: "This tool turns a website link into a QR code that opens the page when scanned.",
    az: "Bu alət veb sayt linkini skan edildikdə səhifəni açan QR koda çevirir.",
    tr: "Bu araç, bir web sitesi bağlantısını taratıldığında sayfayı açan bir QR koda dönüştürür.",
  },
  "text-to-qr": {
    en: "This tool encodes plain text directly into a QR code, without needing a link.",
    az: "Bu alət sadə mətni link tələb etmədən birbaşa QR koda kodlaşdırır.",
    tr: "Bu araç, düz metni bir bağlantıya gerek kalmadan doğrudan bir QR koda kodlar.",
  },
  "wifi-qr": {
    en: "This tool creates a QR code that lets a phone join a WiFi network without typing the password.",
    az: "Bu alət telefonun şifrəni yazmadan WiFi şəbəkəsinə qoşulmasını təmin edən QR kod yaradır.",
    tr: "Bu araç, bir telefonun şifreyi yazmadan WiFi ağına bağlanmasını sağlayan bir QR kod oluşturur.",
  },
  "vcard-qr": {
    en: "This tool turns your contact details into a QR code that saves them to someone's phone in one scan.",
    az: "Bu alət əlaqə məlumatlarınızı bir skanla telefona yadda saxlanılan QR koda çevirir.",
    tr: "Bu araç, iletişim bilgilerinizi tek bir taramayla telefona kaydedilen bir QR koda dönüştürür.",
  },
  "email-qr": {
    en: "This tool creates a QR code that opens a new email already addressed to you, with a subject if you choose.",
    az: "Bu alət sizə ünvanlanmış, istəyə görə mövzulu yeni e-poçt açan QR kod yaradır.",
    tr: "Bu araç, size adreslenmiş, isterseniz konusu da eklenmiş yeni bir e-posta açan bir QR kod oluşturur.",
  },
  "sms-qr": {
    en: "This tool creates a QR code that opens a pre-written text message ready to send.",
    az: "Bu alət göndərilməyə hazır, əvvəlcədən yazılmış mətn mesajı açan QR kod yaradır.",
    tr: "Bu araç, gönderilmeye hazır, önceden yazılmış bir metin mesajı açan bir QR kod oluşturur.",
  },
  "whatsapp-qr": {
    en: "This tool creates a QR code that opens a WhatsApp conversation with a chosen number.",
    az: "Bu alət seçilmiş nömrə ilə WhatsApp söhbətini açan QR kod yaradır.",
    tr: "Bu araç, seçilen bir numarayla WhatsApp sohbetini açan bir QR kod oluşturur.",
  },
  "phone-qr": {
    en: "This tool creates a QR code that starts a phone call to a chosen number when scanned.",
    az: "Bu alət skan edildikdə seçilmiş nömrəyə zəng başladan QR kod yaradır.",
    tr: "Bu araç, taratıldığında seçilen bir numarayı arayan bir QR kod oluşturur.",
  },
  "location-qr": {
    en: "This tool creates a QR code that opens a specific map location when scanned.",
    az: "Bu alət skan edildikdə konkret xəritə məkanını açan QR kod yaradır.",
    tr: "Bu araç, taratıldığında belirli bir harita konumunu açan bir QR kod oluşturur.",
  },
  "calendar-qr": {
    en: "This tool creates a QR code that adds an event straight to a guest's calendar.",
    az: "Bu alət tədbiri birbaşa qonağın təqviminə əlavə edən QR kod yaradır.",
    tr: "Bu araç, bir etkinliği doğrudan misafirin takvimine ekleyen bir QR kod oluşturur.",
  },
  "pdf-merge": {
    en: "PDF merging combines two or more separate PDF files into a single document.",
    az: "PDF birləşdirmə iki və ya daha çox ayrı PDF faylını tək sənəddə birləşdirir.",
    tr: "PDF birleştirme, iki veya daha fazla ayrı PDF dosyasını tek bir belgede birleştirir.",
  },
  "pdf-split": {
    en: "PDF splitting separates one PDF document into multiple smaller files by page range.",
    az: "PDF bölmə bir PDF sənədini səhifə aralığına görə bir neçə kiçik fayla ayırır.",
    tr: "PDF bölme, bir PDF belgesini sayfa aralığına göre birden fazla küçük dosyaya ayırır.",
  },
  "pdf-compress": {
    en: "PDF compression reduces a file's size while keeping it readable, often because scanned images make PDFs large.",
    az: "PDF sıxma faylın oxunaqlı qalmasını təmin edərək ölçüsünü azaldır; adətən skan edilmiş şəkillər PDF-i böyük edir.",
    tr: "PDF sıkıştırma, dosyayı okunabilir tutarken boyutunu küçültür; genellikle taranmış görseller PDF'yi büyütür.",
  },
  "pdf-to-jpg": {
    en: "This tool converts each page of a PDF into a separate JPG image file.",
    az: "Bu alət PDF-in hər səhifəsini ayrı JPG şəkil faylına çevirir.",
    tr: "Bu araç, bir PDF'nin her sayfasını ayrı bir JPG görsel dosyasına dönüştürür.",
  },
  "jpg-to-pdf": {
    en: "This tool combines one or more JPG images into a single PDF document.",
    az: "Bu alət bir və ya bir neçə JPG şəklini tək PDF sənədində birləşdirir.",
    tr: "Bu araç, bir veya birden fazla JPG görselini tek bir PDF belgesinde birleştirir.",
  },
  "pdf-to-word": {
    en: "This tool converts a PDF document into an editable Word file.",
    az: "Bu alət PDF sənədini redaktə edilə bilən Word faylına çevirir.",
    tr: "Bu araç, bir PDF belgesini düzenlenebilir bir Word dosyasına dönüştürür.",
  },
  "pdf-to-excel": {
    en: "This tool extracts suitable tables from a PDF document into an Excel file.",
    az: "Bu alət PDF sənədindəki uyğun cədvəlləri Excel faylına çıxarır.",
    tr: "Bu araç, bir PDF belgesindeki uygun tabloları bir Excel dosyasına çıkarır.",
  },
  "pdf-rotate": {
    en: "This tool rotates one or all pages of a PDF to fix their orientation.",
    az: "Bu alət PDF-in bir və ya bütün səhifələrini döndürərək istiqamətini düzəldir.",
    tr: "Bu araç, yönlerini düzeltmek için bir PDF'nin bir veya tüm sayfalarını döndürür.",
  },
  "image-resize": {
    en: "Image resizing changes a photo's pixel dimensions to fit a specific width and height.",
    az: "Şəkil ölçüləndirmə fotonun piksel ölçülərini konkret en və hündürlüyə uyğunlaşdırır.",
    tr: "Görsel boyutlandırma, bir fotoğrafın piksel boyutlarını belirli bir genişlik ve yüksekliğe uyacak şekilde değiştirir.",
  },
  "image-compress": {
    en: "Image compression reduces a photo's file size, which is useful because high-resolution photos can be quite large.",
    az: "Şəkil sıxma foto fayl ölçüsünü azaldır; bu, yüksək keyfiyyətli fotoların kifayət qədər böyük ola bilməsi səbəbindən faydalıdır.",
    tr: "Görsel sıkıştırma, bir fotoğrafın dosya boyutunu küçültür; bu, yüksek çözünürlüklü fotoğrafların oldukça büyük olabilmesi nedeniyle faydalıdır.",
  },
  "image-converter": {
    en: "This tool converts an image between popular formats like JPG, PNG and WebP.",
    az: "Bu alət şəkli JPG, PNG və WebP kimi məşhur formatlar arasında çevirir.",
    tr: "Bu araç, bir görseli JPG, PNG ve WebP gibi popüler formatlar arasında dönüştürür.",
  },
  "jpg-to-png": {
    en: "This tool converts a JPG image into PNG format, which supports transparency.",
    az: "Bu alət JPG şəklini şəffaflığı dəstəkləyən PNG formatına çevirir.",
    tr: "Bu araç, bir JPG görseli, şeffaflığı destekleyen PNG formatına dönüştürür.",
  },
  "png-to-jpg": {
    en: "This tool converts a PNG image into JPG format, typically resulting in a smaller file.",
    az: "Bu alət PNG şəklini adətən daha kiçik fayl verən JPG formatına çevirir.",
    tr: "Bu araç, bir PNG görseli genellikle daha küçük bir dosyayla sonuçlanan JPG formatına dönüştürür.",
  },
  "webp-converter": {
    en: "This tool converts images to or from the WebP format, a modern format designed for smaller web images.",
    az: "Bu alət şəkilləri veb üçün kiçik ölçü nəzərdə tutulmuş müasir format olan WebP-ə və ya WebP-dən çevirir.",
    tr: "Bu araç, görselleri daha küçük web görselleri için tasarlanmış modern bir format olan WebP'ye veya WebP'den dönüştürür.",
  },
  "image-crop": {
    en: "Image cropping removes the parts of a photo outside a chosen area, keeping only what's needed.",
    az: "Şəkil kəsmə fotonun seçilmiş sahədən kənar hissələrini silərək yalnız lazım olanı saxlayır.",
    tr: "Görsel kırpma, bir fotoğrafın seçilen alan dışındaki kısımlarını kaldırarak yalnızca gerekeni bırakır.",
  },
  "image-rotate": {
    en: "Image rotation turns a photo to correct its orientation, such as fixing a sideways picture.",
    az: "Şəkil döndürmə fotonun istiqamətini düzəldir, məsələn, yan çəkilmiş şəkli düzəldir.",
    tr: "Görsel döndürme, yan çekilmiş bir fotoğrafı düzeltmek gibi, fotoğrafın yönünü düzeltmek için çevirir.",
  },
  "background-remover": {
    en: "Background removal isolates the main subject of a photo by removing everything behind it.",
    az: "Fon silmə fotonun arxasındakı hər şeyi silərək əsas obyekti ayırır.",
    tr: "Arka plan kaldırma, bir fotoğrafın arkasındaki her şeyi kaldırarak ana öğeyi ayırır.",
  },
  "image-to-pdf": {
    en: "This tool combines one or more images into a single PDF document.",
    az: "Bu alət bir və ya bir neçə şəkli tək PDF sənədində birləşdirir.",
    tr: "Bu araç, bir veya birden fazla görseli tek bir PDF belgesinde birleştirir.",
  },
  "pdf-to-image": {
    en: "This tool converts each page of a PDF into a separate image file.",
    az: "Bu alət PDF-in hər səhifəsini ayrı şəkil faylına çevirir.",
    tr: "Bu araç, bir PDF'nin her sayfasını ayrı bir görsel dosyasına dönüştürür.",
  },
  "gif-maker": {
    en: "A GIF maker combines a sequence of images or frames into a short, looping animation.",
    az: "GIF yaradıcısı şəkil və ya kadr ardıcıllığını qısa, dövri animasiyada birləşdirir.",
    tr: "Bir GIF oluşturucu, bir dizi görsel veya kareyi kısa, döngülü bir animasyonda birleştirir.",
  },
  "meme-generator": {
    en: "A meme generator adds custom text, usually at the top and bottom, to an image.",
    az: "Mem generatoru şəklə adətən yuxarı və aşağı hissədə fərdi mətn əlavə edir.",
    tr: "Bir meme oluşturucu, genellikle üstte ve altta olmak üzere bir görsele özel metin ekler.",
  },
  "color-palette-generator": {
    en: "A color palette generator extracts or suggests a set of matching colors, often based on an image.",
    az: "Rəng palitrası generatoru adətən şəkil əsasında uyğun gələn rənglər toplusunu çıxarır və ya təklif edir.",
    tr: "Bir renk paleti oluşturucu, genellikle bir görsele dayanarak uyumlu bir renk setini çıkarır veya önerir.",
  },
};
