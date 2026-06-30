import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useApp } from '@/store/AppContext';
import { supabase } from '@/lib/supabase';
import { getAllCountries } from '@/lib/countries';
import { SUPPORTED_LANGUAGES, applyLangDir } from '@/lib/i18n';
import SocialConnectionsPanel from '@/components/social/SocialConnectionsPanel';

// Lazy-compute country list (runs once)
const COUNTRY_LIST = getAllCountries();

export default function SettingsView() {
  const { t, i18n } = useTranslation();
  const { user } = useApp();

  const [activeTab,    setActiveTab]    = useState<'profile' | 'connections' | 'payments' | 'security' | 'notifications'>('profile');
  const [displayName,  setDisplayName]  = useState(user?.displayName ?? '');
  const [bio,          setBio]          = useState('');
  const [country,      setCountry]      = useState(user?.country ?? 'NG');
  const [language,     setLanguage]     = useState(i18n.language.slice(0, 2)); // normalize e.g. "en-US" → "en"
  const [saving,       setSaving]       = useState(false);
  const [notifPrefs,   setNotifPrefs]   = useState({
    payments: true, subscriptions: true, competitions: true,
    content: true, marketing: false, system: true,
  });

  // ── Language change: live-update UI + store in localStorage ──────────────────

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    applyLangDir(lang);
  };

  // ── Save profile to Supabase user_metadata ────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          country,
          language,
        },
      });
      if (error) throw error;
      toast.success(t('settings.saved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile'       as const, label: t('settings.profile') },
    { id: 'connections'   as const, label: 'Connections' },
    { id: 'payments'      as const, label: t('settings.payments') },
    { id: 'security'      as const, label: t('settings.security') },
    { id: 'notifications' as const, label: t('settings.notifications') },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>

      {/* Tab bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-[#9D4EDD] text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Connections tab ──────────────────────────────────────────────────── */}
      {activeTab === 'connections' && <SocialConnectionsPanel />}

      {/* ── Profile tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-6">

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <img
              src={user?.avatar ?? `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName}`}
              alt=""
              className="w-20 h-20 rounded-full object-cover border-2 border-[#9D4EDD]"
            />
            <div>
              <button className="bg-[#9D4EDD] hover:bg-[#7C3AED] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                {t('settings.changeAvatar')}
              </button>
              <p className="text-xs text-gray-500 mt-1">{t('settings.avatarHint')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Display name */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">{t('settings.displayName')}</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
              />
            </div>

            {/* Username (read-only) */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">{t('settings.username')}</label>
              <input
                type="text"
                value={user?.username ?? ''}
                readOnly
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
              />
            </div>

            {/* ── Section 2: Full ISO-3166 country selector ── */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">{t('settings.country')}</label>
              <select
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
              >
                {COUNTRY_LIST.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* ── Section 3: Language selector (8 languages, live-switches UI) ── */}
            <div>
              <label className="block text-sm text-gray-300 mb-1">{t('settings.language')}</label>
              <select
                value={language}
                onChange={e => handleLanguageChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeLabel} — {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm text-gray-300 mb-1">{t('settings.bio')}</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-60 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            {saving ? t('common.loading') : t('settings.saveChanges')}
          </button>
        </div>
      )}

      {/* ── Payments tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">{t('settings.connectedPayments')}</h3>
          <div className="space-y-3">
            {[
              { method: 'Stripe Connect', status: t('settings.connected'),    detail: 'acct_1234...',       color: 'emerald' },
              { method: 'M-Pesa',         status: t('settings.connected'),    detail: '+254 7XX XXX XXX',   color: 'emerald' },
              { method: 'MTN MoMo',       status: t('settings.notConnected'), detail: 'Click to connect',  color: 'gray'    },
              { method: 'Paystack',       status: t('settings.notConnected'), detail: 'Click to connect',  color: 'gray'    },
            ].map(pm => (
              <div key={pm.method} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-white">{pm.method}</p>
                  <p className="text-xs text-gray-400">{pm.detail}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${pm.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                  {pm.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Security tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">{t('settings.kycTitle')}</h3>
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/20">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t('settings.kycVerified')}</p>
                  <p className="text-xs text-gray-400">{t('settings.kycVerifiedDesc')}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">{t('settings.security')}</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">{t('settings.changePassword')}</p>
                  <p className="text-xs text-gray-400">Last changed 30 days ago</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">{t('settings.twoFactor')}</p>
                  <p className="text-xs text-emerald-400">{t('settings.twoFactorEnabled')}</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications tab ────────────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">{t('settings.notificationPrefs')}</h3>
          <div className="space-y-4">
            {Object.entries(notifPrefs).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white capitalize">{key}</p>
                  <p className="text-xs text-gray-400">{t('settings.receiveNotif', { type: key })}</p>
                </div>
                <button
                  onClick={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${value ? 'bg-[#9D4EDD]' : 'bg-gray-700'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
