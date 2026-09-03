/**
 * Server-side render.
 *
 * The marketing pages are rendered to HTML on the server so search engines and
 * link previews see real content — this matters for a business whose customers
 * arrive from a search for "roof repair near me". The Whop pixel is injected
 * into every HTML page the runtime serves, so no snippet is added here.
 */

import { renderToString } from "react-dom/server";
import { preloadHints } from "@whop/elements";
import { App } from "../client/App";
import type { PublicConfig } from "../shared/types";

export interface RenderInput {
  url: string;
  config: PublicConfig;
  assets: { js: string; css: string[] };
}

export function renderPage({ url, config, assets }: RenderInput): string {
  const site = config.site;
  const meta = metaForUrl(url, config);

  let body: string;
  try {
    body = renderToString(<App config={config} url={url} />);
  } catch (err) {
    // A render failure must not take the site down: ship the shell and let the
    // client render it instead.
    console.error("[ssr] render failed, falling back to client render", err);
    body = "";
  }

  const hints = preloadHints()
    .map((h) => `<link rel="${h.rel}" href="${h.href}"${h.as ? ` as="${h.as}"` : ""}>`)
    .join("");

  const css = assets.css.map((href) => `<link rel="stylesheet" href="${href}">`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="${esc(site.brand.accent)}">
<link rel="canonical" href="${esc(config.origin + url.split("?")[0])}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
${hints}
<style>${themeVars(config)}</style>
${css}
<script type="application/ld+json">${jsonLd(config)}</script>
</head>
<body>
<div id="root">${body}</div>
<script>window.__SITE_CONFIG__=${serialize(config)}</script>
<script type="module" src="${assets.js}"></script>
</body>
</html>`;
}

function metaForUrl(url: string, config: PublicConfig): { title: string; description: string } {
  const { site, offerings } = config;
  const path = url.split("?")[0];
  const company = site.company.name;

  if (path.startsWith("/services/")) {
    const slug = path.slice("/services/".length).replace(/\/+$/, "");
    const service = site.services.find((s) => s.slug === slug);
    if (service) {
      return { title: `${service.name} · ${company}`, description: service.short };
    }
  }
  if (path.startsWith("/book/")) {
    const key = path.slice("/book/".length).replace(/\/+$/, "");
    const offering = offerings.find((o) => o.key === key);
    if (offering) {
      return {
        title: `${offering.name} — ${offering.priceLabel} · ${company}`,
        description: offering.blurb,
      };
    }
  }
  if (path === "/estimate") {
    return {
      title: `Free roofing estimate · ${company}`,
      description: site.estimateForm.body,
    };
  }
  if (path === "/card-on-file") {
    return { title: `Card on file · ${company}`, description: "Save a card for your final balance." };
  }
  if (path === "/thank-you") {
    return { title: `Thank you · ${company}`, description: site.company.tagline };
  }

  return {
    title: `${company} — ${site.company.tagline}`,
    description: site.hero.subhead,
  };
}

/** Brand colors become CSS custom properties, so re-skinning is a config edit. */
function themeVars(config: PublicConfig): string {
  const { accent, accentSoft, ink } = config.site.brand;
  return `:root{--accent:${cssColor(accent)};--accent-soft:${cssColor(accentSoft)};--ink:${cssColor(ink)}}`;
}

/** Only hex colors reach a `<style>` block — anything else falls back. */
function cssColor(value: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : "#c2410c";
}

function jsonLd(config: PublicConfig): string {
  const { company, serviceArea, trust } = config.site;
  const ratings = trust.reviews.map((r) => r.rating);
  const doc = {
    "@context": "https://schema.org",
    "@type": "RoofingContractor",
    name: company.legalName,
    description: company.tagline,
    telephone: company.phone,
    email: company.email,
    address: { "@type": "PostalAddress", streetAddress: company.address },
    url: config.origin,
    areaServed: serviceArea.areas.map((a) => ({ "@type": "City", name: a.city })),
    aggregateRating: ratings.length
      ? {
          "@type": "AggregateRating",
          ratingValue: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
          reviewCount: ratings.length,
        }
      : undefined,
  };
  return safeJsonForScript(JSON.stringify(doc));
}

function serialize(config: PublicConfig): string {
  return safeJsonForScript(JSON.stringify(config));
}

/** Keep a JSON payload from terminating the script tag or opening an HTML comment. */
function safeJsonForScript(json: string): string {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
