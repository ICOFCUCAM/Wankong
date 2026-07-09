import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

// Server-to-server endpoint that publishes a book into the Wankong store on
// behalf of an external app (Polished Pages). It is NOT called by browsers:
//   • Authenticated by a shared bridge secret (x-polished-secret), so JWT
//     verification is off (see config.toml).
//   • Writes with the service role.
//   • Only publishes when the author already owns a Wankong account, matched by
//     email — otherwise it returns needs_account so the caller can prompt them
//     to sign up.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-polished-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BUCKET = "polished_books";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "book";

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

interface PublishBody {
  source_doc_id?: string;
  seller_email?: string;
  title?: string;
  author?: string;
  description?: string;
  price_cents?: number;
  language?: string;
  genre?: string;
  isbn?: string;
  pages?: number | null;
  publisher?: string;
  handle?: string;
  epub_base64?: string;
  epub_filename?: string;
  cover_base64?: string;
  cover_mime?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Authenticate the bridge.
  const expected = Deno.env.get("WANKONG_BRIDGE_SECRET");
  if (!expected) return json({ error: "Publishing bridge is not configured." }, 503);
  if (req.headers.get("x-polished-secret") !== expected) {
    return json({ error: "Unauthorized." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Server is not configured." }, 503);
  const admin = createClient(url, key, { auth: { persistSession: false } });

  try {
    const body = (await req.json().catch(() => ({}))) as PublishBody;

    const sourceDocId = String(body.source_doc_id ?? "").trim();
    const email = String(body.seller_email ?? "").trim();
    const title = String(body.title ?? "").trim();
    if (!sourceDocId || !email || !title) {
      return json({ error: "Missing source_doc_id, seller_email or title." }, 400);
    }
    if (!body.epub_base64) {
      return json({ error: "Missing book file (epub_base64)." }, 400);
    }

    // 2. The author must already own a Wankong account.
    const { data: sellerId, error: lookupErr } = await admin.rpc("wankong_find_user_by_email", {
      p_email: email,
    });
    if (lookupErr) {
      console.error("wankong_find_user_by_email failed:", lookupErr);
      return json({ error: "Could not verify the Wankong account." }, 502);
    }
    if (!sellerId) {
      return json(
        { needs_account: true, error: `No Wankong account found for ${email}.` },
        200,
      );
    }

    // 3. Upload the book file (and cover) to public storage.
    const epubPath = `${sellerId}/${sourceDocId}.epub`;
    const { error: epubErr } = await admin.storage
      .from(BUCKET)
      .upload(epubPath, decodeBase64(body.epub_base64), {
        contentType: "application/epub+zip",
        upsert: true,
      });
    if (epubErr) {
      console.error("epub upload failed:", epubErr);
      return json({ error: "Could not store the book file." }, 502);
    }
    const fileUrl = admin.storage.from(BUCKET).getPublicUrl(epubPath).data.publicUrl;

    let coverUrl: string | null = null;
    if (body.cover_base64) {
      const ext = (body.cover_mime ?? "image/png").includes("jpeg") ? "jpg" : "png";
      const coverPath = `${sellerId}/${sourceDocId}-cover.${ext}`;
      const { error: coverErr } = await admin.storage
        .from(BUCKET)
        .upload(coverPath, decodeBase64(body.cover_base64), {
          contentType: body.cover_mime ?? "image/png",
          upsert: true,
        });
      if (!coverErr) coverUrl = admin.storage.from(BUCKET).getPublicUrl(coverPath).data.publicUrl;
      else console.error("cover upload failed (non-fatal):", coverErr);
    }

    // 4. Upsert the store listing.
    const handle = (body.handle && slugify(body.handle)) || `${slugify(title)}-pp-${sourceDocId.slice(0, 8)}`;
    const priceCents = Math.max(0, Math.round(Number(body.price_cents ?? 0)) || 0);
    const tags = ["book", body.genre, body.language].filter(Boolean).join(",");

    const row: Record<string, unknown> = {
      title,
      body_html: body.description ?? "",
      vendor: body.author ?? title,
      author: body.author ?? null,
      product_type: "Book",
      status: "active",
      handle,
      language: body.language ?? "en",
      genre: body.genre ?? null,
      isbn: body.isbn ?? null,
      publisher: body.publisher ?? null,
      pages: body.pages ?? null,
      price: priceCents,
      tags,
      file_url: fileUrl,
      source: "polished-pages",
      source_doc_id: sourceDocId,
      seller_id: sellerId,
    };
    if (coverUrl) row.cover_art = coverUrl;

    const { data: product, error: upsertErr } = await admin
      .from("ecom_products")
      .upsert(row, { onConflict: "source,source_doc_id" })
      .select("id, handle")
      .single();
    if (upsertErr) {
      console.error("ecom_products upsert failed:", upsertErr);
      return json({ error: "Could not publish to the store." }, 502);
    }

    const siteUrl = (Deno.env.get("WANKONG_SITE_URL") || "").replace(/\/$/, "");
    const productUrl = siteUrl ? `${siteUrl}/products/${product.handle}` : null;

    return json({ ok: true, status: "live", product_id: product.id, handle: product.handle, url: productUrl });
  } catch (e) {
    console.error("wankong-publish-book error:", e);
    return json({ error: e instanceof Error ? e.message : "Publish failed." }, 500);
  }
});
