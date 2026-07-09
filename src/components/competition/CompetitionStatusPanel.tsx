import { useCompetitionStatus } from '@/hooks/useCompetitionStatus';
import { Trophy, Heart, Star, Zap, Clock, CheckCircle, XCircle, Globe } from 'lucide-react';

const STATUS_CFG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending_review: { label: 'Under Review',    color: 'text-[#FFB800]', icon: <Clock className="w-3.5 h-3.5" />        },
  approved:       { label: 'Approved',         color: 'text-[#00D9FF]', icon: <CheckCircle className="w-3.5 h-3.5" />  },
  live:           { label: 'Live',             color: 'text-[#00F5A0]', icon: <Globe className="w-3.5 h-3.5" />        },
  rejected:       { label: 'Rejected',         color: 'text-red-400',   icon: <XCircle className="w-3.5 h-3.5" />      },
  winner:         { label: '🏆 Winner',         color: 'text-[#FFB800]', icon: <Trophy className="w-3.5 h-3.5" />      },
};

export default function CompetitionStatusPanel({ userId }: { userId?: string }) {
  const { entries, loading } = useCompetitionStatus(userId);

  if (loading) return (
    <div className="space-y-3">
      {[1,2].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
    </div>
  );

  if (entries.length === 0) return (
    <div className="text-center py-10">
      <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
      <p className="text-gray-500 text-sm">No competition entries yet.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {entries.map(e => {
        const cfg = STATUS_CFG[e.status] ?? STATUS_CFG['pending_review'];
        return (
          <div key={e.id} className="p-4 bg-[#0B0814] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{e.title}</p>
                <p className="text-gray-500 text-xs">{e.category ?? 'General'}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 ${cfg.color}`}>
                {cfg.icon}{cfg.label}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/5 rounded-lg py-2">
                <p className="text-white font-bold text-sm tabular-nums">{(e.votes_count ?? 0).toLocaleString()}</p>
                <p className="text-gray-500 text-[10px] flex items-center justify-center gap-1 mt-0.5">
                  <Heart className="w-2.5 h-2.5" /> Votes
                </p>
              </div>
              <div className="bg-white/5 rounded-lg py-2">
                <p className="text-white font-bold text-sm tabular-nums">
                  {e.ai_score != null ? e.ai_score.toFixed(1) : '—'}
                </p>
                <p className="text-gray-500 text-[10px] flex items-center justify-center gap-1 mt-0.5">
                  <Star className="w-2.5 h-2.5" /> AI Score
                </p>
              </div>
              <div className="bg-white/5 rounded-lg py-2">
                <p className={`font-bold text-sm ${e.is_winner ? 'text-[#FFB800]' : 'text-gray-400'}`}>
                  {e.is_winner ? '🏆 #1' : '—'}
                </p>
                <p className="text-gray-500 text-[10px] flex items-center justify-center gap-1 mt-0.5">
                  <Trophy className="w-2.5 h-2.5" /> Rank
                </p>
              </div>
            </div>

            {/* Winner badge */}
            {e.is_winner && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-lg">
                <Zap className="w-4 h-4 text-[#FFB800] shrink-0" />
                <p className="text-xs text-[#FFB800] font-semibold">
                  Winner Release — Global Distribution queued!
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
