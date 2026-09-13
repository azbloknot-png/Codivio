import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { Link, Route, Routes, useParams } from "react-router-dom";
import ToolPage from "./pages/ToolPage";
import { AdminDashboardPlaceholder, AdminLoginPage, ProtectedAdminRoute } from "./admin/AdminApp";
import AdminSettingsPage from "./admin/AdminSettingsPage";
import AdminPagesPage from "./admin/AdminPagesPage";
import AdminToolsPage from "./admin/AdminToolsPage";
import AdminComingSoonPage from "./admin/AdminComingSoonPage";

/** Basic per-route SEO: sets document.title and the meta description tag.
 * Phase 1 scope only (no structured data/sitemap/canonical management here —
 * that is Phase 3 SEO/AEO/GEO work). */
export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = `${title} | Codivio`;
    const tag = document.querySelector('meta[name="description"]');
    tag?.setAttribute("content", description);
  }, [title, description]);
}

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

const faqs = [
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

  return (
    <header className="header">
      <div className="container nav">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
          <img className="brand-logo" src="/assets/branding/codivio-logo.png" alt="Codivio" />
          Codivio
        </Link>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <Link to="/tools" onClick={() => setMenuOpen(false)}>
            Tools
          </Link>
          <Link to="/blog" onClick={() => setMenuOpen(false)}>
            Blog
          </Link>
          <Link to="/faq" onClick={() => setMenuOpen(false)}>
            FAQ
          </Link>
          <Link to="/about" onClick={() => setMenuOpen(false)}>
            About
          </Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>
        </nav>

        <div className="nav-actions">
          <div className="nav-search">
            <Search size={15} />
            <input aria-label="Search tools" placeholder="Search tools..." />
          </div>

          <button
            className="mobile-menu"
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link className="brand" to="/">
              <img className="brand-logo" src="/assets/branding/codivio-logo.png" alt="Codivio" />
              Codivio
            </Link>
            <p>
              Free online tools for QR codes, PDF files, images and everyday
              digital tasks.
            </p>
          </div>

          <div>
            <b>Tools</b>
            <Link to="/tools">All Tools</Link>
            <Link to="/tools/qr-code-generator">QR Tools</Link>
            <Link to="/tools/pdf-merge">PDF Tools</Link>
            <Link to="/tools/image-resize">Image Tools</Link>
          </div>

          <div>
            <b>Company</b>
            <Link to="/about">About</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
          </div>

          <div>
            <b>Information</b>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>

        <div className="copyright">
          © {new Date().getFullYear()} Codivio. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function AdSlot({ label = "ADVERTISEMENT" }: { label?: string }) {
  return (
    <div className="container">
      <div className="ad-slot">
        {label}
        <span>Advertisement</span>
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
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      {children}
      {showSlider && <ToolSlider />}
      <SiteFooter />
    </div>
  );
}

function HomePage() {
  usePageMeta(
    "Free Online Tools",
    "Codivio - free online tools for QR codes, PDF files, images and everyday digital tasks."
  );
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
              <span className="eyebrow">SIMPLE. FAST. USEFUL.</span>
              <h1>
                Free online tools,
                <br />
                <span>made simple.</span>
              </h1>
              <p>
                Codivio brings together fast, practical tools for QR codes,
                PDFs, images and everyday digital tasks.
              </p>

              <div className="hero-search">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="What do you need to do?"
                  aria-label="Search Codivio tools"
                />
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("popular-tools")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Search
                </button>
              </div>

              <div className="trust-row">
                <span>
                  <CheckCircle2 size={15} />
                  Free to use
                </span>
                <span>
                  <ShieldCheck size={15} />
                  Privacy-focused
                </span>
                <span>
                  <Zap size={15} />
                  Fast tools
                </span>
              </div>
            </div>

            <div className="hero-ad-slot" role="complementary" aria-label="Advertisement">
              <span className="hero-ad-label">ADVERTISEMENT</span>
              <span className="hero-ad-note">Ad space available</span>
            </div>
          </div>
        </section>

        <AdSlot />

        <section className="section" id="popular-tools">
          <div className="container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">START HERE</span>
                <h2>Popular Tools</h2>
              </div>
              <div className="popular-tools-heading-actions">
                <Link to="/tools">
                  View all <ArrowRight size={15} />
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
                <span className="eyebrow">QR TOOLS</span>
                <h2>QR Tools</h2>
              </div>
              <div className="popular-tools-heading-actions">
                <Link to="/tools">
                  View all <ArrowRight size={15} />
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
                <span className="eyebrow">PDF TOOLS</span>
                <h2>PDF Tools</h2>
              </div>
              <div className="popular-tools-heading-actions">
                <Link to="/tools">
                  View all <ArrowRight size={15} />
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
                <span className="eyebrow">IMAGE &amp; OTHER TOOLS</span>
                <h2>Image &amp; Other Tools</h2>
              </div>
              <div className="popular-tools-heading-actions">
                <Link to="/tools">
                  View all <ArrowRight size={15} />
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
                <span className="eyebrow">CODIVIO BLOG</span>
                <h2>Guides, tips and useful ideas</h2>
              </div>
              <div className="popular-tools-heading-actions">
                <Link className="primary-text-link" to="/blog">
                  Read the blog <ArrowRight size={15} />
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

            {faqs.slice(0, 5).map((faq) => (
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
  usePageMeta(
    "All Tools",
    "Explore Codivio's growing collection of QR, PDF, image and productivity tools."
  );
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
  usePageMeta(
    "Blog",
    "Helpful guides about QR codes, PDFs, images, productivity and using online tools safely."
  );
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
  usePageMeta(
    "FAQ",
    "Find answers about Codivio, our tools, privacy and how the platform works."
  );
  const [search, setSearch] = useState("");

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
  usePageMeta(
    "About",
    "Codivio is being built as a practical online toolkit for people who need to complete common digital tasks quickly."
  );
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

function ContactPage() {
  usePageMeta(
    "Contact",
    "Send us your question, feedback, tool suggestion or report about a problem."
  );
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
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  usePageMeta(title, "Information about using Codivio and its services.");
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
    <LegalPage title="Privacy Policy" eyebrow="PRIVACY">
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
        Codivio may use analytics and advertising services in the future. When
        these services require user consent, they will be controlled through
        the site's cookie preferences.
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
    <LegalPage title="Terms of Service" eyebrow="TERMS">
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
  return (
    <LegalPage title="Cookie Policy" eyebrow="COOKIES">
      <h2>How Codivio uses cookies</h2>
      <p>
        Codivio may use cookies or similar technologies for essential website
        functionality, analytics and advertising.
      </p>
      <h2>Necessary cookies</h2>
      <p>
        Necessary technologies help the website operate correctly. These
        cannot be disabled through the optional cookie settings.
      </p>
      <h2>Optional cookies</h2>
      <p>
        Analytics and advertising technologies will be optional where consent
        is legally required. Your preferences will be respected by the
        platform.
      </p>
      <h2>Changing your preferences</h2>
      <p>
        Codivio will provide a cookie settings interface that allows you to
        change optional cookie preferences.
      </p>
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
  usePageMeta(title, message);

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
  usePageMeta(tool.name, tool.description);

  return (
    <div className="app">
      <SiteHeader />
      <ToolPage
        name={tool.name}
        description={tool.description}
        category={tool.category}
      />
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
};

type CmsPageLoadState =
  | { status: "loading" }
  | { status: "notfound" }
  | { status: "ready"; page: PublicCmsPage };

function CmsPageContent({ page }: { page: PublicCmsPage }) {
  usePageMeta(page.metaTitle || page.title, page.metaDescription || page.description || page.title);

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

function App() {
  return (
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
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<ProtectedAdminRoute />}>
        <Route index element={<AdminDashboardPlaceholder />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="pages" element={<AdminPagesPage />} />
        <Route path="tools" element={<AdminToolsPage />} />
        <Route
          path="users"
          element={
            <AdminComingSoonPage
              title="Users / CRM"
              description="Manage admin and customer accounts, roles, and relationship history."
              categories={["Total users", "Free / Pro / Business", "Active & retention", "Churn & conversion", "CRM history"]}
            />
          }
        />
        <Route
          path="blog"
          element={
            <AdminComingSoonPage
              title="Blog"
              description="Plan, draft and publish Codivio articles with SEO and affiliate context."
              categories={["Categories", "Articles", "Authors", "Draft / Published / Archived", "SEO", "Related tools", "Affiliate offers"]}
            />
          }
        />
        <Route
          path="analytics"
          element={
            <AdminComingSoonPage
              title="Analytics"
              description="Real traffic, tool usage and audience insight once GA4/Search Console are connected."
              categories={["Traffic", "Tool usage", "Audience", "Search performance", "Growth"]}
            />
          }
        />
        <Route
          path="seo"
          element={
            <AdminComingSoonPage
              title="SEO"
              description="A complete SEO management center for the whole site, tools and blog."
              categories={["Global SEO", "Technical SEO", "Page SEO", "Tool SEO", "Blog SEO", "Schema", "AI discoverability"]}
            />
          }
        />
        <Route
          path="search-console"
          element={
            <AdminComingSoonPage
              title="Search Console"
              description="Connect Google Search Console for real query, click and indexing data."
              categories={["Queries", "Clicks & impressions", "CTR & position", "Indexed pages", "Search appearance"]}
            />
          }
        />
        <Route
          path="advertising"
          element={
            <AdminComingSoonPage
              title="Advertising"
              description="Manage ad slots, providers and campaigns across the site."
              categories={["Slots", "Providers", "Campaigns", "Schedule & priority", "Performance"]}
            />
          }
        />
        <Route
          path="affiliate"
          element={
            <AdminComingSoonPage
              title="Affiliate"
              description="Manage affiliate offers, tracking and disclosure — kept separate from Codivio's own premium services."
              categories={["Providers", "Offers", "Tracking", "Disclosure", "Revenue"]}
            />
          }
        />
        <Route
          path="monetization"
          element={
            <AdminComingSoonPage
              title="Monetization"
              description="A unified view of subscription, premium-service, affiliate and ad revenue."
              categories={["Plans", "Subscription revenue", "Premium services", "Revenue per user", "Growth"]}
            />
          }
        />
        <Route
          path="social"
          element={
            <AdminComingSoonPage
              title="Social"
              description="Manage Codivio's social presence and referral performance."
              categories={["Instagram", "Facebook", "YouTube", "TikTok", "X", "LinkedIn"]}
            />
          }
        />
        <Route
          path="reports"
          element={
            <AdminComingSoonPage
              title="Reports"
              description="Generate traffic, SEO, revenue and system reports on a schedule."
              categories={["Daily / Weekly / Monthly", "Traffic", "SEO", "Revenue", "System health", "CSV / PDF export"]}
            />
          }
        />
        <Route
          path="system"
          element={
            <AdminComingSoonPage
              title="System Health"
              description="Live status for the Worker, D1, storage and background jobs."
              categories={["Worker health", "D1 health", "Storage & bandwidth", "Processing", "Backups", "API health"]}
            />
          }
        />
        <Route
          path="audit-log"
          element={
            <AdminComingSoonPage
              title="Audit Log"
              description="A searchable read view over the existing audit_logs table."
              categories={["Authentication events", "Authorization denials", "Settings changes", "Pages/Tools mutations", "Actor & timestamp"]}
            />
          }
        />
      </Route>
      <Route path="/:slug" element={<CmsPageRoute />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;