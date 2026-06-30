import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CreditCard, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import MobileMoneyModal from '@/components/MobileMoneyModal';
import { recordBookSale } from '@/pipelines/earnings/EarningsWorker';

type PayMethod = 'card' | 'mobile_money' | 'paypal';

// ── Stripe wiring ──────────────────────────────────────────────────────────────
// Loads @stripe/react-stripe-js lazily only when the publishable key is set.
// Without a key the form still works — orders are stored in Supabase and a
// backend endpoint (/api/create-payment-intent) must return a clientSecret.

const STRIPE_KEY = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;

let Elements: React.FC<{ stripe: any; options?: any; children: React.ReactNode }> | null = null;
let CardElement: React.FC<{ options?: any }> | null = null;
let useStripe: (() => any) | null = null;
let useElements: (() => any) | null = null;
let loadStripe: ((key: string) => Promise<any>) | null = null;

// Dynamic import — avoids a hard dependency when Stripe isn't configured
if (STRIPE_KEY) {
  Promise.all([
    import('@stripe/react-stripe-js'),
    import('@stripe/stripe-js'),
  ]).then(([reactStripe, stripeJs]) => {
    Elements    = reactStripe.Elements;
    CardElement = reactStripe.CardElement;
    useStripe   = reactStripe.useStripe;
    useElements = reactStripe.useElements;
    loadStripe  = stripeJs.loadStripe;
  }).catch(() => { /* Stripe unavailable */ });
}

// ── Card form (inside Elements if Stripe is available) ─────────────────────────

function CardInputFallback({
  card, setCard,
}: {
  card: { number: string; expiry: string; cvc: string };
  setCard: React.Dispatch<React.SetStateAction<typeof card>>;
}) {
  const fmtExpiry = (v: string) =>
    v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
  const fmtNumber = (v: string) =>
    v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Card Number</label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            inputMode="numeric"
            placeholder="1234 5678 9012 3456"
            value={card.number}
            onChange={e => setCard(c => ({ ...c, number: fmtNumber(e.target.value) }))}
            maxLength={19}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] text-sm font-mono tracking-wider"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Expiry</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM/YY"
            value={card.expiry}
            onChange={e => setCard(c => ({ ...c, expiry: fmtExpiry(e.target.value) }))}
            maxLength={5}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">CVC</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="123"
            value={card.cvc}
            onChange={e => setCard(c => ({ ...c, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            maxLength={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] text-sm font-mono"
          />
        </div>
      </div>
    </div>
  );
}

// ── Main checkout page ─────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [form,         setForm]         = useState({
    name: '', email: '', address: '', city: '', country: 'US', zip: '',
  });
  const [card,         setCard]         = useState({ number: '', expiry: '', cvc: '' });
  const [step,         setStep]         = useState<'billing' | 'payment'>('billing');
  const [payMethod,    setPayMethod]    = useState<PayMethod>('card');
  const [showMobile,   setShowMobile]   = useState(false);
  const [orderId,      setOrderId]      = useState('');
  const [paypalPending, setPaypalPending] = useState(false);

  const total = cartTotal;

  const billingComplete = form.name && form.email && form.address && form.city && form.zip;

  // Handle PayPal return redirect — auto-capture if token present in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalStatus = params.get('paypal_status');
    const paypalToken  = params.get('token'); // PayPal order ID
    const returnOrderId = params.get('order_id');

    if (paypalStatus === 'success' && paypalToken) {
      setLoading(true);
      fetch('/api/paypal-capture', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ paypalOrderId: paypalToken, orderId: returnOrderId ?? '' }),
      })
        .then(r => r.json())
        .then((data: any) => {
          if (data.success) {
            clearCart();
            navigate(`/order-confirmation?order_id=${returnOrderId ?? ''}`);
          } else {
            setError(data.error ?? 'PayPal capture failed.');
            setLoading(false);
          }
        })
        .catch(() => {
          setError('PayPal capture failed. Please contact support.');
          setLoading(false);
        });
    } else if (paypalStatus === 'cancelled') {
      setError('PayPal payment was cancelled.');
      // Clean up URL
      window.history.replaceState({}, '', '/checkout');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Post-payment fulfillment ───────────────────────────────────────────────
  // Grant the buyer access to each purchased product and credit seller earnings.
  const fulfillOrder = async (orderId: string, orderItems: typeof items) => {
    const { data: { user: buyer } } = await supabase.auth.getUser();

    await Promise.all(orderItems.map(async item => {
      // 1. Grant library access
      if (buyer) {
        await supabase.from('user_library').insert([{
          user_id:    buyer.id,
          product_id: item.id,
          order_id:   orderId,
          access_type: 'purchase',
        }]).then(() => {}); // ignore if row already exists
      }

      // 2. Credit seller earnings — look up the product's seller/artist
      const { data: product } = await supabase
        .from('ecom_products')
        .select('vendor_id, product_type, price')
        .eq('id', item.id)
        .single();

      if (product?.vendor_id) {
        const salePrice = item.price * (item.quantity ?? 1);
        await recordBookSale(product.vendor_id, salePrice);
      }
    }));

    // Mark order fulfilled
    await supabase.from('ecom_orders')
      .update({ fulfillment_status: 'fulfilled' })
      .eq('id', orderId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    // Simple card validation
    const rawNum = card.number.replace(/\s/g, '');
    if (rawNum.length < 13 || !card.expiry.includes('/') || card.cvc.length < 3) {
      setError('Please enter valid card details.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Create order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('ecom_orders')
        .insert([{
          user_id:            user?.id ?? null,
          customer_name:      form.name,
          customer_email:     form.email,
          total_cents:        Math.round(total * 100),
          subtotal_cents:     Math.round(cartTotal * 100),
          tax_cents:          0,
          payment_method:     'card',
          payment_status:     'pending',
          fulfillment_status: 'unfulfilled',
          billing_address:    { name: form.name, address1: form.address, city: form.city, country: form.country, zip: form.zip },
          created_at:         new Date().toISOString(),
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      if (order) {
        await supabase.from('ecom_order_items').insert(
          items.map(item => ({
            order_id:   order.id,
            product_id: item.id,
            title:      item.title,
            price:      Math.round(item.price * 100),
            quantity:   item.quantity,
          }))
        );

        // 2. Charge via Stripe backend endpoint
        if (STRIPE_KEY) {
          try {
            const res = await fetch('/api/create-payment-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId: order.id, amount: Math.round(total * 100) }),
            });
            if (res.ok) {
              await supabase.from('ecom_orders').update({ payment_status: 'paid', paid_at: new Date().toISOString() }).eq('id', order.id);
              await fulfillOrder(order.id, items);
            } else {
              throw new Error('Payment gateway error');
            }
          } catch {
            // Order is recorded but not yet paid — admin can manually review
            setError('Payment processing failed. Please try again or contact support.');
            setLoading(false);
            return;
          }
        } else {
          // No payment gateway configured — record order as pending for manual processing
          // Order already in pending state — no update needed
        }
      }

      clearCart();
      navigate(`/order-confirmation?orderId=${order?.id || 'new'}`);
    } catch (err: any) {
      setError('Payment processing failed. Please try again.');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <>
    <div className="min-h-screen bg-[#0B0814] py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Checkout</h1>
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure checkout</span>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {(['billing', 'payment'] as const).map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => s === 'payment' ? billingComplete && setStep(s) : setStep(s)}
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  step === s
                    ? 'bg-[#9D4EDD] text-white'
                    : billingComplete || s === 'billing'
                      ? 'text-gray-300 hover:text-white'
                      : 'text-gray-600 cursor-not-allowed'
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                  step === s ? 'bg-white/20' : 'bg-gray-800'
                }`}>{i + 1}</span>
                {s === 'billing' ? 'Billing Info' : 'Payment'}
              </button>
              {i === 0 && <span className="text-gray-700">→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <form onSubmit={step === 'payment' ? handleSubmit : e => { e.preventDefault(); setStep('payment'); }}>

            {step === 'billing' ? (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-white font-semibold">Billing Information</h3>
                {[
                  { label: 'Full Name',          key: 'name',    type: 'text',  placeholder: 'John Doe'         },
                  { label: 'Email',              key: 'email',   type: 'email', placeholder: 'john@example.com' },
                  { label: 'Address',            key: 'address', type: 'text',  placeholder: '123 Main St'      },
                  { label: 'City',               key: 'city',    type: 'text',  placeholder: 'Lagos'            },
                  { label: 'ZIP / Postal Code',  key: 'zip',     type: 'text',  placeholder: '100001'           },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm text-gray-300 mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      required
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
                    />
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={!billingComplete}
                  className="w-full bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
                >
                  Continue to Payment →
                </button>
              </div>
            ) : (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">Payment Details</h3>
                  <div className="flex items-center gap-1 text-gray-500 text-xs">
                    <Lock className="w-3 h-3" />
                    <span>Encrypted</span>
                  </div>
                </div>

                {/* Payment method tabs */}
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'card',         label: 'Card',   Icon: CreditCard  },
                    { id: 'mobile_money', label: 'Mobile Money', Icon: Smartphone },
                    { id: 'paypal',       label: 'PayPal', Icon: null        },
                  ] as { id: PayMethod; label: string; Icon: any }[]).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        payMethod === m.id
                          ? 'border-[#9D4EDD] bg-[#9D4EDD]/10 text-white'
                          : 'border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {m.Icon ? <m.Icon className="w-4 h-4" /> : <span className="font-black text-[#003087]">P</span>}
                      {m.label}
                    </button>
                  ))}
                </div>

                {payMethod === 'card' && (
                  <>
                    <CardInputFallback card={card} setCard={setCard} />
                    <div className="flex items-center gap-2">
                      {['Visa', 'MC', 'Amex'].map(b => (
                        <span key={b} className="px-2.5 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-400 font-medium">
                          {b}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {payMethod === 'mobile_money' && (
                  <div className="rounded-xl bg-[#0B0814] border border-white/10 p-4 text-center space-y-3">
                    <div className="flex justify-center gap-3 text-2xl">🟢 🟡 🔴</div>
                    <p className="text-white/60 text-sm">
                      Supports M-Pesa, MTN MoMo, and Airtel Money across Africa.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        // Create order first, then open modal
                        setLoading(true);
                        const { data: order } = await supabase
                          .from('ecom_orders')
                          .insert([{
                            user_id:            user?.id ?? null,
                            customer_name:      form.name,
                            customer_email:     form.email,
                            total_cents:        Math.round(total * 100),
                            subtotal_cents:     Math.round(cartTotal * 100),
                            tax_cents:          0,
                            payment_method:     'mpesa',
                            payment_status:     'pending',
                            fulfillment_status: 'unfulfilled',
                            billing_address:    { name: form.name, address1: form.address, city: form.city, country: form.country, zip: form.zip },
                          }])
                          .select().single();
                        if (order) {
                          await supabase.from('ecom_order_items').insert(
                            items.map(i => ({ order_id: order.id, product_id: i.id, title: i.title, price: Math.round(i.price * 100), quantity: i.quantity }))
                          );
                          setOrderId(order.id);
                          setShowMobile(true);
                        }
                        setLoading(false);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-[#00A651] to-[#FFC700] text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
                    >
                      {loading ? 'Creating order…' : 'Pay with Mobile Money'}
                    </button>
                  </div>
                )}

                {payMethod === 'paypal' && (
                  <div className="rounded-xl bg-[#0B0814] border border-white/10 p-4 text-center space-y-3">
                    <div className="text-3xl font-bold text-[#003087]">
                      <span className="text-[#009CDE]">Pay</span><span className="text-[#003087]">Pal</span>
                    </div>
                    <p className="text-white/60 text-sm">
                      You'll be redirected to PayPal to complete your payment securely.
                    </p>
                    <button
                      type="button"
                      disabled={paypalPending}
                      className="w-full py-3 bg-[#003087] hover:bg-[#002065] text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      onClick={async () => {
                        if (items.length === 0) return;
                        setPaypalPending(true);
                        setError('');
                        try {
                          // Create order in Supabase first
                          const { data: newOrder } = await supabase
                            .from('ecom_orders')
                            .insert([{
                              user_id:          user?.id ?? null,
                              customer_name:    form.name,
                              customer_email:   form.email,
                              shipping_address: { address: form.address, city: form.city, country: form.country, zip: form.zip },
                              items:            items.map(i => ({ product_id: i.id, title: i.title, price: i.price, qty: i.qty })),
                              subtotal_cents:   Math.round(cartTotal * 100),
                              tax_cents:        0,
                              total_cents:      Math.round(total * 100),
                              payment_method:   'paypal',
                              payment_status:   'pending',
                              created_at:       new Date().toISOString(),
                            }])
                            .select('id')
                            .single();

                          const oid = newOrder?.id ?? '';
                          setOrderId(oid);

                          // Create PayPal order
                          const res = await fetch('/api/paypal-order', {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body:    JSON.stringify({
                              amount:      Math.round(total * 100),
                              currency:    'USD',
                              orderId:     oid,
                              description: `WANKONG Order ${oid}`,
                            }),
                          });

                          if (!res.ok) {
                            const e = await res.json() as { error?: string };
                            throw new Error(e.error ?? 'PayPal error');
                          }

                          const { approvalUrl } = await res.json() as { approvalUrl?: string };
                          if (approvalUrl) {
                            window.location.href = approvalUrl;
                          } else {
                            throw new Error('No PayPal approval URL returned.');
                          }
                        } catch (err: any) {
                          setError(err.message ?? 'PayPal checkout failed.');
                          setPaypalPending(false);
                        }
                      }}
                    >
                      {paypalPending ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Redirecting to PayPal…
                        </>
                      ) : 'Continue with PayPal'}
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {payMethod === 'card' && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('billing')}
                      className="px-4 py-3 border border-gray-700 text-gray-400 hover:text-white rounded-xl transition-colors text-sm"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Pay ${total.toFixed(2)}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Order summary */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 h-fit">
            <h3 className="text-white font-semibold mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  {item.image && (
                    <img src={item.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm text-white">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-800 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-white font-bold text-base pt-1">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-5 pt-4 border-t border-gray-800 flex items-center gap-4 text-gray-600 text-xs">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Encrypted</span>
              </div>
              <div className="flex items-center gap-1">
                <span>30-day refund</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>


    {showMobile && orderId && (
      <MobileMoneyModal
        amount={total}
        orderId={orderId}
        onClose={() => setShowMobile(false)}
        onSuccess={async (ref) => {
          await supabase.from('ecom_orders').update({ payment_status: 'paid', mpesa_ref: ref, paid_at: new Date().toISOString() }).eq('id', orderId);
          clearCart();
          navigate(`/order-confirmation?orderId=${orderId}`);
        }}
      />
    )}
    </>
  );
}
