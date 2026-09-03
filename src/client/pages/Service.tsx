/** A service detail page. Fires the `service_viewed` custom pixel event. */

import { useEffect } from "react";
import { useConfig, useService } from "../lib/config";
import { Link } from "../lib/router";
import { Check, Icon } from "../components/Icons";
import { EVENTS, track } from "../lib/track";
import { NotFoundPage } from "./NotFound";

export function ServicePage({ slug }: { slug: string }) {
  const service = useService(slug);
  const { offerings, site } = useConfig();
  const offering = offerings.find((o) => o.key === service?.offering);

  useEffect(() => {
    if (!service) return;
    // Custom pixel event #2 — one per service page view.
    track(EVENTS.SERVICE_VIEWED, {
      service: service.slug,
      service_name: service.name,
      ...(offering ? { offering: offering.key } : {}),
    });
  }, [service?.slug, offering?.key]);

  if (!service) return <NotFoundPage />;

  return (
    <article className="page">
      <div className="wrap page__head">
        <p className="eyebrow">
          <Link to="/#services">Services</Link> / {service.name}
        </p>
        <div className="page__title">
          <span className="card__icon card__icon--lg" aria-hidden="true">
            <Icon name={service.icon} />
          </span>
          <div>
            <h1>{service.name}</h1>
            <p className="lede">{service.short}</p>
          </div>
        </div>
      </div>

      <div className="wrap detail">
        <div className="detail__body">
          <p>{service.description}</p>
          <h2>What is included</h2>
          <ul className="ticks">
            {service.bullets.map((b) => (
              <li key={b}>
                <Check /> <span>{b}</span>
              </li>
            ))}
          </ul>

          <h2>How it runs</h2>
          <ol className="steps">
            <li>
              <strong>You tell us what is wrong.</strong> Estimate form or a phone call —
              whichever is faster for you.
            </li>
            <li>
              <strong>We look and put a number on it.</strong> Written quote with photos,
              not a range shouted from the driveway.
            </li>
            <li>
              <strong>You book.</strong>{" "}
              {offering?.mode === "deposit"
                ? "A deposit locks your material pricing and your install date."
                : "Pay in full at checkout, or ask for financing options at checkout."}
            </li>
            <li>
              <strong>We do the work and clean up.</strong>{" "}
              {offering?.mode === "deposit"
                ? "The final balance is billed the day the job passes final inspection."
                : "Nothing else to pay."}
            </li>
          </ol>
        </div>

        <aside className="detail__aside">
          {offering ? (
            <div className="price-card">
              <p className="price-card__price">
                <strong>{offering.priceLabel}</strong>
                <span className="muted small">{offering.priceHint}</span>
              </p>
              <p>{offering.blurb}</p>
              <ul className="ticks ticks--tight">
                {offering.includes.map((i) => (
                  <li key={i}>
                    <Check /> <span>{i}</span>
                  </li>
                ))}
              </ul>
              <Link to={`/book/${offering.key}`} className="btn btn--primary btn--block">
                {offering.mode === "deposit" ? "Reserve with a deposit" : "Book now"}
              </Link>
              <p className="muted small center">
                Apple Pay, Google Pay, card, and pay-over-time options at checkout.
              </p>
            </div>
          ) : (
            <div className="price-card">
              <p className="price-card__price">
                <strong>Quoted</strong>
                <span className="muted small">after we look at it</span>
              </p>
              <p>
                This one depends too much on your roof to price from a website. Send the
                details and we will get you a written number.
              </p>
              <Link to="/estimate" className="btn btn--primary btn--block">
                Request an estimate
              </Link>
            </div>
          )}

          <div className="aside-note">
            <p className="muted small">
              {site.company.license} · {site.company.hours}
            </p>
            <a className="btn btn--outline btn--block btn--sm" href={site.company.phoneHref}>
              Call {site.company.phone}
            </a>
          </div>
        </aside>
      </div>
    </article>
  );
}
