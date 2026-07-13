import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth, type AdminRole, type AdminPlatform } from '@/contexts/AuthContext';
import Seo from '@/components/Seo';
import { toast } from 'sonner';
import { ShieldCheck, Crown, Trash2, Loader2, UserPlus, ArrowLeft, Lock } from 'lucide-react';

// Super-admin console — the top of the hierarchy. A super_admin spans every
// platform and is the only role that can promote or revoke other admins.
// Regular admins are scoped to a single platform (wankong | smartkong).

const ADMIN_ROLES: { value: AdminRole; label: string }[] = [
  { value: 'moderator', label: 'Moderator' },
  { value: 'competition_admin', label: 'Competition admin' },
  { value: 'distribution_admin', label: 'Distribution admin' },
  { value: 'publishing_admin', label: 'Publishing admin' },
  { value: 'finance_admin', label: 'Finance admin' },
  { value: 'support_admin', label: 'Support admin' },
  { value: 'super_admin', label: 'Super admin (all platforms)' },
];
const PLATFORMS: { value: AdminPlatform; label: string }[] = [
  { value: 'wankong', label: 'Wankong only' },
  { value: 'smartkong', label: 'SmartKong only' },
  { value: 'all', label: 'All platforms' },
];

interface AdminRow { user_id: string; email: string; role: string; platform: string; created_at: string }

const roleLabel = (r: string) => ADMIN_ROLES.find(x => x.value === r)?.label ?? r;

export default function SuperAdminPage() {
  const { user, isSuperAdmin, loading } = useAuth();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('moderator');
  const [platform, setPlatform] = useState<AdminPlatform>('wankong');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('list_admins');
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as AdminRow[]);
  }, []);

  useEffect(() => { if (isSuperAdmin) load(); }, [isSuperAdmin, load]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-gray-900 text-white flex items-center justify-center mx-auto mb-4"><Lock className="w-6 h-6" /></div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Super admin only</h1>
          <p className="text-gray-500 text-sm mb-6">This console is restricted to super administrators.</p>
          <Link to="/" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">Go home</Link>
        </div>
      </div>
    );
  }

  const promote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    const p = role === 'super_admin' ? 'all' : platform;
    const { error } = await supabase.rpc('grant_admin', { p_email: email.trim(), p_role: role, p_platform: p });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${email.trim()} is now ${roleLabel(role)}`);
    setEmail('');
    load();
  };

  const revoke = async (r: AdminRow) => {
    if (r.user_id === user.id && r.role === 'super_admin') { toast.error('You cannot revoke your own super admin role.'); return; }
    if (!confirm(`Revoke ${roleLabel(r.role)} from ${r.email}?`)) return;
    const { error } = await supabase.rpc('revoke_admin', { p_user_id: r.user_id, p_role: r.role });
    if (error) { toast.error(error.message); return; }
    toast.success('Admin role revoked');
    load();
  };

  const platBadge = (p: string) =>
    p === 'all' ? 'bg-violet-100 text-violet-700' : p === 'smartkong' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';

  return (
    <div className="min-h-screen bg-gray-50">
      <Seo title="Super Admin" noIndex />
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-10">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"><ArrowLeft className="w-4 h-4" /> Admin dashboard</Link>

        <div className="flex items-center gap-3.5 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-900 text-amber-300 flex items-center justify-center"><Crown className="w-6 h-6" /></div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Super Admin</h1>
            <p className="text-sm text-gray-500">Promote accounts to admin, scope them to a platform, and manage the whole team.</p>
          </div>
        </div>

        {/* Promote */}
        <form onSubmit={promote} className="bg-white border border-gray-200 rounded-2xl p-5 mb-8">
          <p className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4"><UserPlus className="w-4 h-4 text-blue-600" /> Grant admin rights</p>
          <div className="grid sm:grid-cols-[1fr_180px_170px_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Account email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="person@email.com"
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Role</label>
              <select value={role} onChange={e => setRole(e.target.value as AdminRole)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ADMIN_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Platform</label>
              <select value={role === 'super_admin' ? 'all' : platform} disabled={role === 'super_admin'} onChange={e => setPlatform(e.target.value as AdminPlatform)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60">
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <button type="submit" disabled={saving}
              className="h-[42px] px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? 'Granting…' : 'Grant'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">The account must already exist. Super admins always span every platform; scoped admins only get access on their platform.</p>
        </form>

        {/* Team */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-900">Admin team ({rows.length})</p>
          {busy && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {rows.length === 0 && !busy ? (
            <p className="text-sm text-gray-400 p-6 text-center">No admins yet.</p>
          ) : rows.map((r, i) => {
            const isSuper = r.role === 'super_admin';
            const self = r.user_id === user.id;
            return (
              <div key={r.user_id + r.role} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isSuper ? 'bg-gray-900 text-amber-300' : 'bg-blue-50 text-blue-600'}`}>
                  {isSuper ? <Crown className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.email}{self && <span className="ml-2 text-[10px] text-gray-400 font-medium">you</span>}</p>
                  <p className="text-xs text-gray-400">{roleLabel(r.role)}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${platBadge(r.platform)}`}>{r.platform === 'all' ? 'All platforms' : r.platform}</span>
                <button onClick={() => revoke(r)} disabled={self && isSuper} title={self && isSuper ? 'You cannot revoke your own super admin' : 'Revoke'}
                  className="p-2 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-300 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
