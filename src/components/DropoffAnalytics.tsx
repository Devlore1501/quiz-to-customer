import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Version configurations
const VERSIONS = [
  {
    id: 'v1',
    label: 'Quiz v1 (precedente)',
    // v1 detection: total_steps = 14 or has v1-specific step names
    detectFn: (row: any) => {
      const v1Names = ['fullName', 'phone', 'adsInvestment', 'acceptTerms', 'activeFlows'];
      return row.total_steps === 14 || v1Names.includes(row.current_step_name);
    },
    stepOrder: ['fullName', 'phone', 'sector', 'website', 'monthlyRevenue', 'adsInvestment', 'activeFlows', 'acceptTerms'],
    stepLabels: {
      fullName: 'Nome Completo',
      phone: 'Telefono',
      sector: 'Settore',
      website: 'Sito Web',
      monthlyRevenue: 'Fatturato',
      adsInvestment: 'Spesa Ads',
      activeFlows: 'Automazioni',
      acceptTerms: 'Accettazione',
    } as Record<string, string>,
  },
  {
    id: 'v1b',
    label: 'Quiz v1b (10 step)',
    detectFn: (row: any) => row.total_steps === 10,
    stepOrder: ['sector', 'website', 'monthlyRevenue', 'fullName'],
    stepLabels: {
      sector: 'Settore',
      website: 'Sito Web',
      monthlyRevenue: 'Fatturato',
      fullName: 'Nome Completo',
    } as Record<string, string>,
  },
  {
    id: 'v2',
    label: 'Quiz v2 (precedente)',
    detectFn: (row: any) => row.total_steps === 11,
    stepOrder: ['monthlyRevenue', 'sector', 'platform', 'emailTool', 'emailRevenuePercentage', 'activeFlows', 'segmentation', 'emailFrequency', 'listSize', 'motivation', 'website'],
    stepLabels: {
      monthlyRevenue: 'Fatturato',
      sector: 'Settore',
      platform: 'Piattaforma',
      emailTool: 'Email Tool',
      emailRevenuePercentage: 'Revenue Email',
      activeFlows: 'Automazioni',
      segmentation: 'Segmentazione',
      emailFrequency: 'Frequenza',
      listSize: 'Lista Email',
      motivation: 'Obiettivo',
      website: 'URL Store',
    } as Record<string, string>,
  },
  {
    id: 'v3',
    label: 'Quiz v3 (attuale)',
    detectFn: (row: any) => row.total_steps === 12,
    stepOrder: ['companyName', 'website', 'sector', 'monthlyRevenue', 'platform', 'emailTool', 'emailRevenuePercentage', 'activeFlows', 'segmentation', 'emailFrequency', 'listSize', 'motivation'],
    stepLabels: {
      companyName: 'Brand',
      website: 'Sito Web',
      sector: 'Settore',
      monthlyRevenue: 'Fatturato',
      platform: 'Piattaforma',
      emailTool: 'Email Tool',
      emailRevenuePercentage: 'Revenue Email',
      activeFlows: 'Automazioni',
      segmentation: 'Segmentazione',
      emailFrequency: 'Frequenza',
      listSize: 'Lista Email',
      motivation: 'Obiettivo',
    } as Record<string, string>,
  },
];

interface TimingStats {
  avg: number;
  median: number;
  min: number;
  max: number;
  count: number;
}

const formatDuration = (ms: number): string => {
  if (!ms || ms <= 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

interface StepData {
  stepName: string;
  label: string;
  reached: number;
  abandoned: number;
  abandonRate: number;
}

interface VersionData {
  total: number;          // page loads (all sessions)
  realAttempts: number;   // sessions with actual interaction
  completed: number;
  steps: StepData[];
  timing: TimingStats;
}

const isGhostSession = (row: any): boolean => {
  // Ghost = page load with no interaction at all
  if (row.completed) return false;
  if ((row.current_step ?? 0) > 0) return false;
  const fd = row.form_data;
  const hasData = fd && typeof fd === 'object' && Object.keys(fd).length > 0;
  return !hasData;
};

type Period = '1d' | '7d' | '30d' | 'all';

const DropoffAnalytics: React.FC = () => {
  const [versionData, setVersionData] = useState<Record<string, VersionData>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('7d');
  const [activeVersion, setActiveVersion] = useState(VERSIONS[VERSIONS.length - 1].id);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('partial_submissions')
        .select('current_step, current_step_name, abandoned, completed, started_at, updated_at, total_steps, form_data')
        .eq('survey_type', 'email_marketing');

      if (period !== 'all') {
        const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte('started_at', since);
      }

      const { data: rows, error } = await query;
      if (error) { console.error(error); setLoading(false); return; }

      const result: Record<string, VersionData> = {};

      for (const version of VERSIONS) {
        const allRows = (rows || []).filter(r => version.detectFn(r));
        const total = allRows.length;
        // Filter ghost sessions for funnel + completion calculations
        const vRows = allRows.filter(r => !isGhostSession(r));
        const realAttempts = vRows.length;
        const completed = vRows.filter(r => r.completed).length;

        // Build step map from version config
        const stepMap = new Map<string, { reached: number; abandoned: number }>();
        for (const name of version.stepOrder) {
          stepMap.set(name, { reached: 0, abandoned: 0 });
        }

        // Also add any step names found in data but not in config
        vRows.forEach(row => {
          const name = row.current_step_name || `step_${row.current_step}`;
          if (!stepMap.has(name)) {
            stepMap.set(name, { reached: 0, abandoned: 0 });
          }
        });

        // Calculate reached and abandoned (real attempts only)
        vRows.forEach(row => {
          const name = row.current_step_name || `step_${row.current_step}`;
          const stepIdx = version.stepOrder.indexOf(name);
          
          if (stepIdx >= 0) {
            for (let i = 0; i <= stepIdx; i++) {
              const s = stepMap.get(version.stepOrder[i]);
              if (s) s.reached++;
            }
          } else {
            const s = stepMap.get(name);
            if (s) s.reached++;
          }

          if (row.abandoned && !row.completed) {
            const s = stepMap.get(name);
            if (s) s.abandoned++;
          }
        });

        const steps: StepData[] = [];
        for (const name of version.stepOrder) {
          const val = stepMap.get(name);
          if (val) {
            steps.push({
              stepName: name,
              label: version.stepLabels[name] || name,
              reached: val.reached,
              abandoned: val.abandoned,
              abandonRate: val.reached > 0 ? (val.abandoned / val.reached) * 100 : 0,
            });
          }
        }
        stepMap.forEach((val, name) => {
          if (!version.stepOrder.includes(name)) {
            steps.push({
              stepName: name,
              label: version.stepLabels[name] || name,
              reached: val.reached,
              abandoned: val.abandoned,
              abandonRate: val.reached > 0 ? (val.abandoned / val.reached) * 100 : 0,
            });
          }
        });

        // Compute timing stats from completed sessions
        const durations: number[] = [];
        vRows.forEach(row => {
          if (!row.completed || !row.started_at || !row.updated_at) return;
          const ms = new Date(row.updated_at).getTime() - new Date(row.started_at).getTime();
          if (ms >= 10_000 && ms <= 30 * 60_000) durations.push(ms);
        });
        durations.sort((a, b) => a - b);
        const timing: TimingStats = {
          count: durations.length,
          avg: durations.length ? durations.reduce((s, v) => s + v, 0) / durations.length : 0,
          median: durations.length ? durations[Math.floor(durations.length / 2)] : 0,
          min: durations.length ? durations[0] : 0,
          max: durations.length ? durations[durations.length - 1] : 0,
        };

        result[version.id] = { total, realAttempts, completed, steps, timing };
      }

      setVersionData(result);
      
      // Smart default tab: prefer the latest version with ≥10 real attempts,
      // otherwise fall back to whichever has the most real attempts.
      const currentHasData = (result[activeVersion]?.realAttempts || 0) > 0;
      if (!currentHasData) {
        const reversed = [...VERSIONS].reverse();
        const preferred = reversed.find(v => (result[v.id]?.realAttempts || 0) >= 10)
          || reversed.find(v => (result[v.id]?.realAttempts || 0) > 0)
          || reversed.find(v => (result[v.id]?.total || 0) > 0);
        if (preferred) setActiveVersion(preferred.id);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const current = versionData[activeVersion];
  const maxReached = current ? Math.max(...current.steps.map(d => d.reached), 1) : 1;
  const completionRate = current && current.realAttempts > 0
    ? ((current.completed / current.realAttempts) * 100).toFixed(1)
    : '0';
  const engagementRate = current && current.total > 0
    ? ((current.realAttempts / current.total) * 100).toFixed(0)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">📊 Drop-off Analytics</h2>
          <p className="text-slate-400 text-sm">Dove gli utenti abbandonano il quiz</p>
        </div>
        <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
          {(['1d', '7d', '30d', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === p ? 'bg-orange text-white' : 'text-slate-400 hover:text-white'}`}>
              {p === '1d' ? 'Oggi' : p === '7d' ? '7gg' : p === '30d' ? '30gg' : 'Tutto'}
            </button>
          ))}
        </div>
      </div>

      {/* Version Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
        {VERSIONS.map(v => {
          const vd = versionData[v.id];
          const real = vd?.realAttempts || 0;
          const total = vd?.total || 0;
          return (
            <button key={v.id} onClick={() => setActiveVersion(v.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeVersion === v.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              title={`${total} page loads · ${real} tentativi reali`}>
              {v.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeVersion === v.id ? 'bg-orange/20 text-orange' : 'bg-slate-700 text-slate-500'}`}>
                {real}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange animate-spin" />
        </div>
      ) : current && current.total > 0 ? (
        <>
          {/* Engagement: page loads vs real attempts */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">Page loads</p>
              <p className="text-2xl font-bold text-white">{current.total}</p>
              <p className="text-slate-500 text-[11px] mt-1">tutte le sessioni create</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">Tentativi reali</p>
              <p className="text-2xl font-bold text-white">{current.realAttempts}</p>
              <p className="text-slate-500 text-[11px] mt-1">utenti che hanno interagito</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">Engagement</p>
              <p className="text-2xl font-bold text-orange">{engagementRate}%</p>
              <p className="text-slate-500 text-[11px] mt-1">tentativi / page loads</p>
            </div>
          </div>

          {current.realAttempts === 0 ? (
            <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
              <p className="text-slate-400">Nessun utente ha ancora interagito con il quiz in questa versione.</p>
              <p className="text-slate-500 text-xs mt-2">Le {current.total} sessioni esistenti sono solo aperture di pagina senza interazione.</p>
            </div>
          ) : (
            <>
              {/* Summary su tentativi reali */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">Completate</p>
                  <p className="text-2xl font-bold text-green-400">{current.completed}</p>
                  <p className="text-slate-500 text-[11px] mt-1">su {current.realAttempts} tentativi reali</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <p className="text-slate-400 text-xs mb-1">Tasso completamento</p>
                  <p className="text-2xl font-bold text-orange">{completionRate}%</p>
                  <p className="text-slate-500 text-[11px] mt-1">completate / tentativi reali</p>
                </div>
              </div>

              {/* Timing */}
              <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">⏱ Tempo di completamento</h3>
                  <span className="text-xs text-slate-500">su {current.timing.count} sessioni completate</span>
                </div>
                {current.timing.count === 0 ? (
                  <p className="text-slate-500 text-sm">Nessuna sessione completata nel periodo (outlier &lt;10s o &gt;30min esclusi).</p>
                ) : current.timing.count < 3 ? (
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 inline-block">
                    <p className="text-slate-400 text-xs mb-1">Tempo</p>
                    <p className="text-lg font-bold text-white">{formatDuration(current.timing.avg)}</p>
                    <p className="text-slate-500 text-[11px] mt-1">dati insufficienti per medio/min/max</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Medio</p>
                      <p className="text-lg font-bold text-white">{formatDuration(current.timing.avg)}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Mediano</p>
                      <p className="text-lg font-bold text-white">{formatDuration(current.timing.median)}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Più veloce</p>
                      <p className="text-lg font-bold text-green-400">{formatDuration(current.timing.min)}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                      <p className="text-slate-400 text-xs mb-1">Più lento</p>
                      <p className="text-lg font-bold text-yellow-400">{formatDuration(current.timing.max)}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          {/* Funnel */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h3 className="text-white font-semibold mb-4">Funnel per domanda</h3>
            <div className="space-y-3">
              {current.steps.map((d, idx) => (
                <div key={d.stepName} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-6 text-right flex-shrink-0">{idx + 1}</span>
                  <span className="text-slate-300 text-sm w-28 flex-shrink-0 truncate">{d.label}</span>
                  <div className="flex-1 relative h-6">
                    <div className="absolute inset-y-0 left-0 bg-orange/30 rounded"
                      style={{ width: `${(d.reached / maxReached) * 100}%` }} />
                    {d.abandoned > 0 && (
                      <div className="absolute inset-y-0 bg-red-500/40 rounded-r"
                        style={{
                          left: `${((d.reached - d.abandoned) / maxReached) * 100}%`,
                          width: `${(d.abandoned / maxReached) * 100}%`
                        }} />
                    )}
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-xs text-white font-medium">{d.reached}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium w-12 text-right flex-shrink-0 ${d.abandonRate > 20 ? 'text-red-400' : d.abandonRate > 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {d.abandonRate.toFixed(0)}% ✕
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange/30 rounded" /> Raggiunti</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500/40 rounded" /> Abbandonati</span>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
          <p className="text-slate-400">Nessun dato per questa versione nel periodo selezionato</p>
        </div>
      )}
    </div>
  );
};

export default DropoffAnalytics;
