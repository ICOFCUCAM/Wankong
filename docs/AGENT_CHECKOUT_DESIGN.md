# Agentic Checkout Handshake — Design

**Status:** discovery live (`/api/agent-search`, `/api/agent-manifest`); checkout
shipped as a **gated MVP** (`/api/agent-checkout`, off until `AGENT_API_KEY` is set).
This doc records the design so the remaining phases are built deliberately.

## Goal

Let an external AI agent (ChatGPT, Gemini, a custom assistant) move a user from
"find me an X" to a **completed purchase** *through* SmartKong — the concrete
meaning of "the world's shopping layer" in an agent-driven web. Aligns with the
direction of OpenAI's **Agentic Commerce Protocol (ACP)** and Google's
**Universal Commerce Protocol (UCP)** without yet implementing their full
message formats.

## The core distinction: merchant-of-record vs handoff

SmartKong's catalog holds two kinds of items, and checkout differs fundamentally:

| Item type | Who is merchant-of-record | Agent checkout behavior |
|---|---|---|
| **First-party** (creator/vendor products SmartKong fulfills) | SmartKong | Create order → hosted Stripe checkout → SmartKong fulfills |
| **Affiliate / external** (Amazon, eBay, Temu…) | The external merchant | **Handoff** — return the merchant url; SmartKong never runs their checkout |

Trying to "check out" an Amazon item on the user's behalf would mean handling
another merchant's cart — exactly the last-click-hijack / fake-cart pattern the
brand principle forbids. The honest answer for external items is a labeled
handoff. This is already how `/api/agent-checkout` behaves.

## Handshake (three steps)

```
1. DISCOVER   agent → GET /api/agent-search?query=…&pref=…
              ← results[] with best_offer + per-merchant offers (value-ranked)

2. INTENT     agent → POST /api/agent-checkout { productId, quantity, email?, ref? }
              header x-agent-key: <AGENT_API_KEY>
              ← first-party:  { mode:"checkout", checkoutUrl, orderId, amount_cents, expiresAt }
              ← external:     { mode:"handoff",  url, merchant }

3. COMPLETE   user opens checkoutUrl (Stripe-hosted) and pays
              → Stripe webhook (payment_intent.succeeded, metadata.orderId)
                marks paid, fulfills, and attributes the partner (metadata.partner_ref)
```

No card data ever touches the agent or SmartKong's own servers — payment happens
on Stripe's hosted page. That is the safety spine of the MVP.

## What shipped (MVP)

- **`/api/agent-checkout`** — gated behind `AGENT_API_KEY` (returns
  `501 { status:"planned" }` until set, so it is off by default and no
  unauthenticated caller can mint orders/sessions). For first-party items it
  creates a pending `ecom_orders` + `ecom_order_items` row at the authoritative
  catalog price and opens a Stripe-hosted Checkout session whose
  `payment_intent.metadata.orderId` drives the existing fulfillment webhook.
  For affiliate items it returns a handoff.
- **Webhook attribution** — `payment_intent.succeeded` now credits the partner
  (`record_partner_conversion` / `record_conversion_by_promo`) when
  `metadata.partner_ref` is present, because agent orders have no client-side
  OrderConfirmation to do it.
- **Manifest** — `checkout` capability documents the gated contract.

## What is deliberately deferred

1. **Delegated payment (true one-shot buy).** ACP envisions the agent passing a
   payment credential (a scoped token / SharedPaymentToken) so the purchase
   completes without the user opening a page. Requires Stripe's agentic-payment
   primitives + a strict spend-authorization model (per-txn cap, user consent
   record, revocation). High trust bar — do only with explicit product sign-off.
2. **Native ACP/UCP message formats.** Today's endpoints are SmartKong-shaped
   (`smartkong.agent.v1`). When ACP/UCP stabilize, add adapter endpoints that
   speak their exact request/response schemas; keep the internal engine.
3. **Cross-merchant "buy the best one" for external items.** Routing already
   picks the best offer; completing an *external* purchase autonomously needs
   per-merchant checkout integrations (or their ACP endpoints) — large, per-
   merchant, and gated on those merchants exposing agent checkout.
4. **Order status / cancellation API.** An agent that buys should be able to
   poll status and request cancellation/refund. Add `GET /api/agent-order/:id`
   and a cancel intent once purchase volume justifies it.

## Security model

- **Auth:** shared `AGENT_API_KEY` header for the MVP (server-to-server). Move to
  per-agent keys + scopes (`search`, `checkout`) and rate limits before opening
  broadly.
- **Amount integrity:** the charge is built from the current catalog price on the
  server; the agent cannot set the price. (`ecom_order_items` +
  `authoritativeOrderTotal` already enforce this on the hosted-session amount.)
- **No autonomous spend in the MVP:** a human confirms payment on the Stripe
  page. Delegated payment (item 1 above) is the only path to true one-shot buy
  and is intentionally not enabled yet.
- **Idempotency:** partner attribution RPCs are idempotent on `order_id`; a
  re-delivered webhook does not double-credit.
- **Abuse:** gating + per-agent keys + rate limiting; pending orders with no
  paid session should be swept by a periodic job (future).

## Open questions for product

- Delegated-payment spend caps and the consent/authorization record — what does
  the user actually approve, and where is it stored?
- Returns/refunds initiated by an agent — allowed, and with what verification?
- Do we expose first-party inventory only, or also broker external checkout once
  merchants offer ACP endpoints?
