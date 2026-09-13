/**
 * Shared, hand-written ambient types for the small subset of the Cloudflare
 * Workers/D1 runtime surface this project actually uses. Intentionally not
 * the full `@cloudflare/workers-types` package (see worker/index.ts's
 * original note from Checkpoint 2.2) — extend here as real usage grows.
 */

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Worker secrets for the one-time bootstrap endpoint — set via
   * `wrangler secret put` (remote) or a local `.dev.vars` file (gitignored).
   * Never hardcoded; absent unless the operator has configured them. */
  ADMIN_BOOTSTRAP_EMAIL?: string;
  ADMIN_BOOTSTRAP_PASSWORD?: string;
}
