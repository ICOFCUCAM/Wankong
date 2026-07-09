import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatNumber, formatCurrency } from '@/lib/constants';
import CompetitionApprovalQueue from './CompetitionApprovalQueue';
import PlatformAccountsManager from './PlatformAccountsManager';
import ArenaDropManager from './ArenaDropManager';

interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  country: string | null;
  follower_count: number;
  verified: boolean;
}

interface Product {
  id: string;
  title: string;
  product_type: string;
  cover_url: string | null;
  vendor_id: string | null;
  status: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  user_id: string;
  amount_cents: number;
  method: string | null;
  status: string;
  created_at: string;
  profiles: { display_name: string | null; username: string | null } | null;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'content' | 'withdrawals' | 'competitions' | 'integrations'>('overview');
  const [selectedUsers,  setSelectedUsers]  = useState<Set<string>>(new Set());
  const [contentStatus,  setContentStatus]  = useState<Record<string, string>>({});
  const [withdrawalStatus, setWithdrawalStatus] = useState<Record<string, string>>({});

  const [users,       setUsers]       = useState<Profile[]>([]);
  const [products,    setProducts]    = useState<Product[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading,     setLoading]     = useState(false);

  const [stats, setStats] = useState({
    totalCreators: 0,
    totalContent: 0,
    totalRevenue: 0,
    activeCompetitions: 0,
    totalPayouts: 0,
    monthlyActiveUsers: 0,
    countriesServed: 0,
  });

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const approveContent = async (id: string) => {
    setContentStatus(prev => ({ ...prev, [id]: 'approved' }));
    await supabase.from('ecom_products').update({ status: 'active' }).eq('id', id);
  };
  const rejectContent = async (id: string) => {
    setContentStatus(prev => ({ ...prev, [id]: 'rejected' }));
    await supabase.from('ecom_products').update({ status: 'rejected' }).eq('id', id);
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      (async () => {
        const [creatorsRes, contentRes, revenueRes, competitionsRes, payoutsRes, usersRes] = await Promise.allSettled([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('ecom_products').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('ecom_orders').select('total_cents').eq('payment_status', 'paid'),
          supabase.from('competition_entries_v2').select('id', { count: 'exact', head: true }).in('status', ['live', 'winner']),
          supabase.from('creator_withdrawals').select('amount').eq('status', 'paid'),
          supabase.from('profiles').select('country').not('country', 'is', null),
        ]);

        const revenueData = (revenueRes.status === 'fulfilled' && revenueRes.value.data)
          ? revenueRes.value.data.reduce((s: number, r: any) => s + (r.total_cents ?? 0), 0) / 100
          : 0;

        const payoutsData = (payoutsRes.status === 'fulfilled' && payoutsRes.value.data)
          ? payoutsRes.value.data.reduce((s: number, r: any) => s + (r.amount ?? 0), 0)
          : 0;

        const countriesData = (usersRes.status === 'fulfilled' && usersRes.value.data)
          ? new Set(usersRes.value.data.map((r: any) => r.country)).size
          : 0;

        setStats({
          totalCreators:      (creatorsRes.status === 'fulfilled' && creatorsRes.value.count != null) ? creatorsRes.value.count : 0,
          totalContent:       (contentRes.status === 'fulfilled' && contentRes.value.count != null) ? contentRes.value.count : 0,
          totalRevenue:       revenueData,
          activeCompetitions: (competitionsRes.status === 'fulfilled' && competitionsRes.value.count != null) ? competitionsRes.value.count : 0,
          totalPayouts:       payoutsData,
          monthlyActiveUsers: (creatorsRes.status === 'fulfilled' && creatorsRes.value.count != null) ? creatorsRes.value.count : 0,
          countriesServed:    countriesData,
        });
      })();
    }
    if (activeTab === 'users' && users.length === 0) {
      setLoading(true);
      supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url, role, country, follower_count, verified')
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => { if (data) setUsers(data as Profile[]); setLoading(false); });
    }
    if (activeTab === 'content' && products.length === 0) {
      setLoading(true);
      supabase
        .from('ecom_products')
        .select('id, title, product_type, cover_url, vendor_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => { if (data) setProducts(data as Product[]); setLoading(false); });
    }
    if (activeTab === 'withdrawals' && withdrawals.length === 0) {
      setLoading(true);
      supabase
        .from('creator_earnings')
        .select('id, user_id, amount_cents, method, status, created_at, profiles:user_id(display_name, username)')
        .eq('type', 'payout')
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (data) setWithdrawals(data.map((w: any) => ({
            ...w,
            profiles: Array.isArray(w.profiles) ? w.profiles[0] : w.profiles,
          })) as Withdrawal[]);
          setLoading(false);
        });
    }
  }, [activeTab]);

  const tabs = [
    { id: 'overview'     as const, label: 'Overview',     icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'users'        as const, label: 'Users',        icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'content'      as const, label: 'Content',      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'withdrawals'  as const, label: 'Withdrawals',  icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'competitions' as const, label: 'Competitions', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
    { id: 'integrations' as const, label: 'Integrations', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-gray-400 mt-1">Platform management and oversight</p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-[#9D4EDD] text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Creators',      value: formatNumber(stats.totalCreators),   color: 'indigo'  },
              { label: 'Total Revenue',        value: formatCurrency(stats.totalRevenue),  color: 'emerald' },
              { label: 'Active Competitions',  value: stats.activeCompetitions.toString(), color: 'purple'  },
              { label: 'Total Users',          value: formatNumber(stats.monthlyActiveUsers), color: 'blue' },
              { label: 'Active Content',       value: formatNumber(stats.totalContent),    color: 'pink'    },
              { label: 'Total Payouts',        value: formatCurrency(stats.totalPayouts),  color: 'amber'   },
              { label: 'Countries',            value: stats.countriesServed.toString(),    color: 'rose'    },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                <p className="text-xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-white">User Management</h3>
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{selectedUsers.size} selected</span>
                <button className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-lg">Verify</button>
                <button className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg">Suspend</button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="divide-y divide-gray-800">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse bg-white/3" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-800">
                    <th className="p-4 text-left"><input type="checkbox" className="rounded" /></th>
                    <th className="p-4 text-left">User</th>
                    <th className="p-4 text-left">Role</th>
                    <th className="p-4 text-left">Country</th>
                    <th className="p-4 text-right">Followers</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">No users found.</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="p-4"><input type="checkbox" checked={selectedUsers.has(u.id)} onChange={() => toggleUser(u.id)} className="rounded" /></td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={u.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${u.id}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <p className="text-sm font-medium text-white">{u.display_name ?? u.username ?? '—'}</p>
                            <p className="text-xs text-gray-500">@{u.username ?? u.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><span className="text-xs text-gray-300 capitalize">{u.role ?? 'user'}</span></td>
                      <td className="p-4"><span className="text-xs text-gray-300">{u.country ?? '—'}</span></td>
                      <td className="p-4 text-right text-sm text-gray-300">{formatNumber(u.follower_count ?? 0)}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${u.verified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {u.verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right"><button className="text-xs text-[#B794F4] hover:text-[#C9B3F5]">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'content' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Content Moderation Queue</h3>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-800">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse bg-white/3" />)}
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {products.length === 0 ? (
                <p className="p-8 text-center text-gray-500">No content yet.</p>
              ) : products.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-800/30 transition-colors">
                  {item.cover_url
                    ? <img src={item.cover_url} alt="" className="w-16 h-12 rounded-lg object-cover" />
                    : <div className="w-16 h-12 rounded-lg bg-[#9D4EDD]/20 flex items-center justify-center shrink-0"><svg className="w-5 h-5 text-[#B794F4]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 capitalize">{item.product_type} · {item.created_at?.slice(0, 10)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {contentStatus[item.id] ? (
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${contentStatus[item.id] === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {contentStatus[item.id]}
                      </span>
                    ) : (
                      <>
                        <button onClick={() => approveContent(item.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors">Approve</button>
                        <button onClick={() => rejectContent(item.id)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors">Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Withdrawal Requests</h3>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-800">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse bg-white/3" />)}
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {withdrawals.length === 0 ? (
                <p className="p-8 text-center text-gray-500">No withdrawal requests.</p>
              ) : withdrawals.map(w => (
                <div key={w.id} className="flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{w.profiles?.display_name ?? w.profiles?.username ?? w.user_id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400">{w.method ?? 'Bank'} · {w.created_at?.slice(0, 10)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-semibold text-white">{formatCurrency((w.amount_cents ?? 0) / 100)}</p>
                    {withdrawalStatus[w.id] ? (
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${withdrawalStatus[w.id] === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {withdrawalStatus[w.id]}
                      </span>
                    ) : w.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            setWithdrawalStatus(prev => ({ ...prev, [w.id]: 'approved' }));
                            await supabase.from('creator_earnings').update({ status: 'completed' }).eq('id', w.id);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
                        >Approve</button>
                        <button
                          onClick={async () => {
                            setWithdrawalStatus(prev => ({ ...prev, [w.id]: 'rejected' }));
                            await supabase.from('creator_earnings').update({ status: 'rejected' }).eq('id', w.id);
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                        >Reject</button>
                      </div>
                    ) : (
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${w.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {w.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'competitions' && (
        <div className="space-y-4">
          <ArenaDropManager />
          <CompetitionApprovalQueue />
        </div>
      )}

      {activeTab === 'integrations' && <PlatformAccountsManager />}
    </div>
  );
}
