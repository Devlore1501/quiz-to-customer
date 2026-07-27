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
  /** 'A'/'B' = invio fallito · 'abbandono' = uscito prima, ma ha lasciato un contatto */
  modalita: 'A' | 'B' | 'abbandono';
  step?: string;
  stepNum?: number | null;
  stepTot?: number | null;
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

/**
 * Righe di test lasciate dallo sviluppo (es. la sessione del 24/07 ne ha
 * lasciate 5 bloccate su 'in_progress'). Senza filtro la lista è per sempre
 * rumore e smetti di guardarla — che è il modo migliore per non accorgersi
 * del primo lead vero che si perde.
 *
 * Non vengono eliminate né nascoste in silenzio: restano dietro un toggle
 * con il conteggio visibile.
 */
const DOMINI_RISERVATI = ['example.com', 'example.org', 'example.net', 'test.com'];
const EMAIL_PROPRIETARIO = 'lorenzo.baretta997@gmail.com';

const isRigaDiTest = (l: { email: string; nome: string; sito?: string }): boolean => {
  const em = l.email.toLowerCase();
  // senza email ma con un sito è comunque un'azienda identificabile, non un test
  if (!em) return !testo(l.sito);
  // RFC 2606: questi domini sono riservati alla documentazione, mai utenti veri
  if (DOMINI_RISERVATI.some(d => em.endsWith('@' + d))) return true;
  if (em === EMAIL_PROPRIETARIO) return true;
  if (/(^|[+._-])(test|rlstest|verify|sess_auth|dummy|fake)/.test(em)) return true;
  const nome = l.nome.trim().toLowerCase();
  // nomi di una sola lettera ("t") = test. Nome VUOTO no: chi arriva dal
  // prefill della landing può avere l'email senza aver mai dato il nome.
  if (nome.length === 1) return true;
  if (/^(test|verify)\b/.test(nome)) return true;
  return false;
};

const RecoverableLeads: React.FC = () => {
  const [leads, setLeads] = useState<LeadRecuperabile[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [mostraTest, setMostraTest] = useState(false);

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
        .select('started_at, updated_at, form_data, completed, submission_id, current_step, current_step_name, total_steps')
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

      /* ── Modalità A: mai arrivati in survey_submissions ──
         Criterio VOLUTAMENTE largo: basta email OPPURE sito. Richiedere
         entrambi (= "è arrivato in fondo") nascondeva chi ha lasciato
         l'email e ha mollato a metà — che resta comunque contattabile.
         Chi non ha lasciato né l'una né l'altro non è recuperabile: è una
         sessione anonima, quelle si contano nel funnel qui sotto. */
      const emailGiaViste = new Set(raccolti.map(l => l.email.toLowerCase()));
      const sitiGiaVisti = new Set(raccolti.map(l => l.sito.toLowerCase()).filter(Boolean));

      for (const r of (parziali || []) as any[]) {
        const fd = r.form_data || {};
        const email = testo(fd.email);
        const sito = testo(fd.website);
        if (!email && !sito) continue;                        // nessuna traccia di contatto
        if (email && emailGiaViste.has(email.toLowerCase())) continue;  // già contato come B
        if (!email && sitiGiaVisti.has(sito.toLowerCase())) continue;   // stesso store senza email
        if (email) emailGiaViste.add(email.toLowerCase());
        if (sito) sitiGiaVisti.add(sito.toLowerCase());

        // arrivato in fondo = ha risposto anche all'ultima domanda (il sito)
        const inFondo = Boolean(email && sito);
        raccolti.push({
          quando: r.updated_at || r.started_at,
          email,
          nome: testo(fd.fullName),
          sito,
          fatturato: testo(fd.monthlyRevenue),
          modalita: inFondo ? 'A' : 'abbandono',
          step: testo(r.current_step_name),
          stepNum: typeof r.current_step === 'number' ? r.current_step : null,
          stepTot: typeof r.total_steps === 'number' ? r.total_steps : null,
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

  const reali = leads.filter(l => !isRigaDiTest(l));
  const righeTest = leads.filter(isRigaDiTest);
  const visibili = mostraTest ? leads : reali;

  // Si copiano solo i lead veri: le email di test non vanno in un outreach
  const copiaEmail = () => {
    navigator.clipboard?.writeText(reali.map(l => l.email).filter(Boolean).join(', '));
  };

  const nInTarget = reali.filter(l => IN_TARGET.has(l.fatturato)).length;

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 mb-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-white font-semibold">🚑 Lead da recuperare</h3>
        <div className="flex items-center gap-3">
          {reali.length > 0 && (
            <button onClick={copiaEmail}
              className="text-xs px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors">
              Copia email
            </button>
          )}
          {righeTest.length > 0 && (
            <button onClick={() => setMostraTest(v => !v)}
              className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors">
              {mostraTest ? 'Nascondi' : 'Mostra'} {righeTest.length} di test
            </button>
          )}
          <span className="text-xs text-slate-500">{reali.length} da recuperare</span>
        </div>
      </div>
      <p className="text-slate-500 text-xs mb-4">
        Chiunque abbia lasciato un'email o l'URL dello store senza arrivare al report.
        In <span className="text-red-400/80">rosso</span> chi aveva finito e l'invio è fallito;
        in grigio chi è uscito prima, con lo step in cui si è fermato.
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
      ) : visibili.length === 0 ? (
        <p className="text-green-400 text-sm">
          Nessun lead reale perso — tutti quelli che hanno completato il quiz hanno ricevuto il report.
          {righeTest.length > 0 && (
            <span className="block text-slate-500 text-xs mt-1">
              Ci sono {righeTest.length} righe di test bloccate su “in_progress”: rumore di sviluppo, non contatti.
            </span>
          )}
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
                {visibili.map((l, i) => {
                  const inTarget = IN_TARGET.has(l.fatturato);
                  const diTest = isRigaDiTest(l);
                  return (
                    <tr key={`${l.email}-${i}`}
                        className={`border-b border-slate-800 last:border-0 ${diTest ? 'opacity-40' : ''}`}>
                      <td className="py-2 pr-3 text-slate-400 text-xs whitespace-nowrap">
                        {l.quando ? new Date(l.quando).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-slate-200 whitespace-nowrap">{l.nome || '—'}</td>
                      <td className="py-2 pr-3 text-white">{l.email}</td>
                      <td className="py-2 pr-3 text-slate-400 text-xs max-w-[180px] truncate">{l.sito || '—'}</td>
                      <td className={`py-2 pr-3 whitespace-nowrap ${inTarget ? 'text-amber-300 font-semibold' : 'text-slate-400'}`}>
                        {ETICHETTE_FATTURATO[l.fatturato] || l.fatturato || '—'}{inTarget && ' ★'}
                      </td>
                      <td className="py-2 text-xs whitespace-nowrap">
                        {diTest ? (
                          <span className="text-slate-500">riga di test</span>
                        ) : l.modalita === 'abbandono' ? (
                          <span className="text-slate-400">
                            uscito a {l.step || `step ${l.stepNum ?? '?'}`}
                            {l.stepNum != null && l.stepTot ? ` (${l.stepNum}/${l.stepTot})` : ''}
                          </span>
                        ) : (
                          <span className="text-red-400/80">
                            {l.modalita === 'B' ? 'invio non finalizzato' : 'salvataggio fallito'}
                          </span>
                        )}
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
