/** Typed fetch helpers for this site's own server routes. */

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function post<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as ApiResult<T>;
    if (!res.ok) return { ok: false, error: json?.error ?? `Request failed (${res.status})` };
    return json;
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export function submitEstimate(body: unknown) {
  return post<{ leadId: string; productId: string | null }>("/api/leads", body);
}

export function createSetupCheckout(body: unknown) {
  return post<{ checkoutConfigurationId: string }>("/api/setup-checkout", body);
}

export function createInvoice(body: unknown) {
  return post<{
    invoiceId: string;
    status?: string;
    collectionMethod: string;
    hostedInvoiceUrl?: string | null;
  }>("/api/invoices", body);
}
