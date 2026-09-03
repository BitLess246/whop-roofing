/**
 * Minimal, dependency-free Whop REST client.
 *
 * Runs on the Whop hosting runtime (Cloudflare Workers), so it uses `fetch`
 * and reads credentials from the request-scoped env binding rather than
 * `process.env`. `whop apps dev` and the hosted runtime both inject
 * `WHOP_API_KEY`; nothing here ever reaches the browser.
 */

import type { Env } from "./env";

const API_BASE = "https://api.whop.com/api/v1";

/**
 * Pin the dated API version so a platform change never silently alters the
 * shape of a response this template parses.
 */
const API_VERSION_DATE = "2026-06-09";

export class WhopApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "WhopApiError";
  }
}

export interface WhopClient {
  request<T>(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    init?: { idempotencyKey?: string },
  ): Promise<T>;
}

export function createWhopClient(env: Env): WhopClient {
  const apiKey = env.WHOP_API_KEY;
  if (!apiKey) {
    throw new WhopApiError(
      500,
      null,
      "WHOP_API_KEY is not set. `whop apps dev` injects it locally; " +
        "the hosted runtime injects it in production.",
    );
  }

  return {
    async request<T>(
      method: "GET" | "POST" | "PATCH" | "DELETE",
      path: string,
      body?: unknown,
      init?: { idempotencyKey?: string },
    ): Promise<T> {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Api-Version-Date": API_VERSION_DATE,
        Accept: "application/json",
      };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (init?.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = text;
        }
      }

      if (!res.ok) {
        throw new WhopApiError(
          res.status,
          parsed,
          `Whop API ${method} ${path} failed with ${res.status}: ${text.slice(0, 500)}`,
        );
      }
      return parsed as T;
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Resource helpers — one function per endpoint this template actually uses.  */
/* -------------------------------------------------------------------------- */

export interface Lead {
  id: string;
  created_at: string;
  referrer: string | null;
  metadata: Record<string, unknown> | null;
  product: { id: string; title: string } | null;
  user: { id: string; email: string | null; name: string | null; username: string };
}

/** POST /leads — https://docs.whop.com/api-reference/leads/create-lead */
export function createLead(
  client: WhopClient,
  input: {
    company_id: string;
    product_id?: string | null;
    user_id?: string | null;
    referrer?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<Lead> {
  return client.request<Lead>("POST", "/leads", input);
}

export interface CheckoutConfiguration {
  id: string;
  purchase_url?: string | null;
}

/**
 * POST /checkout_configurations with `mode: "setup"` creates a
 * collect-only checkout. Completing it makes Whop create the setup intent and
 * store the payment method — this is the documented way to get a card on file.
 * https://docs.whop.com/developer/guides/save-payment-methods
 */
export function createSetupCheckoutConfiguration(
  client: WhopClient,
  input: {
    account_id: string;
    redirect_url?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<CheckoutConfiguration> {
  return client.request<CheckoutConfiguration>("POST", "/checkout_configurations", {
    ...input,
    mode: "setup",
  });
}

export interface PaymentMethod {
  id: string;
  payment_method_type?: string;
  card?: { brand?: string; last4?: string; exp_month?: number; exp_year?: number } | null;
}

/** GET /payment_methods?member_id=... */
export function listPaymentMethods(
  client: WhopClient,
  memberId: string,
): Promise<{ data: PaymentMethod[] }> {
  return client.request<{ data: PaymentMethod[] }>(
    "GET",
    `/payment_methods?member_id=${encodeURIComponent(memberId)}`,
  );
}

export interface Invoice {
  id: string;
  status?: string;
  collection_method?: string;
  due_date?: string | null;
  hosted_invoice_url?: string | null;
  [k: string]: unknown;
}

export interface InvoiceLineItem {
  label: string;
  unit_price: number;
  quantity?: number;
}

/**
 * POST /invoices — https://docs.whop.com/api-reference/invoices/create-invoice
 *
 * `charge_automatically` charges a stored payment method (`payment_token_id`);
 * `send_invoice` emails the customer a payable invoice instead.
 */
export function createInvoice(
  client: WhopClient,
  input: {
    company_id: string;
    collection_method: "charge_automatically" | "send_invoice";
    product: { title: string };
    plan: {
      plan_type: "one_time";
      currency: "usd";
      initial_price: number;
      description?: string;
    };
    line_items?: InvoiceLineItem[];
    member_id?: string | null;
    email_address?: string | null;
    customer_name?: string | null;
    payment_token_id?: string | null;
    due_date?: string | null;
    save_as_draft?: boolean;
  },
  idempotencyKey?: string,
): Promise<Invoice> {
  return client.request<Invoice>("POST", "/invoices", input, { idempotencyKey });
}
