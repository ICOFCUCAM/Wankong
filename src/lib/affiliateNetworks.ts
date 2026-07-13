// Affiliate network registry — the catalog of networks SmartKong can
// monetize through. Each entry declares the credential fields an operator
// must supply and how a plain product URL becomes a commission-tracked link:
//
//   link.type 'param'    → append `?<param>=<credentials[field]>` to the URL
//   link.type 'params'   → append several params (each from a credential field)
//   link.type 'template' → fill a deep-link template; {url} is the encoded
//                          product URL, {field} placeholders come from
//                          credentials
//   link.type 'manual'   → the network issues final links in its own
//                          dashboard; paste them per product
//
// Used by the SmartKong backend UI (account forms) and by the server-side
// link builder in api/_lib/affiliates.ts. Adding a network here is all
// that's needed to support it end to end.

export interface NetworkField {
  key: string;          // credentials jsonb key
  label: string;
  required?: boolean;
  secret?: boolean;     // render as password input
}

export type LinkStrategy =
  | { type: 'param'; param: string; field: string }
  | { type: 'params'; params: Array<{ param: string; field: string; optional?: boolean }> }
  | { type: 'template'; template: string }
  | { type: 'manual' };

export interface AffiliateNetwork {
  id: string;           // provider value stored in affiliate_accounts
  name: string;
  category: 'retail' | 'network' | 'digital' | 'travel' | 'services' | 'africa';
  website: string;
  fields: NetworkField[];
  link: LinkStrategy;
  notes?: string;
}

export const AFFILIATE_NETWORKS: AffiliateNetwork[] = [
  // ── Major retail programs ─────────────────────────────────────────────────
  {
    id: 'amazon', name: 'Amazon Associates', category: 'retail', website: 'https://affiliate-program.amazon.com',
    fields: [
      { key: 'associate_tag', label: 'Associate Tag (e.g. yourtag-20)', required: true },
      { key: 'access_key',    label: 'PA-API Access Key (enables bulk import)', secret: true },
      { key: 'secret_key',    label: 'PA-API Secret Key (enables bulk import)', secret: true },
    ],
    link: { type: 'param', param: 'tag', field: 'associate_tag' },
  },
  {
    id: 'ebay', name: 'eBay Partner Network', category: 'retail', website: 'https://partnernetwork.ebay.com',
    fields: [
      { key: 'campaign_id',   label: 'Campaign ID (campid)', required: true },
      { key: 'client_id',     label: 'API Client ID (enables bulk import)', secret: true },
      { key: 'client_secret', label: 'API Client Secret (enables bulk import)', secret: true },
    ],
    link: { type: 'params', params: [{ param: 'mkcid', field: '_mkcid', optional: true }, { param: 'campid', field: 'campaign_id' }] },
  },
  {
    id: 'aliexpress', name: 'AliExpress Affiliate', category: 'retail', website: 'https://portals.aliexpress.com',
    fields: [{ key: 'tracking_id', label: 'Tracking ID', required: true }, { key: 'app_key', label: 'App Key', secret: true }],
    link: { type: 'param', param: 'aff_fcid', field: 'tracking_id' },
  },
  {
    id: 'temu', name: 'Temu Affiliate', category: 'retail', website: 'https://www.temu.com/affiliate',
    fields: [{ key: 'campaign_id', label: 'Campaign ID' }, { key: 'promo_code', label: 'Promo Code' }, { key: 'api_key', label: 'API Key', secret: true }],
    link: { type: 'params', params: [{ param: 'campaign_id', field: 'campaign_id', optional: true }, { param: 'promo', field: 'promo_code', optional: true }] },
  },
  {
    id: 'walmart', name: 'Walmart Affiliates', category: 'retail', website: 'https://affiliates.walmart.com',
    fields: [{ key: 'publisher_id', label: 'Publisher ID (Impact)', required: true }],
    link: { type: 'param', param: 'affp1', field: 'publisher_id' },
  },
  {
    id: 'etsy', name: 'Etsy Affiliates (Awin)', category: 'retail', website: 'https://www.etsy.com/affiliates',
    fields: [{ key: 'awin_affiliate_id', label: 'Awin Affiliate ID', required: true }],
    link: { type: 'template', template: 'https://www.awin1.com/cread.php?awinmid=6220&awinaffid={awin_affiliate_id}&ued={url}' },
  },
  {
    id: 'target', name: 'Target Partners', category: 'retail', website: 'https://partners.target.com',
    fields: [{ key: 'publisher_id', label: 'Publisher ID (Impact)', required: true }],
    link: { type: 'param', param: 'afid', field: 'publisher_id' },
  },
  {
    id: 'bestbuy', name: 'Best Buy Affiliate', category: 'retail', website: 'https://www.bestbuy.com/site/affiliate-program',
    fields: [{ key: 'publisher_id', label: 'Publisher ID', required: true }],
    link: { type: 'param', param: 'irclickid', field: 'publisher_id' },
  },

  // ── Affiliate networks (many advertisers under one account) ───────────────
  {
    id: 'cj', name: 'CJ Affiliate (Commission Junction)', category: 'network', website: 'https://www.cj.com',
    fields: [
      { key: 'publisher_id', label: 'Publisher ID (CID)', required: true },
      { key: 'site_id', label: 'Site / Website ID (PID)', required: true },
      { key: 'api_token', label: 'Personal Access Token', secret: true },
    ],
    link: { type: 'template', template: 'https://www.anrdoezrs.net/click-{publisher_id}-{site_id}?url={url}' },
    notes: 'API token enables catalog import + commission sync in the Affiliates admin.',
  },
  {
    id: 'awin', name: 'Awin', category: 'network', website: 'https://www.awin.com',
    fields: [{ key: 'affiliate_id', label: 'Publisher ID (awinaffid)', required: true }, { key: 'advertiser_id', label: 'Default Advertiser ID (awinmid)' }],
    link: { type: 'template', template: 'https://www.awin1.com/cread.php?awinmid={advertiser_id}&awinaffid={affiliate_id}&ued={url}' },
  },
  {
    id: 'shareasale', name: 'ShareASale', category: 'network', website: 'https://www.shareasale.com',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID', required: true }, { key: 'merchant_id', label: 'Default Merchant ID' }],
    link: { type: 'template', template: 'https://www.shareasale.com/r.cfm?b=1&u={affiliate_id}&m={merchant_id}&urllink={url}' },
  },
  {
    id: 'rakuten', name: 'Rakuten Advertising', category: 'network', website: 'https://rakutenadvertising.com',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID (mid)', required: true }, { key: 'api_key', label: 'API Key', secret: true }],
    link: { type: 'param', param: 'mid', field: 'affiliate_id' },
  },
  {
    id: 'impact', name: 'Impact.com', category: 'network', website: 'https://impact.com',
    fields: [{ key: 'account_sid', label: 'Account SID', required: true }, { key: 'auth_token', label: 'Auth Token', secret: true }],
    link: { type: 'manual' },
    notes: 'Impact issues per-brand tracking links in its dashboard — paste them on each product.',
  },
  {
    id: 'flexoffers', name: 'FlexOffers', category: 'network', website: 'https://www.flexoffers.com',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID', required: true }],
    link: { type: 'param', param: 'fobs', field: 'affiliate_id' },
  },
  {
    id: 'partnerize', name: 'Partnerize', category: 'network', website: 'https://partnerize.com',
    fields: [{ key: 'camref', label: 'Camref (partner reference)', required: true }],
    link: { type: 'template', template: 'https://prf.hn/click/camref:{camref}/destination:{url}' },
  },
  {
    id: 'tradedoubler', name: 'Tradedoubler', category: 'network', website: 'https://www.tradedoubler.com',
    fields: [{ key: 'affiliate_id', label: 'Site ID (a)', required: true }, { key: 'program_id', label: 'Program ID (p)' }],
    link: { type: 'template', template: 'https://clk.tradedoubler.com/click?p={program_id}&a={affiliate_id}&url={url}' },
  },
  {
    id: 'admitad', name: 'Admitad', category: 'network', website: 'https://www.admitad.com',
    fields: [{ key: 'deeplink_base', label: 'Deeplink base (from dashboard)', required: true }],
    link: { type: 'template', template: '{deeplink_base}?ulp={url}' },
  },
  {
    id: 'ascend', name: 'Ascend (Pepperjam)', category: 'network', website: 'https://ascendpartner.com',
    fields: [{ key: 'publisher_id', label: 'Publisher ID', required: true }, { key: 'program_id', label: 'Program ID' }],
    link: { type: 'template', template: 'https://www.pjtra.com/t/{publisher_id}?url={url}' },
  },
  {
    id: 'skimlinks', name: 'Skimlinks', category: 'network', website: 'https://skimlinks.com',
    fields: [{ key: 'publisher_id', label: 'Publisher ID', required: true }],
    link: { type: 'template', template: 'https://go.skimresources.com/?id={publisher_id}&url={url}' },
  },
  {
    id: 'sovrn', name: 'Sovrn Commerce (VigLink)', category: 'network', website: 'https://www.sovrn.com/commerce',
    fields: [{ key: 'api_key', label: 'API Key', required: true, secret: true }],
    link: { type: 'template', template: 'https://redirect.viglink.com?key={api_key}&u={url}' },
  },

  // ── Digital / info products ───────────────────────────────────────────────
  {
    id: 'clickbank', name: 'ClickBank', category: 'digital', website: 'https://www.clickbank.com',
    fields: [{ key: 'nickname', label: 'Account Nickname', required: true }],
    link: { type: 'template', template: 'https://{nickname}.VENDOR.hop.clickbank.net' },
    notes: 'Replace VENDOR per product, or paste hoplinks directly on products.',
  },
  {
    id: 'digistore24', name: 'Digistore24', category: 'digital', website: 'https://www.digistore24.com',
    fields: [{ key: 'affiliate_id', label: 'Digistore24 ID', required: true }],
    link: { type: 'param', param: 'aff', field: 'affiliate_id' },
  },
  {
    id: 'jvzoo', name: 'JVZoo', category: 'digital', website: 'https://www.jvzoo.com',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID', required: true }],
    link: { type: 'manual' },
  },
  {
    id: 'warriorplus', name: 'WarriorPlus', category: 'digital', website: 'https://warriorplus.com',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID', required: true }],
    link: { type: 'manual' },
  },
  {
    id: 'systeme', name: 'Systeme.io', category: 'digital', website: 'https://systeme.io',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID', required: true }],
    link: { type: 'param', param: 'sa', field: 'affiliate_id' },
  },

  // ── Services / SaaS ───────────────────────────────────────────────────────
  {
    id: 'fiverr', name: 'Fiverr Affiliates', category: 'services', website: 'https://affiliates.fiverr.com',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID (brand)', required: true }],
    link: { type: 'template', template: 'https://go.fiverr.com/visit/?bta={affiliate_id}&brand=fiverrcpa&landingPage={url}' },
  },
  {
    id: 'hostinger', name: 'Hostinger Affiliate', category: 'services', website: 'https://www.hostinger.com/affiliates',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID (REFERRALCODE)', required: true }],
    link: { type: 'template', template: 'https://hostinger.com?REFERRALCODE={affiliate_id}' },
  },
  {
    id: 'namecheap', name: 'Namecheap Affiliate', category: 'services', website: 'https://www.namecheap.com/affiliates',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID', required: true }],
    link: { type: 'param', param: 'afftrack', field: 'affiliate_id' },
  },
  {
    id: 'canva', name: 'Canva Affiliate (Impact)', category: 'services', website: 'https://www.canva.com/affiliates',
    fields: [{ key: 'publisher_id', label: 'Impact Publisher ID', required: true }],
    link: { type: 'manual' },
  },

  // ── Travel ────────────────────────────────────────────────────────────────
  {
    id: 'booking', name: 'Booking.com Partner', category: 'travel', website: 'https://www.booking.com/affiliate-program',
    fields: [{ key: 'aid', label: 'Affiliate ID (aid)', required: true }],
    link: { type: 'param', param: 'aid', field: 'aid' },
  },
  {
    id: 'travelpayouts', name: 'Travelpayouts', category: 'travel', website: 'https://www.travelpayouts.com',
    fields: [{ key: 'marker', label: 'Partner Marker', required: true }],
    link: { type: 'param', param: 'marker', field: 'marker' },
  },
  {
    id: 'tripadvisor', name: 'Tripadvisor (CJ)', category: 'travel', website: 'https://www.tripadvisor.com/affiliates',
    fields: [{ key: 'publisher_id', label: 'CJ Publisher ID', required: true }, { key: 'site_id', label: 'CJ Site ID', required: true }],
    link: { type: 'template', template: 'https://www.anrdoezrs.net/click-{publisher_id}-{site_id}?url={url}' },
  },

  // ── Africa-focused programs ───────────────────────────────────────────────
  {
    id: 'jumia', name: 'Jumia KOL/Affiliate', category: 'africa', website: 'https://kol.jumia.com',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID', required: true }],
    link: { type: 'param', param: 'aff_id', field: 'affiliate_id' },
  },
  {
    id: 'kilimall', name: 'Kilimall Affiliate', category: 'africa', website: 'https://www.kilimall.co.ke',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID', required: true }],
    link: { type: 'param', param: 'aff', field: 'affiliate_id' },
  },
  {
    id: 'konga', name: 'Konga Affiliate', category: 'africa', website: 'https://www.konga.com',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID', required: true }],
    link: { type: 'param', param: 'k_id', field: 'affiliate_id' },
  },
  {
    id: 'takealot', name: 'Takealot Affiliate', category: 'africa', website: 'https://www.takealot.com',
    fields: [{ key: 'affiliate_id', label: 'Affiliate ID', required: true }],
    link: { type: 'manual' },
  },

  // ── Anything else ─────────────────────────────────────────────────────────
  {
    id: 'custom', name: 'Custom Network', category: 'network', website: '',
    fields: [
      { key: 'label_hint', label: 'Network name' },
      { key: 'param', label: 'Tracking URL parameter (e.g. ref)' },
      { key: 'value', label: 'Your tracking value / ID' },
    ],
    link: { type: 'params', params: [{ param: '__dynamic__', field: 'value' }] },
    notes: 'For networks not listed: set the tracking parameter name and your ID, or paste final links per product.',
  },
];

export const NETWORK_CATEGORIES: Record<AffiliateNetwork['category'], string> = {
  retail:   'Retail & Marketplaces',
  network:  'Affiliate Networks',
  digital:  'Digital Products',
  services: 'Services & SaaS',
  travel:   'Travel',
  africa:   'Africa',
};

export function networkById(id?: string | null): AffiliateNetwork | undefined {
  return AFFILIATE_NETWORKS.find(n => n.id === id);
}

/**
 * Turns a plain product URL into a tracked link using a network's strategy
 * and an account's credentials. Throws when required credentials are missing
 * or the strategy is manual.
 */
export function buildTrackedLink(
  network: AffiliateNetwork,
  originalUrl: string,
  credentials: Record<string, string | null | undefined>,
): string {
  const get = (field: string) => (credentials[field] ?? '').toString().trim();

  switch (network.link.type) {
    case 'param': {
      const value = get(network.link.field);
      if (!value) throw new Error(`${network.name}: missing ${network.link.field}`);
      const url = new URL(originalUrl);
      url.searchParams.set(network.link.param, value);
      return url.toString();
    }
    case 'params': {
      const url = new URL(originalUrl);
      let applied = 0;
      for (const p of network.link.params) {
        const value = get(p.field);
        if (!value) {
          if (p.optional) continue;
          throw new Error(`${network.name}: missing ${p.field}`);
        }
        const param = p.param === '__dynamic__' ? (get('param') || 'ref') : p.param;
        url.searchParams.set(param, value);
        applied += 1;
      }
      if (applied === 0) throw new Error(`${network.name}: no tracking credentials configured`);
      return url.toString();
    }
    case 'template': {
      let link = network.link.template;
      link = link.replace('{url}', encodeURIComponent(originalUrl));
      for (const match of link.matchAll(/\{([a-z_]+)\}/g)) {
        const value = get(match[1]);
        if (!value) throw new Error(`${network.name}: missing ${match[1]}`);
        link = link.replace(match[0], value);
      }
      return link;
    }
    case 'manual':
      throw new Error(`${network.name} issues links in its own dashboard — paste the final link on the product.`);
  }
}
