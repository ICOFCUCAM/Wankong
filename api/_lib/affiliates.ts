// Affiliate network adapters — ported from SmartKongMarket's adapter pattern.
// Each network knows how to turn a plain product URL into a commission-tracked
// affiliate link using the credentials stored in affiliate_accounts.

export type AffiliateProvider = 'amazon' | 'cj' | 'rakuten' | 'temu';

export interface AffiliateAccount {
  id?: string;
  provider: AffiliateProvider;
  label?: string;
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

type LinkBuilder = (originalUrl: string, account: AffiliateAccount) => string;

const builders: Record<AffiliateProvider, LinkBuilder> = {
  amazon(originalUrl, account) {
    if (!account.amazon_associate_tag) throw new Error('Amazon associate tag not configured');
    const url = new URL(originalUrl);
    url.searchParams.set('tag', account.amazon_associate_tag);
    return url.toString();
  },
  cj(originalUrl, account) {
    if (!account.cj_site_id) throw new Error('CJ site ID not configured');
    const url = new URL(originalUrl);
    url.searchParams.set('sid', account.cj_site_id);
    return url.toString();
  },
  rakuten(originalUrl, account) {
    if (!account.rakuten_affiliate_id) throw new Error('Rakuten affiliate ID not configured');
    const url = new URL(originalUrl);
    url.searchParams.set('mid', account.rakuten_affiliate_id);
    return url.toString();
  },
  temu(originalUrl, account) {
    if (!account.temu_campaign_id && !account.temu_promo_code) {
      throw new Error('Temu campaign ID or promo code not configured');
    }
    const url = new URL(originalUrl);
    if (account.temu_campaign_id) url.searchParams.set('campaign_id', account.temu_campaign_id);
    if (account.temu_promo_code)  url.searchParams.set('promo', account.temu_promo_code);
    return url.toString();
  },
};

export function buildAffiliateLink(
  provider: AffiliateProvider,
  originalUrl: string,
  account: AffiliateAccount,
): string {
  const builder = builders[provider];
  if (!builder) throw new Error(`Unsupported provider: ${provider}`);
  try {
    return builder(originalUrl, account);
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
