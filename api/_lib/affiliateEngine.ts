// Affiliate Engine v2 — one-button bulk import + continuous auto-sync.
//
// Upgraded from the original SmartKongMarket (Replit) engine, which only had
// per-URL link builders and a single-page CJ search. This engine adds:
//   • A catalog-adapter framework: each network exposes fetchPage() and the
//     orchestrator pages through the full catalog until exhausted or capped.
//   • Real API adapters: CJ (REST, paged), Amazon PA-API 5.0 (SigV4-signed
//     SearchItems), eBay Browse (OAuth + EPN campaign), Rakuten LinkSynergy.
//   • A universal feed adapter (JSON or CSV product feeds) so ALL other
//     networks — AliExpress, Awin, Impact, ShareASale, Temu, … — bulk-import
//     from the datafeed URL every network provides.
//   • Idempotent upserts on ecom_products.external_key, so re-running a sync
//     registers only NEW products and refreshes prices on existing ones.
//   • runAccountSync(): the single entry point behind the admin's
//     "Import all products" button and the auto-sync cron.

import crypto from 'crypto';
import { buildAffiliateLink, cjSearchProducts, type AffiliateAccount, type CjConfig } from './affiliates';

export interface NormalizedProduct {
  externalId: string;          // stable id within the network
  name: string;
  description: string | null;
  url: string;                 // product/buy URL (pre-tracking)
  imageUrl: string | null;
  price: number | null;        // major units (e.g. dollars)
  currency: string;
  category: string | null;
  advertiser: string | null;   // merchant/brand shown as vendor
}

export interface FetchPageArgs {
  account: Record<string, any>;
  creds: Record<string, string>;
  keywords: string | null;
  advertisers: string | null;
  page: number;                // 1-based
  pageSize: number;
}

export interface CatalogAdapter {
  provider: string;
  fetchPage(args: FetchPageArgs): Promise<{ products: NormalizedProduct[]; hasMore: boolean }>;
}

const cred = (creds: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) if (creds[k]) return creds[k];
  return '';
};

// ── CJ Affiliate (paged REST product search) ────────────────────────────────────
const cjAdapter: CatalogAdapter = {
  provider: 'cj',
  async fetchPage({ account, creds, keywords, advertisers, page, pageSize }) {
    const config: CjConfig = {
      apiToken:    cred(creds, 'api_token')    || account.cj_personal_access_token || process.env.CJ_AFFILIATE_API_TOKEN || '',
      publisherId: cred(creds, 'publisher_id') || account.cj_publisher_id          || process.env.CJ_AFFILIATE_PUBLISHER_ID || '',
      siteId:      cred(creds, 'site_id')      || account.cj_site_id               || process.env.CJ_AFFILIATE_SITE_ID || '',
    };
    if (!config.apiToken || !config.siteId) throw new Error('CJ credentials missing');

    const params: Record<string, string> = {
      'website-id':       config.siteId,
      'records-per-page': String(pageSize),
      'page-number':      String(page),
    };
    if (keywords)    params['keywords']       = keywords;
    if (advertisers) params['advertiser-ids'] = advertisers;
    else             params['advertiser-ids'] = 'joined';

    const res = await fetch(`https://product-search.api.cj.com/v2/product-search?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${config.apiToken}` },
    });
    if (!res.ok) throw new Error(`CJ API error: ${res.status}`);
    const data = await res.json() as any;
    const items: any[] = data?.products ?? [];
    return {
      products: items.filter(p => p?.buyUrl && p?.name).map(p => ({
        externalId:  String(p.catalogId ?? p.sku ?? p.buyUrl),
        name:        p.name,
        description: p.description ?? null,
        url:         p.buyUrl,
        imageUrl:    p.imageUrl ?? null,
        price:       p.price != null ? Number(p.price) : null,
        currency:    p.currency ?? 'USD',
        category:    p.categoryPath ?? null,
        advertiser:  p.advertiserName ?? null,
      })),
      hasMore: items.length >= pageSize,
    };
  },
};

// ── Amazon Product Advertising API 5.0 (SigV4-signed SearchItems) ───────────────
function sigv4(key: string, dateStamp: string, region: string, service: string) {
  const kDate    = crypto.createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
  const kRegion  = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  return crypto.createHmac('sha256', kService).update('aws4_request').digest();
}

async function paapiSearchItems(creds: Record<string, string>, keywords: string, page: number) {
  const accessKey  = cred(creds, 'access_key', 'api_key');
  const secretKey  = cred(creds, 'secret_key', 'api_secret');
  const partnerTag = cred(creds, 'associate_tag', 'partner_tag');
  const host       = cred(creds, 'host') || 'webservices.amazon.com';
  const region     = cred(creds, 'region') || 'us-east-1';
  if (!accessKey || !secretKey || !partnerTag) throw new Error('Amazon PA-API credentials missing (access_key, secret_key, associate_tag)');

  const service = 'ProductAdvertisingAPI';
  const target  = 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';
  const path    = '/paapi5/searchitems';
  const payload = JSON.stringify({
    Keywords: keywords, ItemPage: page, ItemCount: 10,
    PartnerTag: partnerTag, PartnerType: 'Associates', Marketplace: 'www.amazon.com',
    Resources: ['ItemInfo.Title', 'ItemInfo.Features', 'Images.Primary.Large', 'Offers.Listings.Price', 'BrowseNodeInfo.BrowseNodes'],
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');           // yyyymmddThhmmssZ
  const dateStamp = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    'content-encoding': 'amz-1.0',
    'content-type': 'application/json; charset=utf-8',
    host,
    'x-amz-date': amzDate,
    'x-amz-target': target,
  };
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort().map(k => `${k}:${headers[k]}\n`).join('');
  const canonicalRequest = ['POST', path, '', canonicalHeaders, signedHeaders, crypto.createHash('sha256').update(payload).digest('hex')].join('\n');
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const signature = crypto.createHmac('sha256', sigv4(secretKey, dateStamp, region, service)).update(stringToSign).digest('hex');

  const res = await fetch(`https://${host}${path}`, {
    method: 'POST',
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: payload,
  });
  const data = await res.json() as any;
  if (!res.ok || data.Errors?.length) {
    throw new Error(`Amazon PA-API error: ${data.Errors?.[0]?.Message ?? res.status}`);
  }
  return data?.SearchResult?.Items ?? [];
}

const amazonAdapter: CatalogAdapter = {
  provider: 'amazon',
  async fetchPage({ creds, keywords, page }) {
    // PA-API caps SearchItems at 10 pages × 10 items per keyword.
    if (page > 10) return { products: [], hasMore: false };
    const items = await paapiSearchItems(creds, keywords || 'best sellers', page);
    return {
      products: items.filter((it: any) => it?.DetailPageURL && it?.ItemInfo?.Title?.DisplayValue).map((it: any) => ({
        externalId:  it.ASIN,
        name:        it.ItemInfo.Title.DisplayValue,
        description: it.ItemInfo?.Features?.DisplayValues?.join(' · ') ?? null,
        url:         it.DetailPageURL,
        imageUrl:    it.Images?.Primary?.Large?.URL ?? null,
        price:       it.Offers?.Listings?.[0]?.Price?.Amount ?? null,
        currency:    it.Offers?.Listings?.[0]?.Price?.Currency ?? 'USD',
        category:    it.BrowseNodeInfo?.BrowseNodes?.[0]?.DisplayName ?? null,
        advertiser:  'Amazon',
      })),
      hasMore: items.length >= 10 && page < 10,
    };
  },
};

// ── eBay Browse API (OAuth client-credentials + EPN campaign tracking) ─────────
let ebayToken: { token: string; exp: number } | null = null;
async function ebayAccessToken(creds: Record<string, string>) {
  if (ebayToken && ebayToken.exp > Date.now()) return ebayToken.token;
  const id = cred(creds, 'client_id', 'app_id'), secret = cred(creds, 'client_secret', 'cert_id');
  if (!id || !secret) throw new Error('eBay credentials missing (client_id, client_secret)');
  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`eBay auth error: ${data.error_description ?? res.status}`);
  ebayToken = { token: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return ebayToken.token;
}

const ebayAdapter: CatalogAdapter = {
  provider: 'ebay',
  async fetchPage({ creds, keywords, page, pageSize }) {
    const token = await ebayAccessToken(creds);
    const campaign = cred(creds, 'campaign_id');
    const params = new URLSearchParams({ q: keywords || 'top deals', limit: String(pageSize), offset: String((page - 1) * pageSize) });
    const res = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(campaign ? { 'X-EBAY-C-ENDUSERCTX': `affiliateCampaignId=${campaign}` } : {}),
      },
    });
    const data = await res.json() as any;
    if (!res.ok) throw new Error(`eBay API error: ${data.errors?.[0]?.message ?? res.status}`);
    const items: any[] = data?.itemSummaries ?? [];
    return {
      products: items.filter(it => it?.itemWebUrl && it?.title).map(it => ({
        externalId:  it.itemId,
        name:        it.title,
        description: it.shortDescription ?? null,
        url:         it.itemAffiliateWebUrl ?? it.itemWebUrl,
        imageUrl:    it.image?.imageUrl ?? null,
        price:       it.price?.value != null ? Number(it.price.value) : null,
        currency:    it.price?.currency ?? 'USD',
        category:    it.categories?.[0]?.categoryName ?? null,
        advertiser:  'eBay',
      })),
      hasMore: !!data?.next,
    };
  },
};

// ── Rakuten Advertising (LinkSynergy product search) ────────────────────────────
const rakutenAdapter: CatalogAdapter = {
  provider: 'rakuten',
  async fetchPage({ creds, keywords, page, pageSize }) {
    const token = cred(creds, 'api_key', 'web_service_token');
    if (!token) throw new Error('Rakuten credentials missing (api_key)');
    const params = new URLSearchParams({ keyword: keywords || 'deals', max: String(Math.min(pageSize, 100)), pagenumber: String(page) });
    const res = await fetch(`https://api.linksynergy.com/productsearch/1.0?${params}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Rakuten API error: ${res.status}`);
    const data = await res.json() as any;
    const items: any[] = data?.result?.item ?? data?.item ?? [];
    return {
      products: items.filter((it: any) => (it.linkurl || it.link) && (it.productname || it.name)).map((it: any) => ({
        externalId:  String(it.sku ?? it.productname ?? it.linkurl),
        name:        it.productname ?? it.name,
        description: it.description?.short ?? it.description ?? null,
        url:         it.linkurl ?? it.link,
        imageUrl:    it.imageurl ?? null,
        price:       it.price?.['#text'] != null ? Number(it.price['#text']) : (it.price != null ? Number(it.price) : null),
        currency:    it.price?.['@_currency'] ?? 'USD',
        category:    it.category?.primary ?? null,
        advertiser:  it.merchantname ?? null,
      })),
      hasMore: items.length >= Math.min(pageSize, 100),
    };
  },
};

// ── Universal feed adapter (JSON array or CSV datafeed URL) ─────────────────────
// Every affiliate network offers a product datafeed export. Point the account's
// feed_url at it and the whole catalog imports — this is the coverage path for
// AliExpress, Awin, Impact, ShareASale, Temu, Admitad, and the rest.
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur = '', row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = ''; }
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return rows.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const pick = (o: Record<string, any>, ...keys: string[]) => {
  for (const k of keys) { const v = o[k]; if (v != null && v !== '') return String(v); }
  return null;
};

function normalizeFeedRow(row: Record<string, any>): NormalizedProduct | null {
  const name = pick(row, 'name', 'title', 'product_name', 'productname');
  const url  = pick(row, 'url', 'link', 'product_url', 'buy_url', 'deep_link', 'deeplink', 'aw_deep_link', 'clickurl');
  if (!name || !url) return null;
  const priceRaw = pick(row, 'price', 'sale_price', 'search_price', 'current_price', 'display_price');
  return {
    externalId:  pick(row, 'id', 'sku', 'product_id', 'external_id', 'aw_product_id', 'asin', 'item_id') ?? url,
    name,
    description: pick(row, 'description', 'short_description', 'desc'),
    url,
    imageUrl:    pick(row, 'image', 'image_url', 'imageurl', 'img', 'merchant_image_url', 'aw_image_url'),
    price:       priceRaw ? parseFloat(String(priceRaw).replace(/[^0-9.]/g, '')) || null : null,
    currency:    pick(row, 'currency') ?? 'USD',
    category:    pick(row, 'category', 'category_name', 'merchant_category', 'product_type'),
    advertiser:  pick(row, 'advertiser', 'merchant', 'merchant_name', 'brand', 'store', 'vendor'),
  };
}

const FEED_PAGE = 200;
const feedCache = new Map<string, NormalizedProduct[]>();

const feedAdapter: CatalogAdapter = {
  provider: 'feed',
  async fetchPage({ account, page }) {
    const feedUrl = account.feed_url as string;
    if (!feedUrl) throw new Error('No product feed URL configured — set one on the account, or use a network with a built-in API (CJ, Amazon, eBay, Rakuten).');
    let all = feedCache.get(feedUrl);
    if (!all) {
      const res = await fetch(feedUrl);
      if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
      const text = await res.text();
      let rows: Record<string, any>[];
      try {
        const json = JSON.parse(text);
        rows = Array.isArray(json) ? json : (json.products ?? json.items ?? json.data ?? []);
      } catch { rows = parseCsv(text); }
      all = rows.map(normalizeFeedRow).filter(Boolean) as NormalizedProduct[];
      feedCache.set(feedUrl, all);
      setTimeout(() => feedCache.delete(feedUrl), 5 * 60 * 1000).unref?.();
    }
    const slice = all.slice((page - 1) * FEED_PAGE, page * FEED_PAGE);
    return { products: slice, hasMore: page * FEED_PAGE < all.length };
  },
};

const ADAPTERS: Record<string, CatalogAdapter> = {
  cj: cjAdapter,
  amazon: amazonAdapter,
  ebay: ebayAdapter,
  rakuten: rakutenAdapter,
};

export function adapterFor(account: Record<string, any>): CatalogAdapter {
  // A configured feed URL always works; otherwise use the network's API adapter.
  if (account.feed_url) return feedAdapter;
  return ADAPTERS[account.provider] ?? feedAdapter;
}

// ── Importer: idempotent upsert on external_key ─────────────────────────────────
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export async function importProducts(
  supabase: any,
  account: Record<string, any>,
  products: NormalizedProduct[],
): Promise<{ imported: number; updated: number; skipped: number }> {
  let imported = 0, updated = 0, skipped = 0;
  for (const p of products) {
    const externalKey = `${account.provider}:${p.externalId}`.slice(0, 500);

    // Tracked link via the network registry; fall back to the raw URL.
    let tracked = p.url;
    try { tracked = buildAffiliateLink(account.provider, p.url, account as AffiliateAccount); } catch { /* raw url */ }

    const { data: existing } = await supabase
      .from('ecom_products').select('id').eq('external_key', externalKey).maybeSingle();

    if (existing) {
      const { error } = await supabase.from('ecom_products').update({
        price:         Math.round((p.price ?? 0) * 100),
        affiliate_url: tracked,
        cover_url:     p.imageUrl ?? undefined,
        status:        'active',
      }).eq('id', existing.id);
      if (error) skipped++; else updated++;
      continue;
    }

    const { error } = await supabase.from('ecom_products').insert([{
      title:            p.name.slice(0, 140),
      handle:           `${slugify(p.name)}-${crypto.createHash('md5').update(externalKey).digest('hex').slice(0, 6)}`,
      product_type:     'Product',
      description:      p.description,
      genre:            p.category,
      price:            Math.round((p.price ?? 0) * 100),
      cover_url:        p.imageUrl,
      vendor:           p.advertiser ?? account.label ?? account.provider,
      status:           'active',
      is_affiliate:     true,
      affiliate_source: account.provider,
      affiliate_url:    tracked,
      original_url:     p.url,
      external_key:     externalKey,
      metadata:         { provider: account.provider, external_id: p.externalId, account_id: account.id },
    }]);
    if (error) skipped++; else imported++;
  }
  return { imported, updated, skipped };
}

// ── Orchestrator: the single-button bulk import / auto-sync entry point ─────────
export async function runAccountSync(
  supabase: any,
  account: Record<string, any>,
  opts: { trigger: 'manual' | 'auto'; maxProducts?: number },
): Promise<{ found: number; imported: number; updated: number; skipped: number; error: string | null }> {
  const { data: run } = await supabase.from('affiliate_sync_runs').insert([{
    account_id: account.id, provider: account.provider, trigger: opts.trigger,
  }]).select('id').single();

  const creds = (account.credentials ?? {}) as Record<string, string>;
  const adapter = adapterFor(account);
  const cap = Math.min(opts.maxProducts ?? account.import_limit ?? 1000, 5000);
  const pageSize = 50;

  let found = 0, imported = 0, updated = 0, skipped = 0;
  let error: string | null = null;

  try {
    for (let page = 1; found < cap && page <= 100; page++) {
      const { products, hasMore } = await adapter.fetchPage({
        account, creds,
        keywords:    account.sync_keywords ?? null,
        advertisers: account.sync_advertisers ?? null,
        page, pageSize,
      });
      found += products.length;
      const r = await importProducts(supabase, account, products.slice(0, cap - (found - products.length)));
      imported += r.imported; updated += r.updated; skipped += r.skipped;
      if (!hasMore || products.length === 0) break;
    }
  } catch (err: any) {
    error = err.message ?? String(err);
  }

  await supabase.from('affiliate_sync_runs').update({
    found, imported, updated, skipped, error, finished_at: new Date().toISOString(),
  }).eq('id', run?.id ?? '00000000-0000-0000-0000-000000000000');

  await supabase.from('affiliate_accounts').update({
    last_synced_at:   new Date().toISOString(),
    last_sync_status: error ? `error: ${error.slice(0, 180)}` : `ok: +${imported} new, ${updated} updated`,
  }).eq('id', account.id);

  return { found, imported, updated, skipped, error };
}
