/**
 * Dev-only middleware that runs the real server bundle through Vite.
 *
 * `whop apps dev` starts the `dev` script with the environment the hosted
 * runtime would give it, so this exists to make that a faithful rehearsal:
 * the same `src/server/index.ts` handles the request locally as in production,
 * only with Vite's module graph and HMR under it.
 */

import { readFileSync, existsSync } from "node:fs";
import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

export function devServer(): Plugin {
  return {
    name: "roofing-dev-server",
    apply: "serve",

    configureServer(server) {
      loadDotEnv();

      // Returning a function defers registration until after Vite's own
      // middlewares, so /@vite, /src and /node_modules still resolve.
      return () => {
        server.middlewares.use(async (req, res, next) => {
          try {
            await handle(server, req, res);
          } catch (err) {
            if (err instanceof Error) server.ssrFixStacktrace(err);
            next(err);
          }
        });
      };
    },
  };
}

async function handle(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const mod = await server.ssrLoadModule("/src/server/index.ts");
  const worker = mod.default as {
    fetch(request: Request, env?: Record<string, string | undefined>): Promise<Response>;
  };

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const request = new Request(url, {
    method: req.method,
    headers: nodeHeaders(req),
    body:
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : new Uint8Array(await readBody(req)),
  });

  const response = await worker.fetch(request, process.env as Record<string, string | undefined>);

  let body = await response.text();

  // Let Vite inject its client and the React Refresh preamble into HTML the
  // server rendered, exactly as it would into an index.html.
  if (response.headers.get("content-type")?.includes("text/html")) {
    body = await server.transformIndexHtml(url.pathname, body);
  }

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    // The dev bundle is served as separate modules, so the production CSP's
    // 'self'-only script policy would block Vite's client.
    if (key.toLowerCase() === "content-security-policy") return;
    res.setHeader(key, value);
  });
  res.end(body);
}

function nodeHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else headers.set(key, value);
  }
  return headers;
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * Minimal `.env` loader. `whop apps dev` injects the app's own secrets, so this
 * only fills in whatever you keep locally — and never overwrites what the CLI
 * already put in the environment.
 */
function loadDotEnv(file = ".env"): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    process.env[key] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}
