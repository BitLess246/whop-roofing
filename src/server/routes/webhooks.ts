/**
 * POST /api/webhooks/whop — fulfilment.
 *
 * A browser can close before it ever reaches the return URL, so the events
 * that matter are handled here, not on the thank-you page:
 *
 *   setup_intent.succeeded — the card-on-file step finished; the payload
 *     carries the `payt_…` the final invoice will charge.
 *   payment.succeeded      — a deposit or a flat-rate job was paid.
 *   invoice.paid           — the final balance cleared.
 *
 * Register the endpoint with `whop webhooks create` and store the signing
 * secret as the `WHOP_WEBHOOK_SECRET` app secret.
 */

import type { Env } from "../env";
import { json } from "./leads";

interface WebhookEnvelope {
  type?: string;
  data?: Record<string, unknown>;
}

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const raw = await request.text();

  const secret = env.WHOP_WEBHOOK_SECRET;
  if (secret) {
    const ok = await verifySignature(raw, request.headers, secret);
    if (!ok) {
      console.warn("[webhook] rejected: bad signature");
      return json({ ok: false, error: "Invalid signature." }, 401);
    }
  } else {
    // Refuse rather than trust an unsigned payload that moves money-adjacent state.
    console.warn("[webhook] WHOP_WEBHOOK_SECRET is not set; refusing the delivery");
    return json({ ok: false, error: "Webhook secret is not configured." }, 503);
  }

  let event: WebhookEnvelope;
  try {
    event = JSON.parse(raw) as WebhookEnvelope;
  } catch {
    return json({ ok: false, error: "Malformed payload." }, 400);
  }

  switch (event.type) {
    case "setup_intent.succeeded": {
      const data = event.data ?? {};
      const paymentMethod = data.payment_method as { id?: string } | undefined;
      const member = data.member as { id?: string } | undefined;
      // Persist these against the job in whatever CRM the business runs; this
      // template logs them so the pair is visible in `whop apps logs`.
      console.log("[webhook] card on file", {
        setupIntent: data.id,
        paymentMethodId: paymentMethod?.id,
        memberId: member?.id,
        metadata: data.metadata,
      });
      break;
    }
    case "payment.succeeded": {
      const data = event.data ?? {};
      console.log("[webhook] payment succeeded", {
        paymentId: data.id,
        planId: data.plan_id ?? (data.plan as { id?: string } | undefined)?.id,
        metadata: data.metadata,
      });
      break;
    }
    case "payment.failed": {
      console.warn("[webhook] payment failed", { paymentId: event.data?.id });
      break;
    }
    case "invoice.paid": {
      console.log("[webhook] final balance paid", { invoiceId: event.data?.id });
      break;
    }
    default:
      console.log("[webhook] unhandled", event.type);
  }

  // Acknowledge fast; anything slow belongs on a queue.
  return json({ ok: true });
}

/**
 * HMAC-SHA256 over the raw body, compared in constant time. Whop sends the
 * signature in `whop-signature` (with `whop-timestamp` for replay windows);
 * older deliveries used `x-whop-signature`.
 */
async function verifySignature(
  raw: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  const header =
    headers.get("whop-signature") ?? headers.get("x-whop-signature") ?? "";
  if (!header) return false;

  const timestamp = headers.get("whop-timestamp") ?? "";
  const provided = extractHex(header);
  if (!provided) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // Try the timestamped payload first, then the bare body, so the check works
  // whichever convention the delivery used.
  for (const payload of timestamp ? [`${timestamp}.${raw}`, raw] : [raw]) {
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
    if (constantTimeEqual(toHex(sig), provided)) return true;
  }
  return false;
}

/** Accepts a bare hex digest or a `t=…,v1=…` style header. */
function extractHex(header: string): string | null {
  const direct = header.trim().match(/^[a-f0-9]{64}$/i);
  if (direct) return direct[0].toLowerCase();
  const tagged = header.match(/v1=([a-f0-9]{64})/i);
  return tagged ? tagged[1].toLowerCase() : null;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
