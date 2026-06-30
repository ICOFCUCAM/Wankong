import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BellRing, X, Check, CheckCheck } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Notification {
  id:         string;
  type:       string;
  title:      string;
  body:       string;
  read:       boolean;
  created_at: string;
  link?:      string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (mins < 1)    return 'just now';
  if (mins < 60)   return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

function notifTypeIcon(type: string): string {
  switch (type) {
    case 'sale':       return '💰';
    case 'follow':     return '👤';
    case 'comment':    return '💬';
    case 'like':       return '❤️';
    case 'system':     return '🔔';
    case 'upload':     return '🎵';
    case 'award':      return '🏆';
    default:           return '📣';
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifs,   setNotifs]   = useState<Notification[]>([]);
  const [open,     setOpen]     = useState(false);
  const [ringing,  setRinging]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ── Fetch initial notifications ──────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifs((data ?? []) as Notification[]);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Realtime subscription ────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifs(prev => [newNotif, ...prev].slice(0, 30));
          // Animate bell
          setRinging(true);
          setTimeout(() => setRinging(false), 2000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // ── Click outside to close ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const markAsRead = useCallback(async (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unreadIds = notifs.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);
  }, [user, notifs]);

  const handleNotifClick = useCallback((notif: Notification) => {
    if (!notif.read) markAsRead(notif.id);
    if (notif.link) {
      window.location.href = notif.link;
    }
    setOpen(false);
  }, [markAsRead]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const unreadCount = notifs.filter(n => !n.read).length;
  const badgeLabel  = unreadCount > 9 ? '9+' : String(unreadCount);

  if (!user) return null;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        {ringing ? (
          <BellRing className="w-5 h-5 text-[#00D9FF] animate-bounce" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-0.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
            {badgeLabel}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-[#0B0814] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#00D9FF]" />
              <span className="text-white font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[#00D9FF]/20 text-[#00D9FF] text-[10px] font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-[#00D9FF] hover:text-white transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-gray-500 hover:text-white transition-colors rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e2a4a transparent' }}>
            {notifs.length === 0 ? (
              /* Empty state */
              <div className="py-10 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Check className="w-6 h-6 text-[#00D9FF]" />
                </div>
                <p className="text-gray-400 text-sm font-medium">You're all caught up!</p>
                <p className="text-gray-600 text-xs">No new notifications</p>
              </div>
            ) : (
              notifs.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={[
                    'w-full text-left flex gap-3 px-4 py-3 border-b border-white/5 last:border-0 transition-colors',
                    'hover:bg-white/5',
                    !notif.read ? 'bg-[#00D9FF]/5' : '',
                  ].join(' ')}
                >
                  {/* Type icon */}
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm shrink-0 mt-0.5">
                    {notifTypeIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-semibold leading-snug line-clamp-1 ${!notif.read ? 'text-white' : 'text-gray-300'}`}>
                        {notif.title}
                      </p>
                      <span className="text-gray-600 text-[10px] shrink-0 mt-0.5">
                        {relativeTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    {notif.link && (
                      <span className="text-[#00D9FF] text-[10px] mt-1 inline-block hover:underline">
                        View →
                      </span>
                    )}
                  </div>

                  {/* Unread dot */}
                  {!notif.read && (
                    <div className="w-2 h-2 rounded-full bg-[#00D9FF] shrink-0 mt-2" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/10 text-center">
              <span className="text-gray-600 text-xs">
                Showing {notifs.length} most recent notification{notifs.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
