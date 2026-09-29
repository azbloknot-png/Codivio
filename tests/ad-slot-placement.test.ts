import { describe, expect, it } from "vitest";

/**
 * Phase 7.5 — Desktop / Mobile Ad Placement.
 *
 * Structural source tests, mirroring the existing convention already used
 * for AdSlot-adjacent behavior in tests/admin-ui.test.ts (e.g. the
 * ".hero-ad-slot{display:none}" assertion) — this codebase has no
 * component-rendering test harness, so responsive/accessibility markup is
 * verified by asserting the real source contains the expected structure,
 * not by rendering and inspecting a DOM.
 */

const fs = await import("node:fs");
const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const styleSource = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("AdSlot device prop (Phase 7.5)", () => {
  it("accepts a controlled device prop defaulting to 'all', preserving pre-7.5 behavior", () => {
    expect(appSource).toContain('function AdSlot({ label, device = "all" }: { label?: string; device?: AdSlotDevice })');
  });

  it("imports the device type from the shared, Worker-authoritative allowlist rather than a second parallel definition", () => {
    expect(appSource).toContain('import type { AdSlotDevice } from "../shared/ad-slots";');
  });

  it("applies a device-specific class to the placeholder element", () => {
    expect(appSource).toContain('className={`ad-slot ad-slot-device-${device}`}');
  });

  it("has accessibility semantics the generic AdSlot previously lacked", () => {
    expect(appSource).toContain('role="complementary"');
    expect(appSource).toContain("aria-label={adLabel}");
  });

  it("remains a pure, inert placeholder — no raw HTML, script, or iframe surface", () => {
    const fnStart = appSource.indexOf("function AdSlot(");
    const fnBody = appSource.slice(fnStart, fnStart + 900);
    expect(fnBody).not.toMatch(/dangerouslySetInnerHTML|<script|<iframe|eval\(/);
  });

  it("all 3 existing call sites are unchanged and pass no explicit device prop (still default to 'all')", () => {
    const calls = appSource.match(/<AdSlot\b[^/]*\/>/g) ?? [];
    expect(calls.length).toBe(3);
    for (const call of calls) {
      expect(call).not.toMatch(/device=/);
    }
  });
});

describe("AdSlot responsive CSS (Phase 7.5)", () => {
  it("hides a mobile-only slot by default (desktop-and-up)", () => {
    expect(styleSource).toContain(".ad-slot-device-mobile{display:none}");
  });

  it("inverts visibility at the same established mobile breakpoint every other mobile-specific rule uses", () => {
    const mobileBlockStart = styleSource.indexOf("@media(max-width:650px)");
    const mobileBlockEnd = styleSource.indexOf("}", styleSource.lastIndexOf(".ad-slot-device-mobile{display:flex}"));
    const mobileBlock = styleSource.slice(mobileBlockStart, mobileBlockEnd + 1);
    expect(mobileBlock).toContain(".ad-slot-device-desktop{display:none}");
    expect(mobileBlock).toContain(".ad-slot-device-mobile{display:flex}");
  });

  it("does not widen the tablet (900px) breakpoint's unrelated hero-ad-slot rule", () => {
    expect(styleSource).toContain(".hero-ad-slot{display:none}");
  });
});
