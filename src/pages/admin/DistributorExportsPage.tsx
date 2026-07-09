import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Package, Archive, ChevronDown, ChevronUp, ExternalLink, Radio } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExportRow {
  id:              string;
  release_id:      string;
  distributor:     string;
  export_status:   string;
  export_payload:  Record<string, unknown> | null;
  file_bundle_url: string | null;
  created_at:      string;
  updated_at:      string;
  admin_id:        string | null;
  // joined
  release_title?:  string;
  artist_name?:    string;
  release_type?:   string;
  cover_url?:      string | null;
}

// ── Status config ─────────────────────────────────────────────────────────────

const EXPORT_STATUS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pending',    color: '#9ca3af' },
  processing: { label: 'Processing', color: '#60a5fa' },
  submitted:  { label: 'Submitted',  color: '#9D4EDD' },
  failed:     { label: 'Failed',     color: '#FF4466' },
};

// ── Export row card ───────────────────────────────────────────────────────────

function ExportCard({ row }: { row: ExportRow }) {
  const [expanded, setExpanded] = useState(false);
  const si = EXPORT_STATUS[row.export_status] ?? { label: row.export_status, color: '#9ca3af' };

  const payload = row.export_payload;
  const tracklistCsv = payload?.tracklist_csv as string | undefined;

  const downloadJson = () => {
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `metadata_${row.release_id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = () => {
    if (!tracklistCsv) return;
    const blob = new Blob([tracklistCsv as string], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `tracklist_${row.release_id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/15 transition-all">
      {/* Header */}
      <div className="p-4 flex items-center gap-4">
        {/* Artwork */}
        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
          {row.cover_url
            ? <img src={row.cover_url} alt="" className="w-full h-full object-cover" />
            : <Radio className="w-5 h-5 text-white/40" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {row.release_title ?? `Release ${row.release_id.slice(0, 8)}`}
          </p>
          <p className="text-gray-500 text-xs truncate mt-0.5">
            {row.artist_name ?? '—'} · {row.release_type?.toUpperCase() ?? '—'} · {row.distributor.toUpperCase()}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: si.color + '20', color: si.color }}
            >
              {si.label}
            </span>
            <span className="text-[10px] text-gray-600">
              {new Date(row.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Download buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {payload && (
            <button
              onClick={downloadJson}
              title="Download metadata.json"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 text-[#9D4EDD] text-[11px] font-semibold rounded-lg hover:bg-[#9D4EDD]/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              JSON
            </button>
          )}
          {tracklistCsv && (
            <button
              onClick={downloadCsv}
              title="Download tracklist.csv"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00D9FF]/10 border border-[#00D9FF]/20 text-[#00D9FF] text-[11px] font-semibold rounded-lg hover:bg-[#00D9FF]/20 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              CSV
            </button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-gray-500 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded payload */}
      {expanded && payload && (
        <div className="border-t border-white/5 px-4 py-4 space-y-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Export Payload</p>

          {/* Key metadata fields */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
            {[
              ['Release Title', payload.release_title],
              ['Artist',        payload.artist_name],
              ['Genre',         payload.genre],
              ['Language',      payload.language],
              ['Release Type',  payload.release_type],
              ['Release Date',  payload.release_date],
              ['Label',         payload.label],
              ['ISRC',          payload.isrc],
              ['Copyright',     payload.copyright],
              ['Territories',   Array.isArray(payload.territories) && (payload.territories as string[]).length > 0
                ? (payload.territories as string[]).join(', ')
                : 'Worldwide'],
              ['Tracks',        String(payload.track_count ?? '—')],
              ['Exported At',   payload.exported_at ? new Date(String(payload.exported_at)).toLocaleString() : '—'],
            ].map(([k, v]) => v ? (
              <div key={k as string} className="flex flex-col">
                <span className="text-gray-600">{k}</span>
                <span className="text-gray-300 font-medium truncate">{String(v)}</span>
              </div>
            ) : null)}
          </div>

          {/* Platforms */}
          {Array.isArray(payload.platforms) && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1.5">Platforms</p>
              <div className="flex flex-wrap gap-1.5">
                {(payload.platforms as string[]).map(p => (
                  <span key={p} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-gray-400">{p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Bundle path */}
          {row.file_bundle_url && (
            <p className="text-[11px] text-gray-600 font-mono">
              Bundle: {row.file_bundle_url}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DistributorExportsPage() {
  const { user, isAdmin } = useAuth();
  const [exports,  setExports]  = useState<ExportRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<string>('all');

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0814]">
        <div className="text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-white/50">Admin access required.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('distributor_exports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!data) { setLoading(false); return; }

      // Enrich with release metadata
      const enriched = await Promise.all(
        (data as ExportRow[]).map(async row => {
          const { data: rel } = await supabase
            .from('distribution_releases')
            .select('title, artist_name, release_type, cover_url')
            .eq('id', row.release_id)
            .single();
          return {
            ...row,
            release_title: rel?.title ?? undefined,
            artist_name:   rel?.artist_name ?? undefined,
            release_type:  rel?.release_type ?? undefined,
            cover_url:     rel?.cover_url ?? null,
          };
        })
      );

      setExports(enriched);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === 'all'
    ? exports
    : exports.filter(e => e.export_status === filter);

  const counts: Record<string, number> = {
    all:        exports.length,
    pending:    exports.filter(e => e.export_status === 'pending').length,
    submitted:  exports.filter(e => e.export_status === 'submitted').length,
    processing: exports.filter(e => e.export_status === 'processing').length,
    failed:     exports.filter(e => e.export_status === 'failed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-[#00D9FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-5 h-5 text-[#00D9FF]" />
            <h2 className="text-white font-black text-xl">Export History</h2>
          </div>
          <p className="text-gray-500 text-sm">
            All releases forwarded to Ditto Music — download bundles or review payload
          </p>
        </div>
        <span className="px-3 py-1 bg-[#9D4EDD]/10 border border-[#9D4EDD]/20 text-[#9D4EDD] text-xs font-bold rounded-full">
          {exports.length} total
        </span>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {(['all', 'submitted', 'pending', 'processing', 'failed'] as const).map(s => {
          const si = s === 'all' ? { label: 'All', color: '#9ca3af' } : (EXPORT_STATUS[s] ?? { label: s, color: '#9ca3af' });
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border',
                filter === s
                  ? 'text-white border-white/20 bg-white/10'
                  : 'text-gray-500 border-white/5 bg-white/3 hover:text-white',
              ].join(' ')}
              style={filter === s ? { borderColor: `${si.color}44`, color: si.color } : {}}
            >
              {si.label}
              {counts[s] > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/10"
                  style={{ color: filter === s ? si.color : '#6b7280' }}>
                  {counts[s]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-2xl">
          <Package className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No exports yet.</p>
          <p className="text-gray-600 text-xs mt-1">Approved releases forwarded to Ditto will appear here.</p>
        </div>
      )}

      {/* Export cards */}
      <div className="space-y-3">
        {filtered.map(row => <ExportCard key={row.id} row={row} />)}
      </div>
    </div>
  );
}
