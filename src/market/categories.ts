// SmartKong category taxonomy — mirrors the original SmartKongMarket
// (Replit) navigation, mapped onto the shared ecom_products catalog.
// General goods match on category/genre keywords; "Digital Products"
// matches the creator product types.

export interface MarketCategory {
  slug: string;
  label: string;       // full label (nav, footer)
  short: string;       // compact label (chips, sidebar)
  keywords: string[];  // matched against category/genre/tags
  types?: string[];    // matched against product_type
}

export const MARKET_CATEGORIES: MarketCategory[] = [
  {
    slug: 'electronics', label: 'Electronics', short: 'Electronics',
    keywords: ['electronic', 'phone', 'computer', 'audio', 'camera', 'tv', 'gadget', 'headphone'],
  },
  {
    slug: 'automotive', label: 'Automotive & Vehicles', short: 'Automotive',
    keywords: ['automotive', 'car', 'vehicle', 'motorcycle', 'truck', 'auto part'],
  },
  {
    slug: 'machinery', label: 'Machinery & Equipment', short: 'Machinery',
    keywords: ['machinery', 'equipment', 'industrial', 'tool', 'construction', 'agricultural'],
  },
  {
    slug: 'fashion', label: 'Fashion & Accessories', short: 'Fashion',
    keywords: ['fashion', 'clothing', 'apparel', 'shoe', 'watch', 'jewelry', 'bag', 'accessor'],
  },
  {
    slug: 'digital', label: 'Digital Products', short: 'Digital',
    keywords: [],
    types: ['Book', 'Music', 'Audiobook', 'Video', 'Podcast', 'Course', 'Article'],
  },
  {
    slug: 'health', label: 'Health & Beauty', short: 'Health',
    keywords: ['health', 'beauty', 'fitness', 'wellness', 'skincare', 'supplement'],
  },
  {
    slug: 'home', label: 'Home & Living', short: 'Home',
    keywords: ['home', 'kitchen', 'furniture', 'garden', 'decor', 'appliance'],
  },
];

export function categoryBySlug(slug?: string | null): MarketCategory | undefined {
  return MARKET_CATEGORIES.find(c => c.slug === slug);
}

/**
 * Builds the PostgREST `.or()` expression for a category. Returns null for
 * unknown slugs (no filtering).
 */
export function categoryOrExpression(category: MarketCategory): string {
  const parts: string[] = [];
  for (const type of category.types ?? []) parts.push(`product_type.eq.${type}`);
  for (const kw of category.keywords) {
    parts.push(`category.ilike.%${kw}%`);
    parts.push(`genre.ilike.%${kw}%`);
  }
  return parts.join(',');
}
