/**
 * POST /api/invoices — bills the final balance on a finished job.
 *
 * Two collection methods, both real:
 *   `charge_automatically` charges the card the homeowner left on file at the
 *   deposit stage (the `payt_…` from `setup_intent.succeeded`);
 *   `send_invoice` emails them a payable invoice instead.
 *
 * The deposit already paid comes off as a negative line item, so the invoice
 * shows the homeowner the same arithmetic the estimate did.
 *
 * https://docs.whop.com/api-reference/invoices/create-invoice
 */

import type { Env } from "../env";
import { createInvoice, createWhopClient, WhopApiError, type InvoiceLineItem } from "../whop-api";
import { json } from "./leads";
import siteConfig from "../../../site.config";

interface Body {
  passcode?: unknown;
  customerName?: unknown;
  email?: unknown;
  memberId?: unknown;
  paymentTokenId?: unknown;
  collectionMethod?: unknown;
  dueInDays?: unknown;
  lineItems?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleCreateInvoice(request: Request, env: Env): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ ok: false, error: "Expected a JSON body." }, 400);
  }

  // The billing console is office-facing. Authority lives here, not in the page.
  const expected = env.ADMIN_PASSCODE;
  if (!expected) {
    return json(
      { ok: false, error: "ADMIN_PASSCODE is not set, so invoicing is disabled on this deployment." },
      503,
    );
  }
  if (typeof body.passcode !== "string" || !timingSafeEqual(body.passcode, expected)) {
    return json({ ok: false, error: "Wrong passcode." }, 401);
  }

  const companyId = env.WHOP_COMPANY_ID;
  if (!companyId) return json({ ok: false, error: "WHOP_COMPANY_ID is not set." }, 500);

  const collectionMethod =
    body.collectionMethod === "charge_automatically" ? "charge_automatically" : "send_invoice";

  const lineItems = parseLineItems(body.lineItems);
  if (!lineItems.length) return json({ ok: false, error: "At least one line item is required." }, 422);

  const total = lineItems.reduce((sum, l) => sum + l.unit_price * (l.quantity ?? 1), 0);
  const rounded = Math.round(total * 100) / 100;
  if (rounded <= 0) {
    return json({ ok: false, error: "The line items must total a chargeable amount." }, 422);
  }

  const memberId = str(body.memberId) || null;
  const email = str(body.email);
  const customerName = str(body.customerName);
  const paymentTokenId = str(body.paymentTokenId) || null;

  // Whop needs either an existing member, or an email and a name to create one.
  if (!memberId) {
    if (!EMAIL_RE.test(email)) {
      return json({ ok: false, error: "A member ID, or a customer email and name, is required." }, 422);
    }
    if (!customerName) return json({ ok: false, error: "A customer name is required." }, 422);
  }
  if (collectionMethod === "charge_automatically" && !paymentTokenId) {
    return json(
      { ok: false, error: "Charging automatically requires the stored payment method (payt_…)." },
      422,
    );
  }

  const dueInDays = clamp(Number(body.dueInDays) || 7, 1, 90);
  const dueDate = new Date(Date.now() + dueInDays * 86_400_000).toISOString();

  try {
    const client = createWhopClient(env);
    const invoice = await createInvoice(
      client,
      {
        company_id: companyId,
        collection_method: collectionMethod,
        // An inline product and plan keep the invoice self-contained: the price
        // is the balance for this one job, not a catalogue item.
        product: { title: `${siteConfig.company.name} — project balance` },
        plan: {
          plan_type: "one_time",
          currency: "usd",
          initial_price: rounded,
          description: "Final balance on completed roofing work",
        },
        // The sum of the lines must equal the plan price; negative lines are credits.
        line_items: lineItems,
        member_id: memberId,
        email_address: memberId ? null : email,
        customer_name: memberId ? null : customerName,
        payment_token_id: paymentTokenId,
        due_date: dueDate,
      },
      // One idempotency key per (customer, amount, day) so a double-click on the
      // console cannot bill the same balance twice.
      `invoice:${memberId ?? email}:${rounded}:${new Date().toISOString().slice(0, 10)}`,
    );

    return json({
      ok: true,
      data: {
        invoiceId: invoice.id,
        status: invoice.status,
        collectionMethod,
        hostedInvoiceUrl: (invoice.hosted_invoice_url as string | undefined) ?? null,
      },
    });
  } catch (err) {
    console.error("[invoices] create failed", err);
    if (err instanceof WhopApiError) {
      return json({ ok: false, error: describeApiError(err) }, err.status >= 500 ? 502 : 400);
    }
    return json({ ok: false, error: "Could not create the invoice." }, 502);
  }
}

function parseLineItems(value: unknown): InvoiceLineItem[] {
  if (!Array.isArray(value)) return [];
  const out: InvoiceLineItem[] = [];
  for (const raw of value.slice(0, 40)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as { label?: unknown; unitPrice?: unknown; quantity?: unknown };
    const label = str(item.label).slice(0, 200);
    const unitPrice = Number(item.unitPrice);
    const quantity = item.quantity === undefined ? 1 : Number(item.quantity);
    if (!label || !Number.isFinite(unitPrice) || !Number.isFinite(quantity) || quantity <= 0) continue;
    out.push({ label, unit_price: Math.round(unitPrice * 100) / 100, quantity });
  }
  return out;
}

function describeApiError(err: WhopApiError): string {
  const body = err.body as { error?: { message?: string }; message?: string } | null;
  const detail = body?.error?.message ?? body?.message;
  if (err.status === 401 || err.status === 403) {
    return "The API key is missing the invoice:create permission.";
  }
  return detail ? `Whop rejected the invoice: ${detail}` : `Whop rejected the invoice (${err.status}).`;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Constant-time compare so the passcode cannot be recovered by timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
