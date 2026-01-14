import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { calculateAdvancedReport, type AdvancedReport } from '@/lib/reportCalculations';
import { generateAdminReport } from '@/lib/adminReportGenerator';
import AdvancedReportComponent from '@/components/AdvancedReport';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';

interface FormData {
  sector: string;
  monthlyRevenue: string;
  adsInvestment: string;
  emailRevenuePercentage: string;
  emailFrequency: string;
  listSize: string;
  activeFlows: string[];
  website: string;
  fullName: string;
  phone: string;
  email: string;
  acceptTerms: boolean;
}

const EmailMarketingSurvey = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [report, setReport] = useState<AdvancedReport | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    sector: '',
    monthlyRevenue: '',
    adsInvestment: '',
    emailRevenuePercentage: '',
    emailFrequency: '',
    listSize: '',
    activeFlows: [],
    website: '',
    fullName: '',
    phone: '',
    email: '',
    acceptTerms: false
  });

  const sectors = [
    { id: 'beauty', label: 'Beauty & Personal Care', icon: '💄', value: 'beauty' },
    { id: 'fashion', label: 'Abbigliamento o accessori', icon: '👗', value: 'fashion' },
    { id: 'digital', label: 'Prodotti digitali', icon: '💻', value: 'digital' },
    { id: 'home', label: 'Articoli per la casa', icon: '🏠', value: 'home' },
    { id: 'jewelry', label: 'Gioielli', icon: '💎', value: 'jewelry' },
    { id: 'food', label: 'Food & Beverage', icon: '🍔', value: 'food' },
    { id: 'health', label: 'Salute e integrazione', icon: '❤️', value: 'health' }
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

  const steps = [
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
    },
    {
      title: "Qual è il tuo sito web?",
      type: "input" as const,
      field: "website" as keyof FormData
    },
    {
      title: "Dove ti inviamo il report?",
      subtitle: "Ti contatteremo su WhatsApp con il tuo report personalizzato",
      type: "contact" as const
    }
  ];

  const goToNextStep = () => {
    if (currentStep < steps.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handleRadioSelect = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Auto-advance for radio questions
    setTimeout(() => {
      goToNextStep();
    }, 300);
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
  };

  const handleSubmit = async () => {
    if (!formData.acceptTerms) {
      toast({
        title: "Errore",
        description: "Devi accettare i termini e condizioni per continuare",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const advancedReport = calculateAdvancedReport(
        formData.sector,
        formData.monthlyRevenue,
        formData.emailRevenuePercentage,
        formData.listSize,
        formData.activeFlows
      );
      
      const adminReport = generateAdminReport(formData, advancedReport);
      
      const dataToSend = {
        type: 'admin_report',
        timestamp: new Date().toISOString(),
        source: 'email-marketing-quiz',
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
          priorityLevel: adminReport.consultingNotes.priorityLevel
        },
        adminReport,
        clientReport: advancedReport
      };

      await fetch('https://hook.eu1.make.com/hi1xrv57zvt5kilh1fye9130gb132vx3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify(dataToSend)
      });

      toast({
        title: "Dati inviati con successo!",
        description: "Riceverai il report personalizzato via WhatsApp a breve.",
      });

      setReport(advancedReport);
      setCurrentStep(steps.length);
      
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore. Riprova più tardi.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setReport(null);
    setFormData({
      sector: '',
      monthlyRevenue: '',
      adsInvestment: '',
      emailRevenuePercentage: '',
      emailFrequency: '',
      listSize: '',
      activeFlows: [],
      website: '',
      fullName: '',
      phone: '',
      email: '',
      acceptTerms: false
    });
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const showContinueButton = currentStepData?.type === 'checkbox' || currentStepData?.type === 'input';

  // Report finale
  if (currentStep === steps.length && report) {
    return (
      <AdvancedReportComponent 
        report={report} 
        phone={formData.phone}
        userName={formData.fullName}
        userEmail={formData.email}
        website={formData.website}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Progress bar */}
      <div className="w-full bg-slate-800 px-4 py-6">
        <div className="max-w-xl mx-auto">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <p className="text-slate-400 text-sm text-center mt-3">
            {currentStep + 1} di {steps.length}
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div 
          className={`w-full max-w-xl transition-all duration-150 ${
            isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Question */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {currentStepData.title}
            </h1>
            {currentStepData.subtitle && (
              <p className="text-slate-400">
                {currentStepData.subtitle}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentStepData.type === "radio" && currentStepData.options?.map((option, index) => {
              const isSelected = formData[currentStepData.field] === option.value;
              return (
                <button
                  key={option.id}
                  onClick={() => handleRadioSelect(currentStepData.field, option.value)}
                  className={`
                    w-full p-4 rounded-xl border-2 text-left transition-all duration-200
                    flex items-center gap-4
                    ${isSelected
                      ? 'bg-orange border-orange text-white scale-[1.02]'
                      : 'bg-slate-800/50 border-slate-700 text-white hover:border-orange/50 hover:bg-slate-800'
                    }
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {'icon' in option && option.icon && (
                    <span className="text-2xl">{option.icon as string}</span>
                  )}
                  <span className="text-lg font-medium">{option.label}</span>
                  {isSelected && (
                    <Check className="ml-auto h-5 w-5" />
                  )}
                </button>
              );
            })}

            {currentStepData.type === "checkbox" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {currentStepData.options?.map((option) => {
                    const isChecked = formData.activeFlows.includes(option.value);
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleCheckboxChange(option.value, !isChecked)}
                        className={`
                          p-4 rounded-xl border-2 text-left transition-all duration-200
                          ${isChecked
                            ? 'bg-orange border-orange text-white'
                            : 'bg-slate-800/50 border-slate-700 text-white hover:border-orange/50'
                          }
                        `}
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
                {formData.activeFlows.length > 0 && (
                  <p className="text-center text-slate-400 text-sm mt-4">
                    {formData.activeFlows.length} flusso/i selezionato/i
                  </p>
                )}
              </>
            )}

            {currentStepData.type === "input" && (
              <div className="space-y-4">
                <Input
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="www.tuosito.com"
                  className="bg-slate-800 border-slate-700 text-white h-14 text-lg rounded-xl focus:border-orange focus:ring-orange"
                />
              </div>
            )}

            {currentStepData.type === "contact" && (
              <div className="space-y-4">
                <Input
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Nome completo"
                  className="bg-slate-800 border-slate-700 text-white h-14 text-lg rounded-xl focus:border-orange focus:ring-orange"
                />
                <Input
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Numero WhatsApp (+39...)"
                  className="bg-slate-800 border-slate-700 text-white h-14 text-lg rounded-xl focus:border-orange focus:ring-orange"
                />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Email"
                  className="bg-slate-800 border-slate-700 text-white h-14 text-lg rounded-xl focus:border-orange focus:ring-orange"
                />
                
                <div className="flex items-start gap-3 pt-4">
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
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!formData.acceptTerms || isSubmitting}
                  className={`
                    w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200
                    flex items-center justify-center gap-2
                    ${formData.acceptTerms && !isSubmitting
                      ? 'bg-orange text-white hover:bg-orange/90 active:scale-[0.98]'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    }
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Invio in corso...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      Ricevi il Report
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Continue button for checkbox/input steps */}
          {showContinueButton && (
            <button
              onClick={goToNextStep}
              className="w-full mt-6 py-4 rounded-xl bg-orange text-white font-semibold text-lg hover:bg-orange/90 active:scale-[0.98] transition-all duration-200"
            >
              Continua
            </button>
          )}
        </div>
      </div>

      {/* Back button */}
      {currentStep > 0 && (
        <div className="px-4 pb-8">
          <div className="max-w-xl mx-auto">
            <button
              onClick={handlePrevious}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Indietro</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailMarketingSurvey;
