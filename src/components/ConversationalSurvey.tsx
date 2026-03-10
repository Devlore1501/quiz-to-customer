import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { calculateAdvancedReport, type AdvancedReport } from '@/lib/reportCalculations';
import { generateAdminReport } from '@/lib/adminReportGenerator';
import AdvancedReportComponent from '@/components/AdvancedReport';
import { ChevronLeft, Check, Loader2, CheckCircle2, Circle, BarChart3, Users, TrendingUp, FileText, Sparkles, XCircle, Globe, AlertCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePartialTracking } from '@/hooks/usePartialTracking';

interface FormData {
  sector: string;
  customSector: string;
  monthlyRevenue: string;
  adsInvestment: string;
  emailRevenuePercentage: string;
  emailFrequency: string;
  listSize: string;
  activeFlows: string[];
  website: string;
  companyName: string;
  fullName: string;
  phone: string;
  email: string;
  motivation: string;
  emailSatisfaction: string;
  acceptTerms: boolean;
  _hp_field: string;
}

interface EmailValidation {
  status: 'idle' | 'valid' | 'invalid' | 'warning';
  message?: string;
}

interface WebsiteVerification {
  status: 'idle' | 'checking' | 'valid' | 'invalid';
  message?: string;
  checks?: {
    isReachable: boolean;
    isEcommerce: boolean;
    sectorMatch: boolean;
    isBlacklisted: boolean;
  };
  confidence?: number;
}

// Simple email validation
function validateEmail(email: string): EmailValidation {
  if (!email || !email.includes('@')) {
    return { status: 'idle' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { status: 'invalid', message: 'Email non valida' };
  }
  return { status: 'valid' };
}

function isValidUrlFormat(url: string): { isValid: boolean; normalized: string; error?: string } {
  let normalized = url.trim().toLowerCase();
  if (!normalized) {
    return { isValid: false, normalized, error: 'Inserisci il tuo sito web' };
  }
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized.replace(/^www\./, '');
  }
  const urlPattern = /^https?:\/\/([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
  if (!urlPattern.test(normalized)) {
    return { isValid: false, normalized, error: 'Formato URL non valido' };
  }
  const validTlds = ['com', 'it', 'eu', 'net', 'org', 'io', 'co', 'shop', 'store', 'online', 'info', 'biz', 'me', 'app', 'dev', 'tech'];
  const domain = normalized.replace(/^https?:\/\//, '').split('/')[0];
  const tld = domain.split('.').pop();
  if (!tld || !validTlds.includes(tld) && tld.length < 2) {
    return { isValid: false, normalized, error: 'Dominio non riconosciuto' };
  }
  return { isValid: true, normalized };
}

function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Typing effect component
const TypingText = ({ text, onComplete, className = "" }: { text: string; onComplete?: () => void; className?: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, 30);
    return () => clearInterval(interval);
  }, [text, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
};

// Analysis screen component
const AnalysisScreen = ({ sectorLabel, userName, onComplete }: { sectorLabel: string; userName: string; onComplete: () => void }) => {
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [counters, setCounters] = useState({ revenue: 0, subscribers: 0, opportunities: 0 });
  const [tipIndex, setTipIndex] = useState(0);
  
  const analysisSteps = [
    { icon: BarChart3, text: `Analisi settore ${sectorLabel}`, duration: 1200 },
    { icon: TrendingUp, text: 'Calcolo benchmark di mercato', duration: 1000 },
    { icon: Users, text: 'Valutazione automazioni attive', duration: 1500 },
    { icon: Sparkles, text: 'Stima potenziale di crescita', duration: 1000 },
    { icon: FileText, text: `Generazione report per ${userName.split(' ')[0]}`, duration: 1300 }
  ];
  
  const tips = [
    `Le aziende del settore ${sectorLabel} generano in media il 25% del fatturato dall'email`,
    "Il recupero carrello può aumentare le vendite del 15%",
    "Una lista email ben segmentata converte 3x di più",
    "Le automazioni possono generare revenue 24/7",
    "L'email marketing ha un ROI medio di 42€ per ogni 1€ speso"
  ];
  
  const targetCounters = { revenue: 45000, subscribers: 8500, opportunities: 7 };

  useEffect(() => {
    const totalDuration = analysisSteps.reduce((acc, step) => acc + step.duration, 0);
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 1, 100));
    }, totalDuration / 100);

    let stepTimeout: ReturnType<typeof setTimeout>;
    const advanceStep = (stepIndex: number) => {
      if (stepIndex < analysisSteps.length) {
        stepTimeout = setTimeout(() => {
          setCurrentAnalysisStep(stepIndex + 1);
          advanceStep(stepIndex + 1);
        }, analysisSteps[stepIndex].duration);
      } else {
        setTimeout(onComplete, 500);
      }
    };
    advanceStep(0);

    const counterDuration = 4000;
    const counterSteps = 60;
    let counterStep = 0;
    const counterInterval = setInterval(() => {
      counterStep++;
      const progressVal = counterStep / counterSteps;
      const eased = 1 - Math.pow(1 - progressVal, 3);
      setCounters({
        revenue: Math.round(targetCounters.revenue * eased),
        subscribers: Math.round(targetCounters.subscribers * eased),
        opportunities: Math.round(targetCounters.opportunities * eased)
      });
      if (counterStep >= counterSteps) clearInterval(counterInterval);
    }, counterDuration / counterSteps);

    const tipInterval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % tips.length);
    }, 2500);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stepTimeout);
      clearInterval(counterInterval);
      clearInterval(tipInterval);
    };
  }, []);

  return (
    <motion.div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="w-full max-w-lg">
        <motion.div className="text-center mb-10" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="inline-block mb-4">
            <div className="w-16 h-16 rounded-full border-4 border-orange border-t-transparent" />
          </motion.div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Stiamo analizzando i tuoi dati, {userName.split(' ')[0]}
          </h1>
          <p className="text-slate-400">Preparazione del report personalizzato...</p>
        </motion.div>

        <motion.div className="bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-700" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
          <div className="space-y-4">
            {analysisSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentAnalysisStep;
              const isCurrent = index === currentAnalysisStep;
              return (
                <motion.div key={index} className="flex items-center gap-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + index * 0.1 }}>
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      </motion.div>
                    ) : isCurrent ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                        <Loader2 className="w-6 h-6 text-orange" />
                      </motion.div>
                    ) : (
                      <Circle className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className={`w-5 h-5 ${isCompleted ? 'text-green-500' : isCurrent ? 'text-orange' : 'text-slate-500'}`} />
                    <span className={`text-sm ${isCompleted ? 'text-green-400' : isCurrent ? 'text-white' : 'text-slate-500'}`}>{step.text}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div className="mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-orange to-orange/80 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
          </div>
          <p className="text-center text-slate-400 text-sm mt-2">Elaborazione {progress}%</p>
        </motion.div>

        <motion.div className="grid grid-cols-3 gap-4 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="bg-slate-800/30 rounded-xl p-4 text-center border border-slate-700/50">
            <p className="text-2xl font-bold text-orange">€{counters.revenue.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Fatturato analizzato</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-4 text-center border border-slate-700/50">
            <p className="text-2xl font-bold text-orange">{counters.subscribers.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Iscritti valutati</p>
          </div>
          <div className="bg-slate-800/30 rounded-xl p-4 text-center border border-slate-700/50">
            <p className="text-2xl font-bold text-orange">{counters.opportunities}</p>
            <p className="text-xs text-slate-400 mt-1">Opportunità</p>
          </div>
        </motion.div>

        <motion.div className="bg-orange/10 border border-orange/20 rounded-xl p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" />
            <AnimatePresence mode="wait">
              <motion.p key={tipIndex} className="text-sm text-slate-300" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                💡 {tips[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Disqualified screen component
const DisqualifiedScreen = ({ userName }: { userName: string }) => {
  return (
    <motion.div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="w-full max-w-md text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="text-6xl mb-6">
          😔
        </motion.div>
        <motion.h1 className="text-2xl md:text-3xl font-bold text-white mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {userName.split(' ')[0]}, al momento non siamo il partner giusto per te
        </motion.h1>
        <motion.p className="text-slate-400 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          I nostri servizi sono ottimizzati per e-commerce con fatturato superiore a 15.000€/mese e investimento attivo in advertising.
        </motion.p>
        <motion.div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center justify-center gap-2 text-orange font-medium mb-3">
            <Sparkles className="w-5 h-5" />
            <span>Risorse gratuite per te</span>
          </div>
          <p className="text-slate-300 text-sm mb-4">
            Nel frattempo, scarica la nostra guida gratuita per far crescere il tuo e-commerce con l'email marketing.
          </p>
          <motion.a href="https://gamma.app/docs/Email-Marketing-Secret-2025-mwanhid9h9buczz" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="inline-block w-full py-3 px-6 bg-orange text-white rounded-xl font-semibold hover:bg-orange/90 transition-colors">
            Scarica Guida Gratuita
          </motion.a>
        </motion.div>
        <motion.p className="text-slate-500 text-sm mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          Quando il tuo business crescerà, saremo qui ad aspettarti! 🚀
        </motion.p>
      </div>
    </motion.div>
  );
};

// Step types
type StepType = 'text-input' | 'radio' | 'checkbox' | 'website' | 'email' | 'terms';

interface Step {
  id: string;
  getMessage: (data: FormData) => string;
  type: StepType;
  field: keyof FormData;
  placeholder?: string;
  options?: { id: string; label: string; value: string; icon?: string }[];
}

const ConversationalSurvey = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<AdvancedReport | null>(null);
  const [phase, setPhase] = useState<'quiz' | 'analyzing' | 'report' | 'disqualified'>('quiz');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [websiteVerification, setWebsiteVerification] = useState<WebsiteVerification>({ status: 'idle' });
  const [emailValidation, setEmailValidation] = useState<EmailValidation>({ status: 'idle' });
  
  const [formData, setFormData] = useState<FormData>({
    sector: '',
    customSector: '',
    monthlyRevenue: '',
    adsInvestment: '',
    emailRevenuePercentage: '',
    emailFrequency: '',
    listSize: '',
    activeFlows: [],
    website: '',
    companyName: '',
    fullName: '',
    phone: '',
    email: '',
    motivation: '',
    emailSatisfaction: '',
    acceptTerms: false,
    _hp_field: ''
  });

  // Partial tracking - defined before steps so it's always called
  const currentStepId = currentStep >= 0 ? `step_${currentStep}` : 'init';
  const { markCompleted } = usePartialTracking({
    surveyType: 'conversational',
    formData: formData as unknown as Record<string, unknown>,
    currentStep,
    stepName: currentStepId,
    totalSteps: 13,
    enabled: phase === 'quiz',
  });

  const sectors = [
    { id: 'beauty', label: 'Beauty & Personal Care', icon: '💄', value: 'beauty' },
    { id: 'fashion', label: 'Abbigliamento o accessori', icon: '👗', value: 'fashion' },
    { id: 'digital', label: 'Prodotti digitali', icon: '💻', value: 'digital' },
    { id: 'home', label: 'Articoli per la casa', icon: '🏠', value: 'home' },
    { id: 'jewelry', label: 'Gioielli', icon: '💎', value: 'jewelry' },
    { id: 'food', label: 'Food & Beverage', icon: '🍔', value: 'food' },
    { id: 'health', label: 'Salute e integrazione', icon: '❤️', value: 'health' },
    { id: 'other', label: 'Altro settore', icon: '🏢', value: 'other' }
  ];

  const revenueRanges = [
    { id: 'rev1', label: '15K€ - 25K€', value: '15-25k' },
    { id: 'rev2', label: '25K€ - 50K€', value: '25-50k' },
    { id: 'rev3', label: '50K€ - 100K€', value: '50-100k' },
    { id: 'rev4', label: '100K€ - 200K€', value: '100-200k' },
    { id: 'rev5', label: '200K€+', value: '200k+' }
  ];

  const adsInvestmentRanges = [
    { id: 'ads1', label: '0 - 5.000€', value: '0-5k' },
    { id: 'ads2', label: '5.000€ - 15.000€', value: '5-15k' },
    { id: 'ads3', label: '15.000€ - 30.000€', value: '15-30k' },
    { id: 'ads4', label: '30.000€ - 50.000€', value: '30-50k' }
  ];

  const emailRevenueRanges = [
    { id: 'email1', label: '0 - 10%', value: '0-10' },
    { id: 'email2', label: '10% - 20%', value: '10-20' },
    { id: 'email3', label: '20% - 30%', value: '20-30' },
    { id: 'email4', label: '30% - 40%', value: '30-40' },
    { id: 'email5', label: '40% - 60%', value: '40-60' },
    { id: 'email6', label: 'Oltre 60%', value: '60+' }
  ];

  const emailFrequencies = [
    { id: 'freq1', label: 'Nessun invio', value: 'none' },
    { id: 'freq2', label: '1-2 email a settimana', value: '1-2' },
    { id: 'freq3', label: '3-4 email a settimana', value: '3-4' },
    { id: 'freq4', label: '5-7 email a settimana', value: '5-7' },
    { id: 'freq5', label: '+7 email a settimana', value: '7+' }
  ];

  const listSizes = [
    { id: 'size1', label: '100 - 1.000', value: '100-1k' },
    { id: 'size2', label: '1.000 - 5.000', value: '1-5k' },
    { id: 'size3', label: '5.000 - 10.000', value: '3-10k' },
    { id: 'size4', label: '10.000 - 30.000', value: '10-30k' },
    { id: 'size5', label: '30.000 - 50.000', value: '30-50k' },
    { id: 'size6', label: '50.000+', value: '50k+' }
  ];

  const automationFlows = [
    { id: 'welcome', label: 'Benvenuto', value: 'welcome' },
    { id: 'browse', label: 'Browser abbandonato', value: 'browse_abandonment' },
    { id: 'cart', label: 'Recupero carrello', value: 'cart_recovery' },
    { id: 'checkout', label: 'Recupero checkout', value: 'checkout_recovery' },
    { id: 'upsell', label: 'Conferma e upsell', value: 'upsell' },
    { id: 'winback', label: 'Winback', value: 'winback' },
    { id: 'sunset', label: 'Sunset', value: 'sunset' },
    { id: 'none', label: 'Nessun flusso attivo', value: 'none' }
  ];

  // Conversational steps with dynamic messages
  const steps: Step[] = [
    {
      id: 'greeting',
      getMessage: () => "Ciao! 👋 Sono qui per aiutarti a scoprire il potenziale nascosto del tuo e-commerce. Come ti chiami?",
      type: 'text-input',
      field: 'fullName',
      placeholder: 'Il tuo nome e cognome...'
    },
    {
      id: 'phone',
      getMessage: (data) => `Piacere di conoscerti, ${data.fullName.split(' ')[0]}! 😊 Qual è il tuo numero WhatsApp? Lo useremo solo per inviarti il report.`,
      type: 'text-input',
      field: 'phone',
      placeholder: '+39 xxx xxx xxxx'
    },
    {
      id: 'email',
      getMessage: (data) => `Perfetto ${data.fullName.split(' ')[0]}! Ora ho bisogno della tua email per inviarti l'analisi completa.`,
      type: 'email',
      field: 'email',
      placeholder: 'nome@email.com'
    },
    {
      id: 'website',
      getMessage: () => `Fantastico! Qual è il tuo sito web? Lo analizzerò per personalizzare il report.`,
      type: 'website',
      field: 'website',
      placeholder: 'www.tuosito.com'
    },
    {
      id: 'sector',
      getMessage: (data) => `${data.fullName.split(' ')[0]}, in quale settore operi?`,
      type: 'radio',
      field: 'sector',
      options: sectors
    },
    {
      id: 'customSector',
      getMessage: () => "Interessante! Puoi specificare meglio il tuo settore?",
      type: 'text-input',
      field: 'customSector',
      placeholder: 'Specifica il tuo settore...'
    },
    {
      id: 'revenue',
      getMessage: (data) => `Bene! Per calcolare il tuo potenziale, qual è il fatturato mensile del tuo ecommerce?`,
      type: 'radio',
      field: 'monthlyRevenue',
      options: revenueRanges
    },
    {
      id: 'ads',
      getMessage: (data) => `Capito ${data.fullName.split(' ')[0]}! Quanto investite in advertising al mese?`,
      type: 'radio',
      field: 'adsInvestment',
      options: adsInvestmentRanges
    },
    {
      id: 'emailRevenue',
      getMessage: (data) => `Ora la domanda chiave, ${data.fullName.split(' ')[0]}: quanto del vostro fatturato proviene dalle email?`,
      type: 'radio',
      field: 'emailRevenuePercentage',
      options: emailRevenueRanges
    },
    {
      id: 'frequency',
      getMessage: (data) => `${data.fullName.split(' ')[0]}, quante email inviate alla vostra lista a settimana?`,
      type: 'radio',
      field: 'emailFrequency',
      options: emailFrequencies
    },
    {
      id: 'listSize',
      getMessage: (data) => `Quasi finito! Quanti iscritti ha la tua lista email?`,
      type: 'radio',
      field: 'listSize',
      options: listSizes
    },
    {
      id: 'flows',
      getMessage: (data) => `Ultima domanda, ${data.fullName.split(' ')[0]}! Quali automazioni email avete attive? Seleziona tutte quelle che usate.`,
      type: 'checkbox',
      field: 'activeFlows',
      options: automationFlows
    },
    {
      id: 'terms',
      getMessage: (data) => `Perfetto ${data.fullName.split(' ')[0]}! 🎉 Ho tutte le informazioni che mi servono per creare il tuo report personalizzato. Accetta i termini per ricevere la tua analisi gratuita.`,
      type: 'terms',
      field: 'acceptTerms'
    }
  ];

  // Filter out customSector step if sector is not 'other'
  const activeSteps = steps.filter(step => {
    if (step.id === 'customSector') {
      return formData.sector === 'other';
    }
    return true;
  });

  const currentStepData = activeSteps[currentStep];
  const progress = ((currentStep + 1) / activeSteps.length) * 100;

  const getSectorLabel = () => {
    if (formData.sector === 'other' && formData.customSector) {
      return formData.customSector;
    }
    const sector = sectors.find(s => s.value === formData.sector);
    return sector?.label || 'E-commerce';
  };

  // Verify website
  const verifyWebsite = useCallback(async (url: string, sector: string) => {
    const formatCheck = isValidUrlFormat(url);
    if (!formatCheck.isValid) {
      setWebsiteVerification({ status: 'invalid', message: formatCheck.error });
      return false;
    }
    setWebsiteVerification({ status: 'checking' });
    try {
      const { data, error } = await supabase.functions.invoke('verify-website', {
        body: { url: formatCheck.normalized, sector }
      });
      if (error) {
        setWebsiteVerification({ status: 'invalid', message: 'Errore durante la verifica. Riprova.' });
        return false;
      }
      if (data.isValid) {
        setWebsiteVerification({ status: 'valid', checks: data.checks, confidence: data.confidence });
        if (data.details?.normalizedUrl) {
          setFormData(prev => ({ ...prev, website: data.details.normalizedUrl }));
        }
        return true;
      } else {
        setWebsiteVerification({ status: 'invalid', message: data.error || 'Sito non valido', checks: data.checks });
        return false;
      }
    } catch {
      setWebsiteVerification({ status: 'invalid', message: 'Errore di connessione. Riprova.' });
      return false;
    }
  }, []);

  const debouncedVerify = useMemo(() => debounce((url: string, sector: string) => {
    if (url.length > 3) verifyWebsite(url, sector);
  }, 800), [verifyWebsite]);

  // Save lead to database
  const saveLeadToDatabase = async () => {
    if (formData._hp_field) return;
    try {
      const submissionData = {
        company_name: '',
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        website: formData.website || null,
        status: 'in_progress',
        qualified: null
      };
      const { data, error } = await supabase.from('survey_submissions').insert(submissionData as never).select('id').single();
      if (!error && data) {
        setLeadId(data.id);
      }
    } catch (err) {
      console.error('Error saving lead:', err);
    }
  };

  // Handle typing complete
  const handleTypingComplete = () => {
    setShowInput(true);
  };

  // Go to next step
  const goToNextStep = async () => {
    setShowInput(false);
    
    // Check for disqualification
    if (currentStepData?.field === 'adsInvestment') {
      if (formData.monthlyRevenue === '15-25k' && formData.adsInvestment === '0-5k') {
        if (leadId) {
          try {
            await supabase.from('survey_submissions').update({
              status: 'disqualified',
              qualified: false,
              disqualification_reason: 'Fatturato < 25k e spesa ads < 5k'
            } as never).eq('id', leadId);
          } catch {}
        }
        setPhase('disqualified');
        return;
      }
    }

    // Save lead after website step
    if (currentStepData?.field === 'website') {
      await saveLeadToDatabase();
    }

    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Handle input change
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'website') {
      setWebsiteVerification({ status: 'idle' });
    }
    if (field === 'email' && typeof value === 'string') {
      setEmailValidation(validateEmail(value));
    }
  };

  // Handle radio select
  const handleRadioSelect = (value: string) => {
    handleInputChange(currentStepData.field, value);
    
    // Don't auto-advance for "other" sector
    if (currentStepData.field === 'sector' && value === 'other') {
      setTimeout(goToNextStep, 300);
      return;
    }
    
    setTimeout(goToNextStep, 400);
  };

  // Handle checkbox toggle
  const handleCheckboxToggle = (value: string) => {
    const newFlows = formData.activeFlows.includes(value)
      ? formData.activeFlows.filter(f => f !== value)
      : [...formData.activeFlows, value];
    setFormData(prev => ({ ...prev, activeFlows: newFlows }));
  };

  // Handle text submit
  const handleTextSubmit = async () => {
    const field = currentStepData.field;
    const value = formData[field];
    
    if (!value || (typeof value === 'string' && !value.trim())) {
      toast({ title: "Errore", description: "Questo campo è obbligatorio", variant: "destructive" });
      return;
    }

    if (field === 'email') {
      const validation = validateEmail(formData.email);
      if (validation.status === 'invalid') {
        toast({ title: "Email non valida", description: validation.message, variant: "destructive" });
        return;
      }
    }

    if (field === 'website') {
      const isValid = await verifyWebsite(formData.website, formData.sector);
      if (!isValid) return;
    }

    goToNextStep();
  };

  // Handle final submit
  const handleSubmit = async () => {
    if (formData._hp_field) {
      setPhase('analyzing');
      return;
    }
    
    if (!formData.acceptTerms) {
      toast({ title: "Errore", description: "Devi accettare i termini per continuare", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const advancedReport = calculateAdvancedReport(
        formData.sector,
        formData.monthlyRevenue,
        formData.emailRevenuePercentage,
        formData.listSize,
        formData.activeFlows,
        formData.sector === 'other' ? formData.customSector : undefined,
        formData.emailFrequency
      );
      const adminReport = generateAdminReport(formData, advancedReport);
      const reportUrl = leadId ? `https://quiz-to-customer.lovable.app/report/${leadId}` : null;
      
      const dataToSend = {
        type: 'admin_report',
        timestamp: new Date().toISOString(),
        source: 'email-marketing-quiz-conversational',
        reportUrl,
        quickSummary: {
          leadName: formData.fullName,
          leadEmail: formData.email,
          leadPhone: formData.phone,
          companyName: '',
          website: formData.website,
          sector: advancedReport.sectorBenchmark.label,
          monthlyRevenue: advancedReport.monthlyRevenue,
          adsInvestment: formData.adsInvestment,
          emailHealthScore: advancedReport.emailHealthScore,
          yearlyPotential: advancedReport.yearlyPotential,
          leadQuality: adminReport.consultingNotes.leadQuality,
          priorityLevel: adminReport.consultingNotes.priorityLevel,
          motivation: formData.motivation,
          motivationLabel: adminReport.quizResponses.motivationLabel,
          emailSatisfaction: formData.emailSatisfaction,
          emailSatisfactionLabel: adminReport.quizResponses.emailSatisfactionLabel,
          acceptedTerms: true,
          reportUrl
        },
        adminReport,
        clientReport: advancedReport
      };

      const updateData = {
        sector: formData.sector,
        custom_sector: formData.sector === 'other' ? formData.customSector : null,
        monthly_revenue: formData.monthlyRevenue,
        email_revenue_percentage: formData.emailRevenuePercentage,
        list_size: formData.listSize,
        active_flows: formData.activeFlows,
        email_health_score: advancedReport.emailHealthScore,
        yearly_potential: advancedReport.yearlyPotential,
        current_email_revenue: advancedReport.currentEmailRevenue,
        benchmark_email_revenue: advancedReport.benchmarkEmailRevenue,
        revenue_gap: advancedReport.revenueGap,
        lead_quality: adminReport.consultingNotes.leadQuality,
        status: 'completed',
        qualified: true,
        make_synced: true,
        ghl_synced: false,
        report_data: dataToSend
      };

      if (leadId) {
        await supabase.from('survey_submissions').update(updateData as never).eq('id', leadId);
      } else {
        await supabase.from('survey_submissions').insert({
          company_name: '',
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          website: formData.website || null,
          ...updateData
        } as never);
      }

      // Mark partial tracking as completed
      await markCompleted(leadId || undefined);

      try {
        await supabase.functions.invoke('submit-webhook', { body: { submissionData: dataToSend } });
      } catch {}

      setReport(advancedReport);
      setPhase('analyzing');
    } catch (error) {
      toast({ title: "Errore", description: "Si è verificato un errore. Riprova più tardi.", variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  const handleAnalysisComplete = () => {
    setPhase('report');
    toast({ title: "Report pronto!", description: "Ecco la tua analisi personalizzata." });
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setReport(null);
    setPhase('quiz');
    setIsSubmitting(false);
    setLeadId(null);
    setShowInput(false);
    setEmailValidation({ status: 'idle' });
    setWebsiteVerification({ status: 'idle' });
    setFormData({
      sector: '', customSector: '', monthlyRevenue: '', adsInvestment: '',
      emailRevenuePercentage: '', emailFrequency: '', listSize: '', activeFlows: [],
      website: '', companyName: '', fullName: '', phone: '', email: '', 
      motivation: '', emailSatisfaction: '',
      acceptTerms: false, _hp_field: ''
    });
  };

  // Render phases
  if (phase === 'analyzing') {
    return <AnalysisScreen sectorLabel={getSectorLabel()} userName={formData.fullName} onComplete={handleAnalysisComplete} />;
  }

  if (phase === 'report' && report) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <AdvancedReportComponent report={report} phone={formData.phone} userName={formData.fullName} userEmail={formData.email} website={formData.website} onRestart={handleRestart} />
      </motion.div>
    );
  }

  if (phase === 'disqualified') {
    return <DisqualifiedScreen userName={formData.fullName} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div className="h-full bg-orange rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
          </div>
          <p className="text-slate-400 text-sm text-center mt-2">{currentStep + 1} di {activeSteps.length}</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col justify-end px-4 py-6 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Bot message with typing effect */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-orange" />
              </div>
              <div className="bg-slate-800 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
                <TypingText
                  text={currentStepData?.getMessage(formData) || ''}
                  onComplete={handleTypingComplete}
                  className="text-white text-base leading-relaxed"
                />
              </div>
            </div>

            {/* Input area */}
            <AnimatePresence>
              {showInput && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Text input */}
                  {(currentStepData?.type === 'text-input' || currentStepData?.type === 'email') && (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={currentStepData.type === 'email' ? 'email' : 'text'}
                          value={formData[currentStepData.field] as string}
                          onChange={(e) => handleInputChange(currentStepData.field, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                          placeholder={currentStepData.placeholder}
                          className={`bg-slate-800 text-white h-14 text-lg rounded-xl border-2 pr-12 transition-colors ${
                            currentStepData.type === 'email' && emailValidation.status === 'invalid'
                              ? 'border-red-500 focus:border-red-500'
                              : currentStepData.type === 'email' && emailValidation.status === 'valid'
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-slate-700 focus:border-orange'
                          }`}
                          autoFocus
                        />
                        {currentStepData.type === 'email' && emailValidation.status === 'valid' && (
                          <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                        )}
                        {currentStepData.type === 'email' && emailValidation.status === 'invalid' && (
                          <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <motion.button
                        onClick={handleTextSubmit}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="h-14 w-14 bg-orange rounded-xl flex items-center justify-center text-white"
                      >
                        <Send className="w-5 h-5" />
                      </motion.button>
                    </div>
                  )}
                  
                  {/* Email validation message */}
                  {currentStepData?.type === 'email' && emailValidation.message && (
                    <p className={`text-sm ${emailValidation.status === 'invalid' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {emailValidation.message}
                    </p>
                  )}

                  {/* Website input */}
                  {currentStepData?.type === 'website' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${
                            websiteVerification.status === 'valid' ? 'text-green-500' :
                            websiteVerification.status === 'invalid' ? 'text-red-500' : 'text-slate-500'
                          }`} />
                          <Input
                            value={formData.website}
                            onChange={(e) => {
                              handleInputChange('website', e.target.value);
                              debouncedVerify(e.target.value, formData.sector);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                            placeholder={currentStepData.placeholder}
                            className={`bg-slate-800 text-white h-14 text-lg rounded-xl pl-12 pr-12 border-2 transition-colors ${
                              websiteVerification.status === 'valid' ? 'border-green-500 focus:border-green-500' :
                              websiteVerification.status === 'invalid' ? 'border-red-500 focus:border-red-500' :
                              websiteVerification.status === 'checking' ? 'border-orange focus:border-orange' :
                              'border-slate-700 focus:border-orange'
                            }`}
                            autoFocus
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            {websiteVerification.status === 'checking' && <Loader2 className="w-5 h-5 text-orange animate-spin" />}
                            {websiteVerification.status === 'valid' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            {websiteVerification.status === 'invalid' && <XCircle className="w-5 h-5 text-red-500" />}
                          </div>
                        </div>
                        <motion.button
                          onClick={handleTextSubmit}
                          disabled={websiteVerification.status === 'checking'}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`h-14 w-14 rounded-xl flex items-center justify-center text-white ${
                            websiteVerification.status === 'checking' ? 'bg-slate-700' : 'bg-orange'
                          }`}
                        >
                          {websiteVerification.status === 'checking' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </motion.button>
                      </div>
                      {websiteVerification.status === 'invalid' && websiteVerification.message && (
                        <p className="text-sm text-red-400 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {websiteVerification.message}
                        </p>
                      )}
                      {websiteVerification.status === 'valid' && (
                        <p className="text-sm text-green-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Sito verificato con successo!
                        </p>
                      )}
                    </div>
                  )}

                  {/* Radio options */}
                  {currentStepData?.type === 'radio' && (
                    <div className="grid grid-cols-2 gap-3">
                      {currentStepData.options?.map((option) => {
                        const isSelected = formData[currentStepData.field] === option.value;
                        return (
                          <motion.button
                            key={option.id}
                            onClick={() => handleRadioSelect(option.value)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${
                              isSelected ? 'bg-orange border-orange text-white' : 'bg-slate-800 border-slate-700 text-white hover:border-orange/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {option.icon && <span className="text-xl">{option.icon}</span>}
                              <span className="font-medium">{option.label}</span>
                              {isSelected && <Check className="w-5 h-5 ml-auto" />}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {/* Checkbox options */}
                  {currentStepData?.type === 'checkbox' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {currentStepData.options?.map((option) => {
                          const isChecked = formData.activeFlows.includes(option.value);
                          return (
                            <motion.button
                              key={option.id}
                              onClick={() => handleCheckboxToggle(option.value)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`p-4 rounded-xl border-2 text-left transition-all ${
                                isChecked ? 'bg-orange border-orange text-white' : 'bg-slate-800 border-slate-700 text-white hover:border-orange/50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium flex-1">{option.label}</span>
                                {isChecked && <Check className="w-4 h-4" />}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                      {formData.activeFlows.length > 0 && (
                        <motion.button
                          onClick={goToNextStep}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full py-4 bg-orange text-white rounded-xl font-semibold text-lg"
                        >
                          Continua ({formData.activeFlows.length} selezionati)
                        </motion.button>
                      )}
                    </div>
                  )}

                  {/* Terms */}
                  {currentStepData?.type === 'terms' && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 bg-slate-800 rounded-xl p-4">
                        <Checkbox
                          id="terms"
                          checked={formData.acceptTerms}
                          onCheckedChange={(checked) => handleInputChange('acceptTerms', checked as boolean)}
                          className="border-slate-500 data-[state=checked]:bg-orange data-[state=checked]:border-orange mt-1"
                        />
                        <Label htmlFor="terms" className="text-slate-300 text-sm cursor-pointer leading-relaxed">
                          Accetto i termini e condizioni. Fornendo il mio numero, accetto di ricevere messaggi per il report personalizzato.
                        </Label>
                      </div>
                      
                      {/* Honeypot */}
                      <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                        <input type="text" value={formData._hp_field} onChange={(e) => handleInputChange('_hp_field', e.target.value)} tabIndex={-1} autoComplete="off" />
                      </div>

                      <motion.button
                        onClick={handleSubmit}
                        disabled={!formData.acceptTerms || isSubmitting}
                        whileHover={formData.acceptTerms && !isSubmitting ? { scale: 1.02 } : {}}
                        whileTap={formData.acceptTerms && !isSubmitting ? { scale: 0.98 } : {}}
                        className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 ${
                          formData.acceptTerms && !isSubmitting ? 'bg-orange text-white hover:bg-orange/90' : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generazione report...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            Genera il mio Report Gratuito
                          </>
                        )}
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Back button */}
      <AnimatePresence>
        {currentStep > 0 && (
          <motion.div className="px-4 pb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            <div className="max-w-2xl mx-auto">
              <motion.button
                onClick={() => { setShowInput(false); setCurrentStep(prev => prev - 1); }}
                whileHover={{ x: -5 }}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Indietro</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConversationalSurvey;
