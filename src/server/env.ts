/**
 * Environment bindings.
 *
 * The Whop hosted runtime (and `whop apps dev`) inject `WHOP_APP_ID`, a
 * short-lived `WHOP_API_KEY`, and every app secret you have stored. On
 * Cloudflare Workers those arrive as the `env` argument to `fetch`, not on
 * `process.env`, so everything here flows from the request rather than a
 * module-level read.
 */

import siteConfig from "../../site.config";
import type { PublicConfig, ResolvedOffering } from "../shared/types";

export interface Env {
  /** Injected by the Whop runtime. */
  WHOP_APP_ID?: string;
  WHOP_API_KEY?: string;

  /** App secrets you set with `whop apps secrets set`. */
  WHOP_COMPANY_ID?: string;
  WHOP_PRODUCT_ID?: string;
  WHOP_PLAN_INSPECTION?: string;
  WHOP_PLAN_REPAIR?: string;
  WHOP_PLAN_DEPOSIT?: string;
  WHOP_WEBHOOK_SECRET?: string;
  /** Gate for the internal billing console at /admin/billing. */
  ADMIN_PASSCODE?: string;

  [key: string]: string | undefined;
}

/** Merge Workers `env` with `process.env` so the same code runs under `vite dev`. */
export function readEnv(runtimeEnv?: Env): Env {
  const fromProcess =
    typeof process !== "undefined" && process.env ? (process.env as Env) : {};
  return { ...fromProcess, ...(runtimeEnv ?? {}) };
}

export function resolveOfferings(env: Env): ResolvedOffering[] {
  return siteConfig.offerings.map((offering) => ({
    ...offering,
    planId: env[offering.planEnv] ?? null,
  }));
}

export function buildPublicConfig(env: Env, origin: string): PublicConfig {
  const offerings = resolveOfferings(env);
  return {
    site: siteConfig,
    offerings,
    companyId: env.WHOP_COMPANY_ID ?? null,
    origin,
    setupIncomplete: offerings.some((o) => !o.planId) || !env.WHOP_COMPANY_ID,
  };
}
