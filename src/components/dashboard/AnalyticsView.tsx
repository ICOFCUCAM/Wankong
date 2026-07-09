import React, { useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAnalytics, type AnalyticsPeriod } from '@/hooks/useAnalytics';
import { useAuth } from '@/contexts/AuthContext';

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtHrs(h: number): string {
  if (h >= 1000) return `${fmtNum(h)} hrs`;
  return `${h.toFixed(1)} hrs`;
}

// ── Change badge ──────────────────────────────────────────────────────────────

function ChangeBadge({ pct }: { pct: number }) {
  if (pct > 0)  return <span className="inline-flex items-center gap-0.5 text-xs text-emerald-400"><TrendingUp className="w-3 h-3" />+{pct}%</span>;
  if (pct < 0)  return <span className="inline-flex items-center gap-0.5 text-xs text-red-400"><TrendingDown className="w-3 h-3" />{pct}%</span>;
  return              <span className="inline-flex items-center gap-0.5 text-xs text-gray-500"><Minus className="w-3 h-3" />0%</span>;
}

// ── Bar chart (streams over time) ─────────────────────────────────────────────

function StreamsChart({ data, period }: { data: { date: string; count: number }[]; period: AnalyticsPeriod }) {
  if (data.length === 0) return (
    <div className="h-40 flex items-center justify-center text-gray-600 text-sm">
      No stream data yet for this period.
    </div>
  );

  const max = Math.max(...data.map(d => d.count), 1);

  // Label step: show ~4 date labels
  const step = Math.max(1, Math.floor(data.length / 4));
  const labelIdxs = new Set([0, step, step * 2, step * 3, data.length - 1]);

  return (
    <div>
      <div className="flex items-end gap-0.5 h-40">
        {data.map((d, i) => (
          <div key={d.date} className="group relative flex-1 flex flex-col justify-end" title={`${d.date}: ${d.count} streams`}>
            <div
              className="bg-[#9D4EDD]/40 hover:bg-[#9D4EDD]/70 rounded-t-sm transition-colors cursor-pointer"
              style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 2 : 0)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-500 relative">
        {data.map((d, i) => (
          <span
            key={d.date}
            className="absolute"
            style={{
              left: `${(i / (data.length - 1)) * 100}%`,
              transform: 'translateX(-50%)',
              display: labelIdxs.has(i) ? 'block' : 'none',
            }}
          >
            {d.date.slice(5)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsView() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const d = useAnalytics(period);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500 text-sm">
        Sign in to view analytics.
      </div>
    );
  }

  const METRICS = [
    {
      label: 'Total Streams',
      value: fmtNum(d.totalStreams),
      change: d.streamsChange,
      icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
    },
    {
      label: 'Watch Time',
      value: fmtHrs(d.watchTimeHrs),
      change: d.watchTimeChange,
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'New Followers',
      value: fmtNum(d.newFollowers),
      change: d.followersChange,
      icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    },
    {
      label: 'Revenue',
      value: fmtMoney(d.totalRevenue),
      change: d.revenueChange,
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      label: 'Engagement Rate',
      value: `${d.engagementRate}%`,
      change: 0,
      icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
      sub: 'non-skipped plays',
    },
    {
      label: 'Avg. Completion',
      value: `${d.avgSessionPct}%`,
      change: 0,
      icon: 'M13 10V3L4 14h7v7l9-11h-7z',
      sub: 'listen depth',
    },
  ];

  return (
    <div className="space-y-6">

      {/* Header + period selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1 text-sm">Live data from Supabase — streams, revenue, audience.</p>
        </div>
        <div className="flex items-center gap-2">
          {d.loading && <Loader2 className="w-4 h-4 text-[#B794F4] animate-spin" />}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['7d', '30d', '90d', '1y'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p ? 'bg-[#9D4EDD] text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {METRICS.map(m => (
          <div
            key={m.label}
            className={`bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors ${d.loading ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.icon} />
              </svg>
              <span className="text-xs text-gray-400">{m.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{m.value}</p>
            <div className="flex items-center gap-2 mt-1">
              <ChangeBadge pct={m.change} />
              {m.sub && <span className="text-[10px] text-gray-600">{m.sub}</span>}
              {!m.sub && <span className="text-[10px] text-gray-600">vs prev period</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Streams over time */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-1">Streams Over Time</h3>
          <p className="text-[11px] text-gray-500 mb-4">
            Source: <code className="text-[#B794F4]">stream_events</code> · filtered by your tracks
          </p>
          {d.loading
            ? <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 text-[#B794F4] animate-spin" /></div>
            : <StreamsChart data={d.streamsByDay} period={period} />
          }
        </div>

        {/* Revenue breakdown */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-1">Revenue Breakdown</h3>
          <p className="text-[11px] text-gray-500 mb-4">
            Source: <code className="text-[#B794F4]">creator_earnings</code> · grouped by category
          </p>
          {d.loading ? (
            <div className="h-40 flex items-center justify-center"><Loader2 className="w-5 h-5 text-[#B794F4] animate-spin" /></div>
          ) : d.revenueBreakdown.length === 0 ? (
            <div className="py-8 text-center text-gray-600 text-sm">No revenue recorded yet for this period.</div>
          ) : (
            <div className="space-y-3">
              {d.revenueBreakdown.map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{item.label}</span>
                    <span className="text-sm font-medium text-white">{fmtMoney(item.amount)}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${item.pct}%`, background: item.colour }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5 text-right">{item.pct}%</p>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-800 flex justify-between">
                <span className="text-xs text-gray-500">Total Revenue</span>
                <span className="text-sm font-bold text-white">{fmtMoney(d.totalRevenue)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tables row */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Top performing content */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Top Performing Tracks</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Source: <code className="text-[#B794F4]">stream_events</code> + <code className="text-[#B794F4]">artist_earnings</code>
            </p>
          </div>
          {d.loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 text-[#B794F4] animate-spin" /></div>
          ) : d.topContent.length === 0 ? (
            <div className="py-10 text-center text-gray-600 text-sm">No tracks uploaded yet.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {d.topContent.map((item, i) => (
                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-400 font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-gray-800 shrink-0 overflow-hidden">
                      {item.cover_url
                        ? <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-[#9D4EDD]/20 flex items-center justify-center text-[10px] text-[#B794F4] font-bold">{item.title[0]}</div>}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white line-clamp-1">{item.title}</p>
                      <p className="text-xs text-gray-500">{fmtNum(item.streams)} streams</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-medium text-emerald-400">{fmtMoney(item.earnings)}</p>
                    <p className="text-[10px] text-gray-600">earned</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audience by country */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Audience by Country</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Source: <code className="text-[#B794F4]">stream_events.country</code> — stream counts only, not revenue
            </p>
          </div>
          {d.loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 text-[#B794F4] animate-spin" /></div>
          ) : d.audienceByCountry.length === 0 ? (
            <div className="py-10 text-center text-gray-600 text-sm">No geographic data available yet.</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {d.audienceByCountry.map(geo => {
                const max = d.audienceByCountry[0].streams;
                const pct = max > 0 ? Math.round((geo.streams / max) * 100) : 0;
                return (
                  <div key={geo.country} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-white truncate">{geo.country}</p>
                        <p className="text-sm font-medium text-white ml-2 shrink-0">{fmtNum(geo.streams)}</p>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-[#9D4EDD]/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="p-3 text-[10px] text-gray-600 text-center">
                Stream counts only. Revenue shown in Earnings dashboard.
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
