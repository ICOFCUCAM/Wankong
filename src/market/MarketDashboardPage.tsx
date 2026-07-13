import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Seo from '@/components/Seo';
import MarketLayout from './MarketLayout';
import { Reveal } from './motion';
import { useWishlist } from './useWishlist';
import {
  Package, Heart, Wallet, Store, Sparkles, ArrowRight, ShieldCheck, Crown,
  Truck, Plug, GitCompare, ShoppingBag,
} from 'lucide-react';

interface Order { id: string; items: any; total_cents: number; payment_status: string; fulfillment_status: string; created_at: string }

const money = (c: number) => `$${((c ?? 0) / 100).toFixed(2)}`;
const itemCount = (items: any) => Array.isArray(items) ? items.reduce((n, i) => n + (i.quantity ?? 1), 0) : 0;

function StatTile({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tint}`}><Icon className="w-5 h-5" /></div>
      <p className="text-2xl font-black tracking-tight text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function ActionRow({ to, icon: Icon, title, sub }: { to: string; icon: any; title: string; sub: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:-translate-y-0.5 transition-all">
      <span className="w-10 h-10 rounded-xl bg-[var(--sk-mist)] flex items-center justify-center text-blue-600 shrink-0"><Icon className="w-5 h-5" /></span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

// SmartKong account home — a commerce dashboard (orders, selling, affiliate
// engine), not the Wankong creator studio. Routed only in market mode.
export default function MarketDashboardPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { count: wishCount } = useWishlist();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = (user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'there').split(' ')[0];

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    supabase.from('ecom_orders')
      .select('id, items, total_cents, payment_status, fulfillment_status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { setOrders((data ?? []) as Order[]); setLoading(false); });
  }, [user?.id]);

  const spent = orders.reduce((s, o) => s + (o.payment_status === 'paid' ? o.total_cents : 0), 0);
  const statusTint = (s: string) =>
    s === 'delivered' || s === 'fulfilled' ? 'text-emerald-600 bg-emerald-50'
    : s === 'shipped' ? 'text-blue-600 bg-blue-50'
    : 'text-amber-600 bg-amber-50';

  return (
    <MarketLayout>
      <Seo title="Your account" noIndex />
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-10">
        <Reveal>
          <span className="sk-eyebrow mb-2">Your account</span>
          <h1 className="text-3xl md:text-4xl font-black tracking-[-0.02em] text-gray-900">
            Welcome back, <span className="sk-serif sk-aurora-text pr-1">{firstName}.</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track orders, manage what you sell, and keep shopping the world.</p>
        </Reveal>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile icon={Package} label="Orders" value={String(orders.length)} tint="bg-blue-50 text-blue-600" />
          <StatTile icon={Heart} label="Wishlist" value={String(wishCount)} tint="bg-rose-50 text-rose-500" />
          <StatTile icon={Wallet} label="Total spent" value={money(spent)} tint="bg-emerald-50 text-emerald-600" />
          <StatTile icon={Sparkles} label="Membership" value="Free" tint="bg-violet-50 text-violet-600" />
        </div>

        <div className="mt-8 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-start">
          {/* Orders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Recent orders</h2>
              <Link to="/shop" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Keep shopping</Link>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {loading ? (
                <div className="p-6 space-y-3">{[0, 1, 2].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />)}</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-14 px-6">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--sk-mist)] flex items-center justify-center mx-auto mb-3"><ShoppingBag className="w-6 h-6 text-blue-500" /></div>
                  <p className="text-gray-900 font-semibold">No orders yet</p>
                  <p className="text-gray-500 text-sm mt-1 mb-4">Everything you buy across every store shows up here.</p>
                  <Link to="/shop" className="inline-block px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: 'var(--sk-aurora)' }}>Browse products</Link>
                </div>
              ) : orders.map((o, i) => (
                <div key={o.id} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <span className="w-10 h-10 rounded-xl bg-[var(--sk-mist)] flex items-center justify-center text-blue-600 shrink-0"><Truck className="w-5 h-5" /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{itemCount(o.items)} item{itemCount(o.items) === 1 ? '' : 's'} · {money(o.total_cents)}</p>
                    <p className="text-xs text-gray-400">{o.created_at?.slice(0, 10)}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${statusTint(o.fulfillment_status || o.payment_status)}`}>
                    {o.fulfillment_status || o.payment_status || 'pending'}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <ActionRow to="/wishlist" icon={Heart} title="Wishlist" sub={`${wishCount} saved`} />
              <ActionRow to="/compare" icon={GitCompare} title="Compare" sub="Side-by-side picks" />
              <ActionRow to="/ai-solver" icon={Sparkles} title="Ask the AI" sub="Describe what you need" />
              <ActionRow to="/shop" icon={ShoppingBag} title="Browse everything" sub="The full catalog" />
            </div>
          </div>

          {/* Right rail: selling + admin */}
          <div className="space-y-6">
            {/* Sell */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-violet-500/25" style={{ background: 'var(--sk-aurora)' }}><Store className="w-5 h-5" /></div>
              <h3 className="text-lg font-bold text-gray-900">Sell on SmartKong</h3>
              <p className="text-sm text-gray-500 mt-1 mb-4">List your products once and reach millions of AI-guided shoppers across 230 countries.</p>
              <div className="space-y-2">
                <ActionRow to="/dashboard/vendor" icon={Package} title="Seller dashboard" sub="Products, sales & payouts" />
                <ActionRow to="/vendor/register" icon={Store} title="Open a store" sub="Become a seller" />
                <ActionRow to="/affiliate" icon={Plug} title="Partner program" sub="Promote any product, earn commission" />
              </div>
            </div>

            {/* Admin / affiliate engine — only for admins */}
            {isAdmin && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="w-11 h-11 rounded-2xl bg-gray-900 text-white flex items-center justify-center mb-4"><ShieldCheck className="w-5 h-5" /></div>
                <h3 className="text-lg font-bold text-gray-900">Admin</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Run the marketplace, affiliate networks and the team.</p>
                <div className="space-y-2">
                  <ActionRow to="/admin/affiliates" icon={Plug} title="Affiliate engine" sub="Networks, bulk import & auto-sync" />
                  <ActionRow to="/admin" icon={ShieldCheck} title="Admin dashboard" sub="Vendors, moderation & more" />
                  {isSuperAdmin && <ActionRow to="/admin/super" icon={Crown} title="Super Admin" sub="Promote admins across platforms" />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MarketLayout>
  );
}
