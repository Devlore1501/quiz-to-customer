import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Download, Loader2, Settings, X, RotateCcw, RefreshCw } from 'lucide-react';
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
const getRatingColor = (rating: 'A' | 'B' | 'C' | 'D') => {
  switch (rating) {
    case 'A':
      return 'text-green-400 bg-green-400/20';
    case 'B':
      return 'text-yellow-400 bg-yellow-400/20';
    case 'C':
      return 'text-orange bg-orange/20';
    case 'D':
      return 'text-red-400 bg-red-400/20';
  }
};
const getScoreColor = (score: number) => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange';
  return 'bg-red-500';
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

  // Report attivo: simulato se presente, altrimenti originale
  const activeReport = simulatedReport ?? report;

  const handleSimulate = () => {
    const aovNum = simInputs.aov ? parseFloat(simInputs.aov) : undefined;
    const popupParams = simInputs.hasPopup ? {
      hasPopup: true,
      conversionRate: simInputs.popupConversionRate,
      monthlyVisitors: simInputs.monthlyVisitors,
      monthlyListGrowthRate: simInputs.monthlyListGrowthRate,
    } : { hasPopup: false, conversionRate: 0, monthlyVisitors: 0, monthlyListGrowthRate: 0 };

    // Deriva la chiave del settore dalla label del benchmark
    const SECTOR_LABEL_MAP: Record<string, string> = {
      'Beauty & Personal Care': 'beauty',
      'Abbigliamento': 'fashion',
      'Food & Beverage': 'food',
      'Prodotti Digitali': 'digital',
      'Gioielli': 'jewelry',
      'Articoli Casa': 'home',
      'Salute & Integrazione': 'health',
      'Altro Settore': 'other',
    };
    const sectorKey = SECTOR_LABEL_MAP[report.sectorBenchmark.label] ?? 'other';

    const result = calculateAdvancedReportFromValues(
      sectorKey,
      simInputs.monthlyRevenue,
      simInputs.emailPct,
      simInputs.listSize,
      simInputs.activeFlows,
      undefined,
      simInputs.emailFrequency,
      aovNum,
      {
        conservative: simInputs.scenarioConservative,
        moderate: simInputs.scenarioModerate,
        aggressive: simInputs.scenarioAggressive,
      },
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
    setCustomSends(report.listForecast?.sendsPerMonth ?? 4);
  };

  // ── Stati locali fee (form inline nella sezione investimento) ─────────────
  const [setupFee, setSetupFee] = useState<string>('');
  const [monthlyFixed, setMonthlyFixed] = useState<string>('');
  const [monthlyPercent, setMonthlyPercent] = useState<string>('');

  // ── Ricalcolo colonna Attuale con invii personalizzati ────────────────────
  const liveAov = activeReport.listForecast?.sectorAOV ?? 0;
  const liveListSize = activeReport.listForecast?.listSize ?? 0;
  const REACH_RATE = 0.30;
  const liveNewsletterRev = liveAov * (liveListSize * REACH_RATE * customSends * 0.002);
  const liveAutomationRev = activeReport.listForecast?.current.automationRevenue ?? 0;
  const liveTotal = liveNewsletterRev + liveAutomationRev;
  const liveOrders = Math.round(liveListSize * REACH_RATE * customSends * 0.002);

  // ── Calcoli ROI investimento (live dagli input locali) ────────────────────
  const showInvestment = investmentData?.show === true;
  // Base commissione = gap mensile netto IVA (ciò che Mailift porta, al netto del 22% IVA)
  const revenueGapNetVAT = activeReport.revenueGap / 1.22;
  const setupFeeN = parseFloat(setupFee) || 0;
  const monthlyFixedN = parseFloat(monthlyFixed) || 0;
  const monthlyPercentN = parseFloat(monthlyPercent) || 0;
  const monthlyPercentFee = revenueGapNetVAT * (monthlyPercentN / 100);
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
  const breakEvenMonths = setupFeeN > 0 && monthlyNetGain > 0 ?
  Math.ceil(setupFeeN / monthlyNetGain) :
  null;

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await generatePdfReport(activeReport, userName, userEmail, website);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Alias per template — usa il report simulato se presente, altrimenti quello originale
  const r = activeReport;

  // ── Pannello Simula: lista flussi disponibili ─────────────────────────────
  const ALL_FLOWS = Object.entries(flowImpact).map(([key, val]) => ({ key, label: val.label }));

  return <div className="min-h-screen bg-slate-50 py-8 px-4 relative">
      {/* ── Banner simulazione attiva ───────────────────────────────────────── */}
      {simulatedReport && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-purple-900/95 border-b border-purple-500/50 px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4 text-purple-300 animate-pulse" />
            <span className="text-purple-200 font-semibold">Simulazione attiva</span>
            <span className="text-purple-400 text-xs">— i dati mostrati sono simulati, non salvati</span>
          </div>
          <button
            onClick={handleResetSimulation}
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-purple-700/60 border border-purple-500/40 text-purple-200 hover:bg-purple-700 transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            Ripristina originale
          </button>
        </div>
      )}

      <div className="w-full max-w-5xl mx-auto space-y-8" style={{ paddingTop: simulatedReport ? '48px' : '0' }}>
        
        {/* Header */}
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-orange mb-3">
            📊 Il Tuo Report Email Marketing
          </h1>
          <p className="text-lg text-[#1d283a]">
            Analisi personalizzata per il settore <span className="text-orange font-semibold">{activeReport.sectorBenchmark.label}</span>
          </p>
          {website &&
        <p className="text-sm text-slate-500 mt-1">
              🌐{' '}
              <a
            href={website.startsWith('http') ? website : `https://${website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange hover:underline">

                {website.replace(/^https?:\/\//, '')}
              </a>
            </p>
        }
        </div>

        {/* Email Health Score */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{
        animationDelay: '100ms'
      }}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" className="text-slate-700" />
                <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" strokeDasharray={`${r.emailHealthScore * 3.52} 352`} className={getScoreColor(r.emailHealthScore)} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{r.emailHealthScore}</span>
              </div>
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold text-white mb-2">Email Health Score</h2>
              <p className="text-slate-400">
                {r.emailHealthScore >= 80 && "Eccellente! Stai sfruttando bene l'email marketing."}
                {r.emailHealthScore >= 60 && r.emailHealthScore < 80 && "Buono, ma c'è margine di miglioramento."}
                {r.emailHealthScore >= 40 && r.emailHealthScore < 60 && "Discreto. Hai opportunità significative da cogliere."}
                {r.emailHealthScore < 40 && "Critico. Stai perdendo molto potenziale economico."}
              </p>
            </div>
          </div>
        </div>

        {/* Sezione: Analisi Strategica */}
        {r.strategicAnalysis && <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{
        animationDelay: '150ms'
      }}>
            <h2 className="text-xl font-bold text-orange mb-6 flex items-center gap-2">
              📋 Analisi Strategica
            </h2>
            
            <div className="space-y-5">
              {/* Situazione Attuale */}
              <div className="bg-slate-700/30 p-4 rounded-lg border-l-4 border-slate-500">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="text-slate-400">📍</span> Situazione Attuale
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm">
                  {r.strategicAnalysis.currentSituation}
                </p>
              </div>
              
              {/* Situazione Desiderata */}
              <div className="bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="text-green-400">🎯</span> Situazione Desiderata
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm">
                  {r.strategicAnalysis.desiredSituation}
                </p>
              </div>
              
              {/* Potenziali Impedimenti */}
              <div className="bg-red-900/20 p-4 rounded-lg border-l-4 border-red-500">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="text-red-400">⚠️</span> Potenziali Impedimenti
                </h3>
                <ul className="space-y-2">
                  {r.strategicAnalysis.potentialObstacles.map((obstacle, i) => <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      {obstacle}
                    </li>)}
                </ul>
              </div>
            </div>
          </div>}

        {/* Sezione 1: Situazione Attuale vs Benchmark */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{
        animationDelay: '200ms'
      }}>
          <h2 className="text-xl font-bold text-orange mb-6 flex items-center gap-2">
            📈 Situazione Attuale vs Benchmark
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Fatturato Totale */}
            <div className="bg-slate-700/50 p-4 rounded-lg border-l-4 border-slate-500">
              <p className="text-slate-400 text-sm mb-1">Fatturato Mensile Totale</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(r.monthlyRevenue)}<span className="text-sm text-slate-400">/mese</span></p>
              <p className="text-slate-400 text-sm">{formatCurrency(r.monthlyRevenue * 12)}/anno</p>
            </div>
            {/* Fatturato Email Attuale */}
            <div className="bg-slate-700/50 p-4 rounded-lg border-l-4 border-orange/50">
              <p className="text-slate-400 text-sm mb-1">Fatturato da Email</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(r.currentEmailRevenue)}<span className="text-sm text-slate-400">/mese</span></p>
              <p className="text-slate-400 text-sm">{r.currentEmailPercent}% del fatturato totale</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-orange/20 to-orange/5 p-4 rounded-lg border border-orange/30">
              <p className="text-orange text-sm mb-1">Benchmark Settore</p>
              <p className="text-2xl font-bold text-orange">{formatCurrency(r.benchmarkEmailRevenue)}<span className="text-sm text-orange/70">/mese</span></p>
              <p className="text-orange/70 text-sm">35% del fatturato (standard di mercato)</p>
            </div>
            <div className="bg-gradient-to-br from-red-600/30 to-red-500/10 p-4 rounded-lg border border-red-500/30">
              <p className="text-red-300 text-sm mb-1">Gap Economico</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(r.revenueGap)}<span className="text-sm text-red-300">/mese</span></p>
              <p className="text-red-300 text-sm">{formatCurrency(r.revenueGap * 12)}/anno persi</p>
            </div>
          </div>

          {/* Progress bar visuale */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Il tuo risultato</span>
              <span className="text-slate-400">Benchmark {r.sectorBenchmark.label}</span>
            </div>
            <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
              <div className="absolute h-full bg-orange rounded-full transition-all duration-1000" style={{
              width: `${Math.min(100, r.currentEmailPercent / r.sectorBenchmark.emailShare * 100)}%`
            }} />
              <div className="absolute h-full w-1 bg-white top-0" style={{
              left: '100%',
              transform: 'translateX(-100%)'
            }} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white font-medium">{r.currentEmailPercent}%</span>
              <span className="text-orange font-medium">{r.sectorBenchmark.emailShare}%</span>
            </div>
          </div>
        </div>

        {/* Sezione 2: Automation Analysis */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{
        animationDelay: '300ms'
      }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-orange flex items-center gap-2">
              ⚙️ Analisi Automazioni
            </h2>
            <div className={`px-4 py-2 rounded-lg font-bold text-lg ${getRatingColor(r.automationRating)}`}>
              Rating: {r.automationRating}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Copertura automazioni */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-300">Copertura Automazioni</span>
                <span className="text-white font-medium">{r.activeFlowsCount}/{r.totalFlowsCount} flussi attivi</span>
              </div>
              <Progress value={r.automationCoverage} className="h-3" />
              <p className="text-slate-400 text-sm">
                {r.automationCoverage < 50 ? "⚠️ Stai perdendo vendite automatiche significative" : r.automationCoverage < 80 ? "📈 Buon punto di partenza, ma c'è ancora margine" : "✅ Ottima copertura delle automazioni!"}
              </p>
            </div>

            {/* Potenziale flussi mancanti */}
            <div className="bg-gradient-to-br from-orange/20 to-orange/5 p-4 rounded-lg border border-orange/30">
              <p className="text-orange text-sm mb-1">Potenziale Flussi Mancanti</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(r.totalFlowGap)}<span className="text-base text-slate-300">/mese</span></p>
              <p className="text-slate-300 text-sm mt-1">{formatCurrency(r.totalFlowGap * 12)}/anno recuperabili</p>
            </div>
          </div>

          {/* Lista flussi mancanti */}
          {r.missingFlows.length > 0 && <div className="mt-6">
              <h3 className="text-white font-semibold mb-3">Flussi Mancanti (ordinati per impatto):</h3>
              <div className="space-y-2">
                {r.missingFlows.slice(0, 4).map((flow, index) => <div key={flow.key} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg animate-fade-in" style={{
              animationDelay: `${400 + index * 100}ms`
            }}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${flow.priority === 1 ? 'bg-red-500/30 text-red-300' : flow.priority === 2 ? 'bg-yellow-500/30 text-yellow-300' : 'bg-slate-600 text-slate-300'}`}>
                        P{flow.priority}
                      </span>
                      <div>
                        <p className="text-white font-medium">{flow.label}</p>
                        <p className="text-slate-400 text-sm">{flow.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-orange font-bold">+{formatCurrency(flow.impactValue)}</p>
                      <p className="text-slate-400 text-xs">{flow.implementationTime}</p>
                    </div>
                  </div>)}
              </div>
            </div>}
        </div>

        {/* Sezione 3: I 3 Scenari di Crescita */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{
        animationDelay: '500ms'
      }}>
          <h2 className="text-xl font-bold text-orange mb-2 flex items-center gap-2">
            🚀 Scenari di Crescita
          </h2>
          <p className="text-slate-500 text-xs mb-6">I valori mostrano il <strong className="text-slate-400">recupero mensile aggiuntivo stimato</strong> sulla base del gap tra email attuale e benchmark (€{Math.round(r.revenueGap).toLocaleString('it-IT')}/mese).</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Conservativo */}
            <div className="bg-gradient-to-br from-green-600/20 to-green-500/5 p-5 rounded-xl border border-green-500/30 hover-scale">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <h3 className="text-green-400 font-semibold">Conservativo</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-1">+{r.scenarios.conservative.growthPercent}%</p>
              <p className="text-green-400/70 text-xs mb-3">del gap recuperato</p>
              <p className="text-2xl font-semibold text-green-400">{formatCurrency(r.scenarios.conservative.value)}<span className="text-sm">/mese</span></p>
              <p className="text-slate-400 text-sm mt-3">{r.scenarios.conservative.description}</p>
            </div>

            {/* Moderato */}
            <div className="bg-gradient-to-br from-orange/30 to-orange/10 p-5 rounded-xl border-2 border-orange hover-scale relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-orange text-white text-xs px-3 py-1 rounded-full font-semibold">CONSIGLIATO</span>
              </div>
              <div className="flex items-center gap-2 mb-3 mt-2">
                <span className="w-3 h-3 rounded-full bg-orange"></span>
                <h3 className="text-orange font-semibold">Moderato</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-1">+{r.scenarios.moderate.growthPercent}%</p>
              <p className="text-orange/70 text-xs mb-3">del gap recuperato</p>
              <p className="text-2xl font-semibold text-orange">{formatCurrency(r.scenarios.moderate.value)}<span className="text-sm">/mese</span></p>
              <p className="text-slate-400 text-sm mt-3">{r.scenarios.moderate.description}</p>
            </div>

            {/* Aggressivo */}
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/5 p-5 rounded-xl border border-purple-500/30 hover-scale">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <h3 className="text-purple-400 font-semibold">Aggressivo</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-1">+{r.scenarios.aggressive.growthPercent}%</p>
              <p className="text-purple-400/70 text-xs mb-3">del gap recuperato</p>
              <p className="text-2xl font-semibold text-purple-400">{formatCurrency(r.scenarios.aggressive.value)}<span className="text-sm">/mese</span></p>
              <p className="text-slate-400 text-sm mt-3">{r.scenarios.aggressive.description}</p>
            </div>
        </div>
        </div>

        {/* Sezione Forecast: Il Potenziale della Tua Lista */}
        {r.listForecast &&
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{ animationDelay: '550ms' }}>
            <h2 className="text-xl font-bold text-orange mb-6 flex items-center gap-2">
              📬 Forecast: Il Potenziale della Tua Lista
            </h2>

            {/* Card superiori */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Lista Attuale — statica */}
              <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                <p className="text-slate-400 text-sm mb-1">Lista Attuale</p>
                <p className="text-2xl font-bold text-white">{r.listForecast.listSize.toLocaleString('it-IT')}</p>
                <p className="text-slate-400 text-sm">iscritti</p>
              </div>

              {/* Slider Invii/mese — interattivo */}
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/5 p-4 rounded-lg border border-blue-500/30 flex flex-col justify-between">
                <div className="text-center mb-3">
                  <p className="text-blue-300 text-sm mb-1">✏️ Invii/mese (modificabile)</p>
                  <p className="text-3xl font-bold text-white">{customSends}</p>
                  <p className="text-blue-300/70 text-xs">email/mese</p>
                </div>
                <div className="space-y-1 px-1">
                  <Slider
                min={0}
                max={30}
                step={1}
                value={[customSends]}
                onValueChange={(v) => setCustomSends(v[0])}
                className="w-full" />

                  <div className="flex justify-between text-xs text-slate-500">
                    <span>0</span>
                    <span>30</span>
                  </div>
                </div>
              </div>

              {/* AOV */}
              <div className={`p-4 rounded-lg text-center border ${
          r.listForecast.isCustomAov ?
          'bg-gradient-to-br from-green-600/20 to-green-500/5 border-green-500/30' :
          'bg-gradient-to-br from-orange/20 to-orange/5 border-orange/30'}`
          }>
                <p className={`text-sm mb-1 ${r.listForecast.isCustomAov ? 'text-green-400' : 'text-orange'}`}>
                  {r.listForecast.isCustomAov ? '✅ AOV Reale Cliente' : 'AOV Stimato Settore'}
                </p>
                <p className={`text-2xl font-bold ${r.listForecast.isCustomAov ? 'text-green-400' : 'text-orange'}`}>
                  €{r.listForecast.sectorAOV}
                </p>
                <p className={`text-sm ${r.listForecast.isCustomAov ? 'text-green-400/70' : 'text-orange/70'}`}>
                  valore medio ordine
                </p>
              </div>
            </div>

            {/* Tabella forecast */}
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-4 text-slate-400 font-medium w-1/4"></th>
                    <th className="text-center p-4 text-blue-300 font-semibold bg-blue-500/10 border-x border-blue-500/20">
                      📍 Corrente (mod.)
                    </th>
                    <th className="text-center p-4 text-orange font-semibold bg-orange/10 border-x border-orange/20">
                      ⚡ Ottimizzato
                    </th>
                    <th className="text-center p-4 text-green-400 font-semibold bg-green-500/10">
                      🏆 Benchmark
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/50">
                    <td className="p-4 text-slate-400">Invii/mese</td>
                    <td className="p-4 text-center text-blue-300 font-bold bg-blue-500/5 border-x border-blue-500/10">{customSends}</td>
                    <td className="p-4 text-center text-orange font-medium bg-orange/5 border-x border-orange/20">{r.listForecast.optimized.sends}</td>
                    <td className="p-4 text-center text-green-400 font-medium bg-green-500/5">{r.listForecast.benchmark.sends}</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="p-4 text-slate-400">CR newsletter</td>
                    <td className="p-4 text-center text-slate-300 bg-blue-500/5 border-x border-blue-500/10">0.2%</td>
                    <td className="p-4 text-center text-slate-300 bg-orange/5 border-x border-orange/20">0.2%</td>
                    <td className="p-4 text-center text-slate-300 bg-green-500/5">0.2%</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="p-4 text-slate-400">Ordini stimati</td>
                    <td className="p-4 text-center text-blue-300 font-medium bg-blue-500/5 border-x border-blue-500/10">{liveOrders.toLocaleString('it-IT')}</td>
                    <td className="p-4 text-center text-orange bg-orange/5 border-x border-orange/20">{Math.round(r.listForecast.listSize * 0.30 * r.listForecast.optimized.sends * 0.002).toLocaleString('it-IT')}</td>
                    <td className="p-4 text-center text-green-400 bg-green-500/5">{Math.round(r.listForecast.listSize * 0.30 * r.listForecast.benchmark.sends * 0.002).toLocaleString('it-IT')}</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="p-4 text-slate-400">Revenue Newsletter</td>
                    <td className="p-4 text-center text-blue-300 font-medium bg-blue-500/5 border-x border-blue-500/10">{formatCurrency(liveNewsletterRev)}</td>
                    <td className="p-4 text-center text-orange font-medium bg-orange/5 border-x border-orange/20">{formatCurrency(r.listForecast.optimized.newsletterRevenue)}</td>
                    <td className="p-4 text-center text-green-400 font-medium bg-green-500/5">{formatCurrency(r.listForecast.benchmark.newsletterRevenue)}</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="p-4 text-slate-400">Revenue Automazioni</td>
                    <td className="p-4 text-center text-blue-300 font-medium bg-blue-500/5 border-x border-blue-500/10">{formatCurrency(liveAutomationRev)}</td>
                    <td className="p-4 text-center text-orange font-medium bg-orange/5 border-x border-orange/20">{formatCurrency(r.listForecast.optimized.automationRevenue)}</td>
                    <td className="p-4 text-center text-green-400 font-medium bg-green-500/5">{formatCurrency(r.listForecast.benchmark.automationRevenue)}</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-white font-bold">💰 Totale stimato</td>
                    <td className="p-4 text-center bg-blue-500/10 border-x border-blue-500/20">
                      <span className="text-blue-300 font-bold text-base">{formatCurrency(liveTotal)}</span>
                      <span className="text-blue-300/60 text-xs block">/mese</span>
                    </td>
                    <td className="p-4 text-center bg-orange/10 border-x border-orange/20">
                      <span className="text-orange font-bold text-base">{formatCurrency(r.listForecast.optimized.total)}</span>
                      <span className="text-orange/60 text-xs block">/mese</span>
                    </td>
                    <td className="p-4 text-center bg-green-500/10">
                      <span className="text-green-400 font-bold text-base">{formatCurrency(r.listForecast.benchmark.total)}</span>
                      <span className="text-green-400/60 text-xs block">/mese</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Nota esplicativa */}
            <div className="mt-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
              <p className="text-slate-400 text-xs leading-relaxed">
                ⚠️ <strong className="text-slate-300">Stima indicativa</strong> basata su benchmark di settore. Formula: CR 0.2% per newsletter, CR dinamico 0.3%–1.0% per automazioni (in base al numero di flussi attivi), AOV {r.listForecast.isCustomAov ? 'reale cliente' : 'stimato da dati di mercato'} {r.sectorBenchmark.label}. La colonna <span className="text-blue-300">Corrente</span> è modificabile tramite lo slider per simulare diversi scenari di invio.
              </p>
            </div>
          </div>
      }

        {/* ── Sezione Popup & Crescita Lista (condizionale) ─────────────────── */}
        {r.popupData && r.popupData.hasPopup && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{ animationDelay: '570ms' }}>
            <h2 className="text-xl font-bold text-teal-400 mb-2 flex items-center gap-2">
              📬 Popup & Crescita Lista
            </h2>
            <p className="text-slate-500 text-xs mb-6">
              Proiezione basata sul popup attivo — tasso di conversione {r.popupData.conversionRate}% su {r.popupData.monthlyVisitors.toLocaleString('it-IT')} visitatori/mese.
            </p>

            {/* 3 card principali */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-teal-600/20 to-teal-500/5 p-5 rounded-xl border border-teal-500/30 text-center">
                <p className="text-teal-400 text-sm mb-1">📩 Nuovi iscritti/mese</p>
                <p className="text-3xl font-bold text-white">{r.popupData.newSubscribersPerMonth.toLocaleString('it-IT')}</p>
                <p className="text-teal-400/70 text-xs mt-1">dal popup attivo</p>
              </div>
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/5 p-5 rounded-xl border border-blue-500/30 text-center">
                <p className="text-blue-300 text-sm mb-1">📈 Lista a 12 mesi</p>
                <p className="text-3xl font-bold text-white">{r.popupData.projectedListSize12m.toLocaleString('it-IT')}</p>
                <p className="text-blue-300/70 text-xs mt-1">
                  +{r.popupData.monthlyListGrowthRate}%/mese → {r.popupData.projectedListSize6m.toLocaleString('it-IT')} a 6 mesi
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-600/20 to-green-500/5 p-5 rounded-xl border border-green-500/30 text-center">
                <p className="text-green-400 text-sm mb-1">💰 Revenue aggiuntiva</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(r.popupData.projectedRevenue12m)}</p>
                <p className="text-green-400/70 text-xs mt-1">dai nuovi iscritti (12 mesi)</p>
                {/* Breakdown tre layer */}
                <div className="mt-3 pt-3 border-t border-green-500/20 space-y-1 text-left">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">🎁 Welcome (5% CR)</span>
                    <span className="text-green-300">{formatCurrency(r.popupData.revenueWelcome12m)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">🛒 Recuperi (3% CR)</span>
                    <span className="text-green-300">{formatCurrency(r.popupData.revenueRecovery12m)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">⚡ Automazioni</span>
                    <span className="text-green-300">{formatCurrency(r.popupData.revenueAutomation12m)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabella proiezione crescita lista */}
            <div className="overflow-x-auto rounded-lg border border-slate-700 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-slate-400 font-medium">Momento</th>
                    <th className="text-center p-3 text-teal-400 font-semibold">Oggi</th>
                    <th className="text-center p-3 text-blue-300 font-semibold">3 mesi</th>
                    <th className="text-center p-3 text-orange font-semibold">6 mesi</th>
                    <th className="text-center p-3 text-green-400 font-semibold">12 mesi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/50">
                    <td className="p-3 text-slate-400">Iscritti lista</td>
                    <td className="p-3 text-center text-teal-400 font-bold">
                      {r.listForecast?.listSize.toLocaleString('it-IT')}
                    </td>
                    <td className="p-3 text-center text-blue-300 font-medium">
                      {r.listForecast ? Math.round(r.listForecast.listSize * Math.pow(1 + r.popupData.monthlyListGrowthRate / 100, 3)).toLocaleString('it-IT') : '—'}
                    </td>
                    <td className="p-3 text-center text-orange font-medium">
                      {r.popupData.projectedListSize6m.toLocaleString('it-IT')}
                    </td>
                    <td className="p-3 text-center text-green-400 font-bold">
                      {r.popupData.projectedListSize12m.toLocaleString('it-IT')}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-400">Nuovi iscritti aggiunti</td>
                    <td className="p-3 text-center text-teal-400">—</td>
                    <td className="p-3 text-center text-blue-300">
                      +{(r.popupData.newSubscribersPerMonth * 3).toLocaleString('it-IT')}
                    </td>
                    <td className="p-3 text-center text-orange">
                      +{(r.popupData.newSubscribersPerMonth * 6).toLocaleString('it-IT')}
                    </td>
                    <td className="p-3 text-center text-green-400 font-bold">
                      +{(r.popupData.newSubscribersPerMonth * 12).toLocaleString('it-IT')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Nota benchmark */}
            <div className="bg-teal-900/20 border border-teal-500/20 rounded-lg p-4">
              <p className="text-teal-400/80 text-xs leading-relaxed">
                <strong className="text-teal-400">📊 Benchmark e-commerce popup:</strong>{' '}
                Un buon tasso di conversione popup è tra il <strong className="text-white">3% e il 5%</strong>.
                {r.popupData.conversionRate < 3
                  ? ` Il tuo ${r.popupData.conversionRate}% è sotto la media — ottimizzare il copy e l'offerta popup può portare a 2-3× più iscritti.`
                  : r.popupData.conversionRate >= 5
                    ? ` Il tuo ${r.popupData.conversionRate}% è eccellente — sei già nella top tier e-commerce!`
                    : ` Il tuo ${r.popupData.conversionRate}% è nella norma, con margine per migliorare ulteriormente.`
                }
              </p>
            </div>
          </div>
        )}

        {/* Sezione 4: Top 3 Azioni Prioritarie */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{
        animationDelay: '600ms'
      }}>
          <h2 className="text-xl font-bold text-orange mb-6 flex items-center gap-2">
            🎯 Roadmap: Le 3 Azioni Prioritarie
          </h2>
          
          <div className="space-y-4">
            {r.topActions.map((action, index) => <div key={index} className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-700/50 p-4 rounded-lg animate-fade-in" style={{
            animationDelay: `${700 + index * 100}ms`
          }}>
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-orange flex items-center justify-center text-white font-bold text-lg">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{action.action}</p>
                    <p className="text-slate-400 text-sm">⏱️ {action.timeframe} • Difficoltà: {action.difficulty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-lg">{action.roi}</p>
                  </div>
                </div>
              </div>)}
          </div>
        </div>

        {/* ── Proiezione Fatturato E-commerce nel Tempo ────────────────────── */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{ animationDelay: '810ms' }}>
          <h2 className="text-xl font-bold text-orange mb-2 flex items-center gap-2">
            📈 Proiezione Fatturato E-commerce nel Tempo
          </h2>
          <p className="text-slate-500 text-xs mb-6">
            Come potrebbe variare il fatturato mensile totale del tuo e-commerce dopo l'implementazione delle attività consigliate (scenario moderato +{r.scenarios.moderate.growthPercent}% sul fatturato email).
          </p>

          {(() => {
            const totalRevenue = r.monthlyRevenue;
            const emailBase = r.currentEmailRevenue;
            const moderateGrowth = r.scenarios.moderate.value; // incremento email mensile a regime
            // Ramp-up progressivo: a 3 mesi 40%, a 6 mesi 75%, a 12 mesi 100%
            const emailAt3m = emailBase + moderateGrowth * 0.4;
            const emailAt6m = emailBase + moderateGrowth * 0.75;
            const emailAt12m = emailBase + moderateGrowth;
            // Fatturato totale ecommerce = (fatturato totale - email attuale) + email proiettata
            const nonEmailRevenue = totalRevenue - emailBase;
            const totalAt3m = nonEmailRevenue + emailAt3m;
            const totalAt6m = nonEmailRevenue + emailAt6m;
            const totalAt12m = nonEmailRevenue + emailAt12m;
            const growth3 = ((totalAt3m - totalRevenue) / totalRevenue * 100);
            const growth6 = ((totalAt6m - totalRevenue) / totalRevenue * 100);
            const growth12 = ((totalAt12m - totalRevenue) / totalRevenue * 100);

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {/* Oggi */}
                  <div className="bg-slate-700/50 p-5 rounded-xl border border-slate-600 text-center">
                    <p className="text-slate-400 text-sm mb-1">📍 Oggi</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
                    <p className="text-slate-500 text-xs mt-1">/mese totale</p>
                    <p className="text-slate-500 text-xs">di cui {formatCurrency(emailBase)} da email</p>
                  </div>

                  {/* 3 mesi */}
                  <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/5 p-5 rounded-xl border border-blue-500/30 text-center">
                    <p className="text-blue-300 text-sm mb-1">🗓️ 3 Mesi</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalAt3m)}</p>
                    <p className="text-blue-400 text-xs mt-1 font-semibold">+{formatCurrency(totalAt3m - totalRevenue)} (+{growth3.toFixed(1)}%)</p>
                    <p className="text-slate-500 text-xs mt-1">Email: {formatCurrency(emailAt3m)}</p>
                    <p className="text-slate-500 text-xs">Fase di setup e primi flussi</p>
                  </div>

                  {/* 6 mesi */}
                  <div className="bg-gradient-to-br from-orange/20 to-orange/5 p-5 rounded-xl border border-orange/30 text-center">
                    <p className="text-orange text-sm mb-1">🗓️ 6 Mesi</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalAt6m)}</p>
                    <p className="text-orange text-xs mt-1 font-semibold">+{formatCurrency(totalAt6m - totalRevenue)} (+{growth6.toFixed(1)}%)</p>
                    <p className="text-slate-500 text-xs mt-1">Email: {formatCurrency(emailAt6m)}</p>
                    <p className="text-slate-500 text-xs">Ottimizzazione e scaling</p>
                  </div>

                  {/* 12 mesi */}
                  <div className="bg-gradient-to-br from-green-600/20 to-green-500/5 p-5 rounded-xl border-2 border-green-500/40 text-center relative">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold">OBIETTIVO</span>
                    </div>
                    <p className="text-green-400 text-sm mb-1 mt-2">🗓️ 12 Mesi</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalAt12m)}</p>
                    <p className="text-green-400 text-xs mt-1 font-semibold">+{formatCurrency(totalAt12m - totalRevenue)} (+{growth12.toFixed(1)}%)</p>
                    <p className="text-slate-500 text-xs mt-1">Email: {formatCurrency(emailAt12m)}</p>
                    <p className="text-slate-500 text-xs">Performance a regime</p>
                  </div>
                </div>

                {/* Barra visuale progressione */}
                <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600/50">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-slate-400 text-sm font-medium">Progressione crescita fatturato</span>
                  </div>
                  <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className="absolute h-full bg-gradient-to-r from-blue-500 via-orange to-green-500 rounded-full transition-all duration-1000" style={{ width: '100%' }} />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-slate-500">{formatCurrency(totalRevenue)}</span>
                    <span className="text-blue-300">{formatCurrency(totalAt3m)}</span>
                    <span className="text-orange">{formatCurrency(totalAt6m)}</span>
                    <span className="text-green-400">{formatCurrency(totalAt12m)}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-3">
                    ⚠️ <strong className="text-slate-400">Stima indicativa</strong> — la crescita è progressiva e riguarda l'incremento derivante dall'email marketing ottimizzato sul fatturato totale e-commerce.
                  </p>
                </div>
              </>
            );
          })()}
        </div>

        {/* Potenziale Annuo Totale */}
        <div className="bg-gradient-to-r from-orange to-orange/80 p-6 rounded-xl animate-fade-in" style={{
        animationDelay: '850ms'
      }}>
          <div className="text-center">
            <p className="text-white/80 text-lg mb-2">💰 Potenziale Economico Annuo Recuperabile</p>
            <p className="text-4xl md:text-5xl font-bold text-white">{formatCurrency(r.yearlyPotential)}</p>
            <p className="text-white/70 mt-2">
              Gap annuale tra email attuale ({formatCurrency(r.currentEmailRevenue)}/mese) e benchmark di settore ({formatCurrency(r.benchmarkEmailRevenue)}/mese)
            </p>
          </div>
        </div>

        {/* ── Sezione Investimento & ROI ─────────────────────────────────── */}
        {showInvestment &&
      <div className="bg-gradient-to-br from-teal-900/40 to-teal-800/20 p-6 rounded-xl border animate-fade-in border-primary bg-primary" style={{ animationDelay: '820ms' }}>
            <h2 className="text-xl font-bold text-teal-400 mb-2 flex items-center gap-2">
              💼 Investimento & ROI
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Inserisci i costi del servizio per calcolare il break-even e il ROI in tempo reale.
            </p>

            {/* Form inline fee */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-800/50 p-4 rounded-xl border border-primary">
              {/* Setup una-tantum */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">💰 Setup una-tantum</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">€</span>
                  <input
                type="number"
                placeholder="es. 1500"
                min={0}
                value={setupFee}
                onChange={(e) => setSetupFee(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 pl-8 text-sm placeholder:text-slate-500 focus:outline-none focus:border-teal-500" />

                </div>
              </div>
              {/* Fee fissa mensile */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">📅 Fee fissa mensile</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">€</span>
                  <input
                type="number"
                placeholder="es. 800"
                min={0}
                value={monthlyFixed}
                onChange={(e) => setMonthlyFixed(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 pl-8 text-sm placeholder:text-slate-500 focus:outline-none focus:border-teal-500" />

                </div>
              </div>
              {/* Commissione % */}
              <div>
                <label className="block text-slate-400 text-xs font-medium mb-1.5">📊 Commissione % su gap netto IVA</label>
                <div className="relative">
                  <input
                type="number"
                placeholder="es. 10"
                min={0}
                max={100}
                value={monthlyPercent}
                onChange={(e) => setMonthlyPercent(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 pr-8 text-sm placeholder:text-slate-500 focus:outline-none focus:border-teal-500" />

                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">%</span>
                </div>
                {monthlyPercentN > 0 && revenueGapNetVAT > 0 &&
            <p className="text-slate-500 text-xs mt-1">
                    = {formatCurrency(monthlyPercentFee)}/mese su {formatCurrency(revenueGapNetVAT)} gap netto IVA
                  </p>
            }
              </div>
            </div>

            {/* Card summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Setup */}
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 text-center">
                <p className="text-slate-400 text-sm mb-1">💰 Setup una-tantum</p>
                {setupFeeN > 0 ?
            <>
                    <p className="text-2xl font-bold text-white">{formatCurrency(setupFeeN)}</p>
                    <p className="text-slate-500 text-xs mt-1">investimento iniziale</p>
                  </> :

            <p className="text-slate-500 text-lg font-semibold">—</p>
            }
              </div>

              {/* Fee mensile */}
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/50 text-center">
                <p className="text-slate-400 text-sm mb-1">📅 Fee Mensile Totale</p>
                {totalMonthlyFee > 0 ?
            <>
                    <p className="text-2xl font-bold text-teal-400">{formatCurrency(totalMonthlyFee)}/mese</p>
                    {monthlyFixedN > 0 && monthlyPercentN > 0 &&
              <p className="text-slate-500 text-xs mt-1">
                        {formatCurrency(monthlyFixedN)} fisso + {monthlyPercentN}% su gap netto IVA
                      </p>
              }
                    {monthlyFixedN > 0 && monthlyPercentN === 0 &&
              <p className="text-slate-500 text-xs mt-1">fee fissa mensile</p>
              }
                    {monthlyFixedN === 0 && monthlyPercentN > 0 &&
              <p className="text-slate-500 text-xs mt-1">{monthlyPercentN}% sul fatturato email</p>
              }
                  </> :

            <p className="text-slate-500 text-lg font-semibold">—</p>
            }
              </div>

              {/* Break-even */}
              <div className={`p-4 rounded-xl border text-center ${
          breakEvenMonths !== null ?
          'bg-green-900/30 border-green-500/30' :
          setupFeeN > 0 ?
          'bg-red-900/20 border-red-500/20' :
          'bg-slate-800/60 border-slate-700/50'}`
          }>
                <p className="text-slate-400 text-sm mb-1">⏱️ Break-even Setup</p>
                {setupFeeN === 0 ?
            <p className="text-slate-500 text-lg font-semibold">—</p> :
            breakEvenMonths !== null ?
            <>
                    <p className="text-2xl font-bold text-green-400">{breakEvenMonths} mesi</p>
                    <p className="text-green-400/70 text-xs mt-1">tempo di rientro</p>
                  </> :

            <>
                    <p className="text-xl font-bold text-red-400">Fee &gt; Revenue</p>
                    <p className="text-red-400/70 text-xs mt-1">rientro non calcolabile</p>
                  </>
            }
              </div>
            </div>

            {/* Nota esplicativa break-even */}
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 mb-6">
              <p className="text-slate-400 text-xs leading-relaxed">
                <strong className="text-teal-400">📐 Formula break-even:</strong>{' '}
                Setup ÷ (Potenziale Mensile Moderato − Fee Mensile Totale) = mesi per rientrare nell'investimento iniziale.
                {setupFeeN > 0 && totalMonthlyFee > 0 &&
            <span className="block mt-1 text-slate-500">
                    Esempio con i tuoi valori: {formatCurrency(setupFeeN)} ÷ ({formatCurrency(annualRevAdded / 12)} − {formatCurrency(totalMonthlyFee)}) = {monthlyNetGain > 0 ? `${formatCurrency(setupFeeN / monthlyNetGain).replace('€', '')} → ${breakEvenMonths} mes${breakEvenMonths === 1 ? 'e' : 'i'}` : 'N/A (fee > revenue mensile)'}
                  </span>
            }
              </p>
            </div>

            {/* Tabella ROI 3 anni */}
            <div className="overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-4 text-slate-400 font-medium"></th>
                    <th className="text-center p-4 text-white font-semibold bg-slate-700/30">Anno 1</th>
                    <th className="text-center p-4 text-white font-semibold bg-slate-700/20">Anno 2</th>
                    <th className="text-center p-4 text-white font-semibold bg-slate-700/10">Anno 3</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/40">
                    <td className="p-4 text-slate-400">📈 Revenue aggiunto</td>
                    <td className="p-4 text-center text-green-400 font-medium bg-slate-800/20">
                      {formatCurrency(annualRevAdded)}
                    </td>
                    <td className="p-4 text-center text-green-400 font-medium bg-slate-800/10">
                      {formatCurrency(annualRevAdded)}
                    </td>
                    <td className="p-4 text-center text-green-400 font-medium">
                      {formatCurrency(annualRevAdded)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-700/40">
                    <td className="p-4 text-slate-400">💸 Costo servizio</td>
                    <td className="p-4 text-center text-red-400 font-medium bg-slate-800/20">
                      {formatCurrency(annualCostY1)}
                      {setupFeeN > 0 && <span className="block text-xs text-slate-500">(incl. setup)</span>}
                    </td>
                    <td className="p-4 text-center text-red-400 font-medium bg-slate-800/10">
                      {formatCurrency(annualCostY2)}
                    </td>
                    <td className="p-4 text-center text-red-400 font-medium">
                      {formatCurrency(annualCostY3)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-700/40">
                    <td className="p-4 text-white font-bold">💰 ROI Netto</td>
                    <td className={`p-4 text-center font-bold text-base bg-slate-800/20 ${netRoiY1 >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                      {formatCurrency(netRoiY1)}
                    </td>
                    <td className={`p-4 text-center font-bold text-base bg-slate-800/10 ${netRoiY2 >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                      {formatCurrency(netRoiY2)}
                    </td>
                    <td className={`p-4 text-center font-bold text-base ${netRoiY3 >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                      {formatCurrency(netRoiY3)}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-white font-bold">📊 ROI %</td>
                    <td className={`p-4 text-center font-bold text-lg bg-slate-800/20 ${roiPctY1 >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                      {roiPctY1 >= 0 ? '+' : ''}{Math.round(roiPctY1)}%
                    </td>
                    <td className={`p-4 text-center font-bold text-lg bg-slate-800/10 ${roiPctY2 >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                      {roiPctY2 >= 0 ? '+' : ''}{Math.round(roiPctY2)}%
                    </td>
                    <td className={`p-4 text-center font-bold text-lg ${roiPctY3 >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                      {roiPctY3 >= 0 ? '+' : ''}{Math.round(roiPctY3)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-slate-500 text-xs mt-3">
              * Revenue aggiunto = gap annuale tra fatturato email attuale e benchmark di settore ({formatCurrency(annualRevAdded / 12)}/mese × 12). Anno 1 include setup una-tantum. Anno 2 e 3 solo fee ricorrenti.
            </p>
          </div>
      }

        {/* Download PDF */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl border border-slate-600 animate-fade-in" style={{
        animationDelay: '850ms'
      }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                📥 Scarica il tuo Report PDF
              </h3>
              <p className="text-slate-400 text-sm">
                Salva questo report per consultarlo quando vuoi
              </p>
            </div>
            <Button onClick={handleDownloadPdf} disabled={isDownloading} className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-6">
              {isDownloading ? <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generazione...
                </> : <>
                  <Download className="w-4 h-4 mr-2" />
                  Scarica PDF
                </>}
            </Button>
          </div>
        </div>

        {/* Prenota Consulenza - Calendario GHL Embeddato */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 sm:p-8 rounded-xl border border-orange/30 animate-fade-in" style={{
        animationDelay: '900ms'
      }}>
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-white mb-3">
              📅 Prenota la tua Consulenza Gratuita
            </h3>
            <p className="text-slate-300 max-w-2xl mx-auto">
              Hai visto il potenziale del tuo business. Scopri come sbloccare questi risultati con una consulenza personalizzata di 30 minuti con i nostri esperti.
            </p>
          </div>
          
          {/* GHL Calendar Embed */}
          <div className="bg-white rounded-xl overflow-hidden mb-6">
            <iframe
            src="https://go.mailift.com/widget/booking/3IIFrrczXhMvLYQAL4md"
            style={{ width: '100%', height: '700px', border: 'none' }}
            title="Prenota Consulenza Gratuita"
            loading="lazy" />

          </div>

          <div className="text-center">
            <Button onClick={onRestart} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
              Fai un'altra analisi
            </Button>
          </div>
        </div>

      </div>

      {/* ── Pulsante flottante "Simula" ──────────────────────────────────────── */}
      {(
        <button
          onClick={() => setShowSimPanel(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
          style={{ background: simulatedReport ? '#7c3aed' : '#1e293b', border: '2px solid', borderColor: simulatedReport ? '#a78bfa' : '#475569', color: simulatedReport ? '#e9d5ff' : '#94a3b8' }}
          title="Simula modifiche ai dati"
        >
          <Settings className="w-4 h-4" />
          {simulatedReport ? '✦ Sim. attiva' : 'Simula dati'}
        </button>
      )}

      {/* ── Pannello laterale "Simula modifiche" ─────────────────────────────── */}
      {showSimPanel && (
        <>
          {/* Overlay scuro */}
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSimPanel(false)}
          />
          {/* Drawer laterale destra */}
          <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            {/* Header pannello */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 bg-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-bold text-base">Simula modifiche</h3>
                {simulatedReport && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40">
                    ATTIVA
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowSimPanel(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo scrollabile */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Fatturato mensile */}
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-1.5">💶 Fatturato mensile totale</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">€</span>
                  <input
                    type="number"
                    min={0}
                    value={simInputs.monthlyRevenue}
                    onChange={e => setSimInputs(p => ({ ...p, monthlyRevenue: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 pl-8 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* % da email */}
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-1.5">📧 % fatturato da email attuale</label>
                <div className="flex items-center gap-3">
                  <Slider
                    min={0}
                    max={80}
                    step={1}
                    value={[simInputs.emailPct]}
                    onValueChange={v => setSimInputs(p => ({ ...p, emailPct: v[0] }))}
                    className="flex-1"
                  />
                  <span className="text-white font-bold w-12 text-right">{simInputs.emailPct}%</span>
                </div>
              </div>

              {/* Lista iscritti */}
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-1.5">👥 Dimensione lista</label>
                <input
                  type="number"
                  min={0}
                  value={simInputs.listSize}
                  onChange={e => setSimInputs(p => ({ ...p, listSize: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* AOV */}
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-1.5">🏷️ AOV personalizzato (lascia vuoto per benchmark)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">€</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="es. 65"
                    value={simInputs.aov}
                    onChange={e => setSimInputs(p => ({ ...p, aov: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 pl-8 text-sm focus:outline-none focus:border-purple-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Frequenza email */}
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-1.5">📨 Frequenza invio newsletter</label>
                <select
                  value={simInputs.emailFrequency}
                  onChange={e => setSimInputs(p => ({ ...p, emailFrequency: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="none">Nessuna (0/mese)</option>
                  <option value="1-2">1-2/settimana (~5/mese)</option>
                  <option value="3-4">3-4/settimana (~14/mese)</option>
                  <option value="5-7">5-7/settimana (~24/mese)</option>
                  <option value="daily+">Daily+ (~30/mese)</option>
                </select>
              </div>

              {/* Flussi attivi */}
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">⚙️ Flussi automazione attivi</label>
                <div className="grid grid-cols-1 gap-2">
                  {ALL_FLOWS.map(({ key, label }) => {
                    const isActive = simInputs.activeFlows.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => setSimInputs(p => ({
                          ...p,
                          activeFlows: isActive
                            ? p.activeFlows.filter(f => f !== key)
                            : [...p.activeFlows, key]
                        }))}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm text-left transition-all ${
                          isActive
                            ? 'bg-purple-600/20 border-purple-500/50 text-purple-200'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                      >
                        <span>{label}</span>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isActive ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
                          {isActive ? '✓' : '+'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Scenari */}
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">🚀 Scenari crescita (% del gap recuperato)</label>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-green-400 text-xs">Conservativo</span>
                      <span className="text-white text-xs font-bold">{simInputs.scenarioConservative}%</span>
                    </div>
                    <Slider min={5} max={40} step={1} value={[simInputs.scenarioConservative]}
                      onValueChange={v => setSimInputs(p => ({ ...p, scenarioConservative: v[0] }))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-orange text-xs">Moderato</span>
                      <span className="text-white text-xs font-bold">{simInputs.scenarioModerate}%</span>
                    </div>
                    <Slider min={10} max={70} step={1} value={[simInputs.scenarioModerate]}
                      onValueChange={v => setSimInputs(p => ({ ...p, scenarioModerate: v[0] }))} className="w-full" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-purple-400 text-xs">Aggressivo</span>
                      <span className="text-white text-xs font-bold">{simInputs.scenarioAggressive}%</span>
                    </div>
                    <Slider min={20} max={100} step={1} value={[simInputs.scenarioAggressive]}
                      onValueChange={v => setSimInputs(p => ({ ...p, scenarioAggressive: v[0] }))} className="w-full" />
                  </div>
                </div>
              </div>

              {/* Popup */}
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-2">🪟 Popup optin</label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                    <span className="text-slate-300 text-sm">Popup attivo</span>
                    <button
                      onClick={() => setSimInputs(p => ({ ...p, hasPopup: !p.hasPopup }))}
                      className={`w-10 h-5 rounded-full transition-all relative ${simInputs.hasPopup ? 'bg-purple-500' : 'bg-slate-600'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${simInputs.hasPopup ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  {simInputs.hasPopup && (
                    <>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400 text-xs">Tasso conversione</span>
                          <span className="text-white text-xs font-bold">{simInputs.popupConversionRate}%</span>
                        </div>
                        <Slider min={0.5} max={15} step={0.5} value={[simInputs.popupConversionRate]}
                          onValueChange={v => setSimInputs(p => ({ ...p, popupConversionRate: v[0] }))} className="w-full" />
                      </div>
                      <div>
                        <label className="block text-slate-400 text-xs mb-1">Visitatori/mese</label>
                        <input type="number" min={0} value={simInputs.monthlyVisitors}
                          onChange={e => setSimInputs(p => ({ ...p, monthlyVisitors: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-slate-400 text-xs">Crescita lista mensile</span>
                          <span className="text-white text-xs font-bold">{simInputs.monthlyListGrowthRate}%</span>
                        </div>
                        <Slider min={0.5} max={20} step={0.5} value={[simInputs.monthlyListGrowthRate]}
                          onValueChange={v => setSimInputs(p => ({ ...p, monthlyListGrowthRate: v[0] }))} className="w-full" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer azioni */}
            <div className="px-5 py-4 border-t border-slate-700 bg-slate-800/80 flex-shrink-0 space-y-2">
              <Button
                onClick={() => { handleSimulate(); setShowSimPanel(false); }}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Applica simulazione
              </Button>
              {simulatedReport && (
                <Button
                  onClick={() => { handleResetSimulation(); setShowSimPanel(false); }}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Ripristina dati originali
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>;
};
export default AdvancedReportComponent;