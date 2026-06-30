import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, Music, BookOpen, Trophy, Radio,
  DollarSign, AlertTriangle, Settings, BarChart2,
  ChevronRight, Shield, LogOut, Mail, Copy, RefreshCw,
  Trash2, UserPlus, CheckCircle, Clock, XCircle,
  Package, Archive,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import AdminCompetitionPanel from '@/components/competition/AdminCompetitionPanel';
import AdminDistributionPanel from '@/components/distribution/AdminDistributionPanel';
import AdminReleaseQueuePage from '@/pages/admin/AdminReleaseQueuePage';
import DistributorExportsPage from '@/pages/admin/DistributorExportsPage';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SidebarItem {
  path:  string;
  label: string;
  icon:  React.ReactNode;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const NAVY   = '#0B0814';
const CYAN   = '#00D9FF';
const PURPLE = '#9D4EDD';
const GOLD   = '#FFB800';
const GREEN  = '#00F5A0';
const ORANGE = '#FF6B00';
const RED    = '#EF4444';

const NAV: SidebarItem[] = [
  { path: '/admin',                  label: 'Overview',       icon: <BarChart2 className="w-4 h-4" /> },
  { path: '/admin/users',            label: 'Users',          icon: <Users className="w-4 h-4" /> },
  { path: '/admin/artists',          label: 'Artists',        icon: <Music className="w-4 h-4" /> },
  { path: '/admin/authors',          label: 'Authors',        icon: <BookOpen className="w-4 h-4" /> },
  { path: '/admin/competitions',     label: 'Competitions',   icon: <Trophy className="w-4 h-4" /> },
  { path: '/admin/distribution',     label: 'Distribution',   icon: <Radio className="w-4 h-4" /> },
  { path: '/admin/release-queue',    label: 'Release Queue',  icon: <Package className="w-4 h-4" /> },
  { path: '/admin/exports',          label: 'Export History', icon: <Archive className="w-4 h-4" /> },
  { path: '/admin/books',            label: 'Books',          icon: <BookOpen className="w-4 h-4" /> },
  { path: '/admin/earnings',         label: 'Earnings',       icon: <DollarSign className="w-4 h-4" /> },
  { path: '/admin/reports',          label: 'Reports',        icon: <AlertTriangle className="w-4 h-4" /> },
  { path: '/admin/settings',         label: 'Settings',       icon: <Settings className="w-4 h-4" /> },
];

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, colour, icon }: {
  label: string; value: string | number; colour: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: `${colour}08`, borderColor: `${colour}20` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${colour}18`, color: colour }}>
          {icon}
        </div>
      </div>
      <p className="text-white/40 text-xs">{label}</p>
      <p className="text-xl font-black" style={{ color: colour }}>{value}</p>
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────────

function Overview() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('tracks').select('*', { count: 'exact', head: true }),
      supabase.from('ecom_products').select('*', { count: 'exact', head: true }).eq('product_type', 'Book'),
      supabase.from('ecom_products').select('*', { count: 'exact', head: true }).ilike('product_type', 'audiobook'),
      supabase.from('competition_entries_v2').select('*', { count: 'exact', head: true }),
      supabase.from('distribution_releases').select('*', { count: 'exact', head: true }),
      supabase.from('stream_events').select('*', { count: 'exact', head: true }),
      supabase.from('creator_earnings').select('amount').eq('paid', false),
    ]).then(([users, tracks, books, audio, comps, releases, streams, unpaidEarnings]) => {
      const pendingPayout = (unpaidEarnings.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
      setCounts({
        users:         users.count    ?? 0,
        tracks:        tracks.count   ?? 0,
        books:         books.count    ?? 0,
        audio:         audio.count    ?? 0,
        comps:         comps.count    ?? 0,
        releases:      releases.count ?? 0,
        streams:       streams.count  ?? 0,
        pendingPayout: Math.round(pendingPayout * 100) / 100,
      });
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />)}</div>;

  return (
    <div>
      <h2 className="text-white font-black text-xl mb-6">Platform Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users"        value={counts.users}                              colour={CYAN}   icon={<Users className="w-4 h-4" />} />
        <StatCard label="Tracks"             value={counts.tracks}                             colour={PURPLE} icon={<Music className="w-4 h-4" />} />
        <StatCard label="Total Streams"      value={(counts.streams ?? 0).toLocaleString()}    colour={GREEN}  icon={<Radio className="w-4 h-4" />} />
        <StatCard label="Pending Payouts"    value={`$${(counts.pendingPayout ?? 0).toFixed(2)}`} colour={GOLD} icon={<DollarSign className="w-4 h-4" />} />
        <StatCard label="Books"              value={counts.books}                              colour={GOLD}   icon={<BookOpen className="w-4 h-4" />} />
        <StatCard label="Audiobooks"         value={counts.audio}                              colour={CYAN}   icon={<BookOpen className="w-4 h-4" />} />
        <StatCard label="Competition Entries" value={counts.comps}                             colour={ORANGE} icon={<Trophy className="w-4 h-4" />} />
        <StatCard label="Releases"           value={counts.releases}                           colour={RED}    icon={<Package className="w-4 h-4" />} />
      </div>

      {/* Quick links */}
      <h3 className="text-white/60 font-semibold text-sm mb-3 uppercase tracking-wider">Quick Access</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {NAV.slice(1).map(n => (
          <Link
            key={n.path}
            to={n.path}
            className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-white/40">{n.icon}</span>
              <span className="text-white/70 text-sm font-medium">{n.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Users ──────────────────────────────────────────────────────────────────────

// ── SECTION 5 — Users Management Panel ────────────────────────────────────────

const CREATOR_LEVELS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Global Ambassador'] as const;

interface UserRow {
  id: string;
  display_name?: string;
  suspended?: boolean;
  created_at: string;
}

function AdminUsers() {
  const [rows,    setRows]    = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [acting,  setActing]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, suspended, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    setRows((data ?? []) as UserRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.display_name ?? '').toLowerCase().includes(q) || r.id.includes(q);
  });

  const toggleSuspend = async (r: UserRow) => {
    setActing(r.id);
    const next = !r.suspended;
    await supabase.from('profiles').update({ suspended: next }).eq('id', r.id);
    setRows(prev => prev.map(u => u.id === r.id ? { ...u, suspended: next } : u));
    setActing(null);
  };

  const assignLevel = async (userId: string, level: string) => {
    setActing(userId + level);
    const xpMap: Record<string, number> = { Bronze: 0, Silver: 500, Gold: 2000, Platinum: 5000, Diamond: 15000, 'Global Ambassador': 50000 };
    await supabase.from('creator_levels').upsert([{
      user_id: userId, level, xp: xpMap[level] ?? 0, updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });
    setActing(null);
  };

  return (
    <div>
      <h2 className="text-white font-black text-xl mb-4">Users</h2>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or ID…"
        className="w-full mb-5 px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-cyan-400/40"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      />

      {loading ? <p className="text-white/40">Loading…</p> : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">No users found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${CYAN}20`, color: CYAN }}>
                {(r.display_name?.[0] ?? r.id[0]).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{r.display_name ?? r.id.slice(0, 14) + '…'}</p>
                <p className="text-white/30 text-xs">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>

              {/* Suspended badge */}
              {r.suspended && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${RED}15`, color: RED }}>Suspended</span>
              )}

              {/* Assign Level dropdown */}
              <select
                onChange={e => { if (e.target.value) assignLevel(r.id, e.target.value); }}
                defaultValue=""
                className="text-xs rounded-lg px-2 py-1.5 outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
                disabled={acting === r.id}
              >
                <option value="" disabled>Assign Level</option>
                {CREATOR_LEVELS.map(lv => <option key={lv} value={lv}>{lv}</option>)}
              </select>

              {/* Suspend / Reactivate */}
              <button
                onClick={() => toggleSuspend(r)}
                disabled={acting === r.id}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-40"
                style={r.suspended
                  ? { background: `${GREEN}15`, color: GREEN, border: `1px solid ${GREEN}30` }
                  : { background: `${RED}15`, color: RED, border: `1px solid ${RED}30` }
                }
              >
                {acting === r.id ? '…' : r.suspended ? 'Reactivate' : 'Suspend'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SECTION 6 — Artist Management Panel ───────────────────────────────────────

interface TrackRow {
  id: string; title: string; artist_id: string; status?: string;
  copyright_flag?: boolean; created_at: string; artist_name?: string;
}

function AdminArtists() {
  const [tracks,  setTracks]  = useState<TrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tracks')
      .select('id, title, artist_id, status, copyright_flag, created_at')
      .order('created_at', { ascending: false })
      .limit(60);
    setTracks((data ?? []) as TrackRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    setActing(id + status);
    await supabase.from('tracks').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setTracks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    setActing(null);
  };

  const flagCopyright = async (id: string, flag: boolean) => {
    setActing(id + 'flag');
    await supabase.from('tracks').update({ copyright_flag: flag }).eq('id', id);
    setTracks(prev => prev.map(t => t.id === id ? { ...t, copyright_flag: flag } : t));
    setActing(null);
  };

  const STATUS_COLOUR: Record<string, string> = { active: GREEN, pending: GOLD, rejected: RED, suspended: ORANGE };

  return (
    <div>
      <h2 className="text-white font-black text-xl mb-6">Artist Releases</h2>
      {loading ? <p className="text-white/40">Loading…</p> : tracks.length === 0 ? (
        <div className="text-center py-16 text-white/30">No tracks yet.</div>
      ) : (
        <div className="space-y-2">
          {tracks.map(t => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{t.title}</p>
                <p className="text-white/30 text-xs">{new Date(t.created_at).toLocaleDateString()}</p>
              </div>

              {/* Status badge */}
              {t.status && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${STATUS_COLOUR[t.status] ?? CYAN}15`, color: STATUS_COLOUR[t.status] ?? CYAN }}>
                  {t.status.toUpperCase()}
                </span>
              )}

              {/* Copyright flag badge */}
              {t.copyright_flag && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${RED}15`, color: RED }}>⚠ COPYRIGHT</span>
              )}

              {/* Actions */}
              <button onClick={() => setStatus(t.id, 'active')}   disabled={!!acting} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold disabled:opacity-40" style={{ background: `${GREEN}15`, color: GREEN }}>Approve</button>
              <button onClick={() => setStatus(t.id, 'rejected')} disabled={!!acting} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold disabled:opacity-40" style={{ background: `${RED}15`, color: RED }}>Reject</button>
              <button
                onClick={() => flagCopyright(t.id, !t.copyright_flag)}
                disabled={!!acting}
                className="text-[11px] px-2.5 py-1 rounded-lg font-semibold disabled:opacity-40"
                style={{ background: `${ORANGE}15`, color: ORANGE }}
              >
                {t.copyright_flag ? 'Unflag' : 'Flag ©'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SECTION 7 — Author Management Panel ───────────────────────────────────────

interface TranslationRow { id: string; book_id: string; language: string; status: string; created_at: string; title?: string; }
interface AudiobookRow   { id: string; title: string; status?: string; narrator?: string; created_at: string; }

function AdminAuthors() {
  const [tab,          setTab]          = useState<'translations' | 'audiobooks'>('translations');
  const [translations, setTranslations] = useState<TranslationRow[]>([]);
  const [audiobooks,   setAudiobooks]   = useState<AudiobookRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [acting,       setActing]       = useState<string | null>(null);
  const [editMeta,     setEditMeta]     = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('book_translations').select('id,book_id,language,status,created_at,title').order('created_at', { ascending: false }).limit(50),
      supabase.from('ecom_products').select('id,title,status,created_at').ilike('product_type', 'audiobook').order('created_at', { ascending: false }).limit(50),
    ]).then(([tr, ab]) => {
      setTranslations((tr.data ?? []) as TranslationRow[]);
      setAudiobooks((ab.data ?? []) as AudiobookRow[]);
      setLoading(false);
    });
  }, []);

  const approveTranslation = async (id: string) => {
    setActing(id);
    await supabase.from('book_translations').update({ status: 'approved' }).eq('id', id);
    setTranslations(prev => prev.map(t => t.id === id ? { ...t, status: 'approved' } : t));
    setActing(null);
  };

  const approveAudiobook = async (id: string) => {
    setActing(id);
    await supabase.from('ecom_products').update({ status: 'active' }).eq('id', id);
    setAudiobooks(prev => prev.map(a => a.id === id ? { ...a, status: 'active' } : a));
    setActing(null);
  };

  const saveMetadata = async () => {
    if (!editMeta) return;
    setActing(editMeta.id);
    await supabase.from('ecom_products').update({ title: editMeta.title }).eq('id', editMeta.id);
    setAudiobooks(prev => prev.map(a => a.id === editMeta.id ? { ...a, title: editMeta.title } : a));
    setEditMeta(null);
    setActing(null);
  };

  const STATUS_COLOUR: Record<string, string> = { done: GREEN, approved: GREEN, queued: GOLD, pending: GOLD, failed: RED, active: GREEN };

  return (
    <div>
      <h2 className="text-white font-black text-xl mb-4">Author Content</h2>
      <div className="flex gap-2 mb-6">
        {(['translations', 'audiobooks'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize"
            style={tab === t ? { background: CYAN, color: NAVY } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
          >{t}</button>
        ))}
      </div>

      {loading ? <p className="text-white/40">Loading…</p> : (
        <>
          {tab === 'translations' && (
            <div className="space-y-2">
              {translations.length === 0 ? <p className="text-white/30 text-center py-12">No translations yet.</p> : translations.map(tr => (
                <div key={tr.id} className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{tr.title ?? tr.book_id.slice(0, 14)}</p>
                    <p className="text-white/30 text-xs">{tr.language.toUpperCase()} · {new Date(tr.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${STATUS_COLOUR[tr.status] ?? GOLD}15`, color: STATUS_COLOUR[tr.status] ?? GOLD }}>
                    {tr.status.toUpperCase()}
                  </span>
                  {tr.status !== 'approved' && (
                    <button onClick={() => approveTranslation(tr.id)} disabled={acting === tr.id}
                      className="text-[11px] px-2.5 py-1 rounded-lg font-semibold disabled:opacity-40"
                      style={{ background: `${GREEN}15`, color: GREEN }}>
                      {acting === tr.id ? '…' : 'Approve'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'audiobooks' && (
            <div className="space-y-2">
              {audiobooks.length === 0 ? <p className="text-white/30 text-center py-12">No audiobooks yet.</p> : audiobooks.map(ab => (
                <div key={ab.id} className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex-1 min-w-0">
                    {editMeta?.id === ab.id ? (
                      <input
                        value={editMeta.title}
                        onChange={e => setEditMeta({ id: ab.id, title: e.target.value })}
                        className="w-full bg-white/8 border border-white/15 rounded-lg px-3 py-1.5 text-white text-sm outline-none"
                        autoFocus
                      />
                    ) : (
                      <p className="text-white text-sm font-medium truncate">{ab.title}</p>
                    )}
                    <p className="text-white/30 text-xs">{ab.narrator ?? 'No narrator'} · {new Date(ab.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${STATUS_COLOUR[ab.status ?? ''] ?? GOLD}15`, color: STATUS_COLOUR[ab.status ?? ''] ?? GOLD }}>
                    {(ab.status ?? 'pending').toUpperCase()}
                  </span>
                  {editMeta?.id === ab.id ? (
                    <>
                      <button onClick={saveMetadata} disabled={!!acting} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: `${GREEN}15`, color: GREEN }}>Save</button>
                      <button onClick={() => setEditMeta(null)} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      {ab.status !== 'active' && (
                        <button onClick={() => approveAudiobook(ab.id)} disabled={!!acting} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold disabled:opacity-40" style={{ background: `${GREEN}15`, color: GREEN }}>Approve</button>
                      )}
                      <button onClick={() => setEditMeta({ id: ab.id, title: ab.title })} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: `${CYAN}15`, color: CYAN }}>Edit</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── SECTION 10 — Reports Panel ─────────────────────────────────────────────────

type ReportReason = 'copyright_claim' | 'guideline_violation' | 'spam_upload' | 'bot_voting' | string;

interface ReportRow {
  id:                string;
  reason:            ReportReason;
  status:            string;
  content_type?:     string;
  content_id?:       string;
  reporter_id?:      string;
  reported_user_id?: string;
  notes?:            string;
  dmca_notice?:      string;
  created_at:        string;
  resolved_at?:      string;
}

type ReportTab = 'all' | 'dmca' | 'violations' | 'resolved';

function AdminReports() {
  const [rows,     setRows]     = useState<ReportRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState<string | null>(null);
  const [tab,      setTab]      = useState<ReportTab>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('content_reports')
      .select('id,reason,status,content_type,content_id,reporter_id,reported_user_id,notes,dmca_notice,created_at,resolved_at')
      .order('created_at', { ascending: false })
      .limit(150);
    setRows((data ?? []) as ReportRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (tab === 'dmca')       return r.reason === 'copyright_claim';
    if (tab === 'violations') return r.reason !== 'copyright_claim' && r.status === 'open';
    if (tab === 'resolved')   return r.status !== 'open';
    return true;
  });

  const resolve = async (id: string, resolution: 'resolved' | 'dismissed' | 'escalated') => {
    setActing(id + resolution);
    await supabase.from('content_reports').update({ status: resolution, resolved_at: new Date().toISOString() }).eq('id', id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: resolution } : r));
    setActing(null);
  };

  const issueDmcaTakedown = async (r: ReportRow) => {
    if (!r.content_id || !r.content_type) return;
    setActing(r.id + 'dmca');
    const table = r.content_type === 'track' ? 'tracks' : 'ecom_products';
    await supabase.from(table).update({ status: 'suspended' }).eq('id', r.content_id);
    await supabase.from('content_reports').update({ status: 'resolved', notes: (r.notes || '') + ' [DMCA Takedown]', resolved_at: new Date().toISOString() }).eq('id', r.id);
    if (r.reported_user_id) {
      await supabase.from('user_notifications').insert({ user_id: r.reported_user_id, title: 'Content Removed — DMCA', body: `Your ${r.content_type} was removed following a DMCA copyright claim.`, read: false, created_at: new Date().toISOString() }).catch(() => {});
    }
    setRows(prev => prev.map(x => x.id === r.id ? { ...x, status: 'resolved' } : x));
    setSelected(null);
    setActing(null);
  };

  const banUser = async (userId: string, reportId: string) => {
    if (!userId) return;
    setActing(reportId + 'ban');
    await supabase.from('profiles').update({ suspended: true }).eq('id', userId);
    await supabase.from('content_reports').update({ status: 'resolved', notes: 'User banned.', resolved_at: new Date().toISOString() }).eq('id', reportId);
    await supabase.from('user_notifications').insert({ user_id: userId, title: 'Account Suspended', body: 'Your account has been suspended for violating community guidelines.', read: false, created_at: new Date().toISOString() }).catch(() => {});
    setRows(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
    setSelected(null);
    setActing(null);
  };

  const REASON_META: Record<string, { label: string; colour: string; icon: string }> = {
    copyright_claim:      { label: 'DMCA / Copyright',     colour: ORANGE, icon: '©'  },
    guideline_violation:  { label: 'Guideline Violation',  colour: RED,    icon: '⛔' },
    spam_upload:          { label: 'Spam Upload',          colour: GOLD,   icon: '🚫' },
    bot_voting:           { label: 'Bot Voting',           colour: PURPLE, icon: '🤖' },
    harassment:           { label: 'Harassment',           colour: RED,    icon: '🚨' },
    misinformation:       { label: 'Misinformation',       colour: GOLD,   icon: '⚠️' },
  };

  const STATUS_COLOUR: Record<string, string> = { open: GOLD, resolved: GREEN, dismissed: 'rgba(255,255,255,0.3)', escalated: RED };

  const openCount = rows.filter(r => r.status === 'open').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-black text-xl">Reports &amp; Moderation</h2>
        {openCount > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: `${RED}15`, color: RED }}>
            {openCount} open
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {([
          { key: 'all',        label: 'All',        count: rows.length },
          { key: 'dmca',       label: 'DMCA',       count: rows.filter(r => r.reason === 'copyright_claim').length },
          { key: 'violations', label: 'Violations', count: rows.filter(r => r.reason !== 'copyright_claim' && r.status === 'open').length },
          { key: 'resolved',   label: 'Resolved',   count: rows.filter(r => r.status !== 'open').length },
        ] as { key: ReportTab; label: string; count: number }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.key ? 'text-white' : 'text-white/40 hover:text-white'
            }`}
            style={tab === t.key ? { background: 'rgba(255,255,255,0.10)' } : undefined}>
            {t.label}
            <span className="text-[10px] px-1 rounded font-bold" style={{ background: 'rgba(255,255,255,0.08)' }}>{t.count}</span>
          </button>
        ))}
      </div>

      {loading ? <p className="text-white/40 text-sm">Loading…</p> : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <p className="text-3xl mb-3">✅</p>
          {tab === 'all' ? 'No reports. Platform is clean.' : `No ${tab} reports.`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const meta   = REASON_META[r.reason] ?? { label: r.reason, colour: CYAN, icon: '⚠' };
            const isOpen = r.status === 'open';
            const isExp  = selected === r.id;

            return (
              <div key={r.id}>
                <button
                  onClick={() => setSelected(isExp ? null : r.id)}
                  className="w-full flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors"
                  style={{
                    border: `1px solid ${isExp ? meta.colour + '40' : 'rgba(255,255,255,0.08)'}`,
                    background: isExp ? `${meta.colour}08` : 'rgba(255,255,255,0.03)',
                  }}
                >
                  <span className="text-lg shrink-0">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{meta.label}</p>
                    <p className="text-white/30 text-xs">
                      {r.content_type ? `${r.content_type} · ` : ''}{new Date(r.created_at).toLocaleDateString()}
                    </p>
                    {r.notes && <p className="text-white/40 text-xs mt-0.5 truncate">{r.notes}</p>}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0"
                    style={{ background: `${STATUS_COLOUR[r.status] ?? CYAN}15`, color: STATUS_COLOUR[r.status] ?? CYAN }}>
                    {r.status.toUpperCase()}
                  </span>
                </button>

                {isExp && (
                  <div className="mx-1 mb-2 px-4 py-3 rounded-b-xl border border-t-0"
                    style={{ borderColor: `${meta.colour}25`, background: `${meta.colour}05` }}>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      {r.content_id && (
                        <div>
                          <p className="text-white/30 mb-0.5">Content ID</p>
                          <p className="text-white/60 font-mono truncate">{r.content_id}</p>
                        </div>
                      )}
                      {r.reported_user_id && (
                        <div>
                          <p className="text-white/30 mb-0.5">Reported User</p>
                          <p className="text-white/60 font-mono truncate">{r.reported_user_id}</p>
                        </div>
                      )}
                      {r.dmca_notice && (
                        <div className="col-span-2">
                          <p className="text-white/30 mb-0.5">DMCA Notice</p>
                          <p className="text-white/70 text-xs leading-relaxed">{r.dmca_notice}</p>
                        </div>
                      )}
                    </div>

                    {isOpen ? (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => resolve(r.id, 'resolved')} disabled={!!acting}
                          className="text-[11px] px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40"
                          style={{ background: `${GREEN}18`, color: GREEN }}>✓ Resolve</button>
                        <button onClick={() => resolve(r.id, 'dismissed')} disabled={!!acting}
                          className="text-[11px] px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40"
                          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>Dismiss</button>
                        <button onClick={() => resolve(r.id, 'escalated')} disabled={!!acting}
                          className="text-[11px] px-3 py-1.5 rounded-lg font-semibold disabled:opacity-40"
                          style={{ background: `${ORANGE}18`, color: ORANGE }}>↑ Escalate</button>
                        {r.reason === 'copyright_claim' && r.content_id && (
                          <button onClick={() => issueDmcaTakedown(r)} disabled={!!acting}
                            className="text-[11px] px-3 py-1.5 rounded-lg font-bold disabled:opacity-40"
                            style={{ background: `${RED}18`, color: RED }}>⚠ DMCA Takedown</button>
                        )}
                        {r.reported_user_id && (
                          <button onClick={() => banUser(r.reported_user_id!, r.id)} disabled={!!acting}
                            className="text-[11px] px-3 py-1.5 rounded-lg font-bold disabled:opacity-40"
                            style={{ background: `${RED}18`, color: RED }}>🚫 Ban User</button>
                        )}
                      </div>
                    ) : (
                      r.resolved_at && <p className="text-white/25 text-xs">Resolved {new Date(r.resolved_at).toLocaleDateString()}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── SECTION 11 — Earnings Panel ────────────────────────────────────────────────

interface EarningRow {
  id: string; user_id: string; category: string; amount: number;
  paid: boolean; created_at: string; display_name?: string;
}

interface PayoutBatch {
  id: string; status: string; total_amount: number; creator_count: number; created_at: string;
}

function AdminEarnings() {
  const [tab,     setTab]     = useState<'earnings' | 'payouts'>('earnings');
  const [rows,    setRows]    = useState<EarningRow[]>([]);
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState<string | null>(null);
  const [adjust,  setAdjust]  = useState<{ id: string; amount: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      supabase.from('creator_earnings').select('id,user_id,category,amount,paid,created_at').order('created_at', { ascending: false }).limit(80),
      supabase.from('creator_withdrawals').select('id,status,amount,created_at').order('created_at', { ascending: false }).limit(40),
    ]).then(([er, wr]) => {
      setRows((er.data ?? []) as EarningRow[]);
      // Map withdrawals as payout batches (each withdrawal = a payout request)
      setBatches(((wr.data ?? []) as any[]).map((w, i) => ({
        id: w.id,
        status: w.status,
        total_amount: w.amount,
        creator_count: 1,
        created_at: w.created_at,
      })));
      setLoading(false);
    });
  }, []);

  const adjustAmount = async () => {
    if (!adjust) return;
    const newAmount = parseFloat(adjust.amount);
    if (isNaN(newAmount) || newAmount < 0) return;
    setActing(adjust.id);
    await supabase.from('creator_earnings').update({ amount: newAmount }).eq('id', adjust.id);
    setRows(prev => prev.map(r => r.id === adjust.id ? { ...r, amount: newAmount } : r));
    setAdjust(null);
    setActing(null);
  };

  const approvePayout = async (id: string) => {
    setActing(id);
    await supabase.from('creator_withdrawals').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);
    setBatches(prev => prev.map(b => b.id === id ? { ...b, status: 'approved' } : b));
    setActing(null);
  };

  const rejectPayout = async (id: string) => {
    setActing(id);
    await supabase.from('creator_withdrawals').update({ status: 'rejected' }).eq('id', id);
    setBatches(prev => prev.map(b => b.id === id ? { ...b, status: 'rejected' } : b));
    setActing(null);
  };

  const CATEGORY_ICON: Record<string, string> = {
    music_stream: '🎵', book_sale: '📚', audiobook_play: '🎧',
    competition_win: '🏆', fan_vote_reward: '❤', distribution_royalty: '💿', translation_sale: '🌍',
  };

  const PAYOUT_COLOUR: Record<string, string> = { pending: GOLD, approved: GREEN, rejected: RED, processing: CYAN };

  return (
    <div>
      <h2 className="text-white font-black text-xl mb-4">Earnings &amp; Payouts</h2>
      <div className="flex gap-2 mb-6">
        {(['earnings', 'payouts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize"
            style={tab === t ? { background: GOLD, color: NAVY } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
          >{t}</button>
        ))}
      </div>

      {loading ? <p className="text-white/40">Loading…</p> : (
        <>
          {tab === 'earnings' && (
            <div className="space-y-2">
              {rows.length === 0 ? <p className="text-white/30 text-center py-12">No earnings recorded yet.</p> : rows.map(r => (
                <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-lg">{CATEGORY_ICON[r.category] ?? '💰'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium capitalize">{r.category.replace(/_/g, ' ')}</p>
                    <p className="text-white/30 text-xs">{r.user_id.slice(0, 10)}… · {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>

                  {adjust?.id === r.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-white/40 text-sm">$</span>
                      <input
                        value={adjust.amount}
                        onChange={e => setAdjust({ id: r.id, amount: e.target.value })}
                        className="w-24 bg-white/8 border border-white/15 rounded-lg px-2 py-1 text-white text-sm outline-none"
                        type="number" step="0.01" min="0" autoFocus
                      />
                      <button onClick={adjustAmount} disabled={!!acting} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: `${GREEN}15`, color: GREEN }}>Save</button>
                      <button onClick={() => setAdjust(null)} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-sm" style={{ color: GREEN }}>${Number(r.amount).toFixed(2)}</span>
                      <button onClick={() => setAdjust({ id: r.id, amount: String(r.amount) })} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: `${CYAN}15`, color: CYAN }}>Adjust</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'payouts' && (
            <div className="space-y-2">
              {batches.length === 0 ? <p className="text-white/30 text-center py-12">No withdrawal requests yet.</p> : batches.map(b => (
                <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">${Number(b.total_amount).toFixed(2)} withdrawal request</p>
                    <p className="text-white/30 text-xs">{new Date(b.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${PAYOUT_COLOUR[b.status] ?? GOLD}15`, color: PAYOUT_COLOUR[b.status] ?? GOLD }}>
                    {b.status.toUpperCase()}
                  </span>
                  {b.status === 'pending' && (
                    <>
                      <button onClick={() => approvePayout(b.id)} disabled={acting === b.id} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold disabled:opacity-40" style={{ background: `${GREEN}15`, color: GREEN }}>Approve</button>
                      <button onClick={() => rejectPayout(b.id)}  disabled={acting === b.id} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold disabled:opacity-40" style={{ background: `${RED}15`, color: RED }}>Reject</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Admin Books (format linking + visibility toggles) ─────────────────────────

interface AdminBook {
  id: string; title: string; price: number; language: string | null; created_at: string;
  has_ebook?: boolean; has_audiobook?: boolean; has_softcover?: boolean; has_hardcover?: boolean;
  softcover_source?: string | null; hardcover_source?: string | null;
  softcover_visible?: boolean | null; hardcover_visible?: boolean | null;
}

function AdminBooks() {
  const [books,   setBooks]   = useState<AdminBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('ecom_products')
      .select('id, title, price, language, created_at, has_ebook, has_audiobook, has_softcover, has_hardcover, softcover_source, hardcover_source, softcover_visible, hardcover_visible')
      .eq('product_type', 'Book')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { setBooks((data ?? []) as AdminBook[]); setLoading(false); });
  }, []);

  const toggleVisibility = async (id: string, field: 'softcover_visible' | 'hardcover_visible', current: boolean | null | undefined) => {
    setSaving(id + field);
    const next = !current;
    await supabase.from('ecom_products').update({ [field]: next }).eq('id', id);
    setBooks(prev => prev.map(b => b.id === id ? { ...b, [field]: next } : b));
    setSaving(null);
  };

  const FORMAT_BADGE: Record<string, { bg: string; text: string }> = {
    ebook:     { bg: `${CYAN}18`,   text: CYAN   },
    audiobook: { bg: `${PURPLE}18`, text: PURPLE },
    softcover: { bg: `${GREEN}18`,  text: GREEN  },
    hardcover: { bg: `${GOLD}18`,   text: GOLD   },
  };

  return (
    <div>
      <h2 className="text-white font-black text-xl mb-6">Books — Format Manager</h2>
      {loading ? <p className="text-white/40">Loading…</p> : books.length === 0 ? (
        <div className="text-center py-16 text-white/30">No books yet.</div>
      ) : (
        <div className="space-y-2">
          {books.map(b => {
            const formats = [
              b.has_ebook     && 'ebook',
              b.has_audiobook && 'audiobook',
              b.has_softcover && 'softcover',
              b.has_hardcover && 'hardcover',
            ].filter(Boolean) as string[];
            return (
              <div key={b.id} className="px-4 py-3 rounded-xl border border-white/8 bg-white/3 flex flex-wrap items-center gap-3">
                {/* Title */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{b.title}</p>
                  <p className="text-white/30 text-xs">${b.price.toFixed(2)} · {b.language ?? '—'} · {new Date(b.created_at).toLocaleDateString()}</p>
                </div>
                {/* Format badges */}
                <div className="flex flex-wrap gap-1">
                  {formats.length === 0 ? (
                    <span className="text-[10px] text-white/20 italic">no formats</span>
                  ) : formats.map(f => (
                    <span key={f} className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: FORMAT_BADGE[f].bg, color: FORMAT_BADGE[f].text }}>
                      {f.toUpperCase()}
                    </span>
                  ))}
                </div>
                {/* Source badges */}
                {b.has_softcover && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-white/40 font-medium">
                    SC:{b.softcover_source ?? 'wkng'}
                  </span>
                )}
                {b.has_hardcover && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-white/40 font-medium">
                    HC:{b.hardcover_source ?? 'wkng'}
                  </span>
                )}
                {/* Visibility toggles */}
                {b.has_softcover && (
                  <button
                    onClick={() => toggleVisibility(b.id, 'softcover_visible', b.softcover_visible)}
                    disabled={saving === b.id + 'softcover_visible'}
                    className={`text-[9px] px-2 py-0.5 rounded font-semibold transition-colors ${b.softcover_visible !== false ? `bg-[${GREEN}15] text-[${GREEN}]` : 'bg-white/5 text-white/30'}`}
                    style={b.softcover_visible !== false ? { background: `${GREEN}15`, color: GREEN } : {}}
                  >
                    SC {b.softcover_visible !== false ? 'Visible' : 'Hidden'}
                  </button>
                )}
                {b.has_hardcover && (
                  <button
                    onClick={() => toggleVisibility(b.id, 'hardcover_visible', b.hardcover_visible)}
                    disabled={saving === b.id + 'hardcover_visible'}
                    className="text-[9px] px-2 py-0.5 rounded font-semibold transition-colors bg-white/5 text-white/30"
                    style={b.hardcover_visible !== false ? { background: `${GOLD}15`, color: GOLD } : {}}
                  >
                    HC {b.hardcover_visible !== false ? 'Visible' : 'Hidden'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface AdminInvite {
  id:         string;
  email:      string;
  role:       string;
  token:      string;
  accepted:   boolean;
  created_at: string;
}

type InviteRole =
  | 'moderator' | 'competition_admin' | 'distribution_admin'
  | 'publishing_admin' | 'finance_admin' | 'support_admin';

const INVITE_ROLES: { value: InviteRole; label: string }[] = [
  { value: 'moderator',          label: 'Moderator'           },
  { value: 'competition_admin',  label: 'Competition Admin'   },
  { value: 'distribution_admin', label: 'Distribution Admin'  },
  { value: 'publishing_admin',   label: 'Publishing Admin'    },
  { value: 'finance_admin',      label: 'Finance Admin'       },
  { value: 'support_admin',      label: 'Support Admin'       },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function inviteExpired(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > 7 * 24 * 60 * 60 * 1000;
}

function inviteLink(token: string): string {
  return `${window.location.origin}/admin/invite/${token}`;
}

/** Stub: log invite link; wire up real SMTP later */
function sendInviteEmail(email: string, role: string, token: string) {
  const link = inviteLink(token);
  console.info(`[INVITE] To: ${email} | Role: ${role} | Link: ${link}`);
}

// ── Invite status badge ────────────────────────────────────────────────────────

function InviteStatus({ invite }: { invite: AdminInvite }) {
  if (invite.accepted)           return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${GREEN}15`, color: GREEN }}><CheckCircle className="w-3 h-3" /> Accepted</span>;
  if (inviteExpired(invite.created_at)) return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${RED}15`, color: RED }}><XCircle className="w-3 h-3" /> Expired</span>;
  return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: `${GOLD}15`, color: GOLD }}><Clock className="w-3 h-3" /> Pending</span>;
}

// ── Settings ───────────────────────────────────────────────────────────────────

function AdminSettings() {
  const { user, adminRole } = useAuth();
  const isSuperAdmin = adminRole === 'super_admin';

  // ── Invite form state ───────────────────────────────────────────────────
  const [inviteEmail,  setInviteEmail]  = useState('');
  const [inviteRole,   setInviteRole]   = useState<InviteRole>('moderator');
  const [sending,      setSending]      = useState(false);
  const [inviteMsg,    setInviteMsg]    = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Invite list state ───────────────────────────────────────────────────
  const [invites,      setInvites]      = useState<AdminInvite[]>([]);
  const [loadingList,  setLoadingList]  = useState(true);
  const [copiedToken,  setCopiedToken]  = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    setLoadingList(true);
    const { data } = await supabase
      .from('admin_invites')
      .select('id,email,role,token,accepted,created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setInvites((data ?? []) as AdminInvite[]);
    setLoadingList(false);
  }, []);

  useEffect(() => { if (isSuperAdmin) loadInvites(); }, [isSuperAdmin, loadInvites]);

  // ── Send invite ─────────────────────────────────────────────────────────
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    setInviteMsg(null);

    const token = crypto.randomUUID();
    const { error } = await supabase.from('admin_invites').insert({
      email:      inviteEmail.trim().toLowerCase(),
      role:       inviteRole,
      token,
      accepted:   false,
      invited_by: user?.id,
    });

    if (error) {
      setInviteMsg({ type: 'err', text: `Failed: ${error.message}` });
    } else {
      sendInviteEmail(inviteEmail, inviteRole, token);
      setInviteMsg({ type: 'ok', text: `Invite sent to ${inviteEmail}` });
      setInviteEmail('');
      loadInvites();
    }
    setSending(false);
  };

  // ── Resend (new token) ──────────────────────────────────────────────────
  const handleResend = async (invite: AdminInvite) => {
    const newToken = crypto.randomUUID();
    const { error } = await supabase
      .from('admin_invites')
      .update({ token: newToken, created_at: new Date().toISOString() })
      .eq('id', invite.id);
    if (!error) {
      sendInviteEmail(invite.email, invite.role, newToken);
      loadInvites();
    }
  };

  // ── Delete invite ───────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await supabase.from('admin_invites').delete().eq('id', id);
    setInvites(prev => prev.filter(i => i.id !== id));
  };

  // ── Copy link ───────────────────────────────────────────────────────────
  const handleCopy = async (token: string) => {
    await navigator.clipboard.writeText(inviteLink(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-white font-black text-xl">Admin Settings</h2>

      {/* ── Platform config ──────────────────────────────────────────────── */}
      <section>
        <h3 className="text-white/50 font-semibold text-xs uppercase tracking-wider mb-3">Platform</h3>
        <div className="space-y-2">
          {[
            { label: 'Platform Mode',            value: 'Production' },
            { label: 'Maintenance Mode',         value: 'Off' },
            { label: 'New User Registrations',   value: 'Enabled' },
            { label: 'Competition Voting',       value: 'Enabled' },
            { label: 'Distribution Queue',       value: 'Active' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-white/8 bg-white/3">
              <span className="text-white/70 text-sm">{s.label}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: `${GREEN}15`, color: GREEN }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Invite panel (super_admin only) ──────────────────────────────── */}
      {isSuperAdmin && (
        <>
          <section>
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5" style={{ color: CYAN }} />
              <h3 className="text-white font-bold text-base">Invite New Admin</h3>
            </div>

            <form
              onSubmit={handleSendInvite}
              className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-4"
            >
              {inviteMsg && (
                <div
                  className="px-4 py-3 rounded-xl text-sm"
                  style={{
                    background: inviteMsg.type === 'ok' ? `${GREEN}12` : `${RED}12`,
                    color:      inviteMsg.type === 'ok' ? GREEN : RED,
                    border:     `1px solid ${inviteMsg.type === 'ok' ? GREEN : RED}30`,
                  }}
                >
                  {inviteMsg.text}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/40 text-xs mb-1.5">Email address</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 text-sm focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-white/40 text-xs mb-1.5">Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as InviteRole)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 cursor-pointer"
                  >
                    {INVITE_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})` }}
              >
                <Mail className="w-4 h-4" />
                {sending ? 'Sending…' : 'Send Invite'}
              </button>
            </form>
          </section>

          {/* ── Invite status table ─────────────────────────────────────── */}
          <section>
            <h3 className="text-white font-bold text-base mb-4">Invite Status</h3>

            {loadingList ? (
              <p className="text-white/30 text-sm">Loading…</p>
            ) : invites.length === 0 ? (
              <div className="text-center py-10 text-white/25 text-sm rounded-2xl border border-white/8 bg-white/3">
                No invites sent yet.
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <th className="text-left text-white/40 font-semibold py-3 px-4 text-xs uppercase tracking-wide">Email</th>
                      <th className="text-left text-white/40 font-semibold py-3 px-4 text-xs uppercase tracking-wide">Role</th>
                      <th className="text-left text-white/40 font-semibold py-3 px-4 text-xs uppercase tracking-wide">Status</th>
                      <th className="text-left text-white/40 font-semibold py-3 px-4 text-xs uppercase tracking-wide">Sent</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map(inv => {
                      const expired = inviteExpired(inv.created_at);
                      return (
                        <tr key={inv.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="py-3 px-4 text-white/80 text-sm">{inv.email}</td>
                          <td className="py-3 px-4 text-white/50 text-xs capitalize">
                            {inv.role.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-4"><InviteStatus invite={inv} /></td>
                          <td className="py-3 px-4 text-white/30 text-xs">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1 justify-end">
                              {/* Copy link */}
                              {!inv.accepted && (
                                <button
                                  onClick={() => handleCopy(inv.token)}
                                  title="Copy invite link"
                                  className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors"
                                >
                                  {copiedToken === inv.token
                                    ? <CheckCircle className="w-4 h-4" style={{ color: GREEN }} />
                                    : <Copy className="w-4 h-4" />}
                                </button>
                              )}
                              {/* Resend (only if not accepted) */}
                              {!inv.accepted && (
                                <button
                                  onClick={() => handleResend(inv)}
                                  title="Resend invite"
                                  className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              {/* Delete */}
                              <button
                                onClick={() => handleDelete(inv.id)}
                                title="Delete invite"
                                className="p-1.5 rounded-lg hover:bg-white/8 transition-colors"
                                style={{ color: `${RED}80` }}
                                onMouseEnter={e => (e.currentTarget.style.color = RED)}
                                onMouseLeave={e => (e.currentTarget.style.color = `${RED}80`)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Non-super_admin sees a note */}
      {!isSuperAdmin && (
        <div className="rounded-2xl border border-white/8 bg-white/3 p-6 text-center">
          <Shield className="w-8 h-8 mx-auto mb-3 text-white/20" />
          <p className="text-white/40 text-sm">Only super admins can invite new administrators.</p>
        </div>
      )}
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

function Sidebar({ onSignOut }: { onSignOut: () => void }) {
  const location = useLocation();

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/8" style={{ background: '#07091A' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-white/8">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})` }}>
          <Shield className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-black text-base">Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
        {NAV.map(n => {
          const active = location.pathname === n.path ||
            (n.path !== '/admin' && location.pathname.startsWith(n.path));
          return (
            <Link
              key={n.path}
              to={n.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {n.icon}
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/8 space-y-1">
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/5 transition-colors">
          ← Back to Site
        </Link>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY }}>
        <div className="text-center">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-white/50 mb-6">Admin access required.</p>
          <Link to="/" className="px-6 py-3 rounded-xl font-bold text-sm" style={{ background: `linear-gradient(135deg, ${CYAN}, ${PURPLE})`, color: '#fff' }}>
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex text-white" style={{ background: NAVY }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — desktop always visible, mobile toggled */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:static lg:flex lg:flex-shrink-0 transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar onSignOut={handleSignOut} />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-white/8" style={{ background: 'rgba(10,17,40,0.85)', backdropFilter: 'blur(12px)' }}>
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 text-white/40 hover:text-white transition-colors"
          >
            ☰
          </button>
          <div className="flex-1" />
          <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: `${RED}15`, color: RED }}>
            Admin Panel
          </span>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${PURPLE}30`, color: PURPLE }}>
            {user.email?.[0].toUpperCase()}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/"            element={<Overview />} />
            <Route path="/users"        element={<AdminUsers />} />
            <Route path="/artists"      element={<AdminArtists />} />
            <Route path="/authors"      element={<AdminAuthors />} />
            <Route path="/competitions" element={<AdminCompetitionPanel />} />
            <Route path="/distribution"  element={<AdminDistributionPanel />} />
            <Route path="/release-queue" element={<AdminReleaseQueuePage />} />
            <Route path="/exports"       element={<DistributorExportsPage />} />
            <Route path="/books"         element={<AdminBooks />} />
            <Route path="/earnings"     element={<AdminEarnings />} />
            <Route path="/reports"      element={<AdminReports />} />
            <Route path="/settings"     element={<AdminSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
