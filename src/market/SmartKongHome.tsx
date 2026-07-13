import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import MarketProductCard from './MarketProductCard';
import { useMarketCatalog, type CatalogFilters } from './useMarketCatalog';
import { MARKET_CATEGORIES, categoryBySlug } from './categories';
import { Search, Sparkles, TrendingUp, Store, Loader2 } from 'lucide-react';

// SmartKong homepage / category pages — the "Discover Any Product, Anywhere"
// experience from the original SmartKongMarket app: hero with AI search,
// filter sidebar (category, price range, rating), All Products grid.

function Hero() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  return (
    <section className="relative overflow-hidden bg-gray-900">
      {/* Product-collage backdrop */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(circle at 78% 30%, rgba(37,99,235,0.55), transparent 45%),' +
            'radial-gradient(circle at 90% 75%, rgba(147,51,234,0.35), transparent 40%),' +
            'radial-gradient(circle at 15% 85%, rgba(37,99,235,0.3), transparent 45%)',
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/85 to-gray-900/40" aria-hidden />

      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-16 md:py-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full text-sm text-white/85 mb-6">
            <Sparkles className="w-4 h-4 text-blue-400" /> AI-Powered Product Discovery
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Discover Any Product,<br />
            <span className="text-blue-500">Anywhere</span>
          </h1>

          <p className="text-lg text-gray-300 mb-8 max-w-xl">
            Search across global affiliate networks and trusted vendors. Find the
            best deals on digital and physical products with AI-powered recommendations.
          </p>

          <form
            onSubmit={e => { e.preventDefault(); navigate(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : '/'); }}
            className="relative max-w-xl mb-8"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search for any product…"
              className="w-full bg-white border-0 rounded-xl pl-11 pr-24 py-4 text-gray-900 placeholder-gray-400 shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => navigate(query.trim() ? `/ai-solver?q=${encodeURIComponent(query.trim())}` : '/ai-solver')}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-3 h-3" /> AI
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              <TrendingUp className="w-4 h-4" /> Explore Trending Products
            </button>
            <Link
              to="/vendor/register"
              className="flex items-center gap-2 px-6 py-3 bg-white/90 hover:bg-white text-gray-900 font-semibold rounded-xl transition-colors"
            >
              <Store className="w-4 h-4" /> Become a Vendor
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

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

      {!slug && !urlQuery && <Hero />}

      <div id="products" className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-start">
          <FilterSidebar filters={filters} setFilters={setFilters} />

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">
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
                  <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-100" />
                    <div className="p-3.5 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No products match your filters.</p>
                <Link to="/ai-solver" className="inline-flex items-center gap-1.5 mt-3 text-blue-600 hover:text-blue-700 text-sm font-semibold">
                  <Sparkles className="w-4 h-4" /> Try the AI Problem Solver instead
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
                  {products.map(p => <MarketProductCard key={p.id} product={p} />)}
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
