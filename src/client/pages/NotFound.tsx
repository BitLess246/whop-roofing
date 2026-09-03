import { Link } from "../lib/router";

export function NotFoundPage() {
  return (
    <article className="page">
      <div className="wrap wrap--narrow center-block">
        <p className="eyebrow">404</p>
        <h1>That page is not on this roof</h1>
        <p className="lede">
          The link is broken or the page moved. Start from the top, or tell us what you
          need and we will get back to you.
        </p>
        <div className="hero__ctas hero__ctas--center">
          <Link to="/" className="btn btn--outline">Home</Link>
          <Link to="/estimate" className="btn btn--primary">Request an estimate</Link>
        </div>
      </div>
    </article>
  );
}
