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
  /**
   * Set by the Whop hosting runtime. `WHOP_API_ORIGIN` is the API origin whose
   * outbound calls the platform signs with the app's own key, and
   * `WHOP_ACCOUNT_ID` is the `biz_` id of the account that owns the app — so a
   * deployed site needs neither an API key nor a company ID configured by hand.
   */
  WHOP_API_ORIGIN?: string;
  WHOP_ACCOUNT_ID?: string;
  APP_ID?: string;
  BUILD_ID?: string;

  /** Used only off-platform: `whop apps dev`, plain `vite dev`, the bootstrap script. */
  WHOP_APP_ID?: string;
  WHOP_API_KEY?: string;

  /** App secrets you set with `whop apps secrets set`. */
  /** Overrides WHOP_ACCOUNT_ID when the site sells for a different account. */
  WHOP_COMPANY_ID?: string;
  WHOP_PRODUCT_ID?: string;
  WHOP_PLAN_INSPECTION?: string;
  WHOP_PLAN_REPAIR?: string;
  WHOP_PLAN_DEPOSIT?: string;
  WHOP_WEBHOOK_SECRET?: string;
  /** HMAC key for the signed sign-in cookie. */
  SESSION_SECRET?: string;
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

/**
 * The account this site sells for. On Whop hosting the runtime already knows
 * it, so `WHOP_COMPANY_ID` is only needed to point the site at a different
 * account than the one that owns the app.
 */
export function resolveCompanyId(env: Env): string | null {
  return env.WHOP_COMPANY_ID ?? env.WHOP_ACCOUNT_ID ?? null;
}

export function buildPublicConfig(env: Env, origin: string): PublicConfig {
  const offerings = resolveOfferings(env);
  const companyId = resolveCompanyId(env);
  return {
    site: siteConfig,
    offerings,
    companyId,
    origin,
    setupIncomplete: offerings.some((o) => !o.planId) || !companyId,
  };
}
