import { useEffect } from 'react';

/**
 * Dependency-free per-route SEO. Updates document.title and the relevant
 * meta/OG/Twitter tags on mount. Each route that renders <Seo/> overrides
 * the static defaults in index.html, so crawlers and link unfurls get
 * page-specific titles, descriptions and share images.
 */

const SITE = 'WANKONG';
const DEFAULT_DESC =
  'WANKONG — the global creator marketplace. Upload, distribute and monetize music, books, audiobooks, videos and podcasts to 30+ platforms worldwide.';
const DEFAULT_IMAGE = '/og-image.jpg';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article' | 'music.song' | 'book' | 'video.other' | 'profile';
  noIndex?: boolean;
  canonical?: string;
}

export default function Seo({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  type = 'website',
  noIndex = false,
  canonical,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE}` : `${SITE} — Global Creator Marketplace`;
    document.title = fullTitle;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = canonical ?? (typeof window !== 'undefined' ? window.location.href : '');
    const absImage = image.startsWith('http') ? image : `${origin}${image}`;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow');

    upsertMeta('property', 'og:site_name', SITE);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:image', absImage);
    if (url) upsertMeta('property', 'og:url', url);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', absImage);

    if (url) upsertLink('canonical', url);
  }, [title, description, image, type, noIndex, canonical]);

  return null;
}
