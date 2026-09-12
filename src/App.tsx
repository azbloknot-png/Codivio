import { useMemo, useState } from "react";
import {
  Search, QrCode, ScanLine, FileText, Image as ImageIcon,
  Minimize2, Combine, Maximize, ArrowRight, ShieldCheck,
  Zap, Monitor, Menu, X
} from "lucide-react";

type Tool = {
  name: string;
  description: string;
  category: "QR Tools" | "PDF Tools" | "Image Tools" | "Other Tools";
  icon: React.ReactNode;
};

const tools: Tool[] = [
  { name: "QR Code Generator", description: "Create QR codes for URLs, text, WiFi and more.", category: "QR Tools", icon: <QrCode /> },
  { name: "QR Code Scanner", description: "Scan a QR code using your camera or an image.", category: "QR Tools", icon: <ScanLine /> },
  { name: "WiFi QR Code", description: "Create a QR code for fast WiFi sharing.", category: "QR Tools", icon: <QrCode /> },
  { name: "vCard QR Code", description: "Share contact details with a QR code.", category: "QR Tools", icon: <QrCode /> },
  { name: "PDF Merge", description: "Combine multiple PDF files into one.", category: "PDF Tools", icon: <Combine /> },
  { name: "PDF Split", description: "Split a PDF into separate files or pages.", category: "PDF Tools", icon: <FileText /> },
  { name: "PDF Compress", description: "Reduce PDF file size online.", category: "PDF Tools", icon: <Minimize2 /> },
  { name: "PDF to JPG", description: "Convert PDF pages into JPG images.", category: "PDF Tools", icon: <FileText /> },
  { name: "Image Resize", description: "Resize images to exact dimensions.", category: "Image Tools", icon: <Maximize /> },
  { name: "Image Compress", description: "Reduce image size while preserving quality.", category: "Image Tools", icon: <Minimize2 /> },
  { name: "Image Converter", description: "Convert JPG, PNG and WebP images.", category: "Image Tools", icon: <ImageIcon /> },
  { name: "Background Remover", description: "Remove image backgrounds quickly.", category: "Image Tools", icon: <ImageIcon /> },
];

const categories = ["QR Tools", "PDF Tools", "Image Tools", "Other Tools"] as const;

function App() {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? tools.filter(t => `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q)) : tools;
  }, [query]);

  return (
    <div className="app">
      <header className="header">
        <div className="container nav">
          <a className="brand" href="/">
            <span className="brand-mark"><QrCode size={20}/></span>
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
              <Search size={16}/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tools..." />
            </div>
            <button className="mobile-menu" onClick={() => setMobileOpen(v => !v)} aria-label="Menu">
              {mobileOpen ? <X/> : <Menu/>}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">FREE ONLINE TOOLS</span>
              <h1>Simple Tools.<br/><span>Powerful Results.</span></h1>
              <p>Free online tools for QR codes, PDFs, images and everyday digital tasks. Fast, simple and designed to work in your browser.</p>
              <div className="hero-search">
                <Search size={20}/>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for a tool, e.g. QR generator..." />
                <button>Search</button>
              </div>
              <div className="trust-row">
                <span><ShieldCheck size={17}/> Free to use</span>
                <span><Zap size={17}/> Fast</span>
                <span><Monitor size={17}/> All devices</span>
              </div>
            </div>
            <div className="hero-art">
              <div className="floating-card qr-card"><QrCode size={68}/><b>QR</b></div>
              <div className="floating-card pdf-card"><FileText size={58}/><b>PDF</b></div>
              <div className="floating-card image-card"><ImageIcon size={58}/><b>IMAGE</b></div>
            </div>
          </div>
        </section>

        <section className="container ad-slot">ADVERTISEMENT <span>728 x 90</span></section>

        <section className="container section" id="all">
          <div className="section-heading">
            <div><span className="eyebrow">EXPLORE</span><h2>Popular Tools</h2></div>
            <a href="#all">View all tools <ArrowRight size={16}/></a>
          </div>
          <div className="tool-grid">
            {filtered.slice(0, 8).map(t => <ToolCard key={t.name} tool={t}/>)}
          </div>
        </section>

        {categories.map(cat => {
          const items = filtered.filter(t => t.category === cat);
          if (!items.length) return null;
          const id = cat.split(" ")[0].toLowerCase();
          return (
            <section className="container section" id={id} key={cat}>
              <div className="section-heading">
                <div><span className="eyebrow">{cat}</span><h2>{cat}</h2></div>
              </div>
              <div className="tool-grid">
                {items.map(t => <ToolCard key={t.name} tool={t}/>)}
              </div>
            </section>
          );
        })}

        <section className="container ad-slot">ADVERTISEMENT <span>728 x 90</span></section>

        <section className="container content-section" id="blog">
          <div>
            <span className="eyebrow">CODIVIO BLOG</span>
            <h2>Helpful guides for everyday digital tasks</h2>
            <p>Learn how to create QR codes, compress PDFs, resize images and choose the right file format. Our blog is built around practical answers and useful tutorials.</p>
          </div>
          <div className="article-list">
            <article><span>QR CODES</span><h3>How to Create a QR Code for Free</h3><a href="#">Read article <ArrowRight size={15}/></a></article>
            <article><span>PDF</span><h3>How to Compress a PDF Without Losing Quality</h3><a href="#">Read article <ArrowRight size={15}/></a></article>
            <article><span>IMAGE</span><h3>JPG vs PNG vs WebP: Which Format Should You Use?</h3><a href="#">Read article <ArrowRight size={15}/></a></article>
          </div>
        </section>

        <section className="container faq">
          <div className="section-heading"><div><span className="eyebrow">FAQ</span><h2>Frequently Asked Questions</h2></div></div>
          {[
            ["Are Codivio tools free?", "Yes. The platform is designed around free, easy-to-use online tools."],
            ["Do I need an account?", "Core tools can be designed to work without registration."],
            ["Can I use Codivio on mobile?", "Yes. The interface is responsive and designed for phones, tablets and desktop."],
          ].map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-grid">
          <div><a className="brand" href="/"><span className="brand-mark"><QrCode size={18}/></span>Codivio</a><p>Free online tools for everyday digital tasks.</p></div>
          <div><b>Tools</b><a href="/categories/qr-tools">QR Tools</a><a href="/categories/pdf-tools">PDF Tools</a><a href="/categories/image-tools">Image Tools</a></div>
          <div><b>Resources</b><a href="/blog">Blog</a><a href="/faq">FAQ</a></div>
          <div><b>Legal</b><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a></div>
        </div>
        <div className="container copyright">(c) 2026 Codivio. All rights reserved.</div>
      </footer>
    </div>
  );
}

function ToolCard({tool}: {tool: Tool}) {
  return (
    <a className="tool-card" href="#">
      <div className="tool-icon">{tool.icon}</div>
      <div className="tool-category">{tool.category}</div>
      <h3>{tool.name}</h3>
      <p>{tool.description}</p>
      <span className="tool-arrow"><ArrowRight size={15}/></span>
    </a>
  );
}

export default App;
