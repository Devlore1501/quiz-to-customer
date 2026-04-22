import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Send, RefreshCw, CheckCircle2, XCircle, Copy, Check } from 'lucide-react';

interface SubmissionRow {
  id: string;
  full_name: string;
  email: string;
  company_name: string | null;
  website: string | null;
  sector: string | null;
  monthly_revenue: string | null;
  created_at: string;
  status: string | null;
  report_data: any;
}

type LogLevel = 'info' | 'success' | 'error' | 'warn';

interface LogEntry {
  ts: string;
  level: LogLevel;
  message: string;
}

const PRODUCTION_DOMAIN = 'https://quiz-to-customer.lovable.app';

const AdminWebhookTester: React.FC = () => {
  const [submission, setSubmission] = useState<SubmissionRow | null>(null);
  const [loadingLast, setLoadingLast] = useState(false);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const addLog = (level: LogLevel, message: string) => {
    const ts = new Date().toLocaleTimeString('it-IT', { hour12: false }) +
      '.' + String(new Date().getMilliseconds()).padStart(3, '0');
    setLogs(prev => [...prev, { ts, level, message }]);
  };

  const clearLogs = () => {
    setLogs([]);
    setLastResult(null);
  };

  const fetchLastSubmission = async () => {
    setLoadingLast(true);
    addLog('info', 'Recupero ultimo submission completato dal database…');
    try {
      const { data, error } = await supabase
        .from('survey_submissions')
        .select('id, full_name, email, company_name, website, sector, monthly_revenue, created_at, status, report_data')
        .eq('status', 'completed')
        .not('report_data', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        addLog('error', `Errore query DB: ${error.message}`);
        setSubmission(null);
        return;
      }

      const row = data?.[0] as SubmissionRow | undefined;
      if (!row) {
        addLog('warn', 'Nessun submission completato trovato.');
        setSubmission(null);
        return;
      }

      setSubmission(row);
      addLog('success', `Submission trovato: ${row.full_name} (${row.email}) — id ${row.id}`);
      addLog('info', `Settore: ${row.sector || 'n/d'} · Fatturato: ${row.monthly_revenue || 'n/d'} · Creato: ${new Date(row.created_at).toLocaleString('it-IT')}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'errore sconosciuto';
      addLog('error', `Eccezione durante il fetch: ${msg}`);
    } finally {
      setLoadingLast(false);
    }
  };

  const sendWebhook = async () => {
    if (!submission) {
      addLog('warn', 'Nessun submission caricato. Carica prima l\'ultimo lead.');
      return;
    }
    if (!submission.report_data) {
      addLog('error', 'Il submission non contiene report_data — impossibile inviare un payload completo.');
      return;
    }

    setSending(true);
    setLastResult(null);
    try {
      // Reusa esattamente il payload che il client costruisce in produzione
      const reportData = { ...submission.report_data } as Record<string, any>;
      const reportUrl = `${PRODUCTION_DOMAIN}/report/${submission.id}`;

      // Garantisce reportUrl sia top-level che dentro quickSummary
      if (!reportData.reportUrl) reportData.reportUrl = reportUrl;
      if (reportData.type === 'admin_report' && reportData.quickSummary) {
        reportData.quickSummary = { ...reportData.quickSummary };
        if (!reportData.quickSummary.reportUrl) reportData.quickSummary.reportUrl = reportUrl;
      }

      const payloadSize = JSON.stringify({ submissionData: reportData, submissionId: submission.id }).length;

      addLog('info', `Invio payload completo (${(payloadSize / 1024).toFixed(2)} KB) a submit-webhook…`);
      addLog('info', `submissionId: ${submission.id} · reportUrl: ${reportUrl}`);

      const t0 = performance.now();
      const { data, error } = await supabase.functions.invoke('submit-webhook', {
        body: { submissionData: reportData, submissionId: submission.id },
      });
      const elapsed = Math.round(performance.now() - t0);

      if (error) {
        addLog('error', `Errore edge function (${elapsed}ms): ${error.message}`);
        setLastResult({ error: error.message });
        return;
      }

      setLastResult(data);
      addLog('success', `Risposta ricevuta in ${elapsed}ms`);

      const makeRes = data?.webhooks?.make;
      const ghlRes = data?.webhooks?.ghl;

      if (makeRes?.success) addLog('success', '✅ Make.com: invio riuscito');
      else addLog('error', `❌ Make.com: ${makeRes?.error || 'errore sconosciuto'}`);

      if (ghlRes?.success) addLog('success', '✅ GoHighLevel: invio riuscito');
      else addLog('error', `❌ GoHighLevel: ${ghlRes?.error || 'errore sconosciuto'}`);

      if (data?.allWebhooksSucceeded) addLog('success', '🎉 Tutti i webhook hanno risposto OK.');
      else if (data?.webhookSent) addLog('warn', '⚠️ Almeno un webhook è fallito (vedi sopra).');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'errore sconosciuto';
      addLog('error', `Eccezione durante invio: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  const copyPayload = async () => {
    if (!submission?.report_data) return;
    const reportData = { ...submission.report_data } as Record<string, any>;
    const reportUrl = `${PRODUCTION_DOMAIN}/report/${submission.id}`;
    if (!reportData.reportUrl) reportData.reportUrl = reportUrl;
    const payload = { submissionData: reportData, submissionId: submission.id };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedPayload(true);
      addLog('info', 'Payload copiato negli appunti.');
      setTimeout(() => setCopiedPayload(false), 2000);
    } catch {
      addLog('error', 'Impossibile copiare negli appunti.');
    }
  };

  const levelColor: Record<LogLevel, string> = {
    info: 'text-slate-300',
    success: 'text-green-400',
    error: 'text-red-400',
    warn: 'text-yellow-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">🔔 Test Webhook</h2>
          <p className="text-slate-400 text-sm">
            Rianalizza l'ultimo submission e invia il payload completo a Make.com + GoHighLevel.
          </p>
        </div>
      </div>

      {/* Step 1: load submission */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">1. Ultimo submission</h3>
          <button
            onClick={fetchLastSubmission}
            disabled={loadingLast}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white transition-all disabled:opacity-50"
          >
            {loadingLast ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Carica ultimo
          </button>
        </div>

        {submission ? (
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <Field label="Lead" value={submission.full_name} />
            <Field label="Email" value={submission.email} />
            <Field label="Brand" value={submission.company_name || '—'} />
            <Field label="Sito" value={submission.website || '—'} />
            <Field label="Settore" value={submission.sector || '—'} />
            <Field label="Fatturato" value={submission.monthly_revenue || '—'} />
            <Field label="ID" value={submission.id} mono />
            <Field label="Creato" value={new Date(submission.created_at).toLocaleString('it-IT')} />
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Premi "Carica ultimo" per recuperare l'ultimo lead completato.</p>
        )}
      </div>

      {/* Step 2: send */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-white font-semibold">2. Invio webhook</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={copyPayload}
              disabled={!submission}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white transition-all disabled:opacity-40"
            >
              {copiedPayload ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copia payload
            </button>
            <button
              onClick={sendWebhook}
              disabled={!submission || sending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-orange hover:bg-orange/90 text-white transition-all disabled:opacity-40"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Invia al webhook
            </button>
          </div>
        </div>

        {lastResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ResultCard
              name="Make.com"
              success={!!lastResult.webhooks?.make?.success}
              error={lastResult.webhooks?.make?.error}
            />
            <ResultCard
              name="GoHighLevel"
              success={!!lastResult.webhooks?.ghl?.success}
              error={lastResult.webhooks?.ghl?.error}
            />
          </div>
        )}
      </div>

      {/* Logs */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">📋 Log</h3>
          <button
            onClick={clearLogs}
            disabled={logs.length === 0}
            className="text-xs text-slate-400 hover:text-white transition-all disabled:opacity-40"
          >
            Pulisci log
          </button>
        </div>
        <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs max-h-96 overflow-auto border border-slate-700">
          {logs.length === 0 ? (
            <p className="text-slate-500">Nessun log. Carica un submission e premi "Invia al webhook".</p>
          ) : (
            logs.map((l, i) => (
              <div key={i} className="flex gap-2 py-0.5">
                <span className="text-slate-500 flex-shrink-0">{l.ts}</span>
                <span className={`${levelColor[l.level]} break-words`}>{l.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
    <p className="text-slate-400 text-xs mb-1">{label}</p>
    <p className={`text-white text-sm ${mono ? 'font-mono text-xs' : ''} break-all`}>{value}</p>
  </div>
);

const ResultCard: React.FC<{ name: string; success: boolean; error?: string }> = ({ name, success, error }) => (
  <div className={`rounded-lg p-3 border ${success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
    <div className="flex items-center gap-2">
      {success ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
      <span className="text-white font-semibold text-sm">{name}</span>
    </div>
    <p className={`text-xs mt-1 ${success ? 'text-green-300' : 'text-red-300'}`}>
      {success ? 'Invio riuscito' : (error || 'Errore sconosciuto')}
    </p>
  </div>
);

export default AdminWebhookTester;
