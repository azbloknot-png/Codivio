/**
 * Minimal hand-written ambient type declaration for Cloudflare's
 * `HTMLRewriter` runtime global — same policy as worker/types.ts's D1
 * types: intentionally not the full `@cloudflare/workers-types` package,
 * only the small subset worker/seo-rewrite.ts actually uses. Extend here
 * as real usage grows.
 *
 * `HTMLRewriter` is a true runtime global in the Cloudflare Workers
 * runtime (workerd) — nothing imports or constructs it from a module, so
 * this is declared in `declare global`, not as a named export. This file
 * only describes its shape for the type checker; it changes no runtime
 * behavior. In this project's own Vitest/Node test environment (as
 * opposed to workerd), no such global exists at all — see
 * worker/seo-rewrite.ts's `typeof HTMLRewriter === "undefined"` guard.
 */
export {};

declare global {
  interface HTMLRewriterElement {
    setAttribute(name: string, value: string): HTMLRewriterElement;
    setInnerContent(content: string): HTMLRewriterElement;
  }

  interface HTMLRewriterElementContentHandlers {
    element(element: HTMLRewriterElement): void;
  }

  class HTMLRewriter {
    on(selector: string, handlers: HTMLRewriterElementContentHandlers): HTMLRewriter;
    transform(response: Response): Response;
  }
}
