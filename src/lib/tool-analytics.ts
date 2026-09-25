import { trackEvent } from "./analytics";
import type { QrOutputFormat } from "./qr-engine";
import type { ImageFormat } from "../../shared/image/types";

/**
 * Codivio — generic tool-lifecycle analytics (Phase 3.21).
 *
 * Thin, typed wrappers around the generic `trackEvent` primitive
 * (src/lib/analytics.ts), scoped to exactly the 4 generic tool-lifecycle
 * events CLAUDE.md §12 names (`tool_open`, `tool_start`, `tool_complete`,
 * `download`) — mirrors src/lib/qr-analytics.ts's own pattern for the
 * QR-specific `qr_generate`/`qr_scan` events.
 *
 * These are deliberately tool-family-agnostic (unlike qr-analytics.ts):
 * `tool_open` fires for every one of the 34 tool pages, including the 32
 * still showing a "coming soon" placeholder (opening the page is real and
 * meaningful regardless of live status). `tool_start`/`tool_complete`/
 * `download` are only ever called from the 2 tools that actually have real
 * functionality to start/complete/export — see each call site's own
 * comment for exactly which real user action it maps to. No event here is
 * invented for functionality that doesn't exist.
 *
 * `toolSlug` is a fixed, already-public route segment (e.g.
 * "qr-code-generator", from the tool registry or a hardcoded literal at the
 * call site) — never free-form user input — so, unlike qr-analytics.ts's
 * payload-privacy concern, a plain `string` parameter here carries no PII
 * risk.
 */

export function trackToolOpen(toolSlug: string): void {
  trackEvent("tool_open", { tool_slug: toolSlug });
}

export function trackToolStart(toolSlug: string): void {
  trackEvent("tool_start", { tool_slug: toolSlug });
}

export function trackToolComplete(toolSlug: string): void {
  trackEvent("tool_complete", { tool_slug: toolSlug });
}

/** Every known download format across every tool family that actually has
 * one, grown incrementally exactly like shared/qr/types.ts's own error-code
 * union — "pdf" (Phase 5.2, PDF Merge) is the first non-QR value, surfacing
 * a real gap: this parameter was previously just `QrOutputFormat` even
 * though this file's own doc comment says it's tool-family-agnostic. "docx"
 * (Phase 5.5, PDF to Word) is the next real, distinct output format this
 * platform produces. `ImageFormat` (Phase 6.2, Image Resize) reuses
 * shared/image/types.ts's own real format union directly rather than
 * inventing parallel string literals — Resize always outputs the same
 * format it was given, so its three real values ("jpeg"/"png"/"webp") are
 * exactly what this event needs. Kept as a closed union (not a bare
 * `string`) to preserve the same type-level-safety precedent
 * qr-analytics.ts sets for payload kinds. */
export type ToolDownloadFormat = QrOutputFormat | "pdf" | "docx" | ImageFormat;

export function trackDownload(toolSlug: string, format: ToolDownloadFormat): void {
  trackEvent("download", { tool_slug: toolSlug, format });
}
