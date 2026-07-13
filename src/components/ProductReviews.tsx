import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  user_id: string;
  reviewer: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

function Stars({ value, size = 'w-4 h-4', onSelect }: {
  value: number;
  size?: string;
  onSelect?: (rating: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={!onSelect}
          onClick={() => onSelect?.(n)}
          className={onSelect ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
        >
          <Star className={`${size} ${n <= value ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />
        </button>
      ))}
    </div>
  );
}

// Verified-purchase reviews: RLS only lets users with a user_library row for
// this product insert, so `canReview` mirrors the buyer's ownership state.
export default function ProductReviews({ productId, canReview }: {
  productId: string;
  canReview: boolean;
}) {
  const { user } = useAuth();

  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [rating,    setRating]    = useState(0);
  const [title,     setTitle]     = useState('');
  const [body,      setBody]      = useState('');
  const [saving,    setSaving]    = useState(false);
  const [showForm,  setShowForm]  = useState(false);

  const ownReview = user ? reviews.find(r => r.user_id === user.id) : undefined;
  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('product_reviews')
      .select('id, rating, title, body, created_at, user_id, reviewer:user_id(display_name, username, avatar_url)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    setReviews((data as unknown as Review[]) ?? []);
    setLoading(false);
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (ownReview) {
      setRating(ownReview.rating);
      setTitle(ownReview.title ?? '');
      setBody(ownReview.body ?? '');
    }
  }, [ownReview]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || rating < 1) return;
    setSaving(true);
    const { error } = await supabase
      .from('product_reviews')
      .upsert({
        product_id: productId,
        user_id:    user.id,
        rating,
        title:      title.trim() || null,
        body:       body.trim() || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'product_id,user_id' });
    setSaving(false);

    if (error) {
      toast.error(error.message.includes('policy')
        ? 'Only verified purchasers can review this product.'
        : 'Could not save your review.');
      return;
    }
    toast.success(ownReview ? 'Review updated' : 'Review posted');
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <Stars value={Math.round(average)} />
              <span className="text-white/70 text-sm font-medium">{average.toFixed(1)}</span>
              <span className="text-white/40 text-sm">({reviews.length})</span>
            </div>
          )}
        </div>
        {user && canReview && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-[#9D4EDD] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl transition-colors w-fit"
          >
            {ownReview ? 'Edit your review' : 'Write a review'}
          </button>
        )}
      </div>

      {user && !canReview && !ownReview && (
        <p className="text-white/40 text-sm mb-6">Only verified purchasers can review this product.</p>
      )}

      {showForm && (
        <form onSubmit={submit} className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 space-y-4">
          <div>
            <label className="block text-xs text-white/55 mb-1.5">Your rating</label>
            <Stars value={rating} size="w-6 h-6" onSelect={setRating} />
          </div>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Review title (optional)"
            maxLength={120}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD]"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="What did you think? (optional)"
            rows={3}
            maxLength={2000}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#9D4EDD] resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || rating < 1}
              className="px-5 py-2 bg-[#9D4EDD] hover:bg-[#7C3AED] disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {saving ? 'Saving…' : ownReview ? 'Update review' : 'Post review'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-white/55 hover:text-white text-sm rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-white/40 text-sm">No reviews yet{canReview ? ' — be the first!' : '.'}</p>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => {
            const name = review.reviewer?.display_name ?? review.reviewer?.username ?? 'Buyer';
            return (
              <div key={review.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={review.reviewer?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${review.user_id}`}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{name}</p>
                    <div className="flex items-center gap-2">
                      <Stars value={review.rating} size="w-3 h-3" />
                      <span className="text-white/30 text-xs">{review.created_at?.slice(0, 10)}</span>
                      <span className="text-emerald-400/80 text-[10px] font-medium uppercase tracking-wide">Verified purchase</span>
                    </div>
                  </div>
                </div>
                {review.title && <p className="text-white text-sm font-semibold mb-1">{review.title}</p>}
                {review.body && <p className="text-white/60 text-sm whitespace-pre-line">{review.body}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
