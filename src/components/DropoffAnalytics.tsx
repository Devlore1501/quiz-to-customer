import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const STEP_LABELS = [
  'Fatturato', 'Settore', 'Piattaforma', 'Email Tool', 'Revenue Email',
  'Automazioni', 'Segmentazione', 'Frequenza', 'Lista Email', 'Obiettivo', 'URL Store'
];

interface StepData {
  step: number;
  label: string;
  reached: number;
  abandoned: number;
  abandonRate: number;
}

type Period = '1d' | '7d' | '30d' | 'all';

const DropoffAnalytics: React.FC = () => {
  const [data, setData] = useState<StepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('7d');
  const [totalSessions, setTotalSessions] = useState(0);
  const [completedSessions, setCompletedSessions] = useState(0);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('partial_submissions')
        .select('current_step, abandoned, completed, started_at')
        .eq('survey_type', 'email_marketing');

      if (period !== 'all') {
        const days = period === '1d' ? 1 : period === '7d' ? 7 : 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        query = query.gte('started_at', since);
      }

      const { data: rows, error } = await query;
      if (error) { console.error(error); setLoading(false); return; }

      const total = rows?.length || 0;
      const completed = rows?.filter(r => r.completed).length || 0;
      setTotalSessions(total);
      setCompletedSessions(completed);

      // Group by step
      const stepMap = new Map<number, { reached: number; abandoned: number }>();
      for (let i = 0; i < STEP_LABELS.length; i++) {
        stepMap.set(i, { reached: 0, abandoned: 0 });
      }

      rows?.forEach(row => {
        const step = row.current_step;
        for (let i = 0; i <= Math.min(step, STEP_LABELS.length - 1); i++) {
          const s = stepMap.get(i)!;
          s.reached++;
        }
        if (row.abandoned && !row.completed) {
          const s = stepMap.get(Math.min(step, STEP_LABELS.length - 1));
          if (s) s.abandoned++;
        }
      });

      const result: StepData[] = [];
      stepMap.forEach((val, step) => {
        result.push({
          step,
          label: STEP_LABELS[step] || `Step ${step}`,
          reached: val.reached,
          abandoned: val.abandoned,
          abandonRate: val.reached > 0 ? (val.abandoned / val.reached) * 100 : 0,
        });
      });

      setData(result.sort((a, b) => a.step - b.step));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const maxReached = Math.max(...data.map(d => d.reached), 1);
  const completionRate = totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(1) : '0';

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

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-orange animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">Sessioni totali</p>
              <p className="text-2xl font-bold text-white">{totalSessions}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">Completate</p>
              <p className="text-2xl font-bold text-green-400">{completedSessions}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs mb-1">Tasso completamento</p>
              <p className="text-2xl font-bold text-orange">{completionRate}%</p>
            </div>
          </div>

          {/* Funnel */}
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <h3 className="text-white font-semibold mb-4">Funnel per domanda</h3>
            <div className="space-y-3">
              {data.map(d => (
                <div key={d.step} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-6 text-right flex-shrink-0">{d.step + 1}</span>
                  <span className="text-slate-300 text-sm w-28 flex-shrink-0 truncate">{d.label}</span>
                  <div className="flex-1 relative h-6">
                    {/* Reached bar */}
                    <div className="absolute inset-y-0 left-0 bg-orange/30 rounded"
                      style={{ width: `${(d.reached / maxReached) * 100}%` }} />
                    {/* Abandoned overlay */}
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
      )}
    </div>
  );
};

export default DropoffAnalytics;
