import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { LANGUAGES } from "../shared/i18n/languages";
import { getGlobalFaqs } from "../shared/seo/global-faq";
import { validateFaqInput } from "../shared/faq";
import { hasPermission } from "../shared/rbac";
import { suspenseRouteJsx } from "./helpers/route-jsx";

/**
 * Phase 3 Finalization: Global FAQ expansion + localization, Admin FAQ
 * Management, and route scroll restoration. One appropriate test per topic
 * (see codivio-test-gate) — component-rendering behavior is checked
 * structurally against the real source, matching the established pattern in
 * tests/admin-ui.test.ts (no jsdom/@testing-library in this project).
 */

const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const adminSource = fs.readFileSync(new URL("../src/admin/AdminApp.tsx", import.meta.url), "utf8");
const workerIndexSource = fs.readFileSync(new URL("../worker/index.ts", import.meta.url), "utf8");

describe("Global FAQ content (Phase 3 Finalization)", () => {
  it("every language has the same, non-trivial number of real global FAQ entries", () => {
    const counts = LANGUAGES.map((lang) => getGlobalFaqs(lang).length);
    expect(counts.every((count) => count === counts[0])).toBe(true);
    expect(counts[0]).toBeGreaterThanOrEqual(10);
  });

  it("no tool has an empty question or answer, and no duplicate questions within a language", () => {
    for (const lang of LANGUAGES) {
      const faqs = getGlobalFaqs(lang);
      for (const faq of faqs) {
        expect(faq.question.trim().length).toBeGreaterThan(0);
        expect(faq.answer.trim().length).toBeGreaterThan(0);
      }
      expect(new Set(faqs.map((f) => f.question)).size).toBe(faqs.length);
    }
  });

  it("AZ and TR global FAQ questions are genuinely distinct from EN, not copy-pasted placeholders", () => {
    const en = getGlobalFaqs("en");
    const az = getGlobalFaqs("az");
    const tr = getGlobalFaqs("tr");
    for (let i = 0; i < en.length; i++) {
      expect(az[i].question).not.toBe(en[i].question);
      expect(tr[i].question).not.toBe(en[i].question);
      expect(az[i].question).not.toBe(tr[i].question);
    }
  });

  it("the public FAQ page and Homepage FAQ preview read from useGlobalFaqs (backed by GET /api/faqs), not a leftover hardcoded array", () => {
    // FAQ Management Source-of-Truth Remediation: useGlobalFaqs fetches the
    // live, Admin-managed content and falls back to getGlobalFaqs's static
    // snapshot only for the initial render and on fetch failure — see
    // tests/faq-source-of-truth.test.ts for the actual data-flow coverage.
    expect(appSource).toContain("const globalFaqs = useGlobalFaqs(language);");
    expect(appSource).toContain("const faqs = useGlobalFaqs(language);");
    expect(appSource).toContain('fetch(`/api/faqs?language=${language}`)');
    expect(appSource).not.toMatch(/^const faqs = \[/m);
  });
});

describe("shared/faq.ts validateFaqInput (Admin FAQ Management)", () => {
  it("accepts a valid global-scope entry and a valid tool-scope entry", () => {
    const global = validateFaqInput({
      scope: "global",
      language: "en",
      question: "Is this a real question?",
      answer: "Yes, this is a real answer.",
      status: "active",
      sortOrder: 0,
    });
    expect(global.ok).toBe(true);

    const tool = validateFaqInput({
      scope: "tool",
      toolSlug: "qr-code-generator",
      language: "en",
      question: "Is this a real question?",
      answer: "Yes, this is a real answer.",
      status: "active",
      sortOrder: 0,
    });
    expect(tool.ok).toBe(true);
  });

  it("rejects a tool-scope entry with no toolSlug, and a global-scope entry that sets one", () => {
    expect(
      validateFaqInput({ scope: "tool", language: "en", question: "Q", answer: "A", status: "active", sortOrder: 0 }).ok
    ).toBe(false);
    expect(
      validateFaqInput({
        scope: "global",
        toolSlug: "qr-code-generator",
        language: "en",
        question: "Q",
        answer: "A",
        status: "active",
        sortOrder: 0,
      }).ok
    ).toBe(false);
  });

  it("rejects an unsupported language and an unsupported scope", () => {
    expect(
      validateFaqInput({ scope: "global", language: "de", question: "Q", answer: "A", status: "active", sortOrder: 0 })
        .ok
    ).toBe(false);
    expect(
      validateFaqInput({ scope: "site", language: "en", question: "Q", answer: "A", status: "active", sortOrder: 0 }).ok
    ).toBe(false);
  });
});

describe("faq.view / faq.manage RBAC matrix (Admin FAQ Management)", () => {
  it("super_admin, admin and editor can manage FAQs; analyst cannot even view them", () => {
    expect(hasPermission("super_admin", "faq.manage")).toBe(true);
    expect(hasPermission("admin", "faq.manage")).toBe(true);
    expect(hasPermission("editor", "faq.manage")).toBe(true);
    expect(hasPermission("analyst", "faq.view")).toBe(false);
    expect(hasPermission("analyst", "faq.manage")).toBe(false);
  });
});

describe("Admin FAQ Management wiring", () => {
  it("the /admin/faq route and nav item are registered", () => {
    // Performance Fix (Admin lazy loading): now Suspense-wrapped/multi-line —
    // see tests/helpers/route-jsx.ts.
    expect(appSource).toMatch(suspenseRouteJsx('path="faq"', "<AdminFaqPage />"));
    expect(adminSource).toContain('label: t.nav.faq, to: "/admin/faq"');
  });

  it("worker/index.ts wires the admin FAQ CRUD routes", () => {
    expect(workerIndexSource).toContain('"/api/admin/faqs"');
    expect(workerIndexSource).toContain("handleListFaqs");
    expect(workerIndexSource).toContain("handleCreateFaq");
    expect(workerIndexSource).toContain("handleUpdateFaq");
    expect(workerIndexSource).toContain("handleDeleteFaq");
  });
});

describe("Route scroll restoration (Phase 3 Finalization)", () => {
  it("ScrollRestoration is mounted once inside App(), alongside <Routes>", () => {
    expect(appSource).toContain("<ScrollRestoration />");
    const appFnSource = appSource.slice(appSource.indexOf("function App()"));
    expect(appFnSource.indexOf("<ScrollRestoration />")).toBeLessThan(appFnSource.indexOf("<Routes>"));
  });

  it("sets history.scrollRestoration to manual so it doesn't fight the browser's own restoration", () => {
    expect(appSource).toContain('window.history.scrollRestoration = "manual"');
  });

  it("distinguishes POP (Back/Forward, restores saved position) from PUSH/REPLACE (scrolls to top)", () => {
    const fnSource = appSource.slice(
      appSource.indexOf("function ScrollRestoration"),
      appSource.indexOf("function App()")
    );
    expect(fnSource).toContain('navigationType === "POP"');
    expect(fnSource).toContain("savedPositions.current.get(location.key)");
    expect(fnSource).toContain("window.scrollTo(0, 0)");
  });

  it("scrolls a hash target into view instead of resetting to top when the new location has a hash", () => {
    const fnSource = appSource.slice(
      appSource.indexOf("function ScrollRestoration"),
      appSource.indexOf("function App()")
    );
    expect(fnSource).toContain("location.hash");
    expect(fnSource).toContain("document.getElementById(location.hash.slice(1))");
    expect(fnSource).toContain("target.scrollIntoView()");
  });
});
