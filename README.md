# Roofing Website Template — built on Whop Websites

A production-ready marketing-and-commerce site for a US roofing company, built to
deploy on [Whop Websites](https://docs.whop.com/developer/websites/quickstart) and
run its money end-to-end on Whop: real plans, Whop Payment Elements at checkout,
the Leads API behind the estimate form, a card on file via a setup-mode checkout,
and the Invoices API for the final balance.

Re-skinning it for a different roofer is one config file and one bootstrap command.

---

## What it does

**The high-ticket flow this vertical actually needs — deposit → job → final invoice:**

| Step | What happens | Whop feature |
| --- | --- | --- |
| Homeowner asks for a quote | `/estimate` posts to `/api/leads` | **Leads API** (`POST /leads`) |
| Homeowner books an inspection or repair | Checkout for a one-time plan | **CheckoutElement** + **ExpressCheckoutElement** |
| Homeowner reserves a replacement | $500 deposit checkout | Same elements, `mode: "deposit"` plan |
| Card kept for the balance | `/card-on-file` mounts a `mode: "setup"` checkout configuration | **Setup intents** via **Checkout Configurations** |
| Job finishes | `/admin/billing` itemizes and bills the balance | **Invoices API** (`POST /invoices`) |
| Fulfilment | `setup_intent.succeeded`, `payment.succeeded`, `invoice.paid` | **Webhooks** |

**Site sections:** hero, services (repair · replacement · inspection · gutters),
service area, financing callout, trust badges and reviews, estimate form, FAQ,
contact footer. Server-rendered, responsive, and accessible.

**No custom card form anywhere.** Every field a buyer types lives inside a frame
served from `js.whop.cloud`. There is no Stripe, no PayPal, and no card number
that ever reaches this code — which is also why pay-over-time options (Klarna,
Afterpay, Splitit…) appear on their own for approved merchants.

---

## Whop features implemented

**Whop Websites** hosting and the `whop` CLI (`apps init` / `apps dev` /
`apps deploy`) for a live `*.whop.app` address; **Whop Payment Elements** —
`CheckoutElement` for the full surface, `ExpressCheckoutElement` for Apple Pay
and Google Pay, and the required `BrandingElement` mounted from a `Payments`
group alongside every payment surface, all themed through the elements
`appearance` API; **Plans API** for a one-time $149 inspection fee, a $500
project deposit, and a $895 flat-rate repair, created on the account by
`scripts/bootstrap-whop.ts` and referenced only by app secret; **Leads API** so
every estimate request lands on the account with the homeowner's details, roof
age, urgency, referrer and UTM parameters as lead metadata; **Checkout
Configurations in `mode: "setup"`** to put a card on file without charging it,
which is how Whop creates the setup intent; **Invoices API** to bill the final
balance either by charging that stored payment method
(`charge_automatically`) or by emailing a payable invoice (`send_invoice`),
with the deposit already paid carried as a negative line item; **webhooks**
(`setup_intent.succeeded`, `payment.succeeded`, `payment.failed`,
`invoice.paid`) with HMAC signature verification for fulfilment that survives a
closed tab; and the **Whop pixel** with custom `whop.track` events —
`estimate_requested` (deduplicated by the returned lead ID), `service_viewed`,
`deposit_started`, plus `checkout_viewed`, `card_on_file_started`, and explicit
`page_view` calls on client-side navigation — on top of the page views,
checkout views, and purchases whop.app tracks automatically.

---

## Deploy it

You need the [Whop CLI](https://docs.whop.com/developer/cli) and a Whop account.

```bash
# 0. Authenticate the CLI (once)
npm i -g @whop/cli
whop login                      # or: export WHOP_API_KEY=whop_xxx

# 1. Register the app and claim <route>.whop.app
whop apps init --app_type website --name "Ironclad Roofing" --route ironclad-roofing

#    `init` scaffolds a fresh project. To use THIS repo instead, keep your
#    generated whop.app.json and copy it in here:
#      cp ironclad-roofing/whop.app.json .
#    or link this directory to the app you just created:
#      whop apps deploy --app app_xxxxxxxx

# 2. Create the product and the three plans on your account
WHOP_API_KEY=whop_xxx npm run bootstrap
#    Prints every `whop apps secrets set …` line to run next.

# 3. Store the secrets it printed
whop apps secrets set WHOP_COMPANY_ID=biz_xxxxxxxx
whop apps secrets set WHOP_PRODUCT_ID=prod_xxxxxxxx
whop apps secrets set WHOP_PLAN_INSPECTION=plan_xxxxxxxx
whop apps secrets set WHOP_PLAN_REPAIR=plan_xxxxxxxx
whop apps secrets set WHOP_PLAN_DEPOSIT=plan_xxxxxxxx
whop apps secrets set ADMIN_PASSCODE=<pick one>

# 4. Ship it
npm install
whop apps deploy
```

`whop apps deploy` preflights the project for Cloudflare Workers, which is what
Whop hosting runs. This repo already satisfies it — `@cloudflare/vite-plugin`
with `viteEnvironment: { name: "ssr" }` in `vite.config.ts`, and a
`wrangler.jsonc` whose `main` points at `src/server/index.ts`. If you rename the
route, update `name` in `wrangler.jsonc` to match.

Your site is live at `https://<route>.whop.app`.

### Webhooks (recommended)

```bash
whop webhooks create --url https://<route>.whop.app/api/webhooks/whop
whop apps secrets set WHOP_WEBHOOK_SECRET=<the signing secret>
whop apps deploy
```

Without `WHOP_WEBHOOK_SECRET` the endpoint refuses every delivery rather than
trusting an unsigned payload — deliberate, since these events move money-adjacent
state.

### How the deployed site authenticates

There is **no API key on the server**. Whop hosting routes server-side `fetch`
calls through an outbound proxy that attaches the app's own key, and sets:

| Binding | Used for |
| --- | --- |
| `WHOP_API_ORIGIN` | The API origin whose outbound calls the platform signs |
| `WHOP_ACCOUNT_ID` | The `biz_` id of the account that owns the app |

`src/server/whop-api.ts` prefers those and sends no `Authorization` header, so
the key never reaches this code and cannot be logged or bundled. Off-platform —
`npm run dev`, the bootstrap script — it falls back to `api.whop.com` with an
explicit `WHOP_API_KEY`. `WHOP_COMPANY_ID` is therefore optional on a deployed
site; set it only to sell for a different account than the one owning the app.

### App permissions

The app's API key needs `lead:manage`, `member:email:read`, `member:basic:read`,
`access_pass:basic:read` (leads), `invoice:create` and `payment:basic:read`
(invoices), and checkout-configuration write access (card on file). Set them with
`whop apps permissions`.

---

## Develop locally

```bash
npm install
cp .env.example .env      # fill in the IDs bootstrap printed
whop apps dev             # injects WHOP_APP_ID, a short-lived WHOP_API_KEY, and your secrets
# or, without the CLI:
npm run dev
```

`vite-dev-server.ts` runs the real `src/server/index.ts` through Vite, so local
development exercises the same request path as production — same routing, same
SSR, same API handlers.

Two caveats when running outside whop.app:

- **The pixel is not there.** Whop injects it into every page whop.app serves;
  locally `window.whop` is undefined. `whop.track()` calls no-op, but every event
  is still recorded on `window.__WHOP_TRACK_LOG__` so you can verify the funnel
  from the console.
- **Payment Elements need `js.whop.cloud`.** If that origin is blocked, the
  checkout surfaces show a fallback with the phone number instead of an
  indefinite spinner. The marketing site is unaffected.

```bash
npm run typecheck    # tsc --noEmit
npm run build        # dist/client + dist/server + dist/whop-build.zip
```

---

## Re-skin it for another roofer

**Edit `site.config.ts`. That is the whole job.** Company name, phone, license,
brand colors, services, pricing, service area, reviews, FAQ, and the estimate
form's dropdowns all live there, and nothing under `src/` hard-codes a company
name, price, or city.

Then create that account's plans and point the secrets at them:

```bash
WHOP_API_KEY=whop_xxx npm run bootstrap      # reads prices out of site.config.ts
# set the secrets it prints, then:
whop apps deploy
```

Adding a fourth service is one entry in `services`. Making it purchasable is one
more in `offerings` plus its `planEnv` secret — no route, component, or handler
changes.

### Where things live

```
site.config.ts              ← the only file you edit to re-skin
scripts/bootstrap-whop.ts   ← creates the product + plans on an account
src/shared/types.ts         ← the config's shape, and the payload sent to the browser
src/server/
  index.ts                  ← worker entry: routing, CSP, robots/sitemap, API dispatch
  env.ts                    ← env bindings → the browser's PublicConfig
  render.tsx                ← SSR, meta tags, JSON-LD, theme variables
  whop-api.ts               ← the Whop REST client (pinned Api-Version-Date)
  routes/leads.ts           ← POST /api/leads          → Leads API
  routes/setup-checkout.ts  ← POST /api/setup-checkout  → setup-mode checkout config
  routes/invoices.ts        ← POST /api/invoices        → Invoices API
  routes/webhooks.ts        ← POST /api/webhooks/whop   → signed fulfilment
src/client/
  App.tsx                   ← routes + the WhopElements provider
  components/CheckoutPanel.tsx  ← every Payment Element mount
  components/EstimateForm.tsx   ← the lead form
  lib/track.ts              ← whop.track wrapper and the event names
  pages/                    ← home, service, book, estimate, card-on-file, thank-you, billing
```

### Routes

| Route | What it is |
| --- | --- |
| `/` | The marketing site |
| `/services/:slug` | Service detail — fires `service_viewed` |
| `/book/:offering` | Checkout — fires `deposit_started` or `checkout_viewed` |
| `/estimate` | Estimate form — fires `estimate_requested` on a created lead |
| `/card-on-file` | Setup-mode checkout — fires `card_on_file_started` |
| `/thank-you` | Post-checkout return URL |
| `/admin/billing` | Internal invoice console, gated by `ADMIN_PASSCODE` |
| `/api/*` | Leads, setup checkout, invoices, webhooks |

---

## Verifying the pixel events

Page views, checkout views, and purchases are automatic on whop.app. The custom
events are visible three ways:

1. **Browser console on the live site** — `window.__WHOP_TRACK_LOG__` lists every
   event this app fired, with its properties and timestamp.
2. **Network tab** — the pixel's requests to Whop as each event fires.
3. **Dashboard** — Websites and the pixel dashboard, about a minute behind.

`estimate_requested` passes the Whop lead ID as `event_id`, so a refresh or a
retry cannot double-count the conversion.

---

## Notes on the money flow

- **Prices are never asserted client-side.** Checkout is minted from a `plan_…`
  ID; the plan owns the amount. Nothing on the page can change what is charged.
- **`CheckoutElement` and `ExpressCheckoutElement` are alternatives** that share
  one checkout handle's entry slot, so `CheckoutPanel` gives each its own
  `<Checkout>` group — that is how you get wallets *and* the full surface on one
  page.
- **Fulfilment belongs on the webhook.** The buyer's tab can close before it ever
  reaches `/thank-you`.
- **The invoice's line items must total the plan price**, and negative lines are
  credits — which is exactly how the already-paid deposit comes off the balance.
