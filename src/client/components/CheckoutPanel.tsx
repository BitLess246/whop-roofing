/**
 * The checkout surface. Everything the buyer types is collected by Whop's
 * hosted elements inside frames served from js.whop.cloud — this template has
 * no card form, no Stripe, and no PayPal, and never sees a card number.
 *
 * Three element groups render here:
 *
 *  1. `<Checkout><ExpressCheckoutElement/></Checkout>` — Apple Pay / Google Pay.
 *  2. `<Checkout><CheckoutElement/></Checkout>`        — the full checkout surface,
 *     which is where Whop surfaces pay-over-time methods (Klarna, Afterpay,
 *     Splitit…) for approved merchants alongside cards and wallets.
 *  3. `<Payments><BrandingElement/></Payments>`        — Whop's merchant-of-record
 *     notice, required alongside every payment collection surface.
 *
 * CheckoutElement and ExpressCheckoutElement are alternatives that share one
 * handle's entry slot, so each gets its own `<Checkout>` group. Both are minted
 * from the same `plan_...`, so the price is asserted server-side by the plan,
 * never by anything this page could set.
 *
 * https://docs.whop.com/elements/beta/checkout/overview
 */

import { useEffect, useMemo, useState } from "react";
import {
  Checkout,
  CheckoutElement,
  ExpressCheckoutElement,
  Payments,
  BrandingElement,
} from "@whop/elements-react";
import type { ResolvedOffering } from "../../shared/types";
import { useConfig } from "../lib/config";
import { useElementsFailed } from "../App";
import { EVENTS, trackOnce } from "../lib/track";

export interface CheckoutPanelProps {
  offering: ResolvedOffering;
  /** Recorded against the order and readable back on the payment. */
  metadata?: Record<string, string>;
  /** Where Whop returns the buyer after an off-site step (3DS, a bank page). */
  returnPath?: string;
}

export function CheckoutPanel({
  offering,
  metadata,
  returnPath = "/thank-you",
}: CheckoutPanelProps) {
  const { site } = useConfig();
  const elementsFailed = useElementsFailed();
  const [expressReady, setExpressReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `returnUrl` must be absolute and https (http is allowed on localhost), and
  // the origin is only knowable in the browser.
  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new URL(`${returnPath}?offering=${offering.key}`, window.location.origin).toString();
  }, [returnPath, offering.key]);

  const orderMetadata = useMemo<Record<string, string>>(
    () => ({
      offering: offering.key,
      offering_mode: offering.mode,
      company: site.company.name,
      ...metadata,
    }),
    [offering.key, offering.mode, site.company.name, metadata],
  );

  useEffect(() => {
    // A checkout for a deposit is the moment worth reporting on a high-ticket
    // job; every other checkout reports as a plain view.
    if (offering.mode === "deposit") {
      trackOnce(`deposit:${offering.key}`, EVENTS.DEPOSIT_STARTED, {
        value: priceToNumber(offering.priceLabel),
        currency: "USD",
        offering: offering.key,
      });
    } else {
      trackOnce(`checkout:${offering.key}`, EVENTS.CHECKOUT_VIEWED, {
        value: priceToNumber(offering.priceLabel),
        currency: "USD",
        offering: offering.key,
      });
    }
  }, [offering.key, offering.mode, offering.priceLabel]);

  if (!offering.planId) {
    return <MissingPlanNotice offering={offering} />;
  }

  if (elementsFailed) return <ElementsUnavailable />;

  return (
    <div className="checkout-panel">
      {error && (
        <p className="checkout-panel__error" role="alert">
          {error}
        </p>
      )}

      {/* 1 — Express wallets. Renders nothing when the device has no wallet. */}
      <div className={expressReady ? "checkout-express" : "checkout-express is-empty"}>
        <Checkout
          plan={offering.planId}
          returnUrl={returnUrl}
          metadata={orderMetadata}
          fallback={<ElementSkeleton height={52} />}
        >
          <ExpressCheckoutElement
            layout="horizontal"
            onReady={() => setExpressReady(true)}
            onError={() => setExpressReady(false)}
          />
        </Checkout>
        {expressReady && (
          <div className="checkout-divider">
            <span>or pay another way</span>
          </div>
        )}
      </div>

      {/* 2 — The full checkout surface: card, wallets, and the pay-over-time
              methods Whop enables for the merchant. */}
      <Checkout
        plan={offering.planId}
        returnUrl={returnUrl}
        metadata={orderMetadata}
        fallback={<ElementSkeleton height={340} />}
      >
        <CheckoutElement
          onError={(e) =>
            setError(e.message || "Checkout could not load. Refresh and try again.")
          }
        />
      </Checkout>

      {/* 3 — Whop's merchant-of-record notice. Required alongside a payment surface. */}
      <div className="checkout-branding">
        <Payments fallback={<ElementSkeleton height={20} />}>
          <BrandingElement />
        </Payments>
      </div>
    </div>
  );
}

/**
 * The card-on-file step. A checkout configuration created server-side with
 * `mode: "setup"` collects and stores a payment method without charging it —
 * Whop creates the setup intent behind it and emits `setup_intent.succeeded`
 * carrying the stored method. Same elements, same frames, no charge.
 *
 * https://docs.whop.com/developer/guides/save-payment-methods
 */
/** Shown when js.whop.cloud is unreachable, so the visitor still has a way through. */
export function ElementsUnavailable() {
  const { site } = useConfig();
  return (
    <div className="setup-notice" role="alert">
      <h3>Checkout could not load</h3>
      <p>
        Something between your browser and our payment provider is blocking the secure
        checkout — often an ad blocker or a corporate network.
      </p>
      <p>
        Call <a href={site.company.phoneHref}>{site.company.phone}</a> ({site.company.hours})
        and we will take payment over the phone, or try again on another connection.
      </p>
    </div>
  );
}

export function SetupCheckoutPanel({
  checkoutConfigurationId,
  returnPath = "/thank-you",
}: {
  checkoutConfigurationId: string;
  returnPath?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const elementsFailed = useElementsFailed();

  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new URL(`${returnPath}?card_on_file=1`, window.location.origin).toString();
  }, [returnPath]);

  useEffect(() => {
    trackOnce("card-on-file", EVENTS.CARD_ON_FILE_STARTED);
  }, []);

  if (elementsFailed) return <ElementsUnavailable />;

  return (
    <div className="checkout-panel">
      {error && (
        <p className="checkout-panel__error" role="alert">
          {error}
        </p>
      )}
      <Checkout
        checkoutConfiguration={checkoutConfigurationId}
        returnUrl={returnUrl}
        fallback={<ElementSkeleton height={300} />}
      >
        <CheckoutElement
          onError={(e) => setError(e.message || "Could not load the card form.")}
        />
      </Checkout>
      <div className="checkout-branding">
        <Payments fallback={<ElementSkeleton height={20} />}>
          <BrandingElement />
        </Payments>
      </div>
    </div>
  );
}

function MissingPlanNotice({ offering }: { offering: ResolvedOffering }) {
  return (
    <div className="setup-notice" role="status">
      <h3>Checkout is not wired up yet</h3>
      <p>
        No plan ID for <strong>{offering.name}</strong>. Create the plans and set the
        secrets, then redeploy:
      </p>
      <pre>
        <code>
          {`npm run bootstrap            # creates the product + plans on your account\n`}
          {`whop apps secrets set ${offering.planEnv}=plan_xxxxxxxx\n`}
          {`whop apps deploy`}
        </code>
      </pre>
    </div>
  );
}

function ElementSkeleton({ height }: { height: number }) {
  return <div className="element-skeleton" style={{ height }} aria-hidden="true" />;
}

/** "$149" -> 149. Used only to give the pixel a `value`; never to assert a price. */
function priceToNumber(label: string): number | undefined {
  const n = Number(label.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
