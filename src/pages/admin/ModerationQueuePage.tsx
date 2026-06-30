import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  Shield, AlertTriangle, CheckCircle2, XCircle,
  Eye, Trash2, Ban, Flag, Loader2,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Report {
  id:            string;
  content_id:    string;
  content_type:  string;
  content_title: string;
  reported_by:   string;
  reason:        string;
  status:        'pending' | 'reviewed' | 'actioned' | 'dismissed';
  created_at:    string;
  reporter_email?: string;
}

type FilterTab = 'all' | 'pending' | 'reviewed' | 'dmca';

// ── Constants ──────────────────────────────────────────────────────────────────

const NAVY = '#0B0814';
const CYAN = '#00D9FF';

const CONTENT_TYPE_COLOURS: Record<string, string> = {
  music:     '#9D4EDD',
  video:     '#00D9FF',
  book:      '#FFB800',
  audiobook: '#00F5A0',
  podcast:   '#FF6B00',
  comment:   '#EF4444',
  profile:   '#6366F1',
};

const STATUS_COLOURS: Record<Report['status'], string> = {
  pending:   '#FFB800',
  reviewed:  '#00D9FF',
  actioned:  '#00F5A0',
  dismissed: '#6B7280',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth()    &&
    d.getDate()     === now.getDate()
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ReportSkeleton() {
  return (
    <div className="animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="flex items-center gap-4 px-6 py-4 border-b border-white/5"
        >
          <div className="h-6 w-20 rounded-full bg-white/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-48 rounded bg-white/10" />
            <div className="h-3 w-64 rounded bg-white/5" />
          </div>
          <div className="h-3 w-20 rounded bg-white/5" />
          <div className="flex gap-2">
            {[1, 2, 3].map(j => (
              <div key={j} className="h-8 w-8 rounded-lg bg-white/10" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, colour,
}: {
  label: string;
  value: number;
  icon:  React.ReactNode;
  colour: string;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-xl px-5 py-4 border"
      style={{ background: `${colour}0d`, borderColor: `${colour}22` }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${colour}1a`, color: colour }}
      >
        {icon}
      </div>
      <div>
        <p className="text-white/40 text-xs font-medium">{label}</p>
        <p className="text-2xl font-black" style={{ color: colour }}>
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ── Confirmation modal ────────────────────────────────────────────────────────

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  danger,
}: {
  message:   string;
  onConfirm: () => void;
  onCancel:  () => void;
  danger?:   boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl"
        style={{ background: '#0B0814' }}
      >
        <div className="flex items-start gap-3 mb-5">
          <AlertTriangle
            className="w-5 h-5 mt-0.5 shrink-0"
            style={{ color: danger ? '#EF4444' : '#FFB800' }}
          />
          <p className="text-white text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors"
            style={{ background: danger ? '#EF4444' : CYAN, color: danger ? '#fff' : NAVY }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Content type badge ────────────────────────────────────────────────────────

function ContentTypeBadge({ type }: { type: string }) {
  const colour = CONTENT_TYPE_COLOURS[type.toLowerCase()] ?? '#6B7280';
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize"
      style={{ background: `${colour}22`, color: colour }}
    >
      {type}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Report['status'] }) {
  const colour = STATUS_COLOURS[status];
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize"
      style={{ background: `${colour}22`, color: colour }}
    >
      {status}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ModerationQueuePage() {
  const { user, isAdmin } = useAuth();

  const [reports,    setReports]    = useState<Report[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<FilterTab>('all');
  const [actionLoad, setActionLoad] = useState<string | null>(null);
  const [confirm,    setConfirm]    = useState<{
    reportId: string;
    action:   'ban' | 'delete';
    message:  string;
  } | null>(null);

  // ── Fetch reports ─────────────────────────────────────────────────────────────

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('content_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Table may not exist yet — fail gracefully
      console.warn('content_reports table not found or inaccessible:', error.message);
      setReports([]);
    } else {
      setReports((data ?? []) as Report[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // ── Derived stats ─────────────────────────────────────────────────────────────

  const totalReports   = reports.length;
  const pendingCount   = reports.filter(r => r.status === 'pending').length;
  const actionedToday  = reports.filter(
    r => r.status === 'actioned' && isToday(r.created_at),
  ).length;

  // ── Filter ────────────────────────────────────────────────────────────────────

  const filteredReports = reports.filter(r => {
    if (activeTab === 'pending')  return r.status === 'pending';
    if (activeTab === 'reviewed') return r.status === 'reviewed';
    if (activeTab === 'dmca')     return r.reason.toLowerCase().includes('dmca') || r.reason.toLowerCase().includes('copyright');
    return true;
  });

  // ── Actions ───────────────────────────────────────────────────────────────────

  /** Dismiss (approve content, mark report as dismissed) */
  const handleDismiss = useCallback(async (reportId: string) => {
    setActionLoad(reportId);
    await supabase
      .from('content_reports')
      .update({ status: 'dismissed' })
      .eq('id', reportId);
    setReports(prev =>
      prev.map(r => r.id === reportId ? { ...r, status: 'dismissed' } : r),
    );
    setActionLoad(null);
  }, []);

  /** Remove content — deletes the product and marks report actioned */
  const handleRemoveContent = useCallback(async (report: Report) => {
    setActionLoad(report.id);
    await Promise.all([
      supabase.from('ecom_products').delete().eq('id', report.content_id),
      supabase
        .from('content_reports')
        .update({ status: 'actioned' })
        .eq('id', report.id),
    ]);
    setReports(prev =>
      prev.map(r => r.id === report.id ? { ...r, status: 'actioned' } : r),
    );
    setActionLoad(null);
  }, []);

  /** Warn user — sends a notification (best-effort) */
  const handleWarnUser = useCallback(async (report: Report) => {
    setActionLoad(report.id);
    await Promise.all([
      supabase.from('user_notifications').insert({
        user_id: report.reported_by,
        type:    'warning',
        title:   'Content Warning',
        body:    `Your content "${report.content_title}" has received a moderation warning. Please review our community guidelines.`,
        read:    false,
      }),
      supabase
        .from('content_reports')
        .update({ status: 'reviewed' })
        .eq('id', report.id),
    ]);
    setReports(prev =>
      prev.map(r => r.id === report.id ? { ...r, status: 'reviewed' } : r),
    );
    setActionLoad(null);
  }, []);

  /** Ban user — update profile banned flag, mark report actioned */
  const handleBanUser = useCallback(async (report: Report) => {
    setActionLoad(report.id);
    await Promise.all([
      supabase
        .from('profiles')
        .update({ banned: true })
        .eq('id', report.reported_by),
      supabase
        .from('content_reports')
        .update({ status: 'actioned' })
        .eq('id', report.id),
    ]);
    setReports(prev =>
      prev.map(r => r.id === report.id ? { ...r, status: 'actioned' } : r),
    );
    setActionLoad(null);
    setConfirm(null);
  }, []);

  // ── Confirm guard ─────────────────────────────────────────────────────────────

  const requestConfirm = (report: Report, action: 'ban' | 'delete') => {
    const message =
      action === 'ban'
        ? `Are you sure you want to ban this user? This will prevent them from accessing their account.`
        : `Are you sure you want to permanently delete "${report.content_title}"? This cannot be undone.`;
    setConfirm({ reportId: report.id, action, message });
  };

  const handleConfirmed = () => {
    if (!confirm) return;
    const report = reports.find(r => r.id === confirm.reportId);
    if (!report) return;
    if (confirm.action === 'ban')    handleBanUser(report);
    if (confirm.action === 'delete') handleRemoveContent(report);
  };

  // ── Guard ─────────────────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: NAVY }}>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-white font-semibold text-lg">Access Denied</p>
            <p className="text-gray-400 text-sm mt-1">You do not have permission to view this page.</p>
            <Link to="/" className="mt-4 inline-block text-sm" style={{ color: CYAN }}>
              Return home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const TABS: { key: FilterTab; label: string; count?: number }[] = [
    { key: 'all',      label: 'All',      count: totalReports },
    { key: 'pending',  label: 'Pending',  count: pendingCount },
    { key: 'reviewed', label: 'Reviewed', count: reports.filter(r => r.status === 'reviewed').length },
    { key: 'dmca',     label: 'DMCA / Copyright' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: NAVY }}>
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${CYAN}1a`, color: CYAN }}
          >
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-white text-xl font-black tracking-tight">Content Moderation</h1>
            <p className="text-gray-500 text-xs mt-0.5">
              Review and action flagged content reports
            </p>
          </div>
          <div className="ml-auto">
            <Link
              to="/admin/dashboard"
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              ← Admin Dashboard
            </Link>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total Reports"
            value={totalReports}
            colour="#9D4EDD"
            icon={<Flag className="w-5 h-5" />}
          />
          <StatCard
            label="Pending Review"
            value={pendingCount}
            colour="#FFB800"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <StatCard
            label="Actioned Today"
            value={actionedToday}
            colour="#00F5A0"
            icon={<CheckCircle2 className="w-5 h-5" />}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-white/5 pb-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all rounded-t-lg -mb-px border-b-2',
                activeTab === tab.key
                  ? 'text-white border-[#00D9FF]'
                  : 'text-gray-500 border-transparent hover:text-gray-300',
              ].join(' ')}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: activeTab === tab.key ? `${CYAN}22` : 'rgba(255,255,255,0.07)',
                    color:      activeTab === tab.key ? CYAN       : '#6B7280',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Report list */}
        <div
          className="rounded-2xl border border-white/5 overflow-hidden"
          style={{ background: '#0B0814' }}
        >
          {loading ? (
            <ReportSkeleton />
          ) : filteredReports.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center gap-3 py-16">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: `${CYAN}12` }}
              >
                <CheckCircle2 className="w-7 h-7" style={{ color: CYAN }} />
              </div>
              <p className="text-white font-semibold">No reports here</p>
              <p className="text-gray-500 text-sm">
                {activeTab === 'all'
                  ? 'No content reports have been submitted yet.'
                  : `No ${activeTab} reports at this time.`}
              </p>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="grid grid-cols-[auto_1fr_160px_100px_auto] gap-4 px-6 py-3 border-b border-white/5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hidden lg:grid">
                <span>Type</span>
                <span>Content / Reason</span>
                <span>Reporter</span>
                <span>Date</span>
                <span>Actions</span>
              </div>

              {/* Rows */}
              {filteredReports.map(report => {
                const isActioning = actionLoad === report.id;
                return (
                  <div
                    key={report.id}
                    className="flex flex-col lg:grid lg:grid-cols-[auto_1fr_160px_100px_auto] gap-3 lg:gap-4 px-6 py-4 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors items-start lg:items-center"
                  >
                    {/* Type badge */}
                    <div className="flex items-center gap-2">
                      <ContentTypeBadge type={report.content_type} />
                      <StatusBadge status={report.status} />
                    </div>

                    {/* Content + reason */}
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold line-clamp-1">
                        {report.content_title || 'Untitled content'}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">
                        <span className="text-red-400 font-medium">Reason: </span>
                        {report.reason}
                      </p>
                    </div>

                    {/* Reporter */}
                    <div className="min-w-0">
                      <p className="text-gray-400 text-xs truncate">
                        {report.reporter_email ?? report.reported_by.slice(0, 12) + '…'}
                      </p>
                    </div>

                    {/* Date */}
                    <p className="text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(report.created_at)}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isActioning ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : (
                        <>
                          {/* Dismiss / Approve */}
                          {report.status === 'pending' && (
                            <button
                              onClick={() => handleDismiss(report.id)}
                              title="Dismiss report — approve content"
                              className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-[#00F5A0] hover:border-[#00F5A0]/30 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* View content */}
                          <a
                            href={`/content/${report.content_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View content"
                            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-[#00D9FF] hover:border-[#00D9FF]/30 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </a>

                          {/* Warn user */}
                          <button
                            onClick={() => handleWarnUser(report)}
                            title="Warn user"
                            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-yellow-400 hover:border-yellow-400/30 transition-colors"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>

                          {/* Delete content */}
                          <button
                            onClick={() => requestConfirm(report, 'delete')}
                            title="Remove content"
                            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-red-400 hover:border-red-400/30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Ban user */}
                          <button
                            onClick={() => requestConfirm(report, 'ban')}
                            title="Ban user"
                            className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-red-500 hover:border-red-500/30 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Confirmation modal */}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          danger={true}
          onConfirm={handleConfirmed}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
