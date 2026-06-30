import React, { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { formatCurrency, formatNumber } from '@/lib/constants';
import { getCreatorSocialStatus } from '@/services/socialPublisher';
import { supabase } from '@/lib/supabase';

interface RecentProduct {
  id: string;
  title: string;
  product_type: string;
  price_cents: number;
  cover_url: string | null;
  created_at: string;
}

interface RecentTx {
  id: string;
  description: string;
  amount_cents: number;
  type: string;
  status: string;
  created_at: string;
}

export default function CreatorDashboard() {
  const { user, wallet, setCurrentPage } = useApp();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [socialItems, setSocialItems] = useState<Awaited<ReturnType<typeof getCreatorSocialStatus>>>([]);

  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [recentTxs,      setRecentTxs]      = useState<RecentTx[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      const uid = session.user.id;
      getCreatorSocialStatus(uid).then(setSocialItems).catch(() => {});

      // Recent content
      supabase
        .from('ecom_products')
        .select('id, title, product_type, price_cents, cover_url, created_at')
        .eq('vendor_id', uid)
        .order('created_at', { ascending: false })
        .limit(5)
        .then(({ data }) => { if (data) setRecentProducts(data as RecentProduct[]); });

      // Recent transactions
      supabase
        .from('creator_earnings')
        .select('id, description, amount_cents, type, status, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(5)
        .then(({ data }) => { if (data) setRecentTxs(data as RecentTx[]); });
    });
  }, []);

  const earningsData = [
    { label: 'Available', value: wallet.available, color: 'bg-emerald-500', textColor: 'text-emerald-400' },
    { label: 'Pending', value: wallet.pending, color: 'bg-amber-500', textColor: 'text-amber-400' },
    { label: 'Subscriptions', value: wallet.subscriptions, color: 'bg-[#9D4EDD]', textColor: 'text-[#B794F4]' },
    { label: 'Tips', value: wallet.tips, color: 'bg-pink-500', textColor: 'text-pink-400' },
    { label: 'Distributions', value: wallet.distributions, color: 'bg-blue-500', textColor: 'text-blue-400' },
    { label: 'Competitions', value: wallet.competitions, color: 'bg-purple-500', textColor: 'text-purple-400' },
  ];

  const totalEarnings = earningsData.reduce((sum, e) => sum + e.value, 0);
  const chartBars = [65, 80, 45, 90, 70, 85, 95, 60, 75, 88, 92, 78];
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.displayName ?? 'Creator'}</h1>
          <p className="text-gray-400 mt-1">Here's your creator performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map(range => (
              <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${timeRange === range ? 'bg-[#9D4EDD] text-white' : 'text-gray-400 hover:text-white'}`}>
                {range}
              </button>
            ))}
          </div>
          <button onClick={() => setCurrentPage('upload')} className="bg-[#9D4EDD] hover:bg-[#7C3AED] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Upload
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {earningsData.map(stat => (
          <div key={stat.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${stat.color}`} />
              <span className="text-xs text-gray-400">{stat.label}</span>
            </div>
            <p className={`text-xl font-bold ${stat.textColor}`}>{formatCurrency(stat.value)}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-[#9D4EDD]/20 to-purple-600/20 border border-[#9D4EDD]/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-400">Total Earnings</p>
          <p className="text-3xl font-bold text-white">{formatCurrency(totalEarnings)}</p>
        </div>
        <button onClick={() => setCurrentPage('wallet')} className="bg-[#9D4EDD] hover:bg-[#7C3AED] text-white font-medium px-6 py-3 rounded-xl transition-colors">
          Withdraw Funds
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Revenue Overview</h3>
          <div className="flex items-end gap-2 h-48">
            {chartBars.map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gray-800 rounded-t-sm overflow-hidden" style={{ height: '100%' }}>
                  <div className="w-full bg-gradient-to-t from-[#9D4EDD] to-[#B794F4] rounded-t-sm transition-all duration-500" style={{ height: `${height}%`, marginTop: `${100 - height}%` }} />
                </div>
                <span className="text-[10px] text-gray-500">{months[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Quick Stats</h3>
          <div className="space-y-4">
            {[
              { label: 'Total Views', value: '1.2M', change: '+12.5%', up: true },
              { label: 'Subscribers', value: '8,456', change: '+5.2%', up: true },
              { label: 'Content Items', value: '47', change: '+3', up: true },
              { label: 'Avg. Rating', value: '4.8/5', change: '+0.2', up: true },
              { label: 'Competition Rank', value: '#3', change: '+2', up: true },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{stat.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{stat.value}</span>
                  <span className={`text-xs ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}>{stat.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Recent Content</h3>
          <button onClick={() => setCurrentPage('marketplace')} className="text-sm text-[#B794F4] hover:text-[#C9B3F5]">View All</button>
        </div>
        <div className="divide-y divide-gray-800">
          {recentProducts.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No content uploaded yet.</div>
          ) : recentProducts.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-800/30 transition-colors">
              {item.cover_url ? (
                <img src={item.cover_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[#9D4EDD]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#B794F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.title}</p>
                <p className="text-xs text-gray-400 capitalize">{item.product_type}</p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400">{item.created_at?.slice(0, 10)}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${(item.price_cents ?? 0) > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-300'}`}>
                {(item.price_cents ?? 0) > 0 ? formatCurrency(item.price_cents / 100) : 'Free'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Social Distribution Status */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Social Distribution Status</h3>
            <p className="text-xs text-gray-400 mt-0.5">Approved competition submissions distributed to social platforms</p>
          </div>
          <button onClick={() => setCurrentPage('competitions')} className="text-sm text-[#B794F4] hover:text-[#C9B3F5]">View Competitions</button>
        </div>
        {socialItems.length > 0 ? (
          <div className="divide-y divide-gray-800">
            {socialItems.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-800/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-xs text-gray-400">
                    Published {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(['youtube', 'facebook', 'instagram', 'twitter'] as const).map(platform => {
                    const url = item.socialUrls[platform];
                    const icons: Record<string, string> = {
                      youtube: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
                      facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
                      instagram: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
                      twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
                    };
                    return (
                      <a
                        key={platform}
                        href={url || '#'}
                        target={url ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        title={platform}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${url ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'}`}
                        onClick={e => !url && e.preventDefault()}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d={icons[platform]} /></svg>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-gray-400 text-sm">No approved submissions distributed yet</p>
            <p className="text-gray-500 text-xs mt-1">Win a competition to get your work on YouTube, Facebook, Instagram & Twitter</p>
          </div>
        )}
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Recent Transactions</h3>
          <button onClick={() => setCurrentPage('wallet')} className="text-sm text-[#B794F4] hover:text-[#C9B3F5]">View All</button>
        </div>
        <div className="divide-y divide-gray-800">
          {recentTxs.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No transactions yet.</div>
          ) : recentTxs.map(tx => {
            const isCredit = (tx.amount_cents ?? 0) >= 0;
            return (
              <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCredit ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    <svg className={`w-4 h-4 ${isCredit ? 'text-emerald-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCredit ? 'M7 11l5-5m0 0l5 5m-5-5v12' : 'M17 13l-5 5m0 0l-5-5m5 5V6'} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{tx.description ?? 'Transaction'}</p>
                    <p className="text-xs text-gray-400 capitalize">{(tx.type ?? 'earnings').replace('_', ' ')} · {tx.created_at?.slice(0, 10)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${isCredit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isCredit ? '+' : ''}{formatCurrency((tx.amount_cents ?? 0) / 100)}
                  </p>
                  <span className={`text-xs ${tx.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>{tx.status ?? 'pending'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
