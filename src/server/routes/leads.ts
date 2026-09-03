/**
 * POST /api/leads — the estimate form's endpoint.
 *
 * Creates a real Lead on the Whop account so a quote request lands where the
 * business already works, instead of in an inbox nobody triages. Everything
 * the homeowner typed rides along as lead metadata, and the referrer is
 * recorded for attribution.
 *
 * https://docs.whop.com/api-reference/leads/create-lead
 */

import { resolveCompanyId, type Env } from "../env";
import { createLead, createWhopClient, WhopApiError } from "../whop-api";

interface Body {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown;
  projectType?: unknown;
  urgency?: unknown;
  roofAge?: unknown;
  details?: unknown;
  referrer?: unknown;
  utm?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX = 2000;

export async function handleCreateLead(request: Request, env: Env): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ ok: false, error: "Expected a JSON body." }, 400);
  }

  const name = str(body.name);
  const email = str(body.email);
  const phone = str(body.phone);
  const address = str(body.address);

  if (!name) return json({ ok: false, error: "A name is required." }, 422);
  if (!EMAIL_RE.test(email)) return json({ ok: false, error: "A valid email is required." }, 422);
  if (phone.replace(/\D/g, "").length < 10)
    return json({ ok: false, error: "A 10-digit phone number is required." }, 422);
  if (!address) return json({ ok: false, error: "A property address is required." }, 422);

  const companyId = resolveCompanyId(env);
  if (!companyId) {
    return json(
      {
        ok: false,
        error:
          "WHOP_COMPANY_ID is not set. Run `whop apps secrets set WHOP_COMPANY_ID=biz_…` and redeploy.",
      },
      500,
    );
  }

  const utm = plainStrings(body.utm);

  // Whop stores lead metadata as free-form JSON: the homeowner's contact
  // details and the shape of the job go here so the dashboard row is
  // actionable on its own.
  const metadata: Record<string, string> = {
    source: "website_estimate_form",
    name,
    email,
    phone,
    property_address: address,
    project_type: str(body.projectType) || "Not specified",
    urgency: str(body.urgency) || "Not specified",
    roof_age: str(body.roofAge) || "Not specified",
    details: str(body.details).slice(0, MAX) || "—",
    submitted_at: new Date().toISOString(),
    ...utm,
  };

  try {
    const client = createWhopClient(env);
    const lead = await createLead(client, {
      company_id: companyId,
      product_id: env.WHOP_PRODUCT_ID ?? null,
      referrer: str(body.referrer).slice(0, 500) || null,
      metadata,
    });

    return json({
      ok: true,
      data: { leadId: lead.id, productId: lead.product?.id ?? null },
    });
  } catch (err) {
    const status = err instanceof WhopApiError ? err.status : 500;
    console.error("[leads] create failed", err);
    return json(
      {
        ok: false,
        error:
          status === 401 || status === 403
            ? "The site is not authorized to record leads. Check the app's lead:manage permission."
            : "We could not record your request. Please call us and we will take it down by hand.",
      },
      status >= 400 && status < 500 ? 400 : 502,
    );
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function plainStrings(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && v) out[k.slice(0, 60)] = v.slice(0, 200);
  }
  return out;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
