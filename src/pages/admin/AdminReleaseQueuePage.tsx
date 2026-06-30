import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { distributorService } from '@/services/distribution/DistributorService';
import {
  Music, Loader2, Eye, CheckCircle, XCircle, RotateCcw,
  ArrowRight, AlertCircle, Clock, Search, Filter,
  Package, Radio,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueRelease {
  id:              string;
  title:           string;
  artist_name:     string;
  release_type:    string;
  genre:           string | null;
  language_code:   string | null;
  cover_url:       string | null;
  audio_url:       string | null;
  release_date:    string | null;
  territories:     string[] | null;
  status:          string;
  track_count:     number;
  submitted_at:    string | null;
  created_at:      string;
  isrc:            string | null;
  copyright_owner: string | null;
  composer:        string | null;
  producer:        string | null;
  label_name:      string | null;
  explicit:        boolean;
  admin_note:      string | null;
  user_id:         string | null;
  ecom_product_id: string | null;
  track_id:        string | null;
  ditto_release_id: string | null;
}

type ActionState = 'idle' | 'reviewing' | 'approving' | 'requesting_changes' | 'forwarding' | 'rejecting';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; color: string }> = {
  draft:                       { label: 'Draft',             color: '#9ca3af' },
  submitted:                   { label: 'Submitted',         color: '#FFB800' },
  under_review:                { label: 'Under Review',      color: '#60a5fa' },
  changes_requested:           { label: 'Changes Requested', color: '#FF6B00' },
  approved:                    { label: 'Approved',          color: '#00F5A0' },
  sent_to_ditto:               { label: 'Sent to Ditto',     color: '#9D4EDD' },
  distributed:                 { label: 'Distributed',       color: '#00D9FF' },
  live:                        { label: 'Live',              color: '#00D9FF' },
  rejected:                    { label: 'Rejected',          color: '#FF4466' },
  pending_admin_review:        { label: 'Pending Review',    color: '#FFB800' },
  approved_for_distribution:   { label: 'Approved',          color: '#00F5A0' },
  priority_distribution_queue: { label: 'Priority',          color: '#FFB800' },
};

const STATUS_TABS = [
  { key: 'all',                label: 'All',             color: '#9ca3af' },
  { key: 'submitted',          label: 'Submitted',       color: '#FFB800' },
  { key: 'under_review',       label: 'Under Review',    color: '#60a5fa' },
  { key: 'changes_requested',  label: 'Changes Req.',    color: '#FF6B00' },
  { key: 'approved',           label: 'Approved',        color: '#00F5A0' },
  { key: 'sent_to_ditto',      label: 'Sent to Ditto',   color: '#9D4EDD' },
  { key: 'live',               label: 'Live',            color: '#00D9FF' },
  { key: 'rejected',           label: 'Rejected',        color: '#FF4466' },
];

const ACTIVE_STATUSES = [
  'submitted', 'under_review', 'changes_requested', 'approved',
  'pending_admin_review', 'priority_distribution_queue',
];

// ── Completeness indicator ────────────────────────────────────────────────────

const COMPLETENESS_CHECKS: Array<{ key: keyof QueueRelease; label: string }> = [
  { key: 'cover_url',     label: 'Cover art'     },
  { key: 'audio_url',     label: 'Audio'         },
  { key: 'genre',         label: 'Genre'         },
  { key: 'language_code', label: 'Language'      },
  { key: 'release_date',  label: 'Release date'  },
  { key: 'copyright_owner', label: 'Copyright'   },
  { key: 'label_name',    label: 'Label'         },
  { key: 'isrc',          label: 'ISRC'          },
];

function Completeness({ release }: { release: QueueRelease }) {
  const missing = COMPLETENESS_CHECKS.filter(c => !release[c.key]).map(c => c.label);
  const pct = Math.round(((COMPLETENESS_CHECKS.length - missing.length) / COMPLETENESS_CHECKS.length) * 100);
  const color = pct >= 90 ? '#00F5A0' : pct >= 60 ? '#FFB800' : '#FF4466';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span style={{ color }}>Metadata {pct}%</span>
        {missing.length > 0 && (
          <span className="text-gray-600">missing: {missing.join(', ')}</span>
        )}
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Input style ───────────────────────────────────────────────────────────────

const inputCls =
  'w-full bg-[#0B0814] border border-white/10 rounded-lg px-3 py-2 text-white text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/40 placeholder-gray-600';

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminReleaseQueuePage() {
  const { user, isAdmin } = useAuth();

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

  const [releases,  setReleases]  = useState<QueueRelease[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('all');
  const [search,    setSearch]    = useState('');
  const [preview,   setPreview]   = useState<QueueRelease | null>(null);
  const [note,      setNote]      = useState('');
  const [action,    setAction]    = useState<ActionState>('idle');
  const [actingId,  setActingId]  = useState<string | null>(null);
  const [error,     setError]     = useState('');
  const [validation, setValidation] = useState<{ errors: string[]; warnings: string[] } | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('distribution_releases')
      .select('*')
      .order('submitted_at', { ascending: true, nullsFirst: false });
    setReleases((data ?? []) as QueueRelease[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel('admin-release-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'distribution_releases' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = releases.filter(r => {
    const matchesTab = tab === 'all' || r.status === tab ||
      (tab === 'submitted' && (r.status === 'pending_admin_review' || r.status === 'priority_distribution_queue'));
    const q = search.toLowerCase();
    const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.artist_name.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  const logReview = async (releaseId: string, reviewAction: string, notes?: string) => {
    await supabase.from('release_reviews').insert([{
      release_id: releaseId,
      admin_id:   user?.id ?? null,
      action:     reviewAction,
      notes:      notes ?? null,
    }]).catch(() => {});
  };

  const notifyArtist = async (userId: string | null, title: string, message: string) => {
    if (!userId) return;
    await supabase.from('user_notifications').insert([{
      user_id: userId, type: 'content', title, message, read: false,
    }]).catch(() => {});
  };

  const openPreview = async (r: QueueRelease) => {
    setPreview(r);
    setNote('');
    setError('');
    setValidation(null);

    // Auto-advance to under_review
    if (r.status === 'submitted' || r.status === 'pending_admin_review' || r.status === 'priority_distribution_queue') {
      await supabase.from('distribution_releases').update({
        status:      'under_review',
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      }).eq('id', r.id);
      await logReview(r.id, 'under_review');
      setReleases(prev => prev.map(x => x.id === r.id ? { ...x, status: 'under_review' } : x));
      setPreview(p => p ? { ...p, status: 'under_review' } : null);
    }

    // Run validation in background
    distributorService.validateRelease(r.id)
      .then(v => setValidation({ errors: v.errors, warnings: v.warnings }))
      .catch(() => {});
  };

  // ── Admin actions ─────────────────────────────────────────────────────────

  const approve = async (r: QueueRelease) => {
    setActingId(r.id); setAction('approving'); setError('');
    try {
      // 1. Mark approved in DB
      await supabase.from('distribution_releases').update({
        status:      'approved',
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      }).eq('id', r.id);

      if (r.ecom_product_id) {
        await supabase.from('ecom_products').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', r.ecom_product_id);
      }
      if (r.track_id) {
        await supabase.from('tracks').update({ status: 'approved' }).eq('id', r.track_id);
      } else {
        await supabase.from('tracks').update({ status: 'approved' }).eq('release_id', r.id);
      }

      await logReview(r.id, 'approved');

      // 2. Auto-forward to Ditto immediately after approval
      setAction('forwarding');
      const v = await distributorService.validateRelease(r.id);
      if (v.valid) {
        const result = await distributorService.exportReleaseToDistributor(r.id, 'ditto', user?.id);
        if (result.success) {
          await logReview(r.id, 'forwarded_to_ditto');
          await notifyArtist(r.user_id, 'Release Approved & Sent to Ditto!',
            `"${r.title}" has been approved and forwarded to Ditto Music for global distribution.`);
          setReleases(prev => prev.filter(x => x.id !== r.id));
          setPreview(null);
          return;
        }
        // Export failed — leave in 'approved' for manual forward
        setValidation({ errors: result.errors ?? [], warnings: [] });
      } else {
        setValidation({ errors: v.errors, warnings: v.warnings });
      }

      // Notify artist that approval succeeded even if auto-forward failed
      await notifyArtist(r.user_id, 'Release Approved',
        `"${r.title}" has been approved. Distribution is being prepared.`);
      setReleases(prev => prev.map(x => x.id === r.id ? { ...x, status: 'approved' } : x));
      setPreview(p => p ? { ...p, status: 'approved' } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setActingId(null); setAction('idle');
    }
  };

  const requestChanges = async (r: QueueRelease) => {
    if (!note.trim()) { setError('A note is required.'); return; }
    setActingId(r.id); setAction('requesting_changes'); setError('');
    try {
      await supabase.from('distribution_releases').update({
        status:     'changes_requested',
        admin_note: note.trim(),
        reviewed_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', r.id);

      await logReview(r.id, 'changes_requested', note.trim());
      await notifyArtist(r.user_id, 'Changes Requested',
        `"${r.title}" needs changes: ${note.trim()}`);

      setReleases(prev => prev.map(x => x.id === r.id ? { ...x, status: 'changes_requested', admin_note: note.trim() } : x));
      setPreview(p => p ? { ...p, status: 'changes_requested', admin_note: note.trim() } : null);
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setActingId(null); setAction('idle');
    }
  };

  const forwardToDitto = async (r: QueueRelease) => {
    setActingId(r.id); setAction('forwarding'); setError('');
    try {
      // Validate first
      const v = await distributorService.validateRelease(r.id);
      if (!v.valid) {
        setError(`Cannot export: ${v.errors.join('; ')}`);
        setValidation({ errors: v.errors, warnings: v.warnings });
        return;
      }

      const result = await distributorService.exportReleaseToDistributor(r.id, 'ditto', user?.id);
      if (!result.success) {
        setError((result.errors ?? []).join('; '));
        return;
      }

      await logReview(r.id, 'forwarded_to_ditto');
      await notifyArtist(r.user_id, 'Sent to Ditto Music!',
        `"${r.title}" has been forwarded to Ditto Music for distribution.`);

      setReleases(prev => prev.filter(x => x.id !== r.id));
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Forward failed.');
    } finally {
      setActingId(null); setAction('idle');
    }
  };

  const reject = async (r: QueueRelease) => {
    if (!note.trim()) { setError('A rejection note is required.'); return; }
    setActingId(r.id); setAction('rejecting'); setError('');
    try {
      await supabase.from('distribution_releases').update({
        status:     'rejected',
        admin_note: note.trim(),
        reviewed_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', r.id);

      await logReview(r.id, 'rejected', note.trim());
      await notifyArtist(r.user_id, 'Release Rejected',
        `"${r.title}" was not approved: ${note.trim()}`);

      setReleases(prev => prev.filter(x => x.id !== r.id));
      setPreview(null); setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setActingId(null); setAction('idle');
    }
  };

  const isActing = (id: string) => actingId === id;

  // ── Tab counts ────────────────────────────────────────────────────────────

  const countForTab = (key: string) => {
    if (key === 'all') return releases.length;
    if (key === 'submitted') return releases.filter(r => r.status === 'submitted' || r.status === 'pending_admin_review' || r.status === 'priority_distribution_queue').length;
    return releases.filter(r => r.status === key).length;
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-[#00D9FF] animate-spin" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-[#9D4EDD]" />
            <h2 className="text-white font-black text-xl">Release Queue</h2>
          </div>
          <p className="text-gray-500 text-sm">
            Review artist releases and forward approved music to Ditto Music
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[#FFB800]/10 border border-[#FFB800]/20 text-[#FFB800] text-xs font-bold rounded-full">
            {releases.filter(r => ACTIVE_STATUSES.includes(r.status)).length} awaiting action
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or artist…"
            className={inputCls + ' pl-9'}
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map(t => {
          const cnt = countForTab(t.key);
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
                active
                  ? 'text-white border-white/20 bg-white/10'
                  : 'text-gray-500 border-white/5 bg-white/3 hover:text-white hover:bg-white/6',
              ].join(' ')}
              style={active ? { borderColor: `${t.color}44`, color: t.color } : {}}
            >
              {t.label}
              {cnt > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: (active ? t.color : '#4b5563') + '30', color: active ? t.color : '#6b7280' }}
                >
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-2xl">
          <Radio className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {search ? 'No releases match that search.' : `No releases with status "${tab}".`}
          </p>
        </div>
      )}

      {/* Release table */}
      <div className="space-y-2">
        {filtered.map(r => {
          const si = STATUS[r.status] ?? { label: r.status, color: '#9ca3af' };
          const isApproved = r.status === 'approved';
          const needsAction = ACTIVE_STATUSES.includes(r.status);

          return (
            <div
              key={r.id}
              className={[
                'flex items-start gap-4 p-4 rounded-xl border transition-colors',
                needsAction
                  ? 'bg-[#0B0814] border-white/8 hover:border-white/15'
                  : 'bg-white/3 border-white/5 hover:border-white/10',
              ].join(' ')}
            >
              {/* Artwork */}
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
                {r.cover_url
                  ? <img src={r.cover_url} alt="" className="w-full h-full object-cover" />
                  : <Music className="w-6 h-6 text-white/30" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-semibold text-sm truncate">{r.title}</p>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: si.color + '20', color: si.color }}
                  >
                    {si.label}
                  </span>
                </div>

                <p className="text-gray-400 text-xs">
                  {r.artist_name} · {r.release_type.toUpperCase()} · {r.genre ?? '—'} · {r.track_count} track{r.track_count !== 1 ? 's' : ''}
                  {r.release_date && ` · ${new Date(r.release_date).toLocaleDateString()}`}
                  {r.territories && r.territories.length > 0 && ` · ${r.territories.length} territories`}
                </p>

                <Completeness release={r} />

                {r.admin_note && (r.status === 'changes_requested' || r.status === 'rejected') && (
                  <p className="text-[#FF6B00] text-xs">Note: {r.admin_note}</p>
                )}

                {r.submitted_at && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                    <Clock className="w-2.5 h-2.5" />
                    Submitted {new Date(r.submitted_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => openPreview(r)}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Preview & Review"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {isApproved && (
                  <button
                    onClick={() => forwardToDitto(r)}
                    disabled={isActing(r.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9D4EDD]/10 border border-[#9D4EDD]/30 text-[#9D4EDD] text-xs font-semibold rounded-lg hover:bg-[#9D4EDD]/20 disabled:opacity-50 transition-colors"
                    title="Forward to Ditto"
                  >
                    {isActing(r.id) && action === 'forwarding'
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <ArrowRight className="w-3 h-3" />}
                    Forward
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          onClick={() => { setPreview(null); setError(''); setNote(''); setValidation(null); }}
        >
          <div
            className="bg-[#0B0814] border border-white/10 rounded-2xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-white font-black text-lg">{preview.title}</h4>
                <p className="text-gray-400 text-sm mt-0.5">
                  by {preview.artist_name} · {preview.release_type.toUpperCase()} · {preview.track_count} track{preview.track_count !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => { setPreview(null); setError(''); setNote(''); setValidation(null); }} className="text-gray-400 hover:text-white text-xl leading-none shrink-0">✕</button>
            </div>

            {/* Status badge */}
            {(() => {
              const si = STATUS[preview.status] ?? { label: preview.status, color: '#999' };
              return (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ background: si.color + '20', color: si.color, border: `1px solid ${si.color}33` }}>
                    {si.label}
                  </span>
                  {preview.submitted_at && (
                    <span className="text-xs text-gray-500">
                      Submitted {new Date(preview.submitted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Two-column preview */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Left: artwork + audio */}
              <div className="space-y-3">
                {preview.cover_url ? (
                  <img src={preview.cover_url} alt="Artwork" className="w-full aspect-square object-cover rounded-xl" />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-gradient-to-br from-[#9D4EDD] to-[#00D9FF] flex items-center justify-center">
                    <Music className="w-12 h-12 text-white/30" />
                  </div>
                )}
                {preview.audio_url && (
                  <audio controls src={preview.audio_url} className="w-full" />
                )}
              </div>

              {/* Right: metadata grid */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
                  {[
                    ['Genre',        preview.genre ?? '—'],
                    ['Language',     preview.language_code ?? '—'],
                    ['Release Type', preview.release_type],
                    ['Tracks',       String(preview.track_count)],
                    ['Explicit',     preview.explicit ? 'Yes' : 'No'],
                    ['Release Date', preview.release_date ? new Date(preview.release_date).toLocaleDateString() : '—'],
                    ['Label',        preview.label_name ?? '—'],
                    ['ISRC',         preview.isrc ?? '—'],
                    ['Copyright',    preview.copyright_owner ?? '—'],
                    ['Composer',     preview.composer ?? '—'],
                    ['Producer',     preview.producer ?? '—'],
                    ['Territories',  preview.territories?.join(', ') || 'Worldwide'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col">
                      <span className="text-gray-500">{k}</span>
                      <span className="text-white font-medium truncate">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Completeness in modal */}
                <div className="bg-white/3 border border-white/8 rounded-xl p-3">
                  <Completeness release={preview} />
                </div>
              </div>
            </div>

            {/* Platforms */}
            <div className="bg-[#9D4EDD]/8 border border-[#9D4EDD]/20 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-[#9D4EDD] mb-2">Will be distributed to:</p>
              <div className="flex flex-wrap gap-1.5">
                {['Spotify', 'Apple Music', 'TikTok', 'YouTube Music', 'Boomplay', 'Audiomack'].map(p => (
                  <span key={p} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-gray-300">{p}</span>
                ))}
              </div>
            </div>

            {/* Validation results */}
            {validation && (
              <div className="space-y-2">
                {validation.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    {e}
                  </div>
                ))}
                {validation.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 bg-[#FFB800]/8 border border-[#FFB800]/20 rounded-lg px-3 py-2 text-xs text-[#FFB800]">
                    <Filter className="w-3 h-3 mt-0.5 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Admin note field */}
            {preview.status !== 'approved' && (
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 block">
                  Admin Note <span className="text-gray-600 normal-case font-normal">(required for Request Changes or Reject)</span>
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="Explain what the artist needs to fix…"
                  className={inputCls + ' resize-none'}
                />
              </div>
            )}

            {/* Actions */}
            {preview.status === 'approved' ? (
              <button
                onClick={() => forwardToDitto(preview)}
                disabled={isActing(preview.id)}
                className="w-full py-3 bg-[#9D4EDD] text-white font-bold rounded-xl text-sm hover:bg-[#9D4EDD]/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isActing(preview.id) && action === 'forwarding'
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Generating export & forwarding…</>
                  : <><ArrowRight className="w-4 h-4" />Forward to Ditto Music</>}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-3">
                  <button
                    onClick={() => approve(preview)}
                    disabled={isActing(preview.id)}
                    className="flex-1 py-3 bg-[#00F5A0] text-black font-bold rounded-xl text-sm hover:bg-[#00F5A0]/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isActing(preview.id) && action === 'approving'
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Approving…</>
                      : <><CheckCircle className="w-4 h-4" />Approve</>}
                  </button>
                  <button
                    onClick={() => requestChanges(preview)}
                    disabled={isActing(preview.id) || !note.trim()}
                    className="flex-1 py-3 bg-[#FF6B00]/10 border border-[#FF6B00]/30 text-[#FF6B00] font-bold rounded-xl text-sm hover:bg-[#FF6B00]/20 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {isActing(preview.id) && action === 'requesting_changes'
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
                      : <><RotateCcw className="w-4 h-4" />Request Changes</>}
                  </button>
                </div>
                <button
                  onClick={() => reject(preview)}
                  disabled={isActing(preview.id) || !note.trim()}
                  className="w-full py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl text-sm hover:bg-red-500/20 disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {isActing(preview.id) && action === 'rejecting' ? 'Rejecting…' : 'Reject Release'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
