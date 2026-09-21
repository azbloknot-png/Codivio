import { ROBOTS_INDEX_FOLLOW, type SeoEntity } from "./types";

/**
 * Codivio SEO — static public page metadata (Phase 3.1).
 *
 * One entry per real, currently-routed static page in src/App.tsx. Every
 * title/description below is hand-written per language (not a mechanical
 * translation of the English copy) — see DECISIONS.md's "SEO Metadata
 * Architecture" entry. All are real, functioning pages, so all use the
 * standard index,follow default.
 *
 * Keys match the route's purpose, not its literal path, so callers read
 * naturally (`PAGE_SEO.home`, not `PAGE_SEO["/"]`).
 */
export const PAGE_SEO: Record<
  | "home"
  | "tools"
  | "blog"
  | "faq"
  | "about"
  | "contact"
  | "privacy"
  | "terms"
  | "cookies"
  | "pricing"
  | "sitemap",
  SeoEntity
> = {
  home: {
    path: "/",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "Codivio – Free Online Tools for QR Codes, PDFs & Images",
        description:
          "Codivio offers free, easy-to-use online tools for QR codes, PDF files, images and everyday digital tasks — no installation required.",
      },
      az: {
        title: "Codivio – QR Kod, PDF və Şəkil üçün Pulsuz Alətlər",
        description:
          "Codivio QR kodlar, PDF fayllar, şəkillər və gündəlik rəqəmsal tapşırıqlar üçün pulsuz, sadə onlayn alətlər təqdim edir.",
      },
      tr: {
        title: "Codivio – QR Kod, PDF ve Görsel için Ücretsiz Araçlar",
        description:
          "Codivio; QR kodlar, PDF dosyaları, görseller ve günlük dijital işler için ücretsiz, kullanımı kolay online araçlar sunar.",
      },
    },
  },

  tools: {
    path: "/tools",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "All Tools – QR, PDF, Image & Productivity Tools",
        description:
          "Browse Codivio's full collection of QR code, PDF, image and productivity tools, organized by category.",
      },
      az: {
        title: "Bütün Alətlər – QR, PDF, Şəkil və Məhsuldarlıq Alətləri",
        description:
          "Codivio-nun kateqoriyalara bölünmüş QR kod, PDF, şəkil və məhsuldarlıq alətlərinin tam siyahısına baxın.",
      },
      tr: {
        title: "Tüm Araçlar – QR, PDF, Görsel ve Verimlilik Araçları",
        description:
          "Codivio'nun kategorilere ayrılmış QR kod, PDF, görsel ve verimlilik araçlarının tamamına göz atın.",
      },
    },
  },

  blog: {
    path: "/blog",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "Codivio Blog – Guides for QR Codes, PDFs & Images",
        description:
          "Practical guides and tips about QR codes, PDF files, image formats and everyday digital tasks from the Codivio blog.",
      },
      az: {
        title: "Codivio Bloqu – QR Kod, PDF və Şəkil üzrə Bələdçilər",
        description:
          "Codivio bloqunda QR kodlar, PDF fayllar, şəkil formatları və gündəlik rəqəmsal tapşırıqlar haqqında praktik bələdçilər və məsləhətlər.",
      },
      tr: {
        title: "Codivio Blog – QR Kod, PDF ve Görsel Rehberleri",
        description:
          "Codivio blogunda QR kodlar, PDF dosyaları, görsel formatları ve günlük dijital işler hakkında pratik rehberler ve ipuçları.",
      },
    },
  },

  faq: {
    path: "/faq",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "Frequently Asked Questions",
        description:
          "Answers to common questions about Codivio, our tools, privacy practices and how the platform works.",
      },
      az: {
        title: "Tez-tez Verilən Suallar",
        description:
          "Codivio, alətlərimiz, məxfilik təcrübəmiz və platformanın necə işlədiyi haqqında ən çox verilən suallara cavablar.",
      },
      tr: {
        title: "Sıkça Sorulan Sorular",
        description:
          "Codivio, araçlarımız, gizlilik uygulamalarımız ve platformun nasıl çalıştığı hakkında sıkça sorulan soruların cevapları.",
      },
    },
  },

  about: {
    path: "/about",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "About Codivio – Our Mission and Approach",
        description:
          "Learn about Codivio's mission to make everyday digital tasks simpler with fast, privacy-focused online tools.",
      },
      az: {
        title: "Codivio Haqqında – Missiyamız və Yanaşmamız",
        description:
          "Codivio-nun gündəlik rəqəmsal tapşırıqları sürətli və məxfiliyə önəm verən onlayn alətlərlə sadələşdirmək missiyası haqqında məlumat əldə edin.",
      },
      tr: {
        title: "Codivio Hakkında – Misyonumuz ve Yaklaşımımız",
        description:
          "Codivio'nun günlük dijital işleri hızlı ve gizliliğe önem veren online araçlarla kolaylaştırma misyonu hakkında bilgi edinin.",
      },
    },
  },

  contact: {
    path: "/contact",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "Contact Codivio – Questions, Feedback & Support",
        description:
          "Get in touch with Codivio to ask a question, send feedback, suggest a tool or report a problem.",
      },
      az: {
        title: "Codivio ilə Əlaqə – Sual, Rəy və Dəstək",
        description:
          "Sualınızı vermək, rəy bildirmək, alət təklif etmək və ya problem barədə məlumat vermək üçün Codivio ilə əlaqə saxlayın.",
      },
      tr: {
        title: "Codivio ile İletişim – Soru, Geri Bildirim ve Destek",
        description:
          "Sorunuzu iletmek, geri bildirim göndermek, araç önermek veya bir sorunu bildirmek için Codivio ile iletişime geçin.",
      },
    },
  },

  privacy: {
    path: "/privacy",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "Privacy Policy",
        description:
          "How Codivio handles data, minimizes unnecessary collection and uses browser-based processing where possible.",
      },
      az: {
        title: "Məxfilik Siyasəti",
        description:
          "Codivio-nun məlumatlarla necə davrandığı, artıq məlumat toplanmasını necə minimuma endirdiyi və mümkün olduqda brauzer əsaslı emaldan necə istifadə etdiyi.",
      },
      tr: {
        title: "Gizlilik Politikası",
        description:
          "Codivio'nun verileri nasıl işlediği, gereksiz veri toplamayı nasıl en aza indirdiği ve mümkün olduğunda tarayıcı tabanlı işlemeyi nasıl kullandığı.",
      },
    },
  },

  terms: {
    path: "/terms",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "Terms of Service",
        description:
          "The terms governing lawful use of Codivio's tools and website, including tool availability and user responsibilities.",
      },
      az: {
        title: "İstifadə Şərtləri",
        description:
          "Codivio-nun alətlərindən və saytından qanuni istifadəni tənzimləyən şərtlər, o cümlədən alətlərin mövcudluğu və istifadəçi məsuliyyəti.",
      },
      tr: {
        title: "Kullanım Koşulları",
        description:
          "Codivio'nun araçlarının ve web sitesinin yasal kullanımını düzenleyen koşullar; araç kullanılabilirliği ve kullanıcı sorumlulukları dahil.",
      },
    },
  },

  cookies: {
    path: "/cookies",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "Cookie Policy",
        description:
          "How Codivio uses cookies for essential functionality, analytics and advertising, and how to manage your preferences.",
      },
      az: {
        title: "Kuki Siyasəti",
        description:
          "Codivio-nun əsas funksionallıq, analitika və reklam üçün kukilərdən necə istifadə etdiyi və seçimlərinizi necə idarə edə biləcəyiniz.",
      },
      tr: {
        title: "Çerez Politikası",
        description:
          "Codivio'nun temel işlevsellik, analitik ve reklam için çerezleri nasıl kullandığı ve tercihlerinizi nasıl yönetebileceğiniz.",
      },
    },
  },

  pricing: {
    path: "/pricing",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "Pricing – Free, Pro, Business & API Plans",
        description:
          "See Codivio's planned Free, Pro, Business and API plans and what each is intended to include as tools become available.",
      },
      az: {
        title: "Qiymətlər – Free, Pro, Business və API Planları",
        description:
          "Codivio-nun planlaşdırılan Free, Pro, Business və API planlarına və alətlər aktivləşdikcə hər birinin nə təklif edəcəyinə baxın.",
      },
      tr: {
        title: "Fiyatlandırma – Free, Pro, Business ve API Planları",
        description:
          "Codivio'nun planlanan Free, Pro, Business ve API planlarını ve araçlar kullanıma sunuldukça her birinin neler sunacağını görün.",
      },
    },
  },

  sitemap: {
    path: "/sitemap",
    robots: ROBOTS_INDEX_FOLLOW,
    localized: {
      en: {
        title: "Site Map – All Codivio Pages and Tools",
        description:
          "Browse an organized directory of every Codivio page and tool, including which tools are already live and which are still in development.",
      },
      az: {
        title: "Sayt Xəritəsi – Bütün Codivio Səhifələri və Alətləri",
        description:
          "Codivio-nun bütün səhifə və alətlərinin təşkil olunmuş siyahısına baxın — hansı alətlərin artıq hazır, hansılarının hələ inkişafda olduğunu görün.",
      },
      tr: {
        title: "Site Haritası – Tüm Codivio Sayfaları ve Araçları",
        description:
          "Codivio'nun tüm sayfa ve araçlarının düzenli listesine göz atın — hangi araçların zaten hazır, hangilerinin hâlâ geliştirme aşamasında olduğunu görün.",
      },
    },
  },
};

export type PageSeoKey = keyof typeof PAGE_SEO;
