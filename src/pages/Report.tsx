import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdvancedReportComponent } from '@/components/AdvancedReport';
import type { AdvancedReport } from '@/lib/reportCalculations';
import { Loader2, AlertCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

// The RPC function returns clientReport (no PII) + optional meta
interface ReportData {
  clientReport: AdvancedReport;
  meta?: {
    showInvestment?: boolean;
    clientName?: string;
    website?: string;
  };
}

const ReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) {
        setError('ID report non valido');
        setLoading(false);
        return;
      }

      // Validate UUID format to prevent injection
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!UUID_REGEX.test(id)) {
        setError('ID report non valido');
        setLoading(false);
        return;
      }

      try {
        // Use secure RPC function that only returns report_data (not PII)
        const { data, error: fetchError } = await supabase
          .rpc('get_report_by_id', { report_id: id });

        if (fetchError) {
          console.error('Fetch error:', fetchError);
          setError('Report non trovato');
          setLoading(false);
          return;
        }

        if (!data) {
          setError('Report non disponibile');
          setLoading(false);
          return;
        }

        const parsedReport = data as unknown as ReportData;
        
        if (!parsedReport.clientReport) {
          setError('Dati report non validi');
          setLoading(false);
          return;
        }

        setReportData(parsedReport);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Errore nel caricamento del report');
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-orange animate-spin mx-auto" />
          <p className="text-slate-300 text-lg">Caricamento report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h1 className="text-2xl font-bold text-white">{error}</h1>
          <p className="text-slate-400">
            Il report richiesto non è stato trovato o non è più disponibile.
          </p>
          <Link to="/">
            <Button className="bg-orange hover:bg-orange/90 text-white">
              <Home className="w-4 h-4 mr-2" />
              Crea il tuo report
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <AdvancedReportComponent
      report={reportData.clientReport}
      userName={reportData.meta?.clientName || ''}
      website={reportData.meta?.website || ''}
      investmentData={
        reportData.meta?.showInvestment
          ? { show: true, currentEmailRevenue: reportData.clientReport.currentEmailRevenue }
          : undefined
      }
      onRestart={() => window.location.href = '/'}
    />
  );
};

export default ReportPage;
