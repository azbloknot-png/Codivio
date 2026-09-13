#!/usr/bin/env node
/**
 * Codivio PRE-PUSH gate.
 * Stronger validation before code reaches GitHub: production build (which subsumes a full
 * project typecheck via `tsc -b`, so it is not re-run separately here), the full test suite,
 * and an offline lockfile-consistency check. `npm audit` is intentionally skipped — it
 * requires a network call to the npm registry, which these hooks must not make.
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
    report.push({ check, status: "FAIL", error: `\`npm run ${scriptName}\` exited with code ${result.status}`, next: "Fix the reported errors above before pushing." });
  }
}

function checkLockfileConsistency() {
  const pkgPath = path.join(repoRoot, "package.json");
  const lockPath = path.join(repoRoot, "package-lock.json");
  if (!existsSync(lockPath)) {
    return { status: "FAIL", error: "package-lock.json not found", next: "Run npm install locally and commit the generated lockfile." };
  }
  let pkg, lock;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    lock = JSON.parse(readFileSync(lockPath, "utf8"));
  } catch (e) {
    return { status: "UNKNOWN", error: String(e.message), next: "Fix the malformed JSON file." };
  }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const lockPackages = lock.packages || null;
  const missing = Object.keys(deps).filter((name) => {
    if (lockPackages) return !lockPackages[`node_modules/${name}`];
    if (lock.dependencies) return !lock.dependencies[name];
    return true;
  });
  if (missing.length > 0) {
    return { status: "FAIL", error: `not resolved in package-lock.json: ${missing.join(", ")}`, next: "Run npm install to refresh the lockfile, then commit it." };
  }
  return { status: "PASS" };
}

// 1. Production build (covers the full project typecheck too, via `tsc -b`)
runNpmScript("Production build", "build");

// 2. Full test suite
runNpmScript("Full test suite", "test");

// 3. Offline dependency/lockfile consistency check
const lockResult = checkLockfileConsistency();
report.push({ check: "Lockfile consistency", ...lockResult });

// 4. npm audit — skipped, requires network access which hooks must not perform
report.push({
  check: "Dependency vulnerability audit (npm audit)",
  status: "SKIPPED",
  error: "npm audit requires a network call to the npm registry; local hooks must not make network requests",
  next: "Run `npm audit` manually, or add it as an authoritative check in CI/CD.",
});

const blocked = report.some((r) => r.status === "FAIL");

console.log("\n================= PRE-PUSH REPORT ==================");
for (const r of report) {
  console.log(`CHECK: ${r.check}`);
  console.log(`STATUS: ${r.status}`);
  if (r.error) console.log(`ERROR: ${r.error}`);
  if (r.next) console.log(`NEXT ACTION: ${r.next}`);
  console.log("");
}
console.log(blocked ? "PUSH BLOCKED" : "Pre-push checks passed — push allowed.");
console.log("=====================================================\n");

process.exit(blocked ? 1 : 0);
