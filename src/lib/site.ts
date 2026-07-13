// Site mode — one codebase, two branded deployments.
//
// The default build is the full WANKONG creator platform. Setting
// VITE_SITE_MODE=market at build time (the smartkong.net Vercel project)
// re-skins the same app as SmartKong, the standalone marketplace site:
// same Supabase backend, same accounts, same catalog — different brand,
// nav and homepage.

export const IS_MARKET_SITE: boolean =
  ((import.meta as any).env?.VITE_SITE_MODE ?? '') === 'market';

export const SITE_NAME = IS_MARKET_SITE ? 'SmartKong' : 'WANKONG';

export const SITE_TAGLINE = IS_MARKET_SITE
  ? 'The Global Marketplace'
  : 'Global Creator Marketplace';

export const SITE_DESCRIPTION = IS_MARKET_SITE
  ? 'SmartKong — the global marketplace powered by Wankong. Shop music, books, audiobooks, courses and products from creators and trusted partners worldwide.'
  : 'WANKONG — the global creator marketplace. Upload, distribute and monetize music, books, audiobooks, videos and podcasts to 30+ platforms worldwide.';

// Sister-site links for cross-branding
export const WANKONG_URL   = 'https://wankong.com';
export const SMARTKONG_URL = 'https://smartkong.net';
