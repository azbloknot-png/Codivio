import { ROBOTS_INDEX_FOLLOW, ROBOTS_NOINDEX_FOLLOW, type SeoEntity } from "./types";

/**
 * Codivio SEO — per-tool metadata (Phase 3.1).
 *
 * One entry per real tool in src/App.tsx's registry (34 tools today — keep
 * this in sync whenever a tool is added/removed/renamed; tests/seo.test.ts
 * asserts the key sets match exactly). Every title/description is written
 * per language from the tool's actual one-line function — never a copy of
 * the on-page H1/description, and never a mechanical translation between
 * languages.
 *
 * Robots decision (see DECISIONS.md "SEO Metadata Architecture"): every
 * tool page today renders ToolPage.tsx's "Tool coming soon" placeholder —
 * none has real processing yet. Indexing a page that promises a working
 * tool it doesn't yet have would be exactly the misleading-metadata risk
 * Phase 3.1's own guideline-safety step warns against, so every entry here
 * is `noindex,follow`: crawlable (so internal links/discovery still work)
 * but excluded from search results until that specific tool ships real
 * functionality — at which point flipping its `robots` to index,follow is
 * a one-line change, not a rewrite.
 *
 * SEO follow-up (Phase 4.9): "qr-code-generator" and "qr-code-scanner"
 * shipped real, working functionality in Phase 4.1/4.6 — their `robots`
 * entries below are the first to actually flip to `index,follow`, exactly
 * as this comment always said would happen once a tool ships. Every other
 * entry below is still a placeholder and stays `noindex,follow` until it,
 * too, ships real functionality.
 */
export const TOOL_SEO: Record<string, SeoEntity> = {
  "qr-code-generator": {
    path: "/tools/qr-code-generator",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "QR Code Generator – Create Custom QR Codes Online",
        description:
          "Generate custom QR codes for website links, plain text and more with Codivio's free QR code generator.",
      },
      az: {
        title: "QR Kod Generatoru – Onlayn Fərdi QR Kodlar Yaradın",
        description:
          "Codivio-nun pulsuz QR kod generatoru ilə veb linklər, mətn və digər məlumatlar üçün fərdi QR kodlar yaradın.",
      },
      tr: {
        title: "QR Kod Oluşturucu – Online Özel QR Kodlar Oluşturun",
        description:
          "Codivio'nun ücretsiz QR kod oluşturucusuyla web bağlantıları, düz metin ve daha fazlası için özel QR kodlar oluşturun.",
      },
    },
  },

  "qr-code-scanner": {
    path: "/tools/qr-code-scanner",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "QR Code Scanner – Scan QR Codes Online",
        description:
          "Scan QR codes instantly using your device camera or by uploading an image, directly in your browser.",
      },
      az: {
        title: "QR Kod Skaneri – Onlayn QR Kod Skan Edin",
        description:
          "Cihazınızın kamerası və ya yüklədiyiniz şəkil vasitəsilə birbaşa brauzerinizdə QR kodları anında skan edin.",
      },
      tr: {
        title: "QR Kod Tarayıcı – Online QR Kod Okutun",
        description:
          "Cihazınızın kamerasını veya yüklediğiniz bir görseli kullanarak QR kodları doğrudan tarayıcınızda anında tarayın.",
      },
    },
  },

  "url-to-qr": {
    path: "/tools/url-to-qr",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "URL to QR Code – Convert a Link into a QR Code",
        description:
          "Turn any website URL into a scannable QR code that visitors can open instantly with their phone camera.",
      },
      az: {
        title: "URL-dən QR Koda – Linki QR Koda Çevirin",
        description:
          "İstənilən veb sayt linkini telefon kamerası ilə dərhal açıla bilən skan edilə bilən QR koda çevirin.",
      },
      tr: {
        title: "URL'den QR Koda – Bağlantıyı QR Koda Dönüştürün",
        description:
          "Herhangi bir web sitesi bağlantısını, ziyaretçilerin telefon kamerasıyla anında açabileceği bir QR koda dönüştürün.",
      },
    },
  },

  "text-to-qr": {
    path: "/tools/text-to-qr",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Text to QR Code – Turn Text into a QR Code",
        description: "Convert any plain text into a shareable QR code that others can scan and read instantly.",
      },
      az: {
        title: "Mətndən QR Koda – Mətni QR Koda Çevirin",
        description: "İstənilən mətni digərlərinin skan edib dərhal oxuya biləcəyi paylaşıla bilən QR koda çevirin.",
      },
      tr: {
        title: "Metinden QR Koda – Metni QR Koda Dönüştürün",
        description:
          "Herhangi bir düz metni, başkalarının tarayıp anında okuyabileceği paylaşılabilir bir QR koda dönüştürün.",
      },
    },
  },

  "wifi-qr": {
    path: "/tools/wifi-qr",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "WiFi QR Code Generator – Share WiFi Access Instantly",
        description:
          "Create a QR code that lets guests join your WiFi network instantly by scanning, without typing the password.",
      },
      az: {
        title: "WiFi QR Kod Generatoru – WiFi Girişini Anında Paylaşın",
        description:
          "Qonaqların şifrəni yazmadan skan edərək WiFi şəbəkənizə anında qoşulmasını təmin edən QR kod yaradın.",
      },
      tr: {
        title: "WiFi QR Kod Oluşturucu – WiFi Erişimini Anında Paylaşın",
        description:
          "Misafirlerin şifreyi yazmadan taratarak WiFi ağınıza anında bağlanmasını sağlayan bir QR kod oluşturun.",
      },
    },
  },

  "vcard-qr": {
    path: "/tools/vcard-qr",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "vCard QR Code – Share Contact Details Instantly",
        description:
          "Create a QR code from your contact details so others can save your name, phone and email with one scan.",
      },
      az: {
        title: "vCard QR Kod – Əlaqə Məlumatlarını Anında Paylaşın",
        description:
          "Əlaqə məlumatlarınızdan QR kod yaradın ki, digərləri bir skan ilə adınızı, telefonunuzu və e-poçtunuzu yadda saxlaya bilsin.",
      },
      tr: {
        title: "vCard QR Kod – İletişim Bilgilerini Anında Paylaşın",
        description:
          "İletişim bilgilerinizden bir QR kod oluşturun; böylece diğerleri tek bir taramayla adınızı, telefonunuzu ve e-postanızı kaydedebilir.",
      },
    },
  },

  "email-qr": {
    path: "/tools/email-qr",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Email QR Code Generator – Open a Pre-Filled Email",
        description: "Create a QR code that opens a ready-to-send email draft with your chosen recipient and subject.",
      },
      az: {
        title: "E-poçt QR Kod Generatoru – Hazır E-poçt Açın",
        description:
          "Skan edildikdə seçdiyiniz alıcı və mövzu ilə göndərməyə hazır e-poçt qaralaması açan QR kod yaradın.",
      },
      tr: {
        title: "E-posta QR Kod Oluşturucu – Hazır E-posta Açın",
        description:
          "Taratıldığında seçtiğiniz alıcı ve konuyla gönderilmeye hazır bir e-posta taslağı açan QR kod oluşturun.",
      },
    },
  },

  "sms-qr": {
    path: "/tools/sms-qr",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "SMS QR Code Generator – Send a Pre-Written Text",
        description: "Create a QR code that opens a pre-filled SMS message, ready to send to your chosen phone number.",
      },
      az: {
        title: "SMS QR Kod Generatoru – Hazır Mətn Mesajı Göndərin",
        description:
          "Skan edildikdə seçdiyiniz nömrəyə göndərməyə hazır, əvvəlcədən doldurulmuş SMS mesajı açan QR kod yaradın.",
      },
      tr: {
        title: "SMS QR Kod Oluşturucu – Hazır Metin Mesajı Gönderin",
        description:
          "Taratıldığında seçtiğiniz numaraya gönderilmeye hazır, önceden doldurulmuş bir SMS mesajı açan QR kod oluşturun.",
      },
    },
  },

  "whatsapp-qr": {
    path: "/tools/whatsapp-qr",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "WhatsApp QR Code Generator – Start a Chat Instantly",
        description: "Create a QR code that opens a WhatsApp conversation with your number instantly when scanned.",
      },
      az: {
        title: "WhatsApp QR Kod Generatoru – Söhbətə Anında Başlayın",
        description: "Skan edildikdə nömrənizlə WhatsApp söhbətini anında açan QR kod yaradın.",
      },
      tr: {
        title: "WhatsApp QR Kod Oluşturucu – Sohbete Anında Başlayın",
        description: "Taratıldığında numaranızla bir WhatsApp sohbetini anında açan QR kod oluşturun.",
      },
    },
  },

  "phone-qr": {
    path: "/tools/phone-qr",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Phone QR Code Generator – Start a Call Instantly",
        description:
          "Create a QR code that dials your chosen phone number instantly when scanned with a smartphone camera.",
      },
      az: {
        title: "Telefon QR Kod Generatoru – Zəngi Anında Başladın",
        description: "Smartfon kamerası ilə skan edildikdə seçdiyiniz nömrəni anında yığan QR kod yaradın.",
      },
      tr: {
        title: "Telefon QR Kod Oluşturucu – Aramayı Anında Başlatın",
        description: "Akıllı telefon kamerasıyla taratıldığında seçtiğiniz numarayı anında arayan QR kod oluşturun.",
      },
    },
  },

  "location-qr": {
    path: "/tools/location-qr",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Location QR Code Generator – Share a Map Pin",
        description:
          "Create a QR code that opens a specific map location, making it easy to share directions to any place.",
      },
      az: {
        title: "Məkan QR Kod Generatoru – Xəritə Nöqtəsini Paylaşın",
        description:
          "Skan edildikdə konkret xəritə məkanını açan QR kod yaradın və istənilən yerə yol tərifini asanlıqla paylaşın.",
      },
      tr: {
        title: "Konum QR Kod Oluşturucu – Harita Konumu Paylaşın",
        description:
          "Taratıldığında belirli bir harita konumunu açan QR kod oluşturun; herhangi bir yere yol tarifini kolayca paylaşın.",
      },
    },
  },

  "calendar-qr": {
    path: "/tools/calendar-qr",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Calendar QR Code Generator – Share Event Details",
        description:
          "Create a QR code that adds an event straight to a guest's calendar with the date, time and details already filled in.",
      },
      az: {
        title: "Təqvim QR Kod Generatoru – Tədbir Detallarını Paylaşın",
        description:
          "Skan edildikdə tarix, vaxt və detalları əvvəlcədən doldurulmuş tədbiri birbaşa qonağın təqviminə əlavə edən QR kod yaradın.",
      },
      tr: {
        title: "Takvim QR Kod – Etkinlik Bilgisi Paylaşın",
        description:
          "Taratıldığında tarih, saat ve ayrıntıları önceden doldurulmuş bir etkinliği doğrudan misafirin takvimine ekleyen QR kod oluşturun.",
      },
    },
  },

  "pdf-merge": {
    path: "/tools/pdf-merge",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "PDF Merge – Combine Multiple PDFs into One",
        description: "Merge multiple PDF files into a single document online, in the order you choose.",
      },
      az: {
        title: "PDF Birləşdirmə – Bir Neçə PDF-i Birləşdirin",
        description: "Bir neçə PDF faylını seçdiyiniz sırada onlayn olaraq tək sənəddə birləşdirin.",
      },
      tr: {
        title: "PDF Birleştirme – PDF'leri Tek Dosyada Birleştirin",
        description: "Birden fazla PDF dosyasını seçtiğiniz sırayla online olarak tek bir belgede birleştirin.",
      },
    },
  },

  "pdf-split": {
    path: "/tools/pdf-split",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "PDF Split – Separate PDF Pages into New Files",
        description: "Split a PDF document into separate files by page range, so you can extract exactly the pages you need.",
      },
      az: {
        title: "PDF Bölmə – PDF Səhifələrini Ayrı Fayllara Bölün",
        description: "PDF sənədini səhifə aralığına görə ayrı fayllara bölün və yalnız lazım olan səhifələri çıxarın.",
      },
      tr: {
        title: "PDF Bölme – PDF Sayfalarını Ayrı Dosyalara Ayırın",
        description: "Bir PDF belgesini sayfa aralığına göre ayrı dosyalara bölerek yalnızca ihtiyacınız olan sayfaları çıkarın.",
      },
    },
  },

  "pdf-compress": {
    path: "/tools/pdf-compress",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "PDF Compressor – Reduce PDF File Size Online",
        description: "Compress a PDF file to a smaller size for easier sharing and storage, while keeping it readable.",
      },
      az: {
        title: "PDF Sıxıcı – PDF Fayl Ölçüsünü Onlayn Azaldın",
        description: "PDF faylını daha asan paylaşım və saxlama üçün oxunaqlı qalmaqla daha kiçik ölçüyə sıxın.",
      },
      tr: {
        title: "PDF Sıkıştırıcı – PDF Dosya Boyutunu Online Küçültün",
        description: "Bir PDF dosyasını okunabilir kalitesini koruyarak daha kolay paylaşım ve depolama için küçük boyuta sıkıştırın.",
      },
    },
  },

  "pdf-to-jpg": {
    path: "/tools/pdf-to-jpg",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "PDF to JPG Converter – Convert PDF Pages to Images",
        description: "Convert each page of a PDF document into a separate JPG image, ready to download.",
      },
      az: {
        title: "PDF-dən JPG-yə Çevirici – Səhifələri Şəklə Çevirin",
        description: "PDF sənədinin hər səhifəsini yükləməyə hazır ayrı JPG şəklinə çevirin.",
      },
      tr: {
        title: "PDF'den JPG'ye Dönüştürücü – Sayfaları Görsele Çevirin",
        description: "Bir PDF belgesinin her sayfasını indirmeye hazır ayrı bir JPG görseline dönüştürün.",
      },
    },
  },

  "jpg-to-pdf": {
    path: "/tools/jpg-to-pdf",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "JPG to PDF Converter – Combine Images into a PDF",
        description: "Convert one or more JPG images into a single PDF document, in the order you choose.",
      },
      az: {
        title: "JPG-dən PDF-ə Çevirici – Şəkilləri PDF-ə Çevirin",
        description: "Bir və ya bir neçə JPG şəklini seçdiyiniz sırada tək PDF sənədinə çevirin.",
      },
      tr: {
        title: "JPG'den PDF'ye Dönüştürücü – Görselleri Birleştirin",
        description: "Bir veya birden fazla JPG görselini seçtiğiniz sırayla tek bir PDF belgesine dönüştürün.",
      },
    },
  },

  "pdf-to-word": {
    path: "/tools/pdf-to-word",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "PDF to Word Converter – Convert PDF into Editable Text",
        description: "Convert a PDF document into an editable Word file so you can update the text without retyping it.",
      },
      az: {
        title: "PDF-dən Word-ə Çevirici – Redaktə Olunan Mətnə Çevirin",
        description: "PDF sənədini redaktə edilə bilən Word faylına çevirin ki, mətni yenidən yazmadan dəyişə biləsiniz.",
      },
      tr: {
        title: "PDF'den Word'e Dönüştürücü – Metne Çevirin",
        description: "Bir PDF belgesini düzenlenebilir bir Word dosyasına dönüştürerek metni yeniden yazmadan güncelleyin.",
      },
    },
  },

  "pdf-to-excel": {
    path: "/tools/pdf-to-excel",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "PDF to Excel Converter – Extract Tables from PDF",
        description: "Convert suitable tables from a PDF document into an Excel file for easier editing and calculation.",
      },
      az: {
        title: "PDF-dən Excel-ə Çevirici – Cədvəlləri PDF-dən Çıxarın",
        description: "PDF sənədindəki uyğun cədvəlləri daha asan redaktə və hesablama üçün Excel faylına çevirin.",
      },
      tr: {
        title: "PDF'den Excel'e Dönüştürücü – Tabloları PDF'den Çıkarın",
        description: "Bir PDF belgesindeki uygun tabloları, daha kolay düzenleme ve hesaplama için Excel dosyasına dönüştürün.",
      },
    },
  },

  "pdf-rotate": {
    path: "/tools/pdf-rotate",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "PDF Rotate – Fix Page Orientation Online",
        description: "Rotate one or all pages of a PDF document and save a corrected copy with the right orientation.",
      },
      az: {
        title: "PDF Döndürmə – Səhifə İstiqamətini Onlayn Düzəldin",
        description: "PDF sənədinin bir və ya bütün səhifələrini döndürün və düzgün istiqamətlə düzəldilmiş nüsxəni saxlayın.",
      },
      tr: {
        title: "PDF Döndürme – Sayfa Yönünü Online Düzeltin",
        description: "Bir PDF belgesinin bir veya tüm sayfalarını döndürün ve doğru yönlendirmeyle düzeltilmiş bir kopyasını kaydedin.",
      },
    },
  },

  "image-resize": {
    path: "/tools/image-resize",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Image Resizer – Resize Photos to Exact Dimensions",
        description: "Resize any image to exact pixel dimensions online, without installing software.",
      },
      az: {
        title: "Şəkil Ölçüləndirici – Fotoları Dəqiq Ölçüyə Salın",
        description: "İstənilən şəkli proqram quraşdırmadan onlayn olaraq dəqiq piksel ölçüsünə salın.",
      },
      tr: {
        title: "Görsel Boyutlandırıcı – Fotoğrafları Tam Boyuta Getirin",
        description: "Herhangi bir görseli yazılım kurmadan online olarak tam piksel boyutuna getirin.",
      },
    },
  },

  "image-compress": {
    path: "/tools/image-compress",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Image Compressor – Reduce Photo File Size Online",
        description: "Compress images to a smaller file size online while keeping them clear enough for web and sharing.",
      },
      az: {
        title: "Şəkil Sıxıcı – Foto Fayl Ölçüsünü Onlayn Azaldın",
        description: "Şəkilləri veb və paylaşım üçün kifayət qədər aydın saxlamaqla onlayn olaraq kiçik fayl ölçüsünə sıxın.",
      },
      tr: {
        title: "Görsel Sıkıştırıcı – Dosya Boyutunu Küçültün",
        description: "Görselleri web ve paylaşım için yeterince net kalacak şekilde online olarak küçük dosya boyutuna sıkıştırın.",
      },
    },
  },

  "image-converter": {
    path: "/tools/image-converter",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Image Format Converter – Convert Between Image Types",
        description: "Convert images between popular formats like JPG, PNG and WebP quickly and directly in your browser.",
      },
      az: {
        title: "Şəkil Format Çeviricisi – Formatlar Arasında Çevirin",
        description: "JPG, PNG və WebP kimi məşhur formatlar arasında şəkilləri birbaşa brauzerinizdə sürətlə çevirin.",
      },
      tr: {
        title: "Görsel Format Dönüştürücü – Formatlar Arasında Çevirin",
        description: "JPG, PNG ve WebP gibi popüler formatlar arasında görselleri doğrudan tarayıcınızda hızlıca dönüştürün.",
      },
    },
  },

  "jpg-to-png": {
    path: "/tools/jpg-to-png",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "JPG to PNG Converter – Convert Images Online",
        description: "Convert JPG images into PNG format online, useful when you need transparency support.",
      },
      az: {
        title: "JPG-dən PNG-yə Çevirici – Şəkilləri Onlayn Çevirin",
        description: "Şəffaflıq dəstəyinə ehtiyac olduqda faydalı olan JPG şəkillərini onlayn olaraq PNG formatına çevirin.",
      },
      tr: {
        title: "JPG'den PNG'ye Dönüştürücü – Görselleri Online Çevirin",
        description: "Şeffaflık desteğine ihtiyaç duyduğunuzda işinize yarayacak şekilde JPG görselleri online olarak PNG formatına dönüştürün.",
      },
    },
  },

  "png-to-jpg": {
    path: "/tools/png-to-jpg",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "PNG to JPG Converter – Convert Images Online",
        description: "Convert PNG images into JPG format online for smaller file sizes and wider compatibility.",
      },
      az: {
        title: "PNG-dən JPG-yə Çevirici – Şəkilləri Onlayn Çevirin",
        description: "Daha kiçik fayl ölçüsü və daha geniş uyğunluq üçün PNG şəkillərini onlayn olaraq JPG formatına çevirin.",
      },
      tr: {
        title: "PNG'den JPG'ye Dönüştürücü – Görselleri Online Çevirin",
        description: "Daha küçük dosya boyutu ve daha geniş uyumluluk için PNG görselleri online olarak JPG formatına dönüştürün.",
      },
    },
  },

  "webp-converter": {
    path: "/tools/webp-converter",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "WebP Converter – Convert Images To or From WebP",
        description: "Convert images to WebP for smaller file sizes, or from WebP into a more widely supported format.",
      },
      az: {
        title: "WebP Çeviricisi – WebP-ə və ya WebP-dən Çevirin",
        description: "Daha kiçik fayl ölçüsü üçün şəkilləri WebP formatına, və ya daha geniş dəstəklənən formata WebP-dən çevirin.",
      },
      tr: {
        title: "WebP Dönüştürücü – WebP'ye veya WebP'den Çevirin",
        description: "Daha küçük dosya boyutu için görselleri WebP formatına veya daha yaygın desteklenen bir formata WebP'den dönüştürün.",
      },
    },
  },

  "image-crop": {
    path: "/tools/image-crop",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Image Cropper – Crop Photos to the Area You Need",
        description: "Crop any image online to keep exactly the area you need, removing the rest.",
      },
      az: {
        title: "Şəkil Kəsici – Fotoları Lazım Olan Sahəyə Kəsin",
        description: "İstənilən şəkli onlayn olaraq kəsin və yalnız lazım olan sahəni saxlayın, qalanını silin.",
      },
      tr: {
        title: "Görsel Kırpma – İhtiyacınız Olan Alana Kırpın",
        description: "Herhangi bir görseli online olarak kırpın ve yalnızca ihtiyacınız olan alanı koruyun, gerisini kaldırın.",
      },
    },
  },

  "image-rotate": {
    path: "/tools/image-rotate",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Image Rotator – Rotate Photos Online",
        description: "Rotate any image quickly to the correct orientation, directly in your browser.",
      },
      az: {
        title: "Şəkil Döndürücü – Fotoları Onlayn Döndürün",
        description: "İstənilən şəkli birbaşa brauzerinizdə sürətlə düzgün istiqamətə döndürün.",
      },
      tr: {
        title: "Görsel Döndürücü – Fotoğrafları Online Döndürün",
        description: "Herhangi bir görseli doğrudan tarayıcınızda hızlıca doğru yöne döndürün.",
      },
    },
  },

  "background-remover": {
    path: "/tools/background-remover",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Background Remover – Remove Image Backgrounds Online",
        description: "Remove the background from a photo automatically, leaving a clean cutout ready to use.",
      },
      az: {
        title: "Fon Silici – Şəkillərdən Fonu Onlayn Silin",
        description: "Fotoşəkildən fonu avtomatik silin və istifadəyə hazır təmiz kəsimi əldə edin.",
      },
      tr: {
        title: "Arka Plan Silici – Görsel Arka Planını Online Kaldırın",
        description: "Bir fotoğrafın arka planını otomatik olarak kaldırın ve kullanıma hazır temiz bir kesim elde edin.",
      },
    },
  },

  "image-to-pdf": {
    path: "/tools/image-to-pdf",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Image to PDF Converter – Combine Photos into a PDF",
        description: "Turn one or more images into a single PDF document, in the order you choose.",
      },
      az: {
        title: "Şəkildən PDF-ə Çevirici – Fotoları PDF-ə Birləşdirin",
        description: "Bir və ya bir neçə şəkli seçdiyiniz sırada tək PDF sənədinə çevirin.",
      },
      tr: {
        title: "Görselden PDF'ye Dönüştürücü – Fotoğrafları Birleştirin",
        description: "Bir veya birden fazla görseli seçtiğiniz sırayla tek bir PDF belgesine dönüştürün.",
      },
    },
  },

  "pdf-to-image": {
    path: "/tools/pdf-to-image",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "PDF to Image Converter – Convert PDF Pages to Photos",
        description: "Convert each page of a PDF document into a separate image file, ready to download.",
      },
      az: {
        title: "PDF-dən Şəkilə Çevirici – Səhifələri Fotoya Çevirin",
        description: "PDF sənədinin hər səhifəsini yükləməyə hazır ayrı şəkil faylına çevirin.",
      },
      tr: {
        title: "PDF'den Görsele Dönüştürücü – Sayfaları Fotoya Çevirin",
        description: "Bir PDF belgesinin her sayfasını indirmeye hazır ayrı bir görsel dosyasına dönüştürün.",
      },
    },
  },

  "gif-maker": {
    path: "/tools/gif-maker",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "GIF Maker – Create Animated GIFs Online",
        description: "Create an animated GIF from a sequence of images or frames, ready to share online.",
      },
      az: {
        title: "GIF Yaradıcısı – Onlayn Animasiyalı GIF Yaradın",
        description: "Şəkil və ya kadr ardıcıllığından paylaşıma hazır animasiyalı GIF yaradın.",
      },
      tr: {
        title: "GIF Oluşturucu – Online Animasyonlu GIF Yapın",
        description: "Bir dizi görsel veya kareden, paylaşıma hazır animasyonlu bir GIF oluşturun.",
      },
    },
  },

  "meme-generator": {
    path: "/tools/meme-generator",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Meme Generator – Create Memes with Text and Images",
        description: "Create a simple meme online by adding your own text captions to an image.",
      },
      az: {
        title: "Mem Generatoru – Mətn və Şəkillə Mem Yaradın",
        description: "Şəklə öz mətn yazınızı əlavə edərək onlayn sadə mem yaradın.",
      },
      tr: {
        title: "Meme Oluşturucu – Metin ve Görselle Meme Yapın",
        description: "Bir görsele kendi metin yazınızı ekleyerek online basit bir meme oluşturun.",
      },
    },
  },

  "color-palette-generator": {
    path: "/tools/color-palette-generator",
    robots: ROBOTS_NOINDEX_FOLLOW,
    localized: {
      en: {
        title: "Color Palette Generator – Create Color Schemes Online",
        description: "Generate a useful color palette from an image or a starting idea, ready to use in your own designs.",
      },
      az: {
        title: "Rəng Palitrası Generatoru – Onlayn Rəng Sxemi Yaradın",
        description: "Şəkildən və ya bir ideyadan öz dizaynlarınızda istifadəyə hazır faydalı rəng palitrası yaradın.",
      },
      tr: {
        title: "Renk Paleti Oluşturucu – Online Renk Şeması Yapın",
        description: "Bir görselden veya bir fikirden, kendi tasarımlarınızda kullanıma hazır faydalı bir renk paleti oluşturun.",
      },
    },
  },
};
