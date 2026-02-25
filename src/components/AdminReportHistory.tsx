import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Link2, Check, RefreshCw, ClipboardList, RotateCcw, Loader2 } from 'lucide-react';
import { calculateAdvancedReportFromValues } from '@/lib/reportCalculations';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedReport {
  id: string;
  full_name: string;
  website: string | null;
  email_health_score: number | null;
  yearly_potential: number | null;
  created_at: string;
  sector: string | null;
  report_data: {
    meta?: {
      clientName?: string;
      website?: string;
    };
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTOR_LABELS: Record<string, string> = {
  fashion: 'Fashion',
  beauty: 'Beauty',
  homeLiving: 'Casa & Living',
  food: 'Food & Drink',
  sport: 'Sport & Outdoor',
  electronics: 'Tech & Elettronica',
  pets: 'Pet Care',
  health: 'Salute & Benessere',
  jewelry: 'Gioielli',
  childrenToys: 'Bambini & Giocattoli',
  automotive: 'Automotive',
  travel: 'Travel',
  other: 'Altro',
};

function getDisplayName(report: SavedReport): string {
  const clientName = (report.report_data as any)?.meta?.clientName;
  if (clientName && clientName.trim()) return clientName.trim();
  if (report.website) return report.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return report.full_name || 'Report Admin';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function formatEuro(n: number): string {
  return '€' + n.toLocaleString('it-IT', { maximumFractionDigits: 0 });
}

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-slate-400';
  if (score < 40) return 'text-red-400';
  if (score < 70) return 'text-amber-400';
  return 'text-emerald-400';
}

function getScoreBg(score: number | null): string {
  if (score === null) return 'bg-slate-700/50 border-slate-600';
  if (score < 40) return 'bg-red-900/20 border-red-500/30';
  if (score < 70) return 'bg-amber-900/20 border-amber-500/30';
  return 'bg-emerald-900/20 border-emerald-500/30';
}

// ─── Card ─────────────────────────────────────────────────────────────────────

const ReportCard: React.FC<{
  report: SavedReport;
  onOpenReport?: (id: string) => void;
}> = ({ report, onOpenReport }) => {
  const [copied, setCopied] = useState(false);

  const reportUrl = `https://quiz-to-customer.lovable.app/report/${report.id}`;
  const displayName = getDisplayName(report);
  const sectorLabel = SECTOR_LABELS[report.sector ?? ''] ?? (report.sector || 'Altro');

  const handleCopy = () => {
    navigator.clipboard.writeText(reportUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        {/* Left info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600 font-medium shrink-0">
              {sectorLabel}
            </span>
            <span className="text-xs text-slate-500">{formatDate(report.created_at)}</span>
          </div>
          <p className="text-white font-semibold text-sm truncate">{displayName}</p>

          {/* Score + potential */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {report.email_health_score !== null && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${getScoreBg(report.email_health_score)} ${getScoreColor(report.email_health_score)}`}>
                <span>Score</span>
                <span>{report.email_health_score}/100</span>
              </div>
            )}
            {report.yearly_potential !== null && report.yearly_potential > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-300">
                <span className="text-slate-500">Potenziale</span>
                <span className="font-semibold text-emerald-400">{formatEuro(report.yearly_potential)}/anno</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {onOpenReport ? (
            <button
              onClick={() => onOpenReport(report.id)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange/10 border border-orange/30 text-orange hover:bg-orange/20 hover:border-orange/50 transition-all duration-200 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Apri in Admin
            </button>
          ) : (
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange/10 border border-orange/30 text-orange hover:bg-orange/20 hover:border-orange/50 transition-all duration-200 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Apri
            </a>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white transition-all duration-200 font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
            {copied ? 'Copiato!' : 'Copia link'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Skeleton cards ────────────────────────────────────────────────────────────

const SkeletonCard: React.FC = () => (
  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
    <div className="flex gap-2">
      <Skeleton className="h-5 w-16 rounded-full bg-slate-700" />
      <Skeleton className="h-5 w-28 rounded-full bg-slate-700" />
    </div>
    <Skeleton className="h-4 w-40 bg-slate-700" />
    <div className="flex gap-2">
      <Skeleton className="h-6 w-24 rounded-lg bg-slate-700" />
      <Skeleton className="h-6 w-32 rounded-lg bg-slate-700" />
    </div>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────

interface AdminReportHistoryProps {
  refreshKey?: number;
  onOpenReport?: (id: string) => void;
}

export const AdminReportHistory: React.FC<AdminReportHistoryProps> = ({ refreshKey = 0, onOpenReport }) => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcProgress, setRecalcProgress] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('survey_submissions')
        .select('id, full_name, website, email_health_score, yearly_potential, created_at, sector, report_data')
        .eq('status', 'admin_report')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setReports((data as SavedReport[]) ?? []);
    } catch (e: any) {
      console.error('AdminReportHistory fetch error:', e);
      setError('Errore nel caricamento dei report salvati.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBulkRecalculate = async () => {
    setRecalculating(true);
    setRecalcProgress('Caricamento report...');
    try {
      // Fetch all admin reports with full report_data
      const { data: allReports, error: fetchErr } = await supabase
        .from('survey_submissions')
        .select('id, report_data')
        .eq('status', 'admin_report')
        .limit(200);

      if (fetchErr) throw fetchErr;
      if (!allReports || allReports.length === 0) {
        setRecalcProgress('Nessun report da aggiornare.');
        setTimeout(() => setRecalculating(false), 1500);
        return;
      }

      let updated = 0;
      let skipped = 0;

      for (const row of allReports) {
        const rd = row.report_data as any;
        const meta = rd?.meta;
        if (!meta || !meta.monthlyRevenue || !meta.emailPct) {
          skipped++;
          continue;
        }

        setRecalcProgress(`Ricalcolo ${updated + skipped + 1}/${allReports.length}...`);

        const popupParams = meta.hasPopup
          ? {
              hasPopup: true,
              conversionRate: meta.popupConversionRate || 0,
              monthlyVisitors: meta.monthlyVisitors || 0,
              monthlyListGrowthRate: meta.monthlyListGrowthRate || 2,
            }
          : { hasPopup: false, conversionRate: 0, monthlyVisitors: 0, monthlyListGrowthRate: 0 };

        const result = calculateAdvancedReportFromValues(
          meta.sector || 'other',
          meta.monthlyRevenue,
          meta.emailPct,
          meta.listSize || 0,
          meta.activeFlows || [],
          undefined,
          meta.emailFrequency || 'none',
          meta.aov || undefined,
          {
            conservative: meta.scenarioConservative || 15,
            moderate: meta.scenarioModerate || 35,
            aggressive: meta.scenarioAggressive || 60,
          },
          popupParams,
        );

        const { error: updateErr } = await supabase
          .from('survey_submissions')
          .update({
            report_data: {
              clientReport: result,
              meta,
            } as any,
            email_health_score: result.emailHealthScore,
            yearly_potential: result.yearlyPotential,
          })
          .eq('id', row.id);

        if (updateErr) {
          console.error(`Error updating report ${row.id}:`, updateErr);
          skipped++;
        } else {
          updated++;
        }
      }

      setRecalcProgress(`✅ ${updated} aggiornati, ${skipped} saltati`);
      setTimeout(() => {
        setRecalculating(false);
        setRecalcProgress('');
        fetchReports();
      }, 2000);
    } catch (e) {
      console.error('Bulk recalculate error:', e);
      setRecalcProgress('❌ Errore durante il ricalcolo');
      setTimeout(() => setRecalculating(false), 2000);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports, refreshKey]);

  return (
    <div className="w-full max-w-xl mx-auto mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-orange" />
          <h3 className="text-sm font-bold text-white tracking-wide uppercase">
            Report Salvati
            {!loading && reports.length > 0 && (
              <span className="ml-1.5 text-xs font-semibold text-slate-400 normal-case">({reports.length})</span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {!loading && reports.length > 0 && (
            <button
              onClick={handleBulkRecalculate}
              disabled={recalculating}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 hover:border-purple-400/50 transition-all duration-200 disabled:opacity-40 font-medium"
              title="Ricalcola tutti i report con le formule aggiornate"
            >
              {recalculating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
              {recalculating ? recalcProgress : 'Ricalcola tutti'}
            </button>
          )}
          <button
            onClick={fetchReports}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200 disabled:opacity-40"
            title="Aggiorna lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm text-center">
          {error}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 text-center text-slate-500 text-sm">
          Nessun report salvato ancora. Genera il primo qui sotto ↓
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <ReportCard key={r.id} report={r} onOpenReport={onOpenReport} />
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 mt-6">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-xs text-slate-500 font-medium shrink-0">➕ Crea nuovo report</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>
    </div>
  );
};

export default AdminReportHistory;
