import { supabase } from '@/lib/supabase';
import { asArray } from '@/lib/utils';

/**
 * The Arena Drop — WANKONG's signature weekly ritual.
 *
 * One challenge song drops each week; creators answer within the submission
 * window; fans vote until voting closes; the winner takes the prize pool.
 * Phase is DERIVED from timestamps so no scheduler is required:
 *
 *   upcoming → live (submissions open) → voting → closed
 */

export interface ArenaDrop {
  id: string;
  title: string;
  song_title: string;
  song_artist: string | null;
  genre: string | null;
  cover_url: string | null;
  audio_url: string | null;
  prize_pool_cents: number;
  drop_at: string;
  submissions_close_at: string;
  voting_closes_at: string;
  winner_entry_id: string | null;
  created_at: string;
}

export type DropPhase = 'upcoming' | 'live' | 'voting' | 'closed';

export function dropPhase(d: ArenaDrop, now: Date = new Date()): DropPhase {
  const t = now.getTime();
  if (t < new Date(d.drop_at).getTime()) return 'upcoming';
  if (t < new Date(d.submissions_close_at).getTime()) return 'live';
  if (t < new Date(d.voting_closes_at).getTime()) return 'voting';
  return 'closed';
}

/** Seconds until the current phase's deadline (0 when closed). */
export function phaseDeadlineSeconds(d: ArenaDrop, now: Date = new Date()): number {
  const phase = dropPhase(d, now);
  const target =
    phase === 'upcoming' ? d.drop_at :
    phase === 'live'     ? d.submissions_close_at :
    phase === 'voting'   ? d.voting_closes_at : null;
  if (!target) return 0;
  return Math.max(0, Math.floor((new Date(target).getTime() - now.getTime()) / 1000));
}

export const PHASE_LABEL: Record<DropPhase, string> = {
  upcoming: 'Drops in',
  live:     'Submissions close in',
  voting:   'Voting closes in',
  closed:   'Drop closed',
};

/** The drop currently in play: latest one whose voting hasn't closed, else the most recent. */
export async function getCurrentDrop(): Promise<ArenaDrop | null> {
  const { data: active } = await supabase
    .from('arena_drops')
    .select('*')
    .gt('voting_closes_at', new Date().toISOString())
    .order('drop_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (active) return active as ArenaDrop;

  const { data: latest } = await supabase
    .from('arena_drops')
    .select('*')
    .order('voting_closes_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (latest as ArenaDrop) ?? null;
}

export async function listDrops(limit = 20): Promise<ArenaDrop[]> {
  const { data } = await supabase
    .from('arena_drops')
    .select('*')
    .order('drop_at', { ascending: false })
    .limit(limit);
  return asArray<ArenaDrop>(data);
}

export interface CreateDropInput {
  title: string;
  song_title: string;
  song_artist?: string;
  genre?: string;
  cover_url?: string;
  audio_url?: string;
  prize_pool_cents: number;
  drop_at: string;               // ISO
  submissions_close_at: string;  // ISO
  voting_closes_at: string;      // ISO
}

export async function createDrop(input: CreateDropInput, adminId: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('arena_drops').insert([{ ...input, created_by: adminId }]);
  return { error: error?.message };
}

export async function declareWinner(dropId: string, entryId: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('arena_drops')
    .update({ winner_entry_id: entryId, updated_at: new Date().toISOString() })
    .eq('id', dropId);
  return { error: error?.message };
}

/**
 * Default schedule helper: next Friday 18:00 UTC, submissions open 72h,
 * voting for a further 48h (closes Sunday→Tuesday window).
 */
export function nextFridayDefaults(from: Date = new Date()): Pick<CreateDropInput, 'drop_at' | 'submissions_close_at' | 'voting_closes_at'> {
  const d = new Date(from);
  const day = d.getUTCDay(); // 0 Sun … 5 Fri
  let add = (5 - day + 7) % 7;
  if (add === 0 && d.getUTCHours() >= 18) add = 7;
  d.setUTCDate(d.getUTCDate() + add);
  d.setUTCHours(18, 0, 0, 0);
  const subsClose = new Date(d.getTime() + 72 * 3600 * 1000);
  const voteClose = new Date(subsClose.getTime() + 48 * 3600 * 1000);
  return {
    drop_at: d.toISOString(),
    submissions_close_at: subsClose.toISOString(),
    voting_closes_at: voteClose.toISOString(),
  };
}
