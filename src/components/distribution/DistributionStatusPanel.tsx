import { useDistributionStatus, type DistributionRelease } from '@/hooks/useDistributionStatus';
import { CheckCircle, Clock, XCircle, Zap, Globe, AlertCircle, Music } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bg: string }> = {
  draft:                       { label: 'Draft',             color: 'text-gray-400',    icon: <Clock className="w-4 h-4" />,        bg: 'bg-gray-500/10'  },
  pending_admin_review:        { label: 'Pending Review',    color: 'text-[#FFB800]',   icon: <AlertCircle className="w-4 h-4" />,  bg: 'bg-[#FFB800]/10' },
  approved_for_distribution:   { label: 'Approved',          color: 'text-[#00F5A0]',   icon: <CheckCircle className="w-4 h-4" />,  bg: 'bg-[#00F5A0]/10' },
  submitted_to_ditto:          { label: 'Submitted to Ditto',color: 'text-[#00D9FF]',   icon: <Zap className="w-4 h-4" />,          bg: 'bg-[#00D9FF]/10' },
  live:                        { label: 'Live',               color: 'text-[#00F5A0]',   icon: <Globe className="w-4 h-4" />,        bg: 'bg-[#00F5A0]/10' },
  rejected:                    { label: 'Rejected',           color: 'text-red-400',     icon: <XCircle className="w-4 h-4" />,      bg: 'bg-red-500/10'   },
  priority_distribution_queue: { label: '⭐ Winner Release', color: 'text-[#FFB800]',   icon: <Zap className="w-4 h-4" />,          bg: 'bg-[#FFB800]/10' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['draft'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function ReleaseRow({ r }: { r: DistributionRelease }) {
  const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString() : '—';
  return (
    <div className="flex items-start gap-4 p-4 bg-[#0B0814] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
      {/* Artwork */}
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
        {r.track?.artwork_url
          ? <img src={r.track.artwork_url} alt="" className="w-full h-full object-cover" />
          : <Music className="w-5 h-5 text-white/40" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-white font-semibold text-sm truncate">{r.track?.title ?? 'Untitled'}</p>
          <StatusBadge status={r.status} />
          {r.is_winner_release && (
            <span className="text-[9px] font-black px-1.5 py-0.5 bg-[#FFB800] text-black rounded uppercase">Winner</span>
          )}
        </div>
        <p className="text-xs text-gray-500">{r.track?.genre ?? 'Unknown genre'}</p>
        {r.admin_note && (
          <p className="mt-1 text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded px-2 py-1">{r.admin_note}</p>
        )}
      </div>

      {/* Dates */}
      <div className="shrink-0 text-right text-xs text-gray-500 space-y-0.5">
        <p>Submitted: <span className="text-gray-400">{fmt(r.submitted_at)}</span></p>
        {r.approved_at && <p>Approved: <span className="text-[#00F5A0]">{fmt(r.approved_at)}</span></p>}
        {r.live_at     && <p>Live: <span className="text-[#00D9FF]">{fmt(r.live_at)}</span></p>}
        {r.ditto_release_id && <p className="text-[10px] text-gray-600 font-mono">{r.ditto_release_id}</p>}
      </div>
    </div>
  );
}

export default function DistributionStatusPanel({ trackId }: { trackId?: string }) {
  const { releases, loading } = useDistributionStatus(trackId);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div className="text-center py-10">
        <Globe className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No releases submitted yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {releases.map(r => <ReleaseRow key={r.id} r={r} />)}
    </div>
  );
}
