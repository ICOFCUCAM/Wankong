import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceClient } from './_lib/fulfillment';
import {
  buildAffiliateLink, cjSearchProducts, cjGetCommissions,
  type AffiliateAccount, type AffiliateProvider, type CjConfig,
} from './_lib/affiliates';

// Admin-only affiliate operations. The caller sends their Supabase JWT; we
// verify it and require an admin_roles row before touching credentials.

async function requireAdmin(req: VercelRequest) {
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('unauthorized');

  const supabase = serviceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('unauthorized');

  const { data: admin } = await supabase
    .from('admin_roles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!admin) throw new Error('forbidden');

  return { supabase, user };
}

// CJ credentials come from the stored affiliate account, falling back to env.
async function cjConfig(supabase: ReturnType<typeof serviceClient>): Promise<CjConfig> {
  const { data: account } = await supabase
    .from('affiliate_accounts')
    .select('cj_personal_access_token, cj_publisher_id, cj_site_id, credentials')
    .eq('provider', 'cj')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const creds = (account?.credentials ?? {}) as Record<string, string>;
  const config: CjConfig = {
    apiToken:    creds.api_token    || account?.cj_personal_access_token || process.env.CJ_AFFILIATE_API_TOKEN || '',
    publisherId: creds.publisher_id || account?.cj_publisher_id          || process.env.CJ_AFFILIATE_PUBLISHER_ID || '',
    siteId:      creds.site_id      || account?.cj_site_id               || process.env.CJ_AFFILIATE_SITE_ID || '',
  };
  if (!config.apiToken || !config.siteId) {
    throw new Error('CJ Affiliate is not configured — add a CJ account under Admin → Affiliates.');
  }
  return config;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let supabase;
  try {
    ({ supabase } = await requireAdmin(req));
  } catch (err: any) {
    return res.status(err.message === 'forbidden' ? 403 : 401).json({ error: err.message });
  }

  const { action } = req.body as { action?: string };

  try {
    switch (action) {
      // ── Generate a tracked link from a stored network account ──────────────
      case 'generate_link': {
        const { provider, originalUrl, accountId } = req.body as {
          provider: AffiliateProvider; originalUrl: string; accountId?: string;
        };
        if (!provider || !originalUrl) return res.status(400).json({ error: 'provider and originalUrl required' });

        let query = supabase.from('affiliate_accounts').select('*').eq('provider', provider).eq('is_active', true);
        if (accountId) query = query.eq('id', accountId);
        const { data: account } = await query.limit(1).maybeSingle();
        if (!account) return res.status(400).json({ error: `No active ${provider} account configured` });

        const link = buildAffiliateLink(provider, originalUrl, account as AffiliateAccount);
        return res.json({ link });
      }

      // ── Search the CJ product catalog ───────────────────────────────────────
      case 'cj_search_products': {
        const { keywords, advertiserId, limit } = req.body as {
          keywords?: string; advertiserId?: string; limit?: number;
        };
        const config = await cjConfig(supabase);
        const products = await cjSearchProducts(config, { keywords, advertiserId, limit });
        return res.json({ products });
      }

      // ── Import selected CJ products into the catalog ────────────────────────
      case 'cj_import_products': {
        const { products } = req.body as {
          products: Array<{
            catalogId: string; advertiserName: string; name: string;
            description: string | null; buyUrl: string; imageUrl: string | null;
            price: number | null; category: string | null;
          }>;
        };
        if (!Array.isArray(products) || products.length === 0) {
          return res.status(400).json({ error: 'No products supplied' });
        }

        let imported = 0;
        for (const p of products.slice(0, 100)) {
          if (!p?.buyUrl || !p?.name) continue;

          // Skip products already imported (metadata carries the CJ catalog id)
          const { data: dupe } = await supabase
            .from('ecom_products')
            .select('id')
            .eq('is_affiliate', true)
            .contains('metadata', { cj_catalog_id: p.catalogId })
            .limit(1)
            .maybeSingle();
          if (dupe) continue;

          const handle = `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)}-${p.catalogId.slice(-6)}`;
          const { error } = await supabase.from('ecom_products').insert([{
            title:            p.name.slice(0, 140),
            handle,
            product_type:     'Product',
            description:      p.description,
            genre:            p.category,
            price:            Math.round((p.price ?? 0) * 100),
            cover_url:        p.imageUrl,
            vendor:           p.advertiserName,
            status:           'active',
            is_affiliate:     true,
            affiliate_source: 'cj',
            affiliate_url:    p.buyUrl,
            original_url:     p.buyUrl,
            metadata:         { cj_catalog_id: p.catalogId, advertiser: p.advertiserName },
          }]);
          if (!error) imported += 1;
        }
        return res.json({ imported, total: products.length });
      }

      // ── Sync commission records from CJ ─────────────────────────────────────
      case 'cj_sync_commissions': {
        const { startDate, endDate } = req.body as { startDate?: string; endDate?: string };
        const end   = endDate   ?? new Date().toISOString().slice(0, 10);
        const start = startDate ?? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

        const config = await cjConfig(supabase);
        const commissions = await cjGetCommissions(config, start, end);

        let synced = 0;
        for (const c of commissions) {
          const { error } = await supabase.from('affiliate_commissions').upsert({
            provider:          'cj',
            external_id:       c.actionTrackerId,
            advertiser_id:     c.advertiserId,
            advertiser_name:   c.advertiserName,
            commission_amount: c.commissionAmount,
            sale_amount:       c.saleAmount,
            currency:          'USD',
            order_date:        c.orderDate,
            event_date:        c.eventDate,
            status:            c.status,
            action_type:       c.actionType,
            raw:               c.raw,
          }, { onConflict: 'external_id' });
          if (!error) synced += 1;
        }
        return res.json({ synced, from: start, to: end });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err: any) {
    console.error('[affiliate-admin]', err);
    return res.status(500).json({ error: err.message ?? 'Internal server error' });
  }
}
