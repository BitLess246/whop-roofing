import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { whop } from "@whop/cli/vite";
import { devServer } from "./vite-dev-server";

/**
 * Two builds, one config:
 *   `vite build`        -> dist/client  (static assets the platform serves)
 *   `vite build --ssr`  -> dist/server  (the worker the platform runs)
 *
 * The `whop()` plugin packs both into the archive `whop apps deploy` uploads;
 * it runs after each environment's build and the second one writes the
 * authoritative archive, which is why `npm run build` runs them in that order.
 */
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), whop(), devServer()],

  define: {
    // Stamped into asset URLs so a redeploy is never served from a stale cache.
    __BUILD_ID__: JSON.stringify(process.env.WHOP_BUILD_ID ?? String(Date.now())),
  },

  build: isSsrBuild
    ? {
        outDir: "dist/server",
        emptyOutDir: true,
        ssr: "src/server/index.ts",
        target: "es2022",
        rollupOptions: {
          input: "src/server/index.ts",
          output: { entryFileNames: "index.js", format: "es" },
        },
      }
    : {
        outDir: "dist/client",
        emptyOutDir: true,
        target: "es2022",
        rollupOptions: {
          input: "src/client/entry-client.tsx",
          output: {
            // Stable names: the server bundle references them directly rather
            // than reading a manifest it cannot open at runtime.
            entryFileNames: "assets/app.js",
            chunkFileNames: "assets/[name]-[hash].js",
            assetFileNames: (info) =>
              info.names?.[0]?.endsWith(".css")
                ? "assets/app.css"
                : "assets/[name]-[hash][extname]",
          },
        },
      },

  // Vite must not rewrite "/" to "/index.html": the server bundle owns routing.
  appType: "custom",

  server: { port: 5173 },
}));
