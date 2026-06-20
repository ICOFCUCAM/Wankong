# Wankong

A creator marketplace (eBooks, music, talent competitions) built with Vite +
React and Supabase. Books and other products are sold as `ecom_products` rows
and surfaced in the store (e.g. the eBook Marketplace).

## Local development

```bash
npm install
npm run dev
```

## Polished Pages publishing bridge

The [Polished Pages](https://github.com/ICOFCUCAM/SOVEREIGN) app can publish a
finished book straight into the Wankong store. The receiving end is the
`wankong-publish-book` edge function — it is **server-to-server only**:

- Authenticated by a shared bridge secret (`x-polished-secret`), so JWT
  verification is off.
- Writes with the service role.
- Publishes only when the author already owns a Wankong account, matched by
  email; otherwise it returns `needs_account`.

Imported books become normal `ecom_products` rows (`product_type = 'Book'`,
`status = 'active'`) and sell through the existing store flow. Re-publishing the
same source document updates the same listing.

### Deploy

```bash
supabase db push                                  # 003_polished_pages_bridge.sql
supabase functions deploy wankong-publish-book    # verify_jwt=false (config.toml)

supabase secrets set \
  WANKONG_BRIDGE_SECRET="<shared-secret>" \       # must match Polished Pages' copy
  WANKONG_SITE_URL="https://<wankong-store-domain>"
```

The full cross-project runbook (both sides, secrets, smoke test) lives in the
SOVEREIGN repo at `apps/polished-pages/docs/WANKONG-PUBLISHING.md`.
