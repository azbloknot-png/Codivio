---
name: codivio-ui
description: Documents Codivio's already-built CSS/JSX conventions (design tokens, slider mechanics, tool-card/icon-box patterns) so a UI task extends what exists instead of re-deriving or re-verifying it from scratch. Use for any src/App.tsx or src/styles.css change. Pair with redesign-skill only for a broader visual redesign — not when simply extending an existing pattern, where this skill is enough on its own.
---

# Codivio UI

`redesign-skill` carries general design-taste principles (typography, color, layout, generic anti-patterns). This skill is the opposite direction: it documents what **this specific codebase already has built**, so that work doesn't re-read `styles.css` in full or re-derive a pattern that already exists.

## Design tokens (`src/styles.css`, small `:root` block near the bottom)

`--color-primary` (#1769e0 brand blue), `--color-ink` (#172b49 dark navy headings), `--color-muted` (#68778d body/secondary text), `--radius-md` (14px). Introduced deliberately small (CLAUDE.md §2's "no unnecessary refactor") — most older rules still use raw hex/px values; only *new* rules should adopt the tokens, don't retrofit old ones without being asked.

## The established horizontal slider pattern

Popular Tools, QR Tools, PDF Tools, and the Blog preview all share the same mechanics — do not invent a new slider approach, reuse this one:

- Track: `<div className="popular-tools-track" ref={...} onScroll={...} role="region" aria-label="..." tabIndex={0}>` — CSS: `display:flex; overflow-x:auto; scroll-snap-type:x mandatory` (native touch/swipe, no JS gesture library).
- Cards inside it get a flex-basis rule scoped to the track: `.popular-tools-track .tool-card{flex:0 0 260px;scroll-snap-align:start}` (and a `.popular-tools-track article{...}` twin for the Blog cards, since those are plain `<article>`s, not `ToolCard`). A 650px media query shrinks the basis to `min(78vw,280px)`.
- Heading row: `.section-heading` > text block (`eyebrow` + `h2`) + `.popular-tools-heading-actions` (a "view all"/link plus `.tool-slider-actions` with two `<button>`s for prev/next).
- Prev/Next state: a `useRef` on the track + two `useState` booleans (`atStart`/`atEnd`) computed from `scrollLeft`/`scrollWidth`/`clientWidth` in a handler also wired to the track's `onScroll`, plus a `useLayoutEffect` to set the initial state before first paint (avoids a flash of a wrongly-enabled button). `scrollBy` moves by one card's `offsetWidth + 16`.
- To add a **new** category slider: add a boolean flag to the `Tool` type (mirroring `featured`/`popular`/`qr`/`pdf`), a derived `const X_TOOLS = tools.filter(t => t.x)`, copy the state/handler block with new names, and reuse the exact same three class names above — no new CSS should be needed.

## Tool card / icon-box pattern

`.tool-card` (used directly, and via the `ToolCard` component) is the base card: white bg, border, radius, shadow, absolute-positioned arrow icon (needs `position:relative` on the card). The icon-box look (`46px, radius, light-blue bg, brand-blue icon`) is shared via one combined selector: `.tool-icon,.blog-card-icon,.about-icon{...}` — add a new surface to that selector rather than writing a fourth near-identical rule.

## Homepage structure (`HomePage` in `src/App.tsx`)

Hero → AdSlot → Popular Tools (search + category-filter + slider, all three wired together — search/filter narrow `POPULAR_TOOLS`, not the full registry) → QR Tools slider → PDF Tools slider → AdSlot → Blog slider → FAQ preview. Homepage renders only curated subsets (`HOMEPAGE_FEATURED_TOOLS`/`POPULAR_TOOLS`/`QR_TOOLS`/`PDF_TOOLS`, each an independent `tools.filter(t => t.<flag>)` view) — the full 34+ tool registry is never trimmed to produce these, and `/tools` still lists everything by category.

## The one hard-learned rule

**Before reusing any WIP/reference CSS file (or copying a pattern from an external skill/repo), verify its selectors actually match the current JSX — don't copy blindly.** This came from a real bug: an old `phase1f-b1.css` draft styled `.tool-slider-arrow` as a 38px nav button, but in the live JSX that class is applied to the small decorative arrow icon *inside* each card — copying it verbatim would have visibly broken the slider. Always grep the target className in both the `.tsx` and the candidate `.css` before merging.
