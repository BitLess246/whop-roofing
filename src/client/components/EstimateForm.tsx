/**
 * "Request an Estimate" — posts to this site's `/api/leads`, which creates a
 * real Lead on the Whop account. Every field the homeowner fills in rides
 * along as lead metadata, so the quote request is readable in the dashboard
 * without a second system.
 *
 * The pixel event fires only after the lead is confirmed created, keyed by the
 * returned lead ID so a retry or a refresh cannot double-count it.
 */

import { useState, type FormEvent } from "react";
import { useConfig } from "../lib/config";
import { submitEstimate } from "../lib/api";
import { EVENTS, track } from "../lib/track";
import { Check } from "./Icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Errors {
  [field: string]: string | undefined;
}

export function EstimateForm({ compact = false }: { compact?: boolean }) {
  const { site } = useConfig();
  const form = site.estimateForm;

  const [values, setValues] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    projectType: form.projectTypes[0] ?? "",
    urgency: form.urgencies[0] ?? "",
    roofAge: form.roofAges[0] ?? "",
    details: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);

  const set = (field: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  function validate(): boolean {
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Tell us who to ask for.";
    if (!EMAIL_RE.test(values.email.trim())) next.email = "We need a working email to send the quote.";
    if (values.phone.replace(/\D/g, "").length < 10) next.phone = "A 10-digit phone number, please.";
    if (!values.address.trim()) next.address = "Which property are we looking at?";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    if (!validate()) return;

    setStatus("sending");
    setServerError(null);

    const result = await submitEstimate({
      ...values,
      referrer: typeof document !== "undefined" ? document.referrer || window.location.href : undefined,
      utm: readUtm(),
    });

    if (!result.ok || !result.data) {
      setStatus("error");
      setServerError(result.error ?? "Something went wrong. Call us and we will take it down by hand.");
      return;
    }

    setLeadId(result.data.leadId);
    setStatus("sent");

    // Custom pixel event #1. `event_id` is the Whop lead ID, so the same
    // conversion mirrored from a webhook is counted once.
    track(EVENTS.ESTIMATE_REQUESTED, {
      event_id: result.data.leadId,
      project_type: values.projectType,
      urgency: values.urgency,
    });
  }

  if (status === "sent") {
    return (
      <div className="form-card form-card--done" role="status">
        <div className="form-done__badge" aria-hidden="true">
          <Check />
        </div>
        <h3>Estimate request received</h3>
        <p>
          Thanks, {values.name.split(" ")[0]}. We will reply to{" "}
          <strong>{values.email}</strong> within one business day — sooner if you marked
          it an emergency.
        </p>
        <p className="muted small">
          Reference {leadId} · Need us now? Call{" "}
          <a href={site.company.phoneHref}>{site.company.phone}</a>.
        </p>
      </div>
    );
  }

  return (
    <form className={compact ? "form-card form-card--compact" : "form-card"} onSubmit={onSubmit} noValidate>
      <div className="form-grid">
        <Field label="Full name" error={errors.name} htmlFor="ef-name">
          <input id="ef-name" name="name" autoComplete="name" value={values.name}
                 onChange={set("name")} placeholder="Jordan Alvarez" />
        </Field>

        <Field label="Email" error={errors.email} htmlFor="ef-email">
          <input id="ef-email" name="email" type="email" autoComplete="email" value={values.email}
                 onChange={set("email")} placeholder="you@example.com" />
        </Field>

        <Field label="Phone" error={errors.phone} htmlFor="ef-phone">
          <input id="ef-phone" name="phone" type="tel" autoComplete="tel" value={values.phone}
                 onChange={set("phone")} placeholder="(512) 555-0100" />
        </Field>

        <Field label="Property address" error={errors.address} htmlFor="ef-address" wide>
          <input id="ef-address" name="address" autoComplete="street-address" value={values.address}
                 onChange={set("address")} placeholder="123 Oak Ridge Dr, Austin, TX 78745" />
        </Field>

        <Field label="What do you need?" htmlFor="ef-project">
          <select id="ef-project" value={values.projectType} onChange={set("projectType")}>
            {form.projectTypes.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="How soon?" htmlFor="ef-urgency">
          <select id="ef-urgency" value={values.urgency} onChange={set("urgency")}>
            {form.urgencies.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Roof age" htmlFor="ef-age">
          <select id="ef-age" value={values.roofAge} onChange={set("roofAge")}>
            {form.roofAges.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="Anything else we should know?" htmlFor="ef-details" wide>
          <textarea id="ef-details" rows={4} value={values.details} onChange={set("details")}
                    placeholder="Stain on the ceiling in the back bedroom after last week's storm." />
        </Field>
      </div>

      {serverError && (
        <p className="form-error form-error--server" role="alert">
          {serverError}
        </p>
      )}

      <button className="btn btn--primary btn--block" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Request my free estimate"}
      </button>

      <p className="muted small consent">{form.consent}</p>
    </form>
  );
}

function Field({
  label, htmlFor, error, wide, children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? "field field--wide" : "field"}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

function readUtm(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = params.get(key);
    if (v) utm[key] = v;
  }
  return utm;
}
