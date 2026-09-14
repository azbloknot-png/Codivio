import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 2.15 follow-up — homepage carousel card-count verification.
 *
 * Requirement: desktop shows exactly 4 fully visible cards, tablet exactly 2,
 * mobile exactly 1 — with the next card NEVER partially visible ("peeking").
 *
 * The fix: each card's flex-basis is a container-relative `calc()` expression
 * (not a fixed pixel width like the old `260px` / `min(78vw,280px)`), sized so
 * N cards + (N-1) gaps always sum to exactly 100% of the track's width. Since
 * the track clips overflow via `overflow-x:auto`, the (N+1)th card then starts
 * exactly at the visible edge with zero pixels showing, at any viewport width
 * within a breakpoint tier — not just at the specific widths spot-checked
 * (1440/1280/1024/768/375).
 */

const styleSource = fs.readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

describe("homepage carousel card widths", () => {
  it("desktop (default): exactly 4 cards fill the track, both .tool-card and article", () => {
    expect(styleSource).toContain(".popular-tools-track .tool-card{flex:0 0 calc((100% - 48px) / 4)");
    expect(styleSource).toContain(".popular-tools-track article{flex:0 0 calc((100% - 48px) / 4)");
  });

  it("tablet (<=900px): exactly 2 cards fill the track", () => {
    const tabletBlock = styleSource.match(/@media\(max-width:900px\)\{[^}]*\.popular-tools-track[\s\S]*?\}\s*\}/)?.[0] ?? "";
    expect(tabletBlock).toContain(".popular-tools-track .tool-card{flex:0 0 calc((100% - 16px) / 2)}");
    expect(tabletBlock).toContain(".popular-tools-track article{flex:0 0 calc((100% - 16px) / 2)}");
  });

  it("mobile (<=650px): exactly 1 card fills the track (full width, no partial second card)", () => {
    const mobileBlock = styleSource.match(/@media\(max-width:650px\)\{\r?\n\.popular-tools-track[\s\S]*?\}\r?\n\}/)?.[0] ?? "";
    expect(mobileBlock).toContain(".popular-tools-track .tool-card{flex:0 0 100%}");
    expect(mobileBlock).toContain(".popular-tools-track article{flex:0 0 100%}");
  });

  it("no fixed-pixel/viewport-unit card width remains (regression guard against the old peeking bug)", () => {
    const trackCardRules = styleSource.match(/\.popular-tools-track \.tool-card\{[^}]*\}/g) ?? [];
    const trackArticleRules = styleSource.match(/\.popular-tools-track article\{[^}]*\}/g) ?? [];
    for (const rule of [...trackCardRules, ...trackArticleRules]) {
      expect(rule).not.toMatch(/flex:0 0 \d+px/);
      expect(rule).not.toMatch(/vw/);
    }
  });

  it("the track's own gap (16px) matches the gap value baked into the calc() card widths", () => {
    expect(styleSource).toContain(".popular-tools-track{display:flex;gap:16px");
  });

  it("the track clips overflow (overflow-x:auto) so anything beyond the exact N cards is hidden, not partially shown", () => {
    const trackRule = styleSource.match(/\.popular-tools-track\{[^}]*\}/)?.[0] ?? "";
    expect(trackRule).toContain("overflow-x:auto");
  });
});

describe("homepage carousels reuse one architecture (no second slider system)", () => {
  it("all 5 homepage carousels (Popular/QR/PDF/Image & Other/Blog) use the same .popular-tools-track class", () => {
    const matches = appSource.match(/className="(?:article-list )?popular-tools-track"/g) ?? [];
    expect(matches.length).toBe(5);
  });

  it("the arrow-button scroll amount reads the real rendered card width at runtime, not a hardcoded pixel value", () => {
    const scrollAmountLines = appSource.match(/const amount = \(card\?\.offsetWidth \?\? 260\) \+ 16;/g) ?? [];
    // One per slider (Popular/QR/PDF/Image & Other/Blog) — reads .offsetWidth live,
    // so it automatically tracks the new calc()-based card width with no JS change.
    expect(scrollAmountLines.length).toBe(5);
  });
});
