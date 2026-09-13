#!/usr/bin/env node
/**
 * Codivio PRE-COMMIT gate.
 * Fast local validation only: typecheck, lint (if configured), tests.
 * Never runs a full production build, npm audit, or a heavy regression pass — that is
 * PRE-PUSH's job. Never modifies source files (no auto-fix).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

const report = [];

function runNpmScript(check, scriptName) {
  console.log(`\n--- ${check} (npm run ${scriptName}) ---`);
  const result = spawnSync(npmCmd, ["run", scriptName], {
    cwd: repoRoot,
    stdio: "inherit",
    shell: isWin,
  });
  if (result.error) {
    report.push({ check, status: "UNKNOWN", error: result.error.message, next: "Investigate why the command could not run." });
    return;
  }
  if (result.status === 0) {
    report.push({ check, status: "PASS" });
  } else {
    report.push({ check, status: "FAIL", error: `\`npm run ${scriptName}\` exited with code ${result.status}`, next: "Fix the reported errors above, then re-stage and commit." });
  }
}

// 1. TypeScript typecheck
runNpmScript("TypeScript typecheck", "typecheck");

// 2. Lint — only if the project actually has one configured
const eslintConfigCandidates = [
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.json",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.cjs",
];
const hasEslintConfig = eslintConfigCandidates.some((f) => existsSync(path.join(repoRoot, f)));
let hasLintScript = false;
try {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  hasLintScript = Boolean(pkg.scripts && pkg.scripts.lint);
} catch {
  // handled by the typecheck step already surfacing a broken package.json
}
if (hasEslintConfig && hasLintScript) {
  runNpmScript("Lint", "lint");
} else {
  report.push({ check: "Lint", status: "SKIPPED", error: "no ESLint configuration and/or npm \"lint\" script found in the project", next: "None — add an ESLint config and \"lint\" script to enable this check." });
}

// 3. Tests (the current suite is a single fast smoke test, so a full run is still "fast")
runNpmScript("Unit tests", "test");

const blocked = report.some((r) => r.status === "FAIL");

console.log("\n================ PRE-COMMIT REPORT ================");
for (const r of report) {
  console.log(`CHECK: ${r.check}`);
  console.log(`STATUS: ${r.status}`);
  if (r.error) console.log(`ERROR: ${r.error}`);
  if (r.next) console.log(`NEXT ACTION: ${r.next}`);
  console.log("");
}
console.log(blocked ? "COMMIT BLOCKED" : "Pre-commit checks passed — commit allowed.");
console.log("=====================================================\n");

process.exit(blocked ? 1 : 0);
