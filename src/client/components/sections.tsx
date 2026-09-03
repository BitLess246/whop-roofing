/**
 * The marketing sections. Each reads entirely from config — none of them
 * contains a company name, price, city, or review.
 */

import { useConfig, useSite } from "../lib/config";
import { Link } from "../lib/router";
import { Check, Icon, Roofline, StarRow } from "./Icons";
import { EstimateForm } from "./EstimateForm";

export function Hero() {
  const site = useSite();
  const { hero, company } = site;

  return (
    <section className="hero">
      <Roofline className="hero__roofline" />
      <div className="wrap hero__inner">
        <div className="hero__copy">
          <p className="eyebrow">{hero.eyebrow}</p>
          <h1>{hero.headline}</h1>
          <p className="lede">{hero.subhead}</p>

          <div className="hero__ctas">
            <Link to={hero.primaryCta.href} className="btn btn--primary btn--lg">
              {hero.primaryCta.label}
            </Link>
            <Link to={hero.secondaryCta.href} className="btn btn--outline btn--lg">
              {hero.secondaryCta.label}
            </Link>
          </div>

          <p className="hero__phone">
            Storm damage right now?{" "}
            <a href={company.phoneHref}>{company.phone}</a> · {company.emergencyLine}
          </p>
        </div>

        <ul className="hero__stats">
          {hero.stats.map((s) => (
            <li key={s.label}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ServicesGrid() {
  const { site, offerings } = useConfig();

  return (
    <section className="section" id="services">
      <div className="wrap">
        <SectionHead
          kicker="Services"
          title="Repair, replacement, inspection — priced before we start"
          body="Every job starts with a written number. Two of these you can book and pay for right here; the rest we quote after we look."
        />

        <div className="cards">
          {site.services.map((service) => {
            const offering = offerings.find((o) => o.key === service.offering);
            return (
              <article className="card" key={service.slug}>
                <span className="card__icon" aria-hidden="true">
                  <Icon name={service.icon} />
                </span>
                <h3>
                  <Link to={`/services/${service.slug}`}>{service.name}</Link>
                </h3>
                <p>{service.short}</p>

                {offering ? (
                  <p className="card__price">
                    <strong>{offering.priceLabel}</strong>
                    <span className="muted small"> {offering.priceHint}</span>
                  </p>
                ) : (
                  <p className="card__price">
                    <strong>Quoted</strong>
                    <span className="muted small"> after inspection</span>
                  </p>
                )}

                <div className="card__actions">
                  <Link to={`/services/${service.slug}`} className="btn btn--outline btn--sm">
                    Details
                  </Link>
                  {offering ? (
                    <Link to={`/book/${offering.key}`} className="btn btn--primary btn--sm">
                      {offering.mode === "deposit" ? "Reserve with deposit" : "Book now"}
                    </Link>
                  ) : (
                    <Link to="/estimate" className="btn btn--primary btn--sm">
                      Get a quote
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FinancingCallout() {
  const site = useSite();
  const { financing } = site;

  return (
    <section className="section section--accent" id="financing">
      <div className="wrap financing">
        <div>
          <p className="eyebrow eyebrow--light">Financing</p>
          <h2>{financing.headline}</h2>
          <p className="lede">{financing.body}</p>
          <Link to="/estimate" className="btn btn--invert btn--lg">
            Get your number first
          </Link>
        </div>
        <ul className="ticks ticks--light">
          {financing.points.map((p) => (
            <li key={p}>
              <Check /> <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ServiceArea() {
  const site = useSite();
  const { serviceArea } = site;

  return (
    <section className="section" id="area">
      <div className="wrap area">
        <div className="area__copy">
          <SectionHead kicker="Service area" title={serviceArea.headline} body={serviceArea.body} align="left" />
          <p className="pill">{serviceArea.radiusNote}</p>
        </div>
        <ul className="area__list">
          {serviceArea.areas.map((a) => (
            <li key={a.city}>
              <strong>{a.city}</strong>
              <span className="muted small">{a.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TrustAndReviews() {
  const site = useSite();
  const { trust } = site;

  return (
    <section className="section section--muted" id="reviews">
      <div className="wrap">
        <SectionHead kicker="Trust" title={trust.headline} />

        <ul className="badges">
          {trust.badges.map((b) => (
            <li key={b.label}>
              <strong>{b.label}</strong>
              <span className="muted small">{b.note}</span>
            </li>
          ))}
        </ul>

        <div className="reviews">
          {trust.reviews.map((r) => (
            <figure className="review" key={r.name + r.job}>
              <StarRow rating={r.rating} />
              <blockquote>{r.quote}</blockquote>
              <figcaption>
                <strong>{r.name}</strong>
                <span className="muted small">
                  {r.location} · {r.job}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const site = useSite();
  return (
    <section className="section" id="faq">
      <div className="wrap wrap--narrow">
        <SectionHead kicker="Questions" title="What homeowners ask us first" />
        <div className="faq">
          {site.faq.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EstimateSection() {
  const site = useSite();
  return (
    <section className="section section--muted" id="estimate">
      <div className="wrap estimate">
        <div className="estimate__copy">
          <SectionHead
            kicker="Free estimate"
            title={site.estimateForm.headline}
            body={site.estimateForm.body}
            align="left"
          />
          <ul className="ticks">
            <li><Check /> <span>Written quote, not a ballpark</span></li>
            <li><Check /> <span>Reply within one business day</span></li>
            <li><Check /> <span>No obligation, no pressure call</span></li>
          </ul>
          <p className="muted small">
            Prefer the phone? <a href={site.company.phoneHref}>{site.company.phone}</a> · {site.company.hours}
          </p>
        </div>
        <EstimateForm />
      </div>
    </section>
  );
}

export function SectionHead({
  kicker, title, body, align = "center",
}: {
  kicker?: string;
  title: string;
  body?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "section-head" : "section-head section-head--left"}>
      {kicker && <p className="eyebrow">{kicker}</p>}
      <h2>{title}</h2>
      {body && <p className="lede">{body}</p>}
    </div>
  );
}
