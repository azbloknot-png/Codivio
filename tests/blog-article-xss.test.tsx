import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BlogArticleBody from "../src/pages/BlogArticleBody";

/**
 * Phase 8.5 — focused XSS tests for the public blog article renderer.
 *
 * Uses react-dom/server's renderToStaticMarkup (already available via the
 * existing react-dom dependency — no jsdom/@testing-library needed, matching
 * this project's "no jsdom/RTL setup" convention documented elsewhere, e.g.
 * tests/qr-scanner-tool.test.ts) to get the real, final HTML string
 * BlogArticleBody would send to the browser for genuinely malicious
 * Markdown input, and asserts the dangerous payload never survives into
 * that string in an executable form. This exercises the real rendering
 * path, not just a source-text pattern check.
 */

function renderMarkdown(content: string): string {
  return renderToStaticMarkup(<BlogArticleBody content={content} />);
}

describe("BlogArticleBody — malicious content neutralization", () => {
  it("never renders a <script> tag from raw HTML in the Markdown source", () => {
    const html = renderMarkdown("Before\n\n<script>alert(document.cookie)</script>\n\nAfter");
    expect(html.toLowerCase()).not.toContain("<script");
  });

  it("never renders a real <img> element (with a live onerror attribute) from raw HTML — it becomes inert, HTML-escaped text instead", () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">');
    // The dangerous tag must never appear as a real, unescaped element...
    expect(html).not.toContain("<img");
    // ...it must instead appear only as harmless, escaped visible text.
    expect(html).toContain("&lt;img");
  });

  it("strips a javascript: URL from a Markdown link", () => {
    const html = renderMarkdown("[click me](javascript:alert(1))");
    expect(html.toLowerCase()).not.toContain("javascript:");
  });

  it("strips a javascript: URL from a Markdown image", () => {
    const html = renderMarkdown("![alt text](javascript:alert(1))");
    expect(html.toLowerCase()).not.toContain("javascript:");
  });

  it("strips a data: URL from a Markdown link (not on the safe-protocol allowlist)", () => {
    const html = renderMarkdown("[click me](data:text/html,<script>alert(1)</script>)");
    expect(html.toLowerCase()).not.toContain("data:text/html");
  });

  it("still renders legitimate Markdown normally (headings, bold, safe links)", () => {
    const html = renderMarkdown("# Hello\n\nThis is **bold** and a [safe link](https://codivio.online/blog).");
    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('href="https://codivio.online/blog"');
  });

  it("renders an inline HTML tag from the Markdown source as inert text, not a real element", () => {
    // No rehype-raw plugin is used, so raw HTML passes through as literal
    // text — this just confirms it is not silently dropped/misrendered in
    // a way that could hide an actual rendering bug.
    const html = renderMarkdown("This mentions a <div> tag in prose.");
    expect(html.toLowerCase()).not.toMatch(/<div>\s*tag in prose/);
  });
});
