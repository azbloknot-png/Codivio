import { LANGUAGES, type Language } from "../i18n/languages";
import { TOOL_KEYWORDS, getToolKeywordProfile } from "./keywords";
import { TOOL_SEO } from "./tools";
import { getToolDisplayName, type ToolCategory } from "./ai";
import { TOOL_INTRODUCTIONS } from "./tool-intro";

/**
 * Codivio SEO — structured tool content architecture (Phase 3.4).
 *
 * Pure data, not wired into any rendered UI yet (see DECISIONS.md's Phase
 * 3.4 entry) — this establishes the content structure Phase 3.5/3.6 will
 * consume, without redesigning ToolPage.tsx in this same change. Reuses
 * shared/seo/keywords.ts's relatedToolOpportunity/futureContentOpportunity
 * rather than duplicating them (see getContentBlueprint in this file).
 *
 * CRITICAL constraint honored throughout: as of Phase 3.4, every one of the
 * 34 tools in src/pages/ToolPage.tsx rendered only a "Tool coming soon"
 * placeholder. As of Phase 4.1/4.6, 2 of the 34 — "qr-code-generator" and
 * "qr-code-scanner" — have shipped real, working functionality; their
 * content below is worded accordingly (present tense, no "once available"
 * framing) and TOOL_SEO[slug].robots.index (already the site's one real
 * signal for "is this tool live") is what getContentBlueprint/
 * getAiToolProfile below key off of, rather than hand-maintaining a second
 * live/coming-soon list. Every other tool's howToSteps below describe the
 * general real-world workflow (how PDF merging, QR generation, etc. work
 * conceptually), not a claim that Codivio's own implementation performs
 * them today. TOOL_STATUS_NOTE/TOOL_LIVE_NOTE and
 * SHARED_TRUST_MESSAGE/SHARED_TRUST_MESSAGE_LIVE make that distinction
 * explicit and reusable rather than repeating a disclaimer 34 times. No
 * banned phrase from this checkpoint's brief ("upload your file and
 * download instantly", "we process your file", "automatically deleted
 * after X minutes", "unlimited", "100% private", "no files are stored",
 * "fastest/best tool") appears anywhere below — test-enforced in
 * tests/seo-content.test.ts.
 */

export interface FaqTopic {
  question: string;
  answer: string;
}

export interface ToolContentBlueprint {
  introduction: string;
  valueProposition: string;
  benefits: string[];
  howToSteps: string[];
  useCases: string[];
  faq: FaqTopic[];
}

export type LocalizedToolContent = Record<Language, ToolContentBlueprint>;

/** Shown once, sitewide, wherever tool content needs an honest status
 * disclaimer — not fabricated per-tool ("your file is deleted after X
 * minutes" etc.), since no per-tool processing/privacy behavior exists
 * yet to describe accurately. Reused rather than repeated 34 times. */
export const TOOL_STATUS_NOTE: Record<Language, string> = {
  en: "This tool is currently in development and does not yet process files. The steps above describe how it will work once available.",
  az: "Bu alət hazırda hazırlanma mərhələsindədir və hələ faylları emal etmir. Yuxarıdakı addımlar alət aktiv olduqda necə işləyəcəyini təsvir edir.",
  tr: "Bu araç şu anda geliştirilme aşamasındadır ve henüz dosya işlemiyor. Yukarıdaki adımlar, araç kullanıma sunulduğunda nasıl çalışacağını açıklar.",
};

/** The live counterpart to TOOL_STATUS_NOTE — shown instead of it, via
 * getContentBlueprint's TOOL_SEO[slug].robots.index check, for a tool that
 * has actually shipped (today: "qr-code-generator"/"qr-code-scanner").
 * States only what's independently verifiable elsewhere in this codebase
 * (client-side-only processing — see src/lib/qr-engine.ts/
 * qr-scanner-engine.ts and the confirmed absence of any /api/qr* route),
 * never a fabricated capability. */
export const TOOL_LIVE_NOTE: Record<Language, string> = {
  en: "This tool is live and fully functional — everything above happens directly in your browser, with nothing uploaded to a server.",
  az: "Bu alət canlıdır və tam funksionaldır — yuxarıdakı hər şey birbaşa brauzerinizdə baş verir, heç nə serverə yüklənmir.",
  tr: "Bu araç canlıdır ve tamamen işlevseldir — yukarıdaki her şey doğrudan tarayıcınızda gerçekleşir, hiçbir şey sunucuya yüklenmez.",
};

/** A single, sitewide, honest trust/privacy statement — reused rather than
 * inventing 34 unique privacy claims for tools with no live processing
 * architecture to describe yet. Points to the real Privacy Policy instead
 * of asserting specific unverified behavior (see shared/i18n's site.privacy
 * link / src/App.tsx's PrivacyPage). */
export const SHARED_TRUST_MESSAGE: Record<Language, string> = {
  en: "Codivio's tools are free to use. See the Privacy Policy for how Codivio approaches data and privacy as tools become available.",
  az: "Codivio-nun alətləri pulsuzdur. Alətlər aktivləşdikcə Codivio-nun məlumat və məxfiliyə necə yanaşdığını Məxfilik Siyasətindən öyrənə bilərsiniz.",
  tr: "Codivio'nun araçları ücretsizdir. Araçlar kullanıma sunuldukça Codivio'nun veri ve gizliliğe nasıl yaklaştığını Gizlilik Politikası'ndan öğrenebilirsiniz.",
};

/** The live counterpart to SHARED_TRUST_MESSAGE — same statement minus the
 * "as tools become available" forward-looking clause, which no longer
 * describes a live tool accurately. */
export const SHARED_TRUST_MESSAGE_LIVE: Record<Language, string> = {
  en: "Codivio's tools are free to use. See the Privacy Policy for how Codivio approaches data and privacy.",
  az: "Codivio-nun alətləri pulsuzdur. Codivio-nun məlumat və məxfiliyə necə yanaşdığını Məxfilik Siyasətindən öyrənə bilərsiniz.",
  tr: "Codivio'nun araçları ücretsizdir. Codivio'nun veri ve gizliliğe nasıl yaklaştığını Gizlilik Politikası'ndan öğrenebilirsiniz.",
};

export const TOOL_CONTENT: Record<string, LocalizedToolContent> = {
  "qr-code-generator": {
    en: {
      introduction: TOOL_INTRODUCTIONS["qr-code-generator"].en,
      valueProposition: "Create a QR code for any purpose in seconds, directly in your browser.",
      benefits: ["Works for links, text and more", "No design skills needed", "Free to use"],
      howToSteps: ["Choose what the QR code should contain", "Customize the code if needed", "Download the finished QR code"],
      useCases: ["Sharing a website on printed materials", "Adding a QR code to a business card", "Linking a menu or flyer to a webpage"],
      faq: [
        { question: "What can a QR code generator create a code for?", answer: "A QR code can encode a link, plain text, contact details, WiFi credentials and more." },
        { question: "Is Codivio's QR code generator free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "What does the downloaded QR code look like?", answer: "The result is a square, scannable image file that can be saved and reused wherever needed." },
        { question: "Can a QR code be used on printed materials like flyers or business cards?", answer: "Yes, that's one of the most common uses — a QR code printed on paper works the same way as one shown on a screen." },
        { question: "Is there a different Codivio tool for turning a link specifically into a QR code?", answer: "Yes, the URL to QR Code tool focuses specifically on website links, while this generator also covers text and more." },
        { question: "Is this tool available to use right now?", answer: "Yes — this tool is live and fully functional, with everything happening directly in your browser and no file ever uploaded to a server." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["qr-code-generator"].az,
      valueProposition: "İstənilən məqsəd üçün saniyələr ərzində, birbaşa brauzerinizdə QR kod yaradın.",
      benefits: ["Link, mətn və s. üçün işləyir", "Dizayn bacarığı tələb etmir", "Pulsuz istifadə"],
      howToSteps: ["QR kodun nə saxlayacağını seçin", "Lazım olsa kodu fərdiləşdirin", "Hazır QR kodu yükləyin"],
      useCases: ["Çap materiallarında veb sayt paylaşmaq", "Vizit kartına QR kod əlavə etmək", "Menyu və ya vərəqəni veb səhifəyə bağlamaq"],
      faq: [
        { question: "QR kod generatoru nə üçün kod yarada bilər?", answer: "QR kod link, sadə mətn, əlaqə məlumatları, WiFi girişi və digərlərini kodlaya bilər." },
        { question: "Codivio-nun QR kod generatoru pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Yüklənmiş QR kod necə görünür?", answer: "Nəticə kvadrat, skan edilə bilən şəkil faylıdır və lazım olan yerdə saxlanıla və yenidən istifadə edilə bilər." },
        { question: "QR kod vərəqə və ya vizit kartı kimi çap materiallarında istifadə edilə bilər?", answer: "Bəli, bu ən geniş yayılmış istifadələrdən biridir — kağıza çap edilmiş QR kod ekranda göstərilən kimi işləyir." },
        { question: "Konkret olaraq linki QR koda çevirmək üçün ayrıca Codivio aləti varmı?", answer: "Bəli, URL-dən QR koda aləti xüsusilə veb sayt linkləri üçündür, bu generator isə həm də mətn və digərlərini əhatə edir." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Bəli — bu alət canlıdır və tam funksionaldır, hər şey birbaşa brauzerinizdə baş verir və heç bir fayl serverə yüklənmir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["qr-code-generator"].tr,
      valueProposition: "Herhangi bir amaç için saniyeler içinde, doğrudan tarayıcınızda QR kod oluşturun.",
      benefits: ["Bağlantı, metin ve daha fazlası için çalışır", "Tasarım bilgisi gerektirmez", "Ücretsiz kullanım"],
      howToSteps: ["QR kodun neyi içereceğini seçin", "Gerekirse kodu özelleştirin", "Hazır QR kodu indirin"],
      useCases: ["Basılı materyallerde web sitesi paylaşma", "Kartvizite QR kod ekleme", "Menü veya broşürü web sayfasına bağlama"],
      faq: [
        { question: "QR kod oluşturucu ne için kod oluşturabilir?", answer: "QR kod; bağlantı, düz metin, iletişim bilgileri, WiFi erişimi ve daha fazlasını kodlayabilir." },
        { question: "Codivio'nun QR kod oluşturucusu ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "İndirilen QR kod nasıl görünür?", answer: "Sonuç, kare şeklinde, taranabilir bir görsel dosyasıdır ve gerektiğinde kaydedilip yeniden kullanılabilir." },
        { question: "QR kod, broşür veya kartvizit gibi basılı materyallerde kullanılabilir mi?", answer: "Evet, bu en yaygın kullanımlardan biridir — kağıda basılan bir QR kod, ekranda gösterilenle aynı şekilde çalışır." },
        { question: "Bir bağlantıyı özellikle QR koda çevirmek için ayrı bir Codivio aracı var mı?", answer: "Evet, URL'den QR Koda aracı özellikle web sitesi bağlantıları içindir; bu oluşturucu ise ayrıca metin ve daha fazlasını da kapsar." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Evet — bu araç canlıdır ve tamamen işlevseldir; her şey doğrudan tarayıcınızda gerçekleşir ve hiçbir dosya sunucuya yüklenmez." },
      ],
    },
  },

  "qr-code-scanner": {
    en: {
      introduction: TOOL_INTRODUCTIONS["qr-code-scanner"].en,
      valueProposition: "Scan any QR code instantly, directly in your browser, no extra app needed.",
      benefits: ["Works with camera or an image file", "No app installation needed", "Free to use"],
      howToSteps: ["Point the camera at a QR code or upload an image", "Let the scanner read the code", "View the decoded content"],
      useCases: ["Checking a QR code before opening a link", "Scanning a code from a printed poster", "Reading a QR code sent as an image"],
      faq: [
        { question: "Can a QR code scanner read a code from a saved photo?", answer: "Yes, a QR scanner can read a code either live through a camera or from an uploaded image." },
        { question: "Is Codivio's QR code scanner free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "What happens after a QR code is scanned?", answer: "The decoded content, such as a link or text, is shown so it can be viewed or opened." },
        { question: "Can a blurry or damaged QR code still be scanned?", answer: "QR codes include some built-in error correction, but a badly damaged or very blurry code may not scan reliably." },
        { question: "What if I need to create a QR code instead of scanning one?", answer: "The QR Code Generator tool is designed for creating new QR codes." },
        { question: "Is this tool available to use right now?", answer: "Yes — this tool is live and fully functional, whether you use the camera or upload an image, with nothing uploaded to a server." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["qr-code-scanner"].az,
      valueProposition: "Əlavə tətbiqə ehtiyac olmadan, birbaşa brauzerinizdə istənilən QR kodu anında skan edin.",
      benefits: ["Kamera və ya şəkil faylı ilə işləyir", "Tətbiq quraşdırmaq lazım deyil", "Pulsuz istifadə"],
      howToSteps: ["Kameranı QR koda yönəldin və ya şəkil yükləyin", "Skanerin kodu oxumasına icazə verin", "Deşifr edilmiş məzmuna baxın"],
      useCases: ["Link açmadan əvvəl QR kodu yoxlamaq", "Çap edilmiş plakatdan kod skan etmək", "Şəkil kimi göndərilmiş QR kodu oxumaq"],
      faq: [
        { question: "QR kod skaneri yaddaşdakı fotodan kodu oxuya bilər?", answer: "Bəli, skaner kodu ya kamera ilə canlı, ya da yüklənmiş şəkildən oxuya bilər." },
        { question: "Codivio-nun QR kod skaneri pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "QR kod skan edildikdən sonra nə baş verir?", answer: "Deşifr edilmiş məzmun, məsələn link və ya mətn, baxmaq və ya açmaq üçün göstərilir." },
        { question: "Bulanıq və ya zədəli QR kod yenə skan edilə bilər?", answer: "QR kodlarda daxili xəta düzəltmə var, lakin ciddi zədəli və ya çox bulanıq kod etibarlı skan olunmaya bilər." },
        { question: "QR kod skan etmək əvəzinə yaratmaq lazımdırsa nə etməliyəm?", answer: "QR Kod Generatoru aləti yeni QR kod yaratmaq üçün nəzərdə tutulub." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Bəli — bu alət canlıdır və tam funksionaldır, istər kamera ilə, istərsə də şəkil yükləməklə; heç nə serverə göndərilmir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["qr-code-scanner"].tr,
      valueProposition: "Ek bir uygulamaya gerek kalmadan, doğrudan tarayıcınızda herhangi bir QR kodu anında okutun.",
      benefits: ["Kamera veya görsel dosyasıyla çalışır", "Uygulama kurmaya gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["Kamerayı QR koda yöneltin veya bir görsel yükleyin", "Okuyucunun kodu okumasına izin verin", "Çözülen içeriği görüntüleyin"],
      useCases: ["Bir bağlantıyı açmadan önce QR kodu kontrol etme", "Basılı bir afişten kod okutma", "Görsel olarak gönderilen QR kodu okuma"],
      faq: [
        { question: "QR kod okuyucu kaydedilmiş bir fotoğraftaki kodu okuyabilir mi?", answer: "Evet, okuyucu kodu ya kamerayla canlı ya da yüklenen bir görselden okuyabilir." },
        { question: "Codivio'nun QR kod okuyucusu ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Bir QR kod okutulduktan sonra ne olur?", answer: "Bir bağlantı veya metin gibi çözülen içerik, görüntülenip açılabilmesi için gösterilir." },
        { question: "Bulanık veya hasarlı bir QR kod yine de okutulabilir mi?", answer: "QR kodlarda bir miktar hata düzeltme bulunur, ancak ciddi hasarlı veya çok bulanık bir kod güvenilir şekilde okunmayabilir." },
        { question: "QR kod okutmak yerine oluşturmam gerekirse ne yapmalıyım?", answer: "QR Kod Oluşturucu aracı yeni QR kodlar oluşturmak için tasarlanmıştır." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Evet — bu araç canlıdır ve tamamen işlevseldir; ister kamerayla ister görsel yükleyerek kullanın, hiçbir şey sunucuya gönderilmez." },
      ],
    },
  },

  "url-to-qr": {
    en: {
      introduction: TOOL_INTRODUCTIONS["url-to-qr"].en,
      valueProposition: "Give any URL a scannable form once the tool is live.",
      benefits: ["Works with any website link", "Good for print materials", "Free to use"],
      howToSteps: ["Paste the website link", "Generate the QR code", "Download and use it on your material"],
      useCases: ["Adding a website link to a poster", "Sharing a landing page at an event", "Linking a product page from packaging"],
      faq: [
        { question: "Does the QR code work for any website link?", answer: "Yes, any valid web address can be turned into a QR code." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Does the link need to be a complete web address?", answer: "A complete, valid web address is needed so the QR code opens the right page when scanned." },
        { question: "Is this different from the general QR Code Generator?", answer: "This tool focuses specifically on website links, while the QR Code Generator also supports text and other content types." },
        { question: "Can the same QR code be reused on multiple printed materials?", answer: "Yes, once created, the same QR code image can be reused anywhere it's needed." },
        { question: "Is this tool available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["url-to-qr"].az,
      valueProposition: "Alət aktiv olduqda istənilən URL-i skan edilə bilən formaya salın.",
      benefits: ["İstənilən veb sayt linki ilə işləyir", "Çap materialları üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Veb sayt linkini yapışdırın", "QR kodu yaradın", "Yükləyin və materialınızda istifadə edin"],
      useCases: ["Plakata veb sayt linki əlavə etmək", "Tədbirdə açılış səhifəsini paylaşmaq", "Qablaşdırmadan məhsul səhifəsinə keçid vermək"],
      faq: [
        { question: "QR kod istənilən veb sayt linki üçün işləyir?", answer: "Bəli, istənilən düzgün veb ünvanı QR koda çevrilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Link tam veb ünvanı olmalıdır?", answer: "QR kod skan edildikdə düzgün səhifəni açması üçün tam, düzgün veb ünvanı lazımdır." },
        { question: "Bu, ümumi QR Kod Generatorundan fərqlidirmi?", answer: "Bu alət xüsusilə veb sayt linkləri üçündür, QR Kod Generatoru isə mətn və digər məzmun növlərini də dəstəkləyir." },
        { question: "Eyni QR kod bir neçə çap materialında təkrar istifadə edilə bilər?", answer: "Bəli, yaradıldıqdan sonra eyni QR kod şəkli lazım olan istənilən yerdə təkrar istifadə edilə bilər." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["url-to-qr"].tr,
      valueProposition: "Araç yayına girdiğinde herhangi bir URL'yi taranabilir hale getirin.",
      benefits: ["Herhangi bir web sitesi bağlantısıyla çalışır", "Basılı materyaller için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Web sitesi bağlantısını yapıştırın", "QR kodu oluşturun", "İndirin ve materyalinizde kullanın"],
      useCases: ["Bir afişe web sitesi bağlantısı ekleme", "Bir etkinlikte açılış sayfasını paylaşma", "Ambalajdan ürün sayfasına yönlendirme"],
      faq: [
        { question: "QR kod her web sitesi bağlantısı için çalışır mı?", answer: "Evet, geçerli her web adresi bir QR koda dönüştürülebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Bağlantının tam bir web adresi olması gerekir mi?", answer: "QR kodun taratıldığında doğru sayfayı açması için tam ve geçerli bir web adresi gerekir." },
        { question: "Bu, genel QR Kod Oluşturucudan farklı mı?", answer: "Bu araç özellikle web sitesi bağlantılarına odaklanır; QR Kod Oluşturucu ise ayrıca metin ve diğer içerik türlerini de destekler." },
        { question: "Aynı QR kod birden fazla basılı materyalde yeniden kullanılabilir mi?", answer: "Evet, oluşturulduktan sonra aynı QR kod görseli ihtiyaç duyulan her yerde yeniden kullanılabilir." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "text-to-qr": {
    en: {
      introduction: TOOL_INTRODUCTIONS["text-to-qr"].en,
      valueProposition: "Share a short message as a scannable code once the tool is live.",
      benefits: ["No link required", "Good for short notes or instructions", "Free to use"],
      howToSteps: ["Type or paste the text", "Generate the QR code", "Share or print the code"],
      useCases: ["Sharing a short instruction on a sign", "Displaying a quote or note", "Sharing information without a website"],
      faq: [
        { question: "Is there a length limit for the text?", answer: "Very long text can make a QR code harder to scan, so shorter text works best." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "What kind of text works best?", answer: "Short, clear text works best; very long passages can make the resulting code dense and harder to scan." },
        { question: "Can special characters or emojis be included?", answer: "Basic text is the safest choice; some special characters may not scan reliably on every device." },
        { question: "What if I want to share a link instead of plain text?", answer: "The URL to QR Code tool is designed specifically for website links." },
        { question: "Is this tool available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["text-to-qr"].az,
      valueProposition: "Alət aktiv olduqda qısa mesajı skan edilə bilən koda çevirin.",
      benefits: ["Link tələb olunmur", "Qısa qeyd və ya təlimat üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Mətni yazın və ya yapışdırın", "QR kodu yaradın", "Kodu paylaşın və ya çap edin"],
      useCases: ["Lövhədə qısa təlimat paylaşmaq", "Sitat və ya qeyd göstərmək", "Veb sayt olmadan məlumat paylaşmaq"],
      faq: [
        { question: "Mətn üçün uzunluq limiti varmı?", answer: "Çox uzun mətn QR kodun skan olunmasını çətinləşdirə bilər, ona görə qısa mətn daha yaxşıdır." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Hansı mətn növü ən yaxşı nəticəni verir?", answer: "Qısa, aydın mətn ən yaxşı işləyir; çox uzun mətn kodu sıxlaşdıraraq skan olunmasını çətinləşdirə bilər." },
        { question: "Xüsusi simvol və ya emoji daxil edilə bilər?", answer: "Sadə mətn ən etibarlı seçimdir; bəzi xüsusi simvollar hər cihazda etibarlı skan olunmaya bilər." },
        { question: "Mətn əvəzinə link paylaşmaq istəsəm nə etməliyəm?", answer: "URL-dən QR koda aləti xüsusilə veb sayt linkləri üçün nəzərdə tutulub." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["text-to-qr"].tr,
      valueProposition: "Araç yayına girdiğinde kısa bir mesajı taranabilir bir koda dönüştürün.",
      benefits: ["Bağlantı gerekmez", "Kısa notlar veya talimatlar için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Metni yazın veya yapıştırın", "QR kodu oluşturun", "Kodu paylaşın veya yazdırın"],
      useCases: ["Bir tabelada kısa talimat paylaşma", "Bir alıntı veya not gösterme", "Web sitesi olmadan bilgi paylaşma"],
      faq: [
        { question: "Metin için bir uzunluk sınırı var mı?", answer: "Çok uzun metin QR kodun okunmasını zorlaştırabilir, bu yüzden kısa metin daha iyi sonuç verir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Hangi tür metin en iyi sonucu verir?", answer: "Kısa, net metin en iyi sonucu verir; çok uzun metinler kodu yoğunlaştırarak okunmasını zorlaştırabilir." },
        { question: "Özel karakterler veya emoji eklenebilir mi?", answer: "Basit metin en güvenli seçimdir; bazı özel karakterler her cihazda güvenilir şekilde okunmayabilir." },
        { question: "Metin yerine bir bağlantı paylaşmak istersem ne yapmalıyım?", answer: "URL'den QR Koda aracı özellikle web sitesi bağlantıları için tasarlanmıştır." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "wifi-qr": {
    en: {
      introduction: TOOL_INTRODUCTIONS["wifi-qr"].en,
      valueProposition: "Let guests connect to your WiFi with a scan once the tool is live.",
      benefits: ["No password typing needed", "Good for guests and visitors", "Free to use"],
      howToSteps: ["Enter the network name and password", "Generate the QR code", "Display or print it for guests to scan"],
      useCases: ["Sharing WiFi access at a cafe or office", "Giving guests internet access at home", "Displaying a WiFi code at an event"],
      faq: [
        { question: "Does scanning the code reveal my password as plain text?", answer: "The code stores the network details needed to connect; treat printed WiFi codes the way you would treat sharing the password itself." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "What information does the QR code need?", answer: "The network name (SSID) and password are the two essential pieces of information." },
        { question: "Can guests connect without typing anything?", answer: "Scanning the code is designed to fill in the connection details automatically, without manual typing." },
        { question: "What if I want to share a QR code for something other than WiFi?", answer: "Codivio offers separate QR tools for links, text, contact details and more." },
        { question: "Is this tool available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["wifi-qr"].az,
      valueProposition: "Alət aktiv olduqda qonaqların bir skanla WiFi-a qoşulmasını təmin edin.",
      benefits: ["Şifrə yazmağa ehtiyac yoxdur", "Qonaqlar üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Şəbəkə adını və şifrəni daxil edin", "QR kodu yaradın", "Qonaqların skan etməsi üçün göstərin və ya çap edin"],
      useCases: ["Kafedə və ya ofisdə WiFi girişini paylaşmaq", "Evdə qonaqlara internet girişi vermək", "Tədbirdə WiFi kodunu göstərmək"],
      faq: [
        { question: "Kodu skan etmək şifrəmi açıq mətn kimi göstərirmi?", answer: "Kod qoşulmaq üçün lazım olan şəbəkə məlumatlarını saxlayır; çap edilmiş WiFi koduna şifrəni paylaşmaq kimi ehtiyatlı yanaşın." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "QR kod hansı məlumata ehtiyac duyur?", answer: "Şəbəkə adı (SSID) və şifrə qoşulmaq üçün lazım olan iki əsas məlumatdır." },
        { question: "Qonaqlar heç nə yazmadan qoşula bilər?", answer: "Kodu skan etmək qoşulma məlumatlarını əl ilə yazmadan avtomatik doldurmaq üçün nəzərdə tutulub." },
        { question: "WiFi-dan başqa bir şey üçün QR kod paylaşmaq istəsəm nə etməliyəm?", answer: "Codivio link, mətn, əlaqə məlumatları və digərləri üçün ayrı QR alətləri təklif edir." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["wifi-qr"].tr,
      valueProposition: "Araç yayına girdiğinde misafirlerin tek bir taramayla WiFi'nize bağlanmasını sağlayın.",
      benefits: ["Şifre yazmaya gerek yok", "Misafirler için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Ağ adını ve şifresini girin", "QR kodu oluşturun", "Misafirlerin taraması için gösterin veya yazdırın"],
      useCases: ["Bir kafede veya ofiste WiFi erişimini paylaşma", "Evde misafirlere internet erişimi verme", "Bir etkinlikte WiFi kodunu gösterme"],
      faq: [
        { question: "Kodu taratmak şifremi düz metin olarak gösterir mi?", answer: "Kod, bağlanmak için gereken ağ bilgilerini içerir; basılı WiFi kodlarına şifreyi paylaşır gibi dikkatli yaklaşın." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "QR kod hangi bilgiye ihtiyaç duyar?", answer: "Ağ adı (SSID) ve şifre, bağlanmak için gereken iki temel bilgidir." },
        { question: "Misafirler hiçbir şey yazmadan bağlanabilir mi?", answer: "Kodu taratmak, bağlantı bilgilerini elle yazmaya gerek kalmadan otomatik olarak doldurmak için tasarlanmıştır." },
        { question: "WiFi dışında bir şey için QR kod paylaşmak istersem ne yapmalıyım?", answer: "Codivio; bağlantı, metin, iletişim bilgileri ve daha fazlası için ayrı QR araçları sunar." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "vcard-qr": {
    en: {
      introduction: TOOL_INTRODUCTIONS["vcard-qr"].en,
      valueProposition: "Share your contact card without printing or typing once the tool is live.",
      benefits: ["Saves name, phone and email at once", "No manual typing needed", "Free to use"],
      howToSteps: ["Enter your contact details", "Generate the QR code", "Share it on a card, badge or signature"],
      useCases: ["Adding a QR code to a business card", "Sharing contact details at a networking event", "Including a scannable contact in an email signature"],
      faq: [
        { question: "What information can a vCard QR code include?", answer: "Typically a name, phone number, email and similar contact fields." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "What happens when someone scans the code?", answer: "Their phone offers to save the included details directly as a new contact." },
        { question: "Is this useful for digital business cards?", answer: "Yes, this is one of the most common uses — sharing contact details without a printed card." },
        { question: "What if I want to share just a phone number for a quick call?", answer: "The Phone QR Code Generator tool is designed specifically for click-to-call codes." },
        { question: "Is this tool available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["vcard-qr"].az,
      valueProposition: "Alət aktiv olduqda əlaqə kartınızı çap etmədən və yazmadan paylaşın.",
      benefits: ["Ad, telefon və e-poçtu birlikdə saxlayır", "Əl ilə yazmağa ehtiyac yoxdur", "Pulsuz istifadə"],
      howToSteps: ["Əlaqə məlumatlarınızı daxil edin", "QR kodu yaradın", "Kartda, nişanda və ya imzada paylaşın"],
      useCases: ["Vizit kartına QR kod əlavə etmək", "Networking tədbirində əlaqə paylaşmaq", "E-poçt imzasına skan edilə bilən əlaqə əlavə etmək"],
      faq: [
        { question: "vCard QR kodu hansı məlumatları özündə saxlaya bilər?", answer: "Adətən ad, telefon nömrəsi, e-poçt və bənzər əlaqə sahələri." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Kimsə kodu skan etdikdə nə baş verir?", answer: "Onun telefonu daxil olunmuş məlumatları birbaşa yeni əlaqə kimi saxlamağı təklif edir." },
        { question: "Bu, rəqəmsal vizit kartı üçün faydalıdırmı?", answer: "Bəli, bu ən geniş yayılmış istifadələrdən biridir — çap edilmiş kart olmadan əlaqə məlumatı paylaşmaq." },
        { question: "Yalnız sürətli zəng üçün telefon nömrəsi paylaşmaq istəsəm nə etməliyəm?", answer: "Telefon QR kodu aləti xüsusilə klikləyib-zəng kodları üçün nəzərdə tutulub." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["vcard-qr"].tr,
      valueProposition: "Araç yayına girdiğinde iletişim kartınızı yazdırmadan veya yazmadan paylaşın.",
      benefits: ["Ad, telefon ve e-postayı birlikte kaydeder", "Elle yazmaya gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["İletişim bilgilerinizi girin", "QR kodu oluşturun", "Kartvizitte, yaka kartında veya imzada paylaşın"],
      useCases: ["Kartvizite QR kod ekleme", "Networking etkinliğinde iletişim paylaşma", "E-posta imzasına taranabilir iletişim ekleme"],
      faq: [
        { question: "Bir vCard QR kodu hangi bilgileri içerebilir?", answer: "Genellikle ad, telefon numarası, e-posta ve benzeri iletişim alanları." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Biri kodu okuttuğunda ne olur?", answer: "Telefonu, dahil edilen bilgileri doğrudan yeni bir kişi olarak kaydetmeyi önerir." },
        { question: "Bu, dijital kartvizitler için faydalı mı?", answer: "Evet, bu en yaygın kullanımlardan biridir — basılı bir kart olmadan iletişim bilgisi paylaşmak." },
        { question: "Yalnızca hızlı bir arama için telefon numarası paylaşmak istersem ne yapmalıyım?", answer: "Telefon QR Kodu aracı özellikle tıkla-ara kodları için tasarlanmıştır." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "email-qr": {
    en: {
      introduction: TOOL_INTRODUCTIONS["email-qr"].en,
      valueProposition: "Make it easier for people to email you once the tool is live.",
      benefits: ["Recipient and subject pre-filled", "Saves the sender typing", "Free to use"],
      howToSteps: ["Enter the email address and optional subject", "Generate the QR code", "Display it wherever people should contact you"],
      useCases: ["Adding a contact QR code to a poster", "Making support easier to reach on packaging", "Sharing a quick way to email at an event"],
      faq: [
        { question: "Can the QR code include a subject line?", answer: "Yes, a subject can be pre-filled so the recipient doesn't have to type it." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Does the recipient need an app to open the email?", answer: "Scanning is designed to open the phone's default email app with the message ready to send." },
        { question: "Is this useful for customer support contact?", answer: "Yes, it's a common way to make a support address easy to reach from printed materials." },
        { question: "What if I want people to text or call instead of emailing?", answer: "Codivio also offers separate SMS QR Code and Phone QR Code tools." },
        { question: "Is this tool available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["email-qr"].az,
      valueProposition: "Alət aktiv olduqda insanların sizə e-poçt yazmasını asanlaşdırın.",
      benefits: ["Alıcı və mövzu əvvəlcədən doldurulur", "Göndərənin yazmasına ehtiyac qalmır", "Pulsuz istifadə"],
      howToSteps: ["E-poçt ünvanını və istəyə görə mövzunu daxil edin", "QR kodu yaradın", "İnsanların sizinlə əlaqə saxlaya biləcəyi yerdə göstərin"],
      useCases: ["Plakata əlaqə QR kodu əlavə etmək", "Qablaşdırmada dəstəyə çatmağı asanlaşdırmaq", "Tədbirdə sürətli e-poçt yolu paylaşmaq"],
      faq: [
        { question: "QR koda mövzu sətri daxil edilə bilər?", answer: "Bəli, mövzu əvvəlcədən doldurula bilər ki, alıcı onu yazmaq məcburiyyətində qalmasın." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Alıcının e-poçtu açmaq üçün tətbiqə ehtiyacı varmı?", answer: "Skan etmək telefonun standart e-poçt tətbiqini mesaj göndərməyə hazır açmaq üçün nəzərdə tutulub." },
        { question: "Bu, müştəri dəstəyi əlaqəsi üçün faydalıdırmı?", answer: "Bəli, bu, dəstək ünvanını çap materiallarından asanlıqla çatan etməyin geniş yayılmış yoludur." },
        { question: "İnsanların e-poçt əvəzinə mesaj yazmasını və ya zəng etməsini istəsəm nə etməliyəm?", answer: "Codivio ayrıca SMS QR kodu və Telefon QR kodu alətlərini təklif edir." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["email-qr"].tr,
      valueProposition: "Araç yayına girdiğinde insanların size e-posta göndermesini kolaylaştırın.",
      benefits: ["Alıcı ve konu önceden doldurulur", "Gönderenin yazmasına gerek kalmaz", "Ücretsiz kullanım"],
      howToSteps: ["E-posta adresini ve isteğe bağlı konuyu girin", "QR kodu oluşturun", "İnsanların size ulaşabileceği yerde gösterin"],
      useCases: ["Bir afişe iletişim QR kodu ekleme", "Ambalajda destek ile iletişimi kolaylaştırma", "Bir etkinlikte hızlı e-posta yolu paylaşma"],
      faq: [
        { question: "QR koda bir konu satırı eklenebilir mi?", answer: "Evet, konu önceden doldurulabilir, böylece alıcı onu yazmak zorunda kalmaz." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Alıcının e-postayı açmak için bir uygulamaya ihtiyacı var mı?", answer: "Taratmak, telefonun varsayılan e-posta uygulamasını mesajı göndermeye hazır şekilde açmak için tasarlanmıştır." },
        { question: "Bu, müşteri destek iletişimi için faydalı mı?", answer: "Evet, bu, destek adresini basılı materyallerden kolayca ulaşılabilir yapmanın yaygın bir yoludur." },
        { question: "İnsanların e-posta yerine mesaj atmasını veya aramasını istersem ne yapmalıyım?", answer: "Codivio ayrıca SMS QR Kodu ve Telefon QR Kodu araçlarını sunar." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "sms-qr": {
    en: {
      introduction: TOOL_INTRODUCTIONS["sms-qr"].en,
      valueProposition: "Make it faster for people to text you once the tool is live.",
      benefits: ["Message text pre-filled", "Saves the sender typing", "Free to use"],
      howToSteps: ["Enter the phone number and message", "Generate the QR code", "Share it wherever a quick reply is useful"],
      useCases: ["Collecting quick feedback via text", "Making it easy to confirm an order by SMS", "Sharing a fast way to reach you at an event"],
      faq: [
        { question: "Can the message text be edited before sending?", answer: "Yes, the pre-filled text opens in the phone's own messaging app, where it can still be edited." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Does the message send automatically when scanned?", answer: "Scanning opens the messaging app with the text ready — sending still requires the user to tap send." },
        { question: "Is this useful for quick customer feedback?", answer: "Yes, a pre-filled text message is a fast way to collect a short reply." },
        { question: "What if I want people to email or call instead of texting?", answer: "Codivio also offers separate Email QR Code and Phone QR Code tools." },
        { question: "Is this tool available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["sms-qr"].az,
      valueProposition: "Alət aktiv olduqda insanların sizə mesaj yazmasını sürətləndirin.",
      benefits: ["Mesaj mətni əvvəlcədən doldurulur", "Göndərənin yazmasına ehtiyac qalmır", "Pulsuz istifadə"],
      howToSteps: ["Telefon nömrəsini və mesajı daxil edin", "QR kodu yaradın", "Sürətli cavabın faydalı olduğu yerdə paylaşın"],
      useCases: ["Mesaj vasitəsilə sürətli rəy toplamaq", "SMS ilə sifarişi təsdiqləməyi asanlaşdırmaq", "Tədbirdə sizə çatmağın sürətli yolunu paylaşmaq"],
      faq: [
        { question: "Göndərmədən əvvəl mesaj mətni redaktə edilə bilər?", answer: "Bəli, əvvəlcədən doldurulmuş mətn telefonun öz mesajlaşma tətbiqində açılır və orada redaktə edilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Mesaj skan edildikdə avtomatik göndərilir?", answer: "Skan etmək mesajlaşma tətbiqini mətnlə hazır açır — göndərmək üçün istifadəçi düyməni sıxmalıdır." },
        { question: "Bu, sürətli müştəri rəyi üçün faydalıdırmı?", answer: "Bəli, əvvəlcədən doldurulmuş mesaj qısa cavab toplamağın sürətli yoludur." },
        { question: "İnsanların mesaj yazmaq əvəzinə e-poçt yazmasını və ya zəng etməsini istəsəm nə etməliyəm?", answer: "Codivio ayrıca E-poçt QR kodu və Telefon QR kodu alətlərini təklif edir." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["sms-qr"].tr,
      valueProposition: "Araç yayına girdiğinde insanların size mesaj atmasını hızlandırın.",
      benefits: ["Mesaj metni önceden doldurulur", "Gönderenin yazmasına gerek kalmaz", "Ücretsiz kullanım"],
      howToSteps: ["Telefon numarasını ve mesajı girin", "QR kodu oluşturun", "Hızlı bir yanıtın işe yaradığı yerde paylaşın"],
      useCases: ["Mesajla hızlı geri bildirim toplama", "SMS ile sipariş onayını kolaylaştırma", "Bir etkinlikte size ulaşmanın hızlı yolunu paylaşma"],
      faq: [
        { question: "Göndermeden önce mesaj metni düzenlenebilir mi?", answer: "Evet, önceden doldurulmuş metin telefonun kendi mesajlaşma uygulamasında açılır ve orada düzenlenebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Mesaj okutulduğunda otomatik olarak gönderilir mi?", answer: "Taratmak, mesajlaşma uygulamasını metin hazır şekilde açar — göndermek için kullanıcının dokunması gerekir." },
        { question: "Bu, hızlı müşteri geri bildirimi için faydalı mı?", answer: "Evet, önceden doldurulmuş bir mesaj kısa bir yanıt toplamanın hızlı bir yoludur." },
        { question: "İnsanların mesaj atmak yerine e-posta göndermesini veya aramasını istersem ne yapmalıyım?", answer: "Codivio ayrıca E-posta QR Kodu ve Telefon QR Kodu araçlarını sunar." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "whatsapp-qr": {
    en: {
      introduction: TOOL_INTRODUCTIONS["whatsapp-qr"].en,
      valueProposition: "Make it one scan away for people to message you on WhatsApp once the tool is live.",
      benefits: ["Opens a chat directly", "No need to save the number first", "Free to use"],
      howToSteps: ["Enter the WhatsApp number", "Generate the QR code", "Display it where customers or contacts can scan it"],
      useCases: ["Adding WhatsApp contact to a storefront", "Making customer support easier to reach", "Sharing a quick way to chat at an event"],
      faq: [
        { question: "Does the person need to save the number first?", answer: "No, scanning the code opens the chat directly without saving the contact." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Does the person need WhatsApp installed?", answer: "Yes, the code opens a WhatsApp conversation, so the scanning device needs WhatsApp installed." },
        { question: "Is this useful for customer service?", answer: "Yes, it's a common way to make WhatsApp support easy to reach from a storefront or packaging." },
        { question: "What if I want a general phone call instead of a WhatsApp chat?", answer: "The Phone QR Code Generator tool is designed specifically for regular calls." },
        { question: "Is this tool available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["whatsapp-qr"].az,
      valueProposition: "Alət aktiv olduqda insanların sizə WhatsApp-da yazmasını bir skana endirin.",
      benefits: ["Söhbəti birbaşa açır", "Nömrəni əvvəlcədən saxlamağa ehtiyac yoxdur", "Pulsuz istifadə"],
      howToSteps: ["WhatsApp nömrəsini daxil edin", "QR kodu yaradın", "Müştərilərin skan edə biləcəyi yerdə göstərin"],
      useCases: ["Mağazaya WhatsApp əlaqəsi əlavə etmək", "Müştəri dəstəyinə çatmağı asanlaşdırmaq", "Tədbirdə sürətli söhbət yolunu paylaşmaq"],
      faq: [
        { question: "İnsan əvvəlcə nömrəni yadda saxlamalıdır?", answer: "Xeyr, kodu skan etmək əlaqəni saxlamadan birbaşa söhbəti açır." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "İnsanın WhatsApp quraşdırılmış olmalıdır?", answer: "Bəli, kod WhatsApp söhbəti açır, ona görə skan edən cihazda WhatsApp quraşdırılmış olmalıdır." },
        { question: "Bu, müştəri xidməti üçün faydalıdırmı?", answer: "Bəli, bu, mağaza və ya qablaşdırmadan WhatsApp dəstəyini asanlıqla çatan etməyin geniş yayılmış yoludur." },
        { question: "WhatsApp söhbəti əvəzinə adi zəng istəsəm nə etməliyəm?", answer: "Telefon QR kodu aləti xüsusilə adi zənglər üçün nəzərdə tutulub." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["whatsapp-qr"].tr,
      valueProposition: "Araç yayına girdiğinde insanların size WhatsApp'tan yazmasını tek bir taramaya indirin.",
      benefits: ["Sohbeti doğrudan açar", "Numarayı önceden kaydetmeye gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["WhatsApp numarasını girin", "QR kodu oluşturun", "Müşterilerin taratabileceği yerde gösterin"],
      useCases: ["Mağazaya WhatsApp iletişimi ekleme", "Müşteri desteğine ulaşmayı kolaylaştırma", "Bir etkinlikte hızlı sohbet yolunu paylaşma"],
      faq: [
        { question: "Kişinin önce numarayı kaydetmesi gerekir mi?", answer: "Hayır, kodu taratmak kişiyi kaydetmeden sohbeti doğrudan açar." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Kişinin WhatsApp'ı kurulu olması gerekir mi?", answer: "Evet, kod bir WhatsApp sohbeti açar, bu yüzden taratan cihazda WhatsApp kurulu olmalıdır." },
        { question: "Bu, müşteri hizmetleri için faydalı mı?", answer: "Evet, bu, bir mağaza veya ambalajdan WhatsApp desteğini kolayca ulaşılabilir yapmanın yaygın bir yoludur." },
        { question: "WhatsApp sohbeti yerine normal bir telefon araması istersem ne yapmalıyım?", answer: "Telefon QR Kodu aracı özellikle normal aramalar için tasarlanmıştır." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "phone-qr": {
    en: {
      introduction: TOOL_INTRODUCTIONS["phone-qr"].en,
      valueProposition: "Turn a phone number into a one-tap call once the tool is live.",
      benefits: ["Starts the call directly", "No need to type the number", "Free to use"],
      howToSteps: ["Enter the phone number", "Generate the QR code", "Display it where a quick call is useful"],
      useCases: ["Adding a click-to-call code to a service van", "Making it easy to call support from packaging", "Sharing a fast way to call at an event booth"],
      faq: [
        { question: "Does scanning the code call the number automatically?", answer: "Scanning opens the phone's dialer with the number ready, and calling still needs the user to confirm." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Can this be used for a support or sales number?", answer: "Yes, it's a common way to make a business number easy to call from printed materials." },
        { question: "Does the number need a country code?", answer: "Including the correct country code helps the number dial correctly on any device." },
        { question: "What if I want a WhatsApp chat instead of a phone call?", answer: "The WhatsApp QR Code Generator tool is designed specifically for opening a WhatsApp conversation." },
        { question: "Is this tool available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["phone-qr"].az,
      valueProposition: "Alət aktiv olduqda telefon nömrəsini bir toxunuşla zəngə çevirin.",
      benefits: ["Zəngi birbaşa başladır", "Nömrəni yazmağa ehtiyac yoxdur", "Pulsuz istifadə"],
      howToSteps: ["Telefon nömrəsini daxil edin", "QR kodu yaradın", "Sürətli zəngin faydalı olduğu yerdə göstərin"],
      useCases: ["Xidmət avtomobilinə klikləyib-zəng kodu əlavə etmək", "Qablaşdırmadan dəstəyə zəng etməyi asanlaşdırmaq", "Tədbir stendində sürətli zəng yolunu paylaşmaq"],
      faq: [
        { question: "Kodu skan etmək nömrəyə avtomatik zəng edir?", answer: "Skan etmək telefonun yığım ekranını nömrə ilə hazır açır, zəng üçün istifadəçinin təsdiqi lazımdır." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Bu, dəstək və ya satış nömrəsi üçün istifadə edilə bilər?", answer: "Bəli, bu, biznes nömrəsini çap materiallarından asanlıqla zəng edilən etməyin geniş yayılmış yoludur." },
        { question: "Nömrədə ölkə kodu olmalıdır?", answer: "Düzgün ölkə kodunun daxil edilməsi nömrənin istənilən cihazda düzgün yığılmasına kömək edir." },
        { question: "Zəng əvəzinə WhatsApp söhbəti istəsəm nə etməliyəm?", answer: "WhatsApp QR kodu aləti xüsusilə WhatsApp söhbəti açmaq üçün nəzərdə tutulub." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["phone-qr"].tr,
      valueProposition: "Araç yayına girdiğinde bir telefon numarasını tek dokunuşla aramaya dönüştürün.",
      benefits: ["Aramayı doğrudan başlatır", "Numarayı yazmaya gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["Telefon numarasını girin", "QR kodu oluşturun", "Hızlı bir aramanın işe yaradığı yerde gösterin"],
      useCases: ["Bir servis aracına tıkla-ara kodu ekleme", "Ambalajdan desteği aramayı kolaylaştırma", "Bir etkinlik standında hızlı arama yolunu paylaşma"],
      faq: [
        { question: "Kodu taratmak numarayı otomatik olarak arar mı?", answer: "Taratmak telefonun arama ekranını numarayla hazır açar, aramak için kullanıcının onayı gerekir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Bu, destek veya satış numarası için kullanılabilir mi?", answer: "Evet, bu, bir işletme numarasını basılı materyallerden kolayca aranabilir yapmanın yaygın bir yoludur." },
        { question: "Numaranın ülke kodu içermesi gerekir mi?", answer: "Doğru ülke kodunun eklenmesi, numaranın her cihazda doğru şekilde çevrilmesine yardımcı olur." },
        { question: "Telefon araması yerine WhatsApp sohbeti istersem ne yapmalıyım?", answer: "WhatsApp QR Kodu aracı özellikle bir WhatsApp sohbeti açmak için tasarlanmıştır." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "location-qr": {
    en: {
      introduction: TOOL_INTRODUCTIONS["location-qr"].en,
      valueProposition: "Share directions to any place with a single scan once the tool is live.",
      benefits: ["Opens the exact location on a map", "No address typing needed", "Free to use"],
      howToSteps: ["Enter the address or coordinates", "Generate the QR code", "Display it wherever directions are useful"],
      useCases: ["Adding directions to a store on a flyer", "Sharing an event venue location", "Making it easy to find an office entrance"],
      faq: [
        { question: "Which map app opens when the code is scanned?", answer: "It typically opens the device's default maps app." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Do I need exact GPS coordinates, or is an address enough?", answer: "Either a standard address or coordinates can typically be used to point to a location." },
        { question: "Is this useful for event invitations?", answer: "Yes, it's a common way to help guests find a venue without typing an address." },
        { question: "What if I want to share event details along with the location?", answer: "The Calendar QR Code Generator tool is designed for sharing event details directly." },
        { question: "Is this tool available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["location-qr"].az,
      valueProposition: "Alət aktiv olduqda bir skanla istənilən yerə yol tərifini paylaşın.",
      benefits: ["Xəritədə dəqiq məkanı açır", "Ünvan yazmağa ehtiyac yoxdur", "Pulsuz istifadə"],
      howToSteps: ["Ünvanı və ya koordinatları daxil edin", "QR kodu yaradın", "Yol tərifinin faydalı olduğu yerdə göstərin"],
      useCases: ["Vərəqəyə mağazaya yol tərifi əlavə etmək", "Tədbir məkanının ünvanını paylaşmaq", "Ofis girişini tapmağı asanlaşdırmaq"],
      faq: [
        { question: "Kod skan edildikdə hansı xəritə tətbiqi açılır?", answer: "Adətən cihazın standart xəritə tətbiqi açılır." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Dəqiq GPS koordinatları lazımdır, yoxsa ünvan kifayətdir?", answer: "Məkanı göstərmək üçün adətən standart ünvan və ya koordinatlar istifadə edilə bilər." },
        { question: "Bu, tədbir dəvətnamələri üçün faydalıdırmı?", answer: "Bəli, bu, qonaqlara ünvan yazmadan məkanı tapmağa kömək etməyin geniş yayılmış yoludur." },
        { question: "Məkanla yanaşı tədbir detallarını da paylaşmaq istəsəm nə etməliyəm?", answer: "Təqvim QR kodu aləti tədbir detallarını birbaşa paylaşmaq üçün nəzərdə tutulub." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["location-qr"].tr,
      valueProposition: "Araç yayına girdiğinde herhangi bir yere yol tarifini tek bir taramayla paylaşın.",
      benefits: ["Haritada tam konumu açar", "Adres yazmaya gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["Adresi veya koordinatları girin", "QR kodu oluşturun", "Yol tarifinin işe yaradığı yerde gösterin"],
      useCases: ["Bir broşüre mağazaya yol tarifi ekleme", "Bir etkinlik mekanının konumunu paylaşma", "Ofis girişini bulmayı kolaylaştırma"],
      faq: [
        { question: "Kod taratıldığında hangi harita uygulaması açılır?", answer: "Genellikle cihazın varsayılan harita uygulaması açılır." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Tam GPS koordinatlarına mı ihtiyacım var, yoksa bir adres yeterli mi?", answer: "Bir konumu belirtmek için genellikle standart bir adres veya koordinatlar kullanılabilir." },
        { question: "Bu, etkinlik davetiyeleri için faydalı mı?", answer: "Evet, bu, misafirlerin bir adresi yazmadan mekanı bulmasına yardımcı olmanın yaygın bir yoludur." },
        { question: "Konumla birlikte etkinlik bilgilerini de paylaşmak istersem ne yapmalıyım?", answer: "Takvim QR Kodu aracı etkinlik bilgilerini doğrudan paylaşmak için tasarlanmıştır." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "calendar-qr": {
    en: {
      introduction: TOOL_INTRODUCTIONS["calendar-qr"].en,
      valueProposition: "Share event details without back-and-forth messages once the tool is live.",
      benefits: ["Adds date, time and details at once", "No manual calendar entry needed", "Free to use"],
      howToSteps: ["Enter the event details", "Generate the QR code", "Share it on an invite or announcement"],
      useCases: ["Adding a QR code to a wedding invitation", "Sharing a meeting invite at work", "Promoting an event on printed materials"],
      faq: [
        { question: "Does the code work with any calendar app?", answer: "It's designed to work with common calendar apps on phones and computers." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "What event details can be included?", answer: "Typical fields include the event title, date, time and location." },
        { question: "Is this useful for invitations like weddings or meetings?", answer: "Yes, it's a common way to help guests save event details without extra messages." },
        { question: "What if I also want to share the event's location on a map?", answer: "The Location QR Code Generator tool is designed for sharing a map location directly." },
        { question: "Is this tool available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["calendar-qr"].az,
      valueProposition: "Alət aktiv olduqda tədbir detallarını uzun yazışma olmadan paylaşın.",
      benefits: ["Tarix, vaxt və detalları birlikdə əlavə edir", "Əl ilə təqvimə yazmağa ehtiyac yoxdur", "Pulsuz istifadə"],
      howToSteps: ["Tədbir detallarını daxil edin", "QR kodu yaradın", "Dəvətnamədə və ya elanda paylaşın"],
      useCases: ["Toy dəvətnaməsinə QR kod əlavə etmək", "İşdə görüş dəvətini paylaşmaq", "Çap materiallarında tədbiri tanıtmaq"],
      faq: [
        { question: "Kod istənilən təqvim tətbiqi ilə işləyir?", answer: "O, telefon və kompüterlərdə geniş yayılmış təqvim tətbiqləri ilə işləmək üçün nəzərdə tutulub." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Hansı tədbir detalları daxil edilə bilər?", answer: "Adətən tədbirin adı, tarixi, vaxtı və yeri kimi sahələr daxil edilir." },
        { question: "Bu, toy və ya görüş kimi dəvətnamələr üçün faydalıdırmı?", answer: "Bəli, bu, qonaqlara əlavə yazışma olmadan tədbir detallarını saxlamağa kömək etməyin geniş yayılmış yoludur." },
        { question: "Tədbirin yerini xəritədə də paylaşmaq istəsəm nə etməliyəm?", answer: "Məkan QR kodu aləti xəritə məkanını birbaşa paylaşmaq üçün nəzərdə tutulub." },
        { question: "Bu alət hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["calendar-qr"].tr,
      valueProposition: "Araç yayına girdiğinde etkinlik bilgilerini uzun yazışmalar olmadan paylaşın.",
      benefits: ["Tarih, saat ve ayrıntıları birlikte ekler", "Elle takvime girmeye gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["Etkinlik bilgilerini girin", "QR kodu oluşturun", "Davetiye veya duyuruda paylaşın"],
      useCases: ["Bir düğün davetiyesine QR kod ekleme", "İşte bir toplantı davetini paylaşma", "Basılı materyallerde bir etkinliği tanıtma"],
      faq: [
        { question: "Kod her takvim uygulamasıyla çalışır mı?", answer: "Telefon ve bilgisayarlardaki yaygın takvim uygulamalarıyla çalışacak şekilde tasarlanmıştır." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Hangi etkinlik bilgileri eklenebilir?", answer: "Genellikle etkinlik başlığı, tarih, saat ve konum gibi alanlar eklenir." },
        { question: "Bu, düğün veya toplantı gibi davetiyeler için faydalı mı?", answer: "Evet, bu, misafirlerin ek mesajlaşma olmadan etkinlik bilgilerini kaydetmesine yardımcı olmanın yaygın bir yoludur." },
        { question: "Etkinliğin konumunu da haritada paylaşmak istersem ne yapmalıyım?", answer: "Konum QR Kodu aracı bir harita konumunu doğrudan paylaşmak için tasarlanmıştır." },
        { question: "Bu araç şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "pdf-merge": {
    en: {
      introduction: TOOL_INTRODUCTIONS["pdf-merge"].en,
      valueProposition: "Bring scattered PDF files together into one document, right in your browser.",
      benefits: ["Combines files in the order you choose", "Keeps everything in one document", "Free to use"],
      howToSteps: ["Add the PDF files to merge", "Arrange them in the order you want", "Combine them into a single PDF"],
      useCases: ["Combining chapters into one report", "Merging scanned pages into a single file", "Putting multiple invoices into one document"],
      faq: [
        { question: "Can files be reordered before merging?", answer: "Yes, the files can be arranged in any order before combining them." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Is there a limit to how many files can be merged?", answer: "Yes — up to 20 PDF files can be merged at once, each up to 50 MB." },
        { question: "Can PDFs from different sources be merged together?", answer: "Yes, any standard PDF files can typically be combined regardless of where they came from." },
        { question: "What if I need to split a PDF instead of merging one?", answer: "The PDF Split tool is designed for separating one PDF into multiple files." },
        { question: "Is PDF Merge available to use right now?", answer: "Yes — PDF Merge is live now and works entirely in your browser." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["pdf-merge"].az,
      valueProposition: "Dağınıq PDF fayllarını birbaşa brauzerinizdə tək sənəddə toplayın.",
      benefits: ["Faylları seçdiyiniz sırada birləşdirir", "Hər şeyi tək sənəddə saxlayır", "Pulsuz istifadə"],
      howToSteps: ["Birləşdiriləcək PDF fayllarını əlavə edin", "Onları istədiyiniz sırada düzün", "Tək PDF-də birləşdirin"],
      useCases: ["Fəsilləri tək hesabatda birləşdirmək", "Skan edilmiş səhifələri tək faylda toplamaq", "Bir neçə fakturanı tək sənəddə cəmləmək"],
      faq: [
        { question: "Birləşdirmədən əvvəl faylların sırası dəyişdirilə bilər?", answer: "Bəli, fayllar birləşdirmədən əvvəl istənilən sırada düzülə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Birləşdirilə bilən faylların sayına limit varmı?", answer: "Bəli — eyni anda ən çoxu 20 PDF faylı birləşdirilə bilər, hər biri ən çoxu 50 MB olmaqla." },
        { question: "Fərqli mənbələrdən olan PDF-lər birləşdirilə bilər?", answer: "Bəli, haradan gəlməsindən asılı olmayaraq standart PDF faylları adətən birləşdirilə bilər." },
        { question: "Birləşdirmək əvəzinə PDF-i bölmək lazımdırsa nə etməliyəm?", answer: "PDF Bölmə aləti bir PDF-i bir neçə fayla ayırmaq üçün nəzərdə tutulub." },
        { question: "PDF Birləşdirmə hazırda istifadə üçün mövcuddur?", answer: "Bəli — PDF Birləşdirmə artıq aktivdir və tamamilə brauzerinizdə işləyir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["pdf-merge"].tr,
      valueProposition: "Dağınık PDF dosyalarını doğrudan tarayıcınızda tek bir belgede toplayın.",
      benefits: ["Dosyaları seçtiğiniz sırada birleştirir", "Her şeyi tek belgede tutar", "Ücretsiz kullanım"],
      howToSteps: ["Birleştirilecek PDF dosyalarını ekleyin", "İstediğiniz sırada düzenleyin", "Tek bir PDF'de birleştirin"],
      useCases: ["Bölümleri tek bir raporda birleştirme", "Taranmış sayfaları tek dosyada toplama", "Birden fazla faturayı tek belgede birleştirme"],
      faq: [
        { question: "Birleştirmeden önce dosyaların sırası değiştirilebilir mi?", answer: "Evet, dosyalar birleştirmeden önce istenilen sırada düzenlenebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Birleştirilebilecek dosya sayısında bir sınır var mı?", answer: "Evet — aynı anda en fazla 20 PDF dosyası birleştirilebilir, her biri en fazla 50 MB olmak üzere." },
        { question: "Farklı kaynaklardan gelen PDF'ler birlikte birleştirilebilir mi?", answer: "Evet, nereden geldiğine bakılmaksızın standart PDF dosyaları genellikle birleştirilebilir." },
        { question: "Birleştirmek yerine bir PDF'yi bölmem gerekirse ne yapmalıyım?", answer: "PDF Bölme aracı bir PDF'yi birden fazla dosyaya ayırmak için tasarlanmıştır." },
        { question: "PDF Birleştirme şu anda kullanılabilir mi?", answer: "Evet — PDF Birleştirme artık aktif ve tamamen tarayıcınızda çalışıyor." },
      ],
    },
  },

  "pdf-split": {
    en: {
      introduction: TOOL_INTRODUCTIONS["pdf-split"].en,
      valueProposition: "Pull exactly the pages you need out of a larger PDF, right in your browser.",
      benefits: ["Extracts specific page ranges", "Creates smaller, focused files", "Free to use"],
      howToSteps: ["Upload the PDF to split", "Choose the page ranges", "Save each part as a separate file"],
      useCases: ["Extracting one chapter from a long document", "Separating a contract's signature page", "Splitting a scanned batch into individual files"],
      faq: [
        { question: "Can I choose exactly which pages to extract?", answer: "Yes, specific page ranges can be selected before splitting." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Can a single page be extracted instead of a range?", answer: "Yes, a single page can be treated as a page range of one." },
        { question: "Does splitting affect the quality of the pages?", answer: "Splitting separates existing pages into new files without needing to re-render their content." },
        { question: "What if I need to combine files instead of splitting one?", answer: "The PDF Merge tool is designed for combining multiple PDFs into one." },
        { question: "Is PDF Split available to use right now?", answer: "Yes — PDF Split is live now and works entirely in your browser." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["pdf-split"].az,
      valueProposition: "Böyük PDF-dən yalnız lazım olan səhifələri birbaşa brauzerinizdə çıxarın.",
      benefits: ["Konkret səhifə aralığını çıxarır", "Kiçik, məqsədyönlü fayllar yaradır", "Pulsuz istifadə"],
      howToSteps: ["Bölünəcək PDF-i yükləyin", "Səhifə aralığını seçin", "Hər hissəni ayrı fayl kimi saxlayın"],
      useCases: ["Uzun sənəddən bir fəsli çıxarmaq", "Müqavilənin imza səhifəsini ayırmaq", "Skan edilmiş toplu sənədi ayrı fayllara bölmək"],
      faq: [
        { question: "Hansı səhifələrin çıxarılacağını dəqiq seçə bilərəm?", answer: "Bəli, bölmədən əvvəl konkret səhifə aralıqları seçilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Aralıq əvəzinə tək səhifə çıxarıla bilər?", answer: "Bəli, tək səhifə bir səhifəlik aralıq kimi qəbul edilə bilər." },
        { question: "Bölmə səhifələrin keyfiyyətinə təsir edir?", answer: "Bölmə mövcud səhifələri yeni fayllara ayırır, onların məzmununu yenidən render etməyə ehtiyac qalmır." },
        { question: "Bölmək əvəzinə faylları birləşdirmək lazımdırsa nə etməliyəm?", answer: "PDF Birləşdirmə aləti bir neçə PDF-i tək faylda birləşdirmək üçün nəzərdə tutulub." },
        { question: "PDF Bölmə hazırda istifadə üçün mövcuddur?", answer: "Bəli — PDF Bölmə artıq aktivdir və tamamilə brauzerinizdə işləyir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["pdf-split"].tr,
      valueProposition: "Büyük bir PDF'den tam ihtiyacınız olan sayfaları doğrudan tarayıcınızda çıkarın.",
      benefits: ["Belirli sayfa aralıklarını çıkarır", "Küçük, odaklı dosyalar oluşturur", "Ücretsiz kullanım"],
      howToSteps: ["Bölünecek PDF'yi yükleyin", "Sayfa aralıklarını seçin", "Her bölümü ayrı dosya olarak kaydedin"],
      useCases: ["Uzun bir belgeden bir bölümü çıkarma", "Bir sözleşmenin imza sayfasını ayırma", "Taranmış bir grubu ayrı dosyalara bölme"],
      faq: [
        { question: "Hangi sayfaların çıkarılacağını tam olarak seçebilir miyim?", answer: "Evet, bölmeden önce belirli sayfa aralıkları seçilebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Bir aralık yerine tek bir sayfa çıkarılabilir mi?", answer: "Evet, tek bir sayfa, bir sayfalık bir aralık olarak ele alınabilir." },
        { question: "Bölme, sayfaların kalitesini etkiler mi?", answer: "Bölme, mevcut sayfaları yeni dosyalara ayırır ve içeriklerini yeniden oluşturmaya gerek kalmaz." },
        { question: "Bölmek yerine dosyaları birleştirmem gerekirse ne yapmalıyım?", answer: "PDF Birleştirme aracı birden fazla PDF'yi tek bir dosyada birleştirmek için tasarlanmıştır." },
        { question: "PDF Bölme şu anda kullanılabilir mi?", answer: "Evet — PDF Bölme artık aktif ve tamamen tarayıcınızda çalışıyor." },
      ],
    },
  },

  "pdf-compress": {
    en: {
      introduction: TOOL_INTRODUCTIONS["pdf-compress"].en,
      valueProposition: "Make a large PDF easier to email and store, working entirely in your browser.",
      benefits: ["Smaller file size for sharing", "Keeps the document readable", "Free to use"],
      howToSteps: ["Upload the PDF to compress", "Let the tool reduce its file size", "Download the smaller file"],
      useCases: ["Fitting a PDF under an email attachment limit", "Saving storage space for scanned documents", "Speeding up uploads to a website form"],
      faq: [
        { question: "Why do PDFs with scanned pages get so large?", answer: "Scanned pages are stored as images, which take up much more space than typed text." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "How much smaller will my PDF get?", answer: "It depends entirely on the file's content — documents with many scanned pages or photos typically shrink the most, while text-only or already-optimized PDFs may see little or no change. No fixed percentage is ever guaranteed." },
        { question: "Is this useful before emailing a document?", answer: "Yes, reducing file size is one of the most common reasons to compress a PDF before sending it." },
        { question: "What if the PDF is large because of images rather than page count?", answer: "Compression is specifically aimed at reducing this kind of image-heavy file size." },
        { question: "Is PDF Compress available to use right now?", answer: "Yes — PDF Compress is live now and works entirely in your browser." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["pdf-compress"].az,
      valueProposition: "Tamamilə brauzerinizdə işləyərək böyük PDF-i e-poçt və saxlama üçün asanlaşdırın.",
      benefits: ["Paylaşım üçün kiçik fayl ölçüsü", "Sənədi oxunaqlı saxlayır", "Pulsuz istifadə"],
      howToSteps: ["Sıxılacaq PDF-i yükləyin", "Alətin fayl ölçüsünü azaltmasına icazə verin", "Kiçik faylı yükləyin"],
      useCases: ["PDF-i e-poçt əlavəsi limitinə salmaq", "Skan edilmiş sənədlər üçün yer qənaət etmək", "Veb sayt formasına yükləməni sürətləndirmək"],
      faq: [
        { question: "Nə üçün skan edilmiş səhifəli PDF-lər bu qədər böyük olur?", answer: "Skan edilmiş səhifələr şəkil kimi saxlanılır və bu, yazılmış mətndən qat-qat çox yer tutur." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "PDF-im nə qədər kiçiləcək?", answer: "Bu tamamilə faylın məzmunundan asılıdır — çox skan edilmiş səhifəsi və ya fotosu olan sənədlər adətən ən çox kiçilir, mətn əsaslı və ya artıq optimallaşdırılmış PDF-lər isə az və ya heç dəyişməyə bilər. Sabit faiz heç vaxt zəmanət verilmir." },
        { question: "Bu, sənədi e-poçtla göndərmədən əvvəl faydalıdırmı?", answer: "Bəli, fayl ölçüsünü azaltmaq PDF-i göndərmədən əvvəl sıxmağın ən geniş yayılmış səbəbidir." },
        { question: "PDF səhifə sayına görə deyil, şəkillərə görə böyükdürsə nə olacaq?", answer: "Sıxma xüsusilə bu cür şəkil-ağırlıqlı fayl ölçüsünü azaltmağa yönəlib." },
        { question: "PDF Sıxma hazırda istifadə üçün mövcuddur?", answer: "Bəli — PDF Sıxma artıq aktivdir və tamamilə brauzerinizdə işləyir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["pdf-compress"].tr,
      valueProposition: "Tamamen tarayıcınızda çalışarak büyük bir PDF'yi e-postayla göndermeyi ve depolamayı kolaylaştırın.",
      benefits: ["Paylaşım için daha küçük dosya boyutu", "Belgeyi okunabilir tutar", "Ücretsiz kullanım"],
      howToSteps: ["Sıkıştırılacak PDF'yi yükleyin", "Aracın dosya boyutunu küçültmesine izin verin", "Küçültülmüş dosyayı indirin"],
      useCases: ["Bir PDF'yi e-posta eki sınırına sığdırma", "Taranmış belgeler için depolama alanından tasarruf etme", "Bir web sitesi formuna yüklemeyi hızlandırma"],
      faq: [
        { question: "Taranmış sayfalı PDF'ler neden bu kadar büyük olur?", answer: "Taranmış sayfalar görsel olarak saklanır ve bu, yazılmış metinden çok daha fazla yer kaplar." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "PDF'im ne kadar küçülecek?", answer: "Bu tamamen dosyanın içeriğine bağlıdır — çok sayıda taranmış sayfa veya fotoğraf içeren belgeler genellikle en fazla küçülür, yalnızca metin içeren veya zaten optimize edilmiş PDF'ler ise az değişebilir ya da hiç değişmeyebilir. Sabit bir yüzde asla garanti edilmez." },
        { question: "Bu, bir belgeyi e-postayla göndermeden önce faydalı mı?", answer: "Evet, dosya boyutunu küçültmek bir PDF'yi göndermeden önce sıkıştırmanın en yaygın nedenlerinden biridir." },
        { question: "PDF, sayfa sayısından değil de görsellerden dolayı büyükse ne olur?", answer: "Sıkıştırma özellikle bu tür görsel ağırlıklı dosya boyutunu küçültmeyi hedefler." },
        { question: "PDF Sıkıştırma şu anda kullanılabilir mi?", answer: "Evet — PDF Sıkıştırma artık aktif ve tamamen tarayıcınızda çalışıyor." },
      ],
    },
  },

  "pdf-to-jpg": {
    en: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-jpg"].en,
      valueProposition: "Turn PDF pages into shareable images once the tool is live.",
      benefits: ["One JPG per page", "Good for sharing on platforms that expect images", "Free to use"],
      howToSteps: ["Upload the PDF to convert", "Let the tool convert each page", "Download the JPG images"],
      useCases: ["Sharing a document page on social media", "Inserting a PDF page into a presentation", "Previewing a page without opening a PDF viewer"],
      faq: [
        { question: "Does every page become its own image?", answer: "Yes, each page is converted into a separate JPG file." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Can specific pages be chosen instead of the whole document?", answer: "Selecting specific pages to convert is a common feature of this kind of tool." },
        { question: "Is this useful for sharing a single page without the full document?", answer: "Yes, converting just the needed page to an image is a common use case." },
        { question: "What if I need the opposite conversion, from JPG to PDF?", answer: "The JPG to PDF Converter tool is designed for that direction." },
        { question: "Is PDF to JPG available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-jpg"].az,
      valueProposition: "Alət aktiv olduqda PDF səhifələrini paylaşıla bilən şəkillərə çevirin.",
      benefits: ["Hər səhifə üçün bir JPG", "Şəkil tələb edən platformalarda paylaşım üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Çevriləcək PDF-i yükləyin", "Alətin hər səhifəni çevirməsinə icazə verin", "JPG şəkilləri yükləyin"],
      useCases: ["Sənəd səhifəsini sosial mediada paylaşmaq", "PDF səhifəsini təqdimata əlavə etmək", "PDF proqramı açmadan səhifəyə baxmaq"],
      faq: [
        { question: "Hər səhifə öz şəklinə çevrilir?", answer: "Bəli, hər səhifə ayrı JPG faylına çevrilir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Bütün sənəd əvəzinə konkret səhifələr seçilə bilər?", answer: "Çevriləcək konkret səhifələri seçmək bu cür alətin geniş yayılmış xüsusiyyətidir." },
        { question: "Bu, bütün sənəd olmadan tək səhifəni paylaşmaq üçün faydalıdırmı?", answer: "Bəli, yalnız lazım olan səhifəni şəklə çevirmək geniş yayılmış istifadə halıdır." },
        { question: "Əks istiqamətdə, JPG-dən PDF-ə çevirmə lazımdırsa nə etməliyəm?", answer: "JPG-dən PDF-ə aləti həmin istiqamət üçün nəzərdə tutulub." },
        { question: "PDF-dən JPG-yə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-jpg"].tr,
      valueProposition: "Araç yayına girdiğinde PDF sayfalarını paylaşılabilir görsellere dönüştürün.",
      benefits: ["Her sayfa için bir JPG", "Görsel bekleyen platformlarda paylaşım için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Dönüştürülecek PDF'yi yükleyin", "Aracın her sayfayı dönüştürmesine izin verin", "JPG görselleri indirin"],
      useCases: ["Bir belge sayfasını sosyal medyada paylaşma", "Bir PDF sayfasını sunuma ekleme", "PDF görüntüleyici açmadan sayfayı önizleme"],
      faq: [
        { question: "Her sayfa kendi görseline mi dönüşür?", answer: "Evet, her sayfa ayrı bir JPG dosyasına dönüştürülür." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Tüm belge yerine belirli sayfalar seçilebilir mi?", answer: "Dönüştürülecek belirli sayfaları seçmek bu tür bir aracın yaygın bir özelliğidir." },
        { question: "Bu, tüm belge olmadan tek bir sayfayı paylaşmak için faydalı mı?", answer: "Evet, yalnızca gereken sayfayı bir görsele dönüştürmek yaygın bir kullanım şeklidir." },
        { question: "Ters yönde, JPG'den PDF'ye dönüştürmeye ihtiyacım olursa ne yapmalıyım?", answer: "JPG'den PDF'ye aracı o yön için tasarlanmıştır." },
        { question: "PDF'den JPG'ye şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "jpg-to-pdf": {
    en: {
      introduction: TOOL_INTRODUCTIONS["jpg-to-pdf"].en,
      valueProposition: "Turn photos into one shareable PDF once the tool is live.",
      benefits: ["Combines multiple images into one file", "Keeps images in your chosen order", "Free to use"],
      howToSteps: ["Add the JPG images to include", "Arrange them in order", "Combine them into a single PDF"],
      useCases: ["Turning scanned photos into one document", "Submitting multiple photo pages as one file", "Creating a simple photo-based PDF report"],
      faq: [
        { question: "Can multiple images be combined into one PDF?", answer: "Yes, several JPG images can be combined into a single multi-page PDF." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Does the order of the images matter?", answer: "Yes, images are combined in the order they're arranged before creating the PDF." },
        { question: "Is this useful for submitting scanned documents?", answer: "Yes, turning a set of photographed pages into one PDF is a common use case." },
        { question: "What if I need to convert a PDF back into images instead?", answer: "The PDF to JPG Converter tool is designed for that direction." },
        { question: "Is JPG to PDF available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["jpg-to-pdf"].az,
      valueProposition: "Alət aktiv olduqda fotoları tək paylaşıla bilən PDF-ə çevirin.",
      benefits: ["Bir neçə şəkli tək faylda birləşdirir", "Şəkilləri seçdiyiniz sırada saxlayır", "Pulsuz istifadə"],
      howToSteps: ["Daxil ediləcək JPG şəkillərini əlavə edin", "Onları sırayla düzün", "Tək PDF-də birləşdirin"],
      useCases: ["Skan edilmiş fotoları tək sənədə çevirmək", "Bir neçə foto səhifəsini tək fayl kimi təqdim etmək", "Sadə foto əsaslı PDF hesabatı yaratmaq"],
      faq: [
        { question: "Bir neçə şəkil tək PDF-də birləşdirilə bilər?", answer: "Bəli, bir neçə JPG şəkli tək çox səhifəli PDF-də birləşdirilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Şəkillərin sırası əhəmiyyət daşıyır?", answer: "Bəli, şəkillər PDF yaradılmadan əvvəl düzüldükləri sırada birləşdirilir." },
        { question: "Bu, skan edilmiş sənədləri təqdim etmək üçün faydalıdırmı?", answer: "Bəli, fotoşəkil çəkilmiş səhifələr toplusunu tək PDF-ə çevirmək geniş yayılmış istifadə halıdır." },
        { question: "PDF-i əksinə şəkillərə çevirmək lazımdırsa nə etməliyəm?", answer: "PDF-dən JPG-yə aləti həmin istiqamət üçün nəzərdə tutulub." },
        { question: "JPG-dən PDF-ə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["jpg-to-pdf"].tr,
      valueProposition: "Araç yayına girdiğinde fotoğrafları tek bir paylaşılabilir PDF'ye dönüştürün.",
      benefits: ["Birden fazla görseli tek dosyada birleştirir", "Görselleri seçtiğiniz sırada tutar", "Ücretsiz kullanım"],
      howToSteps: ["Eklenecek JPG görsellerini ekleyin", "Sırayla düzenleyin", "Tek bir PDF'de birleştirin"],
      useCases: ["Taranmış fotoğrafları tek belgeye dönüştürme", "Birden fazla fotoğraf sayfasını tek dosya olarak sunma", "Basit fotoğraf tabanlı bir PDF raporu oluşturma"],
      faq: [
        { question: "Birden fazla görsel tek bir PDF'de birleştirilebilir mi?", answer: "Evet, birkaç JPG görseli tek bir çok sayfalı PDF'de birleştirilebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Görsellerin sırası önemli mi?", answer: "Evet, görseller PDF oluşturulmadan önce düzenlendikleri sırayla birleştirilir." },
        { question: "Bu, taranmış belgeleri göndermek için faydalı mı?", answer: "Evet, fotoğraflanmış bir sayfa setini tek bir PDF'ye dönüştürmek yaygın bir kullanım şeklidir." },
        { question: "Bir PDF'yi tekrar görsellere dönüştürmem gerekirse ne yapmalıyım?", answer: "PDF'den JPG'ye aracı o yön için tasarlanmıştır." },
        { question: "JPG'den PDF'ye şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "pdf-to-word": {
    en: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-word"].en,
      valueProposition: "Make PDF text editable again once the tool is live.",
      benefits: ["Text becomes editable", "Saves retyping the document", "Free to use"],
      howToSteps: ["Upload the PDF to convert", "Let the tool extract the text and layout", "Download the Word file"],
      useCases: ["Editing an old contract stored only as a PDF", "Updating a resume that's only available as a PDF", "Reusing PDF content in a new document"],
      faq: [
        { question: "Does conversion always preserve exact formatting?", answer: "Well-structured PDFs usually convert cleanly; complex layouts or scanned pages may need some manual cleanup." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Does this work on scanned PDFs?", answer: "Scanned pages are stored as images, so text recognition would be needed for those to become editable — plain text-based PDFs convert most reliably." },
        { question: "Is this useful for editing an old contract or form?", answer: "Yes, making an existing PDF editable again is one of the most common reasons to use this tool." },
        { question: "What if I need a spreadsheet instead of a document?", answer: "The PDF to Excel Converter tool is designed for extracting table data." },
        { question: "Is PDF to Word available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-word"].az,
      valueProposition: "Alət aktiv olduqda PDF mətnini yenidən redaktə edilə bilən edin.",
      benefits: ["Mətn redaktə edilə bilən olur", "Sənədi yenidən yazmağa ehtiyac qalmır", "Pulsuz istifadə"],
      howToSteps: ["Çevriləcək PDF-i yükləyin", "Alətin mətni və düzəni çıxarmasına icazə verin", "Word faylını yükləyin"],
      useCases: ["Yalnız PDF kimi saxlanılan köhnə müqaviləni redaktə etmək", "Yalnız PDF formatında olan CV-ni yeniləmək", "PDF məzmununu yeni sənəddə istifadə etmək"],
      faq: [
        { question: "Çevirmə həmişə formatı dəqiq saxlayır?", answer: "Yaxşı strukturlaşdırılmış PDF-lər adətən təmiz çevrilir; mürəkkəb düzən və ya skan edilmiş səhifələr üçün əl ilə düzəliş lazım ola bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Bu, skan edilmiş PDF-lərdə işləyir?", answer: "Skan edilmiş səhifələr şəkil kimi saxlanılır, ona görə redaktə edilə bilən olması üçün mətn tanıma lazımdır — sadə mətn əsaslı PDF-lər ən etibarlı çevrilir." },
        { question: "Bu, köhnə müqavilə və ya formanı redaktə etmək üçün faydalıdırmı?", answer: "Bəli, mövcud PDF-i yenidən redaktə edilə bilən etmək bu aləti istifadə etməyin ən geniş yayılmış səbəbidir." },
        { question: "Sənəd əvəzinə cədvəl lazımdırsa nə etməliyəm?", answer: "PDF-dən Excel-ə aləti cədvəl məlumatını çıxarmaq üçün nəzərdə tutulub." },
        { question: "PDF-dən Word-ə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-word"].tr,
      valueProposition: "Araç yayına girdiğinde PDF metnini yeniden düzenlenebilir hale getirin.",
      benefits: ["Metin düzenlenebilir hale gelir", "Belgeyi yeniden yazmaya gerek kalmaz", "Ücretsiz kullanım"],
      howToSteps: ["Dönüştürülecek PDF'yi yükleyin", "Aracın metni ve düzeni çıkarmasına izin verin", "Word dosyasını indirin"],
      useCases: ["Yalnızca PDF olarak saklanan eski bir sözleşmeyi düzenleme", "Yalnızca PDF olarak bulunan bir özgeçmişi güncelleme", "PDF içeriğini yeni bir belgede yeniden kullanma"],
      faq: [
        { question: "Dönüştürme her zaman biçimlendirmeyi tam olarak korur mu?", answer: "İyi yapılandırılmış PDF'ler genellikle temiz dönüşür; karmaşık düzenler veya taranmış sayfalar biraz manuel düzenleme gerektirebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Bu, taranmış PDF'lerde çalışır mı?", answer: "Taranmış sayfalar görsel olarak saklanır, bu yüzden düzenlenebilir hale gelmeleri için metin tanıma gerekir — düz metin tabanlı PDF'ler en güvenilir şekilde dönüşür." },
        { question: "Bu, eski bir sözleşmeyi veya formu düzenlemek için faydalı mı?", answer: "Evet, mevcut bir PDF'yi yeniden düzenlenebilir hale getirmek bu aracı kullanmanın en yaygın nedenlerinden biridir." },
        { question: "Bir belge yerine bir e-tabloya ihtiyacım olursa ne yapmalıyım?", answer: "PDF'den Excel'e aracı tablo verisi çıkarmak için tasarlanmıştır." },
        { question: "PDF'den Word'e şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "pdf-to-excel": {
    en: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-excel"].en,
      valueProposition: "Turn PDF tables into editable spreadsheets once the tool is live.",
      benefits: ["Extracts table data", "Makes numbers usable in a spreadsheet", "Free to use"],
      howToSteps: ["Upload the PDF containing the table", "Let the tool extract the table data", "Download the Excel file"],
      useCases: ["Getting a financial report's table into a spreadsheet", "Reusing a PDF price list for calculations", "Analyzing exported data that only exists as a PDF"],
      faq: [
        { question: "Does this work on every PDF table?", answer: "It works best on clearly structured tables; scanned or unusually formatted tables may need review after conversion." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "What kind of PDF content works best?", answer: "Clearly structured tables with visible rows and columns convert most reliably." },
        { question: "Is this useful for reusing a price list or report?", answer: "Yes, getting existing PDF table data into a spreadsheet for further use is a common use case." },
        { question: "What if the PDF has a full document instead of just a table?", answer: "The PDF to Word Converter tool is designed for converting full document text and layout." },
        { question: "Is PDF to Excel available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-excel"].az,
      valueProposition: "Alət aktiv olduqda PDF cədvəllərini redaktə edilə bilən cədvələ çevirin.",
      benefits: ["Cədvəl məlumatını çıxarır", "Rəqəmləri cədvəldə istifadəyə hazır edir", "Pulsuz istifadə"],
      howToSteps: ["Cədvəl olan PDF-i yükləyin", "Alətin cədvəl məlumatını çıxarmasına icazə verin", "Excel faylını yükləyin"],
      useCases: ["Maliyyə hesabatının cədvəlini cədvələ köçürmək", "PDF qiymət siyahısını hesablamalar üçün yenidən istifadə etmək", "Yalnız PDF kimi olan ixrac məlumatını təhlil etmək"],
      faq: [
        { question: "Bu, hər PDF cədvəli üçün işləyir?", answer: "O, aydın strukturlaşdırılmış cədvəllərdə ən yaxşı işləyir; skan edilmiş və ya qeyri-adi formatlaşdırılmış cədvəllər çevirmədən sonra yoxlama tələb edə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Hansı PDF məzmunu ən yaxşı işləyir?", answer: "Görünən sətir və sütunları olan aydın strukturlaşdırılmış cədvəllər ən etibarlı çevrilir." },
        { question: "Bu, qiymət siyahısı və ya hesabatı yenidən istifadə etmək üçün faydalıdırmı?", answer: "Bəli, mövcud PDF cədvəl məlumatını əlavə istifadə üçün cədvələ köçürmək geniş yayılmış istifadə halıdır." },
        { question: "PDF-də yalnız cədvəl deyil, tam sənəd varsa nə olacaq?", answer: "PDF-dən Word-ə aləti tam sənəd mətni və düzənini çevirmək üçün nəzərdə tutulub." },
        { question: "PDF-dən Excel-ə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-excel"].tr,
      valueProposition: "Araç yayına girdiğinde PDF tablolarını düzenlenebilir tablolara dönüştürün.",
      benefits: ["Tablo verisini çıkarır", "Sayıları tabloda kullanılabilir hale getirir", "Ücretsiz kullanım"],
      howToSteps: ["Tablo içeren PDF'yi yükleyin", "Aracın tablo verisini çıkarmasına izin verin", "Excel dosyasını indirin"],
      useCases: ["Bir mali raporun tablosunu tabloya aktarma", "Bir PDF fiyat listesini hesaplamalar için yeniden kullanma", "Yalnızca PDF olarak bulunan dışa aktarılmış veriyi analiz etme"],
      faq: [
        { question: "Bu, her PDF tablosunda çalışır mı?", answer: "Açıkça yapılandırılmış tablolarda en iyi sonucu verir; taranmış veya alışılmadık biçimlendirilmiş tablolar dönüştürmeden sonra gözden geçirme gerektirebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Hangi tür PDF içeriği en iyi sonucu verir?", answer: "Görünür satır ve sütunlara sahip, açıkça yapılandırılmış tablolar en güvenilir şekilde dönüşür." },
        { question: "Bu, bir fiyat listesini veya raporu yeniden kullanmak için faydalı mı?", answer: "Evet, mevcut PDF tablo verisini daha fazla kullanım için bir e-tabloya aktarmak yaygın bir kullanım şeklidir." },
        { question: "PDF'de sadece bir tablo değil de tam bir belge varsa ne olur?", answer: "PDF'den Word'e aracı tam belge metnini ve düzenini dönüştürmek için tasarlanmıştır." },
        { question: "PDF'den Excel'e şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "pdf-rotate": {
    en: {
      introduction: TOOL_INTRODUCTIONS["pdf-rotate"].en,
      valueProposition: "Fix sideways or upside-down pages once the tool is live.",
      benefits: ["Rotates single pages or the whole document", "Corrects scanning mistakes", "Free to use"],
      howToSteps: ["Upload the PDF to fix", "Choose which pages to rotate and by how much", "Save the corrected PDF"],
      useCases: ["Fixing a sideways-scanned contract page", "Correcting an upside-down page in a report", "Preparing a document for printing correctly"],
      faq: [
        { question: "Can only specific pages be rotated?", answer: "Yes, individual pages or the whole document can be rotated." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Can pages be rotated by 90, 180 or 270 degrees?", answer: "Yes, those are the common rotation angles for fixing page orientation." },
        { question: "Is this useful after scanning a document sideways?", answer: "Yes, correcting sideways or upside-down scanned pages is one of the most common reasons to use this tool." },
        { question: "What if I need to reorder pages instead of rotating them?", answer: "Reordering during merging is handled by the PDF Merge tool." },
        { question: "Is PDF Rotate available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["pdf-rotate"].az,
      valueProposition: "Alət aktiv olduqda yan və ya baş-ayaq səhifələri düzəldin.",
      benefits: ["Tək səhifəni və ya bütün sənədi döndürür", "Skan xətalarını düzəldir", "Pulsuz istifadə"],
      howToSteps: ["Düzəldiləcək PDF-i yükləyin", "Hansı səhifələrin nə qədər döndürüləcəyini seçin", "Düzəldilmiş PDF-i saxlayın"],
      useCases: ["Yan skan edilmiş müqavilə səhifəsini düzəltmək", "Hesabatda baş-ayaq səhifəni düzəltmək", "Sənədi düzgün çap üçün hazırlamaq"],
      faq: [
        { question: "Yalnız konkret səhifələr döndürülə bilər?", answer: "Bəli, ayrı-ayrı səhifələr və ya bütün sənəd döndürülə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Səhifələr 90, 180 və ya 270 dərəcə döndürülə bilər?", answer: "Bəli, bunlar səhifə istiqamətini düzəltmək üçün geniş yayılmış döndürmə bucaqlarıdır." },
        { question: "Bu, sənədi yan skan etdikdən sonra faydalıdırmı?", answer: "Bəli, yan və ya baş-ayaq skan edilmiş səhifələri düzəltmək bu aləti istifadə etməyin ən geniş yayılmış səbəbidir." },
        { question: "Səhifələri döndürmək əvəzinə sıralarını dəyişmək lazımdırsa nə etməliyəm?", answer: "Birləşdirmə zamanı sıralamanı dəyişmək PDF Birləşdirmə aləti ilə idarə olunur." },
        { question: "PDF Döndürmə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["pdf-rotate"].tr,
      valueProposition: "Araç yayına girdiğinde yan veya baş aşağı sayfaları düzeltin.",
      benefits: ["Tek sayfayı veya tüm belgeyi döndürür", "Tarama hatalarını düzeltir", "Ücretsiz kullanım"],
      howToSteps: ["Düzeltilecek PDF'yi yükleyin", "Hangi sayfaların ne kadar döndürüleceğini seçin", "Düzeltilmiş PDF'yi kaydedin"],
      useCases: ["Yan taranmış bir sözleşme sayfasını düzeltme", "Bir rapordaki baş aşağı sayfayı düzeltme", "Bir belgeyi doğru yazdırmak için hazırlama"],
      faq: [
        { question: "Yalnızca belirli sayfalar döndürülebilir mi?", answer: "Evet, tek tek sayfalar veya tüm belge döndürülebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Sayfalar 90, 180 veya 270 derece döndürülebilir mi?", answer: "Evet, bunlar sayfa yönünü düzeltmek için yaygın döndürme açılarıdır." },
        { question: "Bu, bir belgeyi yan taradıktan sonra faydalı mı?", answer: "Evet, yan veya baş aşağı taranmış sayfaları düzeltmek bu aracı kullanmanın en yaygın nedenlerinden biridir." },
        { question: "Sayfaları döndürmek yerine sırasını değiştirmem gerekirse ne yapmalıyım?", answer: "Birleştirme sırasında sırayı değiştirme, PDF Birleştirme aracı tarafından yönetilir." },
        { question: "PDF Döndürme şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "image-resize": {
    en: {
      introduction: TOOL_INTRODUCTIONS["image-resize"].en,
      valueProposition: "Get a photo to exactly the size you need once the tool is live.",
      benefits: ["Sets an exact pixel width and height", "Works for web, social and print sizes", "Free to use"],
      howToSteps: ["Upload the image to resize", "Enter the target dimensions", "Download the resized image"],
      useCases: ["Fitting a photo to a social media post's required size", "Preparing an image for a website", "Meeting a print size requirement"],
      faq: [
        { question: "Does resizing keep the image's aspect ratio?", answer: "An aspect ratio can typically be locked or adjusted freely, depending on what the result needs." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Will resizing reduce image quality?", answer: "Making an image smaller usually keeps it sharp; enlarging an image significantly can reduce clarity." },
        { question: "Is this useful for social media posts?", answer: "Yes, matching a specific platform's required dimensions is one of the most common reasons to resize an image." },
        { question: "What if I need to cut out part of the image instead of resizing it?", answer: "The Image Cropper tool is designed for selecting and keeping just part of an image." },
        { question: "Is Image Resize available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["image-resize"].az,
      valueProposition: "Alət aktiv olduqda fotonu tam lazım olan ölçüyə gətirin.",
      benefits: ["Dəqiq piksel eni və hündürlüyü təyin edir", "Veb, sosial media və çap ölçüləri üçün işləyir", "Pulsuz istifadə"],
      howToSteps: ["Ölçüləndiriləcək şəkli yükləyin", "Hədəf ölçüləri daxil edin", "Ölçüləndirilmiş şəkli yükləyin"],
      useCases: ["Fotonu sosial media postunun tələb etdiyi ölçüyə salmaq", "Şəkli veb sayt üçün hazırlamaq", "Çap ölçüsü tələbini qarşılamaq"],
      faq: [
        { question: "Ölçüləndirmə şəklin nisbətini saxlayır?", answer: "Nisbət nəticənin ehtiyacına görə adətən kilidlənə və ya sərbəst dəyişdirilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Ölçüləndirmə şəkil keyfiyyətini azaldır?", answer: "Şəkli kiçiltmək adətən onu iti saxlayır; ciddi böyütmək isə aydınlığı azalda bilər." },
        { question: "Bu, sosial media paylaşımları üçün faydalıdırmı?", answer: "Bəli, konkret platformanın tələb etdiyi ölçülərə uyğunlaşdırmaq şəkli ölçüləndirməyin ən geniş yayılmış səbəbidir." },
        { question: "Şəkli ölçüləndirmək əvəzinə bir hissəsini kəsmək lazımdırsa nə etməliyəm?", answer: "Şəkil Kəsmə aləti şəklin yalnız bir hissəsini seçib saxlamaq üçün nəzərdə tutulub." },
        { question: "Şəkil Ölçüləndirmə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["image-resize"].tr,
      valueProposition: "Araç yayına girdiğinde bir fotoğrafı tam ihtiyacınız olan boyuta getirin.",
      benefits: ["Tam piksel genişliği ve yüksekliği belirler", "Web, sosyal medya ve baskı boyutları için çalışır", "Ücretsiz kullanım"],
      howToSteps: ["Boyutlandırılacak görseli yükleyin", "Hedef boyutları girin", "Boyutlandırılmış görseli indirin"],
      useCases: ["Bir fotoğrafı sosyal medya gönderisinin gerektirdiği boyuta getirme", "Bir görseli web sitesi için hazırlama", "Bir baskı boyutu gereksinimini karşılama"],
      faq: [
        { question: "Boyutlandırma görselin en-boy oranını korur mu?", answer: "En-boy oranı, sonucun ihtiyacına göre genellikle kilitlenebilir veya serbestçe değiştirilebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Boyutlandırma görsel kalitesini düşürür mü?", answer: "Bir görseli küçültmek genellikle netliğini korur; önemli ölçüde büyütmek ise netliği azaltabilir." },
        { question: "Bu, sosyal medya gönderileri için faydalı mı?", answer: "Evet, belirli bir platformun gerektirdiği boyutlara uymak, bir görseli boyutlandırmanın en yaygın nedenlerinden biridir." },
        { question: "Görseli boyutlandırmak yerine bir kısmını kesmem gerekirse ne yapmalıyım?", answer: "Görsel Kırpma aracı, bir görselin yalnızca bir kısmını seçip korumak için tasarlanmıştır." },
        { question: "Görsel Boyutlandırma şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "image-compress": {
    en: {
      introduction: TOOL_INTRODUCTIONS["image-compress"].en,
      valueProposition: "Make images load faster and take up less space once the tool is live.",
      benefits: ["Smaller file size for the web", "Faster page loading when used on a site", "Free to use"],
      howToSteps: ["Upload the image to compress", "Let the tool reduce its file size", "Download the compressed image"],
      useCases: ["Speeding up a website by compressing its images", "Fitting a photo under an upload size limit", "Reducing storage used by a photo library"],
      faq: [
        { question: "Does compressing an image reduce its visible quality?", answer: "Compression aims to keep images clear enough for typical use while reducing file size." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "How much smaller will the file become?", answer: "The reduction depends on the original image — high-resolution photos typically shrink the most." },
        { question: "Will compressing an image change its dimensions?", answer: "Compression targets file size, not the image's width and height." },
        { question: "What if I also need to change the image's dimensions?", answer: "The Image Resizer tool is designed for changing width and height." },
        { question: "Is Image Compress available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["image-compress"].az,
      valueProposition: "Alət aktiv olduqda şəkilləri daha sürətli yüklənən və az yer tutan edin.",
      benefits: ["Veb üçün kiçik fayl ölçüsü", "Saytda istifadə edildikdə daha sürətli yüklənmə", "Pulsuz istifadə"],
      howToSteps: ["Sıxılacaq şəkli yükləyin", "Alətin fayl ölçüsünü azaltmasına icazə verin", "Sıxılmış şəkli yükləyin"],
      useCases: ["Veb saytı şəkilləri sıxaraq sürətləndirmək", "Fotonu yükləmə ölçüsü limitinə salmaq", "Foto kolleksiyasının tutduğu yeri azaltmaq"],
      faq: [
        { question: "Şəkli sıxmaq görünən keyfiyyəti azaldır?", answer: "Sıxma fayl ölçüsünü azaldarkən şəkilləri adi istifadə üçün kifayət qədər aydın saxlamağı hədəfləyir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Fayl nə qədər kiçiləcək?", answer: "Azalma orijinal şəkildən asılıdır — yüksək keyfiyyətli fotolar adətən ən çox kiçilir." },
        { question: "Şəkli sıxmaq onun ölçülərini dəyişir?", answer: "Sıxma fayl ölçüsünü hədəfləyir, şəklin eni və hündürlüyünü yox." },
        { question: "Şəklin ölçülərini də dəyişmək lazımdırsa nə etməliyəm?", answer: "Şəkil Ölçüləndirmə aləti eni və hündürlüyü dəyişmək üçün nəzərdə tutulub." },
        { question: "Şəkil Sıxma hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["image-compress"].tr,
      valueProposition: "Araç yayına girdiğinde görsellerin daha hızlı yüklenmesini ve daha az yer kaplamasını sağlayın.",
      benefits: ["Web için daha küçük dosya boyutu", "Bir sitede kullanıldığında daha hızlı sayfa yükleme", "Ücretsiz kullanım"],
      howToSteps: ["Sıkıştırılacak görseli yükleyin", "Aracın dosya boyutunu küçültmesine izin verin", "Sıkıştırılmış görseli indirin"],
      useCases: ["Görselleri sıkıştırarak bir web sitesini hızlandırma", "Bir fotoğrafı yükleme boyutu sınırına sığdırma", "Bir fotoğraf kitaplığının kapladığı alanı azaltma"],
      faq: [
        { question: "Bir görseli sıkıştırmak görünür kalitesini düşürür mü?", answer: "Sıkıştırma, dosya boyutunu küçültürken görselleri normal kullanım için yeterince net tutmayı hedefler." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Dosya ne kadar küçülecek?", answer: "Küçülme miktarı orijinal görsele bağlıdır — yüksek çözünürlüklü fotoğraflar genellikle en fazla küçülür." },
        { question: "Bir görseli sıkıştırmak boyutlarını değiştirir mi?", answer: "Sıkıştırma dosya boyutunu hedefler, görselin genişliğini ve yüksekliğini değil." },
        { question: "Görselin boyutlarını da değiştirmem gerekirse ne yapmalıyım?", answer: "Görsel Boyutlandırma aracı genişlik ve yüksekliği değiştirmek için tasarlanmıştır." },
        { question: "Görsel Sıkıştırma şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "image-converter": {
    en: {
      introduction: TOOL_INTRODUCTIONS["image-converter"].en,
      valueProposition: "Get any image into the format you actually need once the tool is live.",
      benefits: ["Supports several common formats", "Handles single or batch conversion", "Free to use"],
      howToSteps: ["Upload the image to convert", "Choose the target format", "Download the converted image"],
      useCases: ["Converting a photo to the format a website requires", "Preparing images for a specific app or platform", "Standardizing a batch of images to one format"],
      faq: [
        { question: "Which formats can this tool convert between?", answer: "Common formats like JPG, PNG and WebP, among others." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Can multiple images be converted at once?", answer: "Batch conversion of several images to the same format is a common feature of this kind of tool." },
        { question: "Is this useful when a platform only accepts certain formats?", answer: "Yes, matching a required format is one of the most common reasons to convert an image." },
        { question: "What if I only need to convert to or from WebP specifically?", answer: "The WebP Converter tool is focused specifically on that format." },
        { question: "Is Image Converter available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["image-converter"].az,
      valueProposition: "Alət aktiv olduqda istənilən şəkli əsl lazım olan formata gətirin.",
      benefits: ["Bir neçə geniş yayılmış formatı dəstəkləyir", "Tək və ya toplu çevirməni idarə edir", "Pulsuz istifadə"],
      howToSteps: ["Çevriləcək şəkli yükləyin", "Hədəf formatı seçin", "Çevrilmiş şəkli yükləyin"],
      useCases: ["Fotonu veb saytın tələb etdiyi formata çevirmək", "Şəkilləri konkret tətbiq və ya platforma üçün hazırlamaq", "Toplu şəkilləri tək formata standartlaşdırmaq"],
      faq: [
        { question: "Bu alət hansı formatlar arasında çevirə bilər?", answer: "JPG, PNG və WebP kimi geniş yayılmış formatlar və digərləri." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Bir neçə şəkil eyni anda çevrilə bilər?", answer: "Bir neçə şəkli eyni formata toplu çevirmək bu cür alətin geniş yayılmış xüsusiyyətidir." },
        { question: "Bu, platforma yalnız müəyyən formatları qəbul etdikdə faydalıdırmı?", answer: "Bəli, tələb olunan formata uyğunlaşdırmaq şəkli çevirməyin ən geniş yayılmış səbəbidir." },
        { question: "Yalnız WebP-ə və ya WebP-dən çevirmək lazımdırsa nə etməliyəm?", answer: "WebP Çeviricisi aləti xüsusilə həmin format üçün nəzərdə tutulub." },
        { question: "Şəkil Çeviricisi hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["image-converter"].tr,
      valueProposition: "Araç yayına girdiğinde herhangi bir görseli gerçekten ihtiyacınız olan formata getirin.",
      benefits: ["Birkaç yaygın formatı destekler", "Tekli veya toplu dönüştürmeyi yönetir", "Ücretsiz kullanım"],
      howToSteps: ["Dönüştürülecek görseli yükleyin", "Hedef formatı seçin", "Dönüştürülmüş görseli indirin"],
      useCases: ["Bir fotoğrafı bir web sitesinin gerektirdiği formata dönüştürme", "Görselleri belirli bir uygulama veya platform için hazırlama", "Toplu görselleri tek bir formata standartlaştırma"],
      faq: [
        { question: "Bu araç hangi formatlar arasında dönüştürme yapabilir?", answer: "JPG, PNG ve WebP gibi yaygın formatlar ve diğerleri." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Birden fazla görsel aynı anda dönüştürülebilir mi?", answer: "Birden fazla görseli aynı formata toplu dönüştürmek bu tür bir aracın yaygın bir özelliğidir." },
        { question: "Bu, bir platform yalnızca belirli formatları kabul ettiğinde faydalı mı?", answer: "Evet, gerekli bir formata uymak, bir görseli dönüştürmenin en yaygın nedenlerinden biridir." },
        { question: "Yalnızca WebP'ye veya WebP'den dönüştürmem gerekirse ne yapmalıyım?", answer: "WebP Dönüştürücü aracı özellikle o format için tasarlanmıştır." },
        { question: "Görsel Dönüştürücü şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "jpg-to-png": {
    en: {
      introduction: TOOL_INTRODUCTIONS["jpg-to-png"].en,
      valueProposition: "Get transparency support for a photo once the tool is live.",
      benefits: ["Enables a transparent background", "Keeps image quality high", "Free to use"],
      howToSteps: ["Upload the JPG image", "Convert it to PNG", "Download the PNG file"],
      useCases: ["Preparing a logo that needs a transparent background", "Getting a cleaner image for design software", "Converting a photo for a platform that prefers PNG"],
      faq: [
        { question: "Does converting to PNG add transparency automatically?", answer: "Converting the format alone doesn't remove a background — a separate background-removal step does that." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Is PNG better than JPG?", answer: "Neither is universally better — PNG suits graphics and transparency, while JPG suits photos where smaller size matters more." },
        { question: "Is this useful for preparing a logo?", answer: "Yes, PNG is a common format for logos and graphics, especially when transparency will be added later." },
        { question: "What if I need to remove the background as well?", answer: "The Background Remover tool is designed for isolating a subject from its background." },
        { question: "Is JPG to PNG available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["jpg-to-png"].az,
      valueProposition: "Alət aktiv olduqda foto üçün şəffaflıq dəstəyi əldə edin.",
      benefits: ["Şəffaf fon imkanı verir", "Şəkil keyfiyyətini yüksək saxlayır", "Pulsuz istifadə"],
      howToSteps: ["JPG şəklini yükləyin", "PNG-yə çevirin", "PNG faylını yükləyin"],
      useCases: ["Şəffaf fon tələb edən loqonu hazırlamaq", "Dizayn proqramı üçün daha təmiz şəkil əldə etmək", "PNG-ni üstün tutan platforma üçün foto çevirmək"],
      faq: [
        { question: "PNG-yə çevirmək avtomatik şəffaflıq əlavə edir?", answer: "Yalnız format çevirmə fonu silmir — bunun üçün ayrıca fon silmə addımı lazımdır." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "PNG JPG-dən yaxşıdırmı?", answer: "Heç biri hər zaman daha yaxşı deyil — PNG qrafika və şəffaflıq üçün, JPG isə kiçik ölçünün daha vacib olduğu fotolar üçün uyğundur." },
        { question: "Bu, loqo hazırlamaq üçün faydalıdırmı?", answer: "Bəli, PNG loqo və qrafikalar üçün, xüsusilə sonradan şəffaflıq əlavə olunacaqsa, geniş yayılmış formatdır." },
        { question: "Fonu da silmək lazımdırsa nə etməliyəm?", answer: "Fon Silmə aləti obyekti fonundan ayırmaq üçün nəzərdə tutulub." },
        { question: "JPG-dən PNG-yə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["jpg-to-png"].tr,
      valueProposition: "Araç yayına girdiğinde bir fotoğraf için şeffaflık desteği elde edin.",
      benefits: ["Şeffaf arka plan olanağı sağlar", "Görsel kalitesini yüksek tutar", "Ücretsiz kullanım"],
      howToSteps: ["JPG görseli yükleyin", "PNG'ye dönüştürün", "PNG dosyasını indirin"],
      useCases: ["Şeffaf arka plan gerektiren bir logo hazırlama", "Tasarım yazılımı için daha temiz bir görsel elde etme", "PNG'yi tercih eden bir platform için fotoğraf dönüştürme"],
      faq: [
        { question: "PNG'ye dönüştürmek otomatik olarak şeffaflık ekler mi?", answer: "Yalnızca formatı dönüştürmek arka planı kaldırmaz — bunun için ayrı bir arka plan kaldırma adımı gerekir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "PNG, JPG'den daha mı iyidir?", answer: "Hiçbiri her zaman daha iyi değildir — PNG grafikler ve şeffaflık için, JPG ise daha küçük boyutun önemli olduğu fotoğraflar için uygundur." },
        { question: "Bu, bir logo hazırlamak için faydalı mı?", answer: "Evet, PNG; özellikle daha sonra şeffaflık eklenecekse, logolar ve grafikler için yaygın bir formattır." },
        { question: "Arka planı da kaldırmam gerekirse ne yapmalıyım?", answer: "Arka Plan Kaldırma aracı, bir konuyu arka planından ayırmak için tasarlanmıştır." },
        { question: "JPG'den PNG'ye şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "png-to-jpg": {
    en: {
      introduction: TOOL_INTRODUCTIONS["png-to-jpg"].en,
      valueProposition: "Get a smaller, more widely compatible image file once the tool is live.",
      benefits: ["Usually reduces file size", "Widely supported format", "Free to use"],
      howToSteps: ["Upload the PNG image", "Convert it to JPG", "Download the JPG file"],
      useCases: ["Reducing a screenshot's file size before sharing", "Preparing an image for a platform that expects JPG", "Simplifying a PNG that doesn't need transparency"],
      faq: [
        { question: "Will converting to JPG lose the transparent background?", answer: "Yes, JPG doesn't support transparency, so a transparent area becomes a solid color." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Is any image quality lost in the process?", answer: "JPG uses lossy compression, so some quality reduction is possible depending on the settings used." },
        { question: "Is this useful for reducing a screenshot's size?", answer: "Yes, converting a PNG screenshot to JPG is a common way to shrink it before sharing." },
        { question: "What if the image needs to keep its transparent background?", answer: "Keeping transparency requires staying in a format like PNG rather than converting to JPG." },
        { question: "Is PNG to JPG available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["png-to-jpg"].az,
      valueProposition: "Alət aktiv olduqda daha kiçik, geniş uyğunluğu olan şəkil faylı əldə edin.",
      benefits: ["Adətən fayl ölçüsünü azaldır", "Geniş dəstəklənən format", "Pulsuz istifadə"],
      howToSteps: ["PNG şəklini yükləyin", "JPG-yə çevirin", "JPG faylını yükləyin"],
      useCases: ["Paylaşmadan əvvəl skrinşotun fayl ölçüsünü azaltmaq", "JPG tələb edən platforma üçün şəkil hazırlamaq", "Şəffaflığa ehtiyacı olmayan PNG-ni sadələşdirmək"],
      faq: [
        { question: "JPG-yə çevirmək şəffaf fonu itirəcək?", answer: "Bəli, JPG şəffaflığı dəstəkləmir, ona görə şəffaf sahə düz rəngə çevrilir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Prosesdə hər hansı şəkil keyfiyyəti itirilirmi?", answer: "JPG itki ilə sıxma istifadə edir, ona görə istifadə olunan tənzimləmələrdən asılı olaraq bir qədər keyfiyyət azalması mümkündür." },
        { question: "Bu, skrinşotun ölçüsünü azaltmaq üçün faydalıdırmı?", answer: "Bəli, PNG skrinşotunu JPG-yə çevirmək onu paylaşmadan əvvəl kiçiltməyin geniş yayılmış yoludur." },
        { question: "Şəkil şəffaf fonunu saxlamalıdırsa nə olacaq?", answer: "Şəffaflığı saxlamaq üçün JPG-yə çevirmək əvəzinə PNG kimi formatda qalmaq lazımdır." },
        { question: "PNG-dən JPG-yə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["png-to-jpg"].tr,
      valueProposition: "Araç yayına girdiğinde daha küçük, daha geniş uyumlu bir görsel dosyası elde edin.",
      benefits: ["Genellikle dosya boyutunu küçültür", "Yaygın olarak desteklenen format", "Ücretsiz kullanım"],
      howToSteps: ["PNG görseli yükleyin", "JPG'ye dönüştürün", "JPG dosyasını indirin"],
      useCases: ["Paylaşmadan önce bir ekran görüntüsünün dosya boyutunu küçültme", "JPG bekleyen bir platform için görsel hazırlama", "Şeffaflığa ihtiyaç duymayan bir PNG'yi basitleştirme"],
      faq: [
        { question: "JPG'ye dönüştürmek şeffaf arka planı kaybettirir mi?", answer: "Evet, JPG şeffaflığı desteklemez, bu yüzden şeffaf alan düz bir renge dönüşür." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Bu süreçte görsel kalitesinden bir kayıp olur mu?", answer: "JPG kayıplı sıkıştırma kullanır, bu yüzden kullanılan ayarlara bağlı olarak bir miktar kalite kaybı mümkündür." },
        { question: "Bu, bir ekran görüntüsünün boyutunu küçültmek için faydalı mı?", answer: "Evet, bir PNG ekran görüntüsünü JPG'ye dönüştürmek, paylaşmadan önce küçültmenin yaygın bir yoludur." },
        { question: "Görselin şeffaf arka planını koruması gerekiyorsa ne olur?", answer: "Şeffaflığı korumak, JPG'ye dönüştürmek yerine PNG gibi bir formatta kalmayı gerektirir." },
        { question: "PNG'den JPG'ye şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "webp-converter": {
    en: {
      introduction: TOOL_INTRODUCTIONS["webp-converter"].en,
      valueProposition: "Move between WebP and more universally supported formats once the tool is live.",
      benefits: ["Converts both to and from WebP", "Good for smaller website images", "Free to use"],
      howToSteps: ["Upload the image to convert", "Choose WebP or the target format", "Download the converted image"],
      useCases: ["Converting website images to WebP for smaller size", "Converting an old WebP image to JPG for compatibility", "Preparing images for platforms with format restrictions"],
      faq: [
        { question: "Why would someone use WebP instead of JPG or PNG?", answer: "WebP often produces smaller files than JPG or PNG at similar quality, which can help website speed." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Is WebP supported by all browsers and apps?", answer: "Most modern browsers support WebP, though some older software may not, which is why converting to JPG or PNG can help." },
        { question: "Is this useful for improving website loading speed?", answer: "Yes, WebP's smaller file sizes are a common reason websites use it for images." },
        { question: "What if I need a different format entirely, not WebP?", answer: "The Image Format Converter tool supports conversion between several common formats." },
        { question: "Is WebP Converter available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["webp-converter"].az,
      valueProposition: "Alət aktiv olduqda WebP və daha universal dəstəklənən formatlar arasında keçin.",
      benefits: ["Həm WebP-ə, həm də WebP-dən çevirir", "Kiçik veb sayt şəkilləri üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Çevriləcək şəkli yükləyin", "WebP və ya hədəf formatı seçin", "Çevrilmiş şəkli yükləyin"],
      useCases: ["Veb sayt şəkillərini kiçik ölçü üçün WebP-ə çevirmək", "Köhnə WebP şəklini uyğunluq üçün JPG-yə çevirmək", "Format məhdudiyyəti olan platformalar üçün şəkilləri hazırlamaq"],
      faq: [
        { question: "Nə üçün kimsə JPG və ya PNG əvəzinə WebP istifadə edər?", answer: "WebP oxşar keyfiyyətdə tez-tez JPG və ya PNG-dən kiçik fayl verir, bu da veb sayt sürətinə kömək edə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "WebP bütün brauzer və tətbiqlər tərəfindən dəstəklənir?", answer: "Əksər müasir brauzerlər WebP-i dəstəkləyir, lakin bəzi köhnə proqramlar dəstəkləməyə bilər, ona görə JPG və ya PNG-yə çevirmək kömək edə bilər." },
        { question: "Bu, veb sayt yüklənmə sürətini artırmaq üçün faydalıdırmı?", answer: "Bəli, WebP-in kiçik fayl ölçüsü veb saytların onu şəkillər üçün istifadə etməsinin geniş yayılmış səbəbidir." },
        { question: "WebP deyil, tamam başqa format lazımdırsa nə etməliyəm?", answer: "Şəkil Çeviricisi aləti bir neçə geniş yayılmış format arasında çevirməni dəstəkləyir." },
        { question: "WebP Çeviricisi hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["webp-converter"].tr,
      valueProposition: "Araç yayına girdiğinde WebP ile daha evrensel desteklenen formatlar arasında geçiş yapın.",
      benefits: ["Hem WebP'ye hem de WebP'den dönüştürür", "Daha küçük web sitesi görselleri için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Dönüştürülecek görseli yükleyin", "WebP veya hedef formatı seçin", "Dönüştürülmüş görseli indirin"],
      useCases: ["Web sitesi görsellerini daha küçük boyut için WebP'ye dönüştürme", "Eski bir WebP görselini uyumluluk için JPG'ye dönüştürme", "Format kısıtlaması olan platformlar için görsel hazırlama"],
      faq: [
        { question: "Neden biri JPG veya PNG yerine WebP kullanır?", answer: "WebP, benzer kalitede genellikle JPG veya PNG'den daha küçük dosyalar üretir, bu da web sitesi hızına yardımcı olabilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "WebP tüm tarayıcılar ve uygulamalar tarafından destekleniyor mu?", answer: "Çoğu modern tarayıcı WebP'yi destekler, ancak bazı eski yazılımlar desteklemeyebilir; bu yüzden JPG veya PNG'ye dönüştürmek yardımcı olabilir." },
        { question: "Bu, web sitesi yükleme hızını artırmak için faydalı mı?", answer: "Evet, WebP'nin daha küçük dosya boyutları, web sitelerinin görseller için onu kullanmasının yaygın bir nedenidir." },
        { question: "WebP değil de tamamen farklı bir formata ihtiyacım olursa ne yapmalıyım?", answer: "Görsel Dönüştürücü aracı birkaç yaygın format arasında dönüştürmeyi destekler." },
        { question: "WebP Dönüştürücü şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "image-crop": {
    en: {
      introduction: TOOL_INTRODUCTIONS["image-crop"].en,
      valueProposition: "Focus a photo on exactly the part that matters once the tool is live.",
      benefits: ["Keeps only the selected area", "Good for framing and focus", "Free to use"],
      howToSteps: ["Upload the image to crop", "Select the area to keep", "Download the cropped image"],
      useCases: ["Cropping a photo to a square for a profile picture", "Removing a distracting background element", "Focusing a product photo on the product itself"],
      faq: [
        { question: "Can the crop area be any shape?", answer: "Cropping typically uses a rectangular or square selection area." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Does cropping reduce image quality?", answer: "Cropping keeps the quality of the retained area unchanged; only the excluded parts are removed." },
        { question: "Is this useful for making a square profile picture?", answer: "Yes, cropping to a square is one of the most common reasons to use this tool." },
        { question: "What if I need to resize the image instead of cutting part of it?", answer: "The Image Resizer tool is designed for changing an image's overall dimensions." },
        { question: "Is Image Crop available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["image-crop"].az,
      valueProposition: "Alət aktiv olduqda fotonu tam əhəmiyyətli hissəyə fokuslayın.",
      benefits: ["Yalnız seçilmiş sahəni saxlayır", "Çərçivələmə və fokus üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Kəsiləcək şəkli yükləyin", "Saxlanılacaq sahəni seçin", "Kəsilmiş şəkli yükləyin"],
      useCases: ["Profil şəkli üçün fotonu kvadrat kəsmək", "Diqqəti yayındıran fon elementini silmək", "Məhsul fotosunu birbaşa məhsula fokuslamaq"],
      faq: [
        { question: "Kəsmə sahəsi istənilən forma ola bilər?", answer: "Kəsmə adətən düzbucaqlı və ya kvadrat seçim sahəsindən istifadə edir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Kəsmə şəkil keyfiyyətini azaldır?", answer: "Kəsmə saxlanılan sahənin keyfiyyətini dəyişmir; yalnız kənarda qalan hissələr silinir." },
        { question: "Bu, kvadrat profil şəkli hazırlamaq üçün faydalıdırmı?", answer: "Bəli, kvadrat şəklə kəsmək bu aləti istifadə etməyin ən geniş yayılmış səbəbidir." },
        { question: "Şəklin bir hissəsini kəsmək əvəzinə ölçüləndirmək lazımdırsa nə etməliyəm?", answer: "Şəkil Ölçüləndirmə aləti şəklin ümumi ölçülərini dəyişmək üçün nəzərdə tutulub." },
        { question: "Şəkil Kəsmə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["image-crop"].tr,
      valueProposition: "Araç yayına girdiğinde bir fotoğrafı tam önemli olan kısma odaklayın.",
      benefits: ["Yalnızca seçilen alanı korur", "Çerçeveleme ve odaklama için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Kırpılacak görseli yükleyin", "Korunacak alanı seçin", "Kırpılmış görseli indirin"],
      useCases: ["Bir profil fotoğrafı için görseli kare kırpma", "Dikkat dağıtan bir arka plan öğesini kaldırma", "Bir ürün fotoğrafını doğrudan ürüne odaklama"],
      faq: [
        { question: "Kırpma alanı herhangi bir şekilde olabilir mi?", answer: "Kırpma genellikle dikdörtgen veya kare bir seçim alanı kullanır." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Kırpma görsel kalitesini düşürür mü?", answer: "Kırpma, korunan alanın kalitesini değiştirmez; yalnızca dışarıda kalan kısımlar kaldırılır." },
        { question: "Bu, kare bir profil fotoğrafı yapmak için faydalı mı?", answer: "Evet, kareye kırpmak bu aracı kullanmanın en yaygın nedenlerinden biridir." },
        { question: "Görselin bir kısmını kesmek yerine boyutlandırmam gerekirse ne yapmalıyım?", answer: "Görsel Boyutlandırma aracı, bir görselin genel boyutlarını değiştirmek için tasarlanmıştır." },
        { question: "Görsel Kırpma şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "image-rotate": {
    en: {
      introduction: TOOL_INTRODUCTIONS["image-rotate"].en,
      valueProposition: "Get a photo facing the right way once the tool is live.",
      benefits: ["Fixes sideways or upside-down photos", "Simple orientation correction", "Free to use"],
      howToSteps: ["Upload the image to rotate", "Choose the rotation direction and angle", "Download the corrected image"],
      useCases: ["Fixing a sideways phone photo", "Correcting an upside-down scanned picture", "Adjusting an image before printing"],
      faq: [
        { question: "Can an image be rotated by any angle?", answer: "Common rotations are 90, 180 and 270 degrees, covering most orientation problems." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Can an image be flipped instead of rotated?", answer: "Rotation changes orientation by degrees; flipping (mirroring) is a related but different adjustment." },
        { question: "Is this useful for photos taken sideways on a phone?", answer: "Yes, correcting a sideways phone photo is one of the most common reasons to use this tool." },
        { question: "What if I need to crop the image instead of rotating it?", answer: "The Image Cropper tool is designed for selecting and keeping part of an image." },
        { question: "Is Image Rotate available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["image-rotate"].az,
      valueProposition: "Alət aktiv olduqda fotonu düzgün istiqamətə gətirin.",
      benefits: ["Yan və ya baş-ayaq fotoları düzəldir", "Sadə istiqamət düzəlişi", "Pulsuz istifadə"],
      howToSteps: ["Döndəriləcək şəkli yükləyin", "Döndürmə istiqamətini və bucağını seçin", "Düzəldilmiş şəkli yükləyin"],
      useCases: ["Yan çəkilmiş telefon fotosunu düzəltmək", "Baş-ayaq skan edilmiş şəkli düzəltmək", "Çapdan əvvəl şəkli tənzimləmək"],
      faq: [
        { question: "Şəkil istənilən bucaqla döndürülə bilər?", answer: "Geniş yayılmış döndürmələr 90, 180 və 270 dərəcədir və əksər istiqamət problemlərini əhatə edir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Şəkil döndürmək əvəzinə güzgülənə bilər?", answer: "Döndürmə istiqaməti dərəcə ilə dəyişir; güzgüləmə (əks etdirmə) bununla əlaqəli, lakin fərqli düzəlişdir." },
        { question: "Bu, telefonda yan çəkilmiş fotolar üçün faydalıdırmı?", answer: "Bəli, yan çəkilmiş telefon fotosunu düzəltmək bu aləti istifadə etməyin ən geniş yayılmış səbəbidir." },
        { question: "Şəkli döndürmək əvəzinə kəsmək lazımdırsa nə etməliyəm?", answer: "Şəkil Kəsmə aləti şəklin bir hissəsini seçib saxlamaq üçün nəzərdə tutulub." },
        { question: "Şəkil Döndürmə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["image-rotate"].tr,
      valueProposition: "Araç yayına girdiğinde bir fotoğrafı doğru yöne getirin.",
      benefits: ["Yan veya baş aşağı fotoğrafları düzeltir", "Basit yön düzeltmesi", "Ücretsiz kullanım"],
      howToSteps: ["Döndürülecek görseli yükleyin", "Döndürme yönünü ve açısını seçin", "Düzeltilmiş görseli indirin"],
      useCases: ["Yan çekilmiş bir telefon fotoğrafını düzeltme", "Baş aşağı taranmış bir görseli düzeltme", "Yazdırmadan önce bir görseli ayarlama"],
      faq: [
        { question: "Bir görsel herhangi bir açıyla döndürülebilir mi?", answer: "Yaygın döndürmeler 90, 180 ve 270 derecedir ve çoğu yön sorununu kapsar." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Bir görsel döndürülmek yerine çevrilebilir mi?", answer: "Döndürme yönü derece ile değiştirir; çevirme (ayna görüntüsü) ilişkili ama farklı bir ayarlamadır." },
        { question: "Bu, telefonda yan çekilmiş fotoğraflar için faydalı mı?", answer: "Evet, yan çekilmiş bir telefon fotoğrafını düzeltmek bu aracı kullanmanın en yaygın nedenlerinden biridir." },
        { question: "Görseli döndürmek yerine kırpmam gerekirse ne yapmalıyım?", answer: "Görsel Kırpma aracı, bir görselin bir kısmını seçip korumak için tasarlanmıştır." },
        { question: "Görsel Döndürme şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "background-remover": {
    en: {
      introduction: TOOL_INTRODUCTIONS["background-remover"].en,
      valueProposition: "Get a clean cutout of your subject once the tool is live.",
      benefits: ["Isolates the main subject", "Useful for product and portrait photos", "Free to use"],
      howToSteps: ["Upload the image", "Let the tool detect and remove the background", "Download the image with the background removed"],
      useCases: ["Preparing a clean product photo for an online store", "Making a transparent logo image", "Isolating a subject for a design project"],
      faq: [
        { question: "Does this work well on any photo?", answer: "Photos with a clear subject and simple background typically give the cleanest results." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "What kind of photos work best?", answer: "Photos with a clear subject and a simple, contrasting background typically give the cleanest results." },
        { question: "Is this useful for online store product photos?", answer: "Yes, isolating a product from its background is one of the most common uses for this kind of tool." },
        { question: "What replaces the removed background?", answer: "The removed area typically becomes transparent, so the subject can be placed on any background afterward." },
        { question: "Is Background Remover available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["background-remover"].az,
      valueProposition: "Alət aktiv olduqda obyektinizin təmiz kəsimini əldə edin.",
      benefits: ["Əsas obyekti ayırır", "Məhsul və portret fotoları üçün faydalıdır", "Pulsuz istifadə"],
      howToSteps: ["Şəkli yükləyin", "Alətin fonu aşkarlayıb silməsinə icazə verin", "Fonu silinmiş şəkli yükləyin"],
      useCases: ["Onlayn mağaza üçün təmiz məhsul fotosu hazırlamaq", "Şəffaf loqo şəkli yaratmaq", "Dizayn layihəsi üçün obyekti ayırmaq"],
      faq: [
        { question: "Bu, istənilən foto üçün yaxşı işləyir?", answer: "Aydın obyekti və sadə fonu olan fotolar adətən ən təmiz nəticəni verir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Hansı foto növü ən yaxşı nəticəni verir?", answer: "Aydın obyekti və sadə, kontrastlı fonu olan fotolar adətən ən təmiz nəticəni verir." },
        { question: "Bu, onlayn mağaza məhsul fotoları üçün faydalıdırmı?", answer: "Bəli, məhsulu fonundan ayırmaq bu cür alətin ən geniş yayılmış istifadələrindən biridir." },
        { question: "Silinmiş fonun yerinə nə gəlir?", answer: "Silinmiş sahə adətən şəffaf olur, ona görə obyekt sonradan istənilən fonda yerləşdirilə bilər." },
        { question: "Fon Silmə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["background-remover"].tr,
      valueProposition: "Araç yayına girdiğinde konunuzun temiz bir kesimini elde edin.",
      benefits: ["Ana öğeyi ayırır", "Ürün ve portre fotoğrafları için faydalıdır", "Ücretsiz kullanım"],
      howToSteps: ["Görseli yükleyin", "Aracın arka planı algılayıp kaldırmasına izin verin", "Arka planı kaldırılmış görseli indirin"],
      useCases: ["Bir online mağaza için temiz bir ürün fotoğrafı hazırlama", "Şeffaf bir logo görseli oluşturma", "Bir tasarım projesi için konuyu ayırma"],
      faq: [
        { question: "Bu, her fotoğrafta iyi çalışır mı?", answer: "Net bir konusu ve basit arka planı olan fotoğraflar genellikle en temiz sonucu verir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Hangi tür fotoğraflar en iyi sonucu verir?", answer: "Net bir konusu ve basit, kontrastlı bir arka planı olan fotoğraflar genellikle en temiz sonucu verir." },
        { question: "Bu, online mağaza ürün fotoğrafları için faydalı mı?", answer: "Evet, bir ürünü arka planından ayırmak bu tür bir aracın en yaygın kullanımlarından biridir." },
        { question: "Kaldırılan arka planın yerine ne gelir?", answer: "Kaldırılan alan genellikle şeffaf hale gelir, böylece konu daha sonra herhangi bir arka plana yerleştirilebilir." },
        { question: "Arka Plan Kaldırma şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "image-to-pdf": {
    en: {
      introduction: TOOL_INTRODUCTIONS["image-to-pdf"].en,
      valueProposition: "Turn a set of photos into one shareable PDF once the tool is live.",
      benefits: ["Combines multiple images into one file", "Works with different image formats", "Free to use"],
      howToSteps: ["Add the images to include", "Arrange them in order", "Combine them into a single PDF"],
      useCases: ["Turning scanned document photos into one PDF", "Submitting several photo pages as one file", "Creating a simple photo-based report"],
      faq: [
        { question: "Can images of different formats be combined?", answer: "Yes, common image formats can be combined into a single PDF." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Does the order of images matter?", answer: "Yes, images are combined in the order they're arranged before creating the PDF." },
        { question: "Is this useful for submitting photographed documents?", answer: "Yes, turning a set of photographed pages into one PDF is a common use case." },
        { question: "What if I need to go from PDF back to images instead?", answer: "The PDF to Image Converter tool is designed for that direction." },
        { question: "Is Image to PDF available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["image-to-pdf"].az,
      valueProposition: "Alət aktiv olduqda foto dəstini tək paylaşıla bilən PDF-ə çevirin.",
      benefits: ["Bir neçə şəkli tək faylda birləşdirir", "Fərqli şəkil formatları ilə işləyir", "Pulsuz istifadə"],
      howToSteps: ["Daxil ediləcək şəkilləri əlavə edin", "Onları sırayla düzün", "Tək PDF-də birləşdirin"],
      useCases: ["Skan edilmiş sənəd fotolarını tək PDF-ə çevirmək", "Bir neçə foto səhifəsini tək fayl kimi təqdim etmək", "Sadə foto əsaslı hesabat yaratmaq"],
      faq: [
        { question: "Fərqli formatlı şəkillər birləşdirilə bilər?", answer: "Bəli, geniş yayılmış şəkil formatları tək PDF-də birləşdirilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Şəkillərin sırası əhəmiyyət daşıyır?", answer: "Bəli, şəkillər PDF yaradılmadan əvvəl düzüldükləri sırada birləşdirilir." },
        { question: "Bu, fotoşəkil çəkilmiş sənədləri təqdim etmək üçün faydalıdırmı?", answer: "Bəli, fotoşəkil çəkilmiş səhifələr toplusunu tək PDF-ə çevirmək geniş yayılmış istifadə halıdır." },
        { question: "PDF-dən əksinə şəkillərə keçmək lazımdırsa nə etməliyəm?", answer: "PDF-dən Şəkilə aləti həmin istiqamət üçün nəzərdə tutulub." },
        { question: "Şəkildən PDF-ə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["image-to-pdf"].tr,
      valueProposition: "Araç yayına girdiğinde bir fotoğraf setini tek bir paylaşılabilir PDF'ye dönüştürün.",
      benefits: ["Birden fazla görseli tek dosyada birleştirir", "Farklı görsel formatlarıyla çalışır", "Ücretsiz kullanım"],
      howToSteps: ["Eklenecek görselleri ekleyin", "Sırayla düzenleyin", "Tek bir PDF'de birleştirin"],
      useCases: ["Taranmış belge fotoğraflarını tek bir PDF'ye dönüştürme", "Birden fazla fotoğraf sayfasını tek dosya olarak sunma", "Basit fotoğraf tabanlı bir rapor oluşturma"],
      faq: [
        { question: "Farklı formatlardaki görseller birleştirilebilir mi?", answer: "Evet, yaygın görsel formatları tek bir PDF'de birleştirilebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Görsellerin sırası önemli mi?", answer: "Evet, görseller PDF oluşturulmadan önce düzenlendikleri sırayla birleştirilir." },
        { question: "Bu, fotoğraflanmış belgeleri göndermek için faydalı mı?", answer: "Evet, fotoğraflanmış bir sayfa setini tek bir PDF'ye dönüştürmek yaygın bir kullanım şeklidir." },
        { question: "PDF'den tekrar görsellere geçmem gerekirse ne yapmalıyım?", answer: "PDF'den Görsele aracı o yön için tasarlanmıştır." },
        { question: "Görselden PDF'ye şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "pdf-to-image": {
    en: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-image"].en,
      valueProposition: "Turn PDF pages into standalone pictures once the tool is live.",
      benefits: ["One image per page", "Flexible output for viewing or sharing", "Free to use"],
      howToSteps: ["Upload the PDF to convert", "Let the tool convert each page", "Download the images"],
      useCases: ["Getting a quick picture preview of a PDF page", "Sharing a document page where only images are accepted", "Extracting a diagram or chart from a PDF"],
      faq: [
        { question: "How is this different from PDF to JPG?", answer: "PDF to JPG always outputs JPG specifically; this tool covers image conversion more generally." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Can specific pages be selected instead of the whole document?", answer: "Selecting specific pages to convert is a common feature of this kind of tool." },
        { question: "Is this useful for extracting a chart or diagram from a report?", answer: "Yes, pulling out a single visual element as an image is a common use case." },
        { question: "What if I specifically need JPG output rather than a general image format?", answer: "The PDF to JPG Converter tool is focused specifically on that format." },
        { question: "Is PDF to Image available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-image"].az,
      valueProposition: "Alət aktiv olduqda PDF səhifələrini müstəqil fotolara çevirin.",
      benefits: ["Hər səhifə üçün bir şəkil", "Baxış və ya paylaşım üçün çevik nəticə", "Pulsuz istifadə"],
      howToSteps: ["Çevriləcək PDF-i yükləyin", "Alətin hər səhifəni çevirməsinə icazə verin", "Şəkilləri yükləyin"],
      useCases: ["PDF səhifəsinin sürətli foto önizləməsini əldə etmək", "Yalnız şəkil qəbul edilən yerdə sənəd səhifəsini paylaşmaq", "PDF-dən diaqram və ya qrafiki çıxarmaq"],
      faq: [
        { question: "Bu, PDF-dən JPG-yə çevirmədən nə ilə fərqlənir?", answer: "PDF-dən JPG-yə həmişə konkret JPG verir; bu alət isə şəkil çevirməni daha ümumi şəkildə əhatə edir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Bütün sənəd əvəzinə konkret səhifələr seçilə bilər?", answer: "Çevriləcək konkret səhifələri seçmək bu cür alətin geniş yayılmış xüsusiyyətidir." },
        { question: "Bu, hesabatdan diaqram və ya qrafik çıxarmaq üçün faydalıdırmı?", answer: "Bəli, tək vizual elementi şəkil kimi çıxarmaq geniş yayılmış istifadə halıdır." },
        { question: "Xüsusilə ümumi şəkil formatı deyil, JPG nəticə lazımdırsa nə etməliyəm?", answer: "PDF-dən JPG-yə aləti xüsusilə həmin format üçün nəzərdə tutulub." },
        { question: "PDF-dən Şəkilə hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["pdf-to-image"].tr,
      valueProposition: "Araç yayına girdiğinde PDF sayfalarını bağımsız görsellere dönüştürün.",
      benefits: ["Her sayfa için bir görsel", "Görüntüleme veya paylaşım için esnek çıktı", "Ücretsiz kullanım"],
      howToSteps: ["Dönüştürülecek PDF'yi yükleyin", "Aracın her sayfayı dönüştürmesine izin verin", "Görselleri indirin"],
      useCases: ["Bir PDF sayfasının hızlı bir görsel önizlemesini alma", "Yalnızca görsellerin kabul edildiği bir yerde belge sayfasını paylaşma", "Bir PDF'den bir diyagram veya grafik çıkarma"],
      faq: [
        { question: "Bu, PDF'den JPG'ye dönüştürmeden nasıl farklıdır?", answer: "PDF'den JPG'ye her zaman özellikle JPG üretir; bu araç ise görsel dönüştürmeyi daha genel olarak kapsar." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Tüm belge yerine belirli sayfalar seçilebilir mi?", answer: "Dönüştürülecek belirli sayfaları seçmek bu tür bir aracın yaygın bir özelliğidir." },
        { question: "Bu, bir rapordan bir grafik veya diyagram çıkarmak için faydalı mı?", answer: "Evet, tek bir görsel öğeyi görsel olarak çıkarmak yaygın bir kullanım şeklidir." },
        { question: "Genel bir görsel formatı yerine özellikle JPG çıktısına ihtiyacım olursa ne yapmalıyım?", answer: "PDF'den JPG'ye aracı özellikle o format için tasarlanmıştır." },
        { question: "PDF'den Görsele şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "gif-maker": {
    en: {
      introduction: TOOL_INTRODUCTIONS["gif-maker"].en,
      valueProposition: "Turn a series of photos into one animated GIF once the tool is live.",
      benefits: ["Combines multiple images into an animation", "Good for quick, shareable clips", "Free to use"],
      howToSteps: ["Add the images or frames to include", "Set their order and timing", "Create the animated GIF"],
      useCases: ["Making a short animation for social media", "Turning a burst of photos into a moving clip", "Creating a simple reaction GIF"],
      faq: [
        { question: "How many images are needed to make a GIF?", answer: "At least two frames are needed to create movement; more frames make smoother animation." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Will the GIF loop automatically?", answer: "GIFs typically loop by default once created." },
        { question: "Is this useful for social media reactions or clips?", answer: "Yes, short looping clips are one of the most common uses for a GIF." },
        { question: "What if I only need a single static image with text instead of an animation?", answer: "The Meme Generator tool is designed for adding text to a single image." },
        { question: "Is GIF Maker available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["gif-maker"].az,
      valueProposition: "Alət aktiv olduqda foto sırasını tək animasiyalı GIF-ə çevirin.",
      benefits: ["Bir neçə şəkli animasiyada birləşdirir", "Sürətli, paylaşıla bilən klip üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Daxil ediləcək şəkil və ya kadrları əlavə edin", "Sırasını və vaxtlamasını təyin edin", "Animasiyalı GIF-i yaradın"],
      useCases: ["Sosial media üçün qısa animasiya hazırlamaq", "Foto seriyasını hərəkətli klipə çevirmək", "Sadə reaksiya GIF-i yaratmaq"],
      faq: [
        { question: "GIF yaratmaq üçün neçə şəkil lazımdır?", answer: "Hərəkət yaratmaq üçün ən azı iki kadr lazımdır; daha çox kadr daha hamar animasiya verir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "GIF avtomatik təkrarlanacaq?", answer: "GIF-lər adətən yaradıldıqdan sonra standart olaraq təkrarlanır." },
        { question: "Bu, sosial media reaksiyaları və ya klipləri üçün faydalıdırmı?", answer: "Bəli, qısa təkrarlanan kliplər GIF-in ən geniş yayılmış istifadələrindən biridir." },
        { question: "Animasiya əvəzinə yalnız mətnli tək statik şəkil lazımdırsa nə etməliyəm?", answer: "Mem Generatoru aləti tək şəklə mətn əlavə etmək üçün nəzərdə tutulub." },
        { question: "GIF Yaradıcısı hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["gif-maker"].tr,
      valueProposition: "Araç yayına girdiğinde bir dizi fotoğrafı tek bir animasyonlu GIF'e dönüştürün.",
      benefits: ["Birden fazla görseli animasyonda birleştirir", "Hızlı, paylaşılabilir klipler için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Eklenecek görselleri veya kareleri ekleyin", "Sırasını ve zamanlamasını ayarlayın", "Animasyonlu GIF'i oluşturun"],
      useCases: ["Sosyal medya için kısa bir animasyon yapma", "Bir dizi fotoğrafı hareketli bir klibe dönüştürme", "Basit bir tepki GIF'i oluşturma"],
      faq: [
        { question: "Bir GIF yapmak için kaç görsel gerekir?", answer: "Hareket oluşturmak için en az iki kare gerekir; daha fazla kare daha akıcı bir animasyon sağlar." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "GIF otomatik olarak döngü yapar mı?", answer: "GIF'ler oluşturulduktan sonra genellikle varsayılan olarak döngü yapar." },
        { question: "Bu, sosyal medya tepkileri veya klipleri için faydalı mı?", answer: "Evet, kısa döngülü klipler bir GIF'in en yaygın kullanımlarından biridir." },
        { question: "Bir animasyon yerine yalnızca metinli tek bir statik görsele ihtiyacım olursa ne yapmalıyım?", answer: "Meme Oluşturucu aracı, tek bir görsele metin eklemek için tasarlanmıştır." },
        { question: "GIF Oluşturucu şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "meme-generator": {
    en: {
      introduction: TOOL_INTRODUCTIONS["meme-generator"].en,
      valueProposition: "Turn a photo into a shareable meme once the tool is live.",
      benefits: ["Adds custom text to any image", "Simple, fast meme creation", "Free to use"],
      howToSteps: ["Upload the image to use", "Add the top and bottom text", "Download the finished meme"],
      useCases: ["Creating a meme for social media", "Adding a caption to a funny photo", "Making a quick reaction image for a chat"],
      faq: [
        { question: "Can any image be used as a meme template?", answer: "Yes, any uploaded image can have text added to it." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Can font size or color be adjusted?", answer: "Basic text styling is a standard part of this kind of tool." },
        { question: "Is this useful for quick social media content?", answer: "Yes, fast, simple meme creation is one of the most common reasons people use a tool like this." },
        { question: "What if I want to turn several images into an animation instead?", answer: "The GIF Maker tool is designed for combining multiple images into an animation." },
        { question: "Is Meme Generator available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["meme-generator"].az,
      valueProposition: "Alət aktiv olduqda fotonu paylaşıla bilən memə çevirin.",
      benefits: ["İstənilən şəklə fərdi mətn əlavə edir", "Sadə, sürətli mem yaratma", "Pulsuz istifadə"],
      howToSteps: ["İstifadə ediləcək şəkli yükləyin", "Yuxarı və aşağı mətni əlavə edin", "Hazır memi yükləyin"],
      useCases: ["Sosial media üçün mem yaratmaq", "Gülməli fotoya izah əlavə etmək", "Söhbət üçün sürətli reaksiya şəkli hazırlamaq"],
      faq: [
        { question: "İstənilən şəkil mem şablonu kimi istifadə edilə bilər?", answer: "Bəli, yüklənmiş istənilən şəklə mətn əlavə edilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Şrift ölçüsü və ya rəngi dəyişdirilə bilər?", answer: "Sadə mətn tərtibatı bu cür alətin standart hissəsidir." },
        { question: "Bu, sürətli sosial media məzmunu üçün faydalıdırmı?", answer: "Bəli, sürətli, sadə mem yaratmaq insanların bu cür alətdən istifadə etməsinin ən geniş yayılmış səbəbidir." },
        { question: "Bir neçə şəkli animasiyaya çevirmək istəsəm nə etməliyəm?", answer: "GIF Yaradıcısı aləti bir neçə şəkli animasiyada birləşdirmək üçün nəzərdə tutulub." },
        { question: "Mem Generatoru hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["meme-generator"].tr,
      valueProposition: "Araç yayına girdiğinde bir fotoğrafı paylaşılabilir bir meme'ye dönüştürün.",
      benefits: ["Herhangi bir görsele özel metin ekler", "Basit, hızlı meme oluşturma", "Ücretsiz kullanım"],
      howToSteps: ["Kullanılacak görseli yükleyin", "Üst ve alt metni ekleyin", "Bitmiş meme'yi indirin"],
      useCases: ["Sosyal medya için bir meme oluşturma", "Komik bir fotoğrafa açıklama ekleme", "Bir sohbet için hızlı bir tepki görseli yapma"],
      faq: [
        { question: "Herhangi bir görsel meme şablonu olarak kullanılabilir mi?", answer: "Evet, yüklenen herhangi bir görsele metin eklenebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Yazı tipi boyutu veya rengi ayarlanabilir mi?", answer: "Basit metin biçimlendirmesi bu tür bir aracın standart bir parçasıdır." },
        { question: "Bu, hızlı sosyal medya içeriği için faydalı mı?", answer: "Evet, hızlı, basit meme oluşturma, insanların böyle bir aracı kullanmasının en yaygın nedenlerinden biridir." },
        { question: "Birkaç görseli bunun yerine bir animasyona dönüştürmek istersem ne yapmalıyım?", answer: "GIF Oluşturucu aracı, birden fazla görseli bir animasyonda birleştirmek için tasarlanmıştır." },
        { question: "Meme Oluşturucu şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },

  "color-palette-generator": {
    en: {
      introduction: TOOL_INTRODUCTIONS["color-palette-generator"].en,
      valueProposition: "Get a ready-made color scheme for your project once the tool is live.",
      benefits: ["Suggests matching colors together", "Useful starting point for design work", "Free to use"],
      howToSteps: ["Upload an image or start from an idea", "Let the tool generate matching colors", "Save or copy the resulting palette"],
      useCases: ["Building a color scheme for a website", "Matching colors to a brand photo", "Getting design inspiration from an existing image"],
      faq: [
        { question: "Does the palette come from an uploaded image?", answer: "A palette can be generated from an image's dominant colors or built from a starting idea." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
        { question: "Can the generated colors be copied as hex codes?", answer: "Providing colors in a usable format like hex codes is a standard part of this kind of tool." },
        { question: "Is this useful for choosing a brand's color scheme?", answer: "Yes, building a consistent color scheme from a photo or idea is a common use case." },
        { question: "What if I want to extract colors from a specific image rather than starting from an idea?", answer: "The tool is designed to generate a palette either from an uploaded image or from a starting concept." },
        { question: "Is Color Palette Generator available to use right now?", answer: "Not yet — it is currently in development, like the rest of Codivio's tools." },
      ],
    },
    az: {
      introduction: TOOL_INTRODUCTIONS["color-palette-generator"].az,
      valueProposition: "Alət aktiv olduqda layihəniz üçün hazır rəng sxemi əldə edin.",
      benefits: ["Bir-birinə uyğun rəngləri təklif edir", "Dizayn işi üçün faydalı başlanğıc nöqtəsi", "Pulsuz istifadə"],
      howToSteps: ["Şəkil yükləyin və ya ideyadan başlayın", "Alətin uyğun rəngləri yaratmasına icazə verin", "Alınan palitranı saxlayın və ya kopyalayın"],
      useCases: ["Veb sayt üçün rəng sxemi qurmaq", "Rəngləri brend fotosuna uyğunlaşdırmaq", "Mövcud şəkildən dizayn ilhamı almaq"],
      faq: [
        { question: "Palitra yüklənmiş şəkildən yaranır?", answer: "Palitra şəklin əsas rənglərindən yaradıla və ya başlanğıc ideyadan qurula bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
        { question: "Yaradılan rənglər hex kodları kimi kopyalana bilər?", answer: "Rəngləri hex kodları kimi istifadəyə hazır formatda təqdim etmək bu cür alətin standart hissəsidir." },
        { question: "Bu, brendin rəng sxemini seçmək üçün faydalıdırmı?", answer: "Bəli, fotodan və ya ideyadan ardıcıl rəng sxemi qurmaq geniş yayılmış istifadə halıdır." },
        { question: "İdeyadan başlamaq əvəzinə konkret şəkildən rəng çıxarmaq istəsəm nə etməliyəm?", answer: "Alət həm yüklənmiş şəkildən, həm də başlanğıc konsepsiyadan palitra yaratmaq üçün nəzərdə tutulub." },
        { question: "Rəng Palitrası Generatoru hazırda istifadə üçün mövcuddur?", answer: "Hələ yox — Codivio-nun digər alətləri kimi, bu da hazırlanma mərhələsindədir." },
      ],
    },
    tr: {
      introduction: TOOL_INTRODUCTIONS["color-palette-generator"].tr,
      valueProposition: "Araç yayına girdiğinde projeniz için hazır bir renk şeması elde edin.",
      benefits: ["Birbirine uyumlu renkleri önerir", "Tasarım çalışması için faydalı bir başlangıç noktası", "Ücretsiz kullanım"],
      howToSteps: ["Bir görsel yükleyin veya bir fikirden başlayın", "Aracın uyumlu renkler oluşturmasına izin verin", "Elde edilen paleti kaydedin veya kopyalayın"],
      useCases: ["Bir web sitesi için renk şeması oluşturma", "Renkleri bir marka fotoğrafına uydurma", "Mevcut bir görselden tasarım ilhamı alma"],
      faq: [
        { question: "Palet yüklenen bir görselden mi oluşur?", answer: "Palet, bir görselin baskın renklerinden oluşturulabilir veya bir başlangıç fikrinden inşa edilebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
        { question: "Oluşturulan renkler hex kodu olarak kopyalanabilir mi?", answer: "Renkleri hex kodu gibi kullanılabilir bir formatta sunmak bu tür bir aracın standart bir parçasıdır." },
        { question: "Bu, bir markanın renk şemasını seçmek için faydalı mı?", answer: "Evet, bir fotoğraftan veya fikirden tutarlı bir renk şeması oluşturmak yaygın bir kullanım şeklidir." },
        { question: "Bir fikirden başlamak yerine belirli bir görselden renk çıkarmak istersem ne yapmalıyım?", answer: "Araç, hem yüklenen bir görselden hem de bir başlangıç konseptinden palet oluşturacak şekilde tasarlanmıştır." },
        { question: "Renk Paleti Oluşturucu şu anda kullanılabilir mi?", answer: "Henüz değil — Codivio'nun diğer araçları gibi bu da şu anda geliştirilme aşamasındadır." },
      ],
    },
  },
};

/** Category-level content foundation (Step 12) — documents what a future
 * category page would cover. Reuses CATEGORY_KEYWORD_OPPORTUNITIES'
 * `wouldServeTools` list rather than re-deriving it. No route created. */
export interface CategoryContentBlueprint {
  purpose: Record<Language, string>;
  supportingTopics: string[];
}

export const CATEGORY_CONTENT_BLUEPRINT: Record<
  "QR Tools" | "PDF Tools" | "Image Tools" | "Other Tools",
  CategoryContentBlueprint
> = {
  "QR Tools": {
    purpose: {
      en: "A hub for every kind of QR code Codivio can generate or read — links, text, contact details, WiFi, and more.",
      az: "Codivio-nun yarada və ya oxuya biləcəyi hər növ QR kod üçün mərkəz — link, mətn, əlaqə, WiFi və digərləri.",
      tr: "Codivio'nun oluşturabileceği veya okuyabileceği her tür QR kod için bir merkez — bağlantı, metin, iletişim, WiFi ve daha fazlası.",
    },
    supportingTopics: [
      "What a QR code is and how it works",
      "Choosing the right QR code type for a use case",
      "Comparison: QR code generator vs. content-specific QR tools",
    ],
  },
  "PDF Tools": {
    purpose: {
      en: "A hub for common PDF tasks — merging, splitting, compressing and converting documents.",
      az: "Ümumi PDF tapşırıqları üçün mərkəz — sənədləri birləşdirmək, bölmək, sıxmaq və çevirmək.",
      tr: "Yaygın PDF görevleri için bir merkez — belgeleri birleştirme, bölme, sıkıştırma ve dönüştürme.",
    },
    supportingTopics: [
      "Why PDF files grow large and when to compress them",
      "Choosing between merge, split and rotate for a document task",
      "Comparison: PDF to Word vs. PDF to Excel — which to use",
    ],
  },
  "Image Tools": {
    purpose: {
      en: "A hub for everyday photo tasks — resizing, compressing, converting formats and removing backgrounds.",
      az: "Gündəlik foto tapşırıqları üçün mərkəz — ölçüləndirmə, sıxma, format çevirmə və fon silmə.",
      tr: "Günlük fotoğraf görevleri için bir merkez — boyutlandırma, sıkıştırma, format dönüştürme ve arka plan kaldırma.",
    },
    supportingTopics: [
      "JPG vs PNG vs WebP: which format to use",
      "Resize vs crop vs compress — what's the difference",
      "Preparing images for web, social media and print",
    ],
  },
  "Other Tools": {
    purpose: {
      en: "A hub for creative and utility tools that don't fit neatly into QR, PDF or Image categories.",
      az: "QR, PDF və ya Şəkil kateqoriyalarına tam uyğun gəlməyən yaradıcı və köməkçi alətlər üçün mərkəz.",
      tr: "QR, PDF veya Görsel kategorilerine tam olarak uymayan yaratıcı ve yardımcı araçlar için bir merkez.",
    },
    supportingTopics: [
      "Creative uses for GIFs and memes online",
      "Building a brand color palette from a photo",
    ],
  },
};

/**
 * Combined accessor for a tool's full content package, in one language.
 * Deliberately reuses shared/seo/keywords.ts's relatedToolOpportunity and
 * futureContentOpportunity (Step 11/13) rather than storing a second copy
 * of them here — this is the single place Phase 3.5/3.6 should read from,
 * not TOOL_CONTENT and TOOL_KEYWORDS separately (Step 16: "avoid ...
 * separate sources of truth").
 */
export function getContentBlueprint(slug: string, lang: Language) {
  const content = TOOL_CONTENT[slug]?.[lang];
  const keywordProfile = getToolKeywordProfile(slug, lang);
  if (!content || !keywordProfile) return null;
  // The one real, already-established signal for "is this tool live" —
  // TOOL_SEO[slug].robots.index (see shared/seo/tools.ts's own header
  // comment) — rather than a second, separately-maintained live/coming-soon
  // list that could drift out of sync with it.
  const isLive = TOOL_SEO[slug]?.robots.index === true;
  return {
    ...content,
    ...keywordProfile,
    trustMessage: isLive ? SHARED_TRUST_MESSAGE_LIVE[lang] : SHARED_TRUST_MESSAGE[lang],
    statusNote: isLive ? TOOL_LIVE_NOTE[lang] : TOOL_STATUS_NOTE[lang],
  };
}

/**
 * Lightweight, deterministic FAQ-only accessor (FAQ Expansion + AI
 * Discoverability phase, pre-3.15). Reads the same TOOL_CONTENT data
 * getContentBlueprint does — no second dataset — but exposes just the
 * FAQ array for a caller (this project's own AI answer-builder pattern in
 * shared/seo/ai.ts, or a future one) that needs a tool's questions without
 * pulling in the rest of the blueprint. Pure data lookup: no model call,
 * no external API, never fabricates a question/answer for a tool that
 * doesn't exist.
 */
export function getToolFaqs(slug: string, lang: Language): FaqTopic[] | null {
  return TOOL_CONTENT[slug]?.[lang]?.faq ?? null;
}

/** All 4 content-relationship types Step 13 asks for, mapped to where each
 * already lives rather than duplicated into a fourth parallel dataset:
 *  - How-To article   → ToolContentBlueprint.howToSteps (this file)
 *  - Use-case article  → ToolContentBlueprint.useCases (this file)
 *  - Educational article → ToolContentBlueprint.introduction + TOOL_KEYWORDS.futureContentOpportunity
 *  - Comparison article → CATEGORY_CONTENT_BLUEPRINT.supportingTopics (category-level, not per-tool —
 *    comparisons are naturally between tools in the same category, e.g. "PDF to Word vs PDF to Excel")
 * This mapping itself is documentation for Phase 3.6/3.13, not a new data
 * structure to maintain.
 */
export const CONTENT_RELATIONSHIP_MAP = {
  howToArticle: "ToolContentBlueprint.howToSteps",
  useCaseArticle: "ToolContentBlueprint.useCases",
  educationalArticle: "ToolContentBlueprint.introduction + TOOL_KEYWORDS.futureContentOpportunity",
  comparisonArticle: "CATEGORY_CONTENT_BLUEPRINT.supportingTopics",
} as const;

// Re-exported so a consumer of getContentBlueprint's related-tool slugs can
// resolve each one back to its own category without importing keywords.ts
// separately for that one field.
export { TOOL_KEYWORDS };

// --- AI-readable tool/category profiles (Phase 3.5, moved here Phase 3.13) -
//
// These originally lived in shared/seo/ai.ts, but ai.ts is imported eagerly
// by every page (via schema.ts/internal-links.ts for lightweight
// name/breadcrumb lookups), while this file (content.ts) now also has a
// genuine, lazy-loaded caller (src/pages/ToolPage.tsx). Keeping any
// reference to this file's heavy TOOL_CONTENT dataset out of ai.ts
// entirely — not just unused — is what lets the bundler place TOOL_CONTENT
// only in ToolPage's own lazy chunk instead of the main bundle; with the
// functions still defined in ai.ts (even if nothing called them), the
// bundler was not reliably eliminating this file's data from the eager
// chunk. See DECISIONS.md's Phase 3.13 entry for the measured before/after.

export interface AiToolProfile {
  slug: string;
  category: ToolCategory;
  name: string;
  purpose: string;
  description: string;
  primarySearchIntent: string;
  status: "coming-soon" | "live";
  supportedLanguages: readonly Language[];
  benefits: string[];
  generalWorkflow: string[];
  useCases: string[];
  relatedTools: string[];
  futureContentOpportunity: string;
}

/** Reads a tool's AI-readable profile from the already-audited Phase 3.1
 * (title/description), 3.3 (keywords/related tools) and 3.4 (content)
 * data. Returns null for any slug not in the real registry — never
 * fabricates a profile for a tool that doesn't exist. `status` is derived
 * from TOOL_SEO[slug].robots.index — the same real signal
 * getContentBlueprint uses — not a second, separately-maintained flag. */
export function getAiToolProfile(slug: string, lang: Language): AiToolProfile | null {
  const seoEntity = TOOL_SEO[slug];
  const blueprint = getContentBlueprint(slug, lang);
  if (!seoEntity || !blueprint) return null;

  return {
    slug,
    category: blueprint.category,
    name: getToolDisplayName(slug, lang) ?? "",
    purpose: blueprint.valueProposition,
    description: blueprint.introduction,
    primarySearchIntent: blueprint.primaryKeyword,
    status: seoEntity.robots.index ? "live" : "coming-soon",
    supportedLanguages: LANGUAGES,
    benefits: blueprint.benefits,
    generalWorkflow: blueprint.howToSteps,
    useCases: blueprint.useCases,
    relatedTools: blueprint.relatedToolOpportunity,
    futureContentOpportunity: blueprint.futureContentOpportunity,
  };
}

export interface AiCategoryProfile {
  category: ToolCategory;
  purpose: string;
  toolSlugs: string[];
  supportingTopics: string[];
}

export function getAiCategoryProfile(category: ToolCategory, lang: Language): AiCategoryProfile {
  const blueprint = CATEGORY_CONTENT_BLUEPRINT[category];
  const toolSlugs = Object.entries(TOOL_KEYWORDS)
    .filter(([, entry]) => entry.category === category)
    .map(([slug]) => slug);
  return {
    category,
    purpose: blueprint.purpose[lang],
    toolSlugs,
    supportingTopics: blueprint.supportingTopics,
  };
}

/** Moved from ai.ts alongside getAiToolProfile (same reason: it depends on
 * the heavy content blueprint). Behavior is unchanged from Phase 3.5. */
export function answerWhatIsTool(slug: string, lang: Language): string | null {
  const profile = getAiToolProfile(slug, lang);
  if (!profile) return null;
  return `${profile.name} is a ${profile.category} tool on Codivio. ${profile.description} Status: ${profile.status === "coming-soon" ? "in development, not yet processing files" : profile.status}.`;
}
