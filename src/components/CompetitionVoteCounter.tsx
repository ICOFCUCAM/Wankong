import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface CompetitionVoteCounterProps {
  entryId: string;
  initialVotes?: number;
}

const CompetitionVoteCounter: React.FC<CompetitionVoteCounterProps> = ({
  entryId,
  initialVotes = 0,
}) => {
  const [votes, setVotes] = useState(initialVotes);
  const [pulse, setPulse] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPulse = useCallback(() => {
    setPulse(true);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setPulse(false), 600);
  }, []);

  // Fetch initial count from DB
  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      const { count, error } = await supabase
        .from('competition_votes')
        .select('*', { count: 'exact', head: true })
        .eq('entry_id', entryId);

      if (!cancelled && !error && count !== null) {
        setVotes(count);
      }
    };

    fetchCount();
    return () => { cancelled = true; };
  }, [entryId]);

  // Subscribe to realtime inserts
  useEffect(() => {
    const channel = supabase
      .channel(`votes:${entryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'competition_votes',
          filter: `entry_id=eq.${entryId}`,
        },
        () => {
          setVotes(prev => prev + 1);
          triggerPulse();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current);
      }
    };
  }, [entryId, triggerPulse]);

  return (
    <div
      className={[
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#120C22] border transition-all duration-300',
        pulse ? 'border-[#00D9FF] shadow-[0_0_12px_rgba(0,217,255,0.4)]' : 'border-[#2d3a5a]',
      ].join(' ')}
    >
      <Heart
        className={[
          'w-4 h-4 transition-all duration-300',
          pulse ? 'text-[#ff4d6d] fill-[#ff4d6d] scale-125' : 'text-[#ff4d6d] fill-[#ff4d6d]',
        ].join(' ')}
      />
      <span
        className={[
          'font-bold text-sm tabular-nums transition-all duration-300',
          pulse ? 'text-[#00D9FF] scale-110' : 'text-[#00D9FF]',
        ].join(' ')}
      >
        {votes.toLocaleString()}
      </span>
    </div>
  );
};

export default CompetitionVoteCounter;
