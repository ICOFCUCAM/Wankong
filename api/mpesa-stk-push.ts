import type { VercelRequest, VercelResponse } from '@vercel/node';

// Safaricom Daraja API — M-Pesa STK Push (Lipa Na M-Pesa Online)
// Env vars required:
//   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET
//   MPESA_PASSKEY, MPESA_SHORTCODE
//   MPESA_CALLBACK_URL (e.g. https://yourdomain.vercel.app/api/mpesa-callback)
//   MPESA_ENV  = 'sandbox' | 'production'  (default: sandbox)

const BASE = process.env.MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

async function getAccessToken(): Promise<string> {
  const key    = process.env.MPESA_CONSUMER_KEY!;
  const secret = process.env.MPESA_CONSUMER_SECRET!;
  const creds  = Buffer.from(`${key}:${secret}`).toString('base64');

  const r = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
  });
  const data = await r.json() as { access_token: string };
  return data.access_token;
}

function getTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14);
}

function formatPhone(raw: string): string {
  // Convert +254XXXXXXXXX or 07XXXXXXXX → 2547XXXXXXXX
  const cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  return cleaned;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const required = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_PASSKEY', 'MPESA_SHORTCODE'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length) {
    return res.status(500).json({ error: `M-Pesa not configured. Missing: ${missing.join(', ')}` });
  }

  const { phone, amount, orderId, accountRef = 'WANKONG' } = req.body as {
    phone:      string;
    amount:     number;  // KES amount, integer
    orderId:    string;
    accountRef?: string;
  };

  if (!phone || !amount || !orderId) {
    return res.status(400).json({ error: 'phone, amount, and orderId are required' });
  }

  try {
    const token     = await getAccessToken();
    const ts        = getTimestamp();
    const shortcode = process.env.MPESA_SHORTCODE!;
    const passkey   = process.env.MPESA_PASSKEY!;
    const password  = Buffer.from(`${shortcode}${passkey}${ts}`).toString('base64');
    const callbackUrl = process.env.MPESA_CALLBACK_URL || `${req.headers.origin}/api/mpesa-callback`;

    const body = {
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         ts,
      TransactionType:   'CustomerPayBillOnline',
      Amount:            Math.ceil(amount),
      PartyA:            formatPhone(phone),
      PartyB:            shortcode,
      PhoneNumber:       formatPhone(phone),
      CallBackURL:       callbackUrl,
      AccountReference:  accountRef,
      TransactionDesc:   `Order ${orderId}`,
    };

    const r = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await r.json() as {
      CheckoutRequestID?: string;
      MerchantRequestID?: string;
      ResponseCode?:       string;
      ResponseDescription?: string;
      CustomerMessage?:    string;
      errorCode?:          string;
      errorMessage?:       string;
    };

    if (data.ResponseCode !== '0') {
      return res.status(400).json({
        error: data.ResponseDescription || data.errorMessage || 'STK Push failed',
      });
    }

    // Link the checkout request to the order NOW — the Daraja callback only
    // carries the CheckoutRequestID, so without this row the callback can
    // never find (or mark paid) the order.
    if (data.CheckoutRequestID && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { serviceClient } = await import('./_lib/fulfillment');
      const supabase = serviceClient();
      await supabase.from('mpesa_transactions').upsert({
        checkout_request_id: data.CheckoutRequestID,
        order_id:            orderId,
        amount:              Math.ceil(amount),
        phone:               formatPhone(phone),
        status:              'pending',
        updated_at:          new Date().toISOString(),
      }, { onConflict: 'checkout_request_id' });
      await supabase
        .from('ecom_orders')
        .update({ mpesa_checkout_request_id: data.CheckoutRequestID })
        .eq('id', orderId);
    }

    res.json({
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      message:           data.CustomerMessage,
    });
  } catch (err: any) {
    console.error('[mpesa-stk-push]', err);
    res.status(500).json({ error: err.message });
  }
}
