import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

/**
 * Lead da recuperare — persone che hanno COMPLETATO il quiz ma il cui invio
 * è fallito. Non sono abbandoni: volevano il report e non l'hanno ricevuto.
 *
 * Due modalità di fallimento distinte (vedi handleGateSubmit in
 * EmailMarketingSurvey):
 *
 *  A) L'INSERT iniziale su survey_submissions fallisce → la funzione esce
 *     subito con un toast d'errore. La persona NON esiste in
 *     survey_submissions: sopravvive solo nella riga partial_submissions,
 *     che però ha già tutto il form_data (email inclusa).
 *
 *  B) L'INSERT riesce (status 'in_progress') ma la RPC finalize_submission
 *     fallisce → la riga resta bloccata su 'in_progress' e markCompleted()
 *     non viene mai raggiunto. È il bug del commit "gate non salvava lead".
 *
 * In entrambi i casi il contatto è identificabile e ricontattabile.
 */

interface LeadRecuperabile {
  quando: string;
  email: string;
  nome: string;
  sito: string;
  fatturato: string;
  modalita: 'A' | 'B';
}

// Fasce ICP Mailift (25k+): servono a dare priorità al recupero
const IN_TARGET = new Set(['25-50k', '50-100k', '100-300k', '300k+']);

const ETICHETTE_FATTURATO: Record<string, string> = {
  'under-10k': 'Meno di 10k',
  '10-25k': '10 – 25k',
  '25-50k': '25 – 50k',
  '50-100k': '50 – 100k',
  '100-300k': '100 – 300k',
  '300k+': 'Oltre 300k',
};

const testo = (v: unknown): string =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : '';

const RecoverableLeads: React.FC = () => {
  const [leads, setLeads] = useState<LeadRecuperabile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
    setErrore(null);
    const raccolti: LeadRecuperabile[] = [];

    try {
      // I parziali si leggono per primi: servono anche a recuperare il fatturato
      // dei lead in modalità B (vedi sotto).
      const { data: parziali, error: errA } = await supabase
        .from('partial_submissions')
        .select('started_at, updated_at, form_data, completed, submission_id')
        .eq('survey_type', 'email_marketing')
        .eq('completed', false)
        .order('updated_at', { ascending: false });

      if (errA) throw errA;

      // email → fatturato dichiarato nel quiz
      const fatturatoPerEmail = new Map<string, string>();
      for (const r of (parziali || []) as any[]) {
        const em = testo(r.form_data?.email).toLowerCase();
        const fatt = testo(r.form_data?.monthlyRevenue);
        if (em && fatt && !fatturatoPerEmail.has(em)) fatturatoPerEmail.set(em, fatt);
      }

      // ── Modalità B: bloccati su 'in_progress' in survey_submissions ──
      const { data: bloccati, error: errB } = await supabase
        .from('survey_submissions')
        .select('created_at, email, full_name, website, monthly_revenue, status')
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false });

      if (errB) throw errB;

      for (const r of (bloccati || []) as any[]) {
        const email = testo(r.email);
        // monthly_revenue lo scrive finalize_submission, che qui è proprio ciò
        // che è fallito → sulla riga è NULL. Lo ripeschiamo dal partial.
        const fatturato = testo(r.monthly_revenue)
          || fatturatoPerEmail.get(email.toLowerCase())
          || '';
        raccolti.push({
          quando: r.created_at,
          email,
          nome: testo(r.full_name),
          sito: testo(r.website),
          fatturato,
          modalita: 'B',
        });
      }

      // ── Modalità A: mai arrivati in survey_submissions ──
      // Firma: non completati, ma con email E sito già compilati. Il sito è
      // l'ultima domanda del quiz: chi ce l'ha era in fondo, non a metà.
      const emailGiaViste = new Set(raccolti.map(l => l.email.toLowerCase()));

      for (const r of (parziali || []) as any[]) {
        const fd = r.form_data || {};
        const email = testo(fd.email);
        const sito = testo(fd.website);
        if (!email || !sito) continue;                       // non era in fondo
        if (emailGiaViste.has(email.toLowerCase())) continue; // già contato come B
        emailGiaViste.add(email.toLowerCase());
        raccolti.push({
          quando: r.updated_at || r.started_at,
          email,
          nome: testo(fd.fullName),
          sito,
          fatturato: testo(fd.monthlyRevenue),
          modalita: 'A',
        });
      }

      raccolti.sort((a, b) => (a.quando < b.quando ? 1 : -1));
      setLeads(raccolti);
    } catch (e: any) {
      console.error('[RecoverableLeads]', e);
      setErrore(e?.message || 'Errore nel caricamento');
    }
    setLoading(false);
  };

  const copiaEmail = () => {
    const lista = leads.map(l => l.email).filter(Boolean).join(', ');
    navigator.clipboard?.writeText(lista);
  };

  const nInTarget = leads.filter(l => IN_TARGET.has(l.fatturato)).length;

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-white font-semibold">🚑 Lead da recuperare</h3>
        <div className="flex items-center gap-3">
          {leads.length > 0 && (
            <button onClick={copiaEmail}
              className="text-xs px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors">
              Copia email
            </button>
          )}
          <span className="text-xs text-slate-500">{leads.length} trovati</span>
        </div>
      </div>
      <p className="text-slate-500 text-xs mb-4">
        Hanno completato il quiz ma l'invio è fallito. Non sono abbandoni: volevano il report e non l'hanno mai ricevuto.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Caricamento…
        </div>
      ) : errore ? (
        <p className="text-red-400 text-sm">
          {errore}
          <span className="block text-slate-500 text-xs mt-1">
            Serve un account con ruolo admin per leggere queste tabelle.
          </span>
        </p>
      ) : leads.length === 0 ? (
        <p className="text-green-400 text-sm">
          Nessun invio fallito. Tutti quelli che hanno completato il quiz hanno ricevuto il report.
        </p>
      ) : (
        <>
          {nInTarget > 0 && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <span className="text-amber-300 text-sm font-semibold">
                {nInTarget} {nInTarget === 1 ? 'è' : 'sono'} in target (25k+)
              </span>
              <span className="text-slate-400 text-xs"> — recuperali per primi</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-700">
                  <th className="text-left font-medium py-2 pr-3">Quando</th>
                  <th className="text-left font-medium py-2 pr-3">Nome</th>
                  <th className="text-left font-medium py-2 pr-3">Email</th>
                  <th className="text-left font-medium py-2 pr-3">Sito</th>
                  <th className="text-left font-medium py-2 pr-3">Fatturato</th>
                  <th className="text-left font-medium py-2">Errore</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l, i) => {
                  const inTarget = IN_TARGET.has(l.fatturato);
                  return (
                    <tr key={`${l.email}-${i}`} className="border-b border-slate-800 last:border-0">
                      <td className="py-2 pr-3 text-slate-400 text-xs whitespace-nowrap">
                        {l.quando ? new Date(l.quando).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-slate-200 whitespace-nowrap">{l.nome || '—'}</td>
                      <td className="py-2 pr-3 text-white">{l.email}</td>
                      <td className="py-2 pr-3 text-slate-400 text-xs max-w-[180px] truncate">{l.sito || '—'}</td>
                      <td className={`py-2 pr-3 whitespace-nowrap ${inTarget ? 'text-amber-300 font-semibold' : 'text-slate-400'}`}>
                        {ETICHETTE_FATTURATO[l.fatturato] || l.fatturato || '—'}{inTarget && ' ★'}
                      </td>
                      <td className="py-2 text-xs text-slate-500 whitespace-nowrap">
                        {l.modalita === 'B' ? 'invio non finalizzato' : 'salvataggio fallito'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default RecoverableLeads;
