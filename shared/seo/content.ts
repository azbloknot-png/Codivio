import { LANGUAGES, type Language } from "../i18n/languages";
import { TOOL_KEYWORDS, getToolKeywordProfile } from "./keywords";
import { TOOL_SEO } from "./tools";
import { getToolDisplayName, type ToolCategory } from "./ai";

/**
 * Codivio SEO — structured tool content architecture (Phase 3.4).
 *
 * Pure data, not wired into any rendered UI yet (see DECISIONS.md's Phase
 * 3.4 entry) — this establishes the content structure Phase 3.5/3.6 will
 * consume, without redesigning ToolPage.tsx in this same change. Reuses
 * shared/seo/keywords.ts's relatedToolOpportunity/futureContentOpportunity
 * rather than duplicating them (see getContentBlueprint in this file).
 *
 * CRITICAL constraint honored throughout: every one of the 34 tools in
 * src/pages/ToolPage.tsx currently renders only a "Tool coming soon"
 * placeholder — none has real file processing yet. howToSteps below
 * describe the general real-world workflow (how PDF merging, QR
 * generation, etc. work conceptually), not a claim that Codivio's own
 * implementation performs them today. TOOL_STATUS_NOTE and
 * SHARED_TRUST_MESSAGE make that distinction explicit and reusable rather
 * than repeating a disclaimer 34 times. No banned phrase from this
 * checkpoint's brief ("upload your file and download instantly", "we
 * process your file", "automatically deleted after X minutes",
 * "unlimited", "100% private", "no files are stored", "fastest/best
 * tool") appears anywhere below — test-enforced in tests/seo-content.test.ts.
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

export const TOOL_CONTENT: Record<string, LocalizedToolContent> = {
  "qr-code-generator": {
    en: {
      introduction: "A QR code generator turns information like a link or text into a scannable square code.",
      valueProposition: "Create a QR code for any purpose in seconds, once the tool is live.",
      benefits: ["Works for links, text and more", "No design skills needed", "Free to use"],
      howToSteps: ["Choose what the QR code should contain", "Customize the code if needed", "Download the finished QR code"],
      useCases: ["Sharing a website on printed materials", "Adding a QR code to a business card", "Linking a menu or flyer to a webpage"],
      faq: [
        { question: "What can a QR code generator create a code for?", answer: "A QR code can encode a link, plain text, contact details, WiFi credentials and more." },
        { question: "Is Codivio's QR code generator free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "QR kod generatoru link və ya mətn kimi məlumatı skan edilə bilən kvadrat koda çevirir.",
      valueProposition: "Alət aktiv olduqdan sonra istənilən məqsəd üçün saniyələr ərzində QR kod yaradın.",
      benefits: ["Link, mətn və s. üçün işləyir", "Dizayn bacarığı tələb etmir", "Pulsuz istifadə"],
      howToSteps: ["QR kodun nə saxlayacağını seçin", "Lazım olsa kodu fərdiləşdirin", "Hazır QR kodu yükləyin"],
      useCases: ["Çap materiallarında veb sayt paylaşmaq", "Vizit kartına QR kod əlavə etmək", "Menyu və ya vərəqəni veb səhifəyə bağlamaq"],
      faq: [
        { question: "QR kod generatoru nə üçün kod yarada bilər?", answer: "QR kod link, sadə mətn, əlaqə məlumatları, WiFi girişi və digərlərini kodlaya bilər." },
        { question: "Codivio-nun QR kod generatoru pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "QR kod oluşturucu, bir bağlantı veya metin gibi bilgiyi taranabilir kare bir koda dönüştürür.",
      valueProposition: "Araç yayına girdiğinde herhangi bir amaç için saniyeler içinde QR kod oluşturun.",
      benefits: ["Bağlantı, metin ve daha fazlası için çalışır", "Tasarım bilgisi gerektirmez", "Ücretsiz kullanım"],
      howToSteps: ["QR kodun neyi içereceğini seçin", "Gerekirse kodu özelleştirin", "Hazır QR kodu indirin"],
      useCases: ["Basılı materyallerde web sitesi paylaşma", "Kartvizite QR kod ekleme", "Menü veya broşürü web sayfasına bağlama"],
      faq: [
        { question: "QR kod oluşturucu ne için kod oluşturabilir?", answer: "QR kod; bağlantı, düz metin, iletişim bilgileri, WiFi erişimi ve daha fazlasını kodlayabilir." },
        { question: "Codivio'nun QR kod oluşturucusu ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "qr-code-scanner": {
    en: {
      introduction: "A QR code scanner reads a QR code using a camera or an uploaded image and reveals what it contains.",
      valueProposition: "Scan any QR code instantly once the tool is live, no extra app needed.",
      benefits: ["Works with camera or an image file", "No app installation needed", "Free to use"],
      howToSteps: ["Point the camera at a QR code or upload an image", "Let the scanner read the code", "View the decoded content"],
      useCases: ["Checking a QR code before opening a link", "Scanning a code from a printed poster", "Reading a QR code sent as an image"],
      faq: [
        { question: "Can a QR code scanner read a code from a saved photo?", answer: "Yes, a QR scanner can read a code either live through a camera or from an uploaded image." },
        { question: "Is Codivio's QR code scanner free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "QR kod skaneri kamera və ya yüklənmiş şəkil vasitəsilə QR kodu oxuyur və içindəkiləri göstərir.",
      valueProposition: "Alət aktiv olduqda əlavə tətbiqə ehtiyac olmadan istənilən QR kodu anında skan edin.",
      benefits: ["Kamera və ya şəkil faylı ilə işləyir", "Tətbiq quraşdırmaq lazım deyil", "Pulsuz istifadə"],
      howToSteps: ["Kameranı QR koda yönəldin və ya şəkil yükləyin", "Skanerin kodu oxumasına icazə verin", "Deşifr edilmiş məzmuna baxın"],
      useCases: ["Link açmadan əvvəl QR kodu yoxlamaq", "Çap edilmiş plakatdan kod skan etmək", "Şəkil kimi göndərilmiş QR kodu oxumaq"],
      faq: [
        { question: "QR kod skaneri yaddaşdakı fotodan kodu oxuya bilər?", answer: "Bəli, skaner kodu ya kamera ilə canlı, ya da yüklənmiş şəkildən oxuya bilər." },
        { question: "Codivio-nun QR kod skaneri pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "QR kod okuyucu, bir kamera veya yüklenen görsel aracılığıyla QR kodu okur ve içeriğini gösterir.",
      valueProposition: "Araç yayına girdiğinde ek bir uygulamaya gerek kalmadan herhangi bir QR kodu anında okutun.",
      benefits: ["Kamera veya görsel dosyasıyla çalışır", "Uygulama kurmaya gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["Kamerayı QR koda yöneltin veya bir görsel yükleyin", "Okuyucunun kodu okumasına izin verin", "Çözülen içeriği görüntüleyin"],
      useCases: ["Bir bağlantıyı açmadan önce QR kodu kontrol etme", "Basılı bir afişten kod okutma", "Görsel olarak gönderilen QR kodu okuma"],
      faq: [
        { question: "QR kod okuyucu kaydedilmiş bir fotoğraftaki kodu okuyabilir mi?", answer: "Evet, okuyucu kodu ya kamerayla canlı ya da yüklenen bir görselden okuyabilir." },
        { question: "Codivio'nun QR kod okuyucusu ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "url-to-qr": {
    en: {
      introduction: "This tool turns a website link into a QR code that opens the page when scanned.",
      valueProposition: "Give any URL a scannable form once the tool is live.",
      benefits: ["Works with any website link", "Good for print materials", "Free to use"],
      howToSteps: ["Paste the website link", "Generate the QR code", "Download and use it on your material"],
      useCases: ["Adding a website link to a poster", "Sharing a landing page at an event", "Linking a product page from packaging"],
      faq: [
        { question: "Does the QR code work for any website link?", answer: "Yes, any valid web address can be turned into a QR code." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət veb sayt linkini skan edildikdə səhifəni açan QR koda çevirir.",
      valueProposition: "Alət aktiv olduqda istənilən URL-i skan edilə bilən formaya salın.",
      benefits: ["İstənilən veb sayt linki ilə işləyir", "Çap materialları üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Veb sayt linkini yapışdırın", "QR kodu yaradın", "Yükləyin və materialınızda istifadə edin"],
      useCases: ["Plakata veb sayt linki əlavə etmək", "Tədbirdə açılış səhifəsini paylaşmaq", "Qablaşdırmadan məhsul səhifəsinə keçid vermək"],
      faq: [
        { question: "QR kod istənilən veb sayt linki üçün işləyir?", answer: "Bəli, istənilən düzgün veb ünvanı QR koda çevrilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir web sitesi bağlantısını taratıldığında sayfayı açan bir QR koda dönüştürür.",
      valueProposition: "Araç yayına girdiğinde herhangi bir URL'yi taranabilir hale getirin.",
      benefits: ["Herhangi bir web sitesi bağlantısıyla çalışır", "Basılı materyaller için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Web sitesi bağlantısını yapıştırın", "QR kodu oluşturun", "İndirin ve materyalinizde kullanın"],
      useCases: ["Bir afişe web sitesi bağlantısı ekleme", "Bir etkinlikte açılış sayfasını paylaşma", "Ambalajdan ürün sayfasına yönlendirme"],
      faq: [
        { question: "QR kod her web sitesi bağlantısı için çalışır mı?", answer: "Evet, geçerli her web adresi bir QR koda dönüştürülebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "text-to-qr": {
    en: {
      introduction: "This tool encodes plain text directly into a QR code, without needing a link.",
      valueProposition: "Share a short message as a scannable code once the tool is live.",
      benefits: ["No link required", "Good for short notes or instructions", "Free to use"],
      howToSteps: ["Type or paste the text", "Generate the QR code", "Share or print the code"],
      useCases: ["Sharing a short instruction on a sign", "Displaying a quote or note", "Sharing information without a website"],
      faq: [
        { question: "Is there a length limit for the text?", answer: "Very long text can make a QR code harder to scan, so shorter text works best." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət sadə mətni link tələb etmədən birbaşa QR koda kodlaşdırır.",
      valueProposition: "Alət aktiv olduqda qısa mesajı skan edilə bilən koda çevirin.",
      benefits: ["Link tələb olunmur", "Qısa qeyd və ya təlimat üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Mətni yazın və ya yapışdırın", "QR kodu yaradın", "Kodu paylaşın və ya çap edin"],
      useCases: ["Lövhədə qısa təlimat paylaşmaq", "Sitat və ya qeyd göstərmək", "Veb sayt olmadan məlumat paylaşmaq"],
      faq: [
        { question: "Mətn üçün uzunluq limiti varmı?", answer: "Çox uzun mətn QR kodun skan olunmasını çətinləşdirə bilər, ona görə qısa mətn daha yaxşıdır." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, düz metni bir bağlantıya gerek kalmadan doğrudan bir QR koda kodlar.",
      valueProposition: "Araç yayına girdiğinde kısa bir mesajı taranabilir bir koda dönüştürün.",
      benefits: ["Bağlantı gerekmez", "Kısa notlar veya talimatlar için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Metni yazın veya yapıştırın", "QR kodu oluşturun", "Kodu paylaşın veya yazdırın"],
      useCases: ["Bir tabelada kısa talimat paylaşma", "Bir alıntı veya not gösterme", "Web sitesi olmadan bilgi paylaşma"],
      faq: [
        { question: "Metin için bir uzunluk sınırı var mı?", answer: "Çok uzun metin QR kodun okunmasını zorlaştırabilir, bu yüzden kısa metin daha iyi sonuç verir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "wifi-qr": {
    en: {
      introduction: "This tool creates a QR code that lets a phone join a WiFi network without typing the password.",
      valueProposition: "Let guests connect to your WiFi with a scan once the tool is live.",
      benefits: ["No password typing needed", "Good for guests and visitors", "Free to use"],
      howToSteps: ["Enter the network name and password", "Generate the QR code", "Display or print it for guests to scan"],
      useCases: ["Sharing WiFi access at a cafe or office", "Giving guests internet access at home", "Displaying a WiFi code at an event"],
      faq: [
        { question: "Does scanning the code reveal my password as plain text?", answer: "The code stores the network details needed to connect; treat printed WiFi codes the way you would treat sharing the password itself." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət telefonun şifrəni yazmadan WiFi şəbəkəsinə qoşulmasını təmin edən QR kod yaradır.",
      valueProposition: "Alət aktiv olduqda qonaqların bir skanla WiFi-a qoşulmasını təmin edin.",
      benefits: ["Şifrə yazmağa ehtiyac yoxdur", "Qonaqlar üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Şəbəkə adını və şifrəni daxil edin", "QR kodu yaradın", "Qonaqların skan etməsi üçün göstərin və ya çap edin"],
      useCases: ["Kafedə və ya ofisdə WiFi girişini paylaşmaq", "Evdə qonaqlara internet girişi vermək", "Tədbirdə WiFi kodunu göstərmək"],
      faq: [
        { question: "Kodu skan etmək şifrəmi açıq mətn kimi göstərirmi?", answer: "Kod qoşulmaq üçün lazım olan şəbəkə məlumatlarını saxlayır; çap edilmiş WiFi koduna şifrəni paylaşmaq kimi ehtiyatlı yanaşın." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir telefonun şifreyi yazmadan WiFi ağına bağlanmasını sağlayan bir QR kod oluşturur.",
      valueProposition: "Araç yayına girdiğinde misafirlerin tek bir taramayla WiFi'nize bağlanmasını sağlayın.",
      benefits: ["Şifre yazmaya gerek yok", "Misafirler için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Ağ adını ve şifresini girin", "QR kodu oluşturun", "Misafirlerin taraması için gösterin veya yazdırın"],
      useCases: ["Bir kafede veya ofiste WiFi erişimini paylaşma", "Evde misafirlere internet erişimi verme", "Bir etkinlikte WiFi kodunu gösterme"],
      faq: [
        { question: "Kodu taratmak şifremi düz metin olarak gösterir mi?", answer: "Kod, bağlanmak için gereken ağ bilgilerini içerir; basılı WiFi kodlarına şifreyi paylaşır gibi dikkatli yaklaşın." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "vcard-qr": {
    en: {
      introduction: "This tool turns your contact details into a QR code that saves them to someone's phone in one scan.",
      valueProposition: "Share your contact card without printing or typing once the tool is live.",
      benefits: ["Saves name, phone and email at once", "No manual typing needed", "Free to use"],
      howToSteps: ["Enter your contact details", "Generate the QR code", "Share it on a card, badge or signature"],
      useCases: ["Adding a QR code to a business card", "Sharing contact details at a networking event", "Including a scannable contact in an email signature"],
      faq: [
        { question: "What information can a vCard QR code include?", answer: "Typically a name, phone number, email and similar contact fields." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət əlaqə məlumatlarınızı bir skanla telefona yadda saxlanılan QR koda çevirir.",
      valueProposition: "Alət aktiv olduqda əlaqə kartınızı çap etmədən və yazmadan paylaşın.",
      benefits: ["Ad, telefon və e-poçtu birlikdə saxlayır", "Əl ilə yazmağa ehtiyac yoxdur", "Pulsuz istifadə"],
      howToSteps: ["Əlaqə məlumatlarınızı daxil edin", "QR kodu yaradın", "Kartda, nişanda və ya imzada paylaşın"],
      useCases: ["Vizit kartına QR kod əlavə etmək", "Networking tədbirində əlaqə paylaşmaq", "E-poçt imzasına skan edilə bilən əlaqə əlavə etmək"],
      faq: [
        { question: "vCard QR kodu hansı məlumatları özündə saxlaya bilər?", answer: "Adətən ad, telefon nömrəsi, e-poçt və bənzər əlaqə sahələri." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, iletişim bilgilerinizi tek bir taramayla telefona kaydedilen bir QR koda dönüştürür.",
      valueProposition: "Araç yayına girdiğinde iletişim kartınızı yazdırmadan veya yazmadan paylaşın.",
      benefits: ["Ad, telefon ve e-postayı birlikte kaydeder", "Elle yazmaya gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["İletişim bilgilerinizi girin", "QR kodu oluşturun", "Kartvizitte, yaka kartında veya imzada paylaşın"],
      useCases: ["Kartvizite QR kod ekleme", "Networking etkinliğinde iletişim paylaşma", "E-posta imzasına taranabilir iletişim ekleme"],
      faq: [
        { question: "Bir vCard QR kodu hangi bilgileri içerebilir?", answer: "Genellikle ad, telefon numarası, e-posta ve benzeri iletişim alanları." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "email-qr": {
    en: {
      introduction: "This tool creates a QR code that opens a new email already addressed to you, with a subject if you choose.",
      valueProposition: "Make it easier for people to email you once the tool is live.",
      benefits: ["Recipient and subject pre-filled", "Saves the sender typing", "Free to use"],
      howToSteps: ["Enter the email address and optional subject", "Generate the QR code", "Display it wherever people should contact you"],
      useCases: ["Adding a contact QR code to a poster", "Making support easier to reach on packaging", "Sharing a quick way to email at an event"],
      faq: [
        { question: "Can the QR code include a subject line?", answer: "Yes, a subject can be pre-filled so the recipient doesn't have to type it." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət sizə ünvanlanmış, istəyə görə mövzulu yeni e-poçt açan QR kod yaradır.",
      valueProposition: "Alət aktiv olduqda insanların sizə e-poçt yazmasını asanlaşdırın.",
      benefits: ["Alıcı və mövzu əvvəlcədən doldurulur", "Göndərənin yazmasına ehtiyac qalmır", "Pulsuz istifadə"],
      howToSteps: ["E-poçt ünvanını və istəyə görə mövzunu daxil edin", "QR kodu yaradın", "İnsanların sizinlə əlaqə saxlaya biləcəyi yerdə göstərin"],
      useCases: ["Plakata əlaqə QR kodu əlavə etmək", "Qablaşdırmada dəstəyə çatmağı asanlaşdırmaq", "Tədbirdə sürətli e-poçt yolu paylaşmaq"],
      faq: [
        { question: "QR koda mövzu sətri daxil edilə bilər?", answer: "Bəli, mövzu əvvəlcədən doldurula bilər ki, alıcı onu yazmaq məcburiyyətində qalmasın." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, size adreslenmiş, isterseniz konusu da eklenmiş yeni bir e-posta açan bir QR kod oluşturur.",
      valueProposition: "Araç yayına girdiğinde insanların size e-posta göndermesini kolaylaştırın.",
      benefits: ["Alıcı ve konu önceden doldurulur", "Gönderenin yazmasına gerek kalmaz", "Ücretsiz kullanım"],
      howToSteps: ["E-posta adresini ve isteğe bağlı konuyu girin", "QR kodu oluşturun", "İnsanların size ulaşabileceği yerde gösterin"],
      useCases: ["Bir afişe iletişim QR kodu ekleme", "Ambalajda destek ile iletişimi kolaylaştırma", "Bir etkinlikte hızlı e-posta yolu paylaşma"],
      faq: [
        { question: "QR koda bir konu satırı eklenebilir mi?", answer: "Evet, konu önceden doldurulabilir, böylece alıcı onu yazmak zorunda kalmaz." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "sms-qr": {
    en: {
      introduction: "This tool creates a QR code that opens a pre-written text message ready to send.",
      valueProposition: "Make it faster for people to text you once the tool is live.",
      benefits: ["Message text pre-filled", "Saves the sender typing", "Free to use"],
      howToSteps: ["Enter the phone number and message", "Generate the QR code", "Share it wherever a quick reply is useful"],
      useCases: ["Collecting quick feedback via text", "Making it easy to confirm an order by SMS", "Sharing a fast way to reach you at an event"],
      faq: [
        { question: "Can the message text be edited before sending?", answer: "Yes, the pre-filled text opens in the phone's own messaging app, where it can still be edited." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət göndərilməyə hazır, əvvəlcədən yazılmış mətn mesajı açan QR kod yaradır.",
      valueProposition: "Alət aktiv olduqda insanların sizə mesaj yazmasını sürətləndirin.",
      benefits: ["Mesaj mətni əvvəlcədən doldurulur", "Göndərənin yazmasına ehtiyac qalmır", "Pulsuz istifadə"],
      howToSteps: ["Telefon nömrəsini və mesajı daxil edin", "QR kodu yaradın", "Sürətli cavabın faydalı olduğu yerdə paylaşın"],
      useCases: ["Mesaj vasitəsilə sürətli rəy toplamaq", "SMS ilə sifarişi təsdiqləməyi asanlaşdırmaq", "Tədbirdə sizə çatmağın sürətli yolunu paylaşmaq"],
      faq: [
        { question: "Göndərmədən əvvəl mesaj mətni redaktə edilə bilər?", answer: "Bəli, əvvəlcədən doldurulmuş mətn telefonun öz mesajlaşma tətbiqində açılır və orada redaktə edilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, gönderilmeye hazır, önceden yazılmış bir metin mesajı açan bir QR kod oluşturur.",
      valueProposition: "Araç yayına girdiğinde insanların size mesaj atmasını hızlandırın.",
      benefits: ["Mesaj metni önceden doldurulur", "Gönderenin yazmasına gerek kalmaz", "Ücretsiz kullanım"],
      howToSteps: ["Telefon numarasını ve mesajı girin", "QR kodu oluşturun", "Hızlı bir yanıtın işe yaradığı yerde paylaşın"],
      useCases: ["Mesajla hızlı geri bildirim toplama", "SMS ile sipariş onayını kolaylaştırma", "Bir etkinlikte size ulaşmanın hızlı yolunu paylaşma"],
      faq: [
        { question: "Göndermeden önce mesaj metni düzenlenebilir mi?", answer: "Evet, önceden doldurulmuş metin telefonun kendi mesajlaşma uygulamasında açılır ve orada düzenlenebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "whatsapp-qr": {
    en: {
      introduction: "This tool creates a QR code that opens a WhatsApp conversation with a chosen number.",
      valueProposition: "Make it one scan away for people to message you on WhatsApp once the tool is live.",
      benefits: ["Opens a chat directly", "No need to save the number first", "Free to use"],
      howToSteps: ["Enter the WhatsApp number", "Generate the QR code", "Display it where customers or contacts can scan it"],
      useCases: ["Adding WhatsApp contact to a storefront", "Making customer support easier to reach", "Sharing a quick way to chat at an event"],
      faq: [
        { question: "Does the person need to save the number first?", answer: "No, scanning the code opens the chat directly without saving the contact." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət seçilmiş nömrə ilə WhatsApp söhbətini açan QR kod yaradır.",
      valueProposition: "Alət aktiv olduqda insanların sizə WhatsApp-da yazmasını bir skana endirin.",
      benefits: ["Söhbəti birbaşa açır", "Nömrəni əvvəlcədən saxlamağa ehtiyac yoxdur", "Pulsuz istifadə"],
      howToSteps: ["WhatsApp nömrəsini daxil edin", "QR kodu yaradın", "Müştərilərin skan edə biləcəyi yerdə göstərin"],
      useCases: ["Mağazaya WhatsApp əlaqəsi əlavə etmək", "Müştəri dəstəyinə çatmağı asanlaşdırmaq", "Tədbirdə sürətli söhbət yolunu paylaşmaq"],
      faq: [
        { question: "İnsan əvvəlcə nömrəni yadda saxlamalıdır?", answer: "Xeyr, kodu skan etmək əlaqəni saxlamadan birbaşa söhbəti açır." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, seçilen bir numarayla WhatsApp sohbetini açan bir QR kod oluşturur.",
      valueProposition: "Araç yayına girdiğinde insanların size WhatsApp'tan yazmasını tek bir taramaya indirin.",
      benefits: ["Sohbeti doğrudan açar", "Numarayı önceden kaydetmeye gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["WhatsApp numarasını girin", "QR kodu oluşturun", "Müşterilerin taratabileceği yerde gösterin"],
      useCases: ["Mağazaya WhatsApp iletişimi ekleme", "Müşteri desteğine ulaşmayı kolaylaştırma", "Bir etkinlikte hızlı sohbet yolunu paylaşma"],
      faq: [
        { question: "Kişinin önce numarayı kaydetmesi gerekir mi?", answer: "Hayır, kodu taratmak kişiyi kaydetmeden sohbeti doğrudan açar." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "phone-qr": {
    en: {
      introduction: "This tool creates a QR code that starts a phone call to a chosen number when scanned.",
      valueProposition: "Turn a phone number into a one-tap call once the tool is live.",
      benefits: ["Starts the call directly", "No need to type the number", "Free to use"],
      howToSteps: ["Enter the phone number", "Generate the QR code", "Display it where a quick call is useful"],
      useCases: ["Adding a click-to-call code to a service van", "Making it easy to call support from packaging", "Sharing a fast way to call at an event booth"],
      faq: [
        { question: "Does scanning the code call the number automatically?", answer: "Scanning opens the phone's dialer with the number ready, and calling still needs the user to confirm." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət skan edildikdə seçilmiş nömrəyə zəng başladan QR kod yaradır.",
      valueProposition: "Alət aktiv olduqda telefon nömrəsini bir toxunuşla zəngə çevirin.",
      benefits: ["Zəngi birbaşa başladır", "Nömrəni yazmağa ehtiyac yoxdur", "Pulsuz istifadə"],
      howToSteps: ["Telefon nömrəsini daxil edin", "QR kodu yaradın", "Sürətli zəngin faydalı olduğu yerdə göstərin"],
      useCases: ["Xidmət avtomobilinə klikləyib-zəng kodu əlavə etmək", "Qablaşdırmadan dəstəyə zəng etməyi asanlaşdırmaq", "Tədbir stendində sürətli zəng yolunu paylaşmaq"],
      faq: [
        { question: "Kodu skan etmək nömrəyə avtomatik zəng edir?", answer: "Skan etmək telefonun yığım ekranını nömrə ilə hazır açır, zəng üçün istifadəçinin təsdiqi lazımdır." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, taratıldığında seçilen bir numarayı arayan bir QR kod oluşturur.",
      valueProposition: "Araç yayına girdiğinde bir telefon numarasını tek dokunuşla aramaya dönüştürün.",
      benefits: ["Aramayı doğrudan başlatır", "Numarayı yazmaya gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["Telefon numarasını girin", "QR kodu oluşturun", "Hızlı bir aramanın işe yaradığı yerde gösterin"],
      useCases: ["Bir servis aracına tıkla-ara kodu ekleme", "Ambalajdan desteği aramayı kolaylaştırma", "Bir etkinlik standında hızlı arama yolunu paylaşma"],
      faq: [
        { question: "Kodu taratmak numarayı otomatik olarak arar mı?", answer: "Taratmak telefonun arama ekranını numarayla hazır açar, aramak için kullanıcının onayı gerekir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "location-qr": {
    en: {
      introduction: "This tool creates a QR code that opens a specific map location when scanned.",
      valueProposition: "Share directions to any place with a single scan once the tool is live.",
      benefits: ["Opens the exact location on a map", "No address typing needed", "Free to use"],
      howToSteps: ["Enter the address or coordinates", "Generate the QR code", "Display it wherever directions are useful"],
      useCases: ["Adding directions to a store on a flyer", "Sharing an event venue location", "Making it easy to find an office entrance"],
      faq: [
        { question: "Which map app opens when the code is scanned?", answer: "It typically opens the device's default maps app." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət skan edildikdə konkret xəritə məkanını açan QR kod yaradır.",
      valueProposition: "Alət aktiv olduqda bir skanla istənilən yerə yol tərifini paylaşın.",
      benefits: ["Xəritədə dəqiq məkanı açır", "Ünvan yazmağa ehtiyac yoxdur", "Pulsuz istifadə"],
      howToSteps: ["Ünvanı və ya koordinatları daxil edin", "QR kodu yaradın", "Yol tərifinin faydalı olduğu yerdə göstərin"],
      useCases: ["Vərəqəyə mağazaya yol tərifi əlavə etmək", "Tədbir məkanının ünvanını paylaşmaq", "Ofis girişini tapmağı asanlaşdırmaq"],
      faq: [
        { question: "Kod skan edildikdə hansı xəritə tətbiqi açılır?", answer: "Adətən cihazın standart xəritə tətbiqi açılır." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, taratıldığında belirli bir harita konumunu açan bir QR kod oluşturur.",
      valueProposition: "Araç yayına girdiğinde herhangi bir yere yol tarifini tek bir taramayla paylaşın.",
      benefits: ["Haritada tam konumu açar", "Adres yazmaya gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["Adresi veya koordinatları girin", "QR kodu oluşturun", "Yol tarifinin işe yaradığı yerde gösterin"],
      useCases: ["Bir broşüre mağazaya yol tarifi ekleme", "Bir etkinlik mekanının konumunu paylaşma", "Ofis girişini bulmayı kolaylaştırma"],
      faq: [
        { question: "Kod taratıldığında hangi harita uygulaması açılır?", answer: "Genellikle cihazın varsayılan harita uygulaması açılır." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "calendar-qr": {
    en: {
      introduction: "This tool creates a QR code that adds an event straight to a guest's calendar.",
      valueProposition: "Share event details without back-and-forth messages once the tool is live.",
      benefits: ["Adds date, time and details at once", "No manual calendar entry needed", "Free to use"],
      howToSteps: ["Enter the event details", "Generate the QR code", "Share it on an invite or announcement"],
      useCases: ["Adding a QR code to a wedding invitation", "Sharing a meeting invite at work", "Promoting an event on printed materials"],
      faq: [
        { question: "Does the code work with any calendar app?", answer: "It's designed to work with common calendar apps on phones and computers." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət tədbiri birbaşa qonağın təqviminə əlavə edən QR kod yaradır.",
      valueProposition: "Alət aktiv olduqda tədbir detallarını uzun yazışma olmadan paylaşın.",
      benefits: ["Tarix, vaxt və detalları birlikdə əlavə edir", "Əl ilə təqvimə yazmağa ehtiyac yoxdur", "Pulsuz istifadə"],
      howToSteps: ["Tədbir detallarını daxil edin", "QR kodu yaradın", "Dəvətnamədə və ya elanda paylaşın"],
      useCases: ["Toy dəvətnaməsinə QR kod əlavə etmək", "İşdə görüş dəvətini paylaşmaq", "Çap materiallarında tədbiri tanıtmaq"],
      faq: [
        { question: "Kod istənilən təqvim tətbiqi ilə işləyir?", answer: "O, telefon və kompüterlərdə geniş yayılmış təqvim tətbiqləri ilə işləmək üçün nəzərdə tutulub." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir etkinliği doğrudan misafirin takvimine ekleyen bir QR kod oluşturur.",
      valueProposition: "Araç yayına girdiğinde etkinlik bilgilerini uzun yazışmalar olmadan paylaşın.",
      benefits: ["Tarih, saat ve ayrıntıları birlikte ekler", "Elle takvime girmeye gerek yok", "Ücretsiz kullanım"],
      howToSteps: ["Etkinlik bilgilerini girin", "QR kodu oluşturun", "Davetiye veya duyuruda paylaşın"],
      useCases: ["Bir düğün davetiyesine QR kod ekleme", "İşte bir toplantı davetini paylaşma", "Basılı materyallerde bir etkinliği tanıtma"],
      faq: [
        { question: "Kod her takvim uygulamasıyla çalışır mı?", answer: "Telefon ve bilgisayarlardaki yaygın takvim uygulamalarıyla çalışacak şekilde tasarlanmıştır." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "pdf-merge": {
    en: {
      introduction: "PDF merging combines two or more separate PDF files into a single document.",
      valueProposition: "Bring scattered PDF files together into one document once the tool is live.",
      benefits: ["Combines files in the order you choose", "Keeps everything in one document", "Free to use"],
      howToSteps: ["Add the PDF files to merge", "Arrange them in the order you want", "Combine them into a single PDF"],
      useCases: ["Combining chapters into one report", "Merging scanned pages into a single file", "Putting multiple invoices into one document"],
      faq: [
        { question: "Can files be reordered before merging?", answer: "Yes, the files can be arranged in any order before combining them." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "PDF birləşdirmə iki və ya daha çox ayrı PDF faylını tək sənəddə birləşdirir.",
      valueProposition: "Alət aktiv olduqda dağınıq PDF faylları tək sənəddə toplayın.",
      benefits: ["Faylları seçdiyiniz sırada birləşdirir", "Hər şeyi tək sənəddə saxlayır", "Pulsuz istifadə"],
      howToSteps: ["Birləşdiriləcək PDF fayllarını əlavə edin", "Onları istədiyiniz sırada düzün", "Tək PDF-də birləşdirin"],
      useCases: ["Fəsilləri tək hesabatda birləşdirmək", "Skan edilmiş səhifələri tək faylda toplamaq", "Bir neçə fakturanı tək sənəddə cəmləmək"],
      faq: [
        { question: "Birləşdirmədən əvvəl faylların sırası dəyişdirilə bilər?", answer: "Bəli, fayllar birləşdirmədən əvvəl istənilən sırada düzülə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "PDF birleştirme, iki veya daha fazla ayrı PDF dosyasını tek bir belgede birleştirir.",
      valueProposition: "Araç yayına girdiğinde dağınık PDF dosyalarını tek bir belgede toplayın.",
      benefits: ["Dosyaları seçtiğiniz sırada birleştirir", "Her şeyi tek belgede tutar", "Ücretsiz kullanım"],
      howToSteps: ["Birleştirilecek PDF dosyalarını ekleyin", "İstediğiniz sırada düzenleyin", "Tek bir PDF'de birleştirin"],
      useCases: ["Bölümleri tek bir raporda birleştirme", "Taranmış sayfaları tek dosyada toplama", "Birden fazla faturayı tek belgede birleştirme"],
      faq: [
        { question: "Birleştirmeden önce dosyaların sırası değiştirilebilir mi?", answer: "Evet, dosyalar birleştirmeden önce istenilen sırada düzenlenebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "pdf-split": {
    en: {
      introduction: "PDF splitting separates one PDF document into multiple smaller files by page range.",
      valueProposition: "Pull exactly the pages you need out of a larger PDF once the tool is live.",
      benefits: ["Extracts specific page ranges", "Creates smaller, focused files", "Free to use"],
      howToSteps: ["Upload the PDF to split", "Choose the page ranges", "Save each part as a separate file"],
      useCases: ["Extracting one chapter from a long document", "Separating a contract's signature page", "Splitting a scanned batch into individual files"],
      faq: [
        { question: "Can I choose exactly which pages to extract?", answer: "Yes, specific page ranges can be selected before splitting." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "PDF bölmə bir PDF sənədini səhifə aralığına görə bir neçə kiçik fayla ayırır.",
      valueProposition: "Alət aktiv olduqda böyük PDF-dən yalnız lazım olan səhifələri çıxarın.",
      benefits: ["Konkret səhifə aralığını çıxarır", "Kiçik, məqsədyönlü fayllar yaradır", "Pulsuz istifadə"],
      howToSteps: ["Bölünəcək PDF-i yükləyin", "Səhifə aralığını seçin", "Hər hissəni ayrı fayl kimi saxlayın"],
      useCases: ["Uzun sənəddən bir fəsli çıxarmaq", "Müqavilənin imza səhifəsini ayırmaq", "Skan edilmiş toplu sənədi ayrı fayllara bölmək"],
      faq: [
        { question: "Hansı səhifələrin çıxarılacağını dəqiq seçə bilərəm?", answer: "Bəli, bölmədən əvvəl konkret səhifə aralıqları seçilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "PDF bölme, bir PDF belgesini sayfa aralığına göre birden fazla küçük dosyaya ayırır.",
      valueProposition: "Araç yayına girdiğinde büyük bir PDF'den tam ihtiyacınız olan sayfaları çıkarın.",
      benefits: ["Belirli sayfa aralıklarını çıkarır", "Küçük, odaklı dosyalar oluşturur", "Ücretsiz kullanım"],
      howToSteps: ["Bölünecek PDF'yi yükleyin", "Sayfa aralıklarını seçin", "Her bölümü ayrı dosya olarak kaydedin"],
      useCases: ["Uzun bir belgeden bir bölümü çıkarma", "Bir sözleşmenin imza sayfasını ayırma", "Taranmış bir grubu ayrı dosyalara bölme"],
      faq: [
        { question: "Hangi sayfaların çıkarılacağını tam olarak seçebilir miyim?", answer: "Evet, bölmeden önce belirli sayfa aralıkları seçilebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "pdf-compress": {
    en: {
      introduction: "PDF compression reduces a file's size while keeping it readable, often because scanned images make PDFs large.",
      valueProposition: "Make a large PDF easier to email and store once the tool is live.",
      benefits: ["Smaller file size for sharing", "Keeps the document readable", "Free to use"],
      howToSteps: ["Upload the PDF to compress", "Let the tool reduce its file size", "Download the smaller file"],
      useCases: ["Fitting a PDF under an email attachment limit", "Saving storage space for scanned documents", "Speeding up uploads to a website form"],
      faq: [
        { question: "Why do PDFs with scanned pages get so large?", answer: "Scanned pages are stored as images, which take up much more space than typed text." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "PDF sıxma faylın oxunaqlı qalmasını təmin edərək ölçüsünü azaldır; adətən skan edilmiş şəkillər PDF-i böyük edir.",
      valueProposition: "Alət aktiv olduqda böyük PDF-i e-poçt və saxlama üçün asanlaşdırın.",
      benefits: ["Paylaşım üçün kiçik fayl ölçüsü", "Sənədi oxunaqlı saxlayır", "Pulsuz istifadə"],
      howToSteps: ["Sıxılacaq PDF-i yükləyin", "Alətin fayl ölçüsünü azaltmasına icazə verin", "Kiçik faylı yükləyin"],
      useCases: ["PDF-i e-poçt əlavəsi limitinə salmaq", "Skan edilmiş sənədlər üçün yer qənaət etmək", "Veb sayt formasına yükləməni sürətləndirmək"],
      faq: [
        { question: "Nə üçün skan edilmiş səhifəli PDF-lər bu qədər böyük olur?", answer: "Skan edilmiş səhifələr şəkil kimi saxlanılır və bu, yazılmış mətndən qat-qat çox yer tutur." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "PDF sıkıştırma, dosyayı okunabilir tutarken boyutunu küçültür; genellikle taranmış görseller PDF'yi büyütür.",
      valueProposition: "Araç yayına girdiğinde büyük bir PDF'yi e-postayla göndermeyi ve depolamayı kolaylaştırın.",
      benefits: ["Paylaşım için daha küçük dosya boyutu", "Belgeyi okunabilir tutar", "Ücretsiz kullanım"],
      howToSteps: ["Sıkıştırılacak PDF'yi yükleyin", "Aracın dosya boyutunu küçültmesine izin verin", "Küçültülmüş dosyayı indirin"],
      useCases: ["Bir PDF'yi e-posta eki sınırına sığdırma", "Taranmış belgeler için depolama alanından tasarruf etme", "Bir web sitesi formuna yüklemeyi hızlandırma"],
      faq: [
        { question: "Taranmış sayfalı PDF'ler neden bu kadar büyük olur?", answer: "Taranmış sayfalar görsel olarak saklanır ve bu, yazılmış metinden çok daha fazla yer kaplar." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "pdf-to-jpg": {
    en: {
      introduction: "This tool converts each page of a PDF into a separate JPG image file.",
      valueProposition: "Turn PDF pages into shareable images once the tool is live.",
      benefits: ["One JPG per page", "Good for sharing on platforms that expect images", "Free to use"],
      howToSteps: ["Upload the PDF to convert", "Let the tool convert each page", "Download the JPG images"],
      useCases: ["Sharing a document page on social media", "Inserting a PDF page into a presentation", "Previewing a page without opening a PDF viewer"],
      faq: [
        { question: "Does every page become its own image?", answer: "Yes, each page is converted into a separate JPG file." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət PDF-in hər səhifəsini ayrı JPG şəkil faylına çevirir.",
      valueProposition: "Alət aktiv olduqda PDF səhifələrini paylaşıla bilən şəkillərə çevirin.",
      benefits: ["Hər səhifə üçün bir JPG", "Şəkil tələb edən platformalarda paylaşım üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Çevriləcək PDF-i yükləyin", "Alətin hər səhifəni çevirməsinə icazə verin", "JPG şəkilləri yükləyin"],
      useCases: ["Sənəd səhifəsini sosial mediada paylaşmaq", "PDF səhifəsini təqdimata əlavə etmək", "PDF proqramı açmadan səhifəyə baxmaq"],
      faq: [
        { question: "Hər səhifə öz şəklinə çevrilir?", answer: "Bəli, hər səhifə ayrı JPG faylına çevrilir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir PDF'nin her sayfasını ayrı bir JPG görsel dosyasına dönüştürür.",
      valueProposition: "Araç yayına girdiğinde PDF sayfalarını paylaşılabilir görsellere dönüştürün.",
      benefits: ["Her sayfa için bir JPG", "Görsel bekleyen platformlarda paylaşım için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Dönüştürülecek PDF'yi yükleyin", "Aracın her sayfayı dönüştürmesine izin verin", "JPG görselleri indirin"],
      useCases: ["Bir belge sayfasını sosyal medyada paylaşma", "Bir PDF sayfasını sunuma ekleme", "PDF görüntüleyici açmadan sayfayı önizleme"],
      faq: [
        { question: "Her sayfa kendi görseline mi dönüşür?", answer: "Evet, her sayfa ayrı bir JPG dosyasına dönüştürülür." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "jpg-to-pdf": {
    en: {
      introduction: "This tool combines one or more JPG images into a single PDF document.",
      valueProposition: "Turn photos into one shareable PDF once the tool is live.",
      benefits: ["Combines multiple images into one file", "Keeps images in your chosen order", "Free to use"],
      howToSteps: ["Add the JPG images to include", "Arrange them in order", "Combine them into a single PDF"],
      useCases: ["Turning scanned photos into one document", "Submitting multiple photo pages as one file", "Creating a simple photo-based PDF report"],
      faq: [
        { question: "Can multiple images be combined into one PDF?", answer: "Yes, several JPG images can be combined into a single multi-page PDF." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət bir və ya bir neçə JPG şəklini tək PDF sənədində birləşdirir.",
      valueProposition: "Alət aktiv olduqda fotoları tək paylaşıla bilən PDF-ə çevirin.",
      benefits: ["Bir neçə şəkli tək faylda birləşdirir", "Şəkilləri seçdiyiniz sırada saxlayır", "Pulsuz istifadə"],
      howToSteps: ["Daxil ediləcək JPG şəkillərini əlavə edin", "Onları sırayla düzün", "Tək PDF-də birləşdirin"],
      useCases: ["Skan edilmiş fotoları tək sənədə çevirmək", "Bir neçə foto səhifəsini tək fayl kimi təqdim etmək", "Sadə foto əsaslı PDF hesabatı yaratmaq"],
      faq: [
        { question: "Bir neçə şəkil tək PDF-də birləşdirilə bilər?", answer: "Bəli, bir neçə JPG şəkli tək çox səhifəli PDF-də birləşdirilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir veya birden fazla JPG görselini tek bir PDF belgesinde birleştirir.",
      valueProposition: "Araç yayına girdiğinde fotoğrafları tek bir paylaşılabilir PDF'ye dönüştürün.",
      benefits: ["Birden fazla görseli tek dosyada birleştirir", "Görselleri seçtiğiniz sırada tutar", "Ücretsiz kullanım"],
      howToSteps: ["Eklenecek JPG görsellerini ekleyin", "Sırayla düzenleyin", "Tek bir PDF'de birleştirin"],
      useCases: ["Taranmış fotoğrafları tek belgeye dönüştürme", "Birden fazla fotoğraf sayfasını tek dosya olarak sunma", "Basit fotoğraf tabanlı bir PDF raporu oluşturma"],
      faq: [
        { question: "Birden fazla görsel tek bir PDF'de birleştirilebilir mi?", answer: "Evet, birkaç JPG görseli tek bir çok sayfalı PDF'de birleştirilebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "pdf-to-word": {
    en: {
      introduction: "This tool converts a PDF document into an editable Word file.",
      valueProposition: "Make PDF text editable again once the tool is live.",
      benefits: ["Text becomes editable", "Saves retyping the document", "Free to use"],
      howToSteps: ["Upload the PDF to convert", "Let the tool extract the text and layout", "Download the Word file"],
      useCases: ["Editing an old contract stored only as a PDF", "Updating a resume that's only available as a PDF", "Reusing PDF content in a new document"],
      faq: [
        { question: "Does conversion always preserve exact formatting?", answer: "Well-structured PDFs usually convert cleanly; complex layouts or scanned pages may need some manual cleanup." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət PDF sənədini redaktə edilə bilən Word faylına çevirir.",
      valueProposition: "Alət aktiv olduqda PDF mətnini yenidən redaktə edilə bilən edin.",
      benefits: ["Mətn redaktə edilə bilən olur", "Sənədi yenidən yazmağa ehtiyac qalmır", "Pulsuz istifadə"],
      howToSteps: ["Çevriləcək PDF-i yükləyin", "Alətin mətni və düzəni çıxarmasına icazə verin", "Word faylını yükləyin"],
      useCases: ["Yalnız PDF kimi saxlanılan köhnə müqaviləni redaktə etmək", "Yalnız PDF formatında olan CV-ni yeniləmək", "PDF məzmununu yeni sənəddə istifadə etmək"],
      faq: [
        { question: "Çevirmə həmişə formatı dəqiq saxlayır?", answer: "Yaxşı strukturlaşdırılmış PDF-lər adətən təmiz çevrilir; mürəkkəb düzən və ya skan edilmiş səhifələr üçün əl ilə düzəliş lazım ola bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir PDF belgesini düzenlenebilir bir Word dosyasına dönüştürür.",
      valueProposition: "Araç yayına girdiğinde PDF metnini yeniden düzenlenebilir hale getirin.",
      benefits: ["Metin düzenlenebilir hale gelir", "Belgeyi yeniden yazmaya gerek kalmaz", "Ücretsiz kullanım"],
      howToSteps: ["Dönüştürülecek PDF'yi yükleyin", "Aracın metni ve düzeni çıkarmasına izin verin", "Word dosyasını indirin"],
      useCases: ["Yalnızca PDF olarak saklanan eski bir sözleşmeyi düzenleme", "Yalnızca PDF olarak bulunan bir özgeçmişi güncelleme", "PDF içeriğini yeni bir belgede yeniden kullanma"],
      faq: [
        { question: "Dönüştürme her zaman biçimlendirmeyi tam olarak korur mu?", answer: "İyi yapılandırılmış PDF'ler genellikle temiz dönüşür; karmaşık düzenler veya taranmış sayfalar biraz manuel düzenleme gerektirebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "pdf-to-excel": {
    en: {
      introduction: "This tool extracts suitable tables from a PDF document into an Excel file.",
      valueProposition: "Turn PDF tables into editable spreadsheets once the tool is live.",
      benefits: ["Extracts table data", "Makes numbers usable in a spreadsheet", "Free to use"],
      howToSteps: ["Upload the PDF containing the table", "Let the tool extract the table data", "Download the Excel file"],
      useCases: ["Getting a financial report's table into a spreadsheet", "Reusing a PDF price list for calculations", "Analyzing exported data that only exists as a PDF"],
      faq: [
        { question: "Does this work on every PDF table?", answer: "It works best on clearly structured tables; scanned or unusually formatted tables may need review after conversion." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət PDF sənədindəki uyğun cədvəlləri Excel faylına çıxarır.",
      valueProposition: "Alət aktiv olduqda PDF cədvəllərini redaktə edilə bilən cədvələ çevirin.",
      benefits: ["Cədvəl məlumatını çıxarır", "Rəqəmləri cədvəldə istifadəyə hazır edir", "Pulsuz istifadə"],
      howToSteps: ["Cədvəl olan PDF-i yükləyin", "Alətin cədvəl məlumatını çıxarmasına icazə verin", "Excel faylını yükləyin"],
      useCases: ["Maliyyə hesabatının cədvəlini cədvələ köçürmək", "PDF qiymət siyahısını hesablamalar üçün yenidən istifadə etmək", "Yalnız PDF kimi olan ixrac məlumatını təhlil etmək"],
      faq: [
        { question: "Bu, hər PDF cədvəli üçün işləyir?", answer: "O, aydın strukturlaşdırılmış cədvəllərdə ən yaxşı işləyir; skan edilmiş və ya qeyri-adi formatlaşdırılmış cədvəllər çevirmədən sonra yoxlama tələb edə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir PDF belgesindeki uygun tabloları bir Excel dosyasına çıkarır.",
      valueProposition: "Araç yayına girdiğinde PDF tablolarını düzenlenebilir tablolara dönüştürün.",
      benefits: ["Tablo verisini çıkarır", "Sayıları tabloda kullanılabilir hale getirir", "Ücretsiz kullanım"],
      howToSteps: ["Tablo içeren PDF'yi yükleyin", "Aracın tablo verisini çıkarmasına izin verin", "Excel dosyasını indirin"],
      useCases: ["Bir mali raporun tablosunu tabloya aktarma", "Bir PDF fiyat listesini hesaplamalar için yeniden kullanma", "Yalnızca PDF olarak bulunan dışa aktarılmış veriyi analiz etme"],
      faq: [
        { question: "Bu, her PDF tablosunda çalışır mı?", answer: "Açıkça yapılandırılmış tablolarda en iyi sonucu verir; taranmış veya alışılmadık biçimlendirilmiş tablolar dönüştürmeden sonra gözden geçirme gerektirebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "pdf-rotate": {
    en: {
      introduction: "This tool rotates one or all pages of a PDF to fix their orientation.",
      valueProposition: "Fix sideways or upside-down pages once the tool is live.",
      benefits: ["Rotates single pages or the whole document", "Corrects scanning mistakes", "Free to use"],
      howToSteps: ["Upload the PDF to fix", "Choose which pages to rotate and by how much", "Save the corrected PDF"],
      useCases: ["Fixing a sideways-scanned contract page", "Correcting an upside-down page in a report", "Preparing a document for printing correctly"],
      faq: [
        { question: "Can only specific pages be rotated?", answer: "Yes, individual pages or the whole document can be rotated." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət PDF-in bir və ya bütün səhifələrini döndürərək istiqamətini düzəldir.",
      valueProposition: "Alət aktiv olduqda yan və ya baş-ayaq səhifələri düzəldin.",
      benefits: ["Tək səhifəni və ya bütün sənədi döndürür", "Skan xətalarını düzəldir", "Pulsuz istifadə"],
      howToSteps: ["Düzəldiləcək PDF-i yükləyin", "Hansı səhifələrin nə qədər döndürüləcəyini seçin", "Düzəldilmiş PDF-i saxlayın"],
      useCases: ["Yan skan edilmiş müqavilə səhifəsini düzəltmək", "Hesabatda baş-ayaq səhifəni düzəltmək", "Sənədi düzgün çap üçün hazırlamaq"],
      faq: [
        { question: "Yalnız konkret səhifələr döndürülə bilər?", answer: "Bəli, ayrı-ayrı səhifələr və ya bütün sənəd döndürülə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, yönlerini düzeltmek için bir PDF'nin bir veya tüm sayfalarını döndürür.",
      valueProposition: "Araç yayına girdiğinde yan veya baş aşağı sayfaları düzeltin.",
      benefits: ["Tek sayfayı veya tüm belgeyi döndürür", "Tarama hatalarını düzeltir", "Ücretsiz kullanım"],
      howToSteps: ["Düzeltilecek PDF'yi yükleyin", "Hangi sayfaların ne kadar döndürüleceğini seçin", "Düzeltilmiş PDF'yi kaydedin"],
      useCases: ["Yan taranmış bir sözleşme sayfasını düzeltme", "Bir rapordaki baş aşağı sayfayı düzeltme", "Bir belgeyi doğru yazdırmak için hazırlama"],
      faq: [
        { question: "Yalnızca belirli sayfalar döndürülebilir mi?", answer: "Evet, tek tek sayfalar veya tüm belge döndürülebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "image-resize": {
    en: {
      introduction: "Image resizing changes a photo's pixel dimensions to fit a specific width and height.",
      valueProposition: "Get a photo to exactly the size you need once the tool is live.",
      benefits: ["Sets an exact pixel width and height", "Works for web, social and print sizes", "Free to use"],
      howToSteps: ["Upload the image to resize", "Enter the target dimensions", "Download the resized image"],
      useCases: ["Fitting a photo to a social media post's required size", "Preparing an image for a website", "Meeting a print size requirement"],
      faq: [
        { question: "Does resizing keep the image's aspect ratio?", answer: "An aspect ratio can typically be locked or adjusted freely, depending on what the result needs." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Şəkil ölçüləndirmə fotonun piksel ölçülərini konkret en və hündürlüyə uyğunlaşdırır.",
      valueProposition: "Alət aktiv olduqda fotonu tam lazım olan ölçüyə gətirin.",
      benefits: ["Dəqiq piksel eni və hündürlüyü təyin edir", "Veb, sosial media və çap ölçüləri üçün işləyir", "Pulsuz istifadə"],
      howToSteps: ["Ölçüləndiriləcək şəkli yükləyin", "Hədəf ölçüləri daxil edin", "Ölçüləndirilmiş şəkli yükləyin"],
      useCases: ["Fotonu sosial media postunun tələb etdiyi ölçüyə salmaq", "Şəkli veb sayt üçün hazırlamaq", "Çap ölçüsü tələbini qarşılamaq"],
      faq: [
        { question: "Ölçüləndirmə şəklin nisbətini saxlayır?", answer: "Nisbət nəticənin ehtiyacına görə adətən kilidlənə və ya sərbəst dəyişdirilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Görsel boyutlandırma, bir fotoğrafın piksel boyutlarını belirli bir genişlik ve yüksekliğe uyacak şekilde değiştirir.",
      valueProposition: "Araç yayına girdiğinde bir fotoğrafı tam ihtiyacınız olan boyuta getirin.",
      benefits: ["Tam piksel genişliği ve yüksekliği belirler", "Web, sosyal medya ve baskı boyutları için çalışır", "Ücretsiz kullanım"],
      howToSteps: ["Boyutlandırılacak görseli yükleyin", "Hedef boyutları girin", "Boyutlandırılmış görseli indirin"],
      useCases: ["Bir fotoğrafı sosyal medya gönderisinin gerektirdiği boyuta getirme", "Bir görseli web sitesi için hazırlama", "Bir baskı boyutu gereksinimini karşılama"],
      faq: [
        { question: "Boyutlandırma görselin en-boy oranını korur mu?", answer: "En-boy oranı, sonucun ihtiyacına göre genellikle kilitlenebilir veya serbestçe değiştirilebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "image-compress": {
    en: {
      introduction: "Image compression reduces a photo's file size, which is useful because high-resolution photos can be quite large.",
      valueProposition: "Make images load faster and take up less space once the tool is live.",
      benefits: ["Smaller file size for the web", "Faster page loading when used on a site", "Free to use"],
      howToSteps: ["Upload the image to compress", "Let the tool reduce its file size", "Download the compressed image"],
      useCases: ["Speeding up a website by compressing its images", "Fitting a photo under an upload size limit", "Reducing storage used by a photo library"],
      faq: [
        { question: "Does compressing an image reduce its visible quality?", answer: "Compression aims to keep images clear enough for typical use while reducing file size." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Şəkil sıxma foto fayl ölçüsünü azaldır; bu, yüksək keyfiyyətli fotoların kifayət qədər böyük ola bilməsi səbəbindən faydalıdır.",
      valueProposition: "Alət aktiv olduqda şəkilləri daha sürətli yüklənən və az yer tutan edin.",
      benefits: ["Veb üçün kiçik fayl ölçüsü", "Saytda istifadə edildikdə daha sürətli yüklənmə", "Pulsuz istifadə"],
      howToSteps: ["Sıxılacaq şəkli yükləyin", "Alətin fayl ölçüsünü azaltmasına icazə verin", "Sıxılmış şəkli yükləyin"],
      useCases: ["Veb saytı şəkilləri sıxaraq sürətləndirmək", "Fotonu yükləmə ölçüsü limitinə salmaq", "Foto kolleksiyasının tutduğu yeri azaltmaq"],
      faq: [
        { question: "Şəkli sıxmaq görünən keyfiyyəti azaldır?", answer: "Sıxma fayl ölçüsünü azaldarkən şəkilləri adi istifadə üçün kifayət qədər aydın saxlamağı hədəfləyir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Görsel sıkıştırma, bir fotoğrafın dosya boyutunu küçültür; bu, yüksek çözünürlüklü fotoğrafların oldukça büyük olabilmesi nedeniyle faydalıdır.",
      valueProposition: "Araç yayına girdiğinde görsellerin daha hızlı yüklenmesini ve daha az yer kaplamasını sağlayın.",
      benefits: ["Web için daha küçük dosya boyutu", "Bir sitede kullanıldığında daha hızlı sayfa yükleme", "Ücretsiz kullanım"],
      howToSteps: ["Sıkıştırılacak görseli yükleyin", "Aracın dosya boyutunu küçültmesine izin verin", "Sıkıştırılmış görseli indirin"],
      useCases: ["Görselleri sıkıştırarak bir web sitesini hızlandırma", "Bir fotoğrafı yükleme boyutu sınırına sığdırma", "Bir fotoğraf kitaplığının kapladığı alanı azaltma"],
      faq: [
        { question: "Bir görseli sıkıştırmak görünür kalitesini düşürür mü?", answer: "Sıkıştırma, dosya boyutunu küçültürken görselleri normal kullanım için yeterince net tutmayı hedefler." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "image-converter": {
    en: {
      introduction: "This tool converts an image between popular formats like JPG, PNG and WebP.",
      valueProposition: "Get any image into the format you actually need once the tool is live.",
      benefits: ["Supports several common formats", "Handles single or batch conversion", "Free to use"],
      howToSteps: ["Upload the image to convert", "Choose the target format", "Download the converted image"],
      useCases: ["Converting a photo to the format a website requires", "Preparing images for a specific app or platform", "Standardizing a batch of images to one format"],
      faq: [
        { question: "Which formats can this tool convert between?", answer: "Common formats like JPG, PNG and WebP, among others." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət şəkli JPG, PNG və WebP kimi məşhur formatlar arasında çevirir.",
      valueProposition: "Alət aktiv olduqda istənilən şəkli əsl lazım olan formata gətirin.",
      benefits: ["Bir neçə geniş yayılmış formatı dəstəkləyir", "Tək və ya toplu çevirməni idarə edir", "Pulsuz istifadə"],
      howToSteps: ["Çevriləcək şəkli yükləyin", "Hədəf formatı seçin", "Çevrilmiş şəkli yükləyin"],
      useCases: ["Fotonu veb saytın tələb etdiyi formata çevirmək", "Şəkilləri konkret tətbiq və ya platforma üçün hazırlamaq", "Toplu şəkilləri tək formata standartlaşdırmaq"],
      faq: [
        { question: "Bu alət hansı formatlar arasında çevirə bilər?", answer: "JPG, PNG və WebP kimi geniş yayılmış formatlar və digərləri." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir görseli JPG, PNG ve WebP gibi popüler formatlar arasında dönüştürür.",
      valueProposition: "Araç yayına girdiğinde herhangi bir görseli gerçekten ihtiyacınız olan formata getirin.",
      benefits: ["Birkaç yaygın formatı destekler", "Tekli veya toplu dönüştürmeyi yönetir", "Ücretsiz kullanım"],
      howToSteps: ["Dönüştürülecek görseli yükleyin", "Hedef formatı seçin", "Dönüştürülmüş görseli indirin"],
      useCases: ["Bir fotoğrafı bir web sitesinin gerektirdiği formata dönüştürme", "Görselleri belirli bir uygulama veya platform için hazırlama", "Toplu görselleri tek bir formata standartlaştırma"],
      faq: [
        { question: "Bu araç hangi formatlar arasında dönüştürme yapabilir?", answer: "JPG, PNG ve WebP gibi yaygın formatlar ve diğerleri." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "jpg-to-png": {
    en: {
      introduction: "This tool converts a JPG image into PNG format, which supports transparency.",
      valueProposition: "Get transparency support for a photo once the tool is live.",
      benefits: ["Enables a transparent background", "Keeps image quality high", "Free to use"],
      howToSteps: ["Upload the JPG image", "Convert it to PNG", "Download the PNG file"],
      useCases: ["Preparing a logo that needs a transparent background", "Getting a cleaner image for design software", "Converting a photo for a platform that prefers PNG"],
      faq: [
        { question: "Does converting to PNG add transparency automatically?", answer: "Converting the format alone doesn't remove a background — a separate background-removal step does that." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət JPG şəklini şəffaflığı dəstəkləyən PNG formatına çevirir.",
      valueProposition: "Alət aktiv olduqda foto üçün şəffaflıq dəstəyi əldə edin.",
      benefits: ["Şəffaf fon imkanı verir", "Şəkil keyfiyyətini yüksək saxlayır", "Pulsuz istifadə"],
      howToSteps: ["JPG şəklini yükləyin", "PNG-yə çevirin", "PNG faylını yükləyin"],
      useCases: ["Şəffaf fon tələb edən loqonu hazırlamaq", "Dizayn proqramı üçün daha təmiz şəkil əldə etmək", "PNG-ni üstün tutan platforma üçün foto çevirmək"],
      faq: [
        { question: "PNG-yə çevirmək avtomatik şəffaflıq əlavə edir?", answer: "Yalnız format çevirmə fonu silmir — bunun üçün ayrıca fon silmə addımı lazımdır." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir JPG görseli, şeffaflığı destekleyen PNG formatına dönüştürür.",
      valueProposition: "Araç yayına girdiğinde bir fotoğraf için şeffaflık desteği elde edin.",
      benefits: ["Şeffaf arka plan olanağı sağlar", "Görsel kalitesini yüksek tutar", "Ücretsiz kullanım"],
      howToSteps: ["JPG görseli yükleyin", "PNG'ye dönüştürün", "PNG dosyasını indirin"],
      useCases: ["Şeffaf arka plan gerektiren bir logo hazırlama", "Tasarım yazılımı için daha temiz bir görsel elde etme", "PNG'yi tercih eden bir platform için fotoğraf dönüştürme"],
      faq: [
        { question: "PNG'ye dönüştürmek otomatik olarak şeffaflık ekler mi?", answer: "Yalnızca formatı dönüştürmek arka planı kaldırmaz — bunun için ayrı bir arka plan kaldırma adımı gerekir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "png-to-jpg": {
    en: {
      introduction: "This tool converts a PNG image into JPG format, typically resulting in a smaller file.",
      valueProposition: "Get a smaller, more widely compatible image file once the tool is live.",
      benefits: ["Usually reduces file size", "Widely supported format", "Free to use"],
      howToSteps: ["Upload the PNG image", "Convert it to JPG", "Download the JPG file"],
      useCases: ["Reducing a screenshot's file size before sharing", "Preparing an image for a platform that expects JPG", "Simplifying a PNG that doesn't need transparency"],
      faq: [
        { question: "Will converting to JPG lose the transparent background?", answer: "Yes, JPG doesn't support transparency, so a transparent area becomes a solid color." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət PNG şəklini adətən daha kiçik fayl verən JPG formatına çevirir.",
      valueProposition: "Alət aktiv olduqda daha kiçik, geniş uyğunluğu olan şəkil faylı əldə edin.",
      benefits: ["Adətən fayl ölçüsünü azaldır", "Geniş dəstəklənən format", "Pulsuz istifadə"],
      howToSteps: ["PNG şəklini yükləyin", "JPG-yə çevirin", "JPG faylını yükləyin"],
      useCases: ["Paylaşmadan əvvəl skrinşotun fayl ölçüsünü azaltmaq", "JPG tələb edən platforma üçün şəkil hazırlamaq", "Şəffaflığa ehtiyacı olmayan PNG-ni sadələşdirmək"],
      faq: [
        { question: "JPG-yə çevirmək şəffaf fonu itirəcək?", answer: "Bəli, JPG şəffaflığı dəstəkləmir, ona görə şəffaf sahə düz rəngə çevrilir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir PNG görseli genellikle daha küçük bir dosyayla sonuçlanan JPG formatına dönüştürür.",
      valueProposition: "Araç yayına girdiğinde daha küçük, daha geniş uyumlu bir görsel dosyası elde edin.",
      benefits: ["Genellikle dosya boyutunu küçültür", "Yaygın olarak desteklenen format", "Ücretsiz kullanım"],
      howToSteps: ["PNG görseli yükleyin", "JPG'ye dönüştürün", "JPG dosyasını indirin"],
      useCases: ["Paylaşmadan önce bir ekran görüntüsünün dosya boyutunu küçültme", "JPG bekleyen bir platform için görsel hazırlama", "Şeffaflığa ihtiyaç duymayan bir PNG'yi basitleştirme"],
      faq: [
        { question: "JPG'ye dönüştürmek şeffaf arka planı kaybettirir mi?", answer: "Evet, JPG şeffaflığı desteklemez, bu yüzden şeffaf alan düz bir renge dönüşür." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "webp-converter": {
    en: {
      introduction: "This tool converts images to or from the WebP format, a modern format designed for smaller web images.",
      valueProposition: "Move between WebP and more universally supported formats once the tool is live.",
      benefits: ["Converts both to and from WebP", "Good for smaller website images", "Free to use"],
      howToSteps: ["Upload the image to convert", "Choose WebP or the target format", "Download the converted image"],
      useCases: ["Converting website images to WebP for smaller size", "Converting an old WebP image to JPG for compatibility", "Preparing images for platforms with format restrictions"],
      faq: [
        { question: "Why would someone use WebP instead of JPG or PNG?", answer: "WebP often produces smaller files than JPG or PNG at similar quality, which can help website speed." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət şəkilləri veb üçün kiçik ölçü nəzərdə tutulmuş müasir format olan WebP-ə və ya WebP-dən çevirir.",
      valueProposition: "Alət aktiv olduqda WebP və daha universal dəstəklənən formatlar arasında keçin.",
      benefits: ["Həm WebP-ə, həm də WebP-dən çevirir", "Kiçik veb sayt şəkilləri üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Çevriləcək şəkli yükləyin", "WebP və ya hədəf formatı seçin", "Çevrilmiş şəkli yükləyin"],
      useCases: ["Veb sayt şəkillərini kiçik ölçü üçün WebP-ə çevirmək", "Köhnə WebP şəklini uyğunluq üçün JPG-yə çevirmək", "Format məhdudiyyəti olan platformalar üçün şəkilləri hazırlamaq"],
      faq: [
        { question: "Nə üçün kimsə JPG və ya PNG əvəzinə WebP istifadə edər?", answer: "WebP oxşar keyfiyyətdə tez-tez JPG və ya PNG-dən kiçik fayl verir, bu da veb sayt sürətinə kömək edə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, görselleri daha küçük web görselleri için tasarlanmış modern bir format olan WebP'ye veya WebP'den dönüştürür.",
      valueProposition: "Araç yayına girdiğinde WebP ile daha evrensel desteklenen formatlar arasında geçiş yapın.",
      benefits: ["Hem WebP'ye hem de WebP'den dönüştürür", "Daha küçük web sitesi görselleri için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Dönüştürülecek görseli yükleyin", "WebP veya hedef formatı seçin", "Dönüştürülmüş görseli indirin"],
      useCases: ["Web sitesi görsellerini daha küçük boyut için WebP'ye dönüştürme", "Eski bir WebP görselini uyumluluk için JPG'ye dönüştürme", "Format kısıtlaması olan platformlar için görsel hazırlama"],
      faq: [
        { question: "Neden biri JPG veya PNG yerine WebP kullanır?", answer: "WebP, benzer kalitede genellikle JPG veya PNG'den daha küçük dosyalar üretir, bu da web sitesi hızına yardımcı olabilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "image-crop": {
    en: {
      introduction: "Image cropping removes the parts of a photo outside a chosen area, keeping only what's needed.",
      valueProposition: "Focus a photo on exactly the part that matters once the tool is live.",
      benefits: ["Keeps only the selected area", "Good for framing and focus", "Free to use"],
      howToSteps: ["Upload the image to crop", "Select the area to keep", "Download the cropped image"],
      useCases: ["Cropping a photo to a square for a profile picture", "Removing a distracting background element", "Focusing a product photo on the product itself"],
      faq: [
        { question: "Can the crop area be any shape?", answer: "Cropping typically uses a rectangular or square selection area." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Şəkil kəsmə fotonun seçilmiş sahədən kənar hissələrini silərək yalnız lazım olanı saxlayır.",
      valueProposition: "Alət aktiv olduqda fotonu tam əhəmiyyətli hissəyə fokuslayın.",
      benefits: ["Yalnız seçilmiş sahəni saxlayır", "Çərçivələmə və fokus üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Kəsiləcək şəkli yükləyin", "Saxlanılacaq sahəni seçin", "Kəsilmiş şəkli yükləyin"],
      useCases: ["Profil şəkli üçün fotonu kvadrat kəsmək", "Diqqəti yayındıran fon elementini silmək", "Məhsul fotosunu birbaşa məhsula fokuslamaq"],
      faq: [
        { question: "Kəsmə sahəsi istənilən forma ola bilər?", answer: "Kəsmə adətən düzbucaqlı və ya kvadrat seçim sahəsindən istifadə edir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Görsel kırpma, bir fotoğrafın seçilen alan dışındaki kısımlarını kaldırarak yalnızca gerekeni bırakır.",
      valueProposition: "Araç yayına girdiğinde bir fotoğrafı tam önemli olan kısma odaklayın.",
      benefits: ["Yalnızca seçilen alanı korur", "Çerçeveleme ve odaklama için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Kırpılacak görseli yükleyin", "Korunacak alanı seçin", "Kırpılmış görseli indirin"],
      useCases: ["Bir profil fotoğrafı için görseli kare kırpma", "Dikkat dağıtan bir arka plan öğesini kaldırma", "Bir ürün fotoğrafını doğrudan ürüne odaklama"],
      faq: [
        { question: "Kırpma alanı herhangi bir şekilde olabilir mi?", answer: "Kırpma genellikle dikdörtgen veya kare bir seçim alanı kullanır." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "image-rotate": {
    en: {
      introduction: "Image rotation turns a photo to correct its orientation, such as fixing a sideways picture.",
      valueProposition: "Get a photo facing the right way once the tool is live.",
      benefits: ["Fixes sideways or upside-down photos", "Simple orientation correction", "Free to use"],
      howToSteps: ["Upload the image to rotate", "Choose the rotation direction and angle", "Download the corrected image"],
      useCases: ["Fixing a sideways phone photo", "Correcting an upside-down scanned picture", "Adjusting an image before printing"],
      faq: [
        { question: "Can an image be rotated by any angle?", answer: "Common rotations are 90, 180 and 270 degrees, covering most orientation problems." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Şəkil döndürmə fotonun istiqamətini düzəldir, məsələn, yan çəkilmiş şəkli düzəldir.",
      valueProposition: "Alət aktiv olduqda fotonu düzgün istiqamətə gətirin.",
      benefits: ["Yan və ya baş-ayaq fotoları düzəldir", "Sadə istiqamət düzəlişi", "Pulsuz istifadə"],
      howToSteps: ["Döndəriləcək şəkli yükləyin", "Döndürmə istiqamətini və bucağını seçin", "Düzəldilmiş şəkli yükləyin"],
      useCases: ["Yan çəkilmiş telefon fotosunu düzəltmək", "Baş-ayaq skan edilmiş şəkli düzəltmək", "Çapdan əvvəl şəkli tənzimləmək"],
      faq: [
        { question: "Şəkil istənilən bucaqla döndürülə bilər?", answer: "Geniş yayılmış döndürmələr 90, 180 və 270 dərəcədir və əksər istiqamət problemlərini əhatə edir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Görsel döndürme, yan çekilmiş bir fotoğrafı düzeltmek gibi, fotoğrafın yönünü düzeltmek için çevirir.",
      valueProposition: "Araç yayına girdiğinde bir fotoğrafı doğru yöne getirin.",
      benefits: ["Yan veya baş aşağı fotoğrafları düzeltir", "Basit yön düzeltmesi", "Ücretsiz kullanım"],
      howToSteps: ["Döndürülecek görseli yükleyin", "Döndürme yönünü ve açısını seçin", "Düzeltilmiş görseli indirin"],
      useCases: ["Yan çekilmiş bir telefon fotoğrafını düzeltme", "Baş aşağı taranmış bir görseli düzeltme", "Yazdırmadan önce bir görseli ayarlama"],
      faq: [
        { question: "Bir görsel herhangi bir açıyla döndürülebilir mi?", answer: "Yaygın döndürmeler 90, 180 ve 270 derecedir ve çoğu yön sorununu kapsar." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "background-remover": {
    en: {
      introduction: "Background removal isolates the main subject of a photo by removing everything behind it.",
      valueProposition: "Get a clean cutout of your subject once the tool is live.",
      benefits: ["Isolates the main subject", "Useful for product and portrait photos", "Free to use"],
      howToSteps: ["Upload the image", "Let the tool detect and remove the background", "Download the image with the background removed"],
      useCases: ["Preparing a clean product photo for an online store", "Making a transparent logo image", "Isolating a subject for a design project"],
      faq: [
        { question: "Does this work well on any photo?", answer: "Photos with a clear subject and simple background typically give the cleanest results." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Fon silmə fotonun arxasındakı hər şeyi silərək əsas obyekti ayırır.",
      valueProposition: "Alət aktiv olduqda obyektinizin təmiz kəsimini əldə edin.",
      benefits: ["Əsas obyekti ayırır", "Məhsul və portret fotoları üçün faydalıdır", "Pulsuz istifadə"],
      howToSteps: ["Şəkli yükləyin", "Alətin fonu aşkarlayıb silməsinə icazə verin", "Fonu silinmiş şəkli yükləyin"],
      useCases: ["Onlayn mağaza üçün təmiz məhsul fotosu hazırlamaq", "Şəffaf loqo şəkli yaratmaq", "Dizayn layihəsi üçün obyekti ayırmaq"],
      faq: [
        { question: "Bu, istənilən foto üçün yaxşı işləyir?", answer: "Aydın obyekti və sadə fonu olan fotolar adətən ən təmiz nəticəni verir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Arka plan kaldırma, bir fotoğrafın arkasındaki her şeyi kaldırarak ana öğeyi ayırır.",
      valueProposition: "Araç yayına girdiğinde konunuzun temiz bir kesimini elde edin.",
      benefits: ["Ana öğeyi ayırır", "Ürün ve portre fotoğrafları için faydalıdır", "Ücretsiz kullanım"],
      howToSteps: ["Görseli yükleyin", "Aracın arka planı algılayıp kaldırmasına izin verin", "Arka planı kaldırılmış görseli indirin"],
      useCases: ["Bir online mağaza için temiz bir ürün fotoğrafı hazırlama", "Şeffaf bir logo görseli oluşturma", "Bir tasarım projesi için konuyu ayırma"],
      faq: [
        { question: "Bu, her fotoğrafta iyi çalışır mı?", answer: "Net bir konusu ve basit arka planı olan fotoğraflar genellikle en temiz sonucu verir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "image-to-pdf": {
    en: {
      introduction: "This tool combines one or more images into a single PDF document.",
      valueProposition: "Turn a set of photos into one shareable PDF once the tool is live.",
      benefits: ["Combines multiple images into one file", "Works with different image formats", "Free to use"],
      howToSteps: ["Add the images to include", "Arrange them in order", "Combine them into a single PDF"],
      useCases: ["Turning scanned document photos into one PDF", "Submitting several photo pages as one file", "Creating a simple photo-based report"],
      faq: [
        { question: "Can images of different formats be combined?", answer: "Yes, common image formats can be combined into a single PDF." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət bir və ya bir neçə şəkli tək PDF sənədində birləşdirir.",
      valueProposition: "Alət aktiv olduqda foto dəstini tək paylaşıla bilən PDF-ə çevirin.",
      benefits: ["Bir neçə şəkli tək faylda birləşdirir", "Fərqli şəkil formatları ilə işləyir", "Pulsuz istifadə"],
      howToSteps: ["Daxil ediləcək şəkilləri əlavə edin", "Onları sırayla düzün", "Tək PDF-də birləşdirin"],
      useCases: ["Skan edilmiş sənəd fotolarını tək PDF-ə çevirmək", "Bir neçə foto səhifəsini tək fayl kimi təqdim etmək", "Sadə foto əsaslı hesabat yaratmaq"],
      faq: [
        { question: "Fərqli formatlı şəkillər birləşdirilə bilər?", answer: "Bəli, geniş yayılmış şəkil formatları tək PDF-də birləşdirilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir veya birden fazla görseli tek bir PDF belgesinde birleştirir.",
      valueProposition: "Araç yayına girdiğinde bir fotoğraf setini tek bir paylaşılabilir PDF'ye dönüştürün.",
      benefits: ["Birden fazla görseli tek dosyada birleştirir", "Farklı görsel formatlarıyla çalışır", "Ücretsiz kullanım"],
      howToSteps: ["Eklenecek görselleri ekleyin", "Sırayla düzenleyin", "Tek bir PDF'de birleştirin"],
      useCases: ["Taranmış belge fotoğraflarını tek bir PDF'ye dönüştürme", "Birden fazla fotoğraf sayfasını tek dosya olarak sunma", "Basit fotoğraf tabanlı bir rapor oluşturma"],
      faq: [
        { question: "Farklı formatlardaki görseller birleştirilebilir mi?", answer: "Evet, yaygın görsel formatları tek bir PDF'de birleştirilebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "pdf-to-image": {
    en: {
      introduction: "This tool converts each page of a PDF into a separate image file.",
      valueProposition: "Turn PDF pages into standalone pictures once the tool is live.",
      benefits: ["One image per page", "Flexible output for viewing or sharing", "Free to use"],
      howToSteps: ["Upload the PDF to convert", "Let the tool convert each page", "Download the images"],
      useCases: ["Getting a quick picture preview of a PDF page", "Sharing a document page where only images are accepted", "Extracting a diagram or chart from a PDF"],
      faq: [
        { question: "How is this different from PDF to JPG?", answer: "PDF to JPG always outputs JPG specifically; this tool covers image conversion more generally." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Bu alət PDF-in hər səhifəsini ayrı şəkil faylına çevirir.",
      valueProposition: "Alət aktiv olduqda PDF səhifələrini müstəqil fotolara çevirin.",
      benefits: ["Hər səhifə üçün bir şəkil", "Baxış və ya paylaşım üçün çevik nəticə", "Pulsuz istifadə"],
      howToSteps: ["Çevriləcək PDF-i yükləyin", "Alətin hər səhifəni çevirməsinə icazə verin", "Şəkilləri yükləyin"],
      useCases: ["PDF səhifəsinin sürətli foto önizləməsini əldə etmək", "Yalnız şəkil qəbul edilən yerdə sənəd səhifəsini paylaşmaq", "PDF-dən diaqram və ya qrafiki çıxarmaq"],
      faq: [
        { question: "Bu, PDF-dən JPG-yə çevirmədən nə ilə fərqlənir?", answer: "PDF-dən JPG-yə həmişə konkret JPG verir; bu alət isə şəkil çevirməni daha ümumi şəkildə əhatə edir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bu araç, bir PDF'nin her sayfasını ayrı bir görsel dosyasına dönüştürür.",
      valueProposition: "Araç yayına girdiğinde PDF sayfalarını bağımsız görsellere dönüştürün.",
      benefits: ["Her sayfa için bir görsel", "Görüntüleme veya paylaşım için esnek çıktı", "Ücretsiz kullanım"],
      howToSteps: ["Dönüştürülecek PDF'yi yükleyin", "Aracın her sayfayı dönüştürmesine izin verin", "Görselleri indirin"],
      useCases: ["Bir PDF sayfasının hızlı bir görsel önizlemesini alma", "Yalnızca görsellerin kabul edildiği bir yerde belge sayfasını paylaşma", "Bir PDF'den bir diyagram veya grafik çıkarma"],
      faq: [
        { question: "Bu, PDF'den JPG'ye dönüştürmeden nasıl farklıdır?", answer: "PDF'den JPG'ye her zaman özellikle JPG üretir; bu araç ise görsel dönüştürmeyi daha genel olarak kapsar." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "gif-maker": {
    en: {
      introduction: "A GIF maker combines a sequence of images or frames into a short, looping animation.",
      valueProposition: "Turn a series of photos into one animated GIF once the tool is live.",
      benefits: ["Combines multiple images into an animation", "Good for quick, shareable clips", "Free to use"],
      howToSteps: ["Add the images or frames to include", "Set their order and timing", "Create the animated GIF"],
      useCases: ["Making a short animation for social media", "Turning a burst of photos into a moving clip", "Creating a simple reaction GIF"],
      faq: [
        { question: "How many images are needed to make a GIF?", answer: "At least two frames are needed to create movement; more frames make smoother animation." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "GIF yaradıcısı şəkil və ya kadr ardıcıllığını qısa, dövri animasiyada birləşdirir.",
      valueProposition: "Alət aktiv olduqda foto sırasını tək animasiyalı GIF-ə çevirin.",
      benefits: ["Bir neçə şəkli animasiyada birləşdirir", "Sürətli, paylaşıla bilən klip üçün əlverişlidir", "Pulsuz istifadə"],
      howToSteps: ["Daxil ediləcək şəkil və ya kadrları əlavə edin", "Sırasını və vaxtlamasını təyin edin", "Animasiyalı GIF-i yaradın"],
      useCases: ["Sosial media üçün qısa animasiya hazırlamaq", "Foto seriyasını hərəkətli klipə çevirmək", "Sadə reaksiya GIF-i yaratmaq"],
      faq: [
        { question: "GIF yaratmaq üçün neçə şəkil lazımdır?", answer: "Hərəkət yaratmaq üçün ən azı iki kadr lazımdır; daha çox kadr daha hamar animasiya verir." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bir GIF oluşturucu, bir dizi görsel veya kareyi kısa, döngülü bir animasyonda birleştirir.",
      valueProposition: "Araç yayına girdiğinde bir dizi fotoğrafı tek bir animasyonlu GIF'e dönüştürün.",
      benefits: ["Birden fazla görseli animasyonda birleştirir", "Hızlı, paylaşılabilir klipler için uygundur", "Ücretsiz kullanım"],
      howToSteps: ["Eklenecek görselleri veya kareleri ekleyin", "Sırasını ve zamanlamasını ayarlayın", "Animasyonlu GIF'i oluşturun"],
      useCases: ["Sosyal medya için kısa bir animasyon yapma", "Bir dizi fotoğrafı hareketli bir klibe dönüştürme", "Basit bir tepki GIF'i oluşturma"],
      faq: [
        { question: "Bir GIF yapmak için kaç görsel gerekir?", answer: "Hareket oluşturmak için en az iki kare gerekir; daha fazla kare daha akıcı bir animasyon sağlar." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "meme-generator": {
    en: {
      introduction: "A meme generator adds custom text, usually at the top and bottom, to an image.",
      valueProposition: "Turn a photo into a shareable meme once the tool is live.",
      benefits: ["Adds custom text to any image", "Simple, fast meme creation", "Free to use"],
      howToSteps: ["Upload the image to use", "Add the top and bottom text", "Download the finished meme"],
      useCases: ["Creating a meme for social media", "Adding a caption to a funny photo", "Making a quick reaction image for a chat"],
      faq: [
        { question: "Can any image be used as a meme template?", answer: "Yes, any uploaded image can have text added to it." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Mem generatoru şəklə adətən yuxarı və aşağı hissədə fərdi mətn əlavə edir.",
      valueProposition: "Alət aktiv olduqda fotonu paylaşıla bilən memə çevirin.",
      benefits: ["İstənilən şəklə fərdi mətn əlavə edir", "Sadə, sürətli mem yaratma", "Pulsuz istifadə"],
      howToSteps: ["İstifadə ediləcək şəkli yükləyin", "Yuxarı və aşağı mətni əlavə edin", "Hazır memi yükləyin"],
      useCases: ["Sosial media üçün mem yaratmaq", "Gülməli fotoya izah əlavə etmək", "Söhbət üçün sürətli reaksiya şəkli hazırlamaq"],
      faq: [
        { question: "İstənilən şəkil mem şablonu kimi istifadə edilə bilər?", answer: "Bəli, yüklənmiş istənilən şəklə mətn əlavə edilə bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bir meme oluşturucu, genellikle üstte ve altta olmak üzere bir görsele özel metin ekler.",
      valueProposition: "Araç yayına girdiğinde bir fotoğrafı paylaşılabilir bir meme'ye dönüştürün.",
      benefits: ["Herhangi bir görsele özel metin ekler", "Basit, hızlı meme oluşturma", "Ücretsiz kullanım"],
      howToSteps: ["Kullanılacak görseli yükleyin", "Üst ve alt metni ekleyin", "Bitmiş meme'yi indirin"],
      useCases: ["Sosyal medya için bir meme oluşturma", "Komik bir fotoğrafa açıklama ekleme", "Bir sohbet için hızlı bir tepki görseli yapma"],
      faq: [
        { question: "Herhangi bir görsel meme şablonu olarak kullanılabilir mi?", answer: "Evet, yüklenen herhangi bir görsele metin eklenebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
      ],
    },
  },

  "color-palette-generator": {
    en: {
      introduction: "A color palette generator extracts or suggests a set of matching colors, often based on an image.",
      valueProposition: "Get a ready-made color scheme for your project once the tool is live.",
      benefits: ["Suggests matching colors together", "Useful starting point for design work", "Free to use"],
      howToSteps: ["Upload an image or start from an idea", "Let the tool generate matching colors", "Save or copy the resulting palette"],
      useCases: ["Building a color scheme for a website", "Matching colors to a brand photo", "Getting design inspiration from an existing image"],
      faq: [
        { question: "Does the palette come from an uploaded image?", answer: "A palette can be generated from an image's dominant colors or built from a starting idea." },
        { question: "Is this tool free?", answer: "Yes, this tool is free to use, like all Codivio tools." },
      ],
    },
    az: {
      introduction: "Rəng palitrası generatoru adətən şəkil əsasında uyğun gələn rənglər toplusunu çıxarır və ya təklif edir.",
      valueProposition: "Alət aktiv olduqda layihəniz üçün hazır rəng sxemi əldə edin.",
      benefits: ["Bir-birinə uyğun rəngləri təklif edir", "Dizayn işi üçün faydalı başlanğıc nöqtəsi", "Pulsuz istifadə"],
      howToSteps: ["Şəkil yükləyin və ya ideyadan başlayın", "Alətin uyğun rəngləri yaratmasına icazə verin", "Alınan palitranı saxlayın və ya kopyalayın"],
      useCases: ["Veb sayt üçün rəng sxemi qurmaq", "Rəngləri brend fotosuna uyğunlaşdırmaq", "Mövcud şəkildən dizayn ilhamı almaq"],
      faq: [
        { question: "Palitra yüklənmiş şəkildən yaranır?", answer: "Palitra şəklin əsas rənglərindən yaradıla və ya başlanğıc ideyadan qurula bilər." },
        { question: "Bu alət pulsuzdur?", answer: "Bəli, bu alət, Codivio-nun bütün alətləri kimi, pulsuzdur." },
      ],
    },
    tr: {
      introduction: "Bir renk paleti oluşturucu, genellikle bir görsele dayanarak uyumlu bir renk setini çıkarır veya önerir.",
      valueProposition: "Araç yayına girdiğinde projeniz için hazır bir renk şeması elde edin.",
      benefits: ["Birbirine uyumlu renkleri önerir", "Tasarım çalışması için faydalı bir başlangıç noktası", "Ücretsiz kullanım"],
      howToSteps: ["Bir görsel yükleyin veya bir fikirden başlayın", "Aracın uyumlu renkler oluşturmasına izin verin", "Elde edilen paleti kaydedin veya kopyalayın"],
      useCases: ["Bir web sitesi için renk şeması oluşturma", "Renkleri bir marka fotoğrafına uydurma", "Mevcut bir görselden tasarım ilhamı alma"],
      faq: [
        { question: "Palet yüklenen bir görselden mi oluşur?", answer: "Palet, bir görselin baskın renklerinden oluşturulabilir veya bir başlangıç fikrinden inşa edilebilir." },
        { question: "Bu araç ücretsiz mi?", answer: "Evet, bu araç, Codivio'nun tüm araçları gibi ücretsizdir." },
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
  return {
    ...content,
    ...keywordProfile,
    trustMessage: SHARED_TRUST_MESSAGE[lang],
    statusNote: TOOL_STATUS_NOTE[lang],
  };
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
  status: "coming-soon";
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
 * fabricates a profile for a tool that doesn't exist. */
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
    status: "coming-soon",
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
