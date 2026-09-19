import { describe, expect, it } from "vitest";
import fs from "node:fs";

/**
 * Phase 4.7 — generic download utility. `document`/real anchor-click
 * behavior has no equivalent in this project's plain-Node Vitest
 * environment (no jsdom/RTL setup — see PROJECT_STATE.md's Known
 * limitations), so these are structural/source-level checks, matching the
 * same approach already used for the Phase 4.6 scanner's camera code.
 */
const source = fs.readFileSync(new URL("../src/lib/download-file.ts", import.meta.url), "utf8");

describe("download-file utility", () => {
  it("triggers a download via a temporary anchor element, not a full-page navigation", () => {
    expect(source).toContain('document.createElement("a")');
    expect(source).toContain("link.download");
    expect(source).not.toMatch(/window\.location\s*=|location\.href\s*=/);
  });

  it("cleans up the temporary anchor element after clicking it", () => {
    expect(source).toContain("document.body.appendChild(link)");
    expect(source).toContain("link.click()");
    expect(source).toContain("document.body.removeChild(link)");
  });

  it("revokes the object URL it creates for text/Blob downloads", () => {
    expect(source).toContain("URL.createObjectURL");
    expect(source).toContain("URL.revokeObjectURL");
  });

  it("never makes a network request or executes dynamic code", () => {
    expect(source).not.toMatch(/fetch\(|XMLHttpRequest|eval\(|new Function\(/);
  });

  it("never logs the file content it is asked to download", () => {
    expect(source).not.toMatch(/console\.(log|info|warn|debug|error)/);
  });
});
