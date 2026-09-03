import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouter } from "../lib/router";
import { useSite } from "../lib/config";
import { Phone } from "./Icons";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}

function SkipLink() {
  return (
    <a className="skip-link" href="#main">
      Skip to content
    </a>
  );
}

function Header() {
  const site = useSite();
  const { path } = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [path]);

  return (
    <header className="site-header">
      <div className="site-header__bar">
        <Link to="/" className="brand" aria-label={`${site.company.name} home`}>
          <span className="brand__mark" aria-hidden="true" />
          <span className="brand__text">
            <strong>{site.company.name}</strong>
            <small>{site.company.license}</small>
          </span>
        </Link>

        <button
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span className={open ? "nav-toggle__icon is-open" : "nav-toggle__icon"} aria-hidden="true">
            <i /><i /><i />
          </span>
        </button>

        <nav id="site-nav" className={open ? "site-nav is-open" : "site-nav"} aria-label="Primary">
          <Link to="/#services">Services</Link>
          <Link to="/#area">Service area</Link>
          <Link to="/#financing">Financing</Link>
          <Link to="/#reviews">Reviews</Link>
          <Link to="/#contact">Contact</Link>
          <a className="btn btn--ghost btn--sm" href={site.company.phoneHref}>
            <Phone /> {site.company.phone}
          </a>
          <Link to="/estimate" className="btn btn--primary btn--sm">
            Free estimate
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  const site = useSite();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" id="contact">
      <div className="wrap site-footer__grid">
        <div>
          <p className="site-footer__name">{site.company.legalName}</p>
          <p className="muted">{site.company.tagline}</p>
          <p className="muted">{site.company.address}</p>
          <p className="muted">{site.company.license}</p>
        </div>

        <div>
          <h3>Get in touch</h3>
          <ul className="plain">
            <li>
              <a href={site.company.phoneHref}>{site.company.phone}</a>
            </li>
            <li>
              <a href={`mailto:${site.company.email}`}>{site.company.email}</a>
            </li>
            <li className="muted">{site.company.hours}</li>
            <li className="muted">{site.company.emergencyLine}</li>
          </ul>
        </div>

        <div>
          <h3>Services</h3>
          <ul className="plain">
            {site.services.map((s) => (
              <li key={s.slug}>
                <Link to={`/services/${s.slug}`}>{s.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Ready to start?</h3>
          <p className="muted">Free written estimate within one business day.</p>
          <Link to="/estimate" className="btn btn--primary">
            Request an estimate
          </Link>
        </div>
      </div>

      <div className="wrap site-footer__legal">
        <p>
          © {year} {site.company.legalName}. Serving Central Texas since{" "}
          {site.company.foundedYear}.
        </p>
        <p className="muted">Payments and checkout are processed by Whop.</p>
        <p className="muted small">{site.footerNote}</p>
      </div>
    </footer>
  );
}
