/**
 * POST /api/setup-checkout — starts the card-on-file step.
 *
 * There is no `createSetupIntent` endpoint: a setup intent is created by
 * opening a checkout configuration in `mode: "setup"`. The buyer completes
 * that checkout in the Checkout element, Whop stores the payment method, and
 * `setup_intent.succeeded` delivers the `payt_…` the final invoice charges.
 *
 * https://docs.whop.com/developer/guides/save-payment-methods
 */

import { resolveCompanyId, type Env } from "../env";
import { createSetupCheckoutConfiguration, createWhopClient, WhopApiError } from "../whop-api";
import { json } from "./leads";

export async function handleSetupCheckout(request: Request, env: Env): Promise<Response> {
  const companyId = resolveCompanyId(env);
  if (!companyId) {
    return json({ ok: false, error: "WHOP_COMPANY_ID is not set on this deployment." }, 500);
  }

  let reason = "roof_project_balance";
  try {
    const body = (await request.json()) as { reason?: unknown };
    if (typeof body?.reason === "string" && body.reason.length <= 80) reason = body.reason;
  } catch {
    /* body is optional */
  }

  const origin = new URL(request.url).origin;

  try {
    const client = createWhopClient(env);
    const config = await createSetupCheckoutConfiguration(client, {
      account_id: companyId,
      redirect_url: `${origin}/thank-you?card_on_file=1`,
      metadata: {
        reason,
        source: "website_card_on_file",
        created_at: new Date().toISOString(),
      },
    });

    return json({ ok: true, data: { checkoutConfigurationId: config.id } });
  } catch (err) {
    console.error("[setup-checkout] create failed", err);
    const status = err instanceof WhopApiError ? err.status : 500;
    return json(
      { ok: false, error: "Could not start the card-on-file step. Please call us instead." },
      status === 401 || status === 403 ? 403 : 502,
    );
  }
}
