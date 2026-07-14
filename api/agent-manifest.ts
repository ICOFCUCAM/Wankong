import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── SmartKong Agent Commerce API — capability manifest ──────────────────────
//
// A machine-readable descriptor an external AI agent can fetch to learn how to
// shop through SmartKong. Think of it as a lightweight tool/OpenAPI descriptor
// for the agent graph — the discovery document for Phase 9 (agentic commerce).
//
// GET /api/agent-manifest
//
// It advertises the discovery + routing capabilities that exist today and is
// intentionally shaped to align with the direction of OpenAI's Agentic
// Commerce Protocol (ACP) and Google's Universal Commerce Protocol (UCP); the
// checkout handshake is on the roadmap, not yet live, and is marked as such.
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const siteBase = (process.env.SITE_URL || 'https://smartkong.net').replace(/\/$/, '');

  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.json({
    protocol: 'smartkong.agent.v1',
    name: 'SmartKong',
    summary: "The world's shopping layer — query products across every merchant, routed to the best-value offer by SmartKong's Commerce Score.",
    vision: 'A single commerce surface AI agents can shop through, on behalf of their users.',
    aligns_with: {
      note: 'Shaped to align with emerging agentic-commerce standards; full checkout handshake is on the roadmap.',
      standards: ['OpenAI Agentic Commerce Protocol (ACP)', 'Google Universal Commerce Protocol (UCP)'],
    },
    principles: [
      'Recommendations maximize customer value (price, delivery, reputation, returns), not merchant revenue.',
      'SmartKong never overwrites another party\'s affiliate link (no last-click hijack).',
      'Commission and internal economics are never exposed to agents or shoppers.',
    ],
    capabilities: {
      search: {
        description: 'Natural-language or keyword product search across the unified catalog, returning offers routed by Commerce Score.',
        method: 'GET|POST',
        path: '/api/agent-search',
        parameters: {
          query: { type: 'string', required: true, description: 'What the user is looking for (e.g. "rtx 5090", "noise cancelling headphones under $300").' },
          pref: { type: 'string', required: false, enum: ['balanced', 'cheapest', 'fastest', 'trusted'], default: 'balanced', description: 'Which dimension of value to optimize the routing for.' },
          limit: { type: 'integer', required: false, default: 8, minimum: 1, maximum: 20 },
        },
        returns: 'results[] with price, offers[] (per-merchant, value-ranked), best_offer and routing summary.',
        auth: { header: 'x-api-key', value: '<optional>', note: 'Public free allowance without a key; an API key unlocks a higher metered tier (x-api-tier / x-api-remaining response headers).' },
      },
      insights: {
        description: 'Privacy-preserving aggregated market analytics for a category (no PII): product count, price bands, top vendors, trending titles.',
        method: 'RPC',
        path: 'rpc/market_insights',
        parameters: { p_category: { type: 'string', required: false, description: 'Category to scope; omit for all.' } },
        note: 'Positioned as a merchant/data-insights product; currently open, will move behind merchant plans.',
      },
      route_offers: {
        description: 'Given a specific product (UPC or title), rank every merchant offer by Commerce Score for a chosen preference.',
        method: 'GET|POST',
        path: '/api/route-offers',
        parameters: {
          group: { type: 'string', required: true, description: 'Product UPC, or title, identifying the item.' },
          pref: { type: 'string', required: false, enum: ['balanced', 'cheapest', 'fastest', 'trusted'], default: 'balanced' },
        },
        returns: 'pick (recommended offer) and offers[] ordered best-first.',
      },
      checkout: {
        description: 'Turn a routed offer into a ready-to-pay checkout on the user\'s behalf. First-party items return a hosted Stripe checkout url; external-merchant items return a handoff url (SmartKong never handles their checkout).',
        method: 'POST',
        path: '/api/agent-checkout',
        status: 'gated',
        note: 'Enabled only when the operator sets AGENT_API_KEY; returns 501 { status:"planned" } otherwise. Requires header x-agent-key. Payment always completes on a Stripe-hosted page — neither the agent nor SmartKong touches card data.',
        auth: { header: 'x-agent-key', value: '<AGENT_API_KEY>' },
        parameters: {
          productId: { type: 'string', required: true, description: 'Product id or handle (from a search/route-offers result).' },
          quantity: { type: 'integer', required: false, default: 1, minimum: 1, maximum: 20 },
          email: { type: 'string', required: false, description: 'Buyer email for the receipt.' },
          ref: { type: 'string', required: false, description: 'Partner referral/promo code to attribute the sale.' },
        },
        returns: 'mode="checkout" { checkoutUrl, orderId, amount_cents, expiresAt } for first-party items, or mode="handoff" { url, merchant } for external merchants.',
      },
    },
    endpoints_base: siteBase,
    contact: { catalog: `${siteBase}/`, docs: `${siteBase}/api/agent-manifest` },
  });
}
