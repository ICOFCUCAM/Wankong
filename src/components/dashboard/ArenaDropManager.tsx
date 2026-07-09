import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ArenaDrop, listDrops, createDrop, dropPhase, nextFridayDefaults, PHASE_LABEL,
} from '@/services/competition/arenaDrops';
import { Zap, Loader2, Plus, Calendar, Trophy } from 'lucide-react';

/**
 * Admin-only: create and manage Arena Drops — the weekly challenge that powers
 * the home Talent Arena. Admins/super-admins set the challenge song, prize
 * pool and schedule; phases then run themselves from the timestamps.
 */

const inputCls = 'w-full bg-[#0B0814] border border-white/10 rounded-lg px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#FF6B00]/40';

const PHASE_STYLE: Record<string, string> = {
  upcoming: 'bg-blue-500/15 text-blue-400',
  live:     'bg-emerald-500/15 text-emerald-400',
  voting:   'bg-amber-500/15 text-amber-400',
  closed:   'bg-white/10 text-white/50',
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ArenaDropManager() {
  const defaults = nextFridayDefaults();
  const [drops, setDrops] = useState<ArenaDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    title: '',
    song_title: '',
    song_artist: '',
    genre: '',
    cover_url: '',
    audio_url: '',
    prize_pool: '5000',
    drop_at: toLocalInput(defaults.drop_at),
    submissions_close_at: toLocalInput(defaults.submissions_close_at),
    voting_closes_at: toLocalInput(defaults.voting_closes_at),
  });

  const load = async () => { setLoading(true); setDrops(await listDrops()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setMsg('');
    if (!form.title || !form.song_title) { setMsg('Challenge title and song title are required.'); return; }
    const dropAt = new Date(form.drop_at), subsAt = new Date(form.submissions_close_at), voteAt = new Date(form.voting_closes_at);
    if (!(dropAt < subsAt && subsAt < voteAt)) { setMsg('Dates must be in order: drop → submissions close → voting closes.'); return; }
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await createDrop({
      title: form.title,
      song_title: form.song_title,
      song_artist: form.song_artist || undefined,
      genre: form.genre || undefined,
      cover_url: form.cover_url || undefined,
      audio_url: form.audio_url || undefined,
      prize_pool_cents: Math.round(Number(form.prize_pool || '0') * 100),
      drop_at: dropAt.toISOString(),
      submissions_close_at: subsAt.toISOString(),
      voting_closes_at: voteAt.toISOString(),
    }, user?.id ?? '');
    setMsg(error ? `Error: ${error}` : 'Arena Drop scheduled.');
    if (!error) { setShowForm(false); await load(); }
    setCreating(false);
  };

  const money = (cents: number) => `$${(cents / 100).toLocaleString()}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 mb-4">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#FFB800] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg tracking-tight">Arena Drops</h3>
            <p className="text-white/45 text-sm mt-0.5 max-w-xl">
              The weekly ritual: schedule the challenge song and prize pool — submissions and voting phases then
              run themselves from the dates. The current drop powers the home Talent Arena.
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FFB800] text-black text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> New drop
        </button>
      </div>

      {msg && <div className="mb-3 text-sm text-[#FFB800]">{msg}</div>}

      {showForm && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mb-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-2.5">
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Challenge title * (e.g. Midnight Jazz Challenge)" className={inputCls} />
            <input value={form.prize_pool} onChange={e => set('prize_pool', e.target.value)} placeholder="Prize pool (USD)" type="number" className={inputCls} />
            <input value={form.song_title} onChange={e => set('song_title', e.target.value)} placeholder="Challenge song title *" className={inputCls} />
            <input value={form.song_artist} onChange={e => set('song_artist', e.target.value)} placeholder="Song artist" className={inputCls} />
            <input value={form.genre} onChange={e => set('genre', e.target.value)} placeholder="Genre" className={inputCls} />
            <input value={form.cover_url} onChange={e => set('cover_url', e.target.value)} placeholder="Cover image URL" className={inputCls} />
            <input value={form.audio_url} onChange={e => set('audio_url', e.target.value)} placeholder="Song audio URL" className={`${inputCls} sm:col-span-2`} />
          </div>
          <div className="grid sm:grid-cols-3 gap-2.5">
            {([
              ['drop_at', 'Drops (song goes live)'],
              ['submissions_close_at', 'Submissions close'],
              ['voting_closes_at', 'Voting closes'],
            ] as const).map(([k, label]) => (
              <label key={k} className="block">
                <span className="text-white/40 text-[10px] uppercase tracking-widest flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> {label}</span>
                <input type="datetime-local" value={(form as any)[k]} onChange={e => set(k, e.target.value)} className={inputCls} />
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={submit} disabled={creating}
              className="px-5 py-2 rounded-lg bg-[#FFB800] text-black text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50">
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Schedule drop
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-white/40 text-sm py-6"><Loader2 className="w-4 h-4 animate-spin" /> Loading drops…</div>
      ) : drops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-white/40 text-sm">
          No drops scheduled yet — create the first Arena Drop above. Until one exists, the home page shows the showcase demo.
        </div>
      ) : (
        <div className="space-y-2">
          {drops.map(d => {
            const phase = dropPhase(d);
            return (
              <div key={d.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-[#FF6B00]/30 to-[#FFB800]/10 flex items-center justify-center shrink-0">
                  {d.cover_url ? <img src={d.cover_url} alt="" className="w-full h-full object-cover" /> : <Trophy className="w-4 h-4 text-[#FFB800]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-semibold truncate">{d.title}</p>
                  <p className="text-white/40 text-xs truncate">
                    {d.song_title}{d.song_artist ? ` · ${d.song_artist}` : ''} · drops {new Date(d.drop_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-[#FFB800] text-xs font-bold shrink-0 tabular-nums">{money(d.prize_pool_cents)}</span>
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 capitalize ${PHASE_STYLE[phase]}`}>{phase}</span>
                <span className="hidden md:inline text-white/30 text-[11px] shrink-0">{PHASE_LABEL[phase]}{phase !== 'closed' ? '…' : ''}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
