/**
 * Card-on-file. The server creates a checkout configuration in `mode: "setup"`;
 * mounting it in the Checkout element collects and stores a payment method
 * without charging it. Whop creates the setup intent behind that checkout and
 * emits `setup_intent.succeeded` with the stored method, which is what the
 * final-balance invoice later charges.
 */

import { useEffect, useState } from "react";
import { useConfig } from "../lib/config";
import { createSetupCheckout } from "../lib/api";
import { SetupCheckoutPanel } from "../components/CheckoutPanel";
import { Check } from "../components/Icons";
import { Link } from "../lib/router";

export function CardOnFilePage() {
  const { site } = useConfig();
  const [configId, setConfigId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createSetupCheckout({ reason: "roof_project_balance" }).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setConfigId(res.data.checkoutConfigurationId);
      else setError(res.error ?? "Could not start the card-on-file step.");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <article className="page page--checkout">
      <div className="wrap checkout-layout">
        <section className="checkout-summary">
          <p className="eyebrow">Project billing</p>
          <h1>Keep a card on file for the final balance</h1>
          <p className="lede">
            Nothing is charged today. We store the card so the balance clears the day
            your job passes final inspection, instead of chasing a check.
          </p>
          <ul className="ticks ticks--tight">
            <li><Check /> <span>No charge now — this only saves the card</span></li>
            <li><Check /> <span>Stored by Whop, never on our servers</span></li>
            <li><Check /> <span>You get an itemized invoice either way</span></li>
            <li><Check /> <span>Ask us to email an invoice instead, any time</span></li>
          </ul>
          <p className="muted small">
            Rather pay by invoice? Call <a href={site.company.phoneHref}>{site.company.phone}</a>{" "}
            and we will email one instead. <Link to="/">Back to the site</Link>
          </p>
        </section>

        <section className="checkout-column" aria-label="Save a payment method">
          {error && <p className="checkout-panel__error" role="alert">{error}</p>}
          {!error && !configId && <div className="element-skeleton" style={{ height: 300 }} />}
          {configId && <SetupCheckoutPanel checkoutConfigurationId={configId} />}
        </section>
      </div>
    </article>
  );
}
