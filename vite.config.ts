import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { whop } from "@whop/cli/vite";
import { devServer } from "./vite-dev-server";

/**
 * Whop hosting runs the site on Cloudflare Workers, so the Cloudflare plugin
 * owns the build: it reads `wrangler.jsonc`, compiles `src/server/index.ts`
 * into the `ssr` environment, and leaves the browser bundle in the client
 * environment. One `vite build` emits both.
 *
 *   dist/client   static assets the platform serves
 *   dist/server   the worker, with an index.js entry
 *
 * The `whop()` plugin then packs those two directories into the archive
 * `whop apps deploy` uploads.
 */
export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    react(),
    whop(),
    devServer(),
  ],

  define: {
    // Stamped into asset URLs so a redeploy is never served from a stale cache.
    __BUILD_ID__: JSON.stringify(process.env.WHOP_BUILD_ID ?? String(Date.now())),
  },

  environments: {
    client: {
      build: {
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
    },
    ssr: {
      build: {
        outDir: "dist/server",
        emptyOutDir: true,
        target: "es2022",
        rollupOptions: { output: { entryFileNames: "index.js" } },
      },
    },
  },

  builder: {
    async buildApp(builder) {
      // Client first: the worker's HTML references the emitted asset names.
      await builder.build(builder.environments.client!);
      await builder.build(builder.environments.ssr!);
    },
  },

  // Vite must not rewrite "/" to "/index.html": the server bundle owns routing.
  appType: "custom",

  server: { port: 5173 },
});
