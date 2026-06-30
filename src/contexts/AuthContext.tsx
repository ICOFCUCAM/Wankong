import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────────────────

export type UserRole  = 'fan' | 'listener' | 'artist' | 'author' | 'creator';
export type AdminRole =
  | 'super_admin' | 'moderator' | 'competition_admin'
  | 'distribution_admin' | 'publishing_admin'
  | 'finance_admin' | 'support_admin';

interface AuthContextType {
  user:      User | null;
  session:   Session | null;
  loading:   boolean;
  userRole:  UserRole | null;
  adminRole: AdminRole | null;
  isAdmin:   boolean;
  signIn:              (email: string, password: string)              => Promise<{ error: Error | null }>;
  signUp:              (email: string, password: string, role?: UserRole, meta?: Record<string, unknown>) => Promise<{ error: Error | null }>;
  signOut:             ()                                             => Promise<void>;
  signInWithGoogle:    ()                                             => Promise<{ error: Error | null }>;
  signInWithApple:     ()                                             => Promise<{ error: Error | null }>;
  saveRole:            (role: UserRole)                               => Promise<{ error: Error | null }>;
  refreshRole:         ()                                             => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Helpers ────────────────────────────────────────────────────────────────────

async function fetchUserRole(userId: string): Promise<UserRole | null> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.role as UserRole) ?? null;
}

async function fetchAdminRole(userId: string): Promise<AdminRole | null> {
  const { data } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return (data?.role as AdminRole) ?? null;
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [session,   setSession]   = useState<Session | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [userRole,  setUserRole]  = useState<UserRole | null>(null);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);

  const loadRoles = useCallback(async (uid: string) => {
    const [role, admin] = await Promise.all([fetchUserRole(uid), fetchAdminRole(uid)]);
    setUserRole(role);
    setAdminRole(admin);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadRoles(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadRoles(session.user.id).finally(() => setLoading(false));
      } else {
        setUserRole(null);
        setAdminRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadRoles]);

  // ── Auth actions ────────────────────────────────────────────

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    role: UserRole = 'fan',
    meta?: Record<string, unknown>,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, ...meta } },
    });
    if (!error && data.user) {
      // Persist role to user_roles table
      await supabase.from('user_roles').upsert({ user_id: data.user.id, role });
    }
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    return { error };
  }, []);

  const signInWithApple = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error };
  }, []);

  const saveRole = useCallback(async (role: UserRole) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: user.id, role });
    if (!error) setUserRole(role);
    return { error };
  }, [user]);

  const refreshRole = useCallback(async () => {
    if (user) await loadRoles(user.id);
  }, [user, loadRoles]);

  const value = useMemo<AuthContextType>(() => ({
    user, session, loading,
    userRole, adminRole,
    isAdmin: adminRole !== null,
    signIn, signUp, signOut,
    signInWithGoogle, signInWithApple,
    saveRole, refreshRole,
  }), [
    user, session, loading, userRole, adminRole,
    signIn, signUp, signOut, signInWithGoogle, signInWithApple, saveRole, refreshRole,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
