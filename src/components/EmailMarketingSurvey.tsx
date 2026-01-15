import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { calculateAdvancedReport, type AdvancedReport } from '@/lib/reportCalculations';
import { generateAdminReport } from '@/lib/adminReportGenerator';
import AdvancedReportComponent from '@/components/AdvancedReport';
import { ChevronLeft, Check, Loader2, CheckCircle2, Circle, BarChart3, Users, TrendingUp, FileText, Sparkles, XCircle, Globe, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  acceptTerms: boolean;
  _hp_field: string; // Honeypot field - should always be empty
}

// Email validation state interface
interface EmailValidation {
  status: 'idle' | 'valid' | 'invalid' | 'warning';
  message?: string;
}

// Business email validation
const personalDomains = [
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.it', 'ymail.com',
  'hotmail.com', 'hotmail.it', 'outlook.com', 'live.com', 'live.it', 'msn.com',
  'icloud.com', 'me.com', 'mac.com',
  'libero.it', 'virgilio.it', 'alice.it', 'tin.it', 'tiscali.it',
  'aruba.it', 'fastwebnet.it', 'pec.it',
  'protonmail.com', 'proton.me',
  'aol.com', 'mail.com', 'email.com', 'inbox.com'
];

function extractDomainFromUrl(url: string): string {
  try {
    let normalized = url.toLowerCase().trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    const urlObj = new URL(normalized);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function validateBusinessEmail(email: string, website: string): EmailValidation {
  if (!email || !email.includes('@')) {
    return { status: 'idle' };
  }
  
  const emailDomain = email.split('@')[1]?.toLowerCase();
  
  if (!emailDomain) {
    return { status: 'invalid', message: 'Email non valida' };
  }
  
  // Check if personal email domain
  if (personalDomains.includes(emailDomain)) {
    return {
      status: 'invalid',
      message: 'Inserisci un\'email aziendale (non Gmail, Yahoo, Outlook, etc.)'
    };
  }
  
  // Extract domain from website
  const websiteDomain = extractDomainFromUrl(website);
  
  // Check if email domain matches website domain
  if (websiteDomain && emailDomain !== websiteDomain) {
    return {
      status: 'warning',
      message: `L'email dovrebbe idealmente essere @${websiteDomain}`
    };
  }
  
  return { status: 'valid' };
}

// Animation variants
const pageVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0
  })
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

const selectedPulse = {
  scale: [1, 1.03, 1],
  transition: { duration: 0.3 }
};

const progressVariants = {
  initial: { width: 0 },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: { duration: 0.5, ease: "easeOut" }
  })
};

// Analysis screen component
const AnalysisScreen = ({ 
  sectorLabel, 
  onComplete 
}: { 
  sectorLabel: string; 
  onComplete: () => void;
}) => {
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [counters, setCounters] = useState({ revenue: 0, subscribers: 0, opportunities: 0 });
  const [tipIndex, setTipIndex] = useState(0);

  const analysisSteps = [
    { icon: BarChart3, text: `Analisi settore ${sectorLabel}`, duration: 1200 },
    { icon: TrendingUp, text: 'Calcolo benchmark di mercato', duration: 1000 },
    { icon: Users, text: 'Valutazione automazioni attive', duration: 1500 },
    { icon: Sparkles, text: 'Stima potenziale di crescita', duration: 1000 },
    { icon: FileText, text: 'Generazione report personalizzato', duration: 1300 }
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
    // Progress animation
    const totalDuration = analysisSteps.reduce((acc, step) => acc + step.duration, 0);
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 1, 100));
    }, totalDuration / 100);

    // Step progression
    let stepTimeout: NodeJS.Timeout;
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

    // Counter animation
    const counterDuration = 4000;
    const counterSteps = 60;
    let counterStep = 0;
    const counterInterval = setInterval(() => {
      counterStep++;
      const progress = counterStep / counterSteps;
      const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
      setCounters({
        revenue: Math.round(targetCounters.revenue * eased),
        subscribers: Math.round(targetCounters.subscribers * eased),
        opportunities: Math.round(targetCounters.opportunities * eased)
      });
      if (counterStep >= counterSteps) clearInterval(counterInterval);
    }, counterDuration / counterSteps);

    // Tip rotation
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
    <motion.div 
      className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-lg">
        {/* Header */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-4"
          >
            <div className="w-16 h-16 rounded-full border-4 border-orange border-t-transparent" />
          </motion.div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Stiamo analizzando i tuoi dati
          </h1>
          <p className="text-slate-400">
            Preparazione del report personalizzato...
          </p>
        </motion.div>

        {/* Analysis Steps */}
        <motion.div 
          className="bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-700"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="space-y-4">
            {analysisSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentAnalysisStep;
              const isCurrent = index === currentAnalysisStep;

              return (
                <motion.div
                  key={index}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      </motion.div>
                    ) : isCurrent ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Loader2 className="w-6 h-6 text-orange" />
                      </motion.div>
                    ) : (
                      <Circle className="w-6 h-6 text-slate-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className={`w-5 h-5 ${isCompleted ? 'text-green-500' : isCurrent ? 'text-orange' : 'text-slate-500'}`} />
                    <span className={`text-sm ${isCompleted ? 'text-green-400' : isCurrent ? 'text-white' : 'text-slate-500'}`}>
                      {step.text}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange to-orange/80 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-center text-slate-400 text-sm mt-2">
            Elaborazione {progress}%
          </p>
        </motion.div>

        {/* Animated Counters */}
        <motion.div 
          className="grid grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
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

        {/* Rotating Tips */}
        <motion.div 
          className="bg-orange/10 border border-orange/20 rounded-xl p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-orange flex-shrink-0 mt-0.5" />
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                className="text-sm text-slate-300"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                💡 {tips[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Website verification state interface
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

// Debounce utility
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// URL validation utility
function isValidUrlFormat(url: string): { isValid: boolean; normalized: string; error?: string } {
  let normalized = url.trim().toLowerCase();
  
  if (!normalized) {
    return { isValid: false, normalized, error: 'Inserisci il tuo sito web' };
  }
  
  // Add https:// if missing protocol
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized.replace(/^www\./, '');
  }
  
  // Basic URL pattern validation
  const urlPattern = /^https?:\/\/([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
  
  if (!urlPattern.test(normalized)) {
    return { isValid: false, normalized, error: 'Formato URL non valido' };
  }
  
  // Check for valid TLD
  const validTlds = ['com', 'it', 'eu', 'net', 'org', 'io', 'co', 'shop', 'store', 'online', 'info', 'biz', 'me', 'app', 'dev', 'tech'];
  const domain = normalized.replace(/^https?:\/\//, '').split('/')[0];
  const tld = domain.split('.').pop();
  
  if (!tld || (!validTlds.includes(tld) && tld.length < 2)) {
    return { isValid: false, normalized, error: 'Dominio non riconosciuto' };
  }
  
  return { isValid: true, normalized };
}

// Disqualified screen component
const DisqualifiedScreen = () => {
  return (
    <motion.div 
      className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-6xl mb-6"
        >
          😔
        </motion.div>
        
        <motion.h1 
          className="text-2xl md:text-3xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Al momento non siamo il partner giusto per te
        </motion.h1>
        
        <motion.p 
          className="text-slate-400 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          I nostri servizi sono ottimizzati per e-commerce con fatturato superiore a 20.000€/mese e investimento attivo in advertising.
        </motion.p>
        
        <motion.div 
          className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-center gap-2 text-orange font-medium mb-3">
            <Sparkles className="w-5 h-5" />
            <span>Risorse gratuite per te</span>
          </div>
          <p className="text-slate-300 text-sm mb-4">
            Nel frattempo, scarica la nostra guida gratuita per far crescere il tuo e-commerce con l'email marketing.
          </p>
          <motion.a
            href="https://mailift.com/risorse"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-block w-full py-3 px-6 bg-orange text-white rounded-xl font-semibold hover:bg-orange/90 transition-colors"
          >
            Scarica Guida Gratuita
          </motion.a>
        </motion.div>
        
        <motion.p 
          className="text-slate-500 text-sm mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Quando il tuo business crescerà, saremo qui ad aspettarti! 🚀
        </motion.p>
      </div>
    </motion.div>
  );
};

const EmailMarketingSurvey = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<AdvancedReport | null>(null);
  const [phase, setPhase] = useState<'quiz' | 'analyzing' | 'report' | 'disqualified'>('quiz');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
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
    acceptTerms: false,
    _hp_field: '' // Honeypot - bots will fill this
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
    { id: 'rev1', label: '10K€ - 20K€', value: '10-20k' },
    { id: 'rev2', label: '20K€ - 50K€', value: '20-50k' },
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

  // REORDERED: Contact info FIRST to capture leads immediately
  const steps = [
    {
      title: "Parliamo di te",
      subtitle: "Inserisci i tuoi dati per iniziare l'analisi personalizzata",
      type: "contact" as const
    },
    {
      title: "Qual è il tuo sito web?",
      type: "input" as const,
      field: "website" as keyof FormData
    },
    {
      title: "In quale settore operi?",
      type: "radio" as const,
      field: "sector" as keyof FormData,
      options: sectors
    },
    {
      title: "Qual è il tuo fatturato mensile?",
      type: "radio" as const,
      field: "monthlyRevenue" as keyof FormData,
      options: revenueRanges
    },
    {
      title: "Quanto spendi in ads al mese?",
      type: "radio" as const,
      field: "adsInvestment" as keyof FormData,
      options: adsInvestmentRanges
    },
    {
      title: "Quanto fatturato proviene dalle email?",
      type: "radio" as const,
      field: "emailRevenuePercentage" as keyof FormData,
      options: emailRevenueRanges
    },
    {
      title: "Quante email invii a settimana?",
      type: "radio" as const,
      field: "emailFrequency" as keyof FormData,
      options: emailFrequencies
    },
    {
      title: "Quanti iscritti ha la tua lista email?",
      type: "radio" as const,
      field: "listSize" as keyof FormData,
      options: listSizes
    },
    {
      title: "Quali automazioni hai attive?",
      subtitle: "Seleziona tutte quelle attive",
      type: "checkbox" as const,
      field: "activeFlows" as keyof FormData,
      options: automationFlows
    }
  ];

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleRadioSelect = async (field: keyof FormData, value: string) => {
    setSelectedValue(value);
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Don't auto-advance for "other" sector - need to enter custom sector name
    if (field === 'sector' && value === 'other') {
      setTimeout(() => setSelectedValue(null), 400);
      return;
    }
    
    // Check for disqualification after adsInvestment selection
    if (field === 'adsInvestment') {
      // Get the latest monthlyRevenue from formData
      const currentMonthlyRevenue = formData.monthlyRevenue;
      
      // Disqualify if: revenue 10-20k AND ads 0-5k
      if (currentMonthlyRevenue === '10-20k' && value === '0-5k') {
        // Update lead status to disqualified if we have a lead ID
        if (leadId) {
          try {
            await supabase
              .from('survey_submissions')
              .update({
                status: 'disqualified',
                qualified: false,
                disqualification_reason: 'Fatturato < 20k e spesa ads < 5k'
              } as never)
              .eq('id', leadId);
          } catch (err) {
            console.error('Error updating disqualified lead:', err);
          }
        }
        
        setTimeout(() => {
          setSelectedValue(null);
          setPhase('disqualified');
        }, 400);
        return;
      }
    }
    
    // Auto-advance with animation delay
    setTimeout(() => {
      setSelectedValue(null);
      goToNextStep();
    }, 400);
  };

  const handleCheckboxChange = (value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      activeFlows: checked 
        ? [...prev.activeFlows, value]
        : prev.activeFlows.filter(flow => flow !== value)
    }));
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Reset website verification when website changes
    if (field === 'website') {
      setWebsiteVerification({ status: 'idle' });
    }
    
    // Validate email in real-time
    if (field === 'email' && typeof value === 'string') {
      const validation = validateBusinessEmail(value, formData.website);
      setEmailValidation(validation);
    }
  };

  // Verify website with Edge Function
  const verifyWebsite = useCallback(async (url: string, sector: string) => {
    // First check format locally
    const formatCheck = isValidUrlFormat(url);
    if (!formatCheck.isValid) {
      setWebsiteVerification({
        status: 'invalid',
        message: formatCheck.error
      });
      return false;
    }
    
    setWebsiteVerification({ status: 'checking' });
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-website', {
        body: { url: formatCheck.normalized, sector }
      });
      
      if (error) {
        console.error('Website verification error:', error);
        setWebsiteVerification({
          status: 'invalid',
          message: 'Errore durante la verifica. Riprova.'
        });
        return false;
      }
      
      if (data.isValid) {
        setWebsiteVerification({
          status: 'valid',
          checks: data.checks,
          confidence: data.confidence
        });
        // Update form with normalized URL
        if (data.details?.normalizedUrl) {
          setFormData(prev => ({ ...prev, website: data.details.normalizedUrl }));
        }
        return true;
      } else {
        setWebsiteVerification({
          status: 'invalid',
          message: data.error || 'Sito non valido',
          checks: data.checks
        });
        return false;
      }
    } catch (err) {
      console.error('Website verification failed:', err);
      setWebsiteVerification({
        status: 'invalid',
        message: 'Errore di connessione. Riprova.'
      });
      return false;
    }
  }, []);

  // Debounced verification for real-time feedback
  const debouncedVerify = useMemo(
    () => debounce((url: string, sector: string) => {
      if (url.length > 3) {
        verifyWebsite(url, sector);
      }
    }, 800),
    [verifyWebsite]
  );

  // Handle website verification on Continue button click
  const handleWebsiteContinue = async () => {
    if (!formData.website) {
      setWebsiteVerification({
        status: 'invalid',
        message: 'Inserisci il tuo sito web'
      });
      return;
    }
    
    const isValid = await verifyWebsite(formData.website, formData.sector);
    if (isValid) {
      // Save lead immediately after contact + website steps are complete
      await saveLeadToDatabase();
      goToNextStep();
    }
  };

  // Save lead immediately after contact info is provided
  const saveLeadToDatabase = async () => {
    // Honeypot check - reject if filled (bot detected)
    if (formData._hp_field) {
      console.warn('Bot detected - honeypot field filled');
      return; // Silently reject to not alert the bot
    }

    try {
      const submissionData = {
        company_name: formData.companyName,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        website: formData.website || null,
        status: 'in_progress',
        qualified: null // TBD based on qualification questions
      };

      const { data, error } = await supabase
        .from('survey_submissions')
        .insert(submissionData as never)
        .select('id')
        .single();

      if (error) {
        console.error('Lead save error:', error);
      } else if (data) {
        setLeadId(data.id);
        console.log('Lead saved with ID:', data.id);
      }
    } catch (err) {
      console.error('Error saving lead:', err);
    }
  };

  const getSectorLabel = () => {
    if (formData.sector === 'other' && formData.customSector) {
      return formData.customSector;
    }
    const sector = sectors.find(s => s.value === formData.sector);
    return sector?.label || 'E-commerce';
  };

  // Check if contact form can continue
  const canContinueFromContact = 
    formData.companyName.trim() !== '' &&
    formData.fullName.trim() !== '' &&
    formData.email.trim() !== '' &&
    formData.acceptTerms &&
    emailValidation.status !== 'invalid';

  // Handle contact form continue
  const handleContactContinue = () => {
    // Validate required fields
    if (!formData.companyName.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci il nome della tua azienda",
        variant: "destructive"
      });
      return;
    }

    if (!formData.fullName.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci il tuo nome e cognome",
        variant: "destructive"
      });
      return;
    }
    
    // Validate business email
    const emailCheck = validateBusinessEmail(formData.email, formData.website);
    if (emailCheck.status === 'invalid') {
      toast({
        title: "Email non valida",
        description: emailCheck.message || "Inserisci un'email aziendale valida",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.acceptTerms) {
      toast({
        title: "Errore",
        description: "Devi accettare i termini e condizioni per continuare",
        variant: "destructive"
      });
      return;
    }

    goToNextStep();
  };

  // Final submit - update existing lead with complete data
  const handleSubmit = async () => {
    // Honeypot check - reject if filled (bot detected)
    if (formData._hp_field) {
      console.warn('Bot submission detected via honeypot');
      // Pretend to succeed to not alert sophisticated bots
      setPhase('analyzing');
      setTimeout(() => {
        toast({
          title: "Grazie!",
          description: "Il tuo report sarà pronto a breve.",
        });
      }, 3000);
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
        formData.sector === 'other' ? formData.customSector : undefined
      );
      
      const adminReport = generateAdminReport(formData, advancedReport);
      
      // Generate shareable report URL
      const reportUrl = leadId 
        ? `${window.location.origin}/report/${leadId}`
        : null;

      const dataToSend = {
        type: 'admin_report',
        timestamp: new Date().toISOString(),
        source: 'email-marketing-quiz',
        reportUrl, // Include shareable URL in webhook
        quickSummary: {
          leadName: formData.fullName,
          leadEmail: formData.email,
          leadPhone: formData.phone,
          website: formData.website,
          sector: advancedReport.sectorBenchmark.label,
          monthlyRevenue: advancedReport.monthlyRevenue,
          emailHealthScore: advancedReport.emailHealthScore,
          yearlyPotential: advancedReport.yearlyPotential,
          leadQuality: adminReport.consultingNotes.leadQuality,
          priorityLevel: adminReport.consultingNotes.priorityLevel,
          reportUrl // Also in quickSummary for easy access
        },
        adminReport,
        clientReport: advancedReport
      };

      // Update existing lead with complete data
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
        const { error: dbError } = await supabase
          .from('survey_submissions')
          .update(updateData as never)
          .eq('id', leadId);

        if (dbError) {
          console.error('Database update error:', dbError);
        }
      } else {
        // Fallback: create new record if somehow leadId is missing
        const { error: dbError } = await supabase
          .from('survey_submissions')
          .insert({
            company_name: formData.companyName,
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone || null,
            website: formData.website || null,
            ...updateData
          } as never);

        if (dbError) {
          console.error('Database save error:', dbError);
        }
      }

      // Send to webhook via secure edge function
      try {
        const webhookResponse = await supabase.functions.invoke('submit-webhook', {
          body: { submissionData: dataToSend }
        });
        
        if (webhookResponse.error) {
          console.warn('Webhook delivery warning:', webhookResponse.error);
        } else {
          console.log('Webhook sent successfully:', webhookResponse.data);
        }
      } catch (webhookError) {
        console.warn('Webhook delivery failed, but data was saved:', webhookError);
      }

      // Store report and show analysis screen
      setReport(advancedReport);
      setPhase('analyzing');
      
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore. Riprova più tardi.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  const handleAnalysisComplete = () => {
    setPhase('report');
    toast({
      title: "Report pronto!",
      description: "Ecco la tua analisi personalizzata.",
    });
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setReport(null);
    setPhase('quiz');
    setIsSubmitting(false);
    setLeadId(null);
    setEmailValidation({ status: 'idle' });
    setWebsiteVerification({ status: 'idle' });
    setFormData({
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
      acceptTerms: false,
      _hp_field: ''
    });
  };

  const currentStepData = steps[currentStep];

  // Analysis screen
  if (phase === 'analyzing') {
    return (
      <AnalysisScreen 
        sectorLabel={getSectorLabel()} 
        onComplete={handleAnalysisComplete} 
      />
    );
  }

  // Report finale
  if (phase === 'report' && report) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <AdvancedReportComponent 
          report={report} 
          phone={formData.phone}
          userName={formData.fullName}
          userEmail={formData.email}
          website={formData.website}
          onRestart={handleRestart}
        />
      </motion.div>
    );
  }

  // Disqualified screen
  if (phase === 'disqualified') {
    return <DisqualifiedScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-slate-800 px-4 py-6">
        <div className="max-w-xl mx-auto">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-orange rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <motion.p 
            className="text-slate-400 text-sm text-center mt-3"
            key={currentStep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {currentStep + 1} di {steps.length}
          </motion.p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-xl"
          >
            {/* Question */}
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                {currentStepData.title}
              </h1>
              {currentStepData.subtitle && (
                <p className="text-slate-400">
                  {currentStepData.subtitle}
                </p>
              )}
            </motion.div>

            {/* Options */}
            <motion.div 
              className="space-y-3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {currentStepData.type === "radio" && (
                <>
                  {currentStepData.options?.map((option) => {
                    const isSelected = formData[currentStepData.field] === option.value;
                    const isAnimating = selectedValue === option.value;
                    
                    return (
                      <motion.button
                        key={option.id}
                        variants={cardVariants}
                        onClick={() => handleRadioSelect(currentStepData.field, option.value)}
                        animate={isAnimating ? selectedPulse : {}}
                        whileHover={{ scale: 1.02, borderColor: 'rgba(249, 115, 22, 0.5)' }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          w-full p-4 rounded-xl border-2 text-left transition-colors duration-200
                          flex items-center gap-4
                          ${isSelected
                            ? 'bg-orange border-orange text-white'
                            : 'bg-slate-800/50 border-slate-700 text-white'
                          }
                        `}
                      >
                        {'icon' in option && option.icon && (
                          <span className="text-2xl">{option.icon as string}</span>
                        )}
                        <span className="text-lg font-medium flex-1">{option.label}</span>
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            >
                              <Check className="h-5 w-5" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                  
                  {/* Custom sector input for "other" option */}
                  <AnimatePresence>
                    {currentStepData.field === 'sector' && formData.sector === 'other' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 mt-4"
                      >
                        <Input
                          value={formData.customSector}
                          onChange={(e) => handleInputChange('customSector', e.target.value)}
                          placeholder="Specifica il tuo settore..."
                          className="bg-slate-800 text-white h-14 text-lg rounded-xl border-2 border-slate-700 focus:border-orange focus:ring-orange"
                          autoFocus
                        />
                        <motion.button
                          onClick={() => {
                            if (formData.customSector.trim()) {
                              goToNextStep();
                            } else {
                              toast({
                                title: "Errore",
                                description: "Inserisci il nome del tuo settore",
                                variant: "destructive"
                              });
                            }
                          }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200
                            ${formData.customSector.trim()
                              ? 'bg-orange text-white hover:bg-orange/90'
                              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                            }
                          `}
                        >
                          Continua
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

              {currentStepData.type === "checkbox" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {currentStepData.options?.map((option, index) => {
                      const isChecked = formData.activeFlows.includes(option.value);
                      return (
                        <motion.button
                          key={option.id}
                          variants={cardVariants}
                          custom={index}
                          onClick={() => handleCheckboxChange(option.value, !isChecked)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className={`
                            p-4 rounded-xl border-2 text-left transition-colors duration-200
                            flex items-center gap-2
                            ${isChecked
                              ? 'bg-orange border-orange text-white'
                              : 'bg-slate-800/50 border-slate-700 text-white'
                            }
                          `}
                        >
                          <span className="text-sm font-medium flex-1">{option.label}</span>
                          <AnimatePresence>
                            {isChecked && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                              >
                                <Check className="h-4 w-4" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      );
                    })}
                  </div>
                  <AnimatePresence>
                    {formData.activeFlows.length > 0 && (
                      <motion.p 
                        className="text-center text-slate-400 text-sm mt-4"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        {formData.activeFlows.length} flusso/i selezionato/i
                      </motion.p>
                    )}
                  </AnimatePresence>
                </>
              )}

              {currentStepData.type === "input" && (
                <motion.div 
                  className="space-y-4"
                  variants={cardVariants}
                >
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Globe className={`w-5 h-5 ${
                        websiteVerification.status === 'valid' ? 'text-green-500' :
                        websiteVerification.status === 'invalid' ? 'text-red-500' :
                        'text-slate-500'
                      }`} />
                    </div>
                    <Input
                      value={formData.website}
                      onChange={(e) => {
                        handleInputChange('website', e.target.value);
                        debouncedVerify(e.target.value, formData.sector);
                      }}
                      onBlur={() => {
                        if (formData.website && websiteVerification.status === 'idle') {
                          verifyWebsite(formData.website, formData.sector);
                        }
                      }}
                      placeholder="www.tuosito.com"
                      className={`bg-slate-800 text-white h-14 text-lg rounded-xl pl-12 pr-12 border-2 transition-colors ${
                        websiteVerification.status === 'valid' 
                          ? 'border-green-500 focus:border-green-500 focus:ring-green-500' 
                          : websiteVerification.status === 'invalid'
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : websiteVerification.status === 'checking'
                          ? 'border-orange focus:border-orange focus:ring-orange'
                          : 'border-slate-700 focus:border-orange focus:ring-orange'
                      }`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {websiteVerification.status === 'checking' && (
                        <Loader2 className="w-5 h-5 text-orange animate-spin" />
                      )}
                      {websiteVerification.status === 'valid' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </motion.div>
                      )}
                      {websiteVerification.status === 'invalid' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        >
                          <XCircle className="w-5 h-5 text-red-500" />
                        </motion.div>
                      )}
                    </div>
                  </div>
                  
                  {/* Status message */}
                  <AnimatePresence mode="wait">
                    {websiteVerification.status === 'checking' && (
                      <motion.p
                        key="checking"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-sm text-orange flex items-center gap-2"
                      >
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifica in corso...
                      </motion.p>
                    )}
                    {websiteVerification.status === 'valid' && (
                      <motion.div
                        key="valid"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="space-y-2"
                      >
                        <p className="text-sm text-green-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Sito verificato con successo!
                        </p>
                        {websiteVerification.checks && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            {websiteVerification.checks.isReachable && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                                ✓ Online
                              </span>
                            )}
                            {websiteVerification.checks.isEcommerce && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                                ✓ E-commerce
                              </span>
                            )}
                            {websiteVerification.checks.sectorMatch && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                                ✓ Settore corretto
                              </span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                    {websiteVerification.status === 'invalid' && websiteVerification.message && (
                      <motion.div
                        key="invalid"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="space-y-2"
                      >
                        <p className="text-sm text-red-400 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          {websiteVerification.message}
                        </p>
                        {websiteVerification.checks?.isBlacklisted && (
                          <p className="text-xs text-slate-400">
                            Inserisci l'URL del tuo negozio online, non di brand famosi.
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Hint when idle */}
                  {websiteVerification.status === 'idle' && (
                    <p className="text-xs text-slate-500">
                      Es: miosito.it, www.mionegozio.com
                    </p>
                  )}
                </motion.div>
              )}

              {currentStepData.type === "contact" && (
                <motion.div 
                  className="space-y-4"
                  variants={containerVariants}
                >
                  <motion.div variants={cardVariants}>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="Nome Azienda *"
                      className="bg-slate-800 border-slate-700 text-white h-14 text-lg rounded-xl focus:border-orange focus:ring-orange"
                    />
                  </motion.div>
                  <motion.div variants={cardVariants}>
                    <Input
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder="Nome e Cognome *"
                      className="bg-slate-800 border-slate-700 text-white h-14 text-lg rounded-xl focus:border-orange focus:ring-orange"
                    />
                  </motion.div>
                  <motion.div variants={cardVariants}>
                    <Input
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Numero WhatsApp (+39...) *"
                      className="bg-slate-800 border-slate-700 text-white h-14 text-lg rounded-xl focus:border-orange focus:ring-orange"
                    />
                  </motion.div>
                  <motion.div variants={cardVariants} className="space-y-2">
                    <div className="relative">
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Email Aziendale *"
                        className={`bg-slate-800 text-white h-14 text-lg rounded-xl pr-12 border-2 transition-colors ${
                          emailValidation.status === 'valid' 
                            ? 'border-green-500 focus:border-green-500 focus:ring-green-500' 
                            : emailValidation.status === 'invalid'
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                            : emailValidation.status === 'warning'
                            ? 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500'
                            : 'border-slate-700 focus:border-orange focus:ring-orange'
                        }`}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {emailValidation.status === 'valid' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          >
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          </motion.div>
                        )}
                        {emailValidation.status === 'invalid' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          >
                            <XCircle className="w-5 h-5 text-red-500" />
                          </motion.div>
                        )}
                        {emailValidation.status === 'warning' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          >
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    {/* Email validation feedback */}
                    <AnimatePresence mode="wait">
                      {emailValidation.message && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className={`text-sm ${
                            emailValidation.status === 'invalid' ? 'text-red-400' : 'text-yellow-400'
                          }`}
                        >
                          {emailValidation.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                    
                    <p className="text-xs text-slate-500">
                      Es: nome@tuaazienda.it - No Gmail, Yahoo, etc.
                    </p>
                  </motion.div>
                  
                  {/* Honeypot field - hidden from users, visible to bots */}
                  <div 
                    style={{ 
                      position: 'absolute', 
                      left: '-9999px', 
                      opacity: 0, 
                      height: 0, 
                      overflow: 'hidden',
                      pointerEvents: 'none'
                    }}
                    aria-hidden="true"
                  >
                    <label htmlFor="company_website_url">Company Website URL</label>
                    <input
                      type="text"
                      id="company_website_url"
                      name="company_website_url"
                      value={formData._hp_field}
                      onChange={(e) => handleInputChange('_hp_field', e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  <motion.div 
                    className="flex items-start gap-3 pt-4"
                    variants={cardVariants}
                  >
                    <Checkbox
                      id="terms"
                      checked={formData.acceptTerms}
                      onCheckedChange={(checked) => handleInputChange('acceptTerms', checked as boolean)}
                      className="border-slate-500 data-[state=checked]:bg-orange data-[state=checked]:border-orange mt-1"
                    />
                    <Label 
                      htmlFor="terms" 
                      className="text-slate-400 text-sm cursor-pointer leading-relaxed"
                    >
                      Accetto i termini e condizioni. Fornendo il mio numero, accetto di ricevere messaggi per il report personalizzato.
                    </Label>
                  </motion.div>

                  <motion.button
                    variants={cardVariants}
                    onClick={handleContactContinue}
                    disabled={!canContinueFromContact}
                    whileHover={canContinueFromContact ? { scale: 1.02 } : {}}
                    whileTap={canContinueFromContact ? { scale: 0.98 } : {}}
                    className={`
                      w-full py-4 rounded-xl font-semibold text-lg transition-colors duration-200
                      flex items-center justify-center gap-2
                      ${canContinueFromContact
                        ? 'bg-orange text-white hover:bg-orange/90'
                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      }
                    `}
                  >
                    Continua
                  </motion.button>
                </motion.div>
              )}
            </motion.div>

            {/* Submit button for checkbox steps (final step) */}
            {currentStepData?.type === 'checkbox' && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
                whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? 'bg-slate-700 text-slate-400 cursor-wait'
                    : 'bg-orange text-white hover:bg-orange/90'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generazione report...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Genera il mio Report
                  </>
                )}
              </motion.button>
            )}
            
            {/* Continue button for website input step with verification */}
            {currentStepData?.type === 'input' && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={handleWebsiteContinue}
                disabled={websiteVerification.status === 'checking'}
                whileHover={websiteVerification.status !== 'checking' ? { scale: 1.02 } : {}}
                whileTap={websiteVerification.status !== 'checking' ? { scale: 0.98 } : {}}
                className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg transition-colors duration-200 flex items-center justify-center gap-2 ${
                  websiteVerification.status === 'checking'
                    ? 'bg-slate-700 text-slate-400 cursor-wait'
                    : websiteVerification.status === 'valid'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-orange text-white hover:bg-orange/90'
                }`}
              >
                {websiteVerification.status === 'checking' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifica in corso...
                  </>
                ) : websiteVerification.status === 'valid' ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Continua
                  </>
                ) : (
                  'Verifica e Continua'
                )}
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Back button */}
      <AnimatePresence>
        {currentStep > 0 && (
          <motion.div 
            className="px-4 pb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="max-w-xl mx-auto">
              <motion.button
                onClick={handlePrevious}
                whileHover={{ x: -5 }}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
                <span>Indietro</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmailMarketingSurvey;
