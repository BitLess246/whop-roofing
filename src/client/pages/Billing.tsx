/**
 * Internal billing console — the office side of the deposit → job → final
 * balance flow.
 *
 * A finished job is itemized here and billed through the Whop Invoices API,
 * either by charging the card the homeowner left on file
 * (`collection_method: "charge_automatically"` against the stored
 * `payment_token_id`) or by emailing them a payable invoice
 * (`collection_method: "send_invoice"`).
 *
 * Gated by the `ADMIN_PASSCODE` app secret. The passcode is checked
 * server-side on every request — this page never holds authority of its own.
 */

import { useMemo, useState } from "react";
import { useConfig } from "../lib/config";
import { createInvoice } from "../lib/api";
import { Check } from "../components/Icons";

interface LineItem {
  label: string;
  unitPrice: string;
  quantity: string;
}

const DEFAULT_LINES: LineItem[] = [
  { label: "Roof replacement — 28 squares, Class 4 shingles", unitPrice: "18400", quantity: "1" },
  { label: "Decking replacement — 6 sheets", unitPrice: "84", quantity: "6" },
  { label: "Deposit already paid", unitPrice: "-500", quantity: "1" },
];

export function BillingPage() {
  const { site, setupIncomplete } = useConfig();

  const [passcode, setPasscode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [memberId, setMemberId] = useState("");
  const [paymentTokenId, setPaymentTokenId] = useState("");
  const [collectionMethod, setCollectionMethod] =
    useState<"charge_automatically" | "send_invoice">("send_invoice");
  const [dueInDays, setDueInDays] = useState("7");
  const [lines, setLines] = useState<LineItem[]>(DEFAULT_LINES);

  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    invoiceId: string;
    status?: string;
    collectionMethod: string;
    hostedInvoiceUrl?: string | null;
  } | null>(null);

  const total = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const price = Number(l.unitPrice);
        const qty = Number(l.quantity || "1");
        return sum + (Number.isFinite(price) && Number.isFinite(qty) ? price * qty : 0);
      }, 0),
    [lines],
  );

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;

    if (total <= 0) {
      setError("The line items have to total a chargeable amount.");
      setStatus("error");
      return;
    }
    if (collectionMethod === "charge_automatically" && !paymentTokenId.trim()) {
      setError(
        "Charging automatically needs the stored payment method (payt_…) from the setup intent.",
      );
      setStatus("error");
      return;
    }

    setStatus("sending");
    setError(null);

    const res = await createInvoice({
      passcode,
      customerName: customerName.trim() || undefined,
      email: email.trim() || undefined,
      memberId: memberId.trim() || undefined,
      paymentTokenId: paymentTokenId.trim() || undefined,
      collectionMethod,
      dueInDays: Number(dueInDays) || 7,
      lineItems: lines
        .filter((l) => l.label.trim() && l.unitPrice.trim())
        .map((l) => ({
          label: l.label.trim(),
          unitPrice: Number(l.unitPrice),
          quantity: Number(l.quantity || "1"),
        })),
    });

    if (!res.ok || !res.data) {
      setStatus("error");
      setError(res.error ?? "Could not create the invoice.");
      return;
    }
    setResult(res.data);
    setStatus("done");
  }

  return (
    <article className="page">
      <div className="wrap wrap--narrow">
        <p className="eyebrow">Internal · {site.company.name}</p>
        <h1>Bill a final balance</h1>
        <p className="lede">
          Itemize the finished job and bill it through the Whop Invoices API — charge the
          card left on file, or email a payable invoice.
        </p>

        {setupIncomplete && (
          <p className="setup-notice setup-notice--inline">
            Account secrets are not fully set. See the README's setup section.
          </p>
        )}

        {status === "done" && result ? (
          <div className="form-card form-card--done" role="status">
            <div className="form-done__badge" aria-hidden="true"><Check /></div>
            <h2>Invoice created</h2>
            <dl className="kv">
              <div><dt>Invoice</dt><dd><code>{result.invoiceId}</code></dd></div>
              <div><dt>Status</dt><dd>{result.status ?? "—"}</dd></div>
              <div><dt>Collection</dt><dd>{result.collectionMethod}</dd></div>
              <div><dt>Total</dt><dd>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</dd></div>
            </dl>
            {result.hostedInvoiceUrl && (
              <p>
                <a href={result.hostedInvoiceUrl} target="_blank" rel="noreferrer">
                  Open the hosted invoice
                </a>
              </p>
            )}
            <p className="muted small">
              {result.collectionMethod === "charge_automatically"
                ? "The stored card is charged in the background; watch payment.succeeded / payment.failed."
                : "The customer has been emailed a payable invoice."}
            </p>
            <button className="btn btn--outline" onClick={() => { setStatus("idle"); setResult(null); }}>
              Create another
            </button>
          </div>
        ) : (
          <form className="form-card" onSubmit={submit} noValidate>
            <div className="form-grid">
              <div className="field field--wide">
                <label htmlFor="bp-pass">Admin passcode</label>
                <input id="bp-pass" type="password" value={passcode} autoComplete="off"
                       onChange={(e) => setPasscode(e.target.value)}
                       placeholder="ADMIN_PASSCODE app secret" />
              </div>

              <div className="field">
                <label htmlFor="bp-name">Customer name</label>
                <input id="bp-name" value={customerName}
                       onChange={(e) => setCustomerName(e.target.value)} placeholder="Jordan Alvarez" />
              </div>

              <div className="field">
                <label htmlFor="bp-email">Customer email</label>
                <input id="bp-email" type="email" value={email}
                       onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>

              <div className="field">
                <label htmlFor="bp-member">Member ID <span className="muted small">optional</span></label>
                <input id="bp-member" value={memberId}
                       onChange={(e) => setMemberId(e.target.value)} placeholder="mber_…" />
              </div>

              <div className="field">
                <label htmlFor="bp-method">Collection method</label>
                <select id="bp-method" value={collectionMethod}
                        onChange={(e) => setCollectionMethod(e.target.value as typeof collectionMethod)}>
                  <option value="send_invoice">send_invoice — email a payable invoice</option>
                  <option value="charge_automatically">charge_automatically — charge the card on file</option>
                </select>
              </div>

              {collectionMethod === "charge_automatically" && (
                <div className="field field--wide">
                  <label htmlFor="bp-token">Stored payment method</label>
                  <input id="bp-token" value={paymentTokenId}
                         onChange={(e) => setPaymentTokenId(e.target.value)} placeholder="payt_…" />
                  <p className="muted small">
                    Arrives on the <code>setup_intent.succeeded</code> webhook after the
                    card-on-file step.
                  </p>
                </div>
              )}

              <div className="field">
                <label htmlFor="bp-due">Due in (days)</label>
                <input id="bp-due" type="number" min={1} max={90} value={dueInDays}
                       onChange={(e) => setDueInDays(e.target.value)} />
              </div>
            </div>

            <h2 className="form-subhead">Line items</h2>
            <div className="lines">
              {lines.map((line, i) => (
                <div className="line" key={i}>
                  <input aria-label={`Line ${i + 1} description`} value={line.label}
                         onChange={(e) => updateLine(i, { label: e.target.value })}
                         placeholder="Description" />
                  <input aria-label={`Line ${i + 1} quantity`} value={line.quantity} inputMode="decimal"
                         onChange={(e) => updateLine(i, { quantity: e.target.value })} placeholder="Qty" />
                  <input aria-label={`Line ${i + 1} unit price`} value={line.unitPrice} inputMode="decimal"
                         onChange={(e) => updateLine(i, { unitPrice: e.target.value })} placeholder="Unit $" />
                  <button type="button" className="line__remove"
                          onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                          aria-label={`Remove line ${i + 1}`}>×</button>
                </div>
              ))}
            </div>

            <button type="button" className="btn btn--outline btn--sm"
                    onClick={() => setLines((p) => [...p, { label: "", unitPrice: "", quantity: "1" }])}>
              Add line
            </button>

            <p className="lines__total">
              Balance due <strong>${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
            </p>

            {error && <p className="form-error form-error--server" role="alert">{error}</p>}

            <button className="btn btn--primary btn--block" type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Creating invoice…" : "Create invoice"}
            </button>
            <p className="muted small consent">
              Negative lines are credits — the deposit already paid comes off here. Whop
              requires the lines to total a chargeable amount.
            </p>
          </form>
        )}
      </div>
    </article>
  );
}
