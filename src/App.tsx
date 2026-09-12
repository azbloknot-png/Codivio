import { useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import ToolPage from "./pages/ToolPage";
import {
  Search,
  QrCode,
  ScanLine,
  FileText,
  Image as ImageIcon,
  Minimize2,
  Combine,
  Maximize,
  ArrowRight,
  ShieldCheck,
  Zap,
  Monitor,
  Menu,
  X,
} from "lucide-react";

type Tool = {
  name: string;
  slug: string;
  description: string;
  category: "QR Tools" | "PDF Tools" | "Image Tools" | "Other Tools";
  icon: React.ReactNode;
  status: "coming-soon";
};

const tools: Tool[] = [
  // QR Tools
  {
    name: "QR Code Generator",
    slug: "qr-code-generator",
    status: "coming-soon",
    description: "Create QR codes for URLs, text, WiFi and more.",
    category: "QR Tools",
    icon: <QrCode />,
  },
  {
    name: "QR Code Scanner",
    slug: "qr-code-scanner",
    status: "coming-soon",
    description: "Scan a QR code using your camera or an image.",
    category: "QR Tools",
    icon: <ScanLine />,
  },
  {
    name: "URL to QR Code",
    slug: "url-to-qr-code",
    status: "coming-soon",
    description: "Turn any URL into a QR code.",
    category: "QR Tools",
    icon: <QrCode />,
  },
  {
    name: "Text to QR Code",
    slug: "text-to-qr-code",
    status: "coming-soon",
    description: "Convert text into a scannable QR code.",
    category: "QR Tools",
    icon: <QrCode />,
  },
  {
    name: "WiFi QR Code",
    slug: "wifi-qr-code",
    status: "coming-soon",
    description: "Create a QR code for fast WiFi sharing.",
    category: "QR Tools",
    icon: <QrCode />,
  },
  {
    name: "vCard QR Code",
    slug: "vcard-qr-code",
    status: "coming-soon",
    description: "Share contact details with a QR code.",
    category: "QR Tools",
    icon: <QrCode />,
  },
  {
    name: "Email QR Code",
    slug: "email-qr-code",
    status: "coming-soon",
    description: "Create a QR code that opens an email.",
    category: "QR Tools",
    icon: <QrCode />,
  },
  {
    name: "SMS QR Code",
    slug: "sms-qr-code",
    status: "coming-soon",
    description: "Create a QR code for sending an SMS.",
    category: "QR Tools",
    icon: <QrCode />,
  },
  {
    name: "WhatsApp QR Code",
    slug: "whatsapp-qr-code",
    status: "coming-soon",
    description: "Create a QR code for a WhatsApp conversation.",
    category: "QR Tools",
    icon: <QrCode />,
  },
  {
    name: "Phone QR Code",
    slug: "phone-qr-code",
    status: "coming-soon",
    description: "Create a QR code for a phone number.",
    category: "QR Tools",
    icon: <QrCode />,
  },
  {
    name: "Location QR Code",
    slug: "location-qr-code",
    status: "coming-soon",
    description: "Create a QR code for a location or map link.",
    category: "QR Tools",
    icon: <QrCode />,
  },
  {
    name: "Calendar QR Code",
    slug: "calendar-qr-code",
    status: "coming-soon",
    description: "Create a QR code for a calendar event.",
    category: "QR Tools",
    icon: <QrCode />,
  },

  // PDF Tools
  {
    name: "PDF Merge",
    slug: "pdf-merge",
    status: "coming-soon",
    description: "Combine multiple PDF files into one.",
    category: "PDF Tools",
    icon: <Combine />,
  },
  {
    name: "PDF Split",
    slug: "pdf-split",
    status: "coming-soon",
    description: "Split a PDF into separate files or pages.",
    category: "PDF Tools",
    icon: <FileText />,
  },
  {
    name: "PDF Compress",
    slug: "pdf-compress",
    status: "coming-soon",
    description: "Reduce PDF file size online.",
    category: "PDF Tools",
    icon: <Minimize2 />,
  },
  {
    name: "PDF to JPG",
    slug: "pdf-to-jpg",
    status: "coming-soon",
    description: "Convert PDF pages into JPG images.",
    category: "PDF Tools",
    icon: <FileText />,
  },
  {
    name: "JPG to PDF",
    slug: "jpg-to-pdf",
    status: "coming-soon",
    description: "Convert JPG images into a PDF document.",
    category: "PDF Tools",
    icon: <FileText />,
  },
  {
    name: "PDF to Word",
    slug: "pdf-to-word",
    status: "coming-soon",
    description: "Convert PDF documents into Word files.",
    category: "PDF Tools",
    icon: <FileText />,
  },
  {
    name: "PDF to Excel",
    slug: "pdf-to-excel",
    status: "coming-soon",
    description: "Convert PDF tables and documents into Excel files.",
    category: "PDF Tools",
    icon: <FileText />,
  },
  {
    name: "PDF Rotate",
    slug: "pdf-rotate",
    status: "coming-soon",
    description: "Rotate PDF pages and save the result.",
    category: "PDF Tools",
    icon: <FileText />,
  },

  // Image Tools
  {
    name: "Image Resize",
    slug: "image-resize",
    status: "coming-soon",
    description: "Resize images to exact dimensions.",
    category: "Image Tools",
    icon: <Maximize />,
  },
  {
    name: "Image Compress",
    slug: "image-compress",
    status: "coming-soon",
    description: "Reduce image size while preserving quality.",
    category: "Image Tools",
    icon: <Minimize2 />,
  },
  {
    name: "Image Converter",
    slug: "image-converter",
    status: "coming-soon",
    description: "Convert JPG, PNG and WebP images.",
    category: "Image Tools",
    icon: <ImageIcon />,
  },
  {
    name: "JPG to PNG",
    slug: "jpg-to-png",
    status: "coming-soon",
    description: "Convert JPG images to PNG format.",
    category: "Image Tools",
    icon: <ImageIcon />,
  },
  {
    name: "PNG to JPG",
    slug: "png-to-jpg",
    status: "coming-soon",
    description: "Convert PNG images to JPG format.",
    category: "Image Tools",
    icon: <ImageIcon />,
  },
  {
    name: "WebP Converter",
    slug: "webp-converter",
    status: "coming-soon",
    description: "Convert images to and from WebP format.",
    category: "Image Tools",
    icon: <ImageIcon />,
  },
  {
    name: "Image Crop",
    slug: "image-crop",
    status: "coming-soon",
    description: "Crop images to the exact area you need.",
    category: "Image Tools",
    icon: <Maximize />,
  },
  {
    name: "Image Rotate",
    slug: "image-rotate",
    status: "coming-soon",
    description: "Rotate images quickly in your browser.",
    category: "Image Tools",
    icon: <Maximize />,
  },
  {
    name: "Background Remover",
    slug: "background-remover",
    status: "coming-soon",
    description: "Remove image backgrounds quickly.",
    category: "Image Tools",
    icon: <ImageIcon />,
  },
  {
    name: "Image to PDF",
    slug: "image-to-pdf",
    status: "coming-soon",
    description: "Convert images into a PDF document.",
    category: "Image Tools",
    icon: <FileText />,
  },
  {
    name: "PDF to Image",
    slug: "pdf-to-image",
    status: "coming-soon",
    description: "Convert PDF pages into image files.",
    category: "Image Tools",
    icon: <ImageIcon />,
  },

  // Other Tools
  {
    name: "GIF Maker",
    slug: "gif-maker",
    status: "coming-soon",
    description: "Create animated GIFs from images or video.",
    category: "Other Tools",
    icon: <ImageIcon />,
  },
  {
    name: "Meme Generator",
    slug: "meme-generator",
    status: "coming-soon",
    description: "Create simple memes with your own images and text.",
    category: "Other Tools",
    icon: <ImageIcon />,
  },
  {
    name: "Color Palette Generator",
    slug: "color-palette-generator",
    status: "coming-soon",
    description: "Generate useful color palettes for your projects.",
    category: "Other Tools",
    icon: <ImageIcon />,
  },
];

const categories = [
  "QR Tools",
  "PDF Tools",
  "Image Tools",
  "Other Tools",
] as const;

function HomePage() {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return q
      ? tools.filter((tool) =>
          `${tool.name} ${tool.description} ${tool.category}`
            .toLowerCase()
            .includes(q)
        )
      : tools;
  }, [query]);

  return (
    <div className="app">
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            <span className="brand-mark">
              <QrCode size={20} />
            </span>
            <span>Codivio</span>
          </a>

          <nav className={`nav-links ${mobileOpen ? "open" : ""}`}>
            <a href="/categories/qr-tools">QR Tools</a>
            <a href="/categories/pdf-tools">PDF Tools</a>
            <a href="/categories/image-tools">Image Tools</a>
            <a href="/tools">All Tools</a>
            <a href="/blog">Blog</a>
          </nav>

          <div className="nav-actions">
            <div className="nav-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tools..."
              />
            </div>

            <button
              className="mobile-menu"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Menu"
            >
              {mobileOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">FREE ONLINE TOOLS</span>

              <h1>
                Free Online Tools.
                <br />
                <span>Simple. Fast. Useful.</span>
              </h1>

              <p>
                Free online tools for QR codes, PDFs, images and everyday
                digital tasks. Create, convert, compress and manage your files
                directly in your browser.
              </p>

              <div className="hero-search">
                <Search size={20} />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search for a tool, e.g. QR generator..."
                />

                <button type="button">Search</button>
              </div>

              <div className="trust-row">
                <span>
                  <ShieldCheck size={17} /> Free to use
                </span>

                <span>
                  <Zap size={17} /> Fast
                </span>

                <span>
                  <Monitor size={17} /> All devices
                </span>
              </div>
            </div>

            <div className="hero-art">
              <div className="floating-card qr-card">
                <QrCode size={68} />
                <b>QR</b>
              </div>

              <div className="floating-card pdf-card">
                <FileText size={58} />
                <b>PDF</b>
              </div>

              <div className="floating-card image-card">
                <ImageIcon size={58} />
                <b>IMAGE</b>
              </div>
            </div>
          </div>
        </section>

        <section className="container ad-slot">
          ADVERTISEMENT <span>728 x 90</span>
        </section>

        <section className="container section" id="all">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EXPLORE</span>
              <h2>Popular Tools</h2>
            </div>

            <a href="#all">
              View all tools <ArrowRight size={16} />
            </a>
          </div>

          <div className="tool-grid">
            {filtered
              .slice(0, 8)
              .map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
          </div>
        </section>

        {categories.map((category) => {
          const items = filtered.filter(
            (tool) => tool.category === category
          );

          if (!items.length) {
            return null;
          }

          const id = category.split(" ")[0].toLowerCase();

          return (
            <section
              className="container section"
              id={id}
              key={category}
            >
              <div className="section-heading">
                <div>
                  <span className="eyebrow">{category}</span>
                  <h2>{category}</h2>
                </div>
              </div>

              <div className="tool-grid">
                {items.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            </section>
          );
        })}

        <section className="container ad-slot">
          ADVERTISEMENT <span>728 x 90</span>
        </section>

        <section className="container content-section" id="blog">
          <div>
            <span className="eyebrow">CODIVIO BLOG</span>

            <h2>Helpful guides for everyday digital tasks</h2>

            <p>
              Learn how to create QR codes, compress PDFs, resize images and
              choose the right file format. Our blog is built around practical
              answers and useful tutorials.
            </p>
          </div>

          <div className="article-list">
            <article>
              <span>QR CODES</span>
              <h3>How to Create a QR Code for Free</h3>
              <a href="#">
                Read article <ArrowRight size={15} />
              </a>
            </article>

            <article>
              <span>PDF</span>
              <h3>How to Compress a PDF Without Losing Quality</h3>
              <a href="#">
                Read article <ArrowRight size={15} />
              </a>
            </article>

            <article>
              <span>IMAGE</span>
              <h3>JPG vs PNG vs WebP: Which Format Should You Use?</h3>
              <a href="#">
                Read article <ArrowRight size={15} />
              </a>
            </article>
          </div>
        </section>

        <section className="container faq">
          <div className="section-heading">
            <div>
              <span className="eyebrow">FAQ</span>
              <h2>Frequently Asked Questions</h2>
            </div>
          </div>

          {[
            [
              "Are Codivio tools free?",
              "Yes. The platform is designed around free, easy-to-use online tools.",
            ],
            [
              "Do I need an account?",
              "Core tools can be designed to work without registration.",
            ],
            [
              "Can I use Codivio on mobile?",
              "Yes. The interface is responsive and designed for phones, tablets and desktop.",
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <a className="brand" href="/">
              <span className="brand-mark">
                <QrCode size={18} />
              </span>
              Codivio
            </a>

            <p>Free online tools for everyday digital tasks.</p>
          </div>

          <div>
            <b>Tools</b>
            <a href="/categories/qr-tools">QR Tools</a>
            <a href="/categories/pdf-tools">PDF Tools</a>
            <a href="/categories/image-tools">Image Tools</a>
          </div>

          <div>
            <b>Resources</b>
            <a href="/blog">Blog</a>
            <a href="/faq">FAQ</a>
          </div>

          <div>
            <b>Legal</b>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/contact">Contact</a>
          </div>
        </div>

        <div className="container copyright">
          (c) 2026 Codivio. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <a className="tool-card" href={`/tools/${tool.slug}`}>
      <div className="tool-icon">{tool.icon}</div>

      <div className="tool-category">{tool.category}</div>

      <h3>{tool.name}</h3>

      <p>{tool.description}</p>

      <span className="tool-arrow">
        <ArrowRight size={15} />
      </span>
    </a>
  );
}

function ToolRoute() {
  const { slug } = useParams<{ slug: string }>();

  const tool = tools.find((item) => item.slug === slug);

  if (!tool) {
    return <Navigate to="/" replace />;
  }

  return (
    <ToolPage
      name={tool.name}
      description={tool.description}
      category={tool.category}
    />
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/tools/:slug" element={<ToolRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;