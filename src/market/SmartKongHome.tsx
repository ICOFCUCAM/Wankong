import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import MarketProductCard from './MarketProductCard';
import { useMarketCatalog, type CatalogFilters } from './useMarketCatalog';
import { MARKET_CATEGORIES, categoryBySlug } from './categories';
import { Reveal } from './motion';
import { Search, Sparkles, Loader2 } from 'lucide-react';

// SmartKong catalog browser — /shop and /category/:slug. The premium hero
// lives on the landing page (SmartKongLanding); this is the filter sidebar +
// product grid experience.

function FilterSidebar({
  filters, setFilters,
}: {
  filters: CatalogFilters;
  setFilters: React.Dispatch<React.SetStateAction<CatalogFilters>>;
}) {
  const navigate = useNavigate();
  const maxPrice = filters.maxPriceUsd ?? 200000;

  return (
    <aside className="bg-white border border-gray-200 rounded-xl p-5 h-fit lg:sticky lg:top-32 space-y-6">
      {/* Search within results */}
      <div>
        <p className="text-sm font-bold text-gray-900 mb-2">Search products…</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={filters.search ?? ''}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search products…"
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <p className="text-sm font-bold text-gray-900 mb-2">Category</p>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="radio" name="cat" checked={!filters.category}
              onChange={() => setFilters(f => ({ ...f, category: undefined }))}
              className="accent-blue-600"
            />
            All Categories
          </label>
          {MARKET_CATEGORIES.map(c => (
            <label key={c.slug} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="radio" name="cat" checked={filters.category === c.slug}
                onChange={() => setFilters(f => ({ ...f, category: c.slug }))}
                className="accent-blue-600"
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <p className="text-sm font-bold text-gray-900 mb-3">Price Range</p>
        <input
          type="range" min={0} max={200000} step={100}
          value={maxPrice}
          onChange={e => setFilters(f => ({ ...f, maxPriceUsd: Number(e.target.value) }))}
          className="w-full accent-blue-600"
        />
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>$0</span>
          <span>{maxPrice >= 200000 ? '$200,000+' : `$${maxPrice.toLocaleString()}`}</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer mt-3">
          <input
            type="checkbox" checked={!!filters.freeOnly}
            onChange={e => setFilters(f => ({ ...f, freeOnly: e.target.checked }))}
            className="accent-blue-600"
          />
          Free only
        </label>
      </div>

      {/* Rating */}
      <div>
        <p className="text-sm font-bold text-gray-900 mb-2">Rating</p>
        <div className="space-y-1.5">
          {[
            { value: 0, label: 'All Ratings' },
            { value: 3, label: '3★ & up' },
            { value: 4, label: '4★ & up' },
          ].map(r => (
            <label key={r.value} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="radio" name="rating"
                checked={(filters.minRating ?? 0) === r.value}
                onChange={() => setFilters(f => ({ ...f, minRating: r.value || undefined }))}
                className="accent-blue-600"
              />
              {r.value > 0 && <span className="text-amber-400">★</span>}
              {r.label}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={() => { setFilters({ sort: 'relevance' }); navigate('/'); }}
        className="w-full py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors"
      >
        Clear Filters
      </button>
    </aside>
  );
}

export default function SmartKongHome() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';

  const [filters, setFilters] = useState<CatalogFilters>({
    sort: 'relevance',
    category: slug,
    search: urlQuery || undefined,
  });

  // Keep filters in sync with the route (/category/:slug and /?q=)
  useEffect(() => { setFilters(f => ({ ...f, category: slug })); }, [slug]);
  useEffect(() => { setFilters(f => ({ ...f, search: urlQuery || undefined })); }, [urlQuery]);

  const { products, total, loading, loadingMore, hasMore, loadMore, error } = useMarketCatalog(filters);
  const activeCategory = categoryBySlug(slug);

  return (
    <MarketLayout>
      <Seo
        title={activeCategory ? activeCategory.label : undefined}
        description="Search across global affiliate networks and trusted vendors. Find the best deals on digital and physical products with AI-powered recommendations."
      />

      {/* Meridian shop band — editorial header for the catalog */}
      <div className="relative border-b border-gray-100 bg-[var(--sk-mist)] overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full opacity-20 blur-3xl" style={{ background: 'var(--sk-aurora)' }} />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-12 md:py-16">
          <Reveal>
            <span className="sk-eyebrow mb-4">
              {urlQuery ? 'AI Search' : activeCategory ? activeCategory.label : 'The Catalog'}
            </span>
            <h1 className="text-4xl md:text-6xl font-black tracking-[-0.03em] leading-[0.98] text-[var(--sk-ink)]">
              {urlQuery ? (
                <>Results for <span className="sk-serif sk-aurora-text pr-1">“{urlQuery}”</span></>
              ) : activeCategory ? (
                <>{activeCategory.label.split(' ').slice(0, -1).join(' ')}{' '}<span className="sk-serif sk-aurora-text pr-1">{activeCategory.label.split(' ').slice(-1)}</span></>
              ) : (
                <>Every product. <span className="sk-serif sk-aurora-text pr-1">One search.</span></>
              )}
            </h1>
            <p className="mt-4 max-w-xl text-base text-gray-500 leading-relaxed">
              {loading ? 'Searching the world’s shelves…' : `${total.toLocaleString()} products from global affiliate networks and trusted vendors — filtered, ranked and ready to compare.`}
            </p>
          </Reveal>
        </div>
      </div>

      <div id="products" className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
          <FilterSidebar filters={filters} setFilters={setFilters} />

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {urlQuery ? `Results for “${urlQuery}”` : activeCategory ? activeCategory.label : 'All Products'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {loading ? 'Loading…' : `Showing ${products.length} of ${total} products`}
                </p>
              </div>
              <select
                value={filters.sort ?? 'relevance'}
                onChange={e => setFilters(f => ({ ...f, sort: e.target.value as CatalogFilters['sort'] }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Newest</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm mb-6">
                Could not load products: {error}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-2xl overflow-hidden animate-pulse">
                    <div className="aspect-square bg-[var(--sk-mist)]" />
                    <div className="p-3.5 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-5 bg-gray-100 rounded w-1/3 mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 rounded-3xl border border-dashed border-gray-200 bg-[var(--sk-mist)]/40">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
                  <Search className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-gray-900 font-bold text-lg">Nothing matched — <span className="sk-serif sk-aurora-text">yet.</span></p>
                <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto">Loosen a filter, or describe what you need and let the AI search the whole world for it.</p>
                <Link to="/ai-solver" className="inline-flex items-center gap-1.5 mt-5 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-lg shadow-violet-500/20" style={{ background: 'var(--sk-aurora)' }}>
                  <Sparkles className="w-4 h-4" /> Ask the AI instead
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                  {products.map((p, i) => (
                    <Reveal key={p.id} delay={Math.min(i, 7) * 45}>
                      <MarketProductCard product={p} />
                    </Reveal>
                  ))}
                </div>
                {hasMore && (
                  <div className="text-center mt-10">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-8 py-3 border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                      Load more ({total - products.length} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </MarketLayout>
  );
}
