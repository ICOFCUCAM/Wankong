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
        description: 'Complete a purchase through SmartKong on the user\'s behalf.',
        status: 'planned',
        note: 'Not yet available. Agents should hand off to the product url to complete checkout for now.',
      },
    },
    endpoints_base: siteBase,
    contact: { catalog: `${siteBase}/`, docs: `${siteBase}/api/agent-manifest` },
  });
}
