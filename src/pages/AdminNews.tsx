import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Lock, Eye, EyeOff, Loader2, Copy, Bookmark, BookmarkCheck, ExternalLink,
  RefreshCw, Trash2, CheckCircle2, Archive, RotateCcw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { Json, Tables } from '@/integrations/supabase/types';

// Shape of digest_data produced by the generate-daily-digest edge function
interface DigestItem {
  title: string;
  url: string;
  source: string;
  relevance_score: number;
  why_it_matters_it: string;
  linkedin_hook_it: string;
  linkedin_post_it: string;
  reel_script_30_60s_it: string;
  newsletter_angle_it: string;
}

interface DigestReproposal {
  saved_item_id: string;
  title: string;
  new_angle_it: string;
  linkedin_hook_it: string;
  reel_script_30_60s_it: string;
}

interface DigestData {
  date: string;
  intro_it: string;
  items: DigestItem[];
  reproposals: DigestReproposal[];
}

type DigestRow = Tables<'daily_digests'>;
type SavedRow = Tables<'saved_news_items'>;

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  success: { label: 'OK', cls: 'bg-emerald-500/15 text-emerald-400' },
  partial: { label: 'Parziale', cls: 'bg-amber-500/15 text-amber-400' },
  error: { label: 'Errore', cls: 'bg-red-500/15 text-red-400' },
  pending: { label: 'In corso', cls: 'bg-slate-500/15 text-slate-400' },
};

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copiato negli appunti`),
    () => toast.error('Copia non riuscita'),
  );
}

const CopyButton: React.FC<{ text: string; label: string }> = ({ text, label }) => (
  <button
    onClick={() => copyToClipboard(text, label)}
    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
    title={`Copia ${label}`}
  >
    <Copy className="w-3.5 h-3.5" /> Copia
  </button>
);

const ContentSection: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <details className="group rounded-lg bg-slate-900/60 border border-slate-700">
    <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-sm font-medium text-slate-200">
      <span>{title}</span>
      <CopyButton text={text} label={title} />
    </summary>
    <p className="px-3 pb-3 text-sm text-slate-300 whitespace-pre-wrap">{text}</p>
  </details>
);

const NewsItemCard: React.FC<{
  item: DigestItem;
  saved: boolean;
  onSave: () => void;
  saving: boolean;
}> = ({ item, saved, onSave, saving }) => (
  <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="text-white font-semibold hover:text-orange transition-colors inline-flex items-center gap-1.5">
          {item.title} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        </a>
        <p className="text-xs text-slate-400 mt-1">
          {item.source} · rilevanza <span className="text-orange font-semibold">{item.relevance_score}/10</span>
        </p>
      </div>
      <button
        onClick={onSave}
        disabled={saved || saving}
        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          saved
            ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
            : 'bg-orange/15 text-orange hover:bg-orange/25'
        }`}
      >
        {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        {saved ? 'Salvata' : saving ? '...' : 'Salva'}
      </button>
    </div>
    <p className="text-sm text-slate-300">{item.why_it_matters_it}</p>
    <div className="rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">🎯 Hook LinkedIn</p>
        <CopyButton text={item.linkedin_hook_it} label="Hook" />
      </div>
      <p className="text-sm text-white font-medium">{item.linkedin_hook_it}</p>
    </div>
    <div className="space-y-2">
      <ContentSection title="📝 Post LinkedIn completo" text={item.linkedin_post_it} />
      <ContentSection title="🎬 Script Reel 30-60s" text={item.reel_script_30_60s_it} />
      <ContentSection title="📧 Angolo newsletter" text={item.newsletter_angle_it} />
    </div>
  </div>
);

const DigestTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: digests, isLoading } = useQuery({
    queryKey: ['daily_digests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_digests')
        .select('*')
        .order('digest_date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as DigestRow[];
    },
  });

  const { data: savedUrls } = useQuery({
    queryKey: ['saved_news_urls'],
    queryFn: async () => {
      const { data, error } = await supabase.from('saved_news_items').select('url');
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.url).filter(Boolean) as string[]);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ item, digest }: { item: DigestItem; digest: DigestRow }) => {
      const { error } = await supabase.from('saved_news_items').insert({
        digest_id: digest.id,
        digest_date: digest.digest_date,
        title: item.title,
        url: item.url,
        source: item.source,
        item_data: item as unknown as Json,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notizia salvata nell\'archivio');
      queryClient.invalidateQueries({ queryKey: ['saved_news_urls'] });
      queryClient.invalidateQueries({ queryKey: ['saved_news_items'] });
    },
    onError: (err: { code?: string; message?: string }) => {
      if (err?.code === '23505') toast.info('Notizia già presente in archivio');
      else toast.error(`Salvataggio non riuscito: ${err?.message ?? 'errore'}`);
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-daily-digest', {
        body: { trigger: 'manual' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Digest generato!');
      queryClient.invalidateQueries({ queryKey: ['daily_digests'] });
    },
    onError: (err: { message?: string }) => {
      toast.error(`Generazione fallita: ${err?.message ?? 'errore'}`);
      // The function may still complete server-side after a client timeout
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['daily_digests'] }), 30_000);
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-orange animate-spin" /></div>;
  }

  const selected = digests?.find((d) => d.id === selectedId) ?? digests?.[0];
  const digestData = selected?.digest_data as unknown as DigestData | null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(digests ?? []).slice(0, 10).map((d) => {
            const badge = STATUS_BADGES[d.status] ?? STATUS_BADGES.pending;
            const isActive = d.id === (selected?.id ?? '');
            return (
              <button key={d.id} onClick={() => setSelectedId(d.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${isActive ? 'bg-orange text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}>
                {d.digest_date}
                <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => triggerMutation.mutate()}
          disabled={triggerMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold bg-orange hover:bg-orange/90 text-white text-sm transition-all disabled:opacity-50"
        >
          {triggerMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generazione (1-2 min)...</>
            : <><RefreshCw className="w-4 h-4" /> Genera ora</>}
        </button>
      </div>

      {!selected && (
        <div className="text-center py-16 text-slate-400">
          Nessun digest ancora. Premi «Genera ora» per il primo run.
        </div>
      )}

      {selected && selected.status === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          Run del {selected.digest_date} fallito: {selected.error ?? 'errore sconosciuto'}
        </div>
      )}

      {selected && digestData && (
        <>
          <p className="text-slate-300 bg-slate-800/60 border border-slate-700 rounded-xl p-4">{digestData.intro_it}</p>
          <div className="grid gap-4">
            {digestData.items.map((item, i) => (
              <NewsItemCard
                key={`${selected.id}-${i}`}
                item={item}
                saved={savedUrls?.has(item.url) ?? false}
                saving={saveMutation.isPending}
                onSave={() => saveMutation.mutate({ item, digest: selected })}
              />
            ))}
          </div>
          {digestData.reproposals?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-white font-semibold text-lg">♻️ Da riproporre oggi</h2>
              {digestData.reproposals.map((r, i) => (
                <div key={i} className="bg-orange/5 border border-orange/25 rounded-xl p-4 space-y-2">
                  <h3 className="text-white font-semibold">{r.title}</h3>
                  <p className="text-sm text-slate-300"><span className="text-orange font-medium">Nuovo angolo:</span> {r.new_angle_it}</p>
                  <div className="rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">🎯 Hook</p>
                      <CopyButton text={r.linkedin_hook_it} label="Hook" />
                    </div>
                    <p className="text-sm text-white font-medium">{r.linkedin_hook_it}</p>
                  </div>
                  <ContentSection title="🎬 Script Reel 30-60s" text={r.reel_script_30_60s_it} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const SavedTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'saved' | 'used' | 'archived'>('all');

  const { data: savedItems, isLoading } = useQuery({
    queryKey: ['saved_news_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_news_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SavedRow[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SavedRow> }) => {
      const { error } = await supabase.from('saved_news_items').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved_news_items'] }),
    onError: (err: { message?: string }) => toast.error(`Aggiornamento fallito: ${err?.message ?? 'errore'}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_news_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Notizia eliminata dall\'archivio');
      queryClient.invalidateQueries({ queryKey: ['saved_news_items'] });
      queryClient.invalidateQueries({ queryKey: ['saved_news_urls'] });
    },
    onError: (err: { message?: string }) => toast.error(`Eliminazione fallita: ${err?.message ?? 'errore'}`),
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-orange animate-spin" /></div>;
  }

  const filtered = (savedItems ?? []).filter((s) => statusFilter === 'all' || s.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['all', 'saved', 'used', 'archived'] as const).map((f) => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${statusFilter === f ? 'bg-orange text-white' : 'bg-slate-800 text-slate-300 hover:text-white'}`}>
            {f === 'all' ? 'Tutte' : f === 'saved' ? 'Da usare' : f === 'used' ? 'Usate' : 'Archiviate'}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          Nessuna notizia salvata{statusFilter !== 'all' ? ' con questo filtro' : ''}. Salva le migliori dal tab Digest per riproporle in futuro.
        </div>
      )}

      <div className="grid gap-4">
        {filtered.map((s) => {
          const item = s.item_data as unknown as Partial<DigestItem>;
          return (
            <div key={s.id} className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer"
                      className="text-white font-semibold hover:text-orange transition-colors inline-flex items-center gap-1.5">
                      {s.title} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-white font-semibold">{s.title}</span>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {s.source ?? 'fonte sconosciuta'} · salvata il {s.created_at.slice(0, 10)}
                    {s.times_reproposed > 0 && <> · riproposta <span className="text-orange">{s.times_reproposed}×</span></>}
                    {s.status !== 'saved' && <> · <span className="uppercase text-[10px] font-semibold">{s.status === 'used' ? 'usata' : 'archiviata'}</span></>}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {s.status === 'saved' ? (
                    <>
                      <button title="Segna come usata"
                        onClick={() => updateMutation.mutate({ id: s.id, patch: { status: 'used', used_at: new Date().toISOString() } })}
                        className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-all">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button title="Archivia"
                        onClick={() => updateMutation.mutate({ id: s.id, patch: { status: 'archived' } })}
                        className="p-2 rounded-lg bg-slate-500/15 text-slate-400 hover:bg-slate-500/25 transition-all">
                        <Archive className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button title="Rimetti tra le notizie da usare"
                      onClick={() => updateMutation.mutate({ id: s.id, patch: { status: 'saved', used_at: null } })}
                      className="p-2 rounded-lg bg-orange/15 text-orange hover:bg-orange/25 transition-all">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button title="Elimina"
                    onClick={() => { if (confirm('Eliminare questa notizia dall\'archivio?')) deleteMutation.mutate(s.id); }}
                    className="p-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {item.why_it_matters_it && <p className="text-sm text-slate-300">{item.why_it_matters_it}</p>}

              <div className="space-y-2">
                {item.linkedin_hook_it && (
                  <div className="rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">🎯 Hook LinkedIn</p>
                      <CopyButton text={item.linkedin_hook_it} label="Hook" />
                    </div>
                    <p className="text-sm text-white font-medium">{item.linkedin_hook_it}</p>
                  </div>
                )}
                {item.linkedin_post_it && <ContentSection title="📝 Post LinkedIn completo" text={item.linkedin_post_it} />}
                {item.reel_script_30_60s_it && <ContentSection title="🎬 Script Reel 30-60s" text={item.reel_script_30_60s_it} />}
                {item.newsletter_angle_it && <ContentSection title="📧 Angolo newsletter" text={item.newsletter_angle_it} />}
              </div>

              <NotesEditor
                initial={s.notes ?? ''}
                onSave={(notes) => updateMutation.mutate({ id: s.id, patch: { notes: notes || null } })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const NotesEditor: React.FC<{ initial: string; onSave: (notes: string) => void }> = ({ initial, onSave }) => {
  const [value, setValue] = useState(initial);
  const dirty = value !== initial;
  return (
    <div className="flex gap-2 items-start">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Note (angoli da provare, quando riproporla...)"
        rows={2}
        className="flex-1 rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 resize-y"
      />
      {dirty && (
        <button onClick={() => onSave(value)}
          className="px-3 py-2 rounded-lg bg-orange/15 text-orange hover:bg-orange/25 text-xs font-medium transition-all">
          Salva note
        </button>
      )}
    </div>
  );
};

const AdminNews: React.FC = () => {
  const { loading, authenticated, error, login, setError } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tab, setTab] = useState<'digest' | 'saved'>('digest');

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
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">📬 News Digest</h1>
              <p className="text-slate-400 text-sm">Notizie email marketing & ecommerce, hook e script pronti</p>
            </div>
            <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
              <button onClick={() => setTab('digest')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'digest' ? 'bg-orange text-white' : 'text-slate-400 hover:text-white'}`}>
                📰 Digest
              </button>
              <button onClick={() => setTab('saved')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'saved' ? 'bg-orange text-white' : 'text-slate-400 hover:text-white'}`}>
                🔖 Salvate
              </button>
            </div>
          </div>
          {tab === 'digest' ? <DigestTab /> : <SavedTab />}
        </div>
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
          <h1 className="text-2xl font-bold text-white">News Digest</h1>
          <p className="text-slate-400 text-sm mt-1">Area riservata admin</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void login(email, password); }}
          className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl space-y-5"
        >
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={!email || !password || loading}
            className="w-full py-3 rounded-xl font-semibold bg-orange hover:bg-orange/90 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Accedi'}
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-800 px-2 text-slate-500">oppure</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                const { lovable } = await import('@/integrations/lovable/index');
                const result = await lovable.auth.signInWithOAuth('google', {
                  redirect_uri: window.location.origin + '/admin/news',
                });
                if (result.error) setError('Errore durante il login con Google.');
              } catch {
                setError('Errore durante il login con Google.');
              }
            }}
            className="w-full py-3 rounded-xl font-semibold bg-white hover:bg-slate-100 text-slate-900 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Accedi con Google
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminNews;
