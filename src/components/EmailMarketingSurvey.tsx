import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { calculateAdvancedReport, type AdvancedReport } from '@/lib/reportCalculations';
import { generateAdminReport } from '@/lib/adminReportGenerator';
import AdvancedReportComponent from '@/components/AdvancedReport';
import { ChevronLeft, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { trackQuizCompleted, trackCompleteRegistration, trackViewContent, trackEngagedLead } from '@/lib/facebookPixel';
import { useLandingTracking } from '@/hooks/useLandingTracking';
import { usePartialTracking } from '@/hooks/usePartialTracking';
import { InsightCard, getInsightForStep } from '@/components/InsightCard';
import mailiftLogo from '@/assets/mailift-logo.png';
import lorenzoFounderAsset from '@/assets/lorenzo-founder.png.asset.json';
import heroFlow from '@/assets/hero-flow.webp';
import previewScore from '@/assets/report-preview-score.png';
import previewRevenue from '@/assets/report-preview-revenue.png';
import previewActions from '@/assets/report-preview-actions.png';

// ═══ Types ═══════════════════════════════════════════════════════════════

interface FormData {
  companyName: string;
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

// Micro-feedback shown inline after: Revenue Email % (step 4), Automazioni (step 5)
const MICRO_FEEDBACK_STEPS = [4, 5];

const INITIAL_FORM: FormData = {
  companyName: '', monthlyRevenue: '', sector: '', customSector: '', platform: '', emailTool: '',
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

// Step definitions — ordine ottimizzato per completion rate
// 0 Settore · 1 Piattaforma · 2 Fatturato (disqualify) · 3 Email Tool
// 4 Revenue Email % (micro-feedback) · 5 Automazioni (micro-feedback)
// 6 Segmentazione · 7 Frequenza · 8 Lista · 9 Obiettivo · 10 Brand · 11 Sito
const STEPS = [
  { cat: 'Settore', title: "In quale settore opera il tuo eCommerce?", type: 'radio' as const, field: 'sector' as const, options: sectorOptions },
  { cat: 'Piattaforma', title: "Su quale piattaforma gira il tuo store?", type: 'radio' as const, field: 'platform' as const, options: platformOptions },
  { cat: 'Fatturato', title: "Qual è il fatturato mensile medio del tuo eCommerce?", type: 'radio' as const, field: 'monthlyRevenue' as const, options: revenueOptions },
  { cat: 'Email Tool', title: "Quale strumento usi per inviare le email?", type: 'radio' as const, field: 'emailTool' as const, options: emailToolOptions },
  { cat: 'Revenue Email', title: "Quanto fatturato proviene attualmente dalle email?", type: 'radio' as const, field: 'emailRevenuePercentage' as const, options: emailRevenueOptions },
  { cat: 'Automazioni', title: "Quali automazioni hai attive?", type: 'checkbox' as const, field: 'activeFlows' as const, options: automationOptions, subtitle: 'Seleziona tutte quelle presenti' },
  { cat: 'Segmentazione', title: "Come gestisci l'invio delle campagne email?", type: 'radio' as const, field: 'segmentation' as const, options: segmentationOptions },
  { cat: 'Frequenza', title: "Quante email invii a settimana?", type: 'radio' as const, field: 'emailFrequency' as const, options: frequencyOptions },
  { cat: 'Lista Email', title: "Quanti iscritti ha la tua lista email?", type: 'radio' as const, field: 'listSize' as const, options: listSizeOptions },
  { cat: 'Obiettivo', title: "Perché vuoi analizzare il tuo email marketing?", type: 'radio' as const, field: 'motivation' as const, options: motivationOptions },
  { cat: 'Brand', title: "Come si chiama il tuo brand?", type: 'input' as const, field: 'companyName' as const, options: [], placeholder: 'Es. Bella Milano', helper: '' },
  { cat: 'Il tuo store', title: "Qual è l'URL del tuo store?", type: 'input' as const, field: 'website' as const, options: [], placeholder: 'www.tuosito.com', helper: 'Puoi scrivere "privato" se preferisci non condividerlo.' },
];

const TOTAL_STEPS = STEPS.length;

// ═══ Label Resolvers (per webhook payload leggibile in Make/GHL) ═════════

const labelFor = (options: { value: string; label: string }[], value: string): string => {
  if (!value) return '';
  const opt = options.find(o => o.value === value);
  // Strip leading emoji + space for clean CRM display
  return (opt?.label || value).replace(/^[^\w\d]+\s/, '').trim();
};

const labelsFor = (options: { value: string; label: string }[], values: string[]): string[] => {
  if (!values?.length) return [];
  return values.map(v => labelFor(options, v));
};

// ═══ Shared Grid Background ══════════════════════════════════════════════

const GridBackground: React.FC = () => (
  <div
    className="fixed inset-0 pointer-events-none opacity-[0.06] z-0"
    style={{
      backgroundImage:
        'linear-gradient(#FAB450 1px, transparent 1px), linear-gradient(90deg, #FAB450 1px, transparent 1px)',
      backgroundSize: '48px 48px',
      maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
      WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
    }}
  />
);

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
    <div className="min-h-screen bg-[#121d2b] flex flex-col items-center justify-center px-4 font-['Montserrat',sans-serif] relative">
      <GridBackground />
      <div className="w-full max-w-lg relative z-[1]">
        <div className="bg-[#1a2942] border border-[#2a3a52] rounded-[18px] p-9 text-center">
          {/* Circular progress */}
          <div className="relative w-[120px] h-[120px] mx-auto mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="55" fill="none" stroke="#34465e" strokeWidth="8" />
              <circle cx="60" cy="60" r="55" fill="none" stroke="#FAB450" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                className="transition-all duration-600 ease-out" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-['Montserrat',sans-serif] text-[32px] text-[#f0f0eb] tracking-wider">
              {progress}%
            </span>
          </div>

          <h2 className="font-['Montserrat',sans-serif] text-[26px] tracking-wider text-[#f0f0eb] mb-1">
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
                  ${isDone ? 'text-[#FAB450]' : isActive ? 'text-[#f0f0eb] bg-[rgba(250,180,80,0.05)]' : 'text-[#5a5a5a]'}`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] flex-shrink-0
                    ${isDone ? 'border-[#FAB450] bg-[rgba(250,180,80,0.1)]' : isActive ? 'border-[#ff8c42] bg-[rgba(255,140,66,0.1)] animate-pulse' : 'border-[#34465e]'}`}>
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
  <div className="min-h-screen bg-[#121d2b] flex flex-col items-center justify-center px-4 font-['Montserrat',sans-serif] relative">
    <GridBackground />
    <div className="w-full max-w-md text-center relative z-[1]">
      <div className="text-6xl mb-6">😔</div>
      <h1 className="text-2xl font-bold text-[#f0f0eb] mb-4">
        Al momento non siamo il partner giusto per te
      </h1>
      <p className="text-[#888] mb-8">
        I nostri servizi sono ottimizzati per e-commerce con fatturato superiore a 10.000€/mese.
      </p>
      <div className="bg-[#1a2942] rounded-2xl p-6 border border-[#2a3a52]">
        <div className="flex items-center justify-center gap-2 text-[#FAB450] font-medium mb-3">
          <span>✨</span>
          <span>Risorse gratuite per te</span>
        </div>
        <p className="text-[#aaa] text-sm mb-4">
          Scarica la nostra guida gratuita per far crescere il tuo e-commerce con l'email marketing.
        </p>
        <a href="https://www.mailift.com/lm1-page" target="_blank" rel="noopener noreferrer"
          className="block w-full py-3 px-6 bg-[#FAB450] text-[#121d2b] rounded-xl font-semibold hover:bg-[#fbbf6a] transition-colors text-center">
          Scarica Guida Gratuita
        </a>
      </div>
      <p className="text-[#5a5a5a] text-sm mt-6">
        Quando il tuo business crescerà, saremo qui ad aspettarti! 🚀
      </p>
    </div>
  </div>
);

// ═══ Intro Screen ════════════════════════════════════════════════════════

const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

const CtaButton: React.FC<{ onClick: () => void; label?: string; className?: string }> = ({ onClick, label = 'Calcola la mia revenue persa', className = '' }) => (
  <button
    onClick={onClick}
    className={`group inline-flex items-center justify-center gap-2 px-8 py-[18px] bg-[#FAB450] text-[#121d2b] rounded-full font-['Montserrat',sans-serif] text-[17px] font-bold hover:bg-[#fbbf6a] hover:-translate-y-[2px] transition-all shadow-[0_10px_30px_rgba(250,180,80,0.35)] hover:shadow-[0_14px_40px_rgba(250,180,80,0.5)] ${className}`}
  >
    {label}
    <span className="transition-transform group-hover:translate-x-1"><ArrowIcon /></span>
  </button>
);

const IntroScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const { trackCtaClick } = useLandingTracking('email_marketing');
  const handleStart = () => { trackCtaClick(); onStart(); };
  const benefits = [
    { icon: '📊', title: 'Diagnosi completa', desc: 'Analisi delle 6 aree chiave del tuo email marketing.' },
    { icon: '🎯', title: 'Piano d\u2019azione 90 giorni', desc: 'Task prioritizzate per impatto e velocità.' },
    { icon: '💰', title: 'Stima revenue persa', desc: 'Quanto stai lasciando sul tavolo ogni mese.' },
  ];

  const steps = [
    { n: '01', title: 'Rispondi al quiz', desc: '12 domande veloci, solo 2 minuti del tuo tempo.' },
    { n: '02', title: 'Ricevi il report', desc: 'Personalizzato sul tuo eCommerce, on-screen e via email.' },
    { n: '03', title: 'Prenota una call', desc: 'Opzionale e gratuita per discutere i risultati.' },
  ];

  const areas = [
    { icon: '👥', label: 'Lista & Segmentazione' },
    { icon: '⚙️', label: 'Automazioni & Flow' },
    { icon: '✉️', label: 'Campagne & Newsletter' },
    { icon: '📬', label: 'Deliverability' },
    { icon: '📈', label: 'Revenue & ROI' },
    { icon: '🧭', label: 'Strategia & Crescita' },
  ];

  return (
    <div className="min-h-screen bg-[#121d2b] font-['Montserrat',sans-serif] text-[#f0f0eb] relative overflow-hidden">
      <GridBackground />
      <style>{`
        @keyframes heroDrift {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.06) translateY(-10px); }
        }
      `}</style>
      <img
        src={heroFlow}
        alt=""
        aria-hidden="true"
        className="absolute top-0 left-0 w-full h-[560px] md:h-[680px] object-cover opacity-40 pointer-events-none select-none"
        style={{
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 35%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 35%, transparent 100%)',
          animation: 'heroDrift 14s ease-in-out infinite',
        }}
      />

      <div className="relative z-[1]">
        {/* HERO */}
        <section className="max-w-[720px] mx-auto px-5 pt-20 pb-20 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#FAB450] opacity-20 blur-2xl scale-125" />
              <div className="relative w-24 h-24 rounded-full bg-[#1a2942] border-2 border-[#FAB450] shadow-[0_0_0_6px_rgba(250,180,80,0.12),0_0_40px_rgba(250,180,80,0.35)] flex items-center justify-center">
                <img src={mailiftLogo} alt="Mailift" className="h-8 w-auto" />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-[rgba(250,180,80,0.1)] border border-[rgba(250,180,80,0.25)] rounded-full px-[14px] py-[5px] text-[11px] font-semibold tracking-[2px] uppercase text-[#FAB450] mb-6">
            <span className="w-[6px] h-[6px] bg-[#FAB450] rounded-full animate-pulse" />
            Revenue Leak Audit
          </div>

          <h1 className="font-['Montserrat',sans-serif] text-[clamp(44px,9vw,76px)] leading-[0.95] tracking-wider mb-5">
            Le email dovrebbero fare il 25–40% del tuo fatturato.{' '}
            <span className="text-[#FAB450]">Nel tuo eCommerce quanto fanno?</span>
          </h1>

          <p className="text-[17px] text-[#9aa3b0] max-w-[560px] mx-auto mb-9 leading-relaxed">
            Rispondi a 12 domande e ricevi in 2 minuti il report personalizzato sulle{' '}
            <strong className="text-[#f0f0eb]">6 aree chiave</strong> del tuo email marketing.
          </p>

          <p className="text-[13px] text-[#FAB450] font-semibold tracking-wide mb-6">
            Pensato per eCommerce da 20k€+/mese
          </p>

          <CtaButton onClick={handleStart} />

          <p className="text-[#5a5a5a] text-[12px] mt-5">
            🔒 Gratis · 2 minuti · Nessuno spam
          </p>
        </section>

        {/* ANTEPRIMA REPORT */}
        <section className="max-w-[1100px] mx-auto px-5 py-16">
          <h2 className="font-['Montserrat',sans-serif] text-[clamp(32px,5vw,48px)] tracking-wider text-center mb-3">
            Anteprima del report che riceverai
          </h2>
          <p className="text-center text-[#888] mb-12 max-w-[600px] mx-auto">
            Ecco un esempio di cosa troverai dentro — dati reali, formule chiare, azioni prioritizzate.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { src: previewScore, alt: 'Diagnosi & Score', label: 'Diagnosi & Score' },
              { src: previewRevenue, alt: 'Stima revenue persa', label: 'Stima revenue persa' },
              { src: previewActions, alt: "Piano d'azione 90 giorni", label: "Piano d'azione 90 giorni" },
            ].map((p, i) => (
              <div
                key={i}
                className="group bg-[#1a2942] border border-[#2a3a52] rounded-[14px] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.35)] hover:border-[rgba(250,180,80,0.5)] hover:shadow-[0_20px_60px_rgba(250,180,80,0.15)] hover:-translate-y-1 transition-all duration-300"
              >
                {/* macOS title bar */}
                <div className="flex items-center gap-1.5 px-3 py-2.5 bg-[#0f1825] border-b border-[#2a3a52]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 text-[10px] text-[#5a6577] tracking-wider uppercase truncate">
                    mailift.com/report
                  </span>
                </div>
                <div className="bg-white">
                  <img
                    src={p.src}
                    alt={p.alt}
                    width={1024}
                    height={768}
                    loading="lazy"
                    className="w-full h-auto block"
                  />
                </div>
                <div className="px-4 py-3 bg-[#0f1825] border-t border-[#2a3a52] text-center">
                  <span className="text-[12px] font-semibold text-[#FAB450] tracking-wider uppercase">
                    {p.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-[#888] text-[14px] mt-10">
            ↓ Ottieni il <span className="text-[#FAB450] font-semibold">tuo report personalizzato</span> in 2 minuti
          </p>
        </section>

        {/* COSA OTTERRAI */}
        <section className="max-w-[1100px] mx-auto px-5 py-16">
          <h2 className="font-['Montserrat',sans-serif] text-[clamp(32px,5vw,48px)] tracking-wider text-center mb-3">
            Cosa otterrai dal report
          </h2>
          <p className="text-center text-[#888] mb-12 max-w-[520px] mx-auto">
            Un audit concreto sul tuo email marketing, pronto da usare.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <div
                key={i}
                className="bg-[#1a2942] border border-[#2a3a52] rounded-[18px] p-7 hover:border-[rgba(250,180,80,0.4)] transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-[rgba(250,180,80,0.12)] border border-[rgba(250,180,80,0.3)] flex items-center justify-center text-[22px] mb-4">
                  {b.icon}
                </div>
                <h3 className="text-[18px] font-bold mb-2 text-[#f0f0eb]">{b.title}</h3>
                <p className="text-[14px] text-[#9aa3b0] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* COME FUNZIONA */}
        <section className="max-w-[1100px] mx-auto px-5 py-16">
          <h2 className="font-['Montserrat',sans-serif] text-[clamp(32px,5vw,48px)] tracking-wider text-center mb-12">
            Come funziona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((s, i) => (
              <div key={i} className="relative text-center md:text-left">
                <div className="font-['Montserrat',sans-serif] text-[64px] leading-none text-[#FAB450] mb-3">
                  {s.n}
                </div>
                <h3 className="text-[18px] font-bold mb-2 text-[#f0f0eb]">{s.title}</h3>
                <p className="text-[14px] text-[#9aa3b0] leading-relaxed max-w-[280px] mx-auto md:mx-0">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* AREE ANALIZZATE */}
        <section className="max-w-[1100px] mx-auto px-5 py-16">
          <h2 className="font-['Montserrat',sans-serif] text-[clamp(32px,5vw,48px)] tracking-wider text-center mb-3">
            Le 6 aree analizzate
          </h2>
          <p className="text-center text-[#888] mb-12 max-w-[520px] mx-auto">
            Tutto ciò che serve per capire dove stai perdendo revenue.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {areas.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-[#1a2942] border border-[#2a3a52] rounded-full px-5 py-3 hover:border-[rgba(250,180,80,0.4)] transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-[rgba(250,180,80,0.12)] border border-[rgba(250,180,80,0.3)] flex items-center justify-center text-[16px] flex-shrink-0">
                  {a.icon}
                </span>
                <span className="text-[14px] font-semibold text-[#f0f0eb]">{a.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* SOCIAL PROOF */}
        <section className="max-w-[1100px] mx-auto px-5 py-16">
          <div className="bg-[#1a2942] border border-[#2a3a52] rounded-[24px] px-6 py-10 text-center">
            <p className="text-[13px] tracking-[2px] uppercase text-[#FAB450] font-semibold mb-3">
              Trusted by
            </p>
            <p className="text-[20px] md:text-[24px] font-bold text-[#f0f0eb] mb-8 max-w-[640px] mx-auto leading-snug">
              <span className="text-[#FAB450]">Più di 200 eCommerce analizzati</span> e oltre €5M di revenue email generata per i clienti.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-[760px] mx-auto">
              {[
                { v: '200+', l: 'eCommerce analizzati' },
                { v: '€5M+', l: 'revenue email generata' },
                { v: '2 min', l: 'di tempo richiesto' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="font-['Montserrat',sans-serif] text-[44px] leading-none text-[#FAB450] mb-1">
                    {s.v}
                  </div>
                  <div className="text-[13px] text-[#9aa3b0] uppercase tracking-wider">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CHI SONO */}
        <section className="max-w-[900px] mx-auto px-5 py-16">
          <div className="bg-[#1a2942] border border-[#2a3a52] rounded-[24px] p-7 md:p-10 flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <img
                src={lorenzoFounderAsset.url}
                alt="Lorenzo Baretta, founder di Mailift"
                width={400}
                height={400}
                loading="lazy"
                className="w-[180px] h-[180px] md:w-[220px] md:h-[220px] rounded-full object-cover bg-white border-2 border-[#FAB450] shadow-[0_0_0_6px_rgba(250,180,80,0.12)]"
              />
            </div>
            <div className="text-center md:text-left">
              <p className="text-[11px] tracking-[2px] uppercase text-[#FAB450] font-semibold mb-2">
                Chi analizzerà i tuoi dati
              </p>
              <h2 className="font-['Montserrat',sans-serif] text-[clamp(28px,4vw,40px)] tracking-wider mb-3">
                Lorenzo Baretta
              </h2>
              <p className="text-[15px] text-[#9aa3b0] leading-relaxed mb-4">
                Email Revenue Strategist e founder di Mailift. Da 6 anni lavoro solo con
                eCommerce, solo su Shopify e Klaviyo: più di 200 store analizzati e oltre{' '}
                <strong className="text-[#f0f0eb]">€5M di revenue email generata</strong> per i miei
                clienti. Il report che riceverai usa gli stessi benchmark e lo stesso metodo che
                applico ogni giorno sui brand che seguo.
              </p>
              <p className="text-[12px] text-[#5a5a5a] uppercase tracking-wider">
                Founder & Email Revenue Strategist · Mailift
              </p>
            </div>
          </div>
        </section>

        {/* CTA FINALE */}
        <section className="max-w-[720px] mx-auto px-5 py-20 text-center">
          <h2 className="font-['Montserrat',sans-serif] text-[clamp(36px,7vw,64px)] tracking-wider leading-[0.95] mb-5">
            Pronto a scoprire quanto puoi <span className="text-[#FAB450]">crescere?</span>
          </h2>
          <p className="text-[16px] text-[#9aa3b0] max-w-[480px] mx-auto mb-9">
            Bastano 2 minuti per ricevere il tuo report personalizzato.
          </p>
          <CtaButton onClick={handleStart} />
          <p className="text-[#5a5a5a] text-[12px] mt-5">
            🔒 Gratis · No spam · 2 minuti
          </p>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-[#2a3a52] mt-8">
          <div className="max-w-[1100px] mx-auto px-5 py-7 text-center text-[12px] text-[#5a5a5a]">
            © {new Date().getFullYear()} <span className="text-[#FAB450] font-semibold">Mailift</span> · Email Revenue Audit
          </div>
        </footer>
      </div>
    </div>
  );
};

// ═══ Main Component ══════════════════════════════════════════════════════

const EmailMarketingSurvey: React.FC<{ skipIntro?: boolean }> = ({ skipIntro = false }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<AdvancedReport | null>(null);
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'analyzing' | 'gate' | 'report' | 'disqualified'>(skipIntro ? 'quiz' : 'intro');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [emailValidation, setEmailValidation] = useState<EmailValidation>({ status: 'idle' });
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM });
  const [microFeedback, setMicroFeedback] = useState<{ icon: string; text: string } | null>(null);

  // Facebook Pixel: ViewContent — fires once on quiz mount
  const viewContentSentRef = useRef(false);
  useEffect(() => {
    if (viewContentSentRef.current) return;
    viewContentSentRef.current = true;
    trackViewContent();
  }, []);

  // Pre-fill email from landing redirect: /quiz?email=...
  // Also fires EngagedLead pixel — user has opted in on landing AND started quiz
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }));
      setEmailValidation(validateEmail(emailParam));
      trackEngagedLead(emailParam);
    }
  }, []);

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
    if (currentStep === TOTAL_STEPS - 1) {
      setPhase('analyzing');
    } else {
      goToNextStep();
    }
  }, [currentStep, goToNextStep]);

  // Micro-feedback content per step
  const getMicroFeedback = useCallback((step: number, data: FormData): { icon: string; text: string } | null => {
    if (step === 4) {
      const pct = data.emailRevenuePercentage;
      const isLow = pct === 'dont-know' || pct === '0-10' || pct === '10-20';
      return isLow
        ? { icon: '💸', text: 'Sotto il benchmark — nel report vedrai esattamente quanto vale il gap.' }
        : { icon: '✅', text: 'Buona base — vediamo dove ottimizzare per andare oltre.' };
    }
    if (step === 5) {
      const count = data.activeFlows.filter(f => f !== 'none').length;
      if (count <= 2) return { icon: '⚡', text: `${count} flussi attivi — i mancanti sono le leve più veloci per recuperare revenue.` };
      if (count <= 4) return { icon: '📈', text: 'Base solida — ogni flusso mancante è revenue automatica non sfruttata.' };
      return { icon: '✅', text: 'Ottima copertura — analizziamo dove affinare.' };
    }
    return null;
  }, []);

  // Advance with optional micro-feedback (step 4 radio, step 5 checkbox)
  const handleCheckboxContinue = useCallback(() => {
    const fb = getMicroFeedback(currentStep, formData);
    if (fb) {
      setMicroFeedback(fb);
      setTimeout(() => { setMicroFeedback(null); advanceFromCurrentStep(); }, 2500);
    } else {
      advanceFromCurrentStep();
    }
  }, [currentStep, formData, getMicroFeedback, advanceFromCurrentStep]);

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

    // Micro-feedback on Revenue Email % (step 4) before advancing
    if (field === 'emailRevenuePercentage') {
      const updatedData = { ...formData, emailRevenuePercentage: value };
      const fb = getMicroFeedback(4, updatedData);
      if (fb) {
        setTimeout(() => {
          setSelectedValue(null);
          setMicroFeedback(fb);
          setTimeout(() => { setMicroFeedback(null); advanceFromCurrentStep(); }, 2500);
        }, 400);
        return;
      }
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
          company_name: formData.companyName?.trim() || '',
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
          // ─── Lead Contact ───
          leadName: formData.fullName,
          leadEmail: formData.email,
          leadPhone: formData.phone,
          companyName: formData.companyName?.trim() || '',
          website: normalizedWebsite,
          acceptedTerms: true,

          // ─── Business Profile ───
          sector: advancedReport.sectorBenchmark.label,
          sectorRaw: formData.sector,
          customSector: formData.sector === 'other' ? formData.customSector : null,
          monthlyRevenue: advancedReport.monthlyRevenue,
          monthlyRevenueLabel: labelFor(revenueOptions, formData.monthlyRevenue),
          monthlyRevenueRaw: formData.monthlyRevenue,

          // ─── Tech Stack ───
          platform: formData.platform,
          platformLabel: labelFor(platformOptions, formData.platform),
          emailTool: formData.emailTool,
          emailToolLabel: labelFor(emailToolOptions, formData.emailTool),

          // ─── Email Marketing Setup ───
          emailRevenuePercentage: formData.emailRevenuePercentage,
          emailRevenuePercentageLabel: labelFor(emailRevenueOptions, formData.emailRevenuePercentage),
          activeFlows: formData.activeFlows,
          activeFlowsLabels: labelsFor(automationOptions, formData.activeFlows),
          activeFlowsCount: formData.activeFlows.filter(f => f !== 'none').length,
          segmentation: formData.segmentation,
          segmentationLabel: labelFor(segmentationOptions, formData.segmentation),
          emailFrequency: formData.emailFrequency,
          emailFrequencyLabel: labelFor(frequencyOptions, formData.emailFrequency),
          listSize: formData.listSize,
          listSizeLabel: labelFor(listSizeOptions, formData.listSize),

          // ─── Motivation ───
          motivation: formData.motivation,
          motivationLabel: adminReport.quizResponses.motivationLabel,

          // ─── Calculated Report Metrics ───
          emailHealthScore: advancedReport.emailHealthScore,
          yearlyPotential: advancedReport.yearlyPotential,
          currentEmailRevenue: advancedReport.currentEmailRevenue,
          benchmarkEmailRevenue: advancedReport.benchmarkEmailRevenue,
          revenueGap: advancedReport.recoverablePotential,
          potentialMode: advancedReport.potentialMode,

          // ─── Lead Scoring ───
          leadQuality: adminReport.consultingNotes.leadQuality,
          priorityLevel: adminReport.consultingNotes.priorityLevel,

          // ─── Links ───
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
        revenue_gap: advancedReport.recoverablePotential,
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
          company_name: formData.companyName?.trim() || '', full_name: formData.fullName, email: formData.email,
          phone: formData.phone || null, website: normalizedWebsite, ...updateData,
        } as never);
      }

      // FB Pixel
      trackCompleteRegistration({
        sector: advancedReport.sectorBenchmark.label,
        email: formData.email,
        companyName: formData.companyName?.trim() || '',
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
    setPhase('intro');
    setIsSubmitting(false);
    setLeadId(null);
    setEmailValidation({ status: 'idle' });
    setFormData({ ...INITIAL_FORM });
  }, []);

  // ═══ Phase Rendering ═══════════════════════════════════════════════

  if (phase === 'intro') return <IntroScreen onStart={() => setPhase('quiz')} />;

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
    // Potenziale a due vie: revenueGap puro mostrava €0 ai prospect sopra benchmark
    const previewGap = previewReport.recoverablePotential;
    const isLeakMode = previewReport.potentialMode === 'benchmark';
    const yearlyGap = previewGap * 12;
    const fmtMonth = previewGap.toLocaleString('it-IT', { maximumFractionDigits: 0 });
    const fmtYear = yearlyGap.toLocaleString('it-IT', { maximumFractionDigits: 0 });

    return (
      <div className="min-h-screen bg-[#121d2b] flex flex-col items-center justify-center px-4 font-['Montserrat',sans-serif] relative">
        <GridBackground />
        <div className="w-full max-w-[680px] mx-auto relative z-[1]">
          <div className="bg-[#1a2942] border border-[#2a3a52] rounded-[18px] overflow-hidden">
            {/* Top section */}
            <div className="bg-gradient-to-br from-[#0d1623] to-[#111] p-8 text-center relative overflow-hidden">
              <div className="absolute -top-[60%] left-1/2 -translate-x-1/2 w-[360px] h-[360px] bg-[radial-gradient(circle,rgba(250,180,80,0.07)_0%,transparent_65%)] pointer-events-none" />
              <div className="w-[52px] h-[52px] bg-[rgba(250,180,80,0.1)] border border-[rgba(250,180,80,0.3)] rounded-full flex items-center justify-center mx-auto mb-4 text-xl relative z-10">
                ✓✓
              </div>
              <h2 className="font-['Montserrat',sans-serif] text-[32px] tracking-wider text-[#f0f0eb] relative z-10">
                Analisi completata!
              </h2>
              <p className="text-[14px] text-[#888] max-w-[340px] mx-auto relative z-10 mt-2 leading-relaxed">
                Inserisci i tuoi dati per ricevere il report operativo personalizzato.
              </p>
            </div>

            {/* Potenziale highlight + unlock invite — doppia narrativa come l'hero del report */}
            <div className={`mx-5 mt-5 rounded-xl p-5 ${isLeakMode ? 'bg-[rgba(255,59,59,0.06)] border border-[rgba(255,59,59,0.2)]' : 'bg-[rgba(250,180,80,0.06)] border border-[rgba(250,180,80,0.25)]'}`}>
              <div className="text-center mb-3">
                <span className="font-['Montserrat',sans-serif] text-[10px] tracking-[2px] uppercase text-[#888]">
                  {isLeakMode ? 'Ecco quanto stai perdendo ogni mese' : 'Potenziale non sfruttato ogni mese'}
                </span>
                <div className={`font-['Montserrat',sans-serif] text-[42px] tracking-wide leading-tight mt-1 ${isLeakMode ? 'text-[#ff3b3b]' : 'text-[#FAB450]'}`}>
                  {fmtMonth}€<span className="text-[20px] text-[#888]">/mese</span>
                </div>
                <div className={`font-['Montserrat',sans-serif] text-[22px] tracking-wide leading-tight ${isLeakMode ? 'text-[#ff3b3b]/70' : 'text-[#FAB450]/70'}`}>
                  {fmtYear}€<span className="text-[16px] text-[#888]">/anno</span>
                </div>
              </div>
              <div className="h-px bg-[#2a3a52] my-3" />
              <p className="text-[13px] text-[#FAB450] font-semibold mb-2">Sblocca il report completo:</p>
              <ul className="text-[13px] text-[#888] leading-relaxed space-y-1.5">
                <li className="flex items-start gap-2"><span className="text-[#FAB450] mt-0.5">✓</span> Roadmap personalizzata</li>
                <li className="flex items-start gap-2"><span className="text-[#FAB450] mt-0.5">✓</span> Scenari di crescita a 3-6-12 mesi</li>
                <li className="flex items-start gap-2"><span className="text-[#FAB450] mt-0.5">✓</span> Piano d'azione con priorità</li>
              </ul>
            </div>

            {/* Form */}
            <div className="p-5">
              {/* Honeypot */}
              <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                <input type="text" value={formData._hp_field} onChange={e => handleInputChange('_hp_field', e.target.value)} tabIndex={-1} autoComplete="new-password" />
              </div>

              <span className="font-['Montserrat',sans-serif] text-[10px] tracking-[2px] uppercase text-[#5a5a5a] block mb-3">
                // I tuoi dati
              </span>

              <div className="flex flex-col gap-[9px] mb-4">
                <div>
                  <span className="text-[11px] text-[#5a5a5a] uppercase tracking-wider block mb-1">Nome e Cognome</span>
                  <input type="text" value={formData.fullName} onChange={e => handleInputChange('fullName', e.target.value)}
                    className="w-full py-[13px] px-[15px] bg-[#121d2b] border border-[#2a3a52] rounded-[10px] text-[#f0f0eb] font-['Montserrat',sans-serif] text-[14px] font-medium outline-none focus:border-[rgba(250,180,80,0.4)] transition-colors placeholder:text-[#252525]"
                    placeholder="Mario Rossi" autoComplete="name" />
                </div>
                <div>
                  <span className="text-[11px] text-[#5a5a5a] uppercase tracking-wider block mb-1">Email</span>
                  <input type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)}
                    className="w-full py-[13px] px-[15px] bg-[#121d2b] border border-[#2a3a52] rounded-[10px] text-[#f0f0eb] font-['Montserrat',sans-serif] text-[14px] font-medium outline-none focus:border-[rgba(250,180,80,0.4)] transition-colors placeholder:text-[#252525]"
                    placeholder="nome@tuaemail.com" autoComplete="email" inputMode="email" />
                  {emailValidation.status === 'invalid' && (
                    <p className="text-[#ff3b3b] text-xs mt-1">{emailValidation.message}</p>
                  )}
                </div>
                <div>
                  <span className="text-[11px] text-[#5a5a5a] uppercase tracking-wider block mb-1">WhatsApp / Telefono</span>
                  <input type="tel" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)}
                    className="w-full py-[13px] px-[15px] bg-[#121d2b] border border-[#2a3a52] rounded-[10px] text-[#f0f0eb] font-['Montserrat',sans-serif] text-[14px] font-medium outline-none focus:border-[rgba(250,180,80,0.4)] transition-colors placeholder:text-[#252525]"
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
                    ${formData.acceptTerms ? 'bg-[#FAB450] border-[#FAB450]' : 'border-[#34465e] bg-[#121d2b]'}`}>
                  {formData.acceptTerms && <span className="text-[10px] text-[#121d2b] font-bold">✓</span>}
                </div>
                <span>
                  Acconsento al trattamento dei dati ai sensi della <a href="/privacy" target="_blank" className="text-[#FAB450] underline">Privacy Policy</a>. 
                  Fornendo il mio numero, accetto di ricevere messaggi per il report personalizzato.
                </span>
              </div>

              {/* Submit */}
              <button onClick={handleGateSubmit} disabled={!canSubmit}
                className={`w-full py-4 rounded-[10px] font-['Montserrat',sans-serif] text-[15px] font-bold flex items-center justify-center gap-2 transition-all
                  ${canSubmit ? 'bg-[#FAB450] text-[#121d2b] hover:bg-[#fbbf6a] hover:-translate-y-[1px] cursor-pointer' : 'bg-[#FAB450]/60 text-[#121d2b]/60 cursor-not-allowed'}`}>
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

  return (
    <div className="min-h-screen bg-[#121d2b] font-['Montserrat',sans-serif] text-[#f0f0eb] relative">
      <GridBackground />
      <div className="max-w-[680px] mx-auto px-[18px] relative z-[1]">
        {/* Header */}
        <header className="pt-6 text-center">
          <img src={mailiftLogo} alt="Mailift" className="h-10 w-auto mx-auto" />
        </header>

        {/* Hero */}
        <div className="pt-9 pb-7 text-center">
          <div className="inline-flex items-center gap-2 bg-[rgba(250,180,80,0.1)] border border-[rgba(250,180,80,0.25)] rounded-full px-[14px] py-[5px] text-[11px] font-semibold tracking-[2px] uppercase text-[#FAB450] mb-5">
            <span className="w-[6px] h-[6px] bg-[#FAB450] rounded-full animate-pulse" />
            Revenue Leak Audit
          </div>
          <h1 className="font-['Montserrat',sans-serif] text-[clamp(48px,11vw,80px)] leading-[0.92] tracking-wider mb-4">
            Quanto stai{' '}
            <span className="text-[#FAB450] font-['Playfair_Display',serif] italic">perdendo ogni mese?</span>
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
            <div className="h-full bg-[#FAB450] transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between px-5 pt-3">
            <span className="font-['Montserrat',sans-serif] text-[11px] text-[#5a5a5a] tracking-wider">
              DOMANDA {currentStep + 1} / {TOTAL_STEPS}
            </span>
            <span className="font-['Montserrat',sans-serif] text-[11px] text-[#FAB450]">
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
              <div className="font-['Montserrat',sans-serif] text-[10px] tracking-[2px] uppercase text-[#FAB450] mb-2">
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
                            ? 'border-[#FAB450] bg-[rgba(250,180,80,0.1)] text-[#f0f0eb]'
                            : 'border-[#2a3a52] bg-[#121d2b] text-[#aaa] hover:border-[rgba(250,180,80,0.35)] hover:bg-[rgba(250,180,80,0.05)] hover:text-[#f0f0eb]'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
                          ${isSelected ? 'border-[#FAB450] bg-[#FAB450]' : 'border-[#34465e]'}`}>
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
                        className="w-full py-[13px] px-[15px] bg-[#121d2b] border border-[#2a3a52] rounded-[10px] text-[#f0f0eb] font-['Montserrat',sans-serif] text-[14px] font-medium outline-none focus:border-[rgba(250,180,80,0.45)] transition-colors placeholder:text-[#252525]"
                        autoFocus />
                      <button onClick={() => { if (formData.customSector.trim()) advanceFromCurrentStep(); }}
                        className="w-full py-4 bg-[#FAB450] text-[#121d2b] rounded-[10px] font-['Montserrat',sans-serif] text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#fbbf6a] transition-all">
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
                            ? 'border-[#FAB450] bg-[rgba(250,180,80,0.1)] text-[#f0f0eb]'
                            : 'border-[#2a3a52] bg-[#121d2b] text-[#aaa] hover:border-[rgba(250,180,80,0.35)] hover:bg-[rgba(250,180,80,0.05)] hover:text-[#f0f0eb]'}`}>
                        <div className={`w-4 h-4 rounded-[3px] border-2 flex-shrink-0 flex items-center justify-center transition-all
                          ${isSelected ? 'border-[#FAB450] bg-[#FAB450]' : 'border-[#34465e]'}`}>
                          {isSelected && <span className="text-[10px] text-[#121d2b] font-bold">✓</span>}
                        </div>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Input (text/URL) */}
              {step.type === 'input' && (
                <div>
                  <input
                    value={(formData[step.field as keyof FormData] as string) || ''}
                    onChange={e => handleInputChange(step.field as keyof FormData, e.target.value)}
                    placeholder={(step as { placeholder?: string }).placeholder || ''}
                    autoFocus
                    className="w-full py-[13px] px-[15px] bg-[#121d2b] border border-[#2a3a52] rounded-[10px] text-[#f0f0eb] font-['Montserrat',sans-serif] text-[14px] font-medium outline-none focus:border-[rgba(250,180,80,0.45)] transition-colors placeholder:text-[#252525]" />
                  {(step as { helper?: string }).helper && (
                    <p className="mt-[6px] text-[11px] text-[#5a5a5a]">
                      {(step as { helper?: string }).helper}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Micro-feedback banner — appare inline dopo la selezione */}
          <AnimatePresence>
            {microFeedback && (
              <motion.div
                key="micro-feedback"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="mx-5 mb-4 flex items-start gap-2 bg-[rgba(250,180,80,0.08)] border border-[rgba(250,180,80,0.3)] rounded-[10px] px-4 py-3"
              >
                <span className="text-base flex-shrink-0">{microFeedback.icon}</span>
                <p className="text-[13px] text-[#FAB450] font-medium leading-snug">{microFeedback.text}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer buttons */}
          {(step.type === 'checkbox' || step.type === 'input') && (() => {
            const inputValue = step.type === 'input'
              ? ((formData[step.field as keyof FormData] as string) || '').trim()
              : '';
            const disabled =
              (step.type === 'checkbox' && formData.activeFlows.length === 0) ||
              (step.type === 'input' && !inputValue) ||
              !!microFeedback;
            const onClick = step.type === 'checkbox'
              ? () => { if (!disabled) handleCheckboxContinue(); }
              : () => { if (!disabled) advanceFromCurrentStep(); };
            return (
              <div className="px-5 pb-5">
                <button
                  onClick={onClick}
                  disabled={disabled}
                  className="w-full py-4 bg-[#FAB450] text-[#121d2b] rounded-[10px] font-['Montserrat',sans-serif] text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#fbbf6a] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  Continua
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <footer className="text-center pb-9 text-[11px] text-[#5a5a5a]">
          © {new Date().getFullYear()} <span className="text-[#FAB450]">Mailift</span>. Revenue Leak Audit.
        </footer>
      </div>
    </div>
  );
};

export default EmailMarketingSurvey;
