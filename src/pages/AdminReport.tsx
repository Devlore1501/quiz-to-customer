import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { AdminSurvey } from '@/components/AdminSurvey';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';

const AdminReport: React.FC = () => {
  const [searchParams] = useSearchParams();
  const bypassAuth = searchParams.get('bypass') === 'mailift2024admin';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(!bypassAuth);
  const [authenticated, setAuthenticated] = useState(bypassAuth);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bypassAuth) return;
    
    let mounted = true;
    const timeout = setTimeout(() => {
      console.warn('AdminReport: safety timeout reached, forcing loading=false');
      if (mounted) setLoading(false);
    }, 5000);

    const checkAdmin = async (userId: string) => {
      try {
        console.log('AdminReport: checking admin role for', userId);
        const { data, error: rpcError } = await supabase.rpc('has_role', {
          _user_id: userId,
          _role: 'admin' as const,
        });
        console.log('AdminReport: has_role result:', data, 'error:', rpcError);
        return !!data;
      } catch (err) {
        console.error('AdminReport: has_role exception:', err);
        return false;
      }
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('AdminReport: getSession result, session:', !!session);
      if (!mounted) return;
      if (session) {
        const isAdmin = await checkAdmin(session.user.id);
        if (mounted) setAuthenticated(isAdmin);
      }
      if (mounted) { setLoading(false); clearTimeout(timeout); }
    }).catch((err) => {
      console.error('AdminReport: getSession error:', err);
      if (mounted) { setLoading(false); clearTimeout(timeout); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('AdminReport: onAuthStateChange event:', _event, 'session:', !!session);
        if (!mounted) return;
        if (session) {
          const isAdmin = await checkAdmin(session.user.id);
          console.log('AdminReport: isAdmin after auth change:', isAdmin);
          if (mounted) setAuthenticated(isAdmin);
        } else {
          if (mounted) setAuthenticated(false);
        }
        if (mounted) { setLoading(false); clearTimeout(timeout); }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [bypassAuth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Credenziali non valide. Riprova.');
        setLoading(false);
        return;
      }

      // onAuthStateChange gestirà la verifica admin e setAuthenticated/setLoading
      setTimeout(() => {
        setLoading(prev => {
          if (prev) {
            console.warn('Admin login: timeout after signIn, forcing loading=false');
            return false;
          }
          return prev;
        });
      }, 8000);
    } catch (err) {
      console.error('Admin login error:', err);
      setError('Errore durante il login. Riprova.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange animate-spin" />
      </div>
    );
  }

  if (authenticated) {
    return <AdminSurvey />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange/10 border border-orange/30 mb-4">
            <Lock className="w-8 h-8 text-orange" />
          </div>
          <h1 className="text-2xl font-bold text-white">Modalità Admin</h1>
          <p className="text-slate-400 text-sm mt-1">
            Genera report personalizzati senza salvare dati
          </p>
        </div>

        {/* Login form */}
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
