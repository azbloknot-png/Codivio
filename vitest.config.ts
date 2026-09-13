import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Dedicated Vitest config, deliberately separate from vite.config.ts.
 *
 * Reason: vite.config.ts conditionally loads @cloudflare/vite-plugin's
 * `cloudflare()` plugin whenever NODE_ENV !== "development" — which is true
 * during `vitest run` (Vitest sets NODE_ENV to "test"). That plugin then
 * tries to boot a Miniflare-backed Workers runtime (workerd) as part of
 * Vitest's own Vite server startup, which is unrelated to what these tests
 * need (plain TS/JS module tests) and crashes on this machine's workerd
 * (the same known access-violation limitation as `wrangler dev` — see
 * PROJECT_STATE.md). Without this file, Vitest falls back to vite.config.ts
 * and inherits that plugin; with it, tests run in plain Node with no
 * Workers-runtime dependency at all.
 */
export default defineConfig({
  plugins: [react()],
});
