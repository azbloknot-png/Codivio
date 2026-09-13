import { usePageMeta } from "../App";

/**
 * Phase 2.13 — shared "architecture preview" page for Admin modules that
 * have no backend yet (Blog, SEO, Search Console, Advertising, Affiliate,
 * Monetization, Social, Reports, System Health, Users/CRM, Audit Log).
 *
 * This is intentionally NOT a mock of the future feature: no fake tables,
 * no fake charts, no fake numbers. It states plainly that the module isn't
 * connected yet and lists the real categories that are planned, so the
 * navigation architecture exists without pretending any of it works.
 */

interface AdminComingSoonPageProps {
  title: string;
  description: string;
  categories: string[];
}

export default function AdminComingSoonPage({ title, description, categories }: AdminComingSoonPageProps) {
  usePageMeta(`Admin ${title}`, description);

  return (
    <div className="admin-coming-soon">
      <h1>{title}</h1>
      <p className="admin-coming-soon-intro">{description}</p>
      <span className="admin-coming-soon-badge">Not connected yet</span>

      <div className="admin-coming-soon-categories">
        {categories.map((category) => (
          <span className="admin-coming-soon-chip" key={category}>
            {category}
          </span>
        ))}
      </div>
    </div>
  );
}
