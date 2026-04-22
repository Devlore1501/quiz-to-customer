import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Input } from '@/components/ui/input';
import { AdminSurvey } from '@/components/AdminSurvey';
import DropoffAnalytics from '@/components/DropoffAnalytics';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ROLE_CHECK_TIMEOUT_MS = 8000;

const AdminReport: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [adminTab, setAdminTab] = useState<'survey' | 'dropoff'>('survey');

  // Anti-race guards
  const isMountedRef = useRef(true);
  const verificationInFlightRef = useRef(false);
  const lastCheckIdRef = useRef(0);
  const manualLoginInFlightRef = useRef(false);

  const safeSet = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    if (isMountedRef.current) setter(value);
  }, []);

  const verifyAdminAccess = useCallback(async (
    session: Session,
    source: 'mount' | 'manual-login' | 'listener'
  ): Promise<boolean> => {
    // Block concurrent verifications
    if (verificationInFlightRef.current) {
      console.log(`[AdminReport] verifyAdminAccess(${source}) skipped: already in flight`);
      return false;
    }
    verificationInFlightRef.current = true;
    const checkId = ++lastCheckIdRef.current;

    safeSet(setLoading, true);
    safeSet(setError, '');

    const isStillCurrent = () => isMountedRef.current && lastCheckIdRef.current === checkId;

    try {
      // 1. Server-side user confirmation
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.warn('[AdminReport] getUser failed:', userError);
        if (isStillCurrent()) {
          safeSet(setAuthenticated, false);
          safeSet(setError, 'Sessione non valida. Effettua di nuovo l\'accesso.');
          safeSet(setLoading, false);
        }
        return false;
      }

      const userId = userData.user.id;

      // 2. RPC has_role with timeout
      const rpcPromise = supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin' as const,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('ROLE_CHECK_TIMEOUT')), ROLE_CHECK_TIMEOUT_MS)
      );

      let isAdmin = false;
      try {
        const result = await Promise.race([rpcPromise, timeoutPromise]) as
          | { data: boolean | null; error: { message: string } | null }
          | never;

        if (result.error) {
          console.error('[AdminReport] has_role RPC error:', result.error);
          if (isStillCurrent()) {
            safeSet(setAuthenticated, false);
            safeSet(setError, 'Errore verifica permessi. Riprova.');
            safeSet(setLoading, false);
          }
          return false;
        }
        isAdmin = !!result.data;
      } catch (timeoutErr) {
        console.error('[AdminReport] has_role timeout:', timeoutErr);
        if (isStillCurrent()) {
          safeSet(setAuthenticated, false);
          safeSet(setError, 'Verifica permessi non riuscita, riprova');
          safeSet(setLoading, false);
        }
        return false;
      }

      if (!isStillCurrent()) return isAdmin;

      if (isAdmin) {
        safeSet(setAuthenticated, true);
        safeSet(setError, '');
        safeSet(setLoading, false);
        return true;
      }

      // Not admin: sign out and show clear error
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.warn('[AdminReport] signOut after non-admin failed:', signOutErr);
      }
      if (isStillCurrent()) {
        safeSet(setAuthenticated, false);
        safeSet(setError, 'Non hai i permessi per accedere a questa area');
        safeSet(setLoading, false);
      }
      return false;
    } catch (err) {
      console.error(`[AdminReport] verifyAdminAccess(${source}) exception:`, err);
      if (isStillCurrent()) {
        safeSet(setAuthenticated, false);
        safeSet(setError, 'Errore durante la verifica. Riprova.');
        safeSet(setLoading, false);
      }
      return false;
    } finally {
      verificationInFlightRef.current = false;
    }
  }, [safeSet]);

  useEffect(() => {
    isMountedRef.current = true;

    // Register listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AdminReport] auth event:', event, 'has session:', !!session);

      if (event === 'SIGNED_OUT') {
        if (!isMountedRef.current) return;
        // Invalidate any in-flight check
        lastCheckIdRef.current++;
        verificationInFlightRef.current = false;
        safeSet(setAuthenticated, false);
        safeSet(setError, '');
        safeSet(setLoading, false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Skip if manual login is driving the flow
        if (manualLoginInFlightRef.current) {
          console.log('[AdminReport] listener skipped: manual login in flight');
          return;
        }
        // Skip if a verification is already running
        if (verificationInFlightRef.current) {
          console.log('[AdminReport] listener skipped: verification in flight');
          return;
        }
        if (!session) return;
        // Defer to avoid running inside the auth callback
        setTimeout(() => {
          if (!isMountedRef.current) return;
          if (verificationInFlightRef.current) return;
          void verifyAdminAccess(session, 'listener');
        }, 0);
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMountedRef.current) return;
      if (!session) {
        safeSet(setLoading, false);
        safeSet(setAuthenticated, false);
        return;
      }
      void verifyAdminAccess(session, 'mount');
    }).catch((err) => {
      console.error('[AdminReport] getSession error:', err);
      if (isMountedRef.current) {
        safeSet(setLoading, false);
        safeSet(setAuthenticated, false);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [verifyAdminAccess, safeSet]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    safeSet(setLoading, true);
    safeSet(setError, '');
    safeSet(setAuthenticated, false);
    manualLoginInFlightRef.current = true;

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data?.session) {
        console.warn('[AdminReport] signIn error:', authError);
        safeSet(setAuthenticated, false);
        safeSet(setError, 'Credenziali non valide');
        safeSet(setLoading, false);
        return;
      }

      // Drive verification immediately from the returned session
      await verifyAdminAccess(data.session, 'manual-login');
    } catch (err) {
      console.error('[AdminReport] login exception:', err);
      safeSet(setError, 'Errore durante il login. Riprova.');
      safeSet(setAuthenticated, false);
      safeSet(setLoading, false);
    } finally {
      manualLoginInFlightRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-orange animate-spin" />
        <p className="text-slate-400 text-sm">Verifica accesso admin...</p>
      </div>
    );
  }

  if (authenticated) {
    return (
      <div className="min-h-screen bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1 mb-6 w-fit">
            <button onClick={() => setAdminTab('survey')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${adminTab === 'survey' ? 'bg-orange text-white' : 'text-slate-400 hover:text-white'}`}>
              📋 Report Generator
            </button>
            <button onClick={() => setAdminTab('dropoff')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${adminTab === 'dropoff' ? 'bg-orange text-white' : 'text-slate-400 hover:text-white'}`}>
              📊 Drop-off Analytics
            </button>
          </div>
        </div>
        {adminTab === 'survey' ? <AdminSurvey /> : (
          <div className="max-w-6xl mx-auto px-4 pb-8">
            <DropoffAnalytics />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange/10 border border-orange/30 mb-4">
            <Lock className="w-8 h-8 text-orange" />
          </div>
          <h1 className="text-2xl font-bold text-white">Modalità Admin</h1>
          <p className="text-slate-400 text-sm mt-1">
            Genera report personalizzati senza salvare dati
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-5">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!email || !password || loading}
            className="w-full py-3 rounded-xl font-semibold bg-orange hover:bg-orange/90 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Accedi'}
          </button>

          <p className="text-center text-slate-500 text-xs">
            🔒 Accesso riservato — nessun dato viene salvato
          </p>
        </form>
      </div>
    </div>
  );
};

export default AdminReport;
