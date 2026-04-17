import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { calculateAdvancedReport, type AdvancedReport } from '@/lib/reportCalculations';
import { generateAdminReport } from '@/lib/adminReportGenerator';
import AdvancedReportComponent from '@/components/AdvancedReport';
import { ChevronLeft, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackQuizCompleted, trackCompleteRegistration } from '@/lib/facebookPixel';
import { usePartialTracking } from '@/hooks/usePartialTracking';
import { InsightCard, getInsightForStep } from '@/components/InsightCard';

// ═══ Types ═══════════════════════════════════════════════════════════════

interface FormData {
  monthlyRevenue: string;
  sector: string;
  customSector: string;
  platform: string;
  emailTool: string;
  emailRevenuePercentage: string;
  activeFlows: string[];
  segmentation: string;
  emailFrequency: string;
  listSize: string;
  motivation: string;
  website: string;
  fullName: string;
  phone: string;
  email: string;
  acceptTerms: boolean;
  _hp_field: string;
}

interface EmailValidation {
  status: 'idle' | 'valid' | 'invalid';
  message?: string;
}

// ═══ Validation ══════════════════════════════════════════════════════════

function normalizeWebsiteUrl(url: string): string {
  if (!url) return '';
  let normalized = url.trim().toLowerCase();
  if (normalized === 'privato' || normalized === 'private') return normalized;
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/\/+$/, '');
  return `https://${normalized}`;
}

function validateEmail(email: string): EmailValidation {
  if (!email?.trim()) return { status: 'idle' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { status: 'invalid', message: 'Email non valida' };
  return { status: 'valid' };
}

function validatePhone(phone: string): { valid: boolean; message?: string } {
  if (!phone?.trim()) return { valid: false, message: 'Inserisci il tuo numero' };
  if (!/^[+\d\s]+$/.test(phone.trim())) return { valid: false, message: 'Solo cifre, spazi e prefisso +' };
  if (phone.replace(/\D/g, '').length < 8) return { valid: false, message: 'Almeno 8 cifre' };
  return { valid: true };
}

// ═══ Constants ═══════════════════════════════════════════════════════════

const INSIGHT_AFTER_STEPS = [0, 4, 5];

const INITIAL_FORM: FormData = {
  monthlyRevenue: '', sector: '', customSector: '', platform: '', emailTool: '',
  emailRevenuePercentage: '', activeFlows: [], segmentation: '', emailFrequency: '',
  listSize: '', motivation: '', website: '', fullName: '', phone: '', email: '',
  acceptTerms: false, _hp_field: '',
};

// ═══ Options ═════════════════════════════════════════════════════════════

const revenueOptions = [
  { id: 'r0', label: 'Meno di 10.000€/mese', value: 'under-10k' },
  { id: 'r1', label: '10.000 – 25.000€/mese', value: '10-25k' },
  { id: 'r2', label: '25.000 – 50.000€/mese', value: '25-50k' },
  { id: 'r3', label: '50.000 – 100.000€/mese', value: '50-100k' },
  { id: 'r4', label: '100.000 – 300.000€/mese', value: '100-300k' },
  { id: 'r5', label: 'Oltre 300.000€/mese', value: '300k+' },
];

const sectorOptions = [
  { id: 's1', label: '💄 Beauty & Personal Care', value: 'beauty' },
  { id: 's2', label: '👗 Abbigliamento & Accessori', value: 'fashion' },
  { id: 's3', label: '🍔 Food & Beverage', value: 'food' },
  { id: 's4', label: '🏠 Casa & Arredamento', value: 'home' },
  { id: 's5', label: '⚡ Sport & Outdoor', value: 'sport' },
  { id: 's6', label: '🍷 Vino & Spirits', value: 'vino' },
  { id: 's7', label: '❤️ Salute & Integrazione', value: 'health' },
  { id: 's8', label: '🏢 Altro settore', value: 'other' },
];

const platformOptions = [
  { id: 'p1', label: 'Shopify', value: 'shopify' },
  { id: 'p2', label: 'WooCommerce', value: 'woocommerce' },
  { id: 'p3', label: 'Altra piattaforma', value: 'other' },
];

const emailToolOptions = [
  { id: 't1', label: 'Klaviyo', value: 'klaviyo' },
  { id: 't2', label: 'Mailchimp o simili', value: 'mailchimp' },
  { id: 't3', label: 'Non uso nessun tool', value: 'none' },
  { id: 't4', label: 'Non lo so', value: 'dont-know' },
];

const emailRevenueOptions = [
  { id: 'er0', label: 'Non lo so', value: 'dont-know' },
  { id: 'er1', label: '0 – 10%', value: '0-10' },
  { id: 'er2', label: '10% – 20%', value: '10-20' },
  { id: 'er3', label: '20% – 30%', value: '20-30' },
  { id: 'er4', label: '30% – 40%', value: '30-40' },
  { id: 'er5', label: 'Oltre il 40%', value: 'over-40' },
];

const automationOptions = [
  { id: 'a1', label: 'Benvenuto / Welcome Series', value: 'welcome' },
  { id: 'a2', label: 'Recupero Carrello', value: 'cart_recovery' },
  { id: 'a3', label: 'Recupero Checkout', value: 'checkout_recovery' },
  { id: 'a4', label: 'Browser Abbandonato', value: 'browse_abandonment' },
  { id: 'a5', label: 'Post-acquisto & Upsell', value: 'upsell' },
  { id: 'a6', label: 'Winback / Riattivazione', value: 'winback' },
  { id: 'a7', label: 'Sunset / Pulizia lista', value: 'sunset' },
  { id: 'a8', label: 'Nessun flusso attivo', value: 'none' },
];

const segmentationOptions = [
  { id: 'sg1', label: 'Mando a tutta la lista senza segmentare', value: 'blast' },
  { id: 'sg2', label: 'Segmento in modo base (clienti vs non clienti)', value: 'base' },
  { id: 'sg3', label: 'Segmentazione avanzata per comportamento e LTV', value: 'advanced' },
  { id: 'sg4', label: 'Non invio campagne regolari', value: 'no-campaigns' },
];

const frequencyOptions = [
  { id: 'f1', label: 'Nessun invio', value: 'none' },
  { id: 'f2', label: '1–2 email a settimana', value: '1-2' },
  { id: 'f3', label: '3–4 email a settimana', value: '3-4' },
  { id: 'f4', label: '5–7 email a settimana', value: '5-7' },
  { id: 'f5', label: 'Più di 7 email a settimana', value: '7+' },
];

const listSizeOptions = [
  { id: 'l1', label: 'Meno di 1.000', value: 'under-1k' },
  { id: 'l2', label: '1.000 – 5.000', value: '1-5k' },
  { id: 'l3', label: '5.000 – 10.000', value: '5-10k' },
  { id: 'l4', label: '10.000 – 30.000', value: '10-30k' },
  { id: 'l5', label: '30.000 – 50.000', value: '30-50k' },
  { id: 'l6', label: 'Oltre 50.000', value: '50k+' },
];

const motivationOptions = [
  { id: 'm1', label: 'Voglio aumentare le vendite dalle email', value: 'increase_sales' },
  { id: 'm2', label: 'Non sto ottenendo risultati dalle campagne', value: 'poor_results' },
  { id: 'm3', label: 'Voglio automatizzare il mio email marketing', value: 'automation' },
  { id: 'm4', label: 'Non so da dove iniziare', value: 'dont_know' },
  { id: 'm5', label: 'Sto valutando di cambiare agenzia/consulente', value: 'change_agency' },
];

// Step definitions
const STEPS = [
  { cat: 'Fatturato', title: "Qual è il fatturato mensile medio del tuo eCommerce?", type: 'radio' as const, field: 'monthlyRevenue' as const, options: revenueOptions },
  { cat: 'Settore', title: "In quale settore opera il tuo eCommerce?", type: 'radio' as const, field: 'sector' as const, options: sectorOptions },
  { cat: 'Piattaforma', title: "Su quale piattaforma gira il tuo store?", type: 'radio' as const, field: 'platform' as const, options: platformOptions },
  { cat: 'Email Tool', title: "Quale strumento usi per inviare le email?", type: 'radio' as const, field: 'emailTool' as const, options: emailToolOptions },
  { cat: 'Revenue Email', title: "Quanto fatturato proviene attualmente dalle email?", type: 'radio' as const, field: 'emailRevenuePercentage' as const, options: emailRevenueOptions },
  { cat: 'Automazioni', title: "Quali automazioni hai attive?", type: 'checkbox' as const, field: 'activeFlows' as const, options: automationOptions, subtitle: 'Seleziona tutte quelle presenti' },
  { cat: 'Segmentazione', title: "Come gestisci l'invio delle campagne email?", type: 'radio' as const, field: 'segmentation' as const, options: segmentationOptions },
  { cat: 'Frequenza', title: "Quante email invii a settimana?", type: 'radio' as const, field: 'emailFrequency' as const, options: frequencyOptions },
  { cat: 'Lista Email', title: "Quanti iscritti ha la tua lista email?", type: 'radio' as const, field: 'listSize' as const, options: listSizeOptions },
  { cat: 'Obiettivo', title: "Perché vuoi analizzare il tuo email marketing?", type: 'radio' as const, field: 'motivation' as const, options: motivationOptions },
  { cat: 'Il tuo store', title: "Qual è l'URL del tuo store?", type: 'input' as const, field: 'website' as const, options: [] },
];

const TOTAL_STEPS = STEPS.length;

// ═══ Analysis Screen ═════════════════════════════════════════════════════

const AnalysisScreen: React.FC<{ sectorLabel: string; onComplete: () => void }> = ({ sectorLabel, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  
  const steps = [
    { emoji: '📊', text: `Analisi settore ${sectorLabel} e benchmark di mercato` },
    { emoji: '⚙️', text: 'Valutazione automazioni attive' },
    { emoji: '💸', text: 'Calcolo revenue leak' },
    { emoji: '✨', text: 'Stima potenziale di crescita' },
    { emoji: '📄', text: 'Generazione report personalizzato' },
  ];

  useEffect(() => {
    const durations = [1200, 1000, 1500, 1000, 1300];
    const total = durations.reduce((a, b) => a + b, 0);
    const progressTimer = setInterval(() => setProgress(p => Math.min(p + 1, 100)), total / 100);
    
    let timeout: ReturnType<typeof setTimeout>;
    const advance = (i: number) => {
      if (i < durations.length) {
        timeout = setTimeout(() => { setCurrentStep(i + 1); advance(i + 1); }, durations[i]);
      } else {
        setTimeout(onComplete, 500);
      }
    };
    advance(0);
    
    return () => { clearInterval(progressTimer); clearTimeout(timeout); };
  }, []);

  // Circular progress
  const circumference = 2 * Math.PI * 55;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#121d2b] flex flex-col items-center justify-center px-4 font-['Syne',sans-serif]">
      <div className="w-full max-w-lg">
        <div className="bg-[#1a2942] border border-[#2a3a52] rounded-[18px] p-9 text-center">
          {/* Circular progress */}
          <div className="relative w-[120px] h-[120px] mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="55" fill="none" stroke="#34465e" strokeWidth="8" />
              <circle cx="60" cy="60" r="55" fill="none" stroke="#C8F135" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                className="transition-all duration-600 ease-out" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-['Bebas_Neue',sans-serif] text-[32px] text-[#f0f0eb] tracking-wider">
              {progress}%
            </span>
          </div>

          <h2 className="font-['Bebas_Neue',sans-serif] text-[26px] tracking-wider text-[#f0f0eb] mb-1">
            Stiamo analizzando i tuoi dati
          </h2>
          <p className="text-[13px] text-[#888] mb-6">
            Preparazione del report personalizzato...
          </p>

          <div className="flex flex-col gap-[2px] mb-5 text-left">
            {steps.map((step, i) => {
              const isDone = i < currentStep;
              const isActive = i === currentStep;
              return (
                <div key={i} className={`flex items-center gap-[10px] py-[9px] px-[14px] rounded-lg text-[13px] font-medium transition-all duration-300
                  ${isDone ? 'text-[#C8F135]' : isActive ? 'text-[#f0f0eb] bg-[rgba(200,241,53,0.05)]' : 'text-[#5a5a5a]'}`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] flex-shrink-0
                    ${isDone ? 'border-[#C8F135] bg-[rgba(200,241,53,0.1)]' : isActive ? 'border-[#ff8c42] bg-[rgba(255,140,66,0.1)] animate-pulse' : 'border-[#34465e]'}`}>
                    {isDone ? '✓' : step.emoji}
                  </div>
                  <span>{step.text}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-[6px] text-[11px] text-[#5a5a5a] mt-4">
            🔒 Analisi sicura & riservata
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══ Disqualified Screen ═════════════════════════════════════════════════

const DisqualifiedScreen: React.FC = () => (
  <div className="min-h-screen bg-[#121d2b] flex flex-col items-center justify-center px-4 font-['Syne',sans-serif]">
    <div className="w-full max-w-md text-center">
      <div className="text-6xl mb-6">😔</div>
      <h1 className="text-2xl font-bold text-[#f0f0eb] mb-4">
        Al momento non siamo il partner giusto per te
      </h1>
      <p className="text-[#888] mb-8">
        I nostri servizi sono ottimizzati per e-commerce con fatturato superiore a 10.000€/mese.
      </p>
      <div className="bg-[#1a2942] rounded-2xl p-6 border border-[#2a3a52]">
        <div className="flex items-center justify-center gap-2 text-[#C8F135] font-medium mb-3">
          <span>✨</span>
          <span>Risorse gratuite per te</span>
        </div>
        <p className="text-[#aaa] text-sm mb-4">
          Scarica la nostra guida gratuita per far crescere il tuo e-commerce con l'email marketing.
        </p>
        <a href="https://gamma.app/docs/Email-Marketing-Secret-2025-mwanhid9h9buczz" target="_blank" rel="noopener noreferrer"
          className="block w-full py-3 px-6 bg-[#C8F135] text-[#121d2b] rounded-xl font-semibold hover:bg-[#d4f545] transition-colors text-center">
          Scarica Guida Gratuita
        </a>
      </div>
      <p className="text-[#5a5a5a] text-sm mt-6">
        Quando il tuo business crescerà, saremo qui ad aspettarti! 🚀
      </p>
    </div>
  </div>
);

// ═══ Main Component ══════════════════════════════════════════════════════

const EmailMarketingSurvey: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<AdvancedReport | null>(null);
  const [phase, setPhase] = useState<'quiz' | 'insight' | 'analyzing' | 'gate' | 'report' | 'disqualified'>('quiz');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [emailValidation, setEmailValidation] = useState<EmailValidation>({ status: 'idle' });
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM });

  // Partial tracking
  const currentStepName = STEPS[currentStep]?.field || 'unknown';
  const { markCompleted } = usePartialTracking({
    surveyType: 'email_marketing',
    formData: formData as unknown as Record<string, unknown>,
    currentStep,
    stepName: currentStepName,
    totalSteps: TOTAL_STEPS,
    enabled: phase === 'quiz' || phase === 'insight',
  });

  // ── Navigation ──────────────────────────────────────────────────────

  const goToNextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const advanceFromCurrentStep = useCallback(() => {
    // Check if we should show insight
    if (INSIGHT_AFTER_STEPS.includes(currentStep)) {
      setPhase('insight');
    } else if (currentStep === TOTAL_STEPS - 1) {
      // Last step → go to analyzing
      setPhase('analyzing');
    } else {
      goToNextStep();
    }
  }, [currentStep, goToNextStep]);

  const handleInsightContinue = useCallback(() => {
    setPhase('quiz');
    if (currentStep === TOTAL_STEPS - 1) {
      setPhase('analyzing');
    } else {
      goToNextStep();
    }
  }, [currentStep, goToNextStep]);

  // ── Event Handlers ──────────────────────────────────────────────────

  const handleRadioSelect = useCallback(async (field: keyof FormData, value: string) => {
    setSelectedValue(value);
    setFormData(prev => ({ ...prev, [field]: value }));

    // Custom sector → don't auto-advance
    if (field === 'sector' && value === 'other') {
      setTimeout(() => setSelectedValue(null), 400);
      return;
    }

    // Disqualify on low revenue
    if (field === 'monthlyRevenue' && value === 'under-10k') {
      setTimeout(() => {
        setSelectedValue(null);
        setPhase('disqualified');
      }, 400);
      return;
    }

    // Auto-advance with delay
    setTimeout(() => {
      setSelectedValue(null);
      advanceFromCurrentStep();
    }, 400);
  }, [advanceFromCurrentStep]);

  const handleCheckboxChange = useCallback((value: string, checked: boolean) => {
    setFormData(prev => {
      let newFlows: string[];
      if (value === 'none') {
        // "Nessun flusso" is exclusive
        newFlows = checked ? ['none'] : [];
      } else {
        newFlows = checked
          ? [...prev.activeFlows.filter(f => f !== 'none'), value]
          : prev.activeFlows.filter(f => f !== value);
      }
      return { ...prev, activeFlows: newFlows };
    });
  }, []);

  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'email' && typeof value === 'string') {
      setEmailValidation(validateEmail(value));
    }
  }, []);

  // ── Sector Label ────────────────────────────────────────────────────

  const getSectorLabel = useCallback(() => {
    if (formData.sector === 'other' && formData.customSector) return formData.customSector;
    const s = sectorOptions.find(s => s.value === formData.sector);
    return s?.label.replace(/^[^\s]+ /, '') || 'E-commerce';
  }, [formData.sector, formData.customSector]);

  // ── Save & Submit ───────────────────────────────────────────────────

  const saveLeadToDatabase = useCallback(async (): Promise<string | null> => {
    if (formData._hp_field) return null;
    try {
      const { data, error } = await supabase.from('survey_submissions')
        .insert({
          company_name: '',
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          website: formData.website ? normalizeWebsiteUrl(formData.website) : null,
          status: 'in_progress',
          qualified: null,
        } as never)
        .select('id').single();
      if (error) { console.error('Lead save error:', error); return null; }
      if (data) { setLeadId(data.id); return data.id; }
      return null;
    } catch (err) { console.error('Error saving lead:', err); return null; }
  }, [formData]);

  const handleGateSubmit = useCallback(async () => {
    if (formData._hp_field) {
      setPhase('report');
      return;
    }
    setIsSubmitting(true);
    try {
      // Save lead first
      const newLeadId = await saveLeadToDatabase();

      // Calculate report
      const advancedReport = calculateAdvancedReport(
        formData.sector, formData.monthlyRevenue, formData.emailRevenuePercentage,
        formData.listSize, formData.activeFlows,
        formData.sector === 'other' ? formData.customSector : undefined,
        formData.emailFrequency
      );

      const adminReport = generateAdminReport(formData as any, advancedReport);
      const reportUrl = newLeadId ? `https://quiz-to-customer.lovable.app/report/${newLeadId}` : null;
      const normalizedWebsite = formData.website ? normalizeWebsiteUrl(formData.website) : null;

      const dataToSend = {
        type: 'admin_report',
        timestamp: new Date().toISOString(),
        source: 'email-marketing-quiz',
        reportUrl,
        quickSummary: {
          leadName: formData.fullName,
          leadEmail: formData.email,
          leadPhone: formData.phone,
          companyName: '',
          website: normalizedWebsite,
          sector: advancedReport.sectorBenchmark.label,
          monthlyRevenue: advancedReport.monthlyRevenue,
          platform: formData.platform,
          emailTool: formData.emailTool,
          segmentation: formData.segmentation,
          emailHealthScore: advancedReport.emailHealthScore,
          yearlyPotential: advancedReport.yearlyPotential,
          leadQuality: adminReport.consultingNotes.leadQuality,
          priorityLevel: adminReport.consultingNotes.priorityLevel,
          motivation: formData.motivation,
          motivationLabel: adminReport.quizResponses.motivationLabel,
          acceptedTerms: true,
          reportUrl,
        },
        adminReport,
        clientReport: advancedReport,
      };

      // Update DB
      const updateData = {
        sector: formData.sector,
        custom_sector: formData.sector === 'other' ? formData.customSector : null,
        monthly_revenue: formData.monthlyRevenue,
        email_revenue_percentage: formData.emailRevenuePercentage,
        list_size: formData.listSize,
        active_flows: formData.activeFlows,
        motivation: formData.motivation,
        email_health_score: advancedReport.emailHealthScore,
        yearly_potential: advancedReport.yearlyPotential,
        current_email_revenue: advancedReport.currentEmailRevenue,
        benchmark_email_revenue: advancedReport.benchmarkEmailRevenue,
        revenue_gap: advancedReport.revenueGap,
        lead_quality: adminReport.consultingNotes.leadQuality,
        status: 'completed',
        qualified: true,
        make_synced: false,
        ghl_synced: false,
        report_data: dataToSend,
      };

      if (newLeadId) {
        await supabase.from('survey_submissions').update(updateData as never).eq('id', newLeadId);
      } else {
        await supabase.from('survey_submissions').insert({
          company_name: '', full_name: formData.fullName, email: formData.email,
          phone: formData.phone || null, website: normalizedWebsite, ...updateData,
        } as never);
      }

      // FB Pixel
      trackCompleteRegistration({
        sector: advancedReport.sectorBenchmark.label,
        email: formData.email,
        companyName: '',
      });

      // Webhook
      try {
        const webhookResponse = await supabase.functions.invoke('submit-webhook', {
          body: { submissionData: dataToSend, submissionId: newLeadId },
        });
        if (webhookResponse.data?.webhookSent && newLeadId) {
          await supabase.from('survey_submissions').update({ make_synced: true } as never).eq('id', newLeadId);
          trackQuizCompleted({
            sector: advancedReport.sectorBenchmark.label,
            yearlyPotential: advancedReport.yearlyPotential,
            emailHealthScore: advancedReport.emailHealthScore,
            leadQuality: adminReport.consultingNotes.leadQuality,
            monthlyRevenue: advancedReport.monthlyRevenue,
          });
        }
      } catch (e) { console.error('Webhook failed:', e); }

      await markCompleted(newLeadId || undefined);
      setReport(advancedReport);
      setPhase('report');
    } catch (error) {
      console.error('Submit error:', error);
      toast({ title: 'Errore', description: 'Si è verificato un errore. Riprova.', variant: 'destructive' });
      setIsSubmitting(false);
    }
  }, [formData, saveLeadToDatabase, markCompleted]);

  const handleRestart = useCallback(() => {
    setCurrentStep(0);
    setReport(null);
    setPhase('quiz');
    setIsSubmitting(false);
    setLeadId(null);
    setEmailValidation({ status: 'idle' });
    setFormData({ ...INITIAL_FORM });
  }, []);

  // ═══ Phase Rendering ═══════════════════════════════════════════════

  // Analysis
  if (phase === 'analyzing') {
    return <AnalysisScreen sectorLabel={getSectorLabel()} onComplete={() => setPhase('gate')} />;
  }

  // Report
  if (phase === 'report' && report) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <AdvancedReportComponent report={report} phone={formData.phone} userName={formData.fullName}
          userEmail={formData.email} website={formData.website} onRestart={handleRestart} />
      </motion.div>
    );
  }

  // Disqualified
  if (phase === 'disqualified') return <DisqualifiedScreen />;

  // Gate (contact form)
  if (phase === 'gate') {
    const canSubmit = formData.fullName.trim() && validatePhone(formData.phone).valid
      && formData.email.trim() && emailValidation.status !== 'invalid' && formData.acceptTerms && !isSubmitting;

    const previewReport = calculateAdvancedReport(
      formData.sector, formData.monthlyRevenue, formData.emailRevenuePercentage,
      formData.listSize, formData.activeFlows,
      formData.sector === 'other' ? formData.customSector : undefined,
      formData.emailFrequency
    );
    const previewGap = previewReport.revenueGap;
    const yearlyGap = previewGap * 12;
    const fmtMonth = previewGap.toLocaleString('it-IT', { maximumFractionDigits: 0 });
    const fmtYear = yearlyGap.toLocaleString('it-IT', { maximumFractionDigits: 0 });

    return (
      <div className="min-h-screen bg-[#121d2b] flex flex-col items-center justify-center px-4 font-['Syne',sans-serif]">
        <div className="w-full max-w-[680px] mx-auto">
          <div className="bg-[#1a2942] border border-[#2a3a52] rounded-[18px] overflow-hidden">
            {/* Top section */}
            <div className="bg-gradient-to-br from-[#0d1623] to-[#111] p-8 text-center relative overflow-hidden">
              <div className="absolute -top-[60%] left-1/2 -translate-x-1/2 w-[360px] h-[360px] bg-[radial-gradient(circle,rgba(200,241,53,0.07)_0%,transparent_65%)] pointer-events-none" />
              <div className="w-[52px] h-[52px] bg-[rgba(200,241,53,0.1)] border border-[rgba(200,241,53,0.3)] rounded-full flex items-center justify-center mx-auto mb-4 text-xl relative z-10">
                ✓✓
              </div>
              <h2 className="font-['Bebas_Neue',sans-serif] text-[32px] tracking-wider text-[#f0f0eb] relative z-10">
                Analisi completata!
              </h2>
              <p className="text-[14px] text-[#888] max-w-[340px] mx-auto relative z-10 mt-2 leading-relaxed">
                Inserisci i tuoi dati per ricevere il report operativo personalizzato.
              </p>
            </div>

            {/* Revenue gap highlight + unlock invite */}
            <div className="mx-5 mt-5 bg-[rgba(255,59,59,0.06)] border border-[rgba(255,59,59,0.2)] rounded-xl p-5">
              <div className="text-center mb-3">
                <span className="font-['DM_Mono',monospace] text-[10px] tracking-[2px] uppercase text-[#888]">Ecco quanto stai perdendo ogni mese</span>
                <div className="font-['Bebas_Neue',sans-serif] text-[42px] tracking-wide text-[#ff3b3b] leading-tight mt-1">
                  {fmtMonth}€<span className="text-[20px] text-[#888]">/mese</span>
                </div>
                <div className="font-['Bebas_Neue',sans-serif] text-[22px] tracking-wide text-[#ff3b3b]/70 leading-tight">
                  {fmtYear}€<span className="text-[16px] text-[#888]">/anno</span>
                </div>
              </div>
              <div className="h-px bg-[#2a3a52] my-3" />
              <p className="text-[13px] text-[#C8F135] font-semibold mb-2">Sblocca il report completo:</p>
              <ul className="text-[13px] text-[#888] leading-relaxed space-y-1.5">
                <li className="flex items-start gap-2"><span className="text-[#C8F135] mt-0.5">✓</span> Roadmap personalizzata</li>
                <li className="flex items-start gap-2"><span className="text-[#C8F135] mt-0.5">✓</span> Scenari di crescita a 3-6-12 mesi</li>
                <li className="flex items-start gap-2"><span className="text-[#C8F135] mt-0.5">✓</span> Piano d'azione con priorità</li>
              </ul>
            </div>

            {/* Form */}
            <div className="p-5">
              {/* Honeypot */}
              <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                <input type="text" value={formData._hp_field} onChange={e => handleInputChange('_hp_field', e.target.value)} tabIndex={-1} autoComplete="new-password" />
              </div>

              <span className="font-['DM_Mono',monospace] text-[10px] tracking-[2px] uppercase text-[#5a5a5a] block mb-3">
                // I tuoi dati
              </span>

              <div className="flex flex-col gap-[9px] mb-4">
                <div>
                  <span className="text-[11px] text-[#5a5a5a] uppercase tracking-wider block mb-1">Nome e Cognome</span>
                  <input type="text" value={formData.fullName} onChange={e => handleInputChange('fullName', e.target.value)}
                    className="w-full py-[13px] px-[15px] bg-[#121d2b] border border-[#2a3a52] rounded-[10px] text-[#f0f0eb] font-['Syne',sans-serif] text-[14px] font-medium outline-none focus:border-[rgba(200,241,53,0.4)] transition-colors placeholder:text-[#252525]"
                    placeholder="Mario Rossi" autoComplete="name" />
                </div>
                <div>
                  <span className="text-[11px] text-[#5a5a5a] uppercase tracking-wider block mb-1">Email</span>
                  <input type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)}
                    className="w-full py-[13px] px-[15px] bg-[#121d2b] border border-[#2a3a52] rounded-[10px] text-[#f0f0eb] font-['Syne',sans-serif] text-[14px] font-medium outline-none focus:border-[rgba(200,241,53,0.4)] transition-colors placeholder:text-[#252525]"
                    placeholder="nome@tuaemail.com" autoComplete="email" inputMode="email" />
                  {emailValidation.status === 'invalid' && (
                    <p className="text-[#ff3b3b] text-xs mt-1">{emailValidation.message}</p>
                  )}
                </div>
                <div>
                  <span className="text-[11px] text-[#5a5a5a] uppercase tracking-wider block mb-1">WhatsApp / Telefono</span>
                  <input type="tel" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)}
                    className="w-full py-[13px] px-[15px] bg-[#121d2b] border border-[#2a3a52] rounded-[10px] text-[#f0f0eb] font-['Syne',sans-serif] text-[14px] font-medium outline-none focus:border-[rgba(200,241,53,0.4)] transition-colors placeholder:text-[#252525]"
                    placeholder="+39 xxx xxx xxxx" autoComplete="tel" />
                  {formData.phone.trim() && !validatePhone(formData.phone).valid && (
                    <p className="text-[#ff3b3b] text-xs mt-1">{validatePhone(formData.phone).message}</p>
                  )}
                </div>
              </div>

              {/* Privacy */}
              <div className="flex items-start gap-[10px] mb-4 text-[12px] text-[#888] leading-relaxed">
                <div onClick={() => handleInputChange('acceptTerms', !formData.acceptTerms)}
                  className={`w-4 h-4 border-2 rounded-[3px] flex-shrink-0 mt-[1px] cursor-pointer flex items-center justify-center transition-all
                    ${formData.acceptTerms ? 'bg-[#C8F135] border-[#C8F135]' : 'border-[#34465e] bg-[#121d2b]'}`}>
                  {formData.acceptTerms && <span className="text-[10px] text-[#121d2b] font-bold">✓</span>}
                </div>
                <span>
                  Acconsento al trattamento dei dati ai sensi della <a href="/privacy" target="_blank" className="text-[#C8F135] underline">Privacy Policy</a>. 
                  Fornendo il mio numero, accetto di ricevere messaggi per il report personalizzato.
                </span>
              </div>

              {/* Submit */}
              <button onClick={handleGateSubmit} disabled={!canSubmit}
                className={`w-full py-4 rounded-[10px] font-['Syne',sans-serif] text-[15px] font-bold flex items-center justify-center gap-2 transition-all
                  ${canSubmit ? 'bg-[#C8F135] text-[#121d2b] hover:bg-[#d4f545] hover:-translate-y-[1px] cursor-pointer' : 'bg-[#C8F135]/60 text-[#121d2b]/60 cursor-not-allowed'}`}>
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Generazione report...</>
                ) : (
                  <>Sblocca il Report Completo<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></>
                )}
              </button>

              <p className="text-center text-[#5a5a5a] text-[11px] mt-3">
                🔒 Dati al sicuro. Niente spam, solo il tuo report.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ Quiz Phase ════════════════════════════════════════════════════

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;

  // Insight interstitial
  if (phase === 'insight') {
    const insightData = getInsightForStep(currentStep, formData as unknown as Record<string, unknown>);
    if (!insightData) { handleInsightContinue(); return null; }
    return (
      <div className="min-h-screen bg-[#121d2b] flex flex-col items-center justify-center px-4 font-['Syne',sans-serif]">
        <div className="w-full max-w-[680px] mx-auto">
          <div className="bg-[#1a2942] border border-[#2a3a52] rounded-[18px] overflow-hidden">
            {/* Progress */}
            <div className="h-1 bg-[#2a3a52] rounded-t-[18px] overflow-hidden">
              <div className="h-full bg-[#C8F135] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between px-5 pt-3">
              <span className="font-['DM_Mono',monospace] text-[11px] text-[#5a5a5a] tracking-wider">ANALISI PRELIMINARE</span>
              <span className="font-['DM_Mono',monospace] text-[11px] text-[#C8F135]">INSIGHT</span>
            </div>
            {/* Back */}
            <div className="px-5 pt-3">
              <button onClick={() => { setPhase('quiz'); }} className="flex items-center gap-[6px] text-[#5a5a5a] text-[13px] font-['Syne',sans-serif] hover:text-[#888] transition-colors">
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>
            </div>
            <div className="p-5">
              <InsightCard data={insightData} onContinue={handleInsightContinue} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121d2b] font-['Syne',sans-serif] text-[#f0f0eb]">
      <div className="max-w-[680px] mx-auto px-[18px] relative z-[1]">
        {/* Header */}
        <header className="pt-6 text-center">
          <div className="font-['Bebas_Neue',sans-serif] text-xl tracking-[5px] text-[#C8F135]">
            MAILIFT
          </div>
        </header>

        {/* Hero */}
        <div className="pt-9 pb-7 text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(200,241,53,0.1)] border border-[rgba(200,241,53,0.25)] rounded-full px-[14px] py-[5px] text-[11px] font-semibold tracking-[2px] uppercase text-[#C8F135] mb-5">
            <span className="w-[6px] h-[6px] bg-[#C8F135] rounded-full animate-pulse" />
            Revenue Leak Audit
          </div>
          <h1 className="font-['Bebas_Neue',sans-serif] text-[clamp(48px,11vw,80px)] leading-[0.92] tracking-wider mb-4">
            Quanto stai<span className="text-[#C8F135] block">perdendo ogni mese?</span>
          </h1>
          <p className="text-[16px] text-[#888] max-w-[440px] mx-auto mb-7 leading-relaxed">
            Hai una lista. Hai un eCommerce che fattura.<br />
            Ma sai quanta <strong className="text-[#f0f0eb]">revenue</strong> stai lasciando sul tavolo ogni mese?
          </p>
        </div>

        {/* Quiz Card */}
        <div className="bg-[#1a2942] border border-[#2a3a52] rounded-[18px] mb-12 pb-1">
          {/* Progress bar */}
          <div className="h-1 bg-[#2a3a52] rounded-t-[18px] overflow-hidden">
            <div className="h-full bg-[#C8F135] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between px-5 pt-3">
            <span className="font-['DM_Mono',monospace] text-[11px] text-[#5a5a5a] tracking-wider">
              DOMANDA {currentStep + 1} / {TOTAL_STEPS}
            </span>
            <span className="font-['DM_Mono',monospace] text-[11px] text-[#C8F135]">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Back button */}
          {currentStep > 0 && (
            <div className="px-5 pt-3">
              <button onClick={handlePrevious} className="flex items-center gap-[6px] text-[#5a5a5a] text-[13px] hover:text-[#888] transition-colors">
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>
            </div>
          )}

          {/* Question */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentStep} custom={direction}
              initial={{ x: direction > 0 ? 80 : -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction < 0 ? 80 : -80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="p-5 pt-6">
              <div className="font-['DM_Mono',monospace] text-[10px] tracking-[2px] uppercase text-[#C8F135] mb-2">
                {step.cat}
              </div>
              <h2 className="text-[18px] font-semibold leading-[1.35] text-[#f0f0eb] mb-5">
                {step.title}
              </h2>
              {step.subtitle && (
                <p className="text-[11px] text-[#888] mb-3 -mt-3">{step.subtitle}</p>
              )}

              {/* Radio options */}
              {step.type === 'radio' && (
                <div className="flex flex-col gap-[7px]">
                  {step.options?.map(opt => {
                    const isSelected = formData[step.field as keyof FormData] === opt.value;
                    return (
                      <button key={opt.id}
                        onClick={() => handleRadioSelect(step.field as keyof FormData, opt.value)}
                        className={`flex items-center gap-3 py-[13px] px-[15px] rounded-[10px] border text-[14px] font-medium text-left transition-all select-none
                          ${isSelected
                            ? 'border-[#C8F135] bg-[rgba(200,241,53,0.1)] text-[#f0f0eb]'
                            : 'border-[#2a3a52] bg-[#121d2b] text-[#aaa] hover:border-[rgba(200,241,53,0.35)] hover:bg-[rgba(200,241,53,0.05)] hover:text-[#f0f0eb]'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                          ${isSelected ? 'border-[#C8F135] bg-[#C8F135]' : 'border-[#34465e]'}`}>
                          {isSelected && <span className="w-[5px] h-[5px] bg-[#121d2b] rounded-full" />}
                        </div>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}

                  {/* Custom sector input */}
                  {step.field === 'sector' && formData.sector === 'other' && (
                    <div className="mt-3 space-y-3">
                      <input value={formData.customSector} onChange={e => handleInputChange('customSector', e.target.value)}
                        placeholder="Specifica il tuo settore..."
                        className="w-full py-[13px] px-[15px] bg-[#121d2b] border border-[#2a3a52] rounded-[10px] text-[#f0f0eb] font-['Syne',sans-serif] text-[14px] font-medium outline-none focus:border-[rgba(200,241,53,0.45)] transition-colors placeholder:text-[#252525]"
                        autoFocus />
                      <button onClick={() => { if (formData.customSector.trim()) advanceFromCurrentStep(); }}
                        className="w-full py-4 bg-[#C8F135] text-[#121d2b] rounded-[10px] font-['Syne',sans-serif] text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#d4f545] transition-all">
                        Continua <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Checkbox options */}
              {step.type === 'checkbox' && (
                <div className="flex flex-col gap-[7px]">
                  {step.options?.map(opt => {
                    const isSelected = formData.activeFlows.includes(opt.value);
                    return (
                      <button key={opt.id}
                        onClick={() => handleCheckboxChange(opt.value, !isSelected)}
                        className={`flex items-center gap-3 py-[13px] px-[15px] rounded-[10px] border text-[14px] font-medium text-left transition-all select-none
                          ${isSelected
                            ? 'border-[#C8F135] bg-[rgba(200,241,53,0.1)] text-[#f0f0eb]'
                            : 'border-[#2a3a52] bg-[#121d2b] text-[#aaa] hover:border-[rgba(200,241,53,0.35)] hover:bg-[rgba(200,241,53,0.05)] hover:text-[#f0f0eb]'}`}>
                        <div className={`w-4 h-4 rounded-[3px] border-2 flex-shrink-0 flex items-center justify-center transition-all
                          ${isSelected ? 'border-[#C8F135] bg-[#C8F135]' : 'border-[#34465e]'}`}>
                          {isSelected && <span className="text-[10px] text-[#121d2b] font-bold">✓</span>}
                        </div>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Input (URL) */}
              {step.type === 'input' && (
                <div>
                  <input value={formData.website} onChange={e => handleInputChange('website', e.target.value)}
                    placeholder="www.tuosito.com"
                    className="w-full py-[13px] px-[15px] bg-[#121d2b] border border-[#2a3a52] rounded-[10px] text-[#f0f0eb] font-['Syne',sans-serif] text-[14px] font-medium outline-none focus:border-[rgba(200,241,53,0.45)] transition-colors placeholder:text-[#252525]" />
                  <p className="mt-[6px] text-[11px] text-[#5a5a5a]">
                    Puoi scrivere "privato" se preferisci non condividerlo.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer buttons */}
          {(step.type === 'checkbox' || step.type === 'input') && (
            <div className="px-5 pb-5">
              <button onClick={() => {
                if (step.type === 'checkbox' && formData.activeFlows.length === 0) return;
                if (step.type === 'input' && !formData.website.trim()) return;
                advanceFromCurrentStep();
              }}
                disabled={(step.type === 'checkbox' && formData.activeFlows.length === 0) || (step.type === 'input' && !formData.website.trim())}
                className="w-full py-4 bg-[#C8F135] text-[#121d2b] rounded-[10px] font-['Syne',sans-serif] text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#d4f545] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Continua
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center pb-9 text-[11px] text-[#5a5a5a]">
          © 2025 <span className="text-[#C8F135]">Mailift</span>. Revenue Leak Audit.
        </footer>
      </div>
    </div>
  );
};

export default EmailMarketingSurvey;
