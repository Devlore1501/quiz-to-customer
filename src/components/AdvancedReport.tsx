import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Download, Loader2, Settings, X, RotateCcw, RefreshCw, CheckCircle, AlertTriangle, ArrowRight, Calendar, TrendingUp, Users, Zap } from 'lucide-react';
import type { AdvancedReport } from '@/lib/reportCalculations';
import { calculateAdvancedReportFromValues, flowImpact, sectorAOV } from '@/lib/reportCalculations';
import { generatePdfReport } from '@/lib/pdfGenerator';

interface InvestmentData {
  show: boolean;
  currentEmailRevenue?: number;
}

interface SimInputs {
  monthlyRevenue: number;
  emailPct: number;
  listSize: number;
  activeFlows: string[];
  aov: string;
  emailFrequency: string;
  hasPopup: boolean;
  popupConversionRate: number;
  monthlyVisitors: number;
  monthlyListGrowthRate: number;
  scenarioConservative: number;
  scenarioModerate: number;
  scenarioAggressive: number;
}

interface AdvancedReportProps {
  report: AdvancedReport;
  phone?: string;
  userName?: string;
  userEmail?: string;
  website?: string;
  onRestart: () => void;
  investmentData?: InvestmentData;
  isAdminMode?: boolean;
}

const formatCurrency = (value: number) => `€${Math.round(value).toLocaleString('it-IT')}`;

const getScoreColor = (score: number) => {
  if (score >= 80) return '#2ecc71';
  if (score >= 60) return '#f1c40f';
  if (score >= 40) return '#e67e22';
  return '#ff3b3b';
};

const getDimensionScore = (report: AdvancedReport) => {
  const benchmarkShare = report.sectorBenchmark.emailShare;
  const emailRevScore = Math.min(100, (report.currentEmailPercent / benchmarkShare) * 100);
  const flowScore = report.automationCoverage;
  // Crescita lista: misurata da una risposta reale del quiz (popup attivo o no),
  // a differenza della vecchia "Segmentazione" che era derivata e non misurabile.
  const listGrowthScore = report.popupData === undefined ? 40 : report.popupData.hasPopup ? 75 : 20;
  const freqScore = report.listForecast ? Math.min(100, (report.listForecast.sendsPerMonth / 20) * 100) : 0;
  const toolScore = Math.min(100, (report.activeFlowsCount / report.totalFlowsCount) * 100);
  return [
    { label: 'Email Revenue', score: Math.round(emailRevScore), color: emailRevScore >= 60 ? '#2ecc71' : emailRevScore >= 40 ? '#e67e22' : '#ff3b3b' },
    { label: 'Flussi Automazione', score: Math.round(flowScore), color: flowScore >= 60 ? '#2ecc71' : flowScore >= 40 ? '#e67e22' : '#ff3b3b' },
    { label: 'Crescita Lista', score: Math.round(listGrowthScore), color: listGrowthScore >= 60 ? '#2ecc71' : listGrowthScore >= 40 ? '#e67e22' : '#ff3b3b' },
    { label: 'Frequenza Invio', score: Math.round(freqScore), color: freqScore >= 60 ? '#2ecc71' : freqScore >= 40 ? '#e67e22' : '#ff3b3b' },
    { label: 'Setup & Tool', score: Math.round(toolScore), color: toolScore >= 60 ? '#2ecc71' : toolScore >= 40 ? '#e67e22' : '#ff3b3b' },
  ];
};

export const AdvancedReportComponent: React.FC<AdvancedReportProps> = ({
  report,
  phone = '',
  userName = '',
  userEmail = '',
  website = '',
  onRestart,
  investmentData,
  isAdminMode = false,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [customSends, setCustomSends] = useState<number>(
    report.listForecast ? report.listForecast.sendsPerMonth : 4
  );

  // ── Stato pannello "Simula modifiche" ────────────────────────────────────
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [simulatedReport, setSimulatedReport] = useState<AdvancedReport | null>(null);
  const [simInputs, setSimInputs] = useState<SimInputs>({
    monthlyRevenue: report.monthlyRevenue,
    emailPct: report.currentEmailPercent,
    listSize: report.listSize,
    activeFlows: Object.keys(flowImpact).filter(k =>
      !report.missingFlows.find(f => f.key === k)
    ),
    aov: report.listForecast?.isCustomAov ? String(report.listForecast.sectorAOV) : '',
    emailFrequency: report.listForecast ? 
      (() => {
        const s = report.listForecast.sendsPerMonth;
        if (s === 0) return 'none';
        if (s <= 8) return '1-2';
        if (s <= 16) return '3-4';
        if (s <= 28) return '5-7';
        return 'daily+';
      })() : 'none',
    hasPopup: report.popupData?.hasPopup || false,
    popupConversionRate: report.popupData?.conversionRate || 3,
    monthlyVisitors: report.popupData?.monthlyVisitors || 0,
    monthlyListGrowthRate: report.popupData?.monthlyListGrowthRate || 2,
    scenarioConservative: report.scenarios.conservative.growthPercent,
    scenarioModerate: report.scenarios.moderate.growthPercent,
    scenarioAggressive: report.scenarios.aggressive.growthPercent,
  });

  const activeReport = simulatedReport ?? report;

  const handleSimulate = () => {
    const aovNum = simInputs.aov ? parseFloat(simInputs.aov) : undefined;
    const popupParams = simInputs.hasPopup ? {
      hasPopup: true,
      conversionRate: simInputs.popupConversionRate,
      monthlyVisitors: simInputs.monthlyVisitors,
      monthlyListGrowthRate: simInputs.monthlyListGrowthRate,
    } : { hasPopup: false, conversionRate: 0, monthlyVisitors: 0, monthlyListGrowthRate: 0 };

    const SECTOR_LABEL_MAP: Record<string, string> = {
      'Beauty & Personal Care': 'beauty',
      'Abbigliamento & Accessori': 'fashion',
      'Food & Beverage': 'food',
      'Prodotti Digitali': 'digital',
      'Gioielli': 'jewelry',
      'Casa & Arredamento': 'home',
      'Salute & Integrazione': 'health',
      'Altro Settore': 'other',
    };
    const sectorKey = SECTOR_LABEL_MAP[report.sectorBenchmark.label] ?? 'other';

    const result = calculateAdvancedReportFromValues(
      sectorKey, simInputs.monthlyRevenue, simInputs.emailPct, simInputs.listSize,
      simInputs.activeFlows, undefined, simInputs.emailFrequency, aovNum,
      { conservative: simInputs.scenarioConservative, moderate: simInputs.scenarioModerate, aggressive: simInputs.scenarioAggressive },
      popupParams,
    );
    setSimulatedReport(result);
    setCustomSends(result.listForecast?.sendsPerMonth ?? 4);
  };

  const handleResetSimulation = () => {
    setSimulatedReport(null);
    setSimInputs({
      monthlyRevenue: report.monthlyRevenue,
      emailPct: report.currentEmailPercent,
      listSize: report.listSize,
      activeFlows: Object.keys(flowImpact).filter(k => !report.missingFlows.find(f => f.key === k)),
      aov: report.listForecast?.isCustomAov ? String(report.listForecast.sectorAOV) : '',
      emailFrequency: report.listForecast ?
        (() => { const s = report.listForecast.sendsPerMonth; if (s === 0) return 'none'; if (s <= 8) return '1-2'; if (s <= 16) return '3-4'; if (s <= 28) return '5-7'; return 'daily+'; })() : 'none',
      hasPopup: report.popupData?.hasPopup || false,
      popupConversionRate: report.popupData?.conversionRate || 3,
      monthlyVisitors: report.popupData?.monthlyVisitors || 0,
      monthlyListGrowthRate: report.popupData?.monthlyListGrowthRate || 2,
      scenarioConservative: report.scenarios.conservative.growthPercent,
      scenarioModerate: report.scenarios.moderate.growthPercent,
      scenarioAggressive: report.scenarios.aggressive.growthPercent,
    });
    setCustomSends(report.listForecast?.sendsPerMonth ?? 4);
  };

  // ── Stati locali fee ─────────────
  const [setupFee, setSetupFee] = useState<string>('');
  const [monthlyFixed, setMonthlyFixed] = useState<string>('');
  const [monthlyPercent, setMonthlyPercent] = useState<string>('');

  // ── Ricalcolo con invii personalizzati ────────────────────
  const liveAov = activeReport.listForecast?.sectorAOV ?? 0;
  const liveListSize = activeReport.listForecast?.listSize ?? 0;
  const REACH_RATE = 0.30;
  const liveNewsletterRev = liveAov * (liveListSize * REACH_RATE * customSends * 0.002);
  const liveAutomationRev = activeReport.listForecast?.current.automationRevenue ?? 0;
  const liveTotal = liveNewsletterRev + liveAutomationRev;
  const liveOrders = Math.round(liveListSize * REACH_RATE * customSends * 0.002);

  // ── Calcoli ROI investimento ────────────────────
  const showInvestment = investmentData?.show === true;
  const emailRevenueNetVAT = activeReport.benchmarkEmailRevenue / 1.22;
  const setupFeeN = parseFloat(setupFee) || 0;
  const monthlyFixedN = parseFloat(monthlyFixed) || 0;
  const monthlyPercentN = parseFloat(monthlyPercent) || 0;
  const monthlyPercentFee = emailRevenueNetVAT * (monthlyPercentN / 100);
  const totalMonthlyFee = monthlyFixedN + monthlyPercentFee;
  const annualRevAdded = activeReport.yearlyPotential;
  const annualCostY1 = setupFeeN + totalMonthlyFee * 12;
  const annualCostY2 = totalMonthlyFee * 12;
  const annualCostY3 = totalMonthlyFee * 12;
  const netRoiY1 = annualRevAdded - annualCostY1;
  const netRoiY2 = annualRevAdded - annualCostY2;
  const netRoiY3 = annualRevAdded - annualCostY3;
  const roiPctY1 = annualCostY1 > 0 ? netRoiY1 / annualCostY1 * 100 : 0;
  const roiPctY2 = annualCostY2 > 0 ? netRoiY2 / annualCostY2 * 100 : 0;
  const roiPctY3 = annualCostY3 > 0 ? netRoiY3 / annualCostY3 * 100 : 0;
  const monthlyNetGain = annualRevAdded / 12 - totalMonthlyFee;
  const breakEvenMonths = setupFeeN > 0 && monthlyNetGain > 0 ? Math.ceil(setupFeeN / monthlyNetGain) : null;

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try { await generatePdfReport(activeReport, userName, userEmail, website); }
    catch (error) { console.error('Error generating PDF:', error); }
    finally { setIsDownloading(false); }
  };

  const r = activeReport;
  const dimensions = getDimensionScore(r);
  const ALL_FLOWS = Object.entries(flowImpact).map(([key, val]) => ({ key, label: val.label }));

  // Derive strengths and weaknesses from report data
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (r.currentEmailPercent >= 20) strengths.push(`Revenue email al ${r.currentEmailPercent}% — sopra la media di partenza`);
  if (r.activeFlowsCount >= 4) strengths.push(`${r.activeFlowsCount} automazioni attive — buona copertura`);
  if (r.listForecast && r.listForecast.sendsPerMonth >= 8) strengths.push(`Frequenza invio costante (${r.listForecast.sendsPerMonth} email/mese)`);
  if (r.popupData?.hasPopup) strengths.push(`Popup opt-in attivo — acquisizione lista automatica`);
  if (strengths.length === 0) strengths.push('Base dati presente per iniziare l\'ottimizzazione');

  if (r.currentEmailPercent < r.sectorBenchmark.emailShare) weaknesses.push(`Solo ${r.currentEmailPercent}% del fatturato da email (benchmark ${r.sectorBenchmark.label}: ${r.sectorBenchmark.emailShare}%)`);
  if (r.activeFlowsCount < 4) weaknesses.push(`Solo ${r.activeFlowsCount}/${r.totalFlowsCount} automazioni attive`);
  if (r.missingFlows.length > 0) weaknesses.push(`${r.missingFlows.length} flussi mancanti = ${formatCurrency(r.totalFlowGap)}/mese persi`);
  if (r.listForecast && r.listForecast.sendsPerMonth < 8) weaknesses.push(`Frequenza invio bassa (${r.listForecast.sendsPerMonth}/mese)`);
  if (!r.popupData?.hasPopup) weaknesses.push('Nessun popup opt-in — crescita lista lenta');

  return (
    <div className="min-h-screen relative" style={{ background: '#121d2b', fontFamily: "'Syne', sans-serif" }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        .font-bebas { font-family: 'Bebas Neue', sans-serif; }
        .font-syne { font-family: 'Syne', sans-serif; }
        .font-mono-dm { font-family: 'DM Mono', monospace; }
      `}</style>

      {/* ── Banner simulazione attiva ─────────────────────── */}
      {simulatedReport && (
        <div className="fixed top-0 left-0 right-0 z-40 px-4 py-2 flex items-center justify-between gap-3" style={{ background: 'rgba(124,58,237,0.95)', borderBottom: '1px solid rgba(167,139,250,0.5)' }}>
          <div className="flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4 animate-pulse" style={{ color: '#c4b5fd' }} />
            <span className="font-semibold" style={{ color: '#e9d5ff' }}>Simulazione attiva</span>
            <span className="text-xs" style={{ color: '#a78bfa' }}>— dati simulati, non salvati</span>
          </div>
          <button onClick={handleResetSimulation} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg transition-all" style={{ background: 'rgba(109,40,217,0.6)', border: '1px solid rgba(167,139,250,0.4)', color: '#e9d5ff' }}>
            <RotateCcw className="w-3 h-3" />
            Ripristina originale
          </button>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-6" style={{ paddingTop: simulatedReport ? '64px' : '32px' }}>

        {/* ═══ 1. HEADER PROFILO ═══ */}
        <div className="text-center space-y-3">
          <span className="font-mono-dm text-xs tracking-widest px-3 py-1 rounded-full" style={{ background: 'rgba(250,180,80,0.15)', color: '#FAB450', border: '1px solid rgba(250,180,80,0.3)' }}>
            ANALISI COMPLETATA
          </span>
          <h1 className="font-bebas text-4xl md:text-5xl tracking-wide" style={{ color: '#ffffff' }}>
            {userName || 'Il tuo'} Report Email Marketing
          </h1>
          <p className="font-mono-dm text-sm" style={{ color: '#666' }}>
            Settore: <span style={{ color: '#FAB450' }}>{r.sectorBenchmark.label}</span>
            {website && (
              <> · <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" style={{ color: '#FAB450' }} className="hover:underline">{website.replace(/^https?:\/\//, '')}</a></>
            )}
          </p>
        </div>

        {/* ═══ 2. REVENUE LEAK HERO ═══ */}
        <div className="rounded-2xl p-6 md:p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(255,59,59,0.15), rgba(255,59,59,0.05))', border: '1px solid rgba(255,59,59,0.3)' }}>
          <p className="font-mono-dm text-xs tracking-widest mb-2" style={{ color: '#ff3b3b' }}>REVENUE LEAK MENSILE</p>
          <p className="font-bebas text-5xl md:text-7xl" style={{ color: '#ff3b3b' }}>
            -{formatCurrency(r.revenueGap)}
          </p>
          <p className="font-mono-dm text-sm mt-2" style={{ color: '#ff6b6b' }}>
            {formatCurrency(r.revenueGap * 12)}/anno di fatturato non catturato
          </p>
          {/* CTA intermedia sul picco emotivo: la CTA finale arriva dopo 12 sezioni di scroll */}
          <a href="#booking" className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 rounded-full font-syne font-semibold text-sm transition-all hover:scale-105" style={{ background: '#FAB450', color: '#121d2b' }}>
            Scopri come recuperarli <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* ═══ 3. SCORE COMPLESSIVO ═══ */}
        <div className="rounded-2xl p-6" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Score circle */}
            <div className="relative w-36 h-36 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="56" stroke="#2a3a52" strokeWidth="10" fill="none" />
                <circle cx="64" cy="64" r="56" stroke={getScoreColor(r.emailHealthScore)} strokeWidth="10" fill="none"
                  strokeDasharray={`${r.emailHealthScore * 3.52} 352`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-bebas text-4xl" style={{ color: '#ffffff' }}>{r.emailHealthScore}</span>
                <span className="font-mono-dm text-xs" style={{ color: '#666' }}>/100</span>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-syne text-xl font-bold mb-1" style={{ color: '#ffffff' }}>Email Health Score</h2>
              <p className="text-sm" style={{ color: '#888' }}>
                {r.emailHealthScore >= 80 && "Eccellente! Stai sfruttando bene l'email marketing."}
                {r.emailHealthScore >= 60 && r.emailHealthScore < 80 && "Buono, ma c'è margine di miglioramento significativo."}
                {r.emailHealthScore >= 40 && r.emailHealthScore < 60 && "Discreto. Hai opportunità importanti da cogliere."}
                {r.emailHealthScore < 40 && "Critico. Stai perdendo molto potenziale economico."}
              </p>
            </div>
          </div>

          {/* 5 dimension bars */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mt-6">
            {dimensions.map((d) => (
              <div key={d.label} className="rounded-xl p-3" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                <p className="font-mono-dm text-[10px] tracking-wider mb-2" style={{ color: '#888' }}>{d.label.toUpperCase()}</p>
                <p className="font-bebas text-2xl mb-1" style={{ color: d.color }}>{d.score}</p>
                <div className="w-full h-1.5 rounded-full" style={{ background: '#2a3a52' }}>
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${d.score}%`, background: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 4. SITUAZIONE ATTUALE VS BENCHMARK ═══ */}
        <div className="rounded-2xl p-6" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
          <h2 className="font-bebas text-2xl tracking-wide mb-5" style={{ color: '#ffffff' }}>SITUAZIONE ATTUALE VS BENCHMARK</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl p-4" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
              <p className="font-mono-dm text-[10px] tracking-wider" style={{ color: '#666' }}>FATTURATO MENSILE</p>
              <p className="font-bebas text-2xl mt-1" style={{ color: '#ffffff' }}>{formatCurrency(r.monthlyRevenue)}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
              <p className="font-mono-dm text-[10px] tracking-wider" style={{ color: '#666' }}>EMAIL ATTUALE</p>
              <p className="font-bebas text-2xl mt-1" style={{ color: '#e67e22' }}>{formatCurrency(r.currentEmailRevenue)}</p>
              <p className="font-mono-dm text-[10px]" style={{ color: '#666' }}>{r.currentEmailPercent}% del totale</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(250,180,80,0.05)', border: '1px solid rgba(250,180,80,0.2)' }}>
              <p className="font-mono-dm text-[10px] tracking-wider" style={{ color: '#FAB450' }}>BENCHMARK {r.sectorBenchmark.emailShare}%</p>
              <p className="font-bebas text-2xl mt-1" style={{ color: '#FAB450' }}>{formatCurrency(r.benchmarkEmailRevenue)}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,59,59,0.05)', border: '1px solid rgba(255,59,59,0.2)' }}>
              <p className="font-mono-dm text-[10px] tracking-wider" style={{ color: '#ff3b3b' }}>GAP MENSILE</p>
              <p className="font-bebas text-2xl mt-1" style={{ color: '#ff3b3b' }}>{formatCurrency(r.revenueGap)}</p>
            </div>
          </div>
          {/* Gauge bar */}
          <div className="mt-5 space-y-2">
            <div className="flex justify-between font-mono-dm text-[10px]">
              <span style={{ color: '#888' }}>Il tuo risultato ({r.currentEmailPercent}%)</span>
              <span style={{ color: '#FAB450' }}>Benchmark ({r.sectorBenchmark.emailShare}%)</span>
            </div>
            <div className="relative h-3 rounded-full overflow-hidden" style={{ background: '#2a3a52' }}>
              <div className="absolute h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, r.currentEmailPercent / r.sectorBenchmark.emailShare * 100)}%`, background: 'linear-gradient(90deg, #ff3b3b, #e67e22, #FAB450)' }} />
            </div>
          </div>
        </div>

        {/* ═══ 5. COSA FUNZIONA ═══ */}
        <div className="rounded-2xl p-6" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
          <h2 className="font-bebas text-2xl tracking-wide mb-4 flex items-center gap-2" style={{ color: '#2ecc71' }}>
            <CheckCircle className="w-5 h-5" /> COSA FUNZIONA
          </h2>
          <div className="space-y-2">
            {strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'rgba(46,204,113,0.05)', border: '1px solid rgba(46,204,113,0.15)' }}>
                <span className="font-bebas text-lg flex-shrink-0" style={{ color: '#2ecc71' }}>0{i + 1}</span>
                <p className="text-sm" style={{ color: '#ccc' }}>{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 6. DOVE SI TROVA IL BLOCCO ═══ */}
        <div className="rounded-2xl p-6" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
          <h2 className="font-bebas text-2xl tracking-wide mb-4 flex items-center gap-2" style={{ color: '#ff3b3b' }}>
            <AlertTriangle className="w-5 h-5" /> DOVE STAI PERDENDO SOLDI
          </h2>
          <div className="space-y-2">
            {weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'rgba(255,59,59,0.05)', border: '1px solid rgba(255,59,59,0.15)' }}>
                <span className="font-bebas text-lg flex-shrink-0" style={{ color: '#ff3b3b' }}>0{i + 1}</span>
                <p className="text-sm" style={{ color: '#ccc' }}>{w}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 7. ANALISI AUTOMAZIONI ═══ */}
        <div className="rounded-2xl p-6" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bebas text-2xl tracking-wide" style={{ color: '#ffffff' }}>ANALISI AUTOMAZIONI</h2>
            <span className="font-mono-dm text-xs px-3 py-1 rounded-full" style={{ background: r.automationCoverage >= 60 ? 'rgba(46,204,113,0.15)' : 'rgba(255,59,59,0.15)', color: r.automationCoverage >= 60 ? '#2ecc71' : '#ff3b3b', border: `1px solid ${r.automationCoverage >= 60 ? 'rgba(46,204,113,0.3)' : 'rgba(255,59,59,0.3)'}` }}>
              {r.activeFlowsCount}/{r.totalFlowsCount} ATTIVI
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <div className="rounded-xl p-4" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
              <p className="font-mono-dm text-[10px] tracking-wider" style={{ color: '#888' }}>COPERTURA</p>
              <p className="font-bebas text-3xl" style={{ color: '#ffffff' }}>{Math.round(r.automationCoverage)}%</p>
              <div className="w-full h-1.5 rounded-full mt-2" style={{ background: '#2a3a52' }}>
                <div className="h-full rounded-full" style={{ width: `${r.automationCoverage}%`, background: '#FAB450' }} />
              </div>
            </div>
            <div className="rounded-xl p-4" style={{ background: 'rgba(250,180,80,0.05)', border: '1px solid rgba(250,180,80,0.2)' }}>
              <p className="font-mono-dm text-[10px] tracking-wider" style={{ color: '#FAB450' }}>POTENZIALE MANCANTE</p>
              <p className="font-bebas text-3xl" style={{ color: '#FAB450' }}>{formatCurrency(r.totalFlowGap)}<span className="font-mono-dm text-xs" style={{ color: '#888' }}>/mese</span></p>
            </div>
          </div>

          {/* Flow list */}
          {r.missingFlows.length > 0 && (
            <div className="space-y-2">
              {r.missingFlows.map((flow) => (
                <div key={flow.key} className="flex items-center justify-between rounded-xl p-3" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-dm text-[10px] px-2 py-0.5 rounded" style={{
                      background: flow.priority === 1 ? 'rgba(255,59,59,0.15)' : flow.priority === 2 ? 'rgba(230,126,34,0.15)' : 'rgba(136,136,136,0.15)',
                      color: flow.priority === 1 ? '#ff3b3b' : flow.priority === 2 ? '#e67e22' : '#888',
                    }}>P{flow.priority}</span>
                    <div>
                      <p className="font-syne text-sm font-semibold" style={{ color: '#fff' }}>{flow.label}</p>
                      <p className="font-mono-dm text-[10px]" style={{ color: '#666' }}>{flow.description}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bebas text-lg" style={{ color: '#FAB450' }}>+{formatCurrency(flow.impactValue)}</p>
                    <p className="font-mono-dm text-[10px]" style={{ color: '#666' }}>{flow.implementationTime}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ 8. SCENARI DI CRESCITA ═══ */}
        <div className="rounded-2xl p-6" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
          <h2 className="font-bebas text-2xl tracking-wide mb-1" style={{ color: '#ffffff' }}>SCENARI DI CRESCITA</h2>
          <p className="font-mono-dm text-[10px] mb-5" style={{ color: '#666' }}>Incremento stimato sul fatturato e-commerce totale</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Conservative */}
            <div className="rounded-xl p-5" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
              <p className="font-mono-dm text-[10px] tracking-wider mb-1" style={{ color: '#2ecc71' }}>CONSERVATIVO</p>
              <p className="font-bebas text-4xl" style={{ color: '#ffffff' }}>+{r.scenarios.conservative.growthPercent}%</p>
              <p className="font-bebas text-xl mt-1" style={{ color: '#2ecc71' }}>{formatCurrency(r.scenarios.conservative.value)}<span className="font-mono-dm text-[10px]" style={{ color: '#666' }}>/mese</span></p>
              <p className="font-mono-dm text-[10px] mt-2" style={{ color: '#666' }}>{r.scenarios.conservative.description}</p>
            </div>

            {/* Moderate - recommended */}
            <div className="rounded-xl p-5 relative" style={{ background: 'rgba(250,180,80,0.05)', border: '2px solid #FAB450' }}>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 font-mono-dm text-[10px] px-3 py-0.5 rounded-full" style={{ background: '#FAB450', color: '#121d2b' }}>CONSIGLIATO</span>
              <p className="font-mono-dm text-[10px] tracking-wider mb-1 mt-1" style={{ color: '#FAB450' }}>MODERATO</p>
              <p className="font-bebas text-4xl" style={{ color: '#ffffff' }}>+{r.scenarios.moderate.growthPercent}%</p>
              <p className="font-bebas text-xl mt-1" style={{ color: '#FAB450' }}>{formatCurrency(r.scenarios.moderate.value)}<span className="font-mono-dm text-[10px]" style={{ color: '#888' }}>/mese</span></p>
              <p className="font-mono-dm text-[10px] mt-2" style={{ color: '#888' }}>{r.scenarios.moderate.description}</p>
            </div>

            {/* Aggressive */}
            <div className="rounded-xl p-5" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
              <p className="font-mono-dm text-[10px] tracking-wider mb-1" style={{ color: '#a78bfa' }}>AGGRESSIVO</p>
              <p className="font-bebas text-4xl" style={{ color: '#ffffff' }}>+{r.scenarios.aggressive.growthPercent}%</p>
              <p className="font-bebas text-xl mt-1" style={{ color: '#a78bfa' }}>{formatCurrency(r.scenarios.aggressive.value)}<span className="font-mono-dm text-[10px]" style={{ color: '#666' }}>/mese</span></p>
              <p className="font-mono-dm text-[10px] mt-2" style={{ color: '#666' }}>{r.scenarios.aggressive.description}</p>
            </div>
          </div>
        </div>

        {/* ═══ 9. ROADMAP 3 AZIONI ═══ */}
        <div className="rounded-2xl p-6" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
          <h2 className="font-bebas text-2xl tracking-wide mb-5" style={{ color: '#ffffff' }}>ROADMAP: 3 AZIONI PRIORITARIE</h2>
          <div className="space-y-3">
            {r.topActions.map((action, i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl p-4" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bebas text-xl flex-shrink-0" style={{ background: '#FAB450', color: '#121d2b' }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-syne text-sm font-semibold" style={{ color: '#fff' }}>{action.action}</p>
                  <p className="font-mono-dm text-[10px]" style={{ color: '#666' }}>{action.timeframe} · Difficoltà: {action.difficulty}</p>
                </div>
                <p className="font-bebas text-xl flex-shrink-0" style={{ color: '#2ecc71' }}>{action.roi}</p>
              </div>
            ))}
          </div>
        </div>

        {/*
          CASO STUDIO rimosso: i numeri erano generati dal fatturato del prospect
          (monthlyRevenue × 0.8 → × 1.35), non da risultati reali. Reintrodurre solo
          con 2-3 case study verificabili hardcoded per settore (vedi roadmap KB).
        */}

        {/* ═══ 11. POTENZIALE ANNUALE ═══ */}
        <div className="rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(250,180,80,0.1), rgba(250,180,80,0.02))', border: '2px solid rgba(250,180,80,0.3)' }}>
          <p className="font-mono-dm text-xs tracking-widest mb-2" style={{ color: '#FAB450' }}>POTENZIALE ECONOMICO ANNUO</p>
          <p className="font-bebas text-5xl md:text-7xl" style={{ color: '#FAB450' }}>{formatCurrency(r.yearlyPotential)}</p>
          <p className="font-mono-dm text-xs mt-2" style={{ color: '#888' }}>
            Scenario moderato: {formatCurrency(r.scenarios.moderate.value)}/mese × 12
          </p>
        </div>

        {/* ═══ 12. SLIDER FORECAST ═══ */}
        {r.listForecast && (
          <div className="rounded-2xl p-6" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
            <h2 className="font-bebas text-2xl tracking-wide mb-5" style={{ color: '#ffffff' }}>FORECAST: IL POTENZIALE DELLA TUA LISTA</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="rounded-xl p-4 text-center" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                <p className="font-mono-dm text-[10px]" style={{ color: '#888' }}>LISTA ATTUALE</p>
                <p className="font-bebas text-2xl" style={{ color: '#fff' }}>{r.listForecast.listSize.toLocaleString('it-IT')}</p>
                <p className="font-mono-dm text-[10px]" style={{ color: '#666' }}>iscritti</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(250,180,80,0.05)', border: '1px solid rgba(250,180,80,0.2)' }}>
                <p className="font-mono-dm text-[10px] mb-1" style={{ color: '#FAB450' }}>INVII/MESE</p>
                <p className="font-bebas text-3xl" style={{ color: '#fff' }}>{customSends}</p>
                <div className="px-2 mt-2">
                  <Slider min={0} max={30} step={1} value={[customSends]} onValueChange={(v) => setCustomSends(v[0])} className="w-full" />
                  <div className="flex justify-between font-mono-dm text-[10px] mt-1" style={{ color: '#666' }}><span>0</span><span>30</span></div>
                </div>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                <p className="font-mono-dm text-[10px]" style={{ color: '#888' }}>{r.listForecast.isCustomAov ? 'AOV REALE' : 'AOV STIMATO'}</p>
                <p className="font-bebas text-2xl" style={{ color: r.listForecast.isCustomAov ? '#2ecc71' : '#FAB450' }}>€{r.listForecast.sectorAOV}</p>
                <p className="font-mono-dm text-[10px]" style={{ color: '#666' }}>valore medio ordine</p>
              </div>
            </div>

            {/* Forecast table */}
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #2a3a52' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a3a52' }}>
                    <th className="text-left p-3 font-mono-dm text-[10px]" style={{ color: '#666' }}></th>
                    <th className="text-center p-3 font-mono-dm text-[10px]" style={{ color: '#FAB450', background: 'rgba(250,180,80,0.05)' }}>CORRENTE</th>
                    <th className="text-center p-3 font-mono-dm text-[10px]" style={{ color: '#e67e22', background: 'rgba(230,126,34,0.05)' }}>OTTIMIZZATO</th>
                    <th className="text-center p-3 font-mono-dm text-[10px]" style={{ color: '#2ecc71', background: 'rgba(46,204,113,0.05)' }}>BENCHMARK</th>
                  </tr>
                </thead>
                <tbody className="font-mono-dm text-xs">
                  {[
                    ['Invii/mese', customSends, r.listForecast.optimized.sends, r.listForecast.benchmark.sends],
                    ['Ordini stimati', liveOrders.toLocaleString('it-IT'), Math.round(r.listForecast.listSize * 0.30 * r.listForecast.optimized.sends * 0.002).toLocaleString('it-IT'), Math.round(r.listForecast.listSize * 0.30 * r.listForecast.benchmark.sends * 0.002).toLocaleString('it-IT')],
                    ['Rev. Newsletter', formatCurrency(liveNewsletterRev), formatCurrency(r.listForecast.optimized.newsletterRevenue), formatCurrency(r.listForecast.benchmark.newsletterRevenue)],
                    ['Rev. Automazioni', formatCurrency(liveAutomationRev), formatCurrency(r.listForecast.optimized.automationRevenue), formatCurrency(r.listForecast.benchmark.automationRevenue)],
                  ].map(([label, curr, opt, bench], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1a2942' }}>
                      <td className="p-3" style={{ color: '#888' }}>{label}</td>
                      <td className="p-3 text-center font-medium" style={{ color: '#FAB450', background: 'rgba(250,180,80,0.02)' }}>{curr}</td>
                      <td className="p-3 text-center" style={{ color: '#e67e22', background: 'rgba(230,126,34,0.02)' }}>{opt}</td>
                      <td className="p-3 text-center" style={{ color: '#2ecc71', background: 'rgba(46,204,113,0.02)' }}>{bench}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="p-3 font-syne font-bold text-sm" style={{ color: '#fff' }}>Totale</td>
                    <td className="p-3 text-center font-bold" style={{ color: '#FAB450', background: 'rgba(250,180,80,0.05)' }}>{formatCurrency(liveTotal)}</td>
                    <td className="p-3 text-center font-bold" style={{ color: '#e67e22', background: 'rgba(230,126,34,0.05)' }}>{formatCurrency(r.listForecast.optimized.total)}</td>
                    <td className="p-3 text-center font-bold" style={{ color: '#2ecc71', background: 'rgba(46,204,113,0.05)' }}>{formatCurrency(r.listForecast.benchmark.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="font-mono-dm text-[10px] mt-3" style={{ color: '#555' }}>
              Stima indicativa basata su CR 0.2% newsletter, CR dinamico automazioni, AOV {r.listForecast.isCustomAov ? 'reale' : 'benchmark'} {r.sectorBenchmark.label}.
            </p>
          </div>
        )}

        {/* ═══ POPUP & CRESCITA LISTA ═══ */}
        {r.popupData && r.popupData.hasPopup && (
          <div className="rounded-2xl p-6" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
            <h2 className="font-bebas text-2xl tracking-wide mb-5" style={{ color: '#ffffff' }}>POPUP & CRESCITA LISTA</h2>
            <p className="font-mono-dm text-[10px] mb-5" style={{ color: '#666' }}>Tasso conversione {r.popupData.conversionRate}% su {r.popupData.monthlyVisitors.toLocaleString('it-IT')} visitatori/mese</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(250,180,80,0.05)', border: '1px solid rgba(250,180,80,0.2)' }}>
                <p className="font-mono-dm text-[10px]" style={{ color: '#FAB450' }}>NUOVI ISCRITTI/MESE</p>
                <p className="font-bebas text-3xl" style={{ color: '#fff' }}>{r.popupData.newSubscribersPerMonth.toLocaleString('it-IT')}</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                <p className="font-mono-dm text-[10px]" style={{ color: '#888' }}>LISTA A 12 MESI</p>
                <p className="font-bebas text-3xl" style={{ color: '#fff' }}>{r.popupData.projectedListSize12m.toLocaleString('it-IT')}</p>
                <p className="font-mono-dm text-[10px]" style={{ color: '#666' }}>+{r.popupData.monthlyListGrowthRate}%/mese</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(46,204,113,0.05)', border: '1px solid rgba(46,204,113,0.15)' }}>
                <p className="font-mono-dm text-[10px]" style={{ color: '#2ecc71' }}>REVENUE 12 MESI</p>
                <p className="font-bebas text-3xl" style={{ color: '#2ecc71' }}>{formatCurrency(r.popupData.projectedRevenue12m)}</p>
                <div className="mt-2 pt-2 space-y-1 text-left" style={{ borderTop: '1px solid rgba(46,204,113,0.1)' }}>
                  <div className="flex justify-between font-mono-dm text-[10px]"><span style={{ color: '#666' }}>Welcome</span><span style={{ color: '#2ecc71' }}>{formatCurrency(r.popupData.revenueWelcome12m)}</span></div>
                  <div className="flex justify-between font-mono-dm text-[10px]"><span style={{ color: '#666' }}>Recuperi</span><span style={{ color: '#2ecc71' }}>{formatCurrency(r.popupData.revenueRecovery12m)}</span></div>
                  <div className="flex justify-between font-mono-dm text-[10px]"><span style={{ color: '#666' }}>Automazioni</span><span style={{ color: '#2ecc71' }}>{formatCurrency(r.popupData.revenueAutomation12m)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PROIEZIONE FATTURATO NEL TEMPO ═══ */}
        <div className="rounded-2xl p-6" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
          <h2 className="font-bebas text-2xl tracking-wide mb-1" style={{ color: '#ffffff' }}>PROIEZIONE FATTURATO NEL TEMPO</h2>
          <p className="font-mono-dm text-[10px] mb-5" style={{ color: '#666' }}>Scenario moderato +{r.scenarios.moderate.growthPercent}% sul fatturato e-commerce</p>

          {(() => {
            const totalRevenue = r.monthlyRevenue;
            const emailBase = r.currentEmailRevenue;
            const moderateGrowth = r.scenarios.moderate.value;
            const emailAt3m = emailBase + moderateGrowth * 0.4;
            const emailAt6m = emailBase + moderateGrowth * 0.75;
            const emailAt12m = emailBase + moderateGrowth;
            const nonEmailRevenue = totalRevenue - emailBase;
            const totalAt3m = nonEmailRevenue + emailAt3m;
            const totalAt6m = nonEmailRevenue + emailAt6m;
            const totalAt12m = nonEmailRevenue + emailAt12m;
            const growth3 = ((totalAt3m - totalRevenue) / totalRevenue * 100);
            const growth6 = ((totalAt6m - totalRevenue) / totalRevenue * 100);
            const growth12 = ((totalAt12m - totalRevenue) / totalRevenue * 100);

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl p-4 text-center" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                  <p className="font-mono-dm text-[10px]" style={{ color: '#888' }}>OGGI</p>
                  <p className="font-bebas text-2xl" style={{ color: '#fff' }}>{formatCurrency(totalRevenue)}</p>
                  <p className="font-mono-dm text-[10px]" style={{ color: '#666' }}>Email: {formatCurrency(emailBase)}</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                  <p className="font-mono-dm text-[10px]" style={{ color: '#FAB450' }}>3 MESI</p>
                  <p className="font-bebas text-2xl" style={{ color: '#fff' }}>{formatCurrency(totalAt3m)}</p>
                  <p className="font-mono-dm text-[10px]" style={{ color: '#2ecc71' }}>+{growth3.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                  <p className="font-mono-dm text-[10px]" style={{ color: '#e67e22' }}>6 MESI</p>
                  <p className="font-bebas text-2xl" style={{ color: '#fff' }}>{formatCurrency(totalAt6m)}</p>
                  <p className="font-mono-dm text-[10px]" style={{ color: '#2ecc71' }}>+{growth6.toFixed(1)}%</p>
                </div>
                <div className="rounded-xl p-4 text-center relative" style={{ background: 'rgba(250,180,80,0.05)', border: '2px solid rgba(250,180,80,0.3)' }}>
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 font-mono-dm text-[9px] px-2 py-0.5 rounded-full" style={{ background: '#FAB450', color: '#121d2b' }}>OBIETTIVO</span>
                  <p className="font-mono-dm text-[10px] mt-1" style={{ color: '#FAB450' }}>12 MESI</p>
                  <p className="font-bebas text-2xl" style={{ color: '#fff' }}>{formatCurrency(totalAt12m)}</p>
                  <p className="font-mono-dm text-[10px]" style={{ color: '#2ecc71' }}>+{growth12.toFixed(1)}%</p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ═══ INVESTIMENTO & ROI (admin only) ═══ */}
        {showInvestment && (
          <div className="rounded-2xl p-6" style={{ background: '#1a2942', border: '1px solid rgba(250,180,80,0.3)' }}>
            <h2 className="font-bebas text-2xl tracking-wide mb-1" style={{ color: '#FAB450' }}>INVESTIMENTO & ROI</h2>
            <p className="font-mono-dm text-[10px] mb-5" style={{ color: '#666' }}>Inserisci i costi del servizio per calcolare break-even e ROI</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div>
                <label className="block font-mono-dm text-[10px] mb-1.5" style={{ color: '#888' }}>SETUP UNA-TANTUM</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono-dm text-sm" style={{ color: '#666' }}>€</span>
                  <input type="number" placeholder="1500" min={0} value={setupFee} onChange={(e) => setSetupFee(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 pl-8 text-sm focus:outline-none" style={{ background: '#1a2942', border: '1px solid #2a3a52', color: '#fff' }} />
                </div>
              </div>
              <div>
                <label className="block font-mono-dm text-[10px] mb-1.5" style={{ color: '#888' }}>FEE FISSA MENSILE</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono-dm text-sm" style={{ color: '#666' }}>€</span>
                  <input type="number" placeholder="800" min={0} value={monthlyFixed} onChange={(e) => setMonthlyFixed(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 pl-8 text-sm focus:outline-none" style={{ background: '#1a2942', border: '1px solid #2a3a52', color: '#fff' }} />
                </div>
              </div>
              <div>
                <label className="block font-mono-dm text-[10px] mb-1.5" style={{ color: '#888' }}>COMMISSIONE % SU FATTURATO EMAIL NETTO IVA</label>
                <div className="relative">
                  <input type="number" placeholder="10" min={0} max={100} value={monthlyPercent} onChange={(e) => setMonthlyPercent(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none" style={{ background: '#1a2942', border: '1px solid #2a3a52', color: '#fff' }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono-dm text-sm" style={{ color: '#666' }}>%</span>
                </div>
                {monthlyPercentN > 0 && emailRevenueNetVAT > 0 && (
                  <p className="font-mono-dm text-[10px] mt-1" style={{ color: '#666' }}>= {formatCurrency(monthlyPercentFee)}/mese su {formatCurrency(emailRevenueNetVAT)} netto IVA</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="rounded-xl p-4 text-center" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                <p className="font-mono-dm text-[10px]" style={{ color: '#888' }}>SETUP</p>
                {setupFeeN > 0 ? <p className="font-bebas text-2xl" style={{ color: '#fff' }}>{formatCurrency(setupFeeN)}</p> : <p className="font-bebas text-xl" style={{ color: '#555' }}>—</p>}
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                <p className="font-mono-dm text-[10px]" style={{ color: '#888' }}>FEE MENSILE TOTALE</p>
                {totalMonthlyFee > 0 ? <p className="font-bebas text-2xl" style={{ color: '#FAB450' }}>{formatCurrency(totalMonthlyFee)}</p> : <p className="font-bebas text-xl" style={{ color: '#555' }}>—</p>}
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: breakEvenMonths ? 'rgba(46,204,113,0.05)' : setupFeeN > 0 ? 'rgba(255,59,59,0.05)' : '#1a2942', border: `1px solid ${breakEvenMonths ? 'rgba(46,204,113,0.2)' : setupFeeN > 0 ? 'rgba(255,59,59,0.2)' : '#2a3a52'}` }}>
                <p className="font-mono-dm text-[10px]" style={{ color: '#888' }}>BREAK-EVEN</p>
                {setupFeeN === 0 ? <p className="font-bebas text-xl" style={{ color: '#555' }}>—</p> :
                  breakEvenMonths ? <p className="font-bebas text-2xl" style={{ color: '#2ecc71' }}>{breakEvenMonths} mesi</p> :
                  <p className="font-bebas text-lg" style={{ color: '#ff3b3b' }}>Fee &gt; Revenue</p>}
              </div>
            </div>

            {/* ROI 3 anni table */}
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #2a3a52' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a3a52' }}>
                    <th className="text-left p-3 font-mono-dm text-[10px]" style={{ color: '#666' }}></th>
                    <th className="text-center p-3 font-mono-dm text-[10px]" style={{ color: '#fff' }}>ANNO 1</th>
                    <th className="text-center p-3 font-mono-dm text-[10px]" style={{ color: '#fff' }}>ANNO 2</th>
                    <th className="text-center p-3 font-mono-dm text-[10px]" style={{ color: '#fff' }}>ANNO 3</th>
                  </tr>
                </thead>
                <tbody className="font-mono-dm text-xs">
                  <tr style={{ borderBottom: '1px solid #1a2942' }}>
                    <td className="p-3" style={{ color: '#888' }}>Revenue aggiunto</td>
                    <td className="p-3 text-center" style={{ color: '#2ecc71' }}>{formatCurrency(annualRevAdded)}</td>
                    <td className="p-3 text-center" style={{ color: '#2ecc71' }}>{formatCurrency(annualRevAdded)}</td>
                    <td className="p-3 text-center" style={{ color: '#2ecc71' }}>{formatCurrency(annualRevAdded)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1a2942' }}>
                    <td className="p-3" style={{ color: '#888' }}>Costo servizio</td>
                    <td className="p-3 text-center" style={{ color: '#ff3b3b' }}>{formatCurrency(annualCostY1)}{setupFeeN > 0 && <span style={{ color: '#555' }}> (incl. setup)</span>}</td>
                    <td className="p-3 text-center" style={{ color: '#ff3b3b' }}>{formatCurrency(annualCostY2)}</td>
                    <td className="p-3 text-center" style={{ color: '#ff3b3b' }}>{formatCurrency(annualCostY3)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #1a2942' }}>
                    <td className="p-3 font-syne font-bold" style={{ color: '#fff' }}>ROI Netto</td>
                    <td className="p-3 text-center font-bold" style={{ color: netRoiY1 >= 0 ? '#FAB450' : '#ff3b3b' }}>{formatCurrency(netRoiY1)}</td>
                    <td className="p-3 text-center font-bold" style={{ color: netRoiY2 >= 0 ? '#FAB450' : '#ff3b3b' }}>{formatCurrency(netRoiY2)}</td>
                    <td className="p-3 text-center font-bold" style={{ color: netRoiY3 >= 0 ? '#FAB450' : '#ff3b3b' }}>{formatCurrency(netRoiY3)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-syne font-bold" style={{ color: '#fff' }}>ROI %</td>
                    <td className="p-3 text-center font-bold text-base" style={{ color: roiPctY1 >= 0 ? '#FAB450' : '#ff3b3b' }}>{roiPctY1 >= 0 ? '+' : ''}{Math.round(roiPctY1)}%</td>
                    <td className="p-3 text-center font-bold text-base" style={{ color: roiPctY2 >= 0 ? '#FAB450' : '#ff3b3b' }}>{roiPctY2 >= 0 ? '+' : ''}{Math.round(roiPctY2)}%</td>
                    <td className="p-3 text-center font-bold text-base" style={{ color: roiPctY3 >= 0 ? '#FAB450' : '#ff3b3b' }}>{roiPctY3 >= 0 ? '+' : ''}{Math.round(roiPctY3)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ 13. SOCIAL PROOF ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Numeri allineati al track record reale (KB Mailift) — difendibili in call */}
          {[
            { value: '5+', label: 'Anni nell\'ecosistema eCommerce', icon: <Users className="w-4 h-4" /> },
            { value: '€1M+', label: 'Revenue email generata per i clienti', icon: <TrendingUp className="w-4 h-4" /> },
            { value: '35x', label: 'ROI medio email (benchmark settore)', icon: <Zap className="w-4 h-4" /> },
            { value: '100%', label: 'Focus Shopify + Klaviyo', icon: <CheckCircle className="w-4 h-4" /> },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl p-4 text-center" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
              <div className="flex justify-center mb-2" style={{ color: '#FAB450' }}>{stat.icon}</div>
              <p className="font-bebas text-2xl" style={{ color: '#fff' }}>{stat.value}</p>
              <p className="font-mono-dm text-[10px]" style={{ color: '#666' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ═══ 14. CTA FINALE — CALENDARIO ═══ */}
        {/* Il download PDF è DOPO il booking: prima dava un'uscita gratuita pre-conversione */}
        <div id="booking" className="rounded-2xl p-6 md:p-8" style={{ background: '#1a2942', border: '2px solid rgba(250,180,80,0.3)' }}>
          <div className="text-center mb-6">
            {/* Scarcity statica rimossa: era sempre identica, un prospect di ritorno la smaschera */}
            <h3 className="font-bebas text-3xl md:text-4xl tracking-wide mt-3" style={{ color: '#ffffff' }}>
              PRENOTA LA TUA CONSULENZA GRATUITA
            </h3>
            <p className="font-syne text-sm mt-2 max-w-xl mx-auto" style={{ color: '#888' }}>
              Scopri come sbloccare {formatCurrency(r.yearlyPotential)}/anno con una sessione strategica di 30 minuti.
            </p>
          </div>

          <div className="rounded-xl overflow-hidden mb-6" style={{ background: '#fff' }}>
            <iframe
              src="https://go.mailift.com/widget/booking/3IIFrrczXhMvLYQAL4md"
              style={{ width: '100%', height: '700px', border: 'none' }}
              title="Prenota Consulenza Gratuita"
              loading="lazy"
            />
          </div>

          <div className="text-center">
            <Button onClick={onRestart} variant="outline" className="rounded-full font-mono-dm text-xs" style={{ borderColor: '#2a3a52', color: '#888', background: 'transparent' }}>
              Fai un'altra analisi
            </Button>
          </div>
        </div>

        {/* ═══ DOWNLOAD PDF (post-booking) ═══ */}
        <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
          <div>
            <h3 className="font-syne text-base font-bold" style={{ color: '#fff' }}>Scarica il tuo Report PDF</h3>
            <p className="font-mono-dm text-[10px]" style={{ color: '#666' }}>Salva per consultarlo quando vuoi</p>
          </div>
          <Button onClick={handleDownloadPdf} disabled={isDownloading} className="rounded-full px-6 py-2.5 font-syne font-semibold text-sm" style={{ background: '#FAB450', color: '#121d2b' }}>
            {isDownloading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generazione...</> : <><Download className="w-4 h-4 mr-2" />Scarica PDF</>}
          </Button>
        </div>

      </div>

      {/* ── Pulsante flottante "Simula" — SOLO admin: un lead che apre il
           simulatore vede che il report è parametrico e l'effetto analisi
           personalizzata svanisce ──────────────────── */}
      {isAdminMode && <button
        onClick={() => setShowSimPanel(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 font-syne"
        style={{ background: simulatedReport ? '#7c3aed' : '#1a2942', border: `2px solid ${simulatedReport ? '#a78bfa' : '#2a3a52'}`, color: simulatedReport ? '#e9d5ff' : '#888' }}
        title="Simula modifiche ai dati"
      >
        <Settings className="w-4 h-4" />
        {simulatedReport ? '✦ Sim. attiva' : 'Simula dati'}
      </button>}

      {/* ── Pannello laterale "Simula modifiche" (solo admin) ─────────────── */}
      {isAdminMode && showSimPanel && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowSimPanel(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col overflow-hidden" style={{ background: '#121d2b', borderLeft: '1px solid #2a3a52' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #2a3a52', background: '#111' }}>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" style={{ color: '#a78bfa' }} />
                <h3 className="font-syne font-bold text-base" style={{ color: '#fff' }}>Simula modifiche</h3>
                {simulatedReport && (
                  <span className="font-mono-dm text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.3)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.4)' }}>ATTIVA</span>
                )}
              </div>
              <button onClick={() => setShowSimPanel(false)} className="p-1 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#888' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Fatturato */}
              <div>
                <label className="block font-mono-dm text-[10px] tracking-wider mb-1.5" style={{ color: '#888' }}>FATTURATO MENSILE TOTALE</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono-dm text-sm" style={{ color: '#666' }}>€</span>
                  <input type="number" min={0} value={simInputs.monthlyRevenue}
                    onChange={e => setSimInputs(p => ({ ...p, monthlyRevenue: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg px-3 py-2 pl-8 text-sm focus:outline-none" style={{ background: '#1a2942', border: '1px solid #2a3a52', color: '#fff' }} />
                </div>
              </div>

              {/* % email */}
              <div>
                <label className="block font-mono-dm text-[10px] tracking-wider mb-1.5" style={{ color: '#888' }}>% FATTURATO DA EMAIL</label>
                <div className="flex items-center gap-3">
                  <Slider min={0} max={80} step={1} value={[simInputs.emailPct]} onValueChange={v => setSimInputs(p => ({ ...p, emailPct: v[0] }))} className="flex-1" />
                  <span className="font-bebas text-lg w-12 text-right" style={{ color: '#fff' }}>{simInputs.emailPct}%</span>
                </div>
              </div>

              {/* Lista */}
              <div>
                <label className="block font-mono-dm text-[10px] tracking-wider mb-1.5" style={{ color: '#888' }}>DIMENSIONE LISTA</label>
                <input type="number" min={0} value={simInputs.listSize}
                  onChange={e => setSimInputs(p => ({ ...p, listSize: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: '#1a2942', border: '1px solid #2a3a52', color: '#fff' }} />
              </div>

              {/* AOV */}
              <div>
                <label className="block font-mono-dm text-[10px] tracking-wider mb-1.5" style={{ color: '#888' }}>AOV PERSONALIZZATO</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono-dm text-sm" style={{ color: '#666' }}>€</span>
                  <input type="number" min={0} placeholder="benchmark" value={simInputs.aov}
                    onChange={e => setSimInputs(p => ({ ...p, aov: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 pl-8 text-sm focus:outline-none" style={{ background: '#1a2942', border: '1px solid #2a3a52', color: '#fff' }} />
                </div>
              </div>

              {/* Frequenza */}
              <div>
                <label className="block font-mono-dm text-[10px] tracking-wider mb-1.5" style={{ color: '#888' }}>FREQUENZA NEWSLETTER</label>
                <select value={simInputs.emailFrequency} onChange={e => setSimInputs(p => ({ ...p, emailFrequency: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: '#1a2942', border: '1px solid #2a3a52', color: '#fff' }}>
                  <option value="none">Nessuna (0/mese)</option>
                  <option value="1-2">1-2/settimana (~5/mese)</option>
                  <option value="3-4">3-4/settimana (~14/mese)</option>
                  <option value="5-7">5-7/settimana (~24/mese)</option>
                  <option value="daily+">Daily+ (~30/mese)</option>
                </select>
              </div>

              {/* Flussi */}
              <div>
                <label className="block font-mono-dm text-[10px] tracking-wider mb-2" style={{ color: '#888' }}>FLUSSI AUTOMAZIONE ATTIVI</label>
                <div className="grid grid-cols-1 gap-2">
                  {ALL_FLOWS.map(({ key, label }) => {
                    const isActive = simInputs.activeFlows.includes(key);
                    return (
                      <button key={key}
                        onClick={() => setSimInputs(p => ({ ...p, activeFlows: isActive ? p.activeFlows.filter(f => f !== key) : [...p.activeFlows, key] }))}
                        className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-all"
                        style={{ background: isActive ? 'rgba(124,58,237,0.15)' : '#1a2942', border: `1px solid ${isActive ? 'rgba(167,139,250,0.4)' : '#2a3a52'}`, color: isActive ? '#c4b5fd' : '#888' }}>
                        <span className="font-syne text-sm">{label}</span>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: isActive ? '#7c3aed' : '#2a3a52', color: isActive ? '#fff' : '#555' }}>
                          {isActive ? '✓' : '+'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scenari */}
              <div>
                <label className="block font-mono-dm text-[10px] tracking-wider mb-2" style={{ color: '#888' }}>SCENARI CRESCITA (%)</label>
                <div className="space-y-3">
                  {[
                    { label: 'Conservativo', key: 'scenarioConservative' as const, color: '#2ecc71', min: 5, max: 40 },
                    { label: 'Moderato', key: 'scenarioModerate' as const, color: '#FAB450', min: 10, max: 70 },
                    { label: 'Aggressivo', key: 'scenarioAggressive' as const, color: '#a78bfa', min: 20, max: 100 },
                  ].map(s => (
                    <div key={s.key}>
                      <div className="flex justify-between mb-1">
                        <span className="font-mono-dm text-[10px]" style={{ color: s.color }}>{s.label}</span>
                        <span className="font-bebas text-sm" style={{ color: '#fff' }}>{simInputs[s.key]}%</span>
                      </div>
                      <Slider min={s.min} max={s.max} step={1} value={[simInputs[s.key]]}
                        onValueChange={v => setSimInputs(p => ({ ...p, [s.key]: v[0] }))} className="w-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Popup */}
              <div>
                <label className="block font-mono-dm text-[10px] tracking-wider mb-2" style={{ color: '#888' }}>POPUP OPT-IN</label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#1a2942', border: '1px solid #2a3a52' }}>
                    <span className="font-syne text-sm" style={{ color: '#ccc' }}>Popup attivo</span>
                    <button onClick={() => setSimInputs(p => ({ ...p, hasPopup: !p.hasPopup }))}
                      className="w-10 h-5 rounded-full transition-all relative" style={{ background: simInputs.hasPopup ? '#7c3aed' : '#2a3a52' }}>
                      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: simInputs.hasPopup ? '20px' : '2px' }} />
                    </button>
                  </div>
                  {simInputs.hasPopup && (
                    <>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="font-mono-dm text-[10px]" style={{ color: '#888' }}>Conversione</span>
                          <span className="font-bebas text-sm" style={{ color: '#fff' }}>{simInputs.popupConversionRate}%</span>
                        </div>
                        <Slider min={0.5} max={15} step={0.5} value={[simInputs.popupConversionRate]}
                          onValueChange={v => setSimInputs(p => ({ ...p, popupConversionRate: v[0] }))} className="w-full" />
                      </div>
                      <div>
                        <label className="block font-mono-dm text-[10px] mb-1" style={{ color: '#888' }}>Visitatori/mese</label>
                        <input type="number" min={0} value={simInputs.monthlyVisitors}
                          onChange={e => setSimInputs(p => ({ ...p, monthlyVisitors: parseFloat(e.target.value) || 0 }))}
                          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: '#1a2942', border: '1px solid #2a3a52', color: '#fff' }} />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="font-mono-dm text-[10px]" style={{ color: '#888' }}>Crescita lista</span>
                          <span className="font-bebas text-sm" style={{ color: '#fff' }}>{simInputs.monthlyListGrowthRate}%</span>
                        </div>
                        <Slider min={0.5} max={20} step={0.5} value={[simInputs.monthlyListGrowthRate]}
                          onValueChange={v => setSimInputs(p => ({ ...p, monthlyListGrowthRate: v[0] }))} className="w-full" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid #2a3a52', background: '#111' }}>
              <Button onClick={() => { handleSimulate(); setShowSimPanel(false); }}
                className="w-full rounded-full font-syne font-semibold py-2.5" style={{ background: '#7c3aed', color: '#fff' }}>
                <RefreshCw className="w-4 h-4 mr-2" />Applica simulazione
              </Button>
              {simulatedReport && (
                <Button onClick={() => { handleResetSimulation(); setShowSimPanel(false); }} variant="outline"
                  className="w-full rounded-full font-mono-dm text-xs" style={{ borderColor: '#2a3a52', color: '#888', background: 'transparent' }}>
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
