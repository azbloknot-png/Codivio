import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Box,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  FileImage,
  FileOutput,
  FileText,
  Globe,
  Image as ImageIcon,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Minimize2,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Link, Route, Routes, useLocation, useNavigationType, useParams } from "react-router-dom";
/** Phase 3.13 — lazy-loaded, not a plain import. ToolPage now renders the
 * full Phase 3.4 content blueprint (intro/benefits/steps/FAQ across 34
 * tools x 3 languages, ~1,400 lines of data) via shared/seo/content.ts.
 * Splitting it into its own chunk keeps that dataset out of every other
 * route's bundle (home/admin/etc.) — the same bundle-discipline principle
 * Phase 3.8 established, applied here via code-splitting instead of a
 * lightweight/heavy function split, since this data is now genuinely
 * needed, just only on this one route. See tests/technical-seo-3.13.test.ts. */
const ToolPage = lazy(() => import("./pages/ToolPage"));
import { AdminDashboardPlaceholder, AdminLoginPage, ProtectedAdminRoute } from "./admin/AdminApp";
import AdminSettingsPage from "./admin/AdminSettingsPage";
import AdminPagesPage from "./admin/AdminPagesPage";
import AdminToolsPage from "./admin/AdminToolsPage";
import AdminFaqPage from "./admin/AdminFaqPage";
import AdminComingSoonPage from "./admin/AdminComingSoonPage";
import AdminSeoPage from "./admin/AdminSeoPage";
import { useLanguage } from "./i18n/LanguageContext";
import { LanguageSwitcher } from "./i18n/LanguageSwitcher";
import { usePageMeta } from "./seo/useSeo";
import { trackPageView } from "./lib/analytics";
import { useConsent } from "./consent/ConsentContext";
import { CookieConsentBanner } from "./consent/CookieConsentBanner";
import { CookieSettingsModal } from "./consent/CookieSettingsModal";
import { getPageSeo, getToolSeo, ROBOTS_NOINDEX_NOFOLLOW } from "../shared/seo";
import { buildStandardPageGraph, buildToolPageGraph } from "../shared/seo/schema";
import { getVisiblePlansByPriority } from "../shared/monetization/plans";
import { ENTITLEMENTS, getPlanEntitlementKeys } from "../shared/monetization/entitlements";
import { getGlobalFaqs, type GlobalFaqItem } from "../shared/seo/global-faq";
import type { Language } from "../shared/i18n/languages";

/**
 * FAQ Management Source-of-Truth Remediation.
 *
 * The public global FAQ's real source of truth is Admin FAQ Management
 * (`site_faqs`, scope="global", status="active"), served by the public,
 * unauthenticated `GET /api/faqs?language=xx` (worker/faq.ts#handlePublicFaqs)
 * — an Admin create/edit/deactivate/reorder is reflected here. The static
 * `getGlobalFaqs` import is used only as this hook's synchronous initial
 * value (so the page never renders blank while the fetch is in flight) and
 * as its fallback if the request fails, e.g. a transient D1 outage — see
 * shared/seo/global-faq.ts's own comment for why that file must never
 * become an independently-edited second FAQ source.
 */
function useGlobalFaqs(language: Language): GlobalFaqItem[] {
  const [faqs, setFaqs] = useState<GlobalFaqItem[]>(() => getGlobalFaqs(language));

  useEffect(() => {
    setFaqs(getGlobalFaqs(language));
    let cancelled = false;

    fetch(`/api/faqs?language=${language}`)
      .then((response) => (response.ok ? (response.json() as Promise<{ faqs: GlobalFaqItem[] }>) : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.faqs) || data.faqs.length === 0) return;
        setFaqs(data.faqs);
      })
      .catch(() => {
        // Network or D1 failure: keep the static fallback already shown
        // rather than leaving the page blank.
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  return faqs;
}

/** Phase 3.1 — usePageMeta now also sets canonical/robots/OG/Twitter/html
 * lang; re-exported here (rather than re-pointing every existing import at
 * "./seo/useSeo") so the 5 Admin files that already `import { usePageMeta }
 * from "../App"` keep working unchanged. See src/seo/useSeo.ts. */
export { usePageMeta };

type Tool = {
  name: string;
  slug: string;
  description: string;
  category: "QR Tools" | "PDF Tools" | "Image Tools" | "Other Tools";
  icon: React.ReactNode;
  status: "coming-soon";
  /** Homepage Featured Tools selection — a view over the Tool Registry, not a
   * separate data source. Toggling this is what the future Admin Panel's
   * "show on Homepage" control will edit; the full registry below is
   * unaffected either way. */
  featured?: boolean;
  /** Popular Tools carousel selection — intentionally a separate flag from
   * `featured`, not derived from it. Today's content happens to reuse the
   * same 12 tools, but Admin Panel will be able to curate/reorder this list
   * independently of Homepage Featured Tools without any code changes. */
  popular?: boolean;
  /** QR Tools carousel selection — independent of `featured`/`popular`. */
  qr?: boolean;
  /** PDF Tools carousel selection — independent of the other flags. */
  pdf?: boolean;
};

const tools: Tool[] = [
  {
    name: "QR Code Generator",
    slug: "qr-code-generator",
    description: "Create custom QR codes for links, text and more.",
    category: "QR Tools",
    icon: <QrCode size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
    qr: true,
  },
  {
    name: "QR Code Scanner",
    slug: "qr-code-scanner",
    description: "Scan QR codes using your camera or an uploaded image.",
    category: "QR Tools",
    icon: <QrCode size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
    qr: true,
  },
  {
    name: "URL to QR Code",
    slug: "url-to-qr",
    description: "Turn any website URL into a QR code.",
    category: "QR Tools",
    icon: <Globe size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
    qr: true,
  },
  {
    name: "Text to QR Code",
    slug: "text-to-qr",
    description: "Convert plain text into a shareable QR code.",
    category: "QR Tools",
    icon: <FileText size={22} />,
    status: "coming-soon",
    qr: true,
  },
  {
    name: "WiFi QR Code",
    slug: "wifi-qr",
    description: "Create a QR code for easy WiFi network sharing.",
    category: "QR Tools",
    icon: <Wifi size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
    qr: true,
  },
  {
    name: "vCard QR Code",
    slug: "vcard-qr",
    description: "Create QR codes for contact information.",
    category: "QR Tools",
    icon: <Users size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
    qr: true,
  },
  {
    name: "Email QR Code",
    slug: "email-qr",
    description: "Create a QR code that opens an email draft.",
    category: "QR Tools",
    icon: <Mail size={22} />,
    status: "coming-soon",
    qr: true,
  },
  {
    name: "SMS QR Code",
    slug: "sms-qr",
    description: "Create QR codes for pre-filled SMS messages.",
    category: "QR Tools",
    icon: <MessageSquare size={22} />,
    status: "coming-soon",
    qr: true,
  },
  {
    name: "WhatsApp QR Code",
    slug: "whatsapp-qr",
    description: "Create QR codes for WhatsApp conversations.",
    category: "QR Tools",
    icon: <MessageSquare size={22} />,
    status: "coming-soon",
    qr: true,
  },
  {
    name: "Phone QR Code",
    slug: "phone-qr",
    description: "Create a QR code that opens a phone call.",
    category: "QR Tools",
    icon: <Phone size={22} />,
    status: "coming-soon",
    qr: true,
  },
  {
    name: "Location QR Code",
    slug: "location-qr",
    description: "Create QR codes for maps and locations.",
    category: "QR Tools",
    icon: <MapPin size={22} />,
    status: "coming-soon",
    qr: true,
  },
  {
    name: "Calendar QR Code",
    slug: "calendar-qr",
    description: "Create QR codes for calendar events.",
    category: "QR Tools",
    icon: <CalendarDays size={22} />,
    status: "coming-soon",
    qr: true,
  },

  {
    name: "PDF Merge",
    slug: "pdf-merge",
    description: "Combine multiple PDF files into one document.",
    category: "PDF Tools",
    icon: <FileOutput size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
    pdf: true,
  },
  {
    name: "PDF Split",
    slug: "pdf-split",
    description: "Split PDF documents into separate files.",
    category: "PDF Tools",
    icon: <FileText size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
    pdf: true,
  },
  {
    name: "PDF Compress",
    slug: "pdf-compress",
    description: "Reduce PDF file size while keeping useful quality.",
    category: "PDF Tools",
    icon: <Minimize2 size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
    pdf: true,
  },
  {
    name: "PDF to JPG",
    slug: "pdf-to-jpg",
    description: "Convert PDF pages into JPG images.",
    category: "PDF Tools",
    icon: <FileImage size={22} />,
    status: "coming-soon",
    pdf: true,
  },
  {
    name: "JPG to PDF",
    slug: "jpg-to-pdf",
    description: "Convert JPG images into a PDF document.",
    category: "PDF Tools",
    icon: <FileOutput size={22} />,
    status: "coming-soon",
    pdf: true,
  },
  {
    name: "PDF to Word",
    slug: "pdf-to-word",
    description: "Convert PDF documents into editable Word files.",
    category: "PDF Tools",
    icon: <FileText size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
    pdf: true,
  },
  {
    name: "PDF to Excel",
    slug: "pdf-to-excel",
    description: "Convert suitable PDF tables into Excel files.",
    category: "PDF Tools",
    icon: <BarChart3 size={22} />,
    status: "coming-soon",
    pdf: true,
  },
  {
    name: "PDF Rotate",
    slug: "pdf-rotate",
    description: "Rotate PDF pages and save the corrected document.",
    category: "PDF Tools",
    icon: <FileText size={22} />,
    status: "coming-soon",
    pdf: true,
  },

  {
    name: "Image Resize",
    slug: "image-resize",
    description: "Resize images to exact dimensions.",
    category: "Image Tools",
    icon: <ImageIcon size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
  },
  {
    name: "Image Compress",
    slug: "image-compress",
    description: "Compress images for smaller file sizes.",
    category: "Image Tools",
    icon: <Minimize2 size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
  },
  {
    name: "Image Converter",
    slug: "image-converter",
    description: "Convert images between popular formats.",
    category: "Image Tools",
    icon: <ImageIcon size={22} />,
    status: "coming-soon",
  },
  {
    name: "JPG to PNG",
    slug: "jpg-to-png",
    description: "Convert JPG images into PNG format.",
    category: "Image Tools",
    icon: <FileImage size={22} />,
    status: "coming-soon",
  },
  {
    name: "PNG to JPG",
    slug: "png-to-jpg",
    description: "Convert PNG images into JPG format.",
    category: "Image Tools",
    icon: <FileImage size={22} />,
    status: "coming-soon",
  },
  {
    name: "WebP Converter",
    slug: "webp-converter",
    description: "Convert images to or from WebP format.",
    category: "Image Tools",
    icon: <ImageIcon size={22} />,
    status: "coming-soon",
  },
  {
    name: "Image Crop",
    slug: "image-crop",
    description: "Crop images to the exact area you need.",
    category: "Image Tools",
    icon: <ImageIcon size={22} />,
    status: "coming-soon",
  },
  {
    name: "Image Rotate",
    slug: "image-rotate",
    description: "Rotate images quickly in your browser.",
    category: "Image Tools",
    icon: <ImageIcon size={22} />,
    status: "coming-soon",
  },
  {
    name: "Background Remover",
    slug: "background-remover",
    description: "Remove backgrounds from images.",
    category: "Image Tools",
    icon: <Sparkles size={22} />,
    status: "coming-soon",
    featured: true,
    popular: true,
  },
  {
    name: "Image to PDF",
    slug: "image-to-pdf",
    description: "Turn images into PDF documents.",
    category: "Image Tools",
    icon: <FileOutput size={22} />,
    status: "coming-soon",
  },
  {
    name: "PDF to Image",
    slug: "pdf-to-image",
    description: "Convert PDF pages into image files.",
    category: "Image Tools",
    icon: <FileImage size={22} />,
    status: "coming-soon",
  },

  {
    name: "GIF Maker",
    slug: "gif-maker",
    description: "Create animated GIFs from images or frames.",
    category: "Other Tools",
    icon: <Sparkles size={22} />,
    status: "coming-soon",
  },
  {
    name: "Meme Generator",
    slug: "meme-generator",
    description: "Create simple memes with images and text.",
    category: "Other Tools",
    icon: <MessageSquare size={22} />,
    status: "coming-soon",
  },
  {
    name: "Color Palette Generator",
    slug: "color-palette-generator",
    description: "Generate useful color palettes from images or ideas.",
    category: "Other Tools",
    icon: <Sparkles size={22} />,
    status: "coming-soon",
  },
];

/** Homepage Featured Tools: a view over the Tool Registry (`tools`) above,
 * not a separate/duplicated data source. All 34 registry entries remain
 * fully intact and reachable via /tools and /tools/:slug regardless of this
 * selection. Adding a new tool to the registry with no `featured` flag does
 * not change this list, so the Homepage's 12-tool curation is not disturbed
 * by future registry growth. A future Admin Panel "show on Homepage" toggle
 * would edit the same `featured` field this derives from. */
const HOMEPAGE_FEATURED_TOOLS = tools.filter((tool) => tool.featured);

/** Popular Tools carousel data — also a view over the Tool Registry, kept as
 * its own derived list (not reused from HOMEPAGE_FEATURED_TOOLS) so it can
 * be curated/reordered independently once an Admin Panel exists. */
const POPULAR_TOOLS = tools.filter((tool) => tool.popular);

/** QR Tools carousel data — a third independent view over the Tool
 * Registry (not linked to HOMEPAGE_FEATURED_TOOLS or POPULAR_TOOLS). */
const QR_TOOLS = tools.filter((tool) => tool.qr);

/** PDF Tools carousel data — a fourth independent view over the Tool
 * Registry (not linked to HOMEPAGE_FEATURED_TOOLS, POPULAR_TOOLS or
 * QR_TOOLS). */
const PDF_TOOLS = tools.filter((tool) => tool.pdf);

/** Image/Other Tools carousel data — derived directly from the registry's
 * existing `category` field (no new boolean flag needed, unlike the other
 * three sliders) since every Image Tools and Other Tools entry belongs on
 * this shared homepage section. */
const IMAGE_OTHER_TOOLS = tools.filter(
  (tool) => tool.category === "Image Tools" || tool.category === "Other Tools"
);

const categories = [
  "QR Tools",
  "PDF Tools",
  "Image Tools",
  "Other Tools",
] as const;

const blogPosts = [
  {
    category: "QR Codes",
    title: "How to Create a QR Code for a Website",
    text: "Learn the simple steps for turning a website URL into a useful QR code.",
  },
  {
    category: "PDF",
    title: "How to Reduce PDF File Size",
    text: "Practical ways to make PDF files smaller for sharing and storage.",
  },
  {
    category: "Images",
    title: "JPG, PNG or WebP: Which Format Should You Use?",
    text: "Understand the differences between popular image formats.",
  },
  {
    category: "Productivity",
    title: "Useful Online Tools for Everyday Tasks",
    text: "Discover simple browser-based tools that can save time.",
  },
  {
    category: "Security",
    title: "How to Use Online File Tools More Safely",
    text: "Important privacy and security considerations when working with files online.",
  },
  {
    category: "QR Codes",
    title: "QR Codes for Business and Marketing",
    text: "Ideas for using QR codes on menus, packaging, printed materials and more.",
  },
];

function ToolSlider() {
  const [start, setStart] = useState(0);

  const visibleCount = 4;
  const maxStart = Math.max(0, tools.length - visibleCount);

  const visibleTools = tools.slice(start, start + visibleCount);

  const next = () => {
    setStart((current) => Math.min(current + 1, maxStart));
  };

  const previous = () => {
    setStart((current) => Math.max(current - 1, 0));
  };

  return (
    <section className="tool-slider-section">
      <div className="container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">POPULAR TOOLS</span>
            <h2>Explore Codivio Tools</h2>
          </div>

          <div className="tool-slider-actions">
            <button
              type="button"
              onClick={previous}
              disabled={start === 0}
              aria-label="Previous tools"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={start === maxStart}
              aria-label="Next tools"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="tool-slider">
          {visibleTools.map((tool) => (
            <Link
              className="tool-slider-card"
              to={`/tools/${tool.slug}`}
              key={tool.slug}
            >
              <div className="tool-icon">{tool.icon}</div>
              <span>{tool.category}</span>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              <ArrowRight className="tool-slider-arrow" size={17} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <header className="header">
      <div className="container nav">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
          <img className="brand-logo" src="/assets/branding/codivio-logo.png" alt="Codivio" />
          Codivio
        </Link>

        <nav id="site-mobile-nav" className={`nav-links ${menuOpen ? "open" : ""}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>
            {t.site.navHome}
          </Link>
          <Link to="/tools" onClick={() => setMenuOpen(false)}>
            {t.site.navTools}
          </Link>
          <Link to="/blog" onClick={() => setMenuOpen(false)}>
            {t.site.navBlog}
          </Link>
          <Link to="/faq" onClick={() => setMenuOpen(false)}>
            {t.site.navFaq}
          </Link>
          <Link to="/about" onClick={() => setMenuOpen(false)}>
            {t.site.navAbout}
          </Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)}>
            {t.site.navContact}
          </Link>
        </nav>

        <div className="nav-actions">
          <div className="nav-search">
            <Search size={15} />
            <input aria-label={t.site.searchPlaceholder} placeholder={t.site.searchPlaceholder} />
          </div>

          <LanguageSwitcher className="language-switcher language-switcher-header" />

          <button
            className="mobile-menu"
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? t.admin.closeMenu : t.admin.openMenu}
            aria-expanded={menuOpen}
            aria-controls="site-mobile-nav"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link className="brand" to="/">
              <img className="brand-logo" src="/assets/branding/codivio-logo.png" alt="Codivio" />
              Codivio
            </Link>
            <p>{t.site.siteDescription}</p>
          </div>

          <div>
            <b>{t.site.navTools}</b>
            <Link to="/tools">{t.footer.allTools}</Link>
            <Link to="/tools/qr-code-generator">{t.section.qrTools}</Link>
            <Link to="/tools/pdf-merge">{t.section.pdfTools}</Link>
            <Link to="/tools/image-resize">{t.footer.imageToolsLink}</Link>
          </div>

          <div>
            <b>{t.footer.companyHeading}</b>
            <Link to="/about">{t.site.navAbout}</Link>
            <Link to="/blog">{t.site.navBlog}</Link>
            <Link to="/faq">{t.site.navFaq}</Link>
            <Link to="/contact">{t.site.navContact}</Link>
            <Link to="/pricing">{t.footer.pricing}</Link>
          </div>

          <div>
            <b>{t.footer.informationHeading}</b>
            <Link to="/privacy">{t.footer.privacy}</Link>
            <Link to="/terms">{t.footer.terms}</Link>
            <Link to="/cookies">{t.footer.cookies}</Link>
          </div>
        </div>

        <div className="copyright">{t.footer.copyright(new Date().getFullYear())}</div>
      </div>
    </footer>
  );
}

function AdSlot({ label }: { label?: string }) {
  const { t } = useLanguage();
  return (
    <div className="container">
      <div className="ad-slot">
        {label ?? t.hero.adLabel}
        <span>{t.hero.adNote}</span>
      </div>
    </div>
  );
}

function PageShell({
  children,
  showSlider = true,
}: {
  children: React.ReactNode;
  showSlider?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        {t.site.skipLink}
      </a>
      <SiteHeader />
      {children}
      {showSlider && <ToolSlider />}
      <SiteFooter />
    </div>
  );
}

function HomePage() {
  const { t, language } = useLanguage();
  const homeSeo = getPageSeo("home", language).copy;
  usePageMeta(homeSeo.title, homeSeo.description, { schemaGraph: buildStandardPageGraph("home", language) });
  const globalFaqs = useGlobalFaqs(language);
  const [query, setQuery] = useState("");
  const [menuCategory, setMenuCategory] = useState<string>("All");
  const popularTrackRef = useRef<HTMLDivElement>(null);
  const [popularAtStart, setPopularAtStart] = useState(true);
  const [popularAtEnd, setPopularAtEnd] = useState(false);

  const filteredTools = useMemo(() => {
    const normalized = query.toLowerCase().trim();

    return POPULAR_TOOLS.filter((tool) => {
      const matchesQuery =
        !normalized ||
        tool.name.toLowerCase().includes(normalized) ||
        tool.description.toLowerCase().includes(normalized);

      const matchesCategory =
        menuCategory === "All" || tool.category === menuCategory;

      return matchesQuery && matchesCategory;
    });
  }, [query, menuCategory]);

  const updatePopularEdges = () => {
    const track = popularTrackRef.current;
    if (!track) return;
    setPopularAtStart(track.scrollLeft <= 4);
    setPopularAtEnd(
      track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
    );
  };

  useLayoutEffect(() => {
    updatePopularEdges();
  }, [filteredTools]);

  const scrollPopular = (direction: 1 | -1) => {
    const track = popularTrackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".tool-card");
    const amount = (card?.offsetWidth ?? 260) + 16;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  };

  const qrTrackRef = useRef<HTMLDivElement>(null);
  const [qrAtStart, setQrAtStart] = useState(true);
  const [qrAtEnd, setQrAtEnd] = useState(false);

  const updateQrEdges = () => {
    const track = qrTrackRef.current;
    if (!track) return;
    setQrAtStart(track.scrollLeft <= 4);
    setQrAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);
  };

  useLayoutEffect(() => {
    updateQrEdges();
  }, []);

  const scrollQr = (direction: 1 | -1) => {
    const track = qrTrackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".tool-card");
    const amount = (card?.offsetWidth ?? 260) + 16;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  };

  const pdfTrackRef = useRef<HTMLDivElement>(null);
  const [pdfAtStart, setPdfAtStart] = useState(true);
  const [pdfAtEnd, setPdfAtEnd] = useState(false);

  const updatePdfEdges = () => {
    const track = pdfTrackRef.current;
    if (!track) return;
    setPdfAtStart(track.scrollLeft <= 4);
    setPdfAtEnd(
      track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
    );
  };

  useLayoutEffect(() => {
    updatePdfEdges();
  }, []);

  const scrollPdf = (direction: 1 | -1) => {
    const track = pdfTrackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".tool-card");
    const amount = (card?.offsetWidth ?? 260) + 16;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  };

  const imageOtherTrackRef = useRef<HTMLDivElement>(null);
  const [imageOtherAtStart, setImageOtherAtStart] = useState(true);
  const [imageOtherAtEnd, setImageOtherAtEnd] = useState(false);

  const updateImageOtherEdges = () => {
    const track = imageOtherTrackRef.current;
    if (!track) return;
    setImageOtherAtStart(track.scrollLeft <= 4);
    setImageOtherAtEnd(
      track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
    );
  };

  useLayoutEffect(() => {
    updateImageOtherEdges();
  }, []);

  const scrollImageOther = (direction: 1 | -1) => {
    const track = imageOtherTrackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".tool-card");
    const amount = (card?.offsetWidth ?? 260) + 16;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  };

  const blogTrackRef = useRef<HTMLDivElement>(null);
  const [blogAtStart, setBlogAtStart] = useState(true);
  const [blogAtEnd, setBlogAtEnd] = useState(false);

  const updateBlogEdges = () => {
    const track = blogTrackRef.current;
    if (!track) return;
    setBlogAtStart(track.scrollLeft <= 4);
    setBlogAtEnd(
      track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
    );
  };

  useLayoutEffect(() => {
    updateBlogEdges();
  }, []);

  const scrollBlog = (direction: 1 | -1) => {
    const track = blogTrackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("article");
    const amount = (card?.offsetWidth ?? 260) + 16;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  };

  return (
    <PageShell showSlider={false}>
      <main id="main-content">
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">{t.hero.eyebrow}</span>
              <h1>
                {t.hero.headlineLine1}
                <br />
                <span>{t.hero.headlineLine2}</span>
              </h1>
              <p>{t.hero.subtitle}</p>

              <div className="hero-search">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.hero.searchPlaceholder}
                  aria-label={t.hero.searchPlaceholder}
                />
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("popular-tools")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {t.common.search}
                </button>
              </div>

              <div className="trust-row">
                <span>
                  <CheckCircle2 size={15} />
                  {t.hero.trustFree}
                </span>
                <span>
                  <ShieldCheck size={15} />
                  {t.hero.trustPrivacy}
                </span>
                <span>
                  <Zap size={15} />
                  {t.hero.trustFast}
                </span>
              </div>
            </div>

            <div className="hero-ad-slot" role="complementary" aria-label={t.hero.adLabel}>
              <span className="hero-ad-label">{t.hero.adLabel}</span>
              <span className="hero-ad-note">{t.hero.adNote}</span>
            </div>
          </div>
        </section>

        <AdSlot />

        <section className="section" id="popular-tools">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t.section.popularToolsEyebrow}</span>
                <h2>{t.section.popularTools}</h2>
              </div>
              <div className="popular-tools-heading-actions">
                <Link to="/tools">
                  {t.common.viewAll} <ArrowRight size={15} />
                </Link>
                <div className="tool-slider-actions">
                  <button
                    type="button"
                    onClick={() => scrollPopular(-1)}
                    disabled={popularAtStart}
                    aria-label="Previous popular tools"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollPopular(1)}
                    disabled={popularAtEnd}
                    aria-label="Next popular tools"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="category-filter">
              {["All", ...categories].map((category) => (
                <button
                  type="button"
                  key={category}
                  className={menuCategory === category ? "active" : ""}
                  aria-pressed={menuCategory === category}
                  onClick={() => setMenuCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div
              className="popular-tools-track"
              ref={popularTrackRef}
              onScroll={updatePopularEdges}
              role="region"
              aria-label="Popular tools"
              tabIndex={0}
            >
              {filteredTools.slice(0, 12).map((tool) => (
                <ToolCard tool={tool} key={tool.slug} />
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t.section.qrTools.toUpperCase()}</span>
                <h2>{t.section.qrTools}</h2>
              </div>
              <div className="popular-tools-heading-actions">
                <Link to="/tools">
                  {t.common.viewAll} <ArrowRight size={15} />
                </Link>
                <div className="tool-slider-actions">
                  <button
                    type="button"
                    onClick={() => scrollQr(-1)}
                    disabled={qrAtStart}
                    aria-label="Previous QR tools"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollQr(1)}
                    disabled={qrAtEnd}
                    aria-label="Next QR tools"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div
              className="popular-tools-track"
              ref={qrTrackRef}
              onScroll={updateQrEdges}
              role="region"
              aria-label="QR tools"
              tabIndex={0}
            >
              {QR_TOOLS.map((tool) => (
                <ToolCard tool={tool} key={tool.slug} />
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t.section.pdfTools.toUpperCase()}</span>
                <h2>{t.section.pdfTools}</h2>
              </div>
              <div className="popular-tools-heading-actions">
                <Link to="/tools">
                  {t.common.viewAll} <ArrowRight size={15} />
                </Link>
                <div className="tool-slider-actions">
                  <button
                    type="button"
                    onClick={() => scrollPdf(-1)}
                    disabled={pdfAtStart}
                    aria-label="Previous PDF tools"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollPdf(1)}
                    disabled={pdfAtEnd}
                    aria-label="Next PDF tools"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div
              className="popular-tools-track"
              ref={pdfTrackRef}
              onScroll={updatePdfEdges}
              role="region"
              aria-label="PDF tools"
              tabIndex={0}
            >
              {PDF_TOOLS.map((tool) => (
                <ToolCard tool={tool} key={tool.slug} />
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t.section.imageOtherTools.toUpperCase()}</span>
                <h2>{t.section.imageOtherTools}</h2>
              </div>
              <div className="popular-tools-heading-actions">
                <Link to="/tools">
                  {t.common.viewAll} <ArrowRight size={15} />
                </Link>
                <div className="tool-slider-actions">
                  <button
                    type="button"
                    onClick={() => scrollImageOther(-1)}
                    disabled={imageOtherAtStart}
                    aria-label="Previous image and other tools"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollImageOther(1)}
                    disabled={imageOtherAtEnd}
                    aria-label="Next image and other tools"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div
              className="popular-tools-track"
              ref={imageOtherTrackRef}
              onScroll={updateImageOtherEdges}
              role="region"
              aria-label="Image and other tools"
              tabIndex={0}
            >
              {IMAGE_OTHER_TOOLS.map((tool) => (
                <ToolCard tool={tool} key={tool.slug} />
              ))}
            </div>
          </div>
        </section>

        <AdSlot label="ADVERTISEMENT" />

        <section className="section">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{t.section.blogEyebrow}</span>
                <h2>{t.section.blogHeading}</h2>
              </div>
              <div className="popular-tools-heading-actions">
                <Link className="primary-text-link" to="/blog">
                  {t.section.readBlog} <ArrowRight size={15} />
                </Link>
                <div className="tool-slider-actions">
                  <button
                    type="button"
                    onClick={() => scrollBlog(-1)}
                    disabled={blogAtStart}
                    aria-label="Previous blog posts"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollBlog(1)}
                    disabled={blogAtEnd}
                    aria-label="Next blog posts"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div
              className="article-list popular-tools-track"
              ref={blogTrackRef}
              onScroll={updateBlogEdges}
              role="region"
              aria-label="Blog posts"
              tabIndex={0}
            >
              {blogPosts.slice(0, 3).map((post) => (
                <article key={post.title}>
                  <span>{post.category}</span>
                  <h3>{post.title}</h3>
                  <p>{post.text}</p>
                  <Link to="/blog">
                    Read article <ArrowRight size={14} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="faq">
          <div className="container">
            <span className="eyebrow">HELP CENTER</span>
            <h2>Frequently Asked Questions</h2>

            {globalFaqs.slice(0, 5).map((faq) => (
              <details key={faq.question}>
                <summary>
                  {faq.question}
                  <ChevronDown size={17} />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}

            <Link className="primary-text-link" to="/faq">
              View all FAQs <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link className="tool-card" to={`/tools/${tool.slug}`}>
      <div className="tool-icon">{tool.icon}</div>
      <div className="tool-category">{tool.category}</div>
      <h3>{tool.name}</h3>
      <p>{tool.description}</p>
      <ArrowRight className="tool-arrow" size={18} aria-hidden="true" />
    </Link>
  );
}

function ToolsPage() {
  const { language } = useLanguage();
  const seo = getPageSeo("tools", language).copy;
  usePageMeta(seo.title, seo.description, { schemaGraph: buildStandardPageGraph("tools", language) });
  return (
    <PageShell>
      <main className="inner-page">
        <div className="container">
          <section className="page-intro">
            <span className="eyebrow">ALL TOOLS</span>
            <h1>Online tools for everyday digital tasks</h1>
            <p>
              Explore Codivio's growing collection of QR, PDF, image and
              productivity tools.
            </p>
          </section>

          {categories.map((category) => (
            <section className="section" key={category}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{category.toUpperCase()}</span>
                  <h2>{category}</h2>
                </div>
              </div>

              <div className="tool-grid">
                {tools
                  .filter((tool) => tool.category === category)
                  .map((tool) => (
                    <ToolCard tool={tool} key={tool.slug} />
                  ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </PageShell>
  );
}

function BlogPage() {
  const { language } = useLanguage();
  const seo = getPageSeo("blog", language).copy;
  usePageMeta(seo.title, seo.description, { schemaGraph: buildStandardPageGraph("blog", language) });
  return (
    <PageShell>
      <main className="inner-page">
        <div className="container">
          <section className="page-intro">
            <span className="eyebrow">CODIVIO BLOG</span>
            <h1>Guides and practical digital tips</h1>
            <p>
              Helpful guides about QR codes, PDFs, images, productivity and
              using online tools safely.
            </p>
          </section>

          <AdSlot />

          <section className="blog-page-grid">
            {blogPosts.map((post) => (
              <article className="blog-card" key={post.title}>
                <div className="blog-card-icon">
                  <BookOpen size={23} />
                </div>
                <span>{post.category}</span>
                <h2>{post.title}</h2>
                <p>{post.text}</p>
                <Link to="/blog">
                  Read more <ArrowRight size={15} />
                </Link>
              </article>
            ))}
          </section>

          <section className="seo-content">
            <span className="eyebrow">ABOUT OUR CONTENT</span>
            <h2>Useful information, without unnecessary complexity</h2>
            <p>
              Codivio's blog is designed to explain common digital tasks in
              clear language. Our goal is to help users understand how tools
              work, choose suitable file formats and complete everyday tasks
              more efficiently.
            </p>
            <p>
              As the platform grows, the blog will include detailed tutorials,
              comparisons, practical workflows and tool-specific guides.
            </p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}

function FAQPage() {
  const { language } = useLanguage();
  const seo = getPageSeo("faq", language).copy;
  usePageMeta(seo.title, seo.description, { schemaGraph: buildStandardPageGraph("faq", language) });
  const [search, setSearch] = useState("");
  const faqs = useGlobalFaqs(language);

  const filteredFaqs = faqs.filter((faq) =>
    `${faq.question} ${faq.answer}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <PageShell>
      <main className="inner-page">
        <div className="container">
          <section className="page-intro">
            <span className="eyebrow">HELP CENTER</span>
            <h1>Frequently Asked Questions</h1>
            <p>
              Find answers about Codivio, our tools, privacy and how the
              platform works.
            </p>

            <div className="page-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search questions..."
                aria-label="Search frequently asked questions"
              />
            </div>
          </section>

          <section className="faq faq-page-list">
            {filteredFaqs.map((faq) => (
              <details key={faq.question} open={search.length > 0}>
                <summary>
                  {faq.question}
                  <ChevronDown size={17} />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}

            {filteredFaqs.length === 0 && (
              <div className="empty-state">
                <CircleHelp size={28} />
                <h2>No matching questions</h2>
                <p>Try another search phrase.</p>
              </div>
            )}
          </section>

          <section className="seo-content">
            <span className="eyebrow">CODIVIO SUPPORT</span>
            <h2>Need more help?</h2>
            <p>
              If your question is not covered here, visit the Contact page
              and send us your question. We will continue expanding this
              knowledge base as Codivio grows.
            </p>
            <Link className="primary-button" to="/contact">
              Contact Codivio
            </Link>
          </section>
        </div>
      </main>
    </PageShell>
  );
}

function AboutPage() {
  const { language } = useLanguage();
  const seo = getPageSeo("about", language).copy;
  usePageMeta(seo.title, seo.description, { schemaGraph: buildStandardPageGraph("about", language) });
  return (
    <PageShell>
      <main className="inner-page">
        <div className="container">
          <section className="page-intro">
            <span className="eyebrow">ABOUT CODIVIO</span>
            <h1>Simple tools for everyday digital work</h1>
            <p>
              Codivio is being built as a practical online toolkit for people
              who need to complete common digital tasks quickly.
            </p>
          </section>

          <section className="about-grid">
            <article>
              <div className="about-icon">
                <Sparkles size={24} />
              </div>
              <h2>Our mission</h2>
              <p>
                Make useful digital tools easier to discover, understand and
                use without unnecessary complexity.
              </p>
            </article>

            <article>
              <div className="about-icon">
                <Zap size={24} />
              </div>
              <h2>Fast and practical</h2>
              <p>
                We prioritize simple interfaces, fast experiences and
                browser-based processing whenever technically appropriate.
              </p>
            </article>

            <article>
              <div className="about-icon">
                <ShieldCheck size={24} />
              </div>
              <h2>Privacy-focused</h2>
              <p>
                Privacy and security are part of the product architecture,
                not an afterthought.
              </p>
            </article>

            <article>
              <div className="about-icon">
                <Box size={24} />
              </div>
              <h2>Growing toolkit</h2>
              <p>
                Codivio will gradually expand across QR, PDF, image and other
                useful digital categories.
              </p>
            </article>
          </section>

          <section className="seo-content">
            <span className="eyebrow">WHY CODIVIO</span>
            <h2>A growing collection of useful online tools</h2>
            <p>
              Codivio is designed around a simple idea: many everyday digital
              tasks should not require complicated software. From creating a
              QR code to working with PDF files or resizing an image, users
              should be able to find a focused tool and get the job done.
            </p>
            <p>
              The platform is being developed step by step with an emphasis on
              reliability, security, performance and a clean user experience.
            </p>
          </section>
        </div>
      </main>
    </PageShell>
  );
}

/**
 * Phase 3.14 — planned Free/Pro/Business/API plan information. Informational
 * only: no plan is purchasable (no payment integration exists anywhere in
 * this codebase), so every "Upgrade" affordance is a disabled, honestly
 * labeled "Coming soon" state — it never simulates completing a purchase.
 * Data comes entirely from shared/monetization/{plans,entitlements}.ts —
 * no price, limit, or feature availability is invented here.
 */
const ENTITLEMENT_STATUS_LABEL_KEY = {
  AVAILABLE: "statusAvailable",
  PLANNED: "statusPlanned",
  NOT_AVAILABLE: "statusNotAvailable",
} as const;

function PricingPage() {
  const { language, t } = useLanguage();
  const seo = getPageSeo("pricing", language).copy;
  usePageMeta(seo.title, seo.description, { schemaGraph: buildStandardPageGraph("pricing", language) });
  const plans = getVisiblePlansByPriority();

  return (
    <PageShell>
      <main className="inner-page">
        <div className="container">
          <section className="page-intro">
            <span className="eyebrow">{t.pricing.eyebrow}</span>
            <h1>{t.pricing.heading}</h1>
            <p>{t.pricing.intro}</p>
          </section>

          <section className="pricing-grid">
            {plans.map((plan) => (
              <article className="pricing-card" key={plan.key}>
                <span className="pricing-plan-status">
                  {plan.status === "available" ? t.pricing.statusAvailable : t.pricing.statusPlanned}
                </span>
                <h2>{plan.displayName}</h2>
                <p className="pricing-amount">
                  {plan.pricing.amount === null ? t.pricing.priceAnnounced : `${plan.pricing.amount} ${plan.pricing.currency ?? ""}`}
                </p>
                <p>{t.pricing.planDescriptions[plan.key]}</p>
                <ul className="pricing-entitlement-list">
                  {getPlanEntitlementKeys(plan.key).map((key) => (
                    <li key={key}>
                      {t.pricing.entitlementLabels[key]}
                      <span className="pricing-entitlement-status"> — {t.pricing[ENTITLEMENT_STATUS_LABEL_KEY[ENTITLEMENTS[key].status]]}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" className="pricing-upgrade-button" disabled aria-disabled="true">
                  {t.pricing.upgradeButton}
                </button>
              </article>
            ))}
          </section>

          <section className="page-intro" style={{ marginTop: 40 }}>
            <h2>{t.pricing.faqHeading}</h2>
          </section>
          <section className="pricing-faq">
            <div>
              <h3>{t.pricing.faqBuyQuestion}</h3>
              <p>{t.pricing.faqBuyAnswer}</p>
            </div>
            <div>
              <h3>{t.pricing.faqPriceQuestion}</h3>
              <p>{t.pricing.faqPriceAnswer}</p>
            </div>
            <div>
              <h3>{t.pricing.faqFreeQuestion}</h3>
              <p>{t.pricing.faqFreeAnswer}</p>
            </div>
          </section>
        </div>
      </main>
    </PageShell>
  );
}

function ContactPage() {
  const { language } = useLanguage();
  const seo = getPageSeo("contact", language).copy;
  usePageMeta(seo.title, seo.description, { schemaGraph: buildStandardPageGraph("contact", language) });
  return (
    <PageShell>
      <main className="inner-page">
        <div className="container">
          <section className="page-intro">
            <span className="eyebrow">CONTACT CODIVIO</span>
            <h1>How can we help?</h1>
            <p>
              Send us your question, feedback, tool suggestion or report about
              a problem.
            </p>
          </section>

          <section className="contact-grid">
            <div className="contact-info">
              <h2>Get in touch</h2>
              <p>
                We welcome useful feedback that can help improve Codivio.
              </p>

              <div className="contact-item">
                <MessageSquare size={20} />
                <div>
                  <strong>General questions</strong>
                  <span>Questions about Codivio and its tools.</span>
                </div>
              </div>

              <div className="contact-item">
                <Sparkles size={20} />
                <div>
                  <strong>Tool suggestions</strong>
                  <span>Tell us which tool you would like to see next.</span>
                </div>
              </div>

              <div className="contact-item">
                <ShieldCheck size={20} />
                <div>
                  <strong>Privacy and security</strong>
                  <span>Report privacy or security concerns.</span>
                </div>
              </div>
            </div>

            <form
              className="contact-form"
              onSubmit={(event) => event.preventDefault()}
            >
              <label>
                Name
                <input type="text" placeholder="Your name" />
              </label>

              <label>
                Email
                <input type="email" placeholder="you@example.com" />
              </label>

              <label>
                Subject
                <input type="text" placeholder="How can we help?" />
              </label>

              <label>
                Message
                <textarea rows={6} placeholder="Write your message..." />
              </label>

              <button className="primary-button" type="submit">
                <Upload size={16} />
                Send Message
              </button>

              <small>
                The contact form is currently a UI placeholder. Backend
                submission will be added in a later phase.
              </small>
            </form>
          </section>
        </div>
      </main>
    </PageShell>
  );
}

function LegalPage({
  title,
  seoKey,
  eyebrow,
  children,
}: {
  title: string;
  seoKey: "privacy" | "terms" | "cookies";
  eyebrow: string;
  children: React.ReactNode;
}) {
  const { language } = useLanguage();
  // The meta title/description are language-aware and unique per page
  // (Phase 3.1 — fixes the three legal pages previously sharing one
  // identical meta description). The visible H1/intro paragraph and body
  // below stay English-only for now, same as every other legal-content
  // page — translating full legal text is a separate, larger content task
  // (see PROJECT_STATE.md's SEO Foundation section).
  const seo = getPageSeo(seoKey, language).copy;
  usePageMeta(seo.title, seo.description, { schemaGraph: buildStandardPageGraph(seoKey, language) });
  return (
    <PageShell>
      <main className="inner-page">
        <div className="container">
          <section className="page-intro">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>Information about using Codivio and its services.</p>
          </section>

          <article className="legal-content">{children}</article>
        </div>
      </main>
    </PageShell>
  );
}

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" seoKey="privacy" eyebrow="PRIVACY">
      <h2>Privacy at Codivio</h2>
      <p>
        Codivio is designed with privacy and security in mind. We aim to
        minimize unnecessary data collection and use browser-based processing
        where appropriate.
      </p>
      <h2>Information and tools</h2>
      <p>
        Different tools may require different technical processing. Before a
        tool handles files or other user-provided information, Codivio will
        provide relevant information about how that processing works.
      </p>
      <h2>Analytics and advertising</h2>
      <p>
        Codivio uses Google Analytics 4 to understand how the site is used,
        but only after you have given consent — analytics cookies are off by
        default, and no analytics script is loaded until you accept them
        through the cookie consent banner or Cookie Settings. No advertising
        technology is active on Codivio today; an Advertising category
        appears in Cookie Settings only as a reserved placeholder for a
        possible future integration. You can review or change your choice at
        any time from the Cookie Policy page.
      </p>
      <h2>Contact</h2>
      <p>
        For privacy questions, please use the Contact page.
      </p>
    </LegalPage>
  );
}

function TermsPage() {
  return (
    <LegalPage title="Terms of Service" seoKey="terms" eyebrow="TERMS">
      <h2>Using Codivio</h2>
      <p>
        Codivio provides online tools intended for lawful and legitimate
        personal, educational and business use.
      </p>
      <h2>Tool availability</h2>
      <p>
        Tools may be introduced, changed, limited or temporarily unavailable
        as the platform develops.
      </p>
      <h2>Responsible use</h2>
      <p>
        Users are responsible for the files, information and content they
        process through Codivio and for complying with applicable laws.
      </p>
      <h2>Changes</h2>
      <p>
        These terms may be updated as Codivio evolves.
      </p>
    </LegalPage>
  );
}

function CookiePolicyPage() {
  const { t } = useLanguage();
  const { openSettings } = useConsent();
  const categories = t.cookieConsent.categories;

  return (
    <LegalPage title="Cookie Policy" seoKey="cookies" eyebrow="COOKIES">
      <h2>How Codivio uses cookies</h2>
      <p>
        Codivio uses cookies and similar browser storage for essential
        website functionality and, only with your consent, for analytics.
        Advertising and additional preference cookies are described below
        as reserved categories for future use — no such technology is
        active on Codivio today.
      </p>
      <h2>{categories.necessary.name}</h2>
      <p>{categories.necessary.description}</p>
      <h2>{categories.analytics.name}</h2>
      <p>{categories.analytics.description}</p>
      <h2>{categories.advertising.name}</h2>
      <p>{categories.advertising.description}</p>
      <h2>{categories.preferences.name}</h2>
      <p>{categories.preferences.description}</p>
      <h2>Changing your preferences</h2>
      <p>
        You can change your cookie preferences at any time using the button
        below. Your choice is stored only in your own browser, not on
        Codivio's servers.
      </p>
      <button type="button" className="cookie-consent-button cookie-consent-button--primary" onClick={openSettings}>
        {t.cookieConsent.managePreferencesButton}
      </button>
    </LegalPage>
  );
}

export function NotFoundPage({
  title = "Page not found",
  message = "The page you're looking for doesn't exist or may have moved.",
}: {
  title?: string;
  message?: string;
}) {
  usePageMeta(title, message, { robots: ROBOTS_NOINDEX_NOFOLLOW });

  return (
    <PageShell showSlider={false}>
      <main className="inner-page">
        <div className="container">
          <section className="page-intro">
            <span className="eyebrow">404</span>
            <h1>{title}</h1>
            <p>{message}</p>
            <Link className="primary-button" to="/">
              Back to Codivio
            </Link>
          </section>
        </div>
      </main>
    </PageShell>
  );
}

function ToolRoute() {
  const { slug } = useParams<{ slug: string }>();
  const tool = tools.find((item) => item.slug === slug);

  if (!tool) {
    return (
      <NotFoundPage
        title="Tool not found"
        message="This tool isn't available yet, or the link may be incorrect. Browse all Codivio tools to find what you need."
      />
    );
  }

  return <ToolRouteContent tool={tool} />;
}

function ToolRouteContent({ tool }: { tool: Tool }) {
  const { language } = useLanguage();
  const toolSeo = getToolSeo(tool.slug, language);
  // Falls back to the on-page name/description only if a tool is ever
  // added to the registry without a shared/seo/tools.ts entry yet —
  // tests/seo.test.ts asserts this never happens for a real tool.
  usePageMeta(toolSeo?.copy.title ?? tool.name, toolSeo?.copy.description ?? tool.description, {
    robots: toolSeo?.entity.robots ?? ROBOTS_NOINDEX_NOFOLLOW,
    schemaGraph: buildToolPageGraph(tool.slug, language),
  });

  return (
    <div className="app">
      <SiteHeader />
      <Suspense fallback={null}>
        <ToolPage
          name={tool.name}
          description={tool.description}
          category={tool.category}
          slug={tool.slug}
        />
      </Suspense>
      <ToolSlider />
      <SiteFooter />
    </div>
  );
}

/**
 * Phase 2.9 — public rendering foundation for Admin-managed Pages. Content
 * is always rendered as plain text (React's default text-node escaping) —
 * never dangerouslySetInnerHTML — since worker/pages.ts stores it verbatim
 * without HTML sanitization; safety here comes from how it's rendered, not
 * from input filtering (see shared/pages.ts for the full reasoning). Only
 * ever fetches /api/pages/:slug, which itself only ever returns a
 * status = 'published' row — draft/archived pages 404 here exactly like a
 * page that doesn't exist at all.
 */
type PublicCmsPage = {
  title: string;
  slug: string;
  description: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  isIndexable: boolean;
};

type CmsPageLoadState =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "ready"; page: PublicCmsPage };

function CmsPageContent({ page }: { page: PublicCmsPage }) {
  // The Admin-set isIndexable flag (shared/pages.ts) already exists and is
  // already returned by GET /api/pages/:slug (worker/pages.ts) — this was
  // previously never read on the frontend, so a page an editor marked
  // "not indexable" still had no robots directive at all. A custom
  // canonicalUrl is honored only if it's a valid absolute https:// URL
  // (see isSafeAbsoluteHttpsUrl); otherwise the real page path is used.
  usePageMeta(page.metaTitle || page.title, page.metaDescription || page.description || page.title, {
    robots: page.isIndexable ? undefined : ROBOTS_NOINDEX_NOFOLLOW,
    canonicalOverride: page.canonicalUrl || undefined,
  });

  return (
    <PageShell showSlider={false}>
      <main className="inner-page">
        <div className="container">
          <section className="page-intro">
            <h1>{page.title}</h1>
            {page.description && <p>{page.description}</p>}
          </section>

          <article className="legal-content cms-page-content">{page.content}</article>
        </div>
      </main>
    </PageShell>
  );
}

function CmsPageRoute() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<CmsPageLoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`/api/pages/${encodeURIComponent(slug ?? "")}`)
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setState({ status: "notfound" });
          return;
        }
        const data = (await response.json()) as { page: PublicCmsPage };
        setState({ status: "ready", page: data.page });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "notfound" });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.status === "notfound") {
    return <NotFoundPage />;
  }

  if (state.status === "ready") {
    return <CmsPageContent page={state.page} />;
  }

  return (
    <PageShell showSlider={false}>
      <main className="inner-page">
        <div className="container" />
      </main>
    </PageShell>
  );
}

/**
 * Phase 3 Finalization — route scroll restoration.
 *
 * react-router-dom's plain <BrowserRouter>/<Routes> (used here, not the data
 * router APIs) does not reset or restore scroll position on navigation by
 * itself. Without this, a route change (e.g. a footer link) left the new
 * page scrolled to wherever the previous page happened to be, and Back/
 * Forward did not return to the previous scroll position either.
 *
 * Behavior: a normal navigation (PUSH/REPLACE — clicking a link) scrolls to
 * the top of the new page, matching standard multi-page-site behavior. A
 * Back/Forward navigation (POP) restores the scroll position that page had
 * when the user left it. A location with a hash (e.g. "/pricing#faq")
 * scrolls the matching element into view instead of the top, when that
 * element exists on the page.
 *
 * The browser's own scrollRestoration is set to "manual" so it does not
 * fight with this — otherwise Chrome/Firefox's native Back/Forward scroll
 * restoration can run before or after this effect and produce a visible
 * double-jump.
 */
function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const savedPositions = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const key = location.key;
    return () => {
      savedPositions.current.set(key, window.scrollY);
    };
  }, [location]);

  useEffect(() => {
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    if (navigationType === "POP") {
      window.scrollTo(0, savedPositions.current.get(location.key) ?? 0);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location, navigationType]);

  return null;
}

/**
 * GA4 foundational page-view tracking.
 *
 * Mirrors ScrollRestoration's own single-point, side-effect-only component
 * pattern: rendered once at the top of <App>, reacting to route changes via
 * useLocation, rather than every page component wiring this up itself. See
 * src/lib/analytics.ts for the actual gtag.js integration, the
 * production-host guard, and the /admin exclusion.
 *
 * Enabling/disabling gtag.js itself in response to a consent change is
 * handled centrally by ConsentProvider (src/consent/ConsentContext.tsx),
 * not here — this component only ever decides whether *this specific
 * route change* should send a page_view, based on the current consent.
 * Without analytics consent, trackPageView is never even called, which is
 * a second, independently-verifiable guarantee on top of trackPageView's
 * own internal enabled/disabled check in src/lib/analytics.ts.
 */
function Analytics() {
  const location = useLocation();
  const { consent } = useConsent();

  useEffect(() => {
    if (consent?.analytics) {
      trackPageView(location.pathname);
    }
  }, [location.pathname, consent?.analytics]);

  return null;
}

function App() {
  return (
    <>
      <ScrollRestoration />
      <Analytics />
      <CookieConsentBanner />
      <CookieSettingsModal />
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/tools" element={<ToolsPage />} />
      <Route path="/tools/:slug" element={<ToolRoute />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/cookies" element={<CookiePolicyPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<ProtectedAdminRoute />}>
        <Route index element={<AdminDashboardPlaceholder />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="pages" element={<AdminPagesPage />} />
        <Route path="tools" element={<AdminToolsPage />} />
        <Route path="faq" element={<AdminFaqPage />} />
        <Route path="users" element={<AdminComingSoonPage moduleKey="usersCrm" />} />
        <Route path="blog" element={<AdminComingSoonPage moduleKey="blog" />} />
        <Route path="analytics" element={<AdminComingSoonPage moduleKey="analytics" />} />
        <Route path="seo" element={<AdminSeoPage />} />
        <Route path="search-console" element={<AdminComingSoonPage moduleKey="searchConsole" />} />
        <Route path="advertising" element={<AdminComingSoonPage moduleKey="advertising" />} />
        <Route path="affiliate" element={<AdminComingSoonPage moduleKey="affiliate" />} />
        <Route path="monetization" element={<AdminComingSoonPage moduleKey="monetization" />} />
        <Route path="social" element={<AdminComingSoonPage moduleKey="social" />} />
        <Route path="reports" element={<AdminComingSoonPage moduleKey="reports" />} />
        <Route path="system" element={<AdminComingSoonPage moduleKey="systemHealth" />} />
        <Route path="audit-log" element={<AdminComingSoonPage moduleKey="auditLog" />} />
      </Route>
      <Route path="/:slug" element={<CmsPageRoute />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;