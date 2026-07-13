# Deploying smartkong.net — the standalone marketplace site

One codebase, two branded sites. The default build is the full **WANKONG**
creator platform; building with `VITE_SITE_MODE=market` re-skins the same app
as **SmartKong**, the standalone marketplace at `smartkong.net`. Both share
the same Supabase backend, user accounts, catalog, orders, and vendor system —
a product listed on either site is instantly on both.

## 1. Create the second Vercel project

1. In Vercel: **Add New → Project**, import the same `ICOFCUCAM/Wankong`
   repository again (a repo can back multiple Vercel projects).
2. Name it `smartkong` (or similar). Framework preset: **Vite** (auto-detected
   from `vercel.json`).
3. Do NOT change the build command or output directory — they're the same.

## 2. Environment variables

Copy every environment variable from the Wankong Vercel project, then adjust:

| Variable | Value for smartkong.net |
|---|---|
| `VITE_SITE_MODE` | `market` ← **this is the only new variable; it flips the branding** |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | same as Wankong (shared backend) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | same as Wankong |
| `VITE_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | same account; see §4 for the webhook |
| `NEXT_PUBLIC_APP_URL` and `VITE_APP_URL` | `https://smartkong.net` ← so PayPal redirects return to SmartKong |
| `PAYPAL_*`, `MPESA_*`, `RESEND_API_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`, `INTERNAL_API_KEY` | same as Wankong |
| `MPESA_CALLBACK_URL` | `https://smartkong.net/api/mpesa-callback` (or keep pointing at wankong.com — both hit the same database) |

## 3. Domain

1. In the new Vercel project: **Settings → Domains → add `smartkong.net`**
   (and `www.smartkong.net` redirecting to the apex).
2. At your registrar, point the domain at Vercel (A record `76.76.21.21` or
   the CNAME Vercel shows you).

## 4. Stripe webhook (one extra endpoint)

Stripe webhooks are per-URL. In the Stripe dashboard add a second endpoint:
`https://smartkong.net/api/stripe-webhook` with the same events
(`payment_intent.succeeded`, `payment_intent.payment_failed`,
`customer.subscription.*`, `invoice.payment_failed`), and put its signing
secret in the smartkong project's `STRIPE_WEBHOOK_SECRET`.
(Orders are in the shared database, so either endpoint fulfills them — but
each deployment verifies signatures with its own secret.)

## 5. Supabase auth redirects

In Supabase (project **Wankongreal**) → Authentication → URL Configuration,
add to **Redirect URLs**:

```
https://smartkong.net/**
https://www.smartkong.net/**
```

This lets logins/OAuth callbacks complete on the SmartKong domain. Accounts
are shared: a user who registered on wankong.com signs straight into
smartkong.net.

## 6. Vercel cron

`vercel.json` schedules `/api/refresh-trending` hourly. It will fire on both
projects against the same database — harmless (the function is idempotent),
but you can disable the cron on one project in Vercel → Settings → Cron Jobs
if you prefer a single trigger.

## What changes in market mode

`VITE_SITE_MODE=market` swaps in the **SmartKong "Meridian"** brand — an
editorial design system positioning SmartKong as *the world's shopping layer*,
not another store.

**Design language** (`src/market/brand.css`, scoped to `.sk-market`):

- One aurora gradient (`--sk-aurora`), an italic-serif accent word in every
  headline (`.sk-serif` + `.sk-aurora-text`), the horizon-arc eyebrow
  (`.sk-eyebrow`), giant outlined display type, film-grain dark bands, and
  scroll-reveal choreography.
- Motion primitives in `src/market/motion.tsx`: `Reveal`, `Magnetic`, `Tilt`,
  `Spotlight` (cursor glow on dark bands), `ScrollProgress` (top aurora bar),
  `ArcSeam`. All `prefers-reduced-motion` aware.

**Market-only pages/components** (rendered only when `IS_MARKET_SITE`):

- Landing (`SmartKongLanding`), catalog (`SmartKongHome`), product
  (`MarketProductPage`), AI solver, compare, wishlist, collection/kit,
  affiliate backend.
- Light SmartKong **cart** (`MarketCartPage`), **404** (`MarketNotFoundPage`),
  **About** (`MarketAboutPage`) — routed via `IS_MARKET_SITE` ternaries in
  `App.tsx`, leaving the WANKONG versions untouched.
- Global **⌘K command palette** (`CommandPalette`) mounted in `MarketLayout` —
  searches the catalog, jumps to any section, or hands a query to the AI.
- Auth screens and checkout show SmartKong logo/copy in market mode.

**Build-time rebrand** (`vite.config.ts`, `brandHtml` plugin): rewrites the
static `index.html` title/description/OG/theme-color and the PWA
`manifest.json` (name, shortcuts) for the SmartKong install — the WANKONG
build is left byte-for-byte unchanged.

- Nav: Categories · Deals · Compare · AI Assistant · Sell on SmartKong ·
  Track Order.
- Everything else (vendor dashboard, admin, library) is the same app and stays
  reachable.

## Local testing

```bash
VITE_SITE_MODE=market npm run dev     # SmartKong locally
npm run dev                           # Wankong locally
```
