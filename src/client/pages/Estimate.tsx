import { EstimateForm } from "../components/EstimateForm";
import { useSite } from "../lib/config";
import { Check } from "../components/Icons";

export function EstimatePage() {
  const site = useSite();
  return (
    <article className="page">
      <div className="wrap estimate estimate--page">
        <div className="estimate__copy">
          <p className="eyebrow">Free estimate</p>
          <h1>{site.estimateForm.headline}</h1>
          <p className="lede">{site.estimateForm.body}</p>
          <ul className="ticks">
            <li><Check /> <span>Written quote with photos, not a ballpark</span></li>
            <li><Check /> <span>Reply within one business day</span></li>
            <li><Check /> <span>No obligation and no pressure call</span></li>
            <li><Check /> <span>{site.serviceArea.radiusNote}</span></li>
          </ul>
          <p className="muted small">
            Emergency? <a href={site.company.phoneHref}>{site.company.phone}</a> ·{" "}
            {site.company.emergencyLine}
          </p>
        </div>
        <EstimateForm />
      </div>
    </article>
  );
}
