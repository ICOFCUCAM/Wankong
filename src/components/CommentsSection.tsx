import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, MessageCircle, Trash2, Send } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Comment {
  id:         string;
  product_id: string;
  user_id:    string;
  body:       string;
  likes:      number;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initials(name: string): string {
  return (name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Comment item ───────────────────────────────────────────────────────────────

function CommentItem({
  comment, currentUserId, onLike, onDelete,
}: {
  comment: Comment;
  currentUserId?: string;
  onLike:   (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [liked, setLiked] = useState(false);

  const handleLike = () => {
    setLiked(l => !l);
    onLike(comment.id);
  };

  return (
    <div className="flex gap-3 group">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
        style={{ background: `hsl(${(comment.user_id.charCodeAt(0) * 37) % 360},60%,35%)` }}
      >
        {comment.user_avatar
          ? <img src={comment.user_avatar} alt="" className="w-full h-full object-cover rounded-full" />
          : initials(comment.user_name || 'Anon')}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white text-xs font-semibold">
              {comment.user_name || 'Anonymous'}
            </span>
            <span className="text-white/25 text-[10px]">{timeAgo(comment.created_at)}</span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {comment.body}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1 px-2">
          <button onClick={handleLike}
            className={`flex items-center gap-1 text-[11px] transition-colors ${
              liked ? 'text-[#FF006E]' : 'text-white/25 hover:text-white/60'
            }`}>
            <Heart className={`w-3 h-3 ${liked ? 'fill-[#FF006E]' : ''}`} />
            <span>{comment.likes + (liked ? 1 : 0)}</span>
          </button>
          {currentUserId === comment.user_id && (
            <button onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-[11px] text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  productId: string;
  className?: string;
}

export default function CommentsSection({ productId, className = '' }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [body,     setBody]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('product_comments')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: true })
      .limit(100);
    setComments((data ?? []) as Comment[]);
    setLoading(false);
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${productId}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'product_comments',
        filter: `product_id=eq.${productId}`,
      }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [productId, load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !user) return;
    setSending(true);
    setError('');
    const { error: err } = await supabase.from('product_comments').insert({
      product_id: productId,
      user_id:    user.id,
      body:       body.trim(),
      likes:      0,
      user_name:  user.email?.split('@')[0] || 'User',
    });
    if (err) {
      setError('Could not post comment. Please try again.');
    } else {
      setBody('');
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    setSending(false);
  };

  const handleLike = async (id: string) => {
    await supabase.rpc('increment_comment_likes', { comment_id: id }).catch(() => {
      // Graceful fallback if function doesn't exist
      supabase.from('product_comments').select('likes').eq('id', id).single()
        .then(({ data }) => {
          if (data) supabase.from('product_comments').update({ likes: (data.likes || 0) + 1 }).eq('id', id);
        });
    });
  };

  const handleDelete = async (id: string) => {
    await supabase.from('product_comments').delete().eq('id', id).eq('user_id', user?.id || '');
    setComments(c => c.filter(x => x.id !== id));
  };

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle className="w-5 h-5 text-[#00D9FF]" />
        <h3 className="text-white font-bold text-base">
          Comments
          {!loading && <span className="text-white/30 font-normal ml-1.5">({comments.length})</span>}
        </h3>
      </div>

      {/* Comment list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse shrink-0" />
              <div className="flex-1 bg-white/5 rounded-2xl h-16 animate-pulse" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-10 bg-white/2 border border-white/5 rounded-2xl mb-5">
          <MessageCircle className="w-8 h-8 text-white/10 mx-auto mb-2" />
          <p className="text-white/30 text-sm">No comments yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-4 mb-5">
          {comments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={user?.id}
              onLike={handleLike}
              onDelete={handleDelete}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Compose */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-3 items-start">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-1"
            style={{ background: `hsl(${(user.id.charCodeAt(0) * 37) % 360},60%,35%)` }}
          >
            {initials(user.email?.split('@')[0] || 'U')}
          </div>
          <div className="flex-1">
            <div className="flex gap-2">
              <input
                type="text"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Add a comment…"
                maxLength={500}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-[#00D9FF]/30"
              />
              <button type="submit" disabled={sending || !body.trim()}
                className="w-10 h-10 rounded-xl bg-[#00D9FF] disabled:opacity-40 flex items-center justify-center hover:bg-[#00D9FF]/90 transition-colors shrink-0">
                <Send className="w-4 h-4 text-[#0B0814]" />
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>
        </form>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-4 text-center">
          <p className="text-white/40 text-sm mb-2">Sign in to join the conversation</p>
          <a href="/auth/login" className="text-[#00D9FF] text-sm font-medium hover:underline">Sign in →</a>
        </div>
      )}
    </div>
  );
}
