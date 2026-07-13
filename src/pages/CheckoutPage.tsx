import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { CreditCard, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import MobileMoneyModal from '@/components/MobileMoneyModal';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { SITE_NAME } from '@/lib/site';

type PayMethod = 'card' | 'mobile_money' | 'paypal';

// ── Stripe wiring ──────────────────────────────────────────────────────────────
// Card payments are confirmed client-side with Stripe Elements against a
// PaymentIntent whose amount is computed on the server from catalog prices.
// Fulfillment (library access + seller earnings) happens server-side via the
// Stripe webhook — never in this page.

const STRIPE_KEY = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

interface BillingForm {
  name: string; email: string; address: string; city: string; country: string; zip: string;
}

interface OrderableItem {
  id: string; title: string; price: number; quantity: number; image?: string;
}

// Creates the pending order + line items all payment methods charge against.
async function createPendingOrder(
  userId: string | null,
  form: BillingForm,
  items: OrderableItem[],
  totalUsd: number,
  paymentMethod: string,
): Promise<string> {
  const { data: order, error } = await supabase
    .from('ecom_orders')
    .insert([{
      user_id:            userId,
      customer_name:      form.name,
      customer_email:     form.email,
      subtotal_cents:     Math.round(totalUsd * 100),
      tax_cents:          0,
      total_cents:        Math.round(totalUsd * 100),
      payment_method:     paymentMethod,
      payment_status:     'pending',
      fulfillment_status: 'unfulfilled',
      billing_address:    { name: form.name, address1: form.address, city: form.city, country: form.country, zip: form.zip },
      items:              items.map(i => ({ product_id: i.id, title: i.title, price: i.price, quantity: i.quantity })),
    }])
    .select('id')
    .single();

  if (error || !order) throw new Error(error?.message ?? 'Could not create order');

  const { error: itemsError } = await supabase.from('ecom_order_items').insert(
    items.map(i => ({
      order_id:   order.id,
      product_id: i.id,
      title:      i.title,
      price:      Math.round(i.price * 100),
      quantity:   i.quantity,
    }))
  );
  if (itemsError) throw new Error(itemsError.message);

  return order.id as string;
}

// ── Card form (inside <Elements>) ──────────────────────────────────────────────

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#ffffff',
      fontSize: '16px',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      '::placeholder': { color: 'rgba(255,255,255,0.3)' },
    },
    invalid: { color: '#f87171', iconColor: '#f87171' },
  },
  hidePostalCode: true,
};

function StripeCardForm({
  form, total, onBack,
}: {
  form: BillingForm;
  total: number;
  onBack: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || items.length === 0) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setLoading(true);
    setError('');

    try {
      const orderId = await createPendingOrder(user?.id ?? null, form, items, total, 'card');

      const res = await fetch('/api/create-payment-intent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderId, customer_email: form.email }),
      });
      const data = await res.json() as { clientSecret?: string; error?: string };
      if (!res.ok || !data.clientSecret) throw new Error(data.error ?? 'Payment gateway error');

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name:  form.name,
            email: form.email,
            address: { line1: form.address, city: form.city, postal_code: form.zip },
          },
        },
      });

      if (result.error) throw new Error(result.error.message ?? 'Card was declined');

      if (result.paymentIntent?.status === 'succeeded') {
        clearCart();
        navigate(`/order-confirmation?orderId=${orderId}`);
      } else {
        throw new Error('Payment did not complete. Please try again.');
      }
    } catch (err: any) {
      setError(err.message ?? 'Payment processing failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <div>
        <label className="block text-xs text-white/55 mb-1">Card Details</label>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 focus-within:ring-2 focus-within:ring-[#9D4EDD]">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {['Visa', 'MC', 'Amex'].map(b => (
          <span key={b} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-xs text-white/55 font-medium">
            {b}
          </span>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-3 border border-white/10 text-white/55 hover:text-white rounded-xl transition-colors text-sm"
        >
          ← Back
        </button>
        <button
          type="submit"
          disabled={loading || !stripe}
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
    </form>
  );
}

// ── Main checkout page ─────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [form,         setForm]         = useState<BillingForm>({
    name: '', email: '', address: '', city: '', country: 'US', zip: '',
  });
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
          <div>
            <h1 className="text-2xl font-bold text-white">Checkout</h1>
            {SITE_NAME === 'SmartKong' && <p className="text-white/40 text-sm mt-0.5">One checkout · every store on Earth.</p>}
          </div>
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
                      ? 'text-white/70 hover:text-white'
                      : 'text-white/35 cursor-not-allowed'
                }`}
              >
                <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                  step === s ? 'bg-white/20' : 'bg-white/10'
                }`}>{i + 1}</span>
                {s === 'billing' ? 'Billing Info' : 'Payment'}
              </button>
              {i === 0 && <span className="text-white/25">→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div>

            {step === 'billing' ? (
              <form onSubmit={e => { e.preventDefault(); setStep('payment'); }} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="text-white font-semibold">Billing Information</h3>
                {[
                  { label: 'Full Name',          key: 'name',    type: 'text',  placeholder: 'John Doe'         },
                  { label: 'Email',              key: 'email',   type: 'email', placeholder: 'john@example.com' },
                  { label: 'Address',            key: 'address', type: 'text',  placeholder: '123 Main St'      },
                  { label: 'City',               key: 'city',    type: 'text',  placeholder: 'Lagos'            },
                  { label: 'ZIP / Postal Code',  key: 'zip',     type: 'text',  placeholder: '100001'           },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm text-white/70 mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      required
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
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
              </form>
            ) : (
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">Payment Details</h3>
                  <div className="flex items-center gap-1 text-white/40 text-xs">
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
                          : 'border-white/10 text-white/55 hover:border-white/25'
                      }`}
                    >
                      {m.Icon ? <m.Icon className="w-4 h-4" /> : <span className="font-black text-[#003087]">P</span>}
                      {m.label}
                    </button>
                  ))}
                </div>

                {payMethod === 'card' && (
                  stripePromise ? (
                    <Elements stripe={stripePromise}>
                      <StripeCardForm form={form} total={total} onBack={() => setStep('billing')} />
                    </Elements>
                  ) : (
                    <div className="rounded-xl bg-[#0B0814] border border-white/10 p-4 text-center space-y-2">
                      <CreditCard className="w-8 h-8 text-white/30 mx-auto" />
                      <p className="text-white/60 text-sm">
                        Card payments are temporarily unavailable. Please use Mobile Money or PayPal.
                      </p>
                    </div>
                  )
                )}

                {payMethod === 'mobile_money' && (
                  <div className="rounded-xl bg-[#0B0814] border border-white/10 p-4 text-center space-y-3">
                    <div className="flex justify-center gap-3 text-2xl">🟢 🟡 🔴</div>
                    <p className="text-white/60 text-sm">
                      Supports mobile money worldwide — M-Pesa, MTN MoMo, Airtel Money, Pix and more.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        setLoading(true);
                        setError('');
                        try {
                          const id = await createPendingOrder(user?.id ?? null, form, items, total, 'mpesa');
                          setOrderId(id);
                          setShowMobile(true);
                        } catch (err: any) {
                          setError(err.message ?? 'Could not create order.');
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
                          const oid = await createPendingOrder(user?.id ?? null, form, items, total, 'paypal');
                          setOrderId(oid);

                          // Create PayPal order — the server recomputes the
                          // amount from catalog prices
                          const res = await fetch('/api/paypal-order', {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body:    JSON.stringify({
                              currency:    'USD',
                              orderId:     oid,
                              description: `${SITE_NAME} Order ${oid}`,
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
              </div>
            )}
          </div>

          {/* Order summary */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-fit">
            <h3 className="text-white font-semibold mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={item.id} className="flex gap-3">
                  {item.image && (
                    <img src={item.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="text-xs text-white/55">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm text-white">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-white font-bold text-base pt-1">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-4 text-white/35 text-xs">
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
        onSuccess={() => {
          // The Daraja callback has already marked the order paid and
          // fulfilled it server-side.
          clearCart();
          navigate(`/order-confirmation?orderId=${orderId}`);
        }}
      />
    )}
    </>
  );
}
