import { Link } from "react-router-dom";
import { ShieldCheck, Zap } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { getContentBlueprint } from "../../shared/seo/content";
import { getRelatedToolLinks, getToolBreadcrumb } from "../../shared/seo/internal-links";

type ToolPageProps = {
  name: string;
  description: string;
  category: string;
  /** Phase 3.13 — the tool's registry slug, used to look up the Phase 3.4
   * content blueprint and Phase 3.6 internal-link/breadcrumb data for this
   * specific tool. Optional only so any pre-existing caller that doesn't
   * pass it (there is none left in this codebase) degrades to the
   * placeholder-only page rather than crashing. */
  slug?: string;
};

/**
 * Renders Phase 3.6's breadcrumb data as real, visible navigation — the
 * same `getToolBreadcrumb` call `shared/seo/schema.ts#buildToolPageGraph`
 * uses for the page's JSON-LD `BreadcrumbList`, so the visible trail and
 * the structured data can never disagree (Phase 3.13 requirement).
 *
 * The category segment has no route yet (see internal-links.ts) and is
 * rendered as plain, non-linkable text — never a fabricated URL.
 */
function ToolBreadcrumb({ slug, ariaLabel }: { slug: string; ariaLabel: string }) {
  const { language } = useLanguage();
  const crumbs = getToolBreadcrumb(slug, language);
  if (!crumbs) return null;

  return (
    <nav className="tool-breadcrumb" aria-label={ariaLabel}>
      <ol>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`}>
              {crumb.path ? (
                <Link to={crumb.path}>{crumb.label}</Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined}>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Phase 3.13 — makes the Phase 3.4 content blueprint and Phase 3.6 related-
 * tool links actually visible on the page, honestly framed around the
 * tool's real "coming soon" status. Renders nothing extra (not an error)
 * if a slug has no blueprint yet, so this can never crash a real tool page.
 */
function ToolContentSections({ slug }: { slug: string }) {
  const { language, t } = useLanguage();
  const blueprint = getContentBlueprint(slug, language);
  const relatedLinksRaw = getRelatedToolLinks(slug, language);
  // Defensive de-duplication by path (acceptance criterion: no duplicate
  // links) — Phase 3.3's source data is already unique per tool, this just
  // guarantees it structurally rather than trusting that forever.
  const relatedLinks = Array.from(new Map(relatedLinksRaw.map((link) => [link.path, link])).values()).filter(
    (link) => link.isLinkable && link.path,
  );

  if (!blueprint) return null;

  return (
    <>
      <section className="tool-content-section">
        <h2>{t.toolPage.aboutHeading}</h2>
        <p>{blueprint.introduction}</p>
        <p>{blueprint.valueProposition}</p>
      </section>

      {blueprint.benefits.length > 0 && (
        <section className="tool-content-section">
          <h2>{t.toolPage.benefitsHeading}</h2>
          <ul>
            {blueprint.benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </section>
      )}

      {blueprint.howToSteps.length > 0 && (
        <section className="tool-content-section">
          <h2>{t.toolPage.howItWorksHeading}</h2>
          <ol>
            {blueprint.howToSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="tool-status-note">{blueprint.statusNote}</p>
        </section>
      )}

      {blueprint.useCases.length > 0 && (
        <section className="tool-content-section">
          <h2>{t.toolPage.useCasesHeading}</h2>
          <ul>
            {blueprint.useCases.map((useCase) => (
              <li key={useCase}>{useCase}</li>
            ))}
          </ul>
        </section>
      )}

      {blueprint.faq.length > 0 && (
        <section className="tool-content-section tool-faq">
          <h2>{t.toolPage.faqHeading}</h2>
          {blueprint.faq.map((item) => (
            <div className="tool-faq-item" key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          ))}
        </section>
      )}

      {relatedLinks.length > 0 && (
        <section className="tool-content-section tool-related-tools">
          <h2>{t.toolPage.relatedToolsHeading}</h2>
          <ul className="tool-related-list">
            {relatedLinks.map((link) => (
              <li key={link.path}>
                <Link to={link.path as string}>{link.anchorText}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="tool-trust-note">{blueprint.trustMessage}</p>
    </>
  );
}

function ToolPage({ name, description, category, slug }: ToolPageProps) {
  const { t } = useLanguage();

  return (
    <main className="tool-page">
      <div className="container">
        {slug && <ToolBreadcrumb slug={slug} ariaLabel={t.toolPage.breadcrumbAriaLabel} />}

        <section className="tool-page-header">
          <span className="eyebrow">{category}</span>

          <h1>{name}</h1>

          <p>{description}</p>
        </section>

        <section className="tool-workspace">
          <div className="tool-workspace-placeholder">
            <div className="tool-placeholder-icon">
              <Zap size={28} />
            </div>

            <h2>Tool coming soon</h2>

            <p>
              This Codivio tool is currently being prepared. The working
              version will be available here soon.
            </p>
          </div>
        </section>

        <section className="tool-trust">
          <div>
            <ShieldCheck size={18} />
            <span>Privacy-focused</span>
          </div>

          <div>
            <Zap size={18} />
            {/* Phase 3.9 — the previous label asserted a working
                performance/architecture claim no tool can back up yet (none
                are implemented). This states the real, verifiable thing:
                it's the intended architecture, not a claim about how fast
                anything currently runs. */}
            <span>In-browser by design</span>
          </div>
        </section>

        {slug && <ToolContentSections slug={slug} />}
      </div>
    </main>
  );
}

export default ToolPage;
