import React, { useEffect, useState, useCallback } from 'react';
import { Bell, Mail, Smartphone, Check, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// ── Types ──────────────────────────────────────────────────────────────────────

interface NotifPrefs {
  email_new_release:       boolean;
  email_competition:       boolean;
  email_payout:            boolean;
  email_comment:           boolean;
  email_follow:            boolean;
  email_newsletter:        boolean;
  push_new_release:        boolean;
  push_competition:        boolean;
  push_payout:             boolean;
  push_comment:            boolean;
  push_follow:             boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  email_new_release:  true,
  email_competition:  true,
  email_payout:       true,
  email_comment:      false,
  email_follow:       false,
  email_newsletter:   true,
  push_new_release:   true,
  push_competition:   true,
  push_payout:        true,
  push_comment:       true,
  push_follow:        true,
};

// ── Toggle Row ─────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-[#00D9FF]' : 'bg-white/15'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

interface PrefRowProps {
  label:    string;
  sublabel?: string;
  checked:  boolean;
  onChange: (v: boolean) => void;
}

function PrefRow({ label, sublabel, checked, onChange }: PrefRowProps) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-white text-sm font-medium">{label}</p>
        {sublabel && <p className="text-white/35 text-xs mt-0.5">{sublabel}</p>}
      </div>
      <Toggle on={checked} onChange={onChange} />
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NotificationSettingsPage() {
  const { user }  = useAuth();
  const [prefs,   setPrefs]   = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  const fetchPrefs = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setPrefs({ ...DEFAULT_PREFS, ...data });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const set = (key: keyof NotifPrefs) => (val: boolean) => {
    setPrefs(p => ({ ...p, [key]: val }));
    setSaved(false);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('notification_preferences').upsert([{
      user_id: user.id,
      ...prefs,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0B0814] text-white">
      <Header />

      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-12">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <Link to="/dashboard" className="text-white/30 hover:text-white transition-colors flex items-center gap-1 text-sm">
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-white/15">/</span>
          <span className="text-white/60 text-sm">Notification Settings</span>
        </div>

        <h1 className="text-2xl font-black mb-2 flex items-center gap-2">
          <Bell className="w-6 h-6 text-[#00D9FF]" />
          Notification Settings
        </h1>
        <p className="text-white/40 text-sm mb-8">Control how and when WANKONG contacts you.</p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* Email notifications */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-4 h-4 text-[#00D9FF]" />
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">Email</h2>
              </div>
              <PrefRow
                label="New releases from followed artists"
                sublabel="Get an email when artists you follow drop new music"
                checked={prefs.email_new_release}
                onChange={set('email_new_release')}
              />
              <PrefRow
                label="Competition results & updates"
                sublabel="Notifications about competitions you entered or are watching"
                checked={prefs.email_competition}
                onChange={set('email_competition')}
              />
              <PrefRow
                label="Payout processed"
                sublabel="Confirmation when your withdrawal is approved"
                checked={prefs.email_payout}
                onChange={set('email_payout')}
              />
              <PrefRow
                label="Comments on your content"
                sublabel="Someone commented on your track or book"
                checked={prefs.email_comment}
                onChange={set('email_comment')}
              />
              <PrefRow
                label="New followers"
                sublabel="When someone starts following you"
                checked={prefs.email_follow}
                onChange={set('email_follow')}
              />
              <PrefRow
                label="WANKONG newsletter & announcements"
                sublabel="Platform news, curated picks, and feature updates"
                checked={prefs.email_newsletter}
                onChange={set('email_newsletter')}
              />
            </div>

            {/* Push / in-app notifications */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Smartphone className="w-4 h-4 text-[#9D4EDD]" />
                <h2 className="text-white font-bold text-sm uppercase tracking-wider">Push & In-App</h2>
              </div>
              <PrefRow
                label="New releases from followed artists"
                checked={prefs.push_new_release}
                onChange={set('push_new_release')}
              />
              <PrefRow
                label="Competition results & updates"
                checked={prefs.push_competition}
                onChange={set('push_competition')}
              />
              <PrefRow
                label="Payout processed"
                checked={prefs.push_payout}
                onChange={set('push_payout')}
              />
              <PrefRow
                label="Comments on your content"
                checked={prefs.push_comment}
                onChange={set('push_comment')}
              />
              <PrefRow
                label="New followers"
                checked={prefs.push_follow}
                onChange={set('push_follow')}
              />
            </div>

            {/* Save */}
            <button
              onClick={save}
              disabled={saving}
              className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#00D9FF,#9D4EDD)' }}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <><Check className="w-4 h-4" /> Saved!</>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
