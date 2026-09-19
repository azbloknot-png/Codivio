import { trackEvent } from "./analytics";
import type { QrPayload, ScannedQrContentKind } from "../../shared/qr";

/**
 * Codivio — QR Analytics Architecture (Phase 4.9).
 *
 * Thin, typed wrappers around the generic `trackEvent` primitive
 * (src/lib/analytics.ts), scoped to exactly the two QR events CLAUDE.md
 * §12 names (`qr_generate`, `qr_scan`). Kept in its own file rather than
 * folded into the generic analytics module — mirrors the existing
 * src/lib/qr-engine.ts / src/lib/qr-scanner-engine.ts pattern of
 * QR-specific logic living in its own dedicated file, so `analytics.ts`
 * itself stays reusable by any future tool family without QR-specific
 * knowledge.
 *
 * Privacy guarantee enforced by the type system, not just convention:
 * both functions below accept only a closed-union "kind" string — the
 * exact same `QrPayload["kind"]` / `ScannedQrContentKind` types the
 * generator/scanner components already compute for their own UI, never
 * touched or re-derived here. There is no parameter shape here that could
 * ever accept raw QR payload text, decoded scan content, a file, or any
 * other free-form string — a caller cannot pass payload content through
 * this API even by mistake, since TypeScript would reject anything that
 * isn't one of the known kind literals.
 */

export function trackQrGenerate(contentKind: QrPayload["kind"]): void {
  trackEvent("qr_generate", { content_kind: contentKind });
}

export function trackQrScan(contentKind: ScannedQrContentKind): void {
  trackEvent("qr_scan", { content_kind: contentKind });
}
