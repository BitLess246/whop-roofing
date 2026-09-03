/** Types for the config in `site.config.ts` and the payload the server ships to the client. */

export type OfferingKey = string;

export interface ServiceDef {
  slug: string;
  name: string;
  short: string;
  description: string;
  bullets: string[];
  icon: "clipboard" | "wrench" | "home" | "droplet" | "shield";
  /** Links this service to a purchasable offering. Omit for quote-only services. */
  offering?: OfferingKey;
}

export interface OfferingDef {
  key: OfferingKey;
  /** Name of the env var / Whop app secret holding this offering's `plan_...` ID. */
  planEnv: string;
  /**
   * `one_time`  — pay in full, done.
   * `deposit`   — pay a deposit, save a card, final balance billed by invoice later.
   */
  mode: "one_time" | "deposit";
  name: string;
  priceLabel: string;
  priceHint: string;
  blurb: string;
  includes: string[];
  balance?: { headline: string; body: string };
}

export interface SiteConfig {
  company: {
    name: string;
    legalName: string;
    tagline: string;
    phone: string;
    phoneHref: string;
    email: string;
    address: string;
    license: string;
    foundedYear: number;
    hours: string;
    emergencyLine: string;
  };
  brand: { accent: string; accentSoft: string; ink: string };
  hero: {
    eyebrow: string;
    headline: string;
    subhead: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    stats: { value: string; label: string }[];
  };
  services: ServiceDef[];
  offerings: OfferingDef[];
  financing: { headline: string; body: string; points: string[] };
  serviceArea: {
    headline: string;
    body: string;
    radiusNote: string;
    areas: { city: string; note: string }[];
  };
  trust: {
    headline: string;
    badges: { label: string; note: string }[];
    reviews: {
      quote: string;
      name: string;
      location: string;
      rating: number;
      job: string;
    }[];
  };
  estimateForm: {
    headline: string;
    body: string;
    projectTypes: string[];
    urgencies: string[];
    roofAges: string[];
    consent: string;
  };
  faq: { q: string; a: string }[];
  footerNote: string;
}

/** An offering with its plan ID resolved from the environment at request time. */
export interface ResolvedOffering extends OfferingDef {
  planId: string | null;
}

export type WhopEnvironment = "production" | "sandbox";

/** Everything the browser is allowed to know. Serialized into the SSR'd HTML. */
export interface PublicConfig {
  /**
   * Which Whop environment the Payment Elements talk to. Sandbox moves no real
   * money, so a test checkout can be completed end to end.
   */
  environment: WhopEnvironment;
  site: SiteConfig;
  offerings: ResolvedOffering[];
  /** `biz_...`, needed by the Payments element group that renders BrandingElement. */
  companyId: string | null;
  origin: string;
  /** True when plan IDs are missing, so the UI can explain itself instead of failing blank. */
  setupIncomplete: boolean;
}

export interface EstimateSubmission {
  name: string;
  email: string;
  phone: string;
  address: string;
  projectType: string;
  urgency: string;
  roofAge: string;
  details: string;
  /** Populated by the client from the current URL so leads carry attribution. */
  referrer?: string;
  utm?: Record<string, string>;
}
