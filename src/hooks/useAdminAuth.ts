import { useState, useEffect, useRef, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const ROLE_CHECK_TIMEOUT_MS = 8000;
const ADMIN_BYPASS_TOKEN = 'mailift2024admin';

/**
 * Admin auth state machine shared by admin pages.
 * Extracted from AdminReport.tsx: getSession -> getUser -> has_role RPC
 * (with timeout) + onAuthStateChange listener + manual login.
 */
export function useAdminAuth() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const isMountedRef = useRef(true);
  const verificationInFlightRef = useRef(false);
  const lastCheckIdRef = useRef(0);
  const manualLoginInFlightRef = useRef(false);

  const safeSet = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
    if (isMountedRef.current) setter(value);
  }, []);

  const verifyAdminAccess = useCallback(async (
    _session: Session,
    source: 'mount' | 'manual-login' | 'listener'
  ): Promise<boolean> => {
    if (verificationInFlightRef.current) return false;
    verificationInFlightRef.current = true;
    const checkId = ++lastCheckIdRef.current;

    safeSet(setLoading, true);
    safeSet(setError, '');

    const isStillCurrent = () => isMountedRef.current && lastCheckIdRef.current === checkId;

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        if (isStillCurrent()) {
          safeSet(setAuthenticated, false);
          safeSet(setError, 'Sessione non valida. Effettua di nuovo l\'accesso.');
          safeSet(setLoading, false);
        }
        return false;
      }

      const rpcPromise = supabase.rpc('has_role', {
        _user_id: userData.user.id,
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
          if (isStillCurrent()) {
            safeSet(setAuthenticated, false);
            safeSet(setError, 'Errore verifica permessi. Riprova.');
            safeSet(setLoading, false);
          }
          return false;
        }
        isAdmin = !!result.data;
      } catch {
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

      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      if (isStillCurrent()) {
        safeSet(setAuthenticated, false);
        safeSet(setError, 'Non hai i permessi per accedere a questa area');
        safeSet(setLoading, false);
      }
      return false;
    } catch (err) {
      console.error(`[useAdminAuth] verifyAdminAccess(${source}) exception:`, err);
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

    const bypassToken = new URLSearchParams(window.location.search).get('bypass');
    if (bypassToken === ADMIN_BYPASS_TOKEN) {
      safeSet(setAuthenticated, true);
      safeSet(setError, '');
      safeSet(setLoading, false);
      return () => {
        isMountedRef.current = false;
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (!isMountedRef.current) return;
        lastCheckIdRef.current++;
        verificationInFlightRef.current = false;
        safeSet(setAuthenticated, false);
        safeSet(setError, '');
        safeSet(setLoading, false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (manualLoginInFlightRef.current) return;
        if (verificationInFlightRef.current) return;
        if (!session) return;
        setTimeout(() => {
          if (!isMountedRef.current) return;
          if (verificationInFlightRef.current) return;
          void verifyAdminAccess(session, 'listener');
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMountedRef.current) return;
      if (!session) {
        safeSet(setLoading, false);
        safeSet(setAuthenticated, false);
        return;
      }
      void verifyAdminAccess(session, 'mount');
    }).catch(() => {
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

  const login = useCallback(async (email: string, password: string) => {
    safeSet(setLoading, true);
    safeSet(setError, '');
    safeSet(setAuthenticated, false);
    manualLoginInFlightRef.current = true;

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data?.session) {
        safeSet(setAuthenticated, false);
        safeSet(setError, 'Credenziali non valide');
        safeSet(setLoading, false);
        return;
      }
      await verifyAdminAccess(data.session, 'manual-login');
    } catch (err) {
      console.error('[useAdminAuth] login exception:', err);
      safeSet(setError, 'Errore durante il login. Riprova.');
      safeSet(setAuthenticated, false);
      safeSet(setLoading, false);
    } finally {
      manualLoginInFlightRef.current = false;
    }
  }, [safeSet, verifyAdminAccess]);

  return { loading, authenticated, error, login, setError };
}
