import { useNavigate } from 'react-router-dom';
import { Play, Trophy } from 'lucide-react';
import CompetitionCountdown from './CompetitionCountdown';
import DefaultPerformanceThumbnail from '@/components/media/DefaultPerformanceThumbnail';

export interface RoomCardData {
  id:           string;
  title:        string;
  category:     string | null;
  description?: string | null;
  prize_info?:  string | null;
  prize_amount?: number | null;
  entry_count?: number | null;
  deadline?:    string | null;
  close_at?:    string | null;
  banner_url?:  string | null;
  status:       string;
  gradient?:    string;
}

interface Props {
  room:       RoomCardData;
  onEnter?:   (room: RoomCardData) => void;
}

/**
 * Full competition room card.
 * - Thumbnail background (banner or DefaultPerformanceThumbnail)
 * - Prize badge, OPEN/LIVE badge, entry count
 * - CompetitionCountdown
 * - Enter Room / Vote Now CTA
 */
export default function CompetitionRoomCard({ room, onEnter }: Props) {
  const navigate = useNavigate();
  const deadline = room.deadline ?? room.close_at ?? null;
  const prize    = room.prize_info ?? (room.prize_amount ? `$${room.prize_amount.toLocaleString()}` : null);

  const handleCTA = () => {
    if (onEnter) { onEnter(room); return; }
    navigate(`/talent-arena/room/${room.id}`);
  };

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-lg shadow-black/40
                 hover:border-[#9D4EDD]/40 hover:scale-[1.02] transition-all duration-300 group flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative h-40 overflow-hidden flex-shrink-0">
        {room.banner_url ? (
          <img
            src={room.banner_url}
            alt={room.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="relative w-full h-full">
            <DefaultPerformanceThumbnail
              gradient={room.gradient ?? 'from-[#9D4EDD]/40 to-[#00D9FF]/20'}
              label={room.title}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0814]/90 via-[#0B0814]/20 to-transparent" />

        {/* Status badge */}
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00F5A0]/20 text-[#00F5A0] border border-[#00F5A0]/30 font-bold">
            ● LIVE
          </span>
        </div>

        {/* Prize badge */}
        {prize && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-[#FFB800] text-[#0B0814] text-[10px] font-black px-2 py-0.5 rounded-lg">
            <Trophy className="w-2.5 h-2.5" />
            {prize}
          </div>
        )}

        {/* Play watermark */}
        <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center">
            <Play className="w-3 h-3 text-white fill-white ml-px" />
          </div>
          <span className="text-white/60 text-[10px]">{room.entry_count ?? 0} entries</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-white text-sm leading-tight line-clamp-2">{room.title}</h3>
            {room.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#9D4EDD]/10 text-[#9D4EDD] border border-[#9D4EDD]/20 font-medium whitespace-nowrap shrink-0">
                {room.category}
              </span>
            )}
          </div>
          {room.description && (
            <p className="text-gray-400 text-xs line-clamp-2">{room.description}</p>
          )}
        </div>

        {/* Countdown */}
        {deadline && (
          <div>
            <p className="text-gray-600 text-[10px] mb-1">Closes in</p>
            <CompetitionCountdown deadline={deadline} />
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={handleCTA}
            className="flex-1 py-2 bg-gradient-to-r from-[#9D4EDD] to-[#00D9FF] text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Enter Room
          </button>
          <button
            onClick={() => navigate('/talent-arena/upload')}
            className="px-3 py-2 bg-white/5 border border-white/10 text-gray-300 rounded-xl text-xs hover:bg-white/10 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
