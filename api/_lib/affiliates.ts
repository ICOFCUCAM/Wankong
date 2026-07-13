// Affiliate link building — generalized over the network registry
// (src/lib/affiliateNetworks.ts), which defines 30+ networks, their
// credential fields, and how a plain product URL becomes a tracked link.

import { networkById, buildTrackedLink } from '../../src/lib/affiliateNetworks';

export type AffiliateProvider = string;

export interface AffiliateAccount {
  id?: string;
  provider: string;
  label?: string;
  credentials?: Record<string, string | null> | null;
  // Legacy dedicated columns (pre-registry rows)
  amazon_associate_tag?: string | null;
  cj_personal_access_token?: string | null;
  cj_publisher_id?: string | null;
  cj_site_id?: string | null;
  rakuten_affiliate_id?: string | null;
  rakuten_api_key?: string | null;
  temu_api_key?: string | null;
  temu_campaign_id?: string | null;
  temu_promo_code?: string | null;
}

// Maps the legacy dedicated columns into registry credential keys so
// accounts created before migration 044 keep building links.
function effectiveCredentials(account: AffiliateAccount): Record<string, string | null | undefined> {
  return {
    associate_tag: account.amazon_associate_tag,
    api_token:     account.cj_personal_access_token,
    publisher_id:  account.cj_publisher_id,
    site_id:       account.cj_site_id,
    affiliate_id:  account.rakuten_affiliate_id,
    api_key:       account.rakuten_api_key ?? account.temu_api_key,
    campaign_id:   account.temu_campaign_id,
    promo_code:    account.temu_promo_code,
    ...(account.credentials ?? {}),
  };
}

export function buildAffiliateLink(
  provider: string,
  originalUrl: string,
  account: AffiliateAccount,
): string {
  const network = networkById(provider);
  if (!network) throw new Error(`Unsupported provider: ${provider}`);
  try {
    return buildTrackedLink(network, originalUrl, effectiveCredentials(account));
  } catch (err: any) {
    if (err instanceof TypeError) throw new Error('Invalid URL format');
    throw err;
  }
}

// ── CJ Affiliate API client ─────────────────────────────────────────────────────

export interface CjConfig {
  apiToken: string;
  publisherId: string;
  siteId: string;
}

const CJ_COMMISSIONS_URL = 'https://commissions.api.cj.com';
const CJ_PRODUCTS_URL    = 'https://product-search.api.cj.com';

async function cjRest(config: CjConfig, url: string, params: Record<string, string>): Promise<any> {
  const res = await fetch(`${url}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${config.apiToken}` },
  });
  if (!res.ok) throw new Error(`CJ API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function cjGraphQL(config: CjConfig, query: string, variables: Record<string, any>): Promise<any> {
  const res = await fetch(`${CJ_COMMISSIONS_URL}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`CJ API error: ${res.status} ${res.statusText}`);
  const data = await res.json() as { data?: any; errors?: unknown };
  if (data.errors) throw new Error(`CJ GraphQL error: ${JSON.stringify(data.errors)}`);
  return data.data;
}

export interface CjProductResult {
  catalogId: string;
  advertiserId: string;
  advertiserName: string;
  name: string;
  description: string | null;
  buyUrl: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
  category: string | null;
}

export async function cjSearchProducts(
  config: CjConfig,
  filters: { keywords?: string; advertiserId?: string; limit?: number },
): Promise<CjProductResult[]> {
  const params: Record<string, string> = { 'website-id': config.siteId };
  if (filters.advertiserId) params['advertiser-ids']  = filters.advertiserId;
  if (filters.keywords)     params['keywords']        = filters.keywords;
  params['records-per-page'] = String(Math.min(filters.limit ?? 25, 100));

  const data = await cjRest(config, `${CJ_PRODUCTS_URL}/v2/product-search`, params);
  const products = data?.products ?? [];

  return products.map((p: any) => ({
    catalogId:      p.catalogId,
    advertiserId:   p.advertiserId,
    advertiserName: p.advertiserName,
    name:           p.name,
    description:    p.description ?? null,
    buyUrl:         p.buyUrl,
    imageUrl:       p.imageUrl ?? null,
    price:          p.price != null ? Number(p.price) : null,
    currency:       p.currency ?? 'USD',
    category:       p.categoryPath ?? null,
  }));
}

export interface CjCommissionResult {
  actionTrackerId: string;
  advertiserId: string;
  advertiserName: string;
  commissionAmount: number;
  saleAmount: number;
  orderDate: string | null;
  eventDate: string | null;
  status: string;
  actionType: string;
  raw: any;
}

export async function cjGetCommissions(
  config: CjConfig,
  startDate: string,
  endDate: string,
): Promise<CjCommissionResult[]> {
  const query = `
    query GetCommissions($publisherId: String!, $startDate: String!, $endDate: String!) {
      publisherCommissions(
        forPublishers: [$publisherId]
        sincePostingDate: $startDate
        beforePostingDate: $endDate
      ) {
        records {
          actionTrackerId
          advertiserId
          advertiserName
          commissionAmount { amount currency }
          items { totalAmount { amount currency } }
          eventDate
          orderDate
          postingDate
          actionStatus
          actionType
          websiteId
        }
      }
    }
  `;

  const data = await cjGraphQL(config, query, {
    publisherId: config.publisherId,
    startDate,
    endDate,
  });

  const records = data?.publisherCommissions?.records ?? [];
  return records.map((rec: any) => ({
    actionTrackerId:  rec.actionTrackerId,
    advertiserId:     rec.advertiserId,
    advertiserName:   rec.advertiserName,
    commissionAmount: rec.commissionAmount?.amount ?? 0,
    saleAmount:       rec.items?.[0]?.totalAmount?.amount ?? 0,
    orderDate:        rec.orderDate ?? null,
    eventDate:        rec.eventDate ?? null,
    status:           rec.actionStatus ?? 'unknown',
    actionType:       rec.actionType ?? 'sale',
    raw:              rec,
  }));
}

// CJ deep-link wrapper (anrdoezrs click redirect) — used when a product URL
// has no native tracking parameter support.
export function cjDeepLink(publisherId: string, advertiserId: string, targetUrl: string): string {
  return `https://www.anrdoezrs.net/click-${publisherId}-${advertiserId}?url=${encodeURIComponent(targetUrl)}`;
}
