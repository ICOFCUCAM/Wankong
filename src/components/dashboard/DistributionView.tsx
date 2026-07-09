import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Release {
  id:           string;
  title:        string;
  artist_name:  string;
  cover_url:    string | null;
  upc:          string | null;
  status:       string;
  track_count:  number;
  release_date: string | null;
  created_at:   string;
}

interface PlatformRow {
  platform: string;
  streams:  number;
  revenue:  number;
  status:   string;
}

const STATUS_COLORS: Record<string, string> = {
  distributed: 'bg-emerald-500/20 text-emerald-400',
  approved:    'bg-emerald-500/20 text-emerald-400',
  submitted:   'bg-amber-500/20  text-amber-400',
  pending:     'bg-amber-500/20  text-amber-400',
  live:        'bg-emerald-500/20 text-emerald-400',
  processing:  'bg-amber-500/20  text-amber-400',
  draft:       'bg-gray-500/20   text-gray-400',
  rejected:    'bg-red-500/20    text-red-400',
};

function fmtUSD(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DistributionView() {
  const { user } = useAuth();
  const [releases,   setReleases]   = useState<Release[]>([]);
  const [platforms,  setPlatforms]  = useState<PlatformRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [totalStats, setTotalStats] = useState({ releases: 0, streams: 0, revenue: 0 });

  useEffect(() => {
    if (!user) return;
    loadData(user.id);
  }, [user]);

  const loadData = async (uid: string) => {
    setLoading(true);

    // Fetch releases
    const { data: relData } = await supabase
      .from('distribution_releases')
      .select('id, title, artist_name, cover_url, upc, status, release_date, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);

    const releaseList: Release[] = (relData ?? []).map((r: any) => ({
      id:           r.id,
      title:        r.title,
      artist_name:  r.artist_name ?? '',
      cover_url:    r.cover_url ?? null,
      upc:          r.upc ?? null,
      status:       r.status ?? 'draft',
      track_count:  r.track_count ?? 0,
      release_date: r.release_date ?? null,
      created_at:   r.created_at,
    }));
    setReleases(releaseList);

    // Count tracks per release if track_count not stored
    if (releaseList.length > 0) {
      const ids = releaseList.map(r => r.id);
      const { data: trackCounts } = await supabase
        .from('tracks')
        .select('release_id')
        .in('release_id', ids);
      const countMap: Record<string, number> = {};
      (trackCounts ?? []).forEach((t: any) => {
        countMap[t.release_id] = (countMap[t.release_id] ?? 0) + 1;
      });
      setReleases(prev => prev.map(r => ({ ...r, track_count: countMap[r.id] ?? r.track_count })));
    }

    // Fetch platform distribution stats from stream_events if available
    const { data: streamData } = await supabase
      .from('stream_events')
      .select('platform, revenue_cents')
      .eq('user_id', uid);

    if (streamData && streamData.length > 0) {
      const map: Record<string, { streams: number; revenue: number }> = {};
      streamData.forEach((e: any) => {
        const p = e.platform ?? 'Other';
        if (!map[p]) map[p] = { streams: 0, revenue: 0 };
        map[p].streams  += 1;
        map[p].revenue  += e.revenue_cents ?? 0;
      });
      const rows: PlatformRow[] = Object.entries(map)
        .sort((a, b) => b[1].streams - a[1].streams)
        .map(([platform, d]) => ({ platform, streams: d.streams, revenue: d.revenue, status: 'live' }));
      setPlatforms(rows);

      const totalStreams  = rows.reduce((s, r) => s + r.streams, 0);
      const totalRevenue  = rows.reduce((s, r) => s + r.revenue, 0);
      setTotalStats({ releases: releaseList.length, streams: totalStreams, revenue: totalRevenue });
    } else {
      // No stream events — show release count only
      setTotalStats({ releases: releaseList.length, streams: 0, revenue: 0 });
      setPlatforms([]);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Distribution</h1>
          <p className="text-gray-400 mt-1">Manage your music releases across 30+ platforms</p>
        </div>
        <Link
          to="/dashboard/distribution/upload-release"
          className="bg-[#9D4EDD] hover:bg-[#7C3AED] text-white font-medium px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Release
        </Link>
      </div>

      {/* Summary stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Total Releases', value: String(totalStats.releases), color: 'text-[#B794F4]' },
            { label: 'Total Streams',  value: fmtNum(totalStats.streams),  color: 'text-purple-400' },
            { label: 'Distribution Revenue', value: fmtUSD(totalStats.revenue), color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Releases list */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-semibold text-white">Your Releases</h3>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-800">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-white/5 rounded w-1/3" />
                  <div className="h-2.5 bg-white/5 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : releases.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            <p>No releases yet.</p>
            <Link to="/dashboard/distribution/upload-release" className="text-[#B794F4] hover:underline mt-2 inline-block">
              Upload your first release →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {releases.map(r => (
              <div key={r.id} className="flex items-center gap-4 p-4 hover:bg-gray-800/30 transition-colors">
                {r.cover_url ? (
                  <img src={r.cover_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#9D4EDD] to-purple-600 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{r.title}</p>
                  <p className="text-xs text-gray-400">
                    {r.track_count > 0 ? `${r.track_count} track${r.track_count !== 1 ? 's' : ''} · ` : ''}
                    {r.upc ? r.upc : 'No UPC'}
                  </p>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-xs text-gray-500">{r.release_date ?? r.created_at?.slice(0, 10)}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize shrink-0 ${STATUS_COLORS[r.status] ?? STATUS_COLORS.draft}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform performance */}
      {platforms.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Platform Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="p-4 text-left">Platform</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-right">Streams</th>
                  <th className="p-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {platforms.map(p => (
                  <tr key={p.platform} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-4 text-sm font-medium text-white">{p.platform}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[p.status] ?? STATUS_COLORS.live}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right text-sm text-gray-300">
                      {p.streams > 0 ? fmtNum(p.streams) : '—'}
                    </td>
                    <td className="p-4 text-right text-sm text-emerald-400">
                      {p.revenue > 0 ? fmtUSD(p.revenue) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
