#!/usr/bin/env node
/**
 * Codivio POST-INSTALL gate.
 * Lightweight environment/dependency health check — no network, no build, no test/audit run.
 * Also idempotently points core.hooksPath at the tracked .githooks/ directory so the
 * pre-commit/pre-push gates are active for this clone (no-op if already configured).
 */
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const isWin = process.platform === "win32";

const results = [];
let hasFailure = false;

function record(check, status, detail) {
  results.push({ check, status, detail });
  if (status === "FAIL") hasFailure = true;
}

const pkgPath = path.join(repoRoot, "package.json");
const lockPath = path.join(repoRoot, "package-lock.json");

record("package.json", existsSync(pkgPath) ? "PASS" : "FAIL", existsSync(pkgPath) ? "found" : "not found");
record(
  "package-lock.json",
  existsSync(lockPath) ? "PASS" : "FAIL",
  existsSync(lockPath) ? "found" : "lockfile missing — dependency versions not pinned"
);

let pkg = { dependencies: {}, devDependencies: {} };
try {
  pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
} catch (e) {
  record("package.json parse", "FAIL", String(e.message));
}

const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const missing = Object.keys(deps).filter((name) => !existsSync(path.join(repoRoot, "node_modules", name)));
if (Object.keys(deps).length === 0) {
  record("node_modules", "UNKNOWN", "no dependencies declared in package.json");
} else if (missing.length > 0) {
  record("node_modules", "FAIL", `missing packages: ${missing.join(", ")}`);
} else {
  record("node_modules", "PASS", `${Object.keys(deps).length} top-level packages present`);
}

const tscBin = path.join(repoRoot, "node_modules", ".bin", isWin ? "tsc.cmd" : "tsc");
record("typescript binary", existsSync(tscBin) ? "PASS" : "FAIL", tscBin);

const tsconfigPath = path.join(repoRoot, "tsconfig.json");
try {
  JSON.parse(readFileSync(tsconfigPath, "utf8"));
  record("tsconfig.json", "PASS", "valid JSON");
} catch (e) {
  record("tsconfig.json", "FAIL", String(e.message));
}

// Non-fatal: activate the tracked hooks directory for this clone, without overriding a
// hooksPath the developer already configured intentionally.
try {
  const inside = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: repoRoot, encoding: "utf8" });
  if (inside.status === 0 && inside.stdout.trim() === "true") {
    const current = spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: repoRoot, encoding: "utf8" });
    const currentPath = (current.stdout || "").trim();
    if (!currentPath) {
      const set = spawnSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: repoRoot });
      record("git hooksPath", set.status === 0 ? "PASS" : "UNKNOWN", "configured to .githooks");
    } else {
      record("git hooksPath", "SKIPPED", `already set to "${currentPath}", left unchanged`);
    }
  } else {
    record("git hooksPath", "SKIPPED", "not inside a git working tree");
  }
} catch (e) {
  record("git hooksPath", "UNKNOWN", String(e.message));
}

console.log("\n=== Codivio Post-Install Environment Check ===");
for (const r of results) {
  console.log(`[${r.status}] ${r.check} — ${r.detail}`);
}
console.log(hasFailure ? "STATUS: FAIL" : "STATUS: PASS");
console.log("===============================================\n");

process.exit(hasFailure ? 1 : 0);
