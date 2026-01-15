import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, Loader2 } from 'lucide-react';
import type { AdvancedReport } from '@/lib/reportCalculations';
import { generatePdfReport } from '@/lib/pdfGenerator';

interface AdvancedReportProps {
  report: AdvancedReport;
  phone?: string;
  userName?: string;
  userEmail?: string;
  website?: string;
  onRestart: () => void;
}

const formatCurrency = (value: number) => `€${Math.round(value).toLocaleString('it-IT')}`;

const getRatingColor = (rating: 'A' | 'B' | 'C' | 'D') => {
  switch (rating) {
    case 'A': return 'text-green-400 bg-green-400/20';
    case 'B': return 'text-yellow-400 bg-yellow-400/20';
    case 'C': return 'text-orange bg-orange/20';
    case 'D': return 'text-red-400 bg-red-400/20';
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
  onRestart 
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      await generatePdfReport(report, userName, userEmail, website);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-orange mb-3">
            📊 Il Tuo Report Email Marketing
          </h1>
          <p className="text-slate-300 text-lg">
            Analisi personalizzata per il settore <span className="text-orange font-semibold">{report.sectorBenchmark.label}</span>
          </p>
        </div>

        {/* Email Health Score */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-slate-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${report.emailHealthScore * 3.52} 352`}
                  className={getScoreColor(report.emailHealthScore)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">{report.emailHealthScore}</span>
              </div>
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-xl font-bold text-white mb-2">Email Health Score</h2>
              <p className="text-slate-400">
                {report.emailHealthScore >= 80 && "Eccellente! Stai sfruttando bene l'email marketing."}
                {report.emailHealthScore >= 60 && report.emailHealthScore < 80 && "Buono, ma c'è margine di miglioramento."}
                {report.emailHealthScore >= 40 && report.emailHealthScore < 60 && "Discreto. Hai opportunità significative da cogliere."}
                {report.emailHealthScore < 40 && "Critico. Stai perdendo molto potenziale economico."}
              </p>
            </div>
          </div>
        </div>

        {/* Sezione: Analisi Strategica */}
        {report.strategicAnalysis && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{ animationDelay: '150ms' }}>
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
                  {report.strategicAnalysis.currentSituation}
                </p>
              </div>
              
              {/* Situazione Desiderata */}
              <div className="bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="text-green-400">🎯</span> Situazione Desiderata
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm">
                  {report.strategicAnalysis.desiredSituation}
                </p>
              </div>
              
              {/* Potenziali Impedimenti */}
              <div className="bg-red-900/20 p-4 rounded-lg border-l-4 border-red-500">
                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="text-red-400">⚠️</span> Potenziali Impedimenti
                </h3>
                <ul className="space-y-2">
                  {report.strategicAnalysis.potentialObstacles.map((obstacle, i) => (
                    <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      {obstacle}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Sezione 1: Situazione Attuale vs Benchmark */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h2 className="text-xl font-bold text-orange mb-6 flex items-center gap-2">
            📈 Situazione Attuale vs Benchmark
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Fatturato Totale */}
            <div className="bg-slate-700/50 p-4 rounded-lg border-l-4 border-slate-500">
              <p className="text-slate-400 text-sm mb-1">Fatturato Mensile Totale</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(report.monthlyRevenue)}<span className="text-sm text-slate-400">/mese</span></p>
              <p className="text-slate-400 text-sm">{formatCurrency(report.monthlyRevenue * 12)}/anno</p>
            </div>
            {/* Fatturato Email Attuale */}
            <div className="bg-slate-700/50 p-4 rounded-lg border-l-4 border-orange/50">
              <p className="text-slate-400 text-sm mb-1">Fatturato da Email</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(report.currentEmailRevenue)}<span className="text-sm text-slate-400">/mese</span></p>
              <p className="text-slate-400 text-sm">{report.currentEmailPercent}% del fatturato totale</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-orange/20 to-orange/5 p-4 rounded-lg border border-orange/30">
              <p className="text-orange text-sm mb-1">Benchmark Settore</p>
              <p className="text-2xl font-bold text-orange">{formatCurrency(report.benchmarkEmailRevenue)}<span className="text-sm text-orange/70">/mese</span></p>
              <p className="text-orange/70 text-sm">35% del fatturato (standard di mercato)</p>
            </div>
            <div className="bg-gradient-to-br from-red-600/30 to-red-500/10 p-4 rounded-lg border border-red-500/30">
              <p className="text-red-300 text-sm mb-1">Gap Economico</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(report.revenueGap)}<span className="text-sm text-red-300">/mese</span></p>
              <p className="text-red-300 text-sm">{formatCurrency(report.revenueGap * 12)}/anno persi</p>
            </div>
          </div>

          {/* Progress bar visuale */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Il tuo risultato</span>
              <span className="text-slate-400">Benchmark {report.sectorBenchmark.label}</span>
            </div>
            <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-orange rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, (report.currentEmailPercent / report.sectorBenchmark.emailShare) * 100)}%` }}
              />
              <div 
                className="absolute h-full w-1 bg-white top-0"
                style={{ left: '100%', transform: 'translateX(-100%)' }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white font-medium">{report.currentEmailPercent}%</span>
              <span className="text-orange font-medium">{report.sectorBenchmark.emailShare}%</span>
            </div>
          </div>
        </div>

        {/* Sezione 2: Automation Analysis */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-orange flex items-center gap-2">
              ⚙️ Analisi Automazioni
            </h2>
            <div className={`px-4 py-2 rounded-lg font-bold text-lg ${getRatingColor(report.automationRating)}`}>
              Rating: {report.automationRating}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Copertura automazioni */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-300">Copertura Automazioni</span>
                <span className="text-white font-medium">{report.activeFlowsCount}/{report.totalFlowsCount} flussi attivi</span>
              </div>
              <Progress value={report.automationCoverage} className="h-3" />
              <p className="text-slate-400 text-sm">
                {report.automationCoverage < 50 
                  ? "⚠️ Stai perdendo vendite automatiche significative"
                  : report.automationCoverage < 80
                  ? "📈 Buon punto di partenza, ma c'è ancora margine"
                  : "✅ Ottima copertura delle automazioni!"}
              </p>
            </div>

            {/* Potenziale flussi mancanti */}
            <div className="bg-gradient-to-br from-orange/20 to-orange/5 p-4 rounded-lg border border-orange/30">
              <p className="text-orange text-sm mb-1">Potenziale Flussi Mancanti</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(report.totalFlowGap)}<span className="text-base text-slate-300">/mese</span></p>
              <p className="text-slate-300 text-sm mt-1">{formatCurrency(report.totalFlowGap * 12)}/anno recuperabili</p>
            </div>
          </div>

          {/* Lista flussi mancanti */}
          {report.missingFlows.length > 0 && (
            <div className="mt-6">
              <h3 className="text-white font-semibold mb-3">Flussi Mancanti (ordinati per impatto):</h3>
              <div className="space-y-2">
                {report.missingFlows.slice(0, 4).map((flow, index) => (
                  <div 
                    key={flow.key}
                    className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg animate-fade-in"
                    style={{ animationDelay: `${400 + index * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        flow.priority === 1 ? 'bg-red-500/30 text-red-300' :
                        flow.priority === 2 ? 'bg-yellow-500/30 text-yellow-300' :
                        'bg-slate-600 text-slate-300'
                      }`}>
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
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sezione 3: I 3 Scenari di Crescita */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <h2 className="text-xl font-bold text-orange mb-6 flex items-center gap-2">
            🚀 Scenari di Crescita
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Conservativo */}
            <div className="bg-gradient-to-br from-green-600/20 to-green-500/5 p-5 rounded-xl border border-green-500/30 hover-scale">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <h3 className="text-green-400 font-semibold">Conservativo</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">+{report.scenarios.conservative.growthPercent}%</p>
              <p className="text-2xl font-semibold text-green-400">{formatCurrency(report.scenarios.conservative.value)}<span className="text-sm">/mese</span></p>
              <p className="text-slate-400 text-sm mt-3">{report.scenarios.conservative.description}</p>
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
              <p className="text-3xl font-bold text-white mb-2">+{report.scenarios.moderate.growthPercent}%</p>
              <p className="text-2xl font-semibold text-orange">{formatCurrency(report.scenarios.moderate.value)}<span className="text-sm">/mese</span></p>
              <p className="text-slate-400 text-sm mt-3">{report.scenarios.moderate.description}</p>
            </div>

            {/* Aggressivo */}
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/5 p-5 rounded-xl border border-purple-500/30 hover-scale">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                <h3 className="text-purple-400 font-semibold">Aggressivo</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">+{report.scenarios.aggressive.growthPercent}%</p>
              <p className="text-2xl font-semibold text-purple-400">{formatCurrency(report.scenarios.aggressive.value)}<span className="text-sm">/mese</span></p>
              <p className="text-slate-400 text-sm mt-3">{report.scenarios.aggressive.description}</p>
            </div>
          </div>
        </div>

        {/* Sezione 4: Top 3 Azioni Prioritarie */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <h2 className="text-xl font-bold text-orange mb-6 flex items-center gap-2">
            🎯 Roadmap: Le 3 Azioni Prioritarie
          </h2>
          
          <div className="space-y-4">
            {report.topActions.map((action, index) => (
              <div 
                key={index}
                className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-700/50 p-4 rounded-lg animate-fade-in"
                style={{ animationDelay: `${700 + index * 100}ms` }}
              >
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
              </div>
            ))}
          </div>
        </div>

        {/* Potenziale Annuo Totale */}
        <div className="bg-gradient-to-r from-orange to-orange/80 p-6 rounded-xl animate-fade-in" style={{ animationDelay: '800ms' }}>
          <div className="text-center">
            <p className="text-white/80 text-lg mb-2">💰 Potenziale Economico Annuo Recuperabile</p>
            <p className="text-4xl md:text-5xl font-bold text-white">{formatCurrency(report.yearlyPotential)}</p>
            <p className="text-white/70 mt-2">Implementando tutte le strategie suggerite</p>
          </div>
        </div>

        {/* Download PDF */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl border border-slate-600 animate-fade-in" style={{ animationDelay: '850ms' }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">
                📥 Scarica il tuo Report PDF
              </h3>
              <p className="text-slate-400 text-sm">
                Salva questo report per consultarlo quando vuoi
              </p>
            </div>
            <Button 
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-6"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generazione...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Scarica PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* CTA Finale */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center animate-fade-in" style={{ animationDelay: '900ms' }}>
          <h3 className="text-xl font-bold text-white mb-3">
            📱 Report completo in arrivo su WhatsApp
          </h3>
          <p className="text-slate-300 mb-6">
            Riceverai strategie dettagliate e personalizzate al numero: <span className="text-orange font-semibold">{phone}</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onRestart}
              variant="outline"
              className="border-orange text-orange hover:bg-orange hover:text-white"
            >
              Fai un'altra analisi
            </Button>
            <Button 
              className="bg-orange hover:bg-orange/90 text-white"
              onClick={() => window.open('https://wa.me/+39XXXXXXXXXX', '_blank')}
            >
              Contattaci per una consulenza gratuita
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdvancedReportComponent;
