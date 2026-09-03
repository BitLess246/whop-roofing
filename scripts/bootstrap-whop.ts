/**
 * One-shot account setup.
 *
 * Creates the product and the three plans this template sells — the inspection
 * fee, the project deposit, and the flat-rate repair — on whatever Whop account
 * your API key belongs to, then prints the secrets to set.
 *
 * Run it once per account:
 *
 *   WHOP_API_KEY=whop_xxx npm run bootstrap
 *   WHOP_API_KEY=whop_xxx npm run bootstrap -- --dry-run
 *
 * Prices and names come from `site.config.ts`, so re-skinning the template for
 * a different roofer and re-running this is the whole setup.
 */

import siteConfig from "../site.config";

const API_BASE = "https://api.whop.com/api/v1";
const API_VERSION_DATE = "2026-06-09";

const apiKey = process.env.WHOP_API_KEY;
const dryRun = process.argv.includes("--dry-run");

if (!apiKey && !dryRun) {
  fail(
    "WHOP_API_KEY is not set.\n" +
      "Create an account API key under Developer in your Whop dashboard, then:\n" +
      "  WHOP_API_KEY=whop_xxx npm run bootstrap",
  );
}

interface PlanSpec {
  key: string;
  planEnv: string;
  title: string;
  description: string;
  /** Dollars, e.g. 149 for $149. */
  price: number;
}

/** Every plan here is one-time: a roofer sells jobs, not subscriptions. */
const planSpecs: PlanSpec[] = siteConfig.offerings.map((offering) => ({
  key: offering.key,
  planEnv: offering.planEnv,
  title: offering.name,
  description: offering.blurb,
  price: parsePrice(offering.priceLabel),
}));

async function main() {
  banner();

  if (dryRun) {
    console.log("Dry run — nothing will be created.\n");
    console.log(`Product: ${siteConfig.company.name} — Roofing Services`);
    for (const spec of planSpecs) {
      console.log(`  plan  ${spec.title.padEnd(34)} $${spec.price.toFixed(2).padStart(9)}  -> ${spec.planEnv}`);
    }
    return;
  }

  const companyId = await resolveCompanyId();

  const product = await api<{ id: string; title: string }>("POST", "/products", {
    company_id: companyId,
    title: `${siteConfig.company.name} — Roofing Services`,
    description: siteConfig.company.tagline,
    visibility: "visible",
  });
  console.log(`Product   ${product.id}  ${product.title}\n`);

  const created: { env: string; id: string; title: string; price: number }[] = [];

  for (const spec of planSpecs) {
    const plan = await api<{ id: string }>("POST", "/plans", {
      account_id: companyId,
      product_id: product.id,
      plan_type: "one_time",
      release_method: "buy_now",
      currency: "usd",
      initial_price: spec.price,
      unlimited_stock: true,
      visibility: "visible",
      description: spec.description,
      internal_notes: `Created by bootstrap-whop.ts for ${siteConfig.company.name}`,
      metadata: { offering: spec.key, template: "whop-roofing" },
    });
    created.push({ env: spec.planEnv, id: plan.id, title: spec.title, price: spec.price });
    console.log(`Plan      ${plan.id}  ${spec.title} ($${spec.price})`);
  }

  console.log("\n" + "-".repeat(72));
  console.log("Set these as app secrets, then redeploy:\n");
  console.log(`  whop apps secrets set WHOP_COMPANY_ID=${companyId}`);
  console.log(`  whop apps secrets set WHOP_PRODUCT_ID=${product.id}`);
  for (const plan of created) {
    console.log(`  whop apps secrets set ${plan.env}=${plan.id}`);
  }
  console.log(`  whop apps secrets set ADMIN_PASSCODE=<pick one>`);
  console.log(`  whop apps secrets set WHOP_WEBHOOK_SECRET=<from \`whop webhooks create\`>`);
  console.log("\n  whop apps deploy");
  console.log("-".repeat(72));
  console.log("\nFor local development, put the same values in .env (see .env.example).");
}

/**
 * `--company biz_xxx` wins, then `WHOP_COMPANY_ID`, then the account the API
 * key belongs to. An account API key lists its own account first.
 */
async function resolveCompanyId(): Promise<string> {
  const flagIndex = process.argv.indexOf("--company");
  const fromFlag = flagIndex !== -1 ? process.argv[flagIndex + 1] : undefined;
  const explicit = fromFlag ?? process.env.WHOP_COMPANY_ID;
  if (explicit) {
    console.log(`Account   ${explicit}  (given)\n`);
    return explicit;
  }

  const accounts = await api<{ data: { id: string; title?: string; name?: string }[] }>(
    "GET",
    "/accounts?first=5",
  );
  const first = accounts.data?.[0];
  if (!first) {
    fail(
      "No account is visible to this API key.\n" +
        "Pass one explicitly: npm run bootstrap -- --company biz_xxxxxxxx",
    );
  }
  if (accounts.data.length > 1) {
    console.log("This key can see more than one account; using the first:");
    for (const a of accounts.data) console.log(`  ${a.id}  ${a.title ?? a.name ?? ""}`);
    console.log("  (pass --company biz_xxxxxxxx to pick another)\n");
  }
  console.log(`Account   ${first.id}${first.title ? `  (${first.title})` : ""}\n`);
  return first.id;
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Api-Version-Date": API_VERSION_DATE,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    fail(
      `${method} ${path} failed (${res.status})\n${text}\n\n` +
        "If this is a permissions error, the API key needs product and plan write access.",
    );
  }
  return (text ? JSON.parse(text) : {}) as T;
}

function parsePrice(label: string): number {
  const n = Number(label.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) {
    fail(`Could not read a price out of "${label}" in site.config.ts.`);
  }
  return n;
}

function banner() {
  console.log("");
  console.log(`  ${siteConfig.company.name} — Whop account bootstrap`);
  console.log(`  ${"=".repeat(46)}`);
  console.log("");
}

function fail(message: string): never {
  console.error(`\n${message}\n`);
  process.exit(1);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
