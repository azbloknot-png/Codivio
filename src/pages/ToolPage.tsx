import { ArrowLeft, ShieldCheck, Zap } from "lucide-react";

type ToolPageProps = {
  name: string;
  description: string;
  category: string;
};

function ToolPage({ name, description, category }: ToolPageProps) {
  return (
    <main className="tool-page">
      <div className="container">
        <a className="tool-back" href="/">
          <ArrowLeft size={16} />
          Back to Codivio
        </a>

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
            <span>Fast in-browser tools</span>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ToolPage;