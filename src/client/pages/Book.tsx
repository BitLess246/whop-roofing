/**
 * The checkout page for one offering. Whop Payment Elements do all the
 * collection; this page only frames them.
 *
 * For a deposit offering it also explains — and links to — the card-on-file
 * step, which is what makes the final-balance invoice possible later.
 */

import { useConfig, useOffering } from "../lib/config";
import { Link } from "../lib/router";
import { CheckoutPanel } from "../components/CheckoutPanel";
import { Check } from "../components/Icons";
import { NotFoundPage } from "./NotFound";

export function BookPage({ offeringKey }: { offeringKey: string }) {
  const offering = useOffering(offeringKey);
  const { site } = useConfig();

  if (!offering) return <NotFoundPage />;

  const service = site.services.find((s) => s.offering === offering.key);

  return (
    <article className="page page--checkout">
      <div className="wrap checkout-layout">
        <section className="checkout-summary">
          <p className="eyebrow">
            {service ? (
              <Link to={`/services/${service.slug}`}>{service.name}</Link>
            ) : (
              <Link to="/#services">Services</Link>
            )}
          </p>
          <h1>{offering.name}</h1>
          <p className="price-card__price">
            <strong>{offering.priceLabel}</strong>
            <span className="muted small">{offering.priceHint}</span>
          </p>
          <p className="lede">{offering.blurb}</p>

          <ul className="ticks ticks--tight">
            {offering.includes.map((i) => (
              <li key={i}>
                <Check /> <span>{i}</span>
              </li>
            ))}
          </ul>

          {offering.mode === "deposit" && offering.balance && (
            <div className="balance-note">
              <h2>{offering.balance.headline}</h2>
              <p>{offering.balance.body}</p>
              <Link to="/card-on-file" className="btn btn--outline btn--sm">
                Add a card on file
              </Link>
            </div>
          )}

          <p className="muted small">
            Questions before you pay? Call{" "}
            <a href={site.company.phoneHref}>{site.company.phone}</a> — {site.company.hours}.
          </p>
        </section>

        <section className="checkout-column" aria-label="Payment">
          <CheckoutPanel
            offering={offering}
            metadata={service ? { service: service.slug } : undefined}
          />
        </section>
      </div>
    </article>
  );
}
