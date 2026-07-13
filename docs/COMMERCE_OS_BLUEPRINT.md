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
| Fixed amount | ○ | add `commission_type`/`flat_cents` |
| Tiered rewards (volume breakpoints) | ○ | `commission_tiers` table |
| Lifetime / recurring commission (subscriptions) | ○ | recurring order linkage |
| Performance bonuses / spiffs | ○ | rules engine |
| Per-category / per-merchant overrides | ○ | rules table keyed by category/vendor |

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

## Recommended build order (phases)

- **Phase 1 — Partner Program MVP** ✅ *shipped* (profiles, approval, universal links, attribution, dashboard, admin queue).
- **Phase 2 — Commission & payout engine**: fixed/tiered/recurring/lifetime rules, refund reversal, payout wallet (reuse `creator_withdrawals`; PayPal/Wise/Stripe/crypto, multi-currency), automated monthly payouts, tax forms.
- **Phase 3 — Best-commission routing + AI**: route each product to the highest-value merchant, forecast earnings pre-publish, auto-swap on out-of-stock.
- **Phase 4 — Creator storefronts**: per-partner shoppable shop pages, curated multi-store collections, brand invitations.
- **Phase 5 — Fraud & attribution hardening**: dup-click/bot/VPN detection, S2S postbacks, cookie-less + cross-device.
- **Phase 6 — Coupons & cashback**: coupon vault, shopper cashback wallet, seasonal commission windows.
- **Phase 7 — Public API + connectors**: REST API with keys/scopes, webhooks, Zapier/Shopify/Woo.
- **Phase 8 — Partner CRM + org accounts + influencer matching**.

Each phase is independently shippable and builds on Phase 1's attribution spine.
