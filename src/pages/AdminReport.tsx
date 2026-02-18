import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { AdminSurvey } from '@/components/AdminSurvey';
import { Lock, Eye, EyeOff } from 'lucide-react';

// ─── Change this password to whatever you prefer ──────────────────────────────
const ADMIN_PASSWORD = 'mailift2024';

const AdminReport: React.FC = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Password errata. Riprova.');
      setPassword('');
    }
  };

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
              Password admin
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                autoFocus
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
            disabled={!password}
            className="w-full py-3 rounded-xl font-semibold bg-orange hover:bg-orange/90 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Accedi
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
