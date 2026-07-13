import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Store, CheckCircle2, Clock, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const PAYMENT_PROVIDERS = ['PayPal', 'Bank Transfer', 'Mobile Money', 'Stripe', 'Payoneer'] as const;

const PERKS = [
  'Sell digital and physical products to a global audience',
  'Keep 80% of every sale — payouts via PayPal, M-Pesa, bank and more',
  'Your products appear on the Wankong marketplace and storefronts',
  'Track sales, revenue splits and payouts from your vendor dashboard',
];

export default function VendorRegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [existing, setExisting] = useState<{ status: string; business_name: string } | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({
    business_name:    '',
    business_email:   '',
    phone:            '',
    country:          '',
    description:      '',
    payment_provider: 'PayPal',
    payment_handle:   '',
  });

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    supabase
      .from('vendor_accounts')
      .select('status, business_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setExisting(data);
        setChecking(false);
      });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from('vendor_accounts').insert([{
      user_id:          user.id,
      business_name:    form.business_name.trim(),
      business_email:   form.business_email.trim() || null,
      phone:            form.phone.trim() || null,
      country:          form.country.trim() || null,
      description:      form.description.trim() || null,
      payment_provider: form.payment_provider,
      payment_details:  form.payment_handle ? { handle: form.payment_handle.trim() } : {},
    }]);

    setSaving(false);
    if (error) {
      toast.error(error.message.includes('duplicate')
        ? 'You already have a vendor application.'
        : 'Could not submit your application.');
      return;
    }
    toast.success('Application submitted! We’ll review it shortly.');
    setExisting({ status: 'pending', business_name: form.business_name });
  };

  const statusView = existing && (
    existing.status === 'approved' ? (
      <div className="text-center py-12">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">You're a Wankong vendor!</h2>
        <p className="text-white/50 mb-6">{existing.business_name} is approved and ready to sell.</p>
        <button
          onClick={() => navigate('/dashboard/vendor')}
          className="px-6 py-3 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white font-semibold rounded-xl transition-colors"
        >
          Go to Vendor Dashboard
        </button>
      </div>
    ) : existing.status === 'pending' ? (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Application under review</h2>
        <p className="text-white/50">
          Thanks, {existing.business_name}! Our team is reviewing your application.
          You'll be able to sell as soon as it's approved.
        </p>
      </div>
    ) : (
      <div className="text-center py-12">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          Application {existing.status === 'suspended' ? 'suspended' : 'not approved'}
        </h2>
        <p className="text-white/50">
          Please <Link to="/help" className="text-[#B794F4] hover:underline">contact support</Link> for more information.
        </p>
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-[#0B0814]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12">

        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-[#9D4EDD]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-7 h-7 text-[#B794F4]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sell on Wankong</h1>
          <p className="text-white/50 max-w-lg mx-auto">
            Open your storefront on the Wankong marketplace and reach fans, readers and listeners worldwide.
          </p>
        </div>

        {checking ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#9D4EDD] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : statusView ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl">{statusView}</div>
        ) : (
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Perks */}
            <div className="lg:col-span-2 space-y-4">
              {PERKS.map(perk => (
                <div key={perk} className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-white/60 text-sm">{perk}</p>
                </div>
              ))}
            </div>

            {/* Application form */}
            <form onSubmit={submit} className="lg:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-white font-semibold">Vendor Application</h3>

              <div>
                <label className="block text-sm text-white/70 mb-1">Business / Store Name *</label>
                <input
                  type="text" required maxLength={80}
                  value={form.business_name}
                  onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))}
                  placeholder="Kong Beats Store"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Business Email</label>
                  <input
                    type="email"
                    value={form.business_email}
                    onChange={e => setForm(p => ({ ...p, business_email: e.target.value }))}
                    placeholder="store@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+254 700 000 000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                  placeholder="Kenya"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">What will you sell?</label>
                <textarea
                  rows={3} maxLength={500}
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Tell us about your products…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Payout Method</label>
                  <select
                    value={form.payment_provider}
                    onChange={e => setForm(p => ({ ...p, payment_provider: e.target.value }))}
                    className="w-full bg-[#0B0814] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
                  >
                    {PAYMENT_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Payout Account / Number</label>
                  <input
                    type="text"
                    value={form.payment_handle}
                    onChange={e => setForm(p => ({ ...p, payment_handle: e.target.value }))}
                    placeholder="e.g. paypal@me.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
                  />
                </div>
              </div>

              <p className="text-white/35 text-xs">
                By applying you agree to the{' '}
                <Link to="/creator-monetization-policy" className="text-[#B794F4] hover:underline">monetization policy</Link>
                {' '}and a 20% platform fee on marketplace sales.
              </p>

              <button
                type="submit"
                disabled={saving || !form.business_name.trim()}
                className="w-full bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {saving ? 'Submitting…' : 'Submit Application'}
              </button>
            </form>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
