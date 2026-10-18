import ReactMarkdown from "react-markdown";

/**
 * Phase 8.5 — its own lazy chunk (loaded from src/App.tsx's BlogPostContent
 * via lazy() + Suspense, the same isolation strategy ToolPage already uses
 * for qrcode/jsqr/pdf-lib), so the react-markdown/unified/remark/mdast
 * dependency tree is only downloaded by a visitor who actually opens a
 * blog article — never the homepage, the admin panel, or any other route.
 *
 * Safety (Change Control reviewed, not just assumed): `content` is the raw
 * Markdown source from blog_posts.content (shared/blog.ts's own doc
 * comment: authored as Markdown, "must render through a safe Markdown
 * parser and must never use dangerouslySetInnerHTML"). react-markdown
 * converts Markdown directly to React elements — there is no
 * dangerouslySetInnerHTML anywhere in this file or in react-markdown
 * itself. Two defaults this deliberately relies on and does NOT override:
 *  - Raw HTML in the Markdown source (e.g. a literal "<script>" tag) is
 *    never parsed into real DOM elements, because no rehype-raw plugin is
 *    passed — it is rendered as inert literal text, not executed.
 *  - Every link/image URL is passed through react-markdown's own
 *    defaultUrlTransform, which allow-lists only http(s)/mailto/xmpp/irc(s)
 *    schemes and blanks everything else (javascript:, data:, vbscript:,
 *    etc.) — verified by reading node_modules/react-markdown/lib/index.js
 *    directly rather than assumed from documentation, and covered by
 *    tests/blog-article-xss.test.ts with real malicious Markdown input.
 * Do not add rehype-raw or a custom, more permissive urlTransform without a
 * fresh security review — either would reopen exactly the XSS surface this
 * component is designed to close.
 */
export default function BlogArticleBody({ content }: { content: string }) {
  return (
    <div className="blog-article-content">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
