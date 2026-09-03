/**
 * The server bundle. Built to `dist/server/index.js` and run by the Whop
 * hosting runtime (Cloudflare Workers); `dist/client` is served as static
 * assets by the platform, so this handles HTML and the JSON API only.
 *
 * https://docs.whop.com/developer/websites/quickstart
 */

import { buildPublicConfig, readEnv, type Env } from "./env";
import { renderPage } from "./render";
import { handleCreateLead, json } from "./routes/leads";
import { handleSetupCheckout } from "./routes/setup-checkout";
import { handleCreateInvoice } from "./routes/invoices";
import { handleWebhook } from "./routes/webhooks";
import siteConfig from "../../site.config";

/** Injected by Vite at build time; used to bust asset caches across deploys. */
declare const __BUILD_ID__: string;
const BUILD_ID = typeof __BUILD_ID__ === "string" ? __BUILD_ID__ : "dev";

/**
 * In dev Vite serves the entry module directly and injects the stylesheet; in
 * production the client build emits stable filenames, stamped with the build
 * ID so a redeploy is never served from a stale cache.
 */
const ASSETS = import.meta.env.DEV
  ? { js: "/src/client/entry-client.tsx", css: [] as string[] }
  : { js: `/assets/app.js?v=${BUILD_ID}`, css: [`/assets/app.css?v=${BUILD_ID}`] };

/**
 * Whop Elements render in frames served from js.whop.cloud. Without that origin
 * in `frame-src` the elements are blank space and the only clue is a console
 * error, so the policy is set here rather than left to a default.
 */
const CSP = [
  "default-src 'self'",
  "frame-src https://js.whop.cloud https://*.whop.com",
  "script-src 'self' 'unsafe-inline' https://js.whop.cloud https://*.whop.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.whop.com https://js.whop.cloud https://*.whop.com",
  "form-action 'self'",
  "base-uri 'self'",
].join("; ");

export default {
  async fetch(request: Request, runtimeEnv?: Env): Promise<Response> {
    const env = readEnv(runtimeEnv);
    const url = new URL(request.url);

    try {
      // ---- API -------------------------------------------------------------
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }

      // ---- Crawler files ---------------------------------------------------
      if (url.pathname === "/robots.txt") return robots(url.origin);
      if (url.pathname === "/sitemap.xml") return sitemap(url.origin);
      if (url.pathname === "/favicon.svg") return favicon();
      if (url.pathname === "/healthz") {
        return json({ ok: true, build: BUILD_ID, configured: !buildConfig(env, url).setupIncomplete });
      }

      // ---- HTML ------------------------------------------------------------
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method not allowed", { status: 405 });
      }

      const html = renderPage({
        url: url.pathname + url.search,
        config: buildConfig(env, url),
        assets: ASSETS,
      });

      return new Response(request.method === "HEAD" ? null : html, {
        status: isKnownRoute(url.pathname) ? 200 : 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy": CSP,
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      });
    } catch (err) {
      console.error("[server] unhandled error", err);
      return new Response("Something went wrong on our end.", {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  },
};

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== "POST") {
    return json({ ok: false, error: "Use POST." }, 405);
  }

  switch (url.pathname) {
    case "/api/leads":
      return handleCreateLead(request, env);
    case "/api/setup-checkout":
      return handleSetupCheckout(request, env);
    case "/api/invoices":
      return handleCreateInvoice(request, env);
    case "/api/webhooks/whop":
      return handleWebhook(request, env);
    default:
      return json({ ok: false, error: "Not found." }, 404);
  }
}

function buildConfig(env: Env, url: URL) {
  return buildPublicConfig(env, url.origin);
}

function isKnownRoute(pathname: string): boolean {
  if (["/", "/estimate", "/card-on-file", "/thank-you", "/admin/billing"].includes(pathname)) {
    return true;
  }
  if (pathname.startsWith("/services/")) {
    const slug = pathname.slice("/services/".length).replace(/\/+$/, "");
    return siteConfig.services.some((s) => s.slug === slug);
  }
  if (pathname.startsWith("/book/")) {
    const key = pathname.slice("/book/".length).replace(/\/+$/, "");
    return siteConfig.offerings.some((o) => o.key === key);
  }
  return false;
}

function robots(origin: string): Response {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /thank-you",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

function sitemap(origin: string): Response {
  const paths = [
    "/",
    "/estimate",
    ...siteConfig.services.map((s) => `/services/${s.slug}`),
    ...siteConfig.offerings.map((o) => `/book/${o.key}`),
  ];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    paths.map((p) => `<url><loc>${origin}${p}</loc></url>`).join("") +
    `</urlset>`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

/** A roofline glyph in the brand color — no binary asset to keep in the repo. */
function favicon(): Response {
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(siteConfig.brand.accent)
    ? siteConfig.brand.accent
    : "#c2410c";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<rect width="32" height="32" rx="7" fill="${accent}"/>` +
    `<path d="M6 17 16 8l10 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M9 16v8h14v-8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
