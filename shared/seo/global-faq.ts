/**
 * Global (site-wide) FAQ content — Phase 3 Finalization.
 *
 * Distinct from a per-tool FAQ (shared/seo/content.ts#TOOL_CONTENT / #getToolFaqs),
 * which answers questions about one specific tool. This file's content answers
 * questions about Codivio as a platform (what it is, how it works, privacy,
 * cost, roadmap honesty).
 *
 * FAQ MANAGEMENT SOURCE-OF-TRUTH REMEDIATION: the live source of truth for the
 * public `/faq` page and Homepage FAQ preview is now the `site_faqs` D1 table
 * (scope="global", status="active"), served by GET /api/faqs and consumed via
 * src/App.tsx's `useGlobalFaqs` hook — an Admin-created/edited/deactivated/
 * reordered global FAQ entry is reflected there. This file is now consulted
 * ONLY as that hook's synchronous initial render value and its fallback if the
 * API call fails (e.g. a transient D1 outage) — never edit this file expecting
 * it to change what visitors see; edit the FAQ in Admin (`/admin/faq`)
 * instead. It intentionally still matches the D1 seed 1:1 (both originated
 * from the same content — see migrations/0009_faq_management.sql) so the
 * fallback never silently diverges from the last-known-good managed content;
 * it is not a second independently maintained FAQ source.
 */

import type { Language } from "../i18n/languages";

export interface GlobalFaqItem {
  question: string;
  answer: string;
}

const en: GlobalFaqItem[] = [
  {
    question: "What is Codivio?",
    answer:
      "Codivio is a collection of free online tools for QR codes, PDFs, images and other everyday digital tasks.",
  },
  {
    question: "Are Codivio tools free?",
    answer:
      "The Codivio platform is designed around free online tools. Individual tools may have their own limits when they become available.",
  },
  {
    question: "Do I need to install software?",
    answer:
      "No. Codivio is designed to provide useful tools directly in your web browser whenever technically possible.",
  },
  {
    question: "Are my files uploaded to a server?",
    answer:
      "Codivio aims to process suitable tools directly in the browser whenever possible. Tool-specific processing details will be clearly explained when each tool launches.",
  },
  {
    question: "Can I use Codivio on my phone?",
    answer:
      "Yes. The website is designed to work across desktop, tablet and mobile screen sizes.",
  },
  {
    question: "Will more tools be added?",
    answer:
      "Yes. Codivio is being developed as a growing collection of QR, PDF, image and productivity tools.",
  },
  {
    question: "Do I need to create an account to use a tool?",
    answer:
      "No account is required for the tools themselves. An account is only relevant to features like saved preferences or a paid plan, which are not available yet.",
  },
  {
    question: "What languages does Codivio support?",
    answer:
      "The site is currently available in English, Azerbaijani and Turkish, with a language switch in the header.",
  },
  {
    question: "What kinds of tools does Codivio organize its catalog into?",
    answer:
      "The catalog is organized into QR code tools, PDF tools, image tools, and a smaller category of other productivity tools like a GIF maker or color palette generator.",
  },
  {
    question: "Why do some tool pages say a tool is not available yet?",
    answer:
      "Codivio is built and released incrementally. A tool's page goes live with a clear description and FAQ before its functionality is finished, and the page says so honestly rather than pretending the feature already works.",
  },
  {
    question: "Does Codivio show advertisements?",
    answer:
      "Codivio has a designated advertisement area used for controlled, clearly labeled ad placements. It does not use pop-ups or intrusive ad formats.",
  },
  {
    question: "How can I get help if my question isn't answered here?",
    answer:
      "Use the Contact page to reach out directly, and check back here as this FAQ grows alongside the tool catalog.",
  },
];

const az: GlobalFaqItem[] = [
  {
    question: "Codivio nədir?",
    answer:
      "Codivio — QR kodlar, PDF-lər, şəkillər və digər gündəlik rəqəmsal tapşırıqlar üçün pulsuz onlayn alətlər toplusudur.",
  },
  {
    question: "Codivio alətləri pulsuzdurmu?",
    answer:
      "Codivio platforması pulsuz onlayn alətlər əsasında qurulub. Ayrı-ayrı alətlər aktiv olduqdan sonra öz məhdudiyyətlərinə malik ola bilər.",
  },
  {
    question: "Proqram təminatı quraşdırmalıyammı?",
    answer:
      "Xeyr. Codivio texniki cəhətdən mümkün olduğu yerlərdə faydalı alətləri birbaşa brauzerinizdə təqdim etmək üçün nəzərdə tutulub.",
  },
  {
    question: "Fayllarım serverə yüklənirmi?",
    answer:
      "Codivio uyğun alətləri mümkün olduğu qədər birbaşa brauzerdə emal etməyi hədəfləyir. Alətə xas emal detalları hər alət işə düşəndə aydın izah olunacaq.",
  },
  {
    question: "Codivio-dan telefonumda istifadə edə bilərəmmi?",
    answer:
      "Bəli. Sayt masaüstü, planşet və mobil ekran ölçüləri üçün uyğunlaşdırılıb.",
  },
  {
    question: "Yeni alətlər əlavə olunacaqmı?",
    answer:
      "Bəli. Codivio QR, PDF, şəkil və məhsuldarlıq alətlərinin daim böyüyən toplusu kimi hazırlanır.",
  },
  {
    question: "Bir aləti istifadə etmək üçün hesab yaratmalıyammı?",
    answer:
      "Alətlərin özü üçün hesab tələb olunmur. Hesab yalnız hələ mövcud olmayan yadda saxlanılan tənzimləmələr və ya ödənişli plan kimi funksiyalarla əlaqədardır.",
  },
  {
    question: "Codivio hansı dilləri dəstəkləyir?",
    answer:
      "Sayt hazırda header-dəki dil seçimi ilə Ingilis, Azərbaycan və Türk dillərində mövcuddur.",
  },
  {
    question: "Codivio kataloqu alətləri hansı kateqoriyalara bölür?",
    answer:
      "Kataloq QR kod alətləri, PDF alətləri, şəkil alətləri və GIF yaradıcısı və ya rəng palitrası generatoru kimi daha kiçik digər məhsuldarlıq alətləri kateqoriyasına bölünür.",
  },
  {
    question: "Nəyə görə bəzi alət səhifələrində aləti hələ mövcud deyil deyilir?",
    answer:
      "Codivio tədricən qurulur və buraxılır. Aləti işlək olmadan öncə aydın təsvir və FAQ ilə səhifəsi aktiv olur, funksionallığın artıq işlədiyini iddia etmək əvəzinə bu vəziyyət açıq şəkildə bildirilir.",
  },
  {
    question: "Codivio reklam göstərirmi?",
    answer:
      "Codivio-da nəzarətli, aydın işarələnmiş reklam yerləşdirmələri üçün ayrılmış reklam sahəsi var. Pop-up və ya təhqiredici reklam formatlarından istifadə olunmur.",
  },
  {
    question: "Sualım burada cavablanmayıbsa necə kömək ala bilərəm?",
    answer:
      "Birbaşa əlaqə üçün Əlaqə səhifəsindən istifadə edin və alət kataloqu böyüdükcə bu FAQ-a yenidən baxın.",
  },
];

const tr: GlobalFaqItem[] = [
  {
    question: "Codivio nedir?",
    answer:
      "Codivio; QR kodlar, PDF'ler, görseller ve diğer günlük dijital işler için ücretsiz çevrimiçi araçlar koleksiyonudur.",
  },
  {
    question: "Codivio araçları ücretsiz mi?",
    answer:
      "Codivio platformu ücretsiz çevrimiçi araçlar etrafında tasarlanmıştır. Kullanıma açıldıklarında bazı araçların kendine özgü sınırları olabilir.",
  },
  {
    question: "Bir yazılım kurmam gerekiyor mu?",
    answer:
      "Hayır. Codivio, teknik olarak mümkün olduğunda kullanışlı araçları doğrudan tarayıcınızda sunmak üzere tasarlanmıştır.",
  },
  {
    question: "Dosyalarım bir sunucuya yükleniyor mu?",
    answer:
      "Codivio, uygun araçları mümkün olduğunca doğrudan tarayıcıda işlemeyi hedefler. Araca özgü işleme detayları her araç yayına girdiğinde açıkça belirtilecektir.",
  },
  {
    question: "Codivio'yu telefonumda kullanabilir miyim?",
    answer:
      "Evet. Site masaüstü, tablet ve mobil ekran boyutlarında çalışacak şekilde tasarlanmıştır.",
  },
  {
    question: "Daha fazla araç eklenecek mi?",
    answer:
      "Evet. Codivio, QR, PDF, görsel ve üretkenlik araçlarından oluşan büyüyen bir koleksiyon olarak geliştiriliyor.",
  },
  {
    question: "Bir aracı kullanmak için hesap oluşturmam gerekir mi?",
    answer:
      "Araçların kendisi için hesap gerekmez. Hesap yalnızca henüz mevcut olmayan kaydedilmiş tercihler veya ücretli plan gibi özelliklerle ilgilidir.",
  },
  {
    question: "Codivio hangi dilleri destekliyor?",
    answer:
      "Site şu anda üst menüdeki dil değiştirici ile İngilizce, Azerbaycan Türkçesi ve Türkçe olarak sunulmaktadır.",
  },
  {
    question: "Codivio kataloğu araçları hangi kategorilere ayırıyor?",
    answer:
      "Katalog; QR kod araçları, PDF araçları, görsel araçları ve GIF oluşturucu veya renk paleti oluşturucu gibi daha küçük bir diğer üretkenlik araçları kategorisine ayrılmıştır.",
  },
  {
    question: "Bazı araç sayfalarında aracın henüz kullanılamadığı neden yazıyor?",
    answer:
      "Codivio aşamalı olarak geliştirilip yayınlanıyor. Bir aracın sayfası, işlevi tamamlanmadan önce net bir açıklama ve SSS ile yayına girer ve özelliğin zaten çalıştığını iddia etmek yerine bunu dürüstçe belirtir.",
  },
  {
    question: "Codivio reklam gösteriyor mu?",
    answer:
      "Codivio'da kontrollü, açıkça etiketlenmiş reklam yerleşimleri için ayrılmış bir reklam alanı bulunur. Pop-up veya rahatsız edici reklam formatları kullanılmaz.",
  },
  {
    question: "Sorum burada yanıtlanmadıysa nasıl yardım alabilirim?",
    answer:
      "Doğrudan ulaşmak için İletişim sayfasını kullanın ve araç kataloğu büyüdükçe bu SSS bölümünü tekrar kontrol edin.",
  },
];

const GLOBAL_FAQ: Record<Language, GlobalFaqItem[]> = { en, az, tr };

/** Deterministic, static accessor — mirrors shared/seo/content.ts#getToolFaqs. */
export function getGlobalFaqs(lang: Language): GlobalFaqItem[] {
  return GLOBAL_FAQ[lang];
}
