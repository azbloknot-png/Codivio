/**
 * Structural route-JSX matcher for tests/*.test.ts files that verify
 * src/App.tsx's route table via source-text checks (no jsdom/RTL — see
 * tests/admin-ui.test.ts's own header comment for why this project uses
 * structural source checks for routing instead of a live render).
 *
 * Performance Fix (Admin lazy loading): every `/admin/*` route's `element`
 * is now wrapped in a `<Suspense fallback={null}>` boundary and formatted
 * across multiple lines, so a plain string `.toContain()` no longer
 * matches. This builds an equivalent, whitespace-tolerant regex for a
 * Suspense-wrapped `<Route>` element, so these tests still verify the same
 * real fact (this path renders this component) without caring about exact
 * JSX formatting/line-wrapping.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function suspenseRouteJsx(routeAttrs: string, innerElementJsx: string, selfClosing = true): RegExp {
  const tail = selfClosing ? "\\}\\s*/>" : "\\}\\s*>";
  return new RegExp(
    `<Route\\s+${escapeRegExp(routeAttrs)}\\s*element=\\{\\s*<Suspense fallback=\\{null\\}>\\s*` +
      `${escapeRegExp(innerElementJsx)}\\s*</Suspense>\\s*${tail}`
  );
}
