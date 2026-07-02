import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Download, Loader2, Settings, X, RotateCcw, RefreshCw,
  ArrowRight, TrendingUp, Users, Zap, CheckCircle,
  AlertTriangle, Ban, ThumbsUp, Calendar,
} from 'lucide-react';
import type { AdvancedReport } from '@/lib/reportCalculations';
import { calculateAdvancedReportFromValues, flowImpact, sectorAOV } from '@/lib/reportCalculations';
import { generatePdfReport } from '@/lib/pdfGenerator';

// ─── types ──────────────────────────────────────────────────────────────────

interface InvestmentData { show: boolean; currentEmailRevenue?: number }

interface SimInputs {
  monthlyRevenue: number; emailPct: number; listSize: number;
  activeFlows: string[]; aov: string; emailFrequency: string;
  hasPopup: boolean; popupConversionRate: number; monthlyVisitors: number;
  monthlyListGrowthRate: number;
  scenarioConservative: number; scenarioModerate: number; scenarioAggressive: number;
}

interface Props {
  report: AdvancedReport;
  phone?: string; userName?: string; userEmail?: string; website?: string;
  onRestart: () => void;
  investmentData?: InvestmentData;
  isAdminMode?: boolean;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number) => `€${Math.round(v).toLocaleString('it-IT')}`;

const healthLabel = (score: number) => {
  if (score >= 80) return { text: 'Ottimo', color: '#2ecc71', bg: 'rgba(46,204,113,0.12)', border: 'rgba(46,204,113,0.3)' };
  if (score >= 60) return { text: 'Discreto', color: '#FAB450', bg: 'rgba(250,180,80,0.12)', border: 'rgba(250,180,80,0.3)' };
  if (score >= 40) return { text: 'Da migliorare', color: '#e67e22', bg: 'rgba(230,126,34,0.12)', border: 'rgba(230,126,34,0.3)' };
  return { text: 'Critico', color: '#ff3b3b', bg: 'rgba(255,59,59,0.12)', border: 'rgba(255,59,59,0.3)' };
};

// ─── consulenza personalizzata ──────────────────────────────────────────────

interface Consiglio {
  tipo: 'fai' | 'evita';
  titolo: string;
  perche: string;
}

function getConsigli(r: AdvancedReport): Consiglio[] {
  const consigli: Consiglio[] = [];
  const sendsPerMonth = r.listForecast?.sendsPerMonth ?? 0;
  const isUnderBenchmark = r.currentEmailPercent < r.sectorBenchmark.emailShare;
  const missingCount = r.missingFlows.length;
  const hasAbandoned = !r.missingFlows.find(f => f.key === 'abandoned_cart');
  const hasBrowse = !r.missingFlows.find(f => f.key === 'browse_abandon');
  const hasWelcome = !r.missingFlows.find(f => f.key === 'welcome_series');
  const hasPostPurchase = !r.missingFlows.find(f => f.key === 'post_purchase');

  // Priorità flussi vs newsletter
  if (missingCount >= 3 && sendsPerMonth >= 8) {
    consigli.push({
      tipo: 'evita',
      titolo: 'Non mandare più newsletter prima di sistemare i flussi',
      perche: `Stai già inviando ${sendsPerMonth} email al mese, ma mancano ${missingCount} automazioni. Le newsletter richiedono lavoro ogni settimana — i flussi lavorano per te 24/7 senza intervento. Investire tempo in nuove campagne adesso è il modo più lento per crescere.`,
    });
  }

  if (missingCount >= 2) {
    const firstFlow = r.missingFlows[0];
    consigli.push({
      tipo: 'fai',
      titolo: `Parti dal "${firstFlow.label}" — è il flusso con il ROI più alto`,
      perche: `Non devi attivare tutto insieme. Il ${firstFlow.label} ha la priorità più alta nel tuo caso e vale circa ${fmt(firstFlow.impactValue)}/mese di revenue recuperabile. Un solo flusso ben fatto vale più di dieci campagne improvvisate.`,
    });
  }

  // Revenue email bassa vs benchmark
  if (isUnderBenchmark) {
    consigli.push({
      tipo: 'fai',
      titolo: 'Tratta le email come un canale di vendita, non di comunicazione',
      perche: `Nel tuo settore (${r.sectorBenchmark.label}), le email generano in media il ${r.sectorBenchmark.emailShare}% del fatturato. Tu sei al ${r.currentEmailPercent}%. Il gap non è di budget — è di struttura. Le aziende che arrivano al benchmark non mandano email più belle: hanno automatizzato i momenti giusti del customer journey.`,
    });
  }

  // Frequenza bassa con lista grande
  if (sendsPerMonth < 4 && r.listSize > 3000) {
    consigli.push({
      tipo: 'evita',
      titolo: 'Non lasciare la tua lista in silenzio troppo a lungo',
      perche: `Hai ${r.listSize.toLocaleString('it-IT')} iscritti ma mandi solo ${sendsPerMonth || 'poche'} email al mese. Una lista che non riceve email diventa fredda in 60-90 giorni: i tassi di apertura crollano, la deliverability peggiora, e recuperarla costa il doppio. La costanza è più importante della perfezione.`,
    });
  }

  // Frequenza alta con revenue bassa
  if (sendsPerMonth >= 12 && isUnderBenchmark) {
    consigli.push({
      tipo: 'fai',
      titolo: 'Segmenta prima di aumentare ulteriormente la frequenza',
      perche: `Stai già inviando spesso, ma il fatturato email è sotto il benchmark. Il problema non è la quantità — è che probabilmente mandi le stesse email a tutti. Segmentare per comportamento (chi ha comprato, chi ha abbandonato il carrello, chi non apre da 60 giorni) può raddoppiare il valore di ogni invio senza aumentare la pressione sulla lista.`,
    });
  }

  // Lista piccola
  if (r.listSize < 2000) {
    consigli.push({
      tipo: 'fai',
      titolo: 'La crescita della lista è la leva con il ROI più alto nel tuo caso',
      perche: `Con ${r.listSize.toLocaleString('it-IT')} iscritti, ogni miglioramento al funnel di acquisizione (popup, lead magnet, optin sul checkout) ha un impatto sproporzionato. Un popup che converte al 3% su 5.000 visite/mese aggiunge 150 nuovi iscritti ogni mese — cioè potenziale revenue ricorrente che si accumula nel tempo.`,
    });
  }

  // Carrello abbandonato mancante
  if (!hasAbandoned) {
    consigli.push({
      tipo: 'evita',
      titolo: `Non partire da zero senza il recupero carrelli`,
      perche: `Il flusso di recupero carrelli è il singolo automazione con il tasso di conversione più alto in assoluto (tipicamente 5-15% di chi lo riceve torna e compra). Senza questo flusso, stai regalando revenue a chi ti ha già scelto ma non ha completato l'acquisto. Va attivato prima di qualsiasi altra cosa.`,
    });
  }

  // Welcome series mancante con lista grande
  if (!hasWelcome && r.listSize > 1000) {
    consigli.push({
      tipo: 'fai',
      titolo: `Accogli chi si iscrive: la welcome series è il tuo primo impatto`,
      perche: `I nuovi iscritti aprono le email al 40-60% nelle prime 48 ore. Senza una welcome series, stai perdendo la finestra di engagement più alta — e il momento in cui il brand è più "fresco" nella mente del cliente. Una sequenza di 3-5 email ben costruita può generare fino al 30% delle revenue email totali da sola.`,
    });
  }

  // Post-purchase mancante con revenue buona
  if (!hasPostPurchase && r.currentEmailPercent >= r.sectorBenchmark.emailShare * 0.7) {
    consigli.push({
      tipo: 'fai',
      titolo: `Trasforma i clienti in clienti abituali con il post-acquisto`,
      perche: `Chi ha già comprato ha una probabilità 60-70% più alta di riacquistare rispetto a un nuovo contatto. Senza un flusso post-acquisto strutturato (upsell, review request, riattivazione a 30/60 giorni), stai acquisendo clienti a caro prezzo e poi li lasci andare. La retention è il canale con CAC zero.`,
    });
  }

  // Max 5 consigli, bilanciati tra fai/evita
  return consigli.slice(0, 5);
}

// ─── component ───────────────────────────────────────────────────────────────

export const AdvancedReportComponent: React.FC<Props> = ({
  report, phone = '', userName = '', userEmail = '', website = '',
  onRestart, investmentData, isAdminMode = false,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [simulatedReport, setSimulatedReport] = useState<AdvancedReport | null>(null);
  const [simInputs, setSimInputs] = useState<SimInputs>({
    monthlyRevenue: report.monthlyRevenue,
    emailPct: report.currentEmailPercent,
    listSize: report.listSize,
    activeFlows: Object.keys(flowImpact).filter(k => !report.missingFlows.find(f => f.key === k)),
    aov: report.listForecast?.isCustomAov ? String(report.listForecast.sectorAOV) : '',
    emailFrequency: (() => {
      const s = report.listForecast?.sendsPerMonth ?? 0;
      if (s === 0) return 'none'; if (s <= 8) return '1-2'; if (s <= 16) return '3-4'; if (s <= 28) return '5-7'; return 'daily+';
    })(),
    hasPopup: report.popupData?.hasPopup || false,
    popupConversionRate: report.popupData?.conversionRate || 3,
    monthlyVisitors: report.popupData?.monthlyVisitors || 0,
    monthlyListGrowthRate: report.popupData?.monthlyListGrowthRate || 2,
    scenarioConservative: report.scenarios.conservative.growthPercent,
    scenarioModerate: report.scenarios.moderate.growthPercent,
    scenarioAggressive: report.scenarios.aggressive.growthPercent,
  });

  const r = simulatedReport ?? report;
  const hl = healthLabel(r.emailHealthScore);
  const consigli = getConsigli(r);
  const ALL_FLOWS = Object.entries(flowImpact).map(([key, val]) => ({ key, label: val.label }));

  const handleSimulate = () => {
    const aovNum = simInputs.aov ? parseFloat(simInputs.aov) : undefined;
    const popupParams = simInputs.hasPopup
      ? { hasPopup: true, conversionRate: simInputs.popupConversionRate, monthlyVisitors: simInputs.monthlyVisitors, monthlyListGrowthRate: simInputs.monthlyListGrowthRate }
      : { hasPopup: false, conversionRate: 0, monthlyVisitors: 0, monthlyListGrowthRate: 0 };
    const SECTOR_LABEL_MAP: Record<string, string> = {
      'Beauty & Personal Care': 'beauty', 'Abbigliamento & Accessori': 'fashion',
      'Food & Beverage': 'food', 'Prodotti Digitali': 'digital',
      'Gioielli': 'jewelry', 'Casa & Arredamento': 'home',
      'Salute & Integrazione': 'health', 'Altro Settore': 'other',
    };
    const sectorKey = SECTOR_LABEL_MAP[report.sectorBenchmark.label] ?? 'other';
    const result = calculateAdvancedReportFromValues(
      sectorKey, simInputs.monthlyRevenue, simInputs.emailPct, simInputs.listSize,
      simInputs.activeFlows, undefined, simInputs.emailFrequency, aovNum,
      { conservative: simInputs.scenarioConservative, moderate: simInputs.scenarioModerate, aggressive: simInputs.scenarioAggressive },
      popupParams,
    );
    setSimulatedReport(result);
  };

  const handleResetSimulation = () => {
    setSimulatedReport(null);
    setSimInputs({
      monthlyRevenue: report.monthlyRevenue, emailPct: report.currentEmailPercent, listSize: report.listSize,
      activeFlows: Object.keys(flowImpact).filter(k => !report.missingFlows.find(f => f.key === k)),
      aov: report.listForecast?.isCustomAov ? String(report.listForecast.sectorAOV) : '',
      emailFrequency: (() => {
        const s = report.listForecast?.sendsPerMonth ?? 0;
        if (s === 0) return 'none'; if (s <= 8) return '1-2'; if (s <= 16) return '3-4'; if (s <= 28) return '5-7'; return 'daily+';
      })(),
      hasPopup: report.popupData?.hasPopup || false, popupConversionRate: report.popupData?.conversionRate || 3,
      monthlyVisitors: report.popupData?.monthlyVisitors || 0, monthlyListGrowthRate: report.popupData?.monthlyListGrowthRate || 2,
      scenarioConservative: report.scenarios.conservative.growthPercent,
      scenarioModerate: report.scenarios.moderate.growthPercent,
      scenarioAggressive: report.scenarios.aggressive.growthPercent,
    });
  };

  // Admin: investimento ROI
  const [setupFee, setSetupFee] = useState('');
  const [monthlyFixed, setMonthlyFixed] = useState('');
  const [monthlyPercent, setMonthlyPercent] = useState('');
  const showInvestment = investmentData?.show === true;
  const emailRevenueNetVAT = r.benchmarkEmailRevenue / 1.22;
  const setupFeeN = parseFloat(setupFee) || 0;
  const monthlyFixedN = parseFloat(monthlyFixed) || 0;
  const monthlyPercentN = parseFloat(monthlyPercent) || 0;
  const monthlyPercentFee = emailRevenueNetVAT * (monthlyPercentN / 100);
  const totalMonthlyFee = monthlyFixedN + monthlyPercentFee;
  const annualRevAdded = r.yearlyPotential;
  const annualCostY1 = setupFeeN + totalMonthlyFee * 12;
  const annualCostY2 = totalMonthlyFee * 12;
  const netRoiY1 = annualRevAdded - annualCostY1;
  const netRoiY2 = annualRevAdded - annualCostY2;
  const roiPctY1 = annualCostY1 > 0 ? netRoiY1 / annualCostY1 * 100 : 0;
  const roiPctY2 = annualCostY2 > 0 ? netRoiY2 / annualCostY2 * 100 : 0;
  const monthlyNetGain = annualRevAdded / 12 - totalMonthlyFee;
  const breakEvenMonths = setupFeeN > 0 && monthlyNetGain > 0 ? Math.ceil(setupFeeN / monthlyNetGain) : null;

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try { await generatePdfReport(r, userName, userEmail, website); }
    catch (e) { console.error(e); }
    finally { setIsDownloading(false); }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0f1923', fontFamily: "'Montserrat', sans-serif" }}>
      {/* ── Simulazione attiva banner (admin) */}
      {simulatedReport && (
        <div className="fixed top-0 left-0 right-0 z-40 px-4 py-2 flex items-center justify-between gap-3"
          style={{ background: 'rgba(124,58,237,0.95)', borderBottom: '1px solid rgba(167,139,250,0.5)' }}>
          <span className="text-sm font-semibold" style={{ color: '#e9d5ff' }}>Simulazione attiva — dati non salvati</span>
          <button onClick={handleResetSimulation}
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg"
            style={{ background: 'rgba(109,40,217,0.6)', border: '1px solid rgba(167,139,250,0.4)', color: '#e9d5ff' }}>
            <RotateCcw className="w-3 h-3" /> Ripristina
          </button>
        </div>
      )}

      <div className="w-full max-w-2xl mx-auto px-5 py-10 space-y-8" style={{ paddingTop: simulatedReport ? '64px' : '40px' }}>

        {/* ══════════════════════════════════════════════
            1. HEADER
        ══════════════════════════════════════════════ */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#FAB450' }}>
              Revenue Leak Audit
            </p>
            <p className="text-sm mt-0.5" style={{ color: '#5a6a80' }}>
              {r.sectorBenchmark.label}
              {website && (
                <> · <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer"
                  className="hover:underline" style={{ color: '#5a6a80' }}>{website.replace(/^https?:\/\//, '')}</a></>
              )}
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: hl.bg, color: hl.color, border: `1px solid ${hl.border}` }}>
            {r.emailHealthScore}/100 · {hl.text}
          </span>
        </div>

        {/* ══════════════════════════════════════════════
            2. HERO — numero chiave
        ══════════════════════════════════════════════ */}
        <div className="rounded-2xl px-6 py-8 text-center space-y-4"
          style={{
            background: r.potentialMode === 'benchmark'
              ? 'linear-gradient(135deg, rgba(255,59,59,0.1), rgba(255,59,59,0.03))'
              : 'linear-gradient(135deg, rgba(250,180,80,0.12), rgba(250,180,80,0.03))',
            border: `1px solid ${r.potentialMode === 'benchmark' ? 'rgba(255,59,59,0.25)' : 'rgba(250,180,80,0.25)'}`,
          }}>
          <p className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: r.potentialMode === 'benchmark' ? '#ff3b3b' : '#FAB450' }}>
            {r.potentialMode === 'benchmark' ? 'Revenue non catturata ogni mese' : 'Potenziale non sfruttato ogni mese'}
          </p>
          <p className="text-6xl md:text-7xl font-black tracking-tight"
            style={{ color: r.potentialMode === 'benchmark' ? '#ff3b3b' : '#FAB450' }}>
            {r.potentialMode === 'benchmark' ? '-' : '+'}{fmt(r.recoverablePotential)}
          </p>
          <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: '#7a8fa8' }}>
            {r.potentialMode === 'benchmark'
              ? `Le tue email generano il ${r.currentEmailPercent}% del fatturato. Nel tuo settore la media è ${r.sectorBenchmark.emailShare}%. La differenza vale ${fmt(r.recoverablePotential)} ogni mese.`
              : `Sei già sopra la media del settore, ma con ${r.listForecast?.sendsPerMonth ?? 0} invii/mese e ${r.missingFlows.length} flussi mancanti il tuo canale email gira sotto potenza.`
            }
          </p>
          <a href="#booking"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all hover:opacity-90"
            style={{ background: '#FAB450', color: '#0f1923' }}>
            Scopri il piano d'azione <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* ══════════════════════════════════════════════
            3. DOVE SEI OGGI
        ══════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#5a6a80' }}>Dove sei oggi</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tu */}
            <div className="rounded-xl p-5 space-y-1" style={{ background: '#16222f', border: '1px solid #1e2e3e' }}>
              <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#5a6a80' }}>Il tuo store</p>
              <p className="text-2xl font-black" style={{ color: '#fff' }}>{fmt(r.currentEmailRevenue)}</p>
              <p className="text-sm" style={{ color: '#5a6a80' }}>al mese dalle email</p>
              <p className="text-xs mt-2" style={{ color: '#3a4e62' }}>
                {r.currentEmailPercent}% del tuo fatturato totale ({fmt(r.monthlyRevenue)})
              </p>
            </div>
            {/* Benchmark */}
            <div className="rounded-xl p-5 space-y-1" style={{ background: 'rgba(250,180,80,0.06)', border: '1px solid rgba(250,180,80,0.2)' }}>
              <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#FAB450' }}>Media settore</p>
              <p className="text-2xl font-black" style={{ color: '#FAB450' }}>{fmt(r.benchmarkEmailRevenue)}</p>
              <p className="text-sm" style={{ color: '#b08a40' }}>al mese dalle email</p>
              <p className="text-xs mt-2" style={{ color: '#7a6030' }}>
                {r.sectorBenchmark.emailShare}% del fatturato — benchmark {r.sectorBenchmark.label}
              </p>
            </div>
            {/* Gap */}
            <div className="rounded-xl p-5 space-y-1"
              style={{
                background: r.potentialMode === 'benchmark' ? 'rgba(255,59,59,0.06)' : 'rgba(46,204,113,0.06)',
                border: `1px solid ${r.potentialMode === 'benchmark' ? 'rgba(255,59,59,0.2)' : 'rgba(46,204,113,0.2)'}`,
              }}>
              <p className="text-[11px] font-semibold tracking-widest uppercase"
                style={{ color: r.potentialMode === 'benchmark' ? '#ff3b3b' : '#2ecc71' }}>
                {r.potentialMode === 'benchmark' ? 'Divario attuale' : 'Leve disponibili'}
              </p>
              <p className="text-2xl font-black"
                style={{ color: r.potentialMode === 'benchmark' ? '#ff3b3b' : '#2ecc71' }}>
                {fmt(r.recoverablePotential)}
              </p>
              <p className="text-sm" style={{ color: r.potentialMode === 'benchmark' ? '#9b3a3a' : '#2a7a4a' }}>
                {r.potentialMode === 'benchmark' ? 'di differenza mensile' : 'recuperabili/mese'}
              </p>
              <p className="text-xs mt-2" style={{ color: '#3a4e62' }}>
                {fmt(r.yearlyPotential)} l'anno, scenario moderato
              </p>
            </div>
          </div>

          {/* Automazioni coverage */}
          <div className="rounded-xl p-5" style={{ background: '#16222f', border: '1px solid #1e2e3e' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#fff' }}>
                  Automazioni attive: <span style={{ color: r.activeFlowsCount >= 4 ? '#2ecc71' : '#e67e22' }}>{r.activeFlowsCount}</span>
                  <span style={{ color: '#3a4e62' }}> / {r.totalFlowsCount}</span>
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#5a6a80' }}>
                  Le automazioni lavorano per te senza intervento manuale — ogni flusso mancante è revenue che non incassi.
                </p>
              </div>
              <span className="text-2xl font-black flex-shrink-0"
                style={{ color: r.automationCoverage >= 60 ? '#2ecc71' : r.automationCoverage >= 40 ? '#e67e22' : '#ff3b3b' }}>
                {Math.round(r.automationCoverage)}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: '#1e2e3e' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${r.automationCoverage}%`,
                  background: r.automationCoverage >= 60 ? '#2ecc71' : r.automationCoverage >= 40 ? '#e67e22' : '#ff3b3b',
                }} />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            4. CONSULENZA PERSONALIZZATA
        ══════════════════════════════════════════════ */}
        <section className="space-y-3">
          <div>
            <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#5a6a80' }}>Consulenza personalizzata</h2>
            <p className="text-xs mt-1" style={{ color: '#3a4e62' }}>
              Basata sui tuoi dati — non su consigli generici
            </p>
          </div>

          {consigli.map((c, i) => (
            <div key={i} className="rounded-xl p-5 space-y-2"
              style={{
                background: c.tipo === 'fai' ? 'rgba(250,180,80,0.05)' : 'rgba(255,59,59,0.05)',
                border: `1px solid ${c.tipo === 'fai' ? 'rgba(250,180,80,0.2)' : 'rgba(255,59,59,0.2)'}`,
              }}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {c.tipo === 'fai'
                    ? <ThumbsUp className="w-4 h-4" style={{ color: '#FAB450' }} />
                    : <Ban className="w-4 h-4" style={{ color: '#ff3b3b' }} />
                  }
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                      style={{
                        background: c.tipo === 'fai' ? 'rgba(250,180,80,0.15)' : 'rgba(255,59,59,0.15)',
                        color: c.tipo === 'fai' ? '#FAB450' : '#ff3b3b',
                      }}>
                      {c.tipo === 'fai' ? 'Fai questo' : 'Evita questo'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-snug" style={{ color: '#e8edf2' }}>{c.titolo}</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#6a7e94' }}>{c.perche}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ══════════════════════════════════════════════
            5. FLUSSI MANCANTI (cosa ti manca)
        ══════════════════════════════════════════════ */}
        {r.missingFlows.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#5a6a80' }}>Cosa manca — e quanto vale</h2>
              <p className="text-xs mt-1" style={{ color: '#3a4e62' }}>
                Ogni flusso è ordinato per impatto. Il valore è una stima conservativa.
              </p>
            </div>

            {r.missingFlows.map((flow, i) => (
              <div key={flow.key} className="rounded-xl p-5" style={{ background: '#16222f', border: '1px solid #1e2e3e' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: flow.priority === 1 ? 'rgba(255,59,59,0.15)' : flow.priority === 2 ? 'rgba(230,126,34,0.15)' : 'rgba(90,106,128,0.2)',
                          color: flow.priority === 1 ? '#ff3b3b' : flow.priority === 2 ? '#e67e22' : '#5a6a80',
                        }}>
                        Priorità {flow.priority === 1 ? 'Alta' : flow.priority === 2 ? 'Media' : 'Bassa'}
                      </span>
                      <span className="text-[10px]" style={{ color: '#3a4e62' }}>{flow.implementationTime}</span>
                    </div>
                    <p className="text-sm font-semibold" style={{ color: '#e8edf2' }}>{flow.label}</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: '#5a6a80' }}>{flow.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-black" style={{ color: '#FAB450' }}>+{fmt(flow.impactValue)}</p>
                    <p className="text-[11px]" style={{ color: '#3a4e62' }}>al mese</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: 'rgba(250,180,80,0.06)', border: '1px solid rgba(250,180,80,0.15)' }}>
              <p className="text-sm" style={{ color: '#7a6030' }}>Totale recuperabile dai flussi mancanti</p>
              <p className="text-lg font-black" style={{ color: '#FAB450' }}>+{fmt(r.totalFlowGap)}<span className="text-xs font-normal ml-1">/mese</span></p>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════
            6. SCENARI DI CRESCITA
        ══════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#5a6a80' }}>Quanto puoi crescere</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl p-5 space-y-2" style={{ background: '#16222f', border: '1px solid #1e2e3e' }}>
              <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#2ecc71' }}>Conservativo</p>
              <p className="text-3xl font-black" style={{ color: '#fff' }}>+{r.scenarios.conservative.growthPercent}%</p>
              <p className="text-lg font-bold" style={{ color: '#2ecc71' }}>{fmt(r.scenarios.conservative.value)}<span className="text-xs font-normal ml-1 text-gray-500">/mese</span></p>
              <p className="text-[12px] leading-relaxed" style={{ color: '#5a6a80' }}>{r.scenarios.conservative.description}</p>
            </div>

            <div className="rounded-xl p-5 space-y-2 relative" style={{ background: 'rgba(250,180,80,0.07)', border: '2px solid #FAB450' }}>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: '#FAB450', color: '#0f1923' }}>Più realistico</span>
              <p className="text-[11px] font-semibold tracking-widest uppercase mt-1" style={{ color: '#FAB450' }}>Moderato</p>
              <p className="text-3xl font-black" style={{ color: '#fff' }}>+{r.scenarios.moderate.growthPercent}%</p>
              <p className="text-lg font-bold" style={{ color: '#FAB450' }}>{fmt(r.scenarios.moderate.value)}<span className="text-xs font-normal ml-1 text-gray-500">/mese</span></p>
              <p className="text-[12px] leading-relaxed" style={{ color: '#8a7040' }}>{r.scenarios.moderate.description}</p>
            </div>

            <div className="rounded-xl p-5 space-y-2" style={{ background: '#16222f', border: '1px solid #1e2e3e' }}>
              <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#a78bfa' }}>Aggressivo</p>
              <p className="text-3xl font-black" style={{ color: '#fff' }}>+{r.scenarios.aggressive.growthPercent}%</p>
              <p className="text-lg font-bold" style={{ color: '#a78bfa' }}>{fmt(r.scenarios.aggressive.value)}<span className="text-xs font-normal ml-1 text-gray-500">/mese</span></p>
              <p className="text-[12px] leading-relaxed" style={{ color: '#5a6a80' }}>{r.scenarios.aggressive.description}</p>
            </div>
          </div>

          {/* Potenziale annuale */}
          <div className="rounded-xl p-6 text-center space-y-1" style={{ background: '#16222f', border: '1px solid rgba(250,180,80,0.2)' }}>
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: '#5a6a80' }}>Potenziale annuo (scenario moderato)</p>
            <p className="text-4xl font-black" style={{ color: '#FAB450' }}>{fmt(r.yearlyPotential)}</p>
            <p className="text-xs" style={{ color: '#3a4e62' }}>{fmt(r.scenarios.moderate.value)}/mese × 12</p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════
            7. PIANO D'AZIONE
        ══════════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#5a6a80' }}>Il piano — 3 azioni prioritarie</h2>

          {r.topActions.map((action, i) => (
            <div key={i} className="rounded-xl p-5 flex items-start gap-4" style={{ background: '#16222f', border: '1px solid #1e2e3e' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                style={{ background: '#FAB450', color: '#0f1923' }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold leading-snug" style={{ color: '#e8edf2' }}>{action.action}</p>
                <p className="text-xs" style={{ color: '#5a6a80' }}>
                  {action.timeframe} · Difficoltà: <span style={{ color: action.difficulty === 'Bassa' ? '#2ecc71' : action.difficulty === 'Media' ? '#FAB450' : '#ff3b3b' }}>{action.difficulty}</span>
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-base font-black" style={{ color: '#2ecc71' }}>{action.roi}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ══════════════════════════════════════════════
            ADMIN: Investimento & ROI
        ══════════════════════════════════════════════ */}
        {showInvestment && (
          <section className="space-y-4 rounded-2xl p-6" style={{ background: '#16222f', border: '1px solid rgba(250,180,80,0.2)' }}>
            <div>
              <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: '#FAB450' }}>Investimento & ROI</h2>
              <p className="text-xs mt-1" style={{ color: '#3a4e62' }}>Inserisci i costi del servizio per calcolare break-even e ROI</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'Setup una-tantum', key: setupFee, set: setSetupFee, suffix: '€', prefix: true, placeholder: '1500' },
                { label: 'Fee fissa mensile', key: monthlyFixed, set: setMonthlyFixed, suffix: '€', prefix: true, placeholder: '800' },
                { label: 'Commissione % su email netto IVA', key: monthlyPercent, set: setMonthlyPercent, suffix: '%', prefix: false, placeholder: '10' },
              ].map(({ label, key, set, suffix, prefix, placeholder }) => (
                <div key={label}>
                  <label className="block text-[10px] font-semibold tracking-wider uppercase mb-1.5" style={{ color: '#5a6a80' }}>{label}</label>
                  <div className="relative">
                    {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#3a4e62' }}>{suffix}</span>}
                    <input type="number" placeholder={placeholder} value={key}
                      onChange={e => set(e.target.value)}
                      className="w-full rounded-lg py-2 text-sm focus:outline-none"
                      style={{ background: '#1e2e3e', border: '1px solid #2a3a52', color: '#fff', paddingLeft: prefix ? '28px' : '12px', paddingRight: prefix ? '12px' : '28px' }} />
                    {!prefix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#3a4e62' }}>{suffix}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Fee mensile totale', value: totalMonthlyFee > 0 ? fmt(totalMonthlyFee) : '—', color: '#FAB450' },
                { label: 'Break-even', value: setupFeeN === 0 ? '—' : breakEvenMonths ? `${breakEvenMonths} mesi` : 'Fee > Rev.', color: breakEvenMonths ? '#2ecc71' : '#ff3b3b' },
                { label: 'ROI netto anno 1', value: annualCostY1 > 0 ? fmt(netRoiY1) : '—', color: netRoiY1 >= 0 ? '#2ecc71' : '#ff3b3b' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl p-4 text-center" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                  <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: '#5a6a80' }}>{label}</p>
                  <p className="text-lg font-black" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════
            8. SOCIAL PROOF — numeri reali Mailift
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: '€1M+', label: 'Revenue email generata', icon: <TrendingUp className="w-4 h-4" /> },
            { value: '35x', label: 'ROI medio email marketing', icon: <Zap className="w-4 h-4" /> },
            { value: '5+', label: 'Anni nell\'ecosistema eCommerce', icon: <Users className="w-4 h-4" /> },
            { value: '100%', label: 'Focus Shopify + Klaviyo', icon: <CheckCircle className="w-4 h-4" /> },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4 flex items-center gap-3" style={{ background: '#16222f', border: '1px solid #1e2e3e' }}>
              <div className="flex-shrink-0" style={{ color: '#FAB450' }}>{s.icon}</div>
              <div>
                <p className="text-lg font-black" style={{ color: '#fff' }}>{s.value}</p>
                <p className="text-[11px] leading-tight" style={{ color: '#5a6a80' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            9. CTA + BOOKING
        ══════════════════════════════════════════════ */}
        <section id="booking" className="rounded-2xl p-6 space-y-5" style={{ background: '#16222f', border: '2px solid rgba(250,180,80,0.3)' }}>
          <div className="text-center space-y-2">
            <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: '#FAB450' }}>
              Prossimo passo
            </p>
            <h3 className="text-2xl md:text-3xl font-black leading-tight" style={{ color: '#fff' }}>
              Prenota una sessione strategica gratuita
            </h3>
            <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: '#5a6a80' }}>
              30 minuti con Lorenzo. Analizziamo insieme il tuo report e ti dico esattamente cosa fare per sbloccare {fmt(r.yearlyPotential)} nell'arco di 12 mesi.
            </p>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: '#fff' }}>
            <iframe
              src="https://go.mailift.com/widget/booking/3IIFrrczXhMvLYQAL4md"
              style={{ width: '100%', height: '700px', border: 'none' }}
              title="Prenota Consulenza Gratuita"
              loading="lazy"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Button onClick={handleDownloadPdf} disabled={isDownloading}
              className="rounded-full px-5 py-2 text-sm font-semibold flex items-center gap-2"
              style={{ background: '#1e2e3e', color: '#e8edf2', border: '1px solid #2a3a52' }}>
              {isDownloading ? <><Loader2 className="w-4 h-4 animate-spin" />Generazione...</> : <><Download className="w-4 h-4" />Scarica PDF</>}
            </Button>
            <button onClick={onRestart} className="text-xs" style={{ color: '#3a4e62' }}>
              Fai un'altra analisi
            </button>
          </div>
        </section>

      </div>

      {/* ── Admin: pulsante simulatore ─────────────────── */}
      {isAdminMode && (
        <button onClick={() => setShowSimPanel(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl text-sm font-semibold transition-all hover:scale-105"
          style={{ background: simulatedReport ? '#7c3aed' : '#16222f', border: `2px solid ${simulatedReport ? '#a78bfa' : '#2a3a52'}`, color: simulatedReport ? '#e9d5ff' : '#5a6a80' }}>
          <Settings className="w-4 h-4" />
          {simulatedReport ? '✦ Sim. attiva' : 'Simula dati'}
        </button>
      )}

      {/* ── Admin: pannello simulatore ─────────────────── */}
      {isAdminMode && showSimPanel && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowSimPanel(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col overflow-hidden"
            style={{ background: '#0f1923', borderLeft: '1px solid #1e2e3e' }}>
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #1e2e3e' }}>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" style={{ color: '#a78bfa' }} />
                <h3 className="font-bold text-base" style={{ color: '#fff' }}>Simula modifiche</h3>
                {simulatedReport && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.3)', color: '#c4b5fd' }}>ATTIVA</span>}
              </div>
              <button onClick={() => setShowSimPanel(false)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: '#5a6a80' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Fatturato */}
              <div>
                <label className="block text-[10px] font-semibold tracking-wider uppercase mb-1.5" style={{ color: '#5a6a80' }}>Fatturato mensile totale</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#3a4e62' }}>€</span>
                  <input type="number" min={0} value={simInputs.monthlyRevenue}
                    onChange={e => setSimInputs(p => ({ ...p, monthlyRevenue: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg px-3 py-2 pl-8 text-sm focus:outline-none"
                    style={{ background: '#16222f', border: '1px solid #1e2e3e', color: '#fff' }} />
                </div>
              </div>
              {/* % email */}
              <div>
                <label className="block text-[10px] font-semibold tracking-wider uppercase mb-1.5" style={{ color: '#5a6a80' }}>% fatturato da email</label>
                <div className="flex items-center gap-3">
                  <Slider min={0} max={80} step={1} value={[simInputs.emailPct]} onValueChange={v => setSimInputs(p => ({ ...p, emailPct: v[0] }))} className="flex-1" />
                  <span className="font-black text-lg w-12 text-right" style={{ color: '#fff' }}>{simInputs.emailPct}%</span>
                </div>
              </div>
              {/* Lista */}
              <div>
                <label className="block text-[10px] font-semibold tracking-wider uppercase mb-1.5" style={{ color: '#5a6a80' }}>Dimensione lista</label>
                <input type="number" min={0} value={simInputs.listSize}
                  onChange={e => setSimInputs(p => ({ ...p, listSize: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: '#16222f', border: '1px solid #1e2e3e', color: '#fff' }} />
              </div>
              {/* AOV */}
              <div>
                <label className="block text-[10px] font-semibold tracking-wider uppercase mb-1.5" style={{ color: '#5a6a80' }}>AOV personalizzato</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#3a4e62' }}>€</span>
                  <input type="number" min={0} placeholder="benchmark" value={simInputs.aov}
                    onChange={e => setSimInputs(p => ({ ...p, aov: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 pl-8 text-sm focus:outline-none"
                    style={{ background: '#16222f', border: '1px solid #1e2e3e', color: '#fff' }} />
                </div>
              </div>
              {/* Frequenza */}
              <div>
                <label className="block text-[10px] font-semibold tracking-wider uppercase mb-1.5" style={{ color: '#5a6a80' }}>Frequenza newsletter</label>
                <select value={simInputs.emailFrequency} onChange={e => setSimInputs(p => ({ ...p, emailFrequency: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ background: '#16222f', border: '1px solid #1e2e3e', color: '#fff' }}>
                  <option value="none">Nessuna (0/mese)</option>
                  <option value="1-2">1-2/settimana (~5/mese)</option>
                  <option value="3-4">3-4/settimana (~14/mese)</option>
                  <option value="5-7">5-7/settimana (~24/mese)</option>
                  <option value="daily+">Daily+ (~30/mese)</option>
                </select>
              </div>
              {/* Flussi */}
              <div>
                <label className="block text-[10px] font-semibold tracking-wider uppercase mb-2" style={{ color: '#5a6a80' }}>Flussi automazione attivi</label>
                <div className="space-y-2">
                  {ALL_FLOWS.map(({ key, label }) => {
                    const isActive = simInputs.activeFlows.includes(key);
                    return (
                      <button key={key}
                        onClick={() => setSimInputs(p => ({ ...p, activeFlows: isActive ? p.activeFlows.filter(f => f !== key) : [...p.activeFlows, key] }))}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left"
                        style={{ background: isActive ? 'rgba(124,58,237,0.12)' : '#16222f', border: `1px solid ${isActive ? 'rgba(167,139,250,0.35)' : '#1e2e3e'}`, color: isActive ? '#c4b5fd' : '#5a6a80' }}>
                        <span className="text-sm">{label}</span>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: isActive ? '#7c3aed' : '#1e2e3e', color: isActive ? '#fff' : '#3a4e62' }}>
                          {isActive ? '✓' : '+'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Scenari */}
              <div>
                <label className="block text-[10px] font-semibold tracking-wider uppercase mb-2" style={{ color: '#5a6a80' }}>Scenari crescita (%)</label>
                <div className="space-y-3">
                  {[
                    { label: 'Conservativo', key: 'scenarioConservative' as const, color: '#2ecc71', min: 5, max: 40 },
                    { label: 'Moderato', key: 'scenarioModerate' as const, color: '#FAB450', min: 10, max: 70 },
                    { label: 'Aggressivo', key: 'scenarioAggressive' as const, color: '#a78bfa', min: 20, max: 100 },
                  ].map(s => (
                    <div key={s.key}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px]" style={{ color: s.color }}>{s.label}</span>
                        <span className="font-black text-sm" style={{ color: '#fff' }}>{simInputs[s.key]}%</span>
                      </div>
                      <Slider min={s.min} max={s.max} step={1} value={[simInputs[s.key]]}
                        onValueChange={v => setSimInputs(p => ({ ...p, [s.key]: v[0] }))} className="w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid #1e2e3e' }}>
              <Button onClick={() => { handleSimulate(); setShowSimPanel(false); }}
                className="w-full rounded-full font-semibold py-2.5" style={{ background: '#7c3aed', color: '#fff' }}>
                <RefreshCw className="w-4 h-4 mr-2" />Applica simulazione
              </Button>
              {simulatedReport && (
                <Button onClick={() => { handleResetSimulation(); setShowSimPanel(false); }} variant="outline"
                  className="w-full rounded-full text-xs" style={{ borderColor: '#1e2e3e', color: '#5a6a80', background: 'transparent' }}>
                  <RotateCcw className="w-4 h-4 mr-2" />Ripristina originali
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancedReportComponent;
