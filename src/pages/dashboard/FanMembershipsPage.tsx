import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Star, Users, DollarSign, Plus, Edit2, Trash2, Check, X, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ──────────────────────────────────────────────────────────────────────

interface MembershipTier {
  id:          string;
  creator_id:  string;
  name:        string;
  price_usd:   number;
  description: string;
  perks:       string[];
  color:       string;
  is_active:   boolean;
  subscriber_count: number;
}

const TIER_COLORS = ['#FFB800', '#00D9FF', '#9D4EDD', '#00F5A0', '#FF006E'];

// ── Tier Form ──────────────────────────────────────────────────────────────────

function TierForm({ initial, onSave, onCancel }: {
  initial?: Partial<MembershipTier>;
  onSave:   (data: Omit<MembershipTier, 'id' | 'creator_id' | 'subscriber_count' | 'is_active'>) => void;
  onCancel: () => void;
}) {
  const [name,  setName]  = useState(initial?.name  ?? '');
  const [price, setPrice] = useState(String(initial?.price_usd ?? 5));
  const [desc,  setDesc]  = useState(initial?.description ?? '');
  const [perks, setPerks] = useState<string[]>(initial?.perks ?? ['']);
  const [color, setColor] = useState(initial?.color ?? TIER_COLORS[0]);

  const addPerk    = () => setPerks(p => [...p, '']);
  const removePerk = (i: number) => setPerks(p => p.filter((_, j) => j !== i));
  const setPerk    = (i: number, v: string) => setPerks(p => p.map((x, j) => j === i ? v : x));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(price);
    if (!name || isNaN(num) || num <= 0) return;
    onSave({ name, price_usd: num, description: desc, perks: perks.filter(Boolean), color });
  };

  const inputCls = "w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-[#9D4EDD]/50 transition-colors";

  return (
    <form onSubmit={handleSubmit} className="bg-white/3 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Tier Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g. Supporter, VIP, Inner Circle" required />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Monthly Price (USD)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
            <input type="number" min="1" step="0.5" value={price} onChange={e => setPrice(e.target.value)}
              className={inputCls + ' pl-8'} placeholder="5.00" required />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Description</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} rows={2}
          placeholder="What do fans get at this tier?" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-white/50">Perks</label>
          <button type="button" onClick={addPerk} className="text-[#00D9FF] text-xs hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add perk
          </button>
        </div>
        <div className="space-y-2">
          {perks.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={p} onChange={e => setPerk(i, e.target.value)} className={inputCls + ' flex-1'}
                placeholder={`Perk ${i + 1} (e.g. Early access to new music)`} />
              {perks.length > 1 && (
                <button type="button" onClick={() => removePerk(i)} className="text-white/30 hover:text-red-400 transition-colors p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-2">Tier Color</label>
        <div className="flex gap-2">
          {TIER_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'scale-110 border-white' : 'border-transparent'}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit"
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#9D4EDD,#00D9FF)' }}>
          Save Tier
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/25 hover:text-white transition-all">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Tier Card ──────────────────────────────────────────────────────────────────

function TierCard({ tier, onEdit, onDelete, onToggle }: {
  tier:     MembershipTier;
  onEdit:   () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <div className={`rounded-2xl border p-5 transition-all ${tier.is_active ? '' : 'opacity-50'}`}
      style={{ background: `${tier.color}08`, borderColor: `${tier.color}30` }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-black text-base" style={{ color: tier.color }}>{tier.name}</h3>
          <p className="text-white/50 text-sm">${tier.price_usd}/month</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white transition-all">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onToggle}
            className={`p-1.5 rounded-lg hover:bg-white/8 transition-all ${tier.is_active ? 'text-emerald-400' : 'text-white/30'}`}
            title={tier.is_active ? 'Deactivate' : 'Activate'}>
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {tier.description && <p className="text-white/50 text-xs mb-3">{tier.description}</p>}

      {tier.perks.length > 0 && (
        <ul className="space-y-1 mb-3">
          {tier.perks.map((p, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-white/70">
              <Check className="w-3 h-3 shrink-0" style={{ color: tier.color }} />
              {p}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-1.5 text-xs text-white/30">
        <Users className="w-3.5 h-3.5" />
        {tier.subscriber_count} subscriber{tier.subscriber_count !== 1 ? 's' : ''}
        <span className="ml-auto font-semibold" style={{ color: tier.color }}>
          ${(tier.price_usd * tier.subscriber_count).toFixed(0)}/mo MRR
        </span>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function FanMembershipsPage() {
  const { user }   = useAuth();
  const [tiers,    setTiers]    = useState<MembershipTier[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0814] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/50 mb-4">Sign in to manage your fan memberships.</p>
          <a href="/auth/login" className="px-6 py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: 'linear-gradient(135deg,#00D9FF,#9D4EDD)' }}>Sign In</a>
        </div>
      </div>
    );
  }

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('creator_id', user.id)
      .order('price_usd', { ascending: true });
    setTiers((data ?? []) as MembershipTier[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (data: Omit<MembershipTier, 'id' | 'creator_id' | 'subscriber_count' | 'is_active'>) => {
    if (!user) return;
    await supabase.from('membership_tiers').insert([{
      ...data,
      creator_id:       user.id,
      is_active:        true,
      subscriber_count: 0,
      created_at:       new Date().toISOString(),
    }]);
    setCreating(false);
    load();
  };

  const handleEdit = async (id: string, data: Omit<MembershipTier, 'id' | 'creator_id' | 'subscriber_count' | 'is_active'>) => {
    await supabase.from('membership_tiers').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this tier? Existing subscribers will keep access until renewal.')) return;
    await supabase.from('membership_tiers').delete().eq('id', id);
    setTiers(prev => prev.filter(t => t.id !== id));
  };

  const handleToggle = async (tier: MembershipTier) => {
    await supabase.from('membership_tiers').update({ is_active: !tier.is_active }).eq('id', tier.id);
    setTiers(prev => prev.map(t => t.id === tier.id ? { ...t, is_active: !t.is_active } : t));
  };

  const totalMRR = tiers.filter(t => t.is_active).reduce((s, t) => s + t.price_usd * t.subscriber_count, 0);

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-12">

        {/* Breadcrumb */}
        <Link to="/dashboard/studio"
          className="inline-flex items-center gap-1.5 text-white/30 hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Creator Studio
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Star className="w-6 h-6 text-[#FFB800]" />
              Fan Memberships
            </h1>
            <p className="text-white/40 text-sm mt-1">Let fans support you with recurring monthly memberships.</p>
          </div>
          {totalMRR > 0 && (
            <div className="text-right">
              <p className="text-[#FFB800] font-black text-xl">${totalMRR.toFixed(0)}</p>
              <p className="text-white/30 text-xs">monthly revenue</p>
            </div>
          )}
        </div>

        {/* Stats strip */}
        {tiers.length > 0 && (
          <div className="flex items-center gap-4 mb-8 p-4 rounded-2xl border border-white/8 bg-white/3 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-[#00D9FF]" />
              <span className="text-white font-bold">{tiers.reduce((s, t) => s + t.subscriber_count, 0)}</span>
              <span className="text-white/40">total fans</span>
            </div>
            <div className="flex items-center gap-2 text-sm ml-auto">
              <DollarSign className="w-4 h-4 text-[#FFB800]" />
              <span className="text-white font-bold">{tiers.filter(t => t.is_active).length}</span>
              <span className="text-white/40">active tiers</span>
            </div>
          </div>
        )}

        {/* Create form */}
        {creating && (
          <div className="mb-6">
            <h2 className="text-white font-bold text-sm mb-3">New Tier</h2>
            <TierForm onSave={handleCreate} onCancel={() => setCreating(false)} />
          </div>
        )}

        {/* Tier list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {tiers.map(t => (
              editingId === t.id ? (
                <div key={t.id}>
                  <h2 className="text-white font-bold text-sm mb-3">Edit Tier</h2>
                  <TierForm
                    initial={t}
                    onSave={data => handleEdit(t.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <TierCard
                  key={t.id}
                  tier={t}
                  onEdit={() => setEditingId(t.id)}
                  onDelete={() => handleDelete(t.id)}
                  onToggle={() => handleToggle(t)}
                />
              )
            ))}

            {tiers.length === 0 && !creating && (
              <div className="text-center py-12 text-white/30">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium mb-1">No membership tiers yet</p>
                <p className="text-xs mb-4">Create tiers so fans can support you monthly</p>
              </div>
            )}
          </div>
        )}

        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-white/20 text-white/40 hover:border-[#9D4EDD]/50 hover:text-[#9D4EDD] transition-all text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add New Tier
          </button>
        )}
      </div>

      <Footer />
    </div>
  );
}
