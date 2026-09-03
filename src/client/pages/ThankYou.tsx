/**
 * Where Whop returns the buyer after checkout. Fulfilment belongs on the
 * webhook, not here — a browser can close before it ever loads this page — so
 * this is purely the receipt-side confirmation.
 */

import { useConfig } from "../lib/config";
import { Link, useRouter } from "../lib/router";
import { Check } from "../components/Icons";

export function ThankYouPage() {
  const { search } = useRouter();
  const { site, offerings } = useConfig();

  const cardOnFile = search.get("card_on_file") === "1";
  const offering = offerings.find((o) => o.key === search.get("offering"));

  return (
    <article className="page">
      <div className="wrap wrap--narrow center-block">
        <div className="form-done__badge form-done__badge--lg" aria-hidden="true">
          <Check />
        </div>

        {cardOnFile ? (
          <>
            <h1>Card saved</h1>
            <p className="lede">
              Nothing was charged. We will bill the final balance the day your job passes
              final inspection, and you will get an itemized invoice by email.
            </p>
          </>
        ) : offering?.mode === "deposit" ? (
          <>
            <h1>Deposit received — you are on the schedule</h1>
            <p className="lede">
              Your material pricing is locked and your install date is reserved. A
              coordinator will call within one business day to confirm the date.
            </p>
            <p>
              Next: <Link to="/card-on-file">add a card on file</Link> so the final
              balance clears automatically when the job is done. Optional — we can email
              you an invoice instead.
            </p>
          </>
        ) : (
          <>
            <h1>You are booked</h1>
            <p className="lede">
              {offering
                ? `Your ${offering.name.toLowerCase()} is confirmed. `
                : "Your booking is confirmed. "}
              We will call within one business day to lock in the time window.
            </p>
          </>
        )}

        <p className="muted">
          Receipt is on its way from Whop. Questions?{" "}
          <a href={site.company.phoneHref}>{site.company.phone}</a> · {site.company.hours}
        </p>

        <Link to="/" className="btn btn--outline">
          Back to the site
        </Link>
      </div>
    </article>
  );
}
