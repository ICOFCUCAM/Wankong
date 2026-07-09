import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { ViewPage, Notification } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { asArray } from '@/lib/utils';

interface WalletState {
  available: number;
  pending: number;
  subscriptions: number;
  distributions: number;
  tips: number;
  competitions: number;
  currency: string;
}

interface AppUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatar: string;
  country: string;
  role: string;
}

interface AppContextType {
  user: AppUser | null;
  wallet: WalletState;
  isAuthenticated: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;
  authMode: 'login' | 'register';
  setAuthMode: (m: 'login' | 'register') => void;
  currentPage: ViewPage;
  setCurrentPage: (p: ViewPage) => void;
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

const EMPTY_WALLET: WalletState = {
  available: 0, pending: 0, subscriptions: 0,
  distributions: 0, tips: 0, competitions: 0, currency: 'USD',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Single source of truth for auth — reuse AuthProvider's session listener
  // instead of opening a second getSession()/onAuthStateChange subscription.
  const { user: supabaseUser } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentPage, setCurrentPage] = useState<ViewPage>('dashboard');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [wallet, setWallet] = useState<WalletState>(EMPTY_WALLET);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Authoritative role from the profiles table — survives stale JWT metadata
  // (e.g. a role changed after the session was minted).
  const [profileRole, setProfileRole] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseUser) { setProfileRole(null); return; }
    supabase.from('profiles').select('role').eq('id', supabaseUser.id).maybeSingle()
      .then(({ data }) => setProfileRole((data as any)?.role ?? null));
  }, [supabaseUser]);

  // ── Per-user data: notifications + wallet ────────────────────────────────────
  useEffect(() => {
    if (!supabaseUser) {
      setNotifications([]);
      setWallet(EMPTY_WALLET);
      return;
    }

    const uid = supabaseUser.id;

    // Notifications
    supabase
      .from('user_notifications')
      .select('id, title, body, type, read, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setNotifications(asArray<any>(data).map((n: any) => ({
          id: n.id,
          type: n.type ?? 'system',
          title: n.title ?? '',
          message: n.body ?? '',
          read: n.read ?? false,
          date: n.created_at,
        })));
      });

    // Wallet from creator_balances
    supabase
      .from('creator_balances')
      .select('available_cents, pending_cents, currency')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setWallet(prev => ({
            ...prev,
            available: (data.available_cents ?? 0) / 100,
            pending:   (data.pending_cents   ?? 0) / 100,
            currency:  data.currency ?? 'USD',
          }));
        }
      });

    // Realtime — new notifications pushed from server
    const channel = supabase
      .channel(`notifications:${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${uid}` },
        (payload) => {
          const n = payload.new as any;
          setNotifications(prev => [{
            id:      n.id,
            type:    n.type ?? 'system',
            title:   n.title ?? '',
            message: n.body ?? '',
            read:    false,
            date:    n.created_at,
          }, ...prev.slice(0, 19)]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabaseUser]);

  const user = useMemo<AppUser | null>(() => supabaseUser ? {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    displayName: supabaseUser.user_metadata?.display_name ?? supabaseUser.user_metadata?.full_name ?? supabaseUser.email?.split('@')?.[0] ?? 'Creator',
    username: supabaseUser.user_metadata?.username ?? supabaseUser.email?.split('@')?.[0] ?? 'creator',
    avatar: supabaseUser.user_metadata?.avatar_url ?? `https://api.dicebear.com/7.x/initials/svg?seed=${supabaseUser.email}`,
    country: supabaseUser.user_metadata?.country ?? 'US',
    role: profileRole ?? supabaseUser.user_metadata?.role ?? 'creator',
  } : null, [supabaseUser, profileRole]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    supabase.from('user_notifications').update({ read: true }).eq('id', id).then(() => {});
  }, []);

  const toggleSidebar = useCallback(() => setSidebarOpen(p => !p), []);

  const value = useMemo<AppContextType>(() => ({
    user,
    wallet,
    isAuthenticated: !!supabaseUser,
    showAuthModal,
    setShowAuthModal,
    authMode,
    setAuthMode,
    currentPage,
    setCurrentPage,
    notifications,
    markNotificationRead,
    searchQuery,
    setSearchQuery,
    sidebarOpen,
    toggleSidebar,
  }), [
    user, wallet, supabaseUser, showAuthModal, authMode, currentPage,
    notifications, markNotificationRead, searchQuery, sidebarOpen, toggleSidebar,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
