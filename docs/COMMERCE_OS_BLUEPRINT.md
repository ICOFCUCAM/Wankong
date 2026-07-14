# SmartKong — Commerce OS Capability Blueprint

> The goal isn't to catalog 5,000 platforms — feature sets converge. This is the
> **canonical union** of capabilities across the industries SmartKong sits
> between, deduplicated into a build spec and mapped to what SmartKong has today.
>
> Status legend: **✅ built** · **◐ partial** · **○ missing**
> "Where" points at the code/table that owns it (or would).

SmartKong is not an affiliate network — it's the layer at the intersection of:
Affiliate/PRM · Affiliate networks · Creator commerce · Retailer programs ·
SaaS referrals · Coupon/cashback · Price comparison · Shopping search ·
Influencer marketplaces · Checkout · Payments · Dropshipping/retail APIs ·
Ad networks · Partner CRM.

The differentiator that no incumbent has: **one universal catalog** (every store,
one search) already exists in SmartKong, so every capability below can operate
*across all merchants at once* instead of one program at a time.

---

## 1. Partner / Affiliate management (Impact, PartnerStack, Refersion, Everflow)

| Capability | Status | Where |
|---|---|---|
| Affiliate signup + approval workflow | ✅ | `affiliate_partners`, `become_affiliate`, `set_partner_status` |
| Partner profiles + referral code | ✅ | `affiliate_partners.code` |
| Per-partner commission rate | ✅ | `affiliate_partners.default_commission_bps` |
| Personal tracked links for ANY product | ✅ | `/r/:code`, `record_partner_click` |
| Click → conversion attribution (30-day) | ✅ | `partner_clicks`, `partner_conversions`, `record_partner_conversion` |
| Partner dashboard (clicks/EPC/earnings) | ✅ | `MarketPartnerPage`, `my_partner_stats` |
| Admin approval queue | ✅ | `MarketAffiliateAdminPage` PartnersPanel, `list_partners` |
| KYC / tax forms (W-9/W-8BEN) | ○ | needs `partner_kyc` table + upload |
| Team / organization accounts (sub-affiliates) | ○ | needs `partner_orgs` + membership |
| Built-in CRM (recruit, message, segment partners) | ○ | needs inbox + campaigns |
| Brand invitations (invite creators to promote) | ○ | needs invite flow |
| Coupon codes tied to a partner | ○ | needs `partner_coupons` + checkout hook |

## 2. Link & asset management (CJ deep-links, Skimlinks)

| Capability | Status | Where |
|---|---|---|
| Deep links into 30+ networks | ✅ | `buildTrackedLink`, `affiliateNetworks` registry |
| Universal per-partner link | ✅ | `/r/:code?to=` |
| Short URLs | ◐ | code is short; no vanity/branded domains |
| QR codes | ○ | generate from link (client lib) |
| Automatic link (auto-affiliate any outbound URL, Skimlinks-style) | ○ | rewrite outbound links to tracked ones |
| Banner / creative library | ○ | needs `marketing_assets` bucket |
| Product feeds for partners (CSV/JSON/XML export) | ◐ | inbound feeds exist; no partner-facing export |

## 3. Commission rules (Rewardful, FirstPromoter, TUNE)

| Capability | Status | Where |
|---|---|---|
| Percentage commission | ✅ | `default_commission_bps` |
| Fixed amount | ✅ | `commission_type='flat'` + `flat_cents` |
| Tiered rewards (volume breakpoints) | ✅ | `commission_tiers` + `partner_rate()` |
| Per-category rates (beauty 20% vs GPU 3%) | ✅ | `category_commission`, resolved per line-item by `commission_for_order()` |
| Recurring commission (subscriptions) | ✅ | `event_type='recurring'` + `record_recurring_commission()` — mechanism ready, wire to a renewal source |
| Lead / CPA (insurance/finance) | ✅ | `event_type='lead'` + `lead_bounties` + `record_partner_lead()` |
| Performance bonuses / spiffs | ○ | rules engine (future) |
| Per-merchant overrides | ◐ | category done; per-vendor is the next axis |

## 4. Tracking & attribution (Everflow, TUNE)

| Capability | Status | Where |
|---|---|---|
| Click tracking | ✅ | `partner_clicks` |
| Order / conversion tracking | ✅ | `partner_conversions` (order-confirmation) |
| Product engagement events | ✅ | `track_product_event` |
| Attribution window | ◐ | 30-day cookie; not configurable per program |
| Cross-device tracking | ○ | needs logged-in linking / fingerprint |
| Server-to-server (S2S) postbacks | ○ | webhook receiver + partner postback URLs |
| Cookie-less tracking | ○ | first-party + server attribution |
| Multi-touch attribution | ○ | attribution model on click chain |

## 5. Analytics (all platforms)

| Capability | Status | Where |
|---|---|---|
| Revenue / earnings | ✅ | `my_partner_stats`, affiliate commissions |
| EPC (earnings per click) | ✅ | dashboard |
| Conversions | ✅ | dashboard |
| Top affiliates / best products | ◐ | admin most-clicked; no full leaderboard |
| Conversion rate, ROI | ○ | derive from clicks/orders |
| Geographic / device reports | ○ | capture geo+UA on click (columns exist, unused) |
| Cohort / time-series charts | ○ | recharts over `partner_clicks` |

## 6. Payments & payouts (Wise, Stripe, PayPal, crypto)

| Capability | Status | Where |
|---|---|---|
| Order payments (Stripe/PayPal/M-Pesa) | ✅ | `api/*payment*`, `ecom_orders` |
| Affiliate payout wallet | ○ | reuse `creator_withdrawals` (migration 020) |
| PayPal / Wise / bank / Stripe payouts | ○ | payout provider adapters |
| Crypto payouts | ○ | wallet address + provider |
| Multi-currency balances | ○ | `partner_balances` per currency |
| Automated monthly payouts | ○ | cron over approved conversions |
| Tax forms + invoice generation | ○ | `partner_kyc`, invoice PDF |

## 7. Fraud prevention (Everflow, Affise)

| Capability | Status | Where |
|---|---|---|
| Self-referral block | ✅ | `record_partner_conversion` (buyer ≠ partner) |
| Order-level dedupe | ✅ | `partner_conversions.order_id` unique |
| Duplicate-click throttling | ○ | ip_hash + window (column exists) |
| Bot / VPN detection | ○ | scoring on click |
| Fake-order / refund handling | ○ | reverse conversion on refund webhook |

## 8. Marketing assets & campaigns (Impact)

| Capability | Status | Where |
|---|---|---|
| Coupon campaigns | ○ | `coupons` + checkout redemption |
| Seasonal promotions / boosted commission windows | ○ | schedule on commission rules |
| Email templates / newsletters to partners | ○ | CRM |
| Videos / logos / banner packs | ○ | asset library |

## 9. Public APIs & integrations (TUNE API-first, Zapier)

| Capability | Status | Where |
|---|---|---|
| Internal admin API | ◐ | `api/affiliate-admin.ts` |
| Public REST API (keys/scopes) | ○ | `api/public/*` + `api_keys` table |
| Webhooks (conversion, payout, status) | ◐ | payment webhooks only |
| SDKs / Zapier / Shopify / Woo / Magento | ○ | connector apps |

---

## The intersecting industries — what to absorb from each

| Industry | Absorb into SmartKong | Status |
|---|---|---|
| **Affiliate networks** (CJ, Awin, Rakuten, ShareASale, FlexOffers, Admitad, Sovrn) | Multi-network catalog ingestion + deep-links | ✅ adapters + registry |
| **Creator commerce** (LTK, ShopMy, Howl, Mavely) | Creator storefronts, product collections, auto-links | ◐ Collections/kits exist; no per-creator shop |
| **Retailer programs** (Amazon, Walmart, eBay, AliExpress, Temu, Best Buy) | Direct program adapters + best-commission routing | ◐ Amazon/eBay/CJ/Rakuten; routing missing |
| **SaaS referrals** (Rewardful, FirstPromoter, Tolt) | Recurring/lifetime commission model | ○ |
| **Coupon & cashback** (Honey, RetailMeNot, TopCashback, Rakuten Rewards) | Coupon vault, cashback wallet for shoppers | ○ |
| **Price comparison** (Google Shopping, Idealo, PriceRunner, Keepa, CamelCamelCamel) | Cross-store price compare + price history | ✅ StorePriceCompare + price_history |
| **Shopping search** (Google/Microsoft Shopping, Shopzilla) | Universal AI search across stores | ✅ AI solver + catalog |
| **Influencer marketplaces** (Aspire, GRIN, Upfluence, Modash) | Brand↔creator matching + campaign briefs | ○ |
| **Checkout platforms** (Bolt, Fast-style) | One cart across stores, one checkout | ✅ MarketCart + checkout |
| **Payments** (Stripe, PayPal, Wise, M-Pesa) | Multi-rail pay-in + pay-out | ◐ pay-in ✅; pay-out ○ |
| **Dropshipping / retail APIs** (Spocket, CJ Dropshipping) | Auto-fulfilment routing for sellers | ○ |
| **Product search engines** | Structured product graph + attributes | ◐ catalog |
| **Ad networks** | Sponsored placements / promoted products | ○ |
| **Partner CRM** (Crossbeam, Kiflo, Impartner) | Recruit / segment / message partners | ○ |

---

## SmartKong's unique layer (only possible with the universal catalog)

1. **One affiliate account for every marketplace** — ✅ foundation (central network accounts + partner links).
2. **Universal product search across thousands of stores** — ✅.
3. **Best-commission routing** — ○ pick the merchant with highest commission×conversion for a given product.
4. **Commission forecasting before publishing a link** — ○ show expected EPC/earnings from history.
5. **AI merchant-conversion prediction** — ○.
6. **Automatic link replacement on out-of-stock** — ○ re-point a partner link to the next-best merchant.
7. **Multi-store cart with commission preservation** — ◐ cart ✅; commission carry-through ○.
8. **AI-generated storefronts / review & comparison pages** — ◐ collections; AI pages ○.
9. **Price-drop alerts for affiliates** — ◐ shopper alerts exist; partner-facing ○.
10. **Global payout wallet (multi-currency + crypto)** — ○.
11. **Team / org affiliate management** — ○.
12. **Public API for third-party apps** — ○.

---

## Frontier capabilities (2024–2026 research sweep)

Verified via a deep-research pass (25 sources, 3-vote adversarial verification,
18 claims confirmed / 7 refuted). These are **beyond** the canonical set above —
the current edge of the category, mostly absent from standard affiliate
blueprints. Difficulty is for SmartKong specifically.

| # | Capability | Pioneer(s) | Why it matters | Build |
|---|---|---|---|---|
| F1 | **Agentic partner ops** — autonomous recruit/qualify/onboard + audit-inactive-partners, and a task-executing copilot (not just Q&A) | impact.com Recruitment Agent + Ask Impact (beta) | Turns partner CRM from manual to autonomous; SmartKong already has the AI + partner data | ◐ Med — LLM over `affiliate_partners`/stats |
| F2 | **Own-your-AI data access** — machine-readable OpenAPI + prompt "recipes" so brands point *their* LLM at raw attribution data via chat | Everflow OpenAPI + AI Playbook | Every partner automates their own analytics; huge differentiation for an AI-first layer | ◐ Med — publish OpenAPI + recipe library |
| F3 | **Zero-click / journey-reconstruction attribution** — credit partner influence even with no trackable click | Partnerize VantagePoint (Konnecto) | The "hidden half" of affiliate revenue; SmartKong's unified catalog + logged-in shoppers is a unique first-party angle | ● Hard — modeling + first-party graph |
| F4 | **Persistent creator storefronts** — always-on curated shop destinations w/ attribution (vs. links that fragment) | impact.com Storefronts (GA), Fanatics | Category-defining; the durable form of creator commerce | ◐ Med — per-partner shop page over catalog |
| F5 | **Video-first, social, location-aware discovery** — feed of creator video, social graph, creator↔shopper chat, no product-tag requirement | LTK app redesign | Discovery is becoming social entertainment, not a catalog | ● Hard — social + video product |
| F6 | **Brand→creator campaign distribution** — push launches/promo windows to your creator network with gifting, flat-rate, custom codes | Howl Portfolios | Activates partners at scale without manual research | ◐ Med — campaign push over partner CRM |
| F7 | **In-platform social amplification** — turn creator content into paid ads natively; verified creator discovery via Instagram Creator Marketplace | impact.com (June 2026) | Closes the loop from organic → paid; first-party creator data | ● Hard — ad-platform integrations |
| F8 | **Single-use auto-applying promo codes** — unique code auto-applies at checkout, cutting attribution leakage & friction | impact.com (roadmap) | Solves the coupon-leakage problem; concrete and high-ROI | ✅ Easy — code table + checkout hook |
| F9 | **Compliance-in-payout** — W-9/W-8, TIN validation, 1099/1042-S filing, OFAC/AML/PEP screening, VAT/GST/DAC7 at point of payment | Lumanu, TaxBandits, Gigapay | Legally required at scale; **commoditized via API — integrate, don't build** | ◐ Med — vendor API in payout flow |

**On-demand payout** ("Anytime Withdrawal," instant PayPal/Venmo) is a lighter
F9-adjacent win. Note the **OBBBA (July 2025)** raised US 1099-NEC/MISC reporting
thresholds — the payout engine must track this.

### Verified NOT real — do not build on these
The sweep specifically **refuted** (majority-refute vote) three widely-repeated
claims — treat as marketing, not fact:
- Howl "Superlinks" real-time issuance + **dynamic sales-impact compensation** (0-3)
- Partnerize **VPFCS fractional-commission standard** with AAM certification (1-2)
- Lumanu **"merchant of record" ERP payout** consolidation model (0-3)

### Evidence caveats
Several flagship features are **announced, not proven GA**: impact.com's
Recruitment Agent is closed beta; Single-Use Promo Codes & Venmo withdrawal are
roadmap. Five findings lean on impact.com's June-2026 iPX release (widely
syndicated, single vendor). Traction metrics (Howl's $1.1B, Everflow's "<10 min")
are self-reported. CJ/Rakuten/Awin/Skimlinks/Honey surfaced no *verified* novel
capability this round — an evidence gap, not proof they lack innovation
(cashback/coupon + browser-extension checkout-layer attribution are the obvious
next research target, and directly adjacent to SmartKong).

## Gap sweep — cashback / coupon / price-comparison / checkout-layer (2024–2026)

Second research pass (27 sources, 23 confirmed / 2 refuted) covering the segment
the first sweep missed. This one changed the strategy, not just the feature list.

| # | Capability / insight | Source | Why it matters | Build |
|---|---|---|---|---|
| F10 | **Cashback wallet lifecycle** — Pending → Confirmed → Payable, where *confirmed* only happens after the retailer's return window passes and the network invoices; deliberate 4–6 week delay rules out returns; per-txn "estimated payable speed" | TopCashback, Rakuten, cashback-site norm | The correct settlement model for shopper cashback — and it maps 1:1 onto SmartKong's `partner_conversions` (pending/approved/paid). Adopt the return-window gate. | ◐ Med |
| F11 | **Ethical checkout attribution** — the Honey/MegaLag scandal: browser extensions overwrote the *creator's* affiliate link at checkout (last-click hijack, "cookie stuffing") even with no discount; Google's Mar-2025 Chrome policy now bans claiming commission without giving a discount; active class action vs Honey/Rakuten/Capital One; Honey lost ~3M/20M users | MegaLag, 9to5Google, Seeger Weiss | **SmartKong already does this right** — the partner program attributes via the creator's *own* code/link and never overrides it. Make "we never hijack your commission" an explicit brand + compliance guarantee. | ✅ (validate + market) |
| F12 | **Agentic-commerce protocols** — OpenAI **Agentic Commerce Protocol** (ACP, open-sourced w/ Stripe, powers ChatGPT Instant Checkout) and Google **Universal Commerce Protocol** (UCP, keeps merchant-of-record, native+embedded checkout) | OpenAI (Sep 2025), Google I/O (May 2026) | Category-defining: commerce is standardizing agent↔merchant checkout. "The world's shopping layer" must be **in the agent graph** — consume/expose ACP/UCP so AI agents can transact through SmartKong. | ● Hard |
| F13 | **Keepa-style price pipeline** — 36 packed time-series per product (Amazon/marketplace/BuyBox/eBay/list, plus rank/rating/coupon/promo), minute-resolution, BuyBox *seller* attribution, coupon history; SP-API gives only current price so you must crawl | Keepa API | Upgrades SmartKong's `price_history` from a single series to a rich multi-series graph (incl. coupon + who-had-the-buybox), enabling real price prediction. | ◐ Med |
| F14 | **Universal cross-merchant cart, enriched** — Google Universal Cart persists across surfaces, validates multi-retailer builds (e.g. PC parts compatibility), and bakes price-tracking + in-stock + deal alerts *into the cart* | Google Universal Cart | Validates SmartKong's multi-store cart; the additions to steal are in-cart price/stock/deal alerts and cross-item compatibility checks. | ◐ Med |
| F15 | **In-conversation / agent checkout** — buy inside the AI chat (ChatGPT Instant Checkout; Etsy + 1M Shopify merchants), merchant stays merchant-of-record | OpenAI | SmartKong's AI assistant should *complete* purchases, not just recommend — closes discovery→checkout inside one AI surface. | ● Hard |
| F16 | **Merchant-funded shopper cashback** — cashback sites earn the retailer's affiliate commission and *share a slice with the shopper* after confirmation | cashback-site model | Turns SmartKong's (hidden) inbound affiliate commission into a **visible shopper reward** — a growth loop, and the honest inverse of the Honey model. | ◐ Med |

### Verified NOT real (gap sweep) — do not assert
- ChatGPT Instant Checkout is **merchant-funded, doesn't change prices, keeps results unbiased** — **refuted (0-3)**; treat as OpenAI marketing, not verified fact.
- Google agentic checkout **auto-completes the purchase when price drops within budget** (buy-for-me) — **refuted (0-3)**; it is not fully autonomous auto-buy.

### Method note
This sweep's automated synthesis step returned a placeholder; findings above were
reconstructed from the verified per-claim journal (23 confirmed / 2 refuted, 3-vote).

## Recommended build order (phases)

- **Phase 1 — Partner Program MVP** ✅ *shipped* (profiles, approval, universal links, attribution, dashboard, admin queue).
- **Phase 2 — Commission & payout engine**: fixed/tiered/recurring/lifetime rules, refund reversal, payout wallet (reuse `creator_withdrawals`; PayPal/Wise/Stripe/crypto, multi-currency), automated monthly payouts + on-demand withdrawal. **Integrate F9 compliance-in-payout via a vendor API** (tax forms, TIN, 1099/DAC7, OFAC/AML) rather than building it.
- **Phase 3 — Best-commission routing + AI**: route each product to the highest-value merchant, forecast earnings pre-publish, auto-swap on out-of-stock. **Fold in F1 agentic partner ops** (recruit/audit agent, task copilot over partner data) and **F2 own-your-AI data access** (OpenAPI + prompt recipes) — both play to SmartKong's AI-first strength.
- **Phase 4 — Creator storefronts** *(bumped — research confirms F4 is category-defining)*: persistent per-partner shoppable shop pages over the unified catalog, curated multi-store collections, brand invitations, **F6 brand→creator campaign distribution**.
- **Phase 5 — Fraud & attribution hardening**: dup-click/bot/VPN detection, S2S postbacks, cookie-less + cross-device, and a first exploration of **F3 zero-click / journey-reconstruction attribution** (SmartKong's logged-in + unified-catalog first-party graph is a real edge).
- **Phase 6 — Coupons & cashback**: coupon vault, **F8 single-use auto-applying promo codes** (done), **F16 merchant-funded shopper cashback** with the **F10 Pending→Confirmed→Payable lifecycle** (confirm only after the retailer return window; reuse `partner_conversions` states), seasonal commission windows.
- **Phase 7 — Public API + connectors**: REST API with keys/scopes, webhooks, Zapier/Shopify/Woo.
- **Phase 8 — Social & influencer layer**: partner CRM + org accounts, influencer matching, **F5 video-first social discovery** and **F7 in-platform social amplification** (heaviest lifts, last).
- **Phase 9 — Agentic-commerce protocols (north star)**: **F12** consume/expose **ACP (OpenAI/Stripe)** and **UCP (Google)** so AI agents transact *through* SmartKong; **F15** complete purchases inside SmartKong's AI assistant. This is what makes SmartKong "the shopping layer" in an agent-driven web — highest ceiling, do once the partner economy is real.
- **Cross-cutting: enrich price intelligence (F13)** — upgrade `price_history` to Keepa-style multi-series (incl. coupon + buybox) whenever Phase 3 routing or Phase 6 cashback needs better price signals.

**Brand + compliance principle (F11):** SmartKong attributes via the creator's
*own* code/link and **never overwrites another party's affiliate link** (the Honey
anti-pattern, now banned by Chrome policy and under class action). Keep it that
way and market it — "we never steal your commission."

Each phase is independently shippable and builds on Phase 1's attribution spine.
Quick wins already pulled forward: **F8 single-use promo codes**, **on-demand
withdrawal**, **commission forecasting (F-fore)**.
