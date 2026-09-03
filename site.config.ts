/**
 * ============================================================================
 *  THE ONLY FILE YOU EDIT TO RE-SKIN THIS TEMPLATE FOR A NEW ROOFING COMPANY.
 * ============================================================================
 *
 *  Swap the company, services, pricing, service area, and reviews here.
 *  Nothing below this file is company-specific — no component, route, or
 *  server handler reads a hard-coded name, price, or phone number.
 *
 *  Plan IDs are NOT in this file. They live in environment/app secrets so the
 *  same source deploys against a different Whop account without a code change.
 *  `scripts/bootstrap-whop.ts` creates the plans and prints the secrets to set.
 */

import type { SiteConfig } from "./src/shared/types";

export const siteConfig: SiteConfig = {
  company: {
    name: "Ironclad Roofing",
    legalName: "Ironclad Roofing LLC",
    tagline: "Storm-ready roofs for Central Texas homes",
    phone: "(512) 555-0142",
    phoneHref: "tel:+15125550142",
    email: "estimates@ironcladroofing.example",
    address: "4120 Burnet Rd, Austin, TX 78756",
    license: "TX RCAT #12-08841",
    foundedYear: 2009,
    hours: "Mon–Sat, 7am–7pm CT",
    emergencyLine: "24/7 emergency tarping",
  },

  /** Drives the theme. Any two hex colors work — the CSS derives the rest. */
  brand: {
    accent: "#c2410c",
    accentSoft: "#ea580c",
    ink: "#0c1220",
  },

  hero: {
    eyebrow: "Licensed · Insured · Manufacturer-certified",
    headline: "A roof that survives the next Texas hail season.",
    subhead:
      "Repairs, full replacements, and certified inspections — with written quotes, financing on the spot, and a 10-year workmanship warranty.",
    primaryCta: { label: "Request a free estimate", href: "/estimate" },
    secondaryCta: { label: "Book a $149 inspection", href: "/book/inspection" },
    stats: [
      { value: "2,400+", label: "Roofs completed" },
      { value: "4.9★", label: "Across 380 reviews" },
      { value: "10 yr", label: "Workmanship warranty" },
    ],
  },

  /**
   * Each service is a marketing page. `offering` optionally links it to a
   * purchasable Whop plan (see `offerings` below). Services without an
   * offering route to the estimate form instead of checkout.
   */
  services: [
    {
      slug: "inspection",
      name: "Roof Inspection & Report",
      short: "Certified 40-point inspection with a photo report in 24 hours.",
      icon: "clipboard",
      offering: "inspection",
      description:
        "A certified inspector walks the roof, documents every penetration, flashing, and shingle course, and sends a photo report you can hand to an insurance adjuster. If you move forward with a replacement, the fee is credited to your project.",
      bullets: [
        "40-point structural and moisture check",
        "Drone imagery of every slope and valley",
        "Photo report delivered within 24 hours",
        "Insurance-claim-ready documentation",
        "Fee credited toward a full replacement",
      ],
    },
    {
      slug: "repair",
      name: "Roof Repair",
      short: "Leaks, blown-off shingles, and storm damage — usually same week.",
      icon: "wrench",
      offering: "repair",
      description:
        "Flat-rate repair for the failures that actually cause leaks: cracked boots, lifted flashing, blown-off shingles, and popped nails. One crew, one day, one price agreed before we start.",
      bullets: [
        "Flat rate — no hourly surprises",
        "Covers up to 100 sq ft of shingle replacement",
        "Pipe boot, flashing, and valley resealing",
        "2-year warranty on the repaired section",
        "Emergency tarping available 24/7",
      ],
    },
    {
      slug: "replacement",
      name: "Full Roof Replacement",
      short: "Complete tear-off and rebuild with a 10-year workmanship warranty.",
      icon: "home",
      offering: "deposit",
      description:
        "Full tear-off down to the decking, rotten board replacement, synthetic underlayment, ice-and-water shield in the valleys, and Class 4 impact-resistant shingles that lower most Texas homeowners' premiums.",
      bullets: [
        "Complete tear-off and deck inspection",
        "Class 4 impact-resistant shingles",
        "Synthetic underlayment and valley ice-and-water shield",
        "Manufacturer material warranty up to 50 years",
        "10-year workmanship warranty from us",
      ],
    },
    {
      slug: "gutters",
      name: "Gutters & Drainage",
      short: "Seamless gutter runs and downspouts sized to your roof pitch.",
      icon: "droplet",
      description:
        "Seamless aluminum gutters formed on site, hung on hidden hangers, and sized to the actual water volume your roof sheds. Quoted with any replacement or on its own.",
      bullets: [
        "Seamless runs formed on your driveway",
        "Hidden hangers every 24 inches",
        "Leaf guards available",
        "Downspouts routed away from the foundation",
      ],
    },
  ],

  /**
   * Purchasable plans. `planEnv` names the environment variable / app secret
   * holding the `plan_...` ID, so pricing moves between accounts without a
   * code change. `mode: "deposit"` turns on the card-on-file step and the
   * final-balance invoice flow.
   */
  offerings: [
    {
      key: "inspection",
      planEnv: "WHOP_PLAN_INSPECTION",
      mode: "one_time",
      name: "Certified Roof Inspection",
      priceLabel: "$149",
      priceHint: "one-time · credited toward a replacement",
      blurb:
        "A certified inspector, drone imagery of every slope, and a photo report in your inbox within 24 hours.",
      includes: [
        "40-point inspection",
        "Drone imagery",
        "Insurance-ready photo report",
        "$149 credited toward a replacement",
      ],
    },
    {
      key: "repair",
      planEnv: "WHOP_PLAN_REPAIR",
      mode: "one_time",
      name: "Flat-Rate Roof Repair",
      priceLabel: "$895",
      priceHint: "flat rate · up to 100 sq ft",
      blurb:
        "One crew, one day, one price. Covers the leak repairs that make up most of the calls we take.",
      includes: [
        "Up to 100 sq ft of shingle replacement",
        "Pipe boot and flashing resealing",
        "Debris haul-away",
        "2-year warranty on the repair",
      ],
    },
    {
      key: "deposit",
      planEnv: "WHOP_PLAN_DEPOSIT",
      mode: "deposit",
      name: "Roof Replacement Deposit",
      priceLabel: "$500",
      priceHint: "deposit · applied to your project total",
      blurb:
        "Locks your material order and your place on the schedule. Applied in full to the project total; refundable up to 72 hours before the crew arrives.",
      includes: [
        "Locks current material pricing",
        "Reserves your install date",
        "Applied in full to the project total",
        "Refundable up to 72 hours before install",
      ],
      /** Copy for the card-on-file + final-invoice flow shown after the deposit. */
      balance: {
        headline: "Your final balance, billed the day we finish",
        body:
          "We keep a card on file so the balance clears the day the job passes final inspection — no chasing checks, no lien paperwork. You can also ask for an emailed invoice instead and pay it on your own terms.",
      },
    },
  ],

  financing: {
    headline: "Financing decided at checkout, not in a back office",
    body:
      "Checkout runs on Whop, so eligible homeowners see pay-over-time options — Klarna, Afterpay, Splitit and others — surfaced automatically next to card and wallet payments. No separate application, no second credit pull from us, and no rate we mark up.",
    points: [
      "Pay-over-time options appear automatically for approved merchants",
      "Apple Pay and Google Pay in one press",
      "Your card is never touched by our servers",
      "Deposit now, balance billed on completion",
    ],
  },

  serviceArea: {
    headline: "Where we work",
    body:
      "Crews dispatch from Austin and Round Rock. Anything inside the ring below is a same-week estimate; outside it, call us and we will tell you honestly whether we can serve you well.",
    radiusNote: "Free estimates within 45 miles of Austin",
    areas: [
      { city: "Austin", note: "HQ · same-day emergency tarping" },
      { city: "Round Rock", note: "Crew yard · same-week installs" },
      { city: "Cedar Park", note: "Same-week installs" },
      { city: "Georgetown", note: "Same-week installs" },
      { city: "Pflugerville", note: "Same-week installs" },
      { city: "Leander", note: "Same-week installs" },
      { city: "Kyle & Buda", note: "Weekly routes" },
      { city: "San Marcos", note: "Weekly routes" },
      { city: "Lakeway & Bee Cave", note: "Weekly routes" },
    ],
  },

  trust: {
    headline: "The paperwork homeowners actually ask for",
    badges: [
      { label: "GAF Master Elite", note: "Top 2% of US roofers" },
      { label: "Owens Corning Preferred", note: "Certified installer" },
      { label: "$2M liability", note: "Certificate on request" },
      { label: "Workers' comp", note: "Every crew member covered" },
      { label: "BBB A+", note: "Accredited since 2012" },
      { label: "TX RCAT licensed", note: "License #12-08841" },
    ],
    reviews: [
      {
        quote:
          "Hail took out half the ridge. They had a tarp on it the same night and the full replacement done in three days. The photo report got my claim approved without an argument.",
        name: "Dana R.",
        location: "Round Rock, TX",
        rating: 5,
        job: "Full replacement · insurance claim",
      },
      {
        quote:
          "I got four quotes. Ironclad was the only one that showed me photos of the actual rot instead of just telling me about it. Price landed exactly where the estimate said.",
        name: "Marcus T.",
        location: "Cedar Park, TX",
        rating: 5,
        job: "Full replacement · 28 squares",
      },
      {
        quote:
          "Paid the deposit from my phone on a Sunday, picked the financing option right there, and they were on the roof Tuesday. The final invoice hit my card the day they finished.",
        name: "Priya S.",
        location: "Austin, TX",
        rating: 5,
        job: "Replacement · financed",
      },
      {
        quote:
          "Small leak over the garage. They quoted the flat rate, fixed it in an afternoon, and did not try to sell me a new roof I did not need.",
        name: "Ellis W.",
        location: "Georgetown, TX",
        rating: 5,
        job: "Flat-rate repair",
      },
    ],
  },

  /** Fields on the estimate form. Everything here lands on the Whop lead. */
  estimateForm: {
    headline: "Request a free estimate",
    body:
      "Tell us what is going on up there. We reply within one business day with a written quote or a time to come look.",
    projectTypes: [
      "Leak or storm damage",
      "Full replacement",
      "Inspection / insurance claim",
      "Gutters & drainage",
      "Not sure yet",
    ],
    urgencies: [
      "Emergency — water coming in now",
      "This week",
      "This month",
      "Just planning ahead",
    ],
    roofAges: ["0–5 years", "6–12 years", "13–20 years", "20+ years", "No idea"],
    consent:
      "By submitting you agree we may contact you about your project. We do not sell or share your details.",
  },

  faq: [
    {
      q: "Do you work with insurance claims?",
      a: "Constantly. The inspection report is built to be handed straight to an adjuster, and we will meet them on the roof at no charge if you ask us to.",
    },
    {
      q: "How does the deposit work?",
      a: "The deposit locks your material pricing and your install date, and it is applied in full to your project total. It is refundable up to 72 hours before the crew arrives.",
    },
    {
      q: "When do I pay the balance?",
      a: "The day the job passes final inspection. We keep a card on file so it clears automatically, or we email you an invoice if you would rather pay that way.",
    },
    {
      q: "Is financing a separate application?",
      a: "No. Pay-over-time options appear right in checkout alongside card and wallet payments for homeowners who qualify.",
    },
    {
      q: "What does the workmanship warranty cover?",
      a: "Ten years on anything that fails because of how we installed it. Materials carry their own manufacturer warranty, up to 50 years on the Class 4 shingles.",
    },
  ],

  footerNote:
    "Ironclad Roofing is a demonstration template built on Whop Websites. Company details, pricing, and reviews are illustrative.",
};

export default siteConfig;
