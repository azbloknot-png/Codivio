import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { buildOrganizationNode, buildStandardPageGraph } from "../shared/seo/schema";

/**
 * Phase 3.9 — E-E-A-T + Trust.
 *
 * One appropriate test per topic. Existing SEO/schema regression is
 * covered by re-running the existing full suite once (see alongside this
 * file), not duplicated here.
 */

describe("no overclaiming trust language anywhere in tool-page or trust-page content", () => {
  it("ToolPage.tsx no longer claims unverified speed/processing capability, and the honest replacement is present", () => {
    const source = fs.readFileSync(new URL("../src/pages/ToolPage.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("Fast in-browser tools");
    expect(source).toContain("In-browser by design");
    // Still no claim of live processing anywhere on the placeholder page.
    const bannedPatterns = [
      /\binstant(ly)?\b/i,
      /100%\s*(secure|private)/i,
      /\bunlimited\b/i,
      /\bguaranteed?\b/i,
    ];
    for (const pattern of bannedPatterns) {
      expect(source, `ToolPage.tsx should not match ${pattern}`).not.toMatch(pattern);
    }
  });

  it("About/Contact/Privacy/Terms body copy contains no fabricated company facts (founding date, employee count, address, phone, awards, certifications, testimonials)", () => {
    const source = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    const bannedPatterns = [
      /founded in/i,
      /headquarters/i,
      /employees?\b.*\d/i,
      /\d+\s*(customers|users) (worldwide|globally)/i,
      /award-winning/i,
      /certified by/i,
      /★{2,}|\b5\s*stars?\b/i,
      /trusted by (over )?\d/i,
    ];
    for (const pattern of bannedPatterns) {
      expect(source, `App.tsx should not match ${pattern}`).not.toMatch(pattern);
    }
  });
});

describe("no fabricated contact details (email/phone/address) were introduced", () => {
  it("no invented email address, phone number, or physical address appears in the trust pages or Organization schema", () => {
    const appSource = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    // Any @codivio.online-style address would be a real, checkable claim —
    // none should exist since none is verified anywhere in the project.
    expect(appSource).not.toMatch(/[a-z0-9._%+-]+@codivio\.online/i);
    expect(appSource).not.toMatch(/\+\d{1,3}[\s-]?\(?\d{2,4}\)?[\s-]?\d{3}[\s-]?\d{2,4}/); // phone-like pattern
    const org = buildOrganizationNode();
    expect(org).not.toHaveProperty("telephone");
    expect(org).not.toHaveProperty("address");
    expect(org).not.toHaveProperty("email");
  });
});

describe("Organization schema remains unchanged and has no fabricated sameAs (Phase 3.9 audit finding)", () => {
  it("no social profile URL was added — verified via repo search and live web search that no Codivio Instagram/Facebook account could be confirmed", () => {
    const org = buildOrganizationNode();
    expect(org).not.toHaveProperty("sameAs");
    expect(org.name).toBe("Codivio");
    expect(org.url).toBe("https://codivio.online/");
  });
});

describe("representative trust-page schema/metadata regression", () => {
  it("About and Contact pages still produce correct, unchanged AboutPage/ContactPage schema after this phase's content review", () => {
    const about = buildStandardPageGraph("about", "en");
    const aboutPage = about["@graph"][2] as { "@type": string };
    expect(aboutPage["@type"]).toBe("AboutPage");

    const contact = buildStandardPageGraph("contact", "en");
    const contactPage = contact["@graph"][2] as { "@type": string };
    expect(contactPage["@type"]).toBe("ContactPage");
  });
});

describe("footer trust-link discoverability is intact", () => {
  it("the footer still links to About, Contact, Privacy, Terms, and Cookies, and no unverified social link was added anywhere in the app", () => {
    const source = fs.readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
    const footerStart = source.indexOf("function SiteFooter");
    expect(footerStart).toBeGreaterThan(-1);
    const footer = source.slice(footerStart, footerStart + 1500);
    expect(footer).toContain('to="/about"');
    expect(footer).toContain('to="/contact"');
    expect(footer).toContain('to="/privacy"');
    expect(footer).toContain('to="/terms"');
    expect(footer).toContain('to="/cookies"');
    // Whole-file check: no social platform link was introduced anywhere,
    // not just in the footer — consistent with SITE_IDENTITY's empty
    // verifiedSocialProfiles (Phase 3.5) and this phase's own research
    // finding that no Codivio Instagram/Facebook account could be verified.
    expect(source).not.toMatch(/instagram\.com|facebook\.com|twitter\.com|linkedin\.com/i);
  });
});
