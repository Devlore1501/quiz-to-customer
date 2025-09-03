import { useState } from 'react';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

interface BusinessData {
  settore: string;
  fatturato_mensile: string;
  investimento_ads: string;
  percentuale_email: string;
  contatti_lista: string;
  open_rate: string;
  click_rate: string;
  conversion_rate: string;
  aov: string;
  margine: string;
  flussi_attivi: string[];
  name: string;
  email: string;
  phone: string;
}

// Survey Card Component
const SurveyCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn(
    "bg-card rounded-lg shadow-elegant p-8 w-full max-w-2xl mx-auto",
    "border border-border/50 backdrop-blur-sm animate-slide-in",
    className
  )}>
    {children}
  </div>
);

// Progress Bar Component
const ProgressBar = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  const progress = (currentStep / totalSteps) * 100;
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>Progress</span>
        <span>{currentStep} of {totalSteps}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// Survey Button Component
const SurveyButton = ({ 
  children, 
  onClick, 
  variant = 'option',
  disabled = false,
  className 
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  variant?: 'primary' | 'option' | 'secondary' | 'orange';
  disabled?: boolean;
  className?: string;
}) => {
  const baseClasses = "w-full p-4 rounded-lg font-medium transition-all duration-300 ease-out text-left";
  
  const variants = {
    primary: "bg-gradient-primary text-primary-foreground hover:shadow-glow hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
    option: "bg-secondary/50 text-secondary-foreground border border-border/50 hover:bg-secondary hover:border-primary/30 hover:shadow-elegant hover:scale-102",
    secondary: "bg-muted text-muted-foreground hover:bg-muted/80",
    orange: "bg-orange text-orange-foreground hover:bg-orange/90 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(baseClasses, variants[variant], className)}
    >
      {children}
    </button>
  );
};

export const EmailMarketingSurvey = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessData, setBusinessData] = useState<BusinessData>({
    settore: '',
    fatturato_mensile: '',
    investimento_ads: '',
    percentuale_email: '',
    contatti_lista: '',
    open_rate: '',
    click_rate: '',
    conversion_rate: '',
    aov: '',
    margine: '',
    flussi_attivi: [],
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateBusinessData = (field: keyof BusinessData, value: string | string[]) => {
    setBusinessData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const submitSurvey = async () => {
    setIsSubmitting(true);
    
    const dataToSend = {
      ...businessData,
      timestamp: new Date().toISOString(),
      source: 'business-analysis-tool'
    };

    try {
      await fetch('https://hook.eu1.make.com/hi1xrv57zvt5kilh1fye9130gb132vx3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify(dataToSend)
      });
      console.log('Survey data sent:', dataToSend);
    } catch (error) {
      console.error('Webhook error:', error);
    }

    setTimeout(() => {
      setCurrentStep(7);
      setIsSubmitting(false);
    }, 1500);
  };

  const calculatePotentialLost = () => {
    const fatturato = parseFloat(businessData.fatturato_mensile) || 0;
    const emailPercent = parseFloat(businessData.percentuale_email) || 0;
    const openRate = parseFloat(businessData.open_rate) || 0;
    const clickRate = parseFloat(businessData.click_rate) || 0;
    const conversionRate = parseFloat(businessData.conversion_rate) || 0;
    const aov = parseFloat(businessData.aov) || 0;
    const margine = parseFloat(businessData.margine) || 0;
    const contatti = parseFloat(businessData.contatti_lista) || 0;

    // Calcoli benchmark di settore
    const benchmarks = {
      open_rate: 25,
      click_rate: 3.5,
      conversion_rate: 2.5,
      email_revenue_percent: 25
    };

    const currentEmailRevenue = fatturato * (emailPercent / 100);
    const potentialEmailRevenue = fatturato * (benchmarks.email_revenue_percent / 100);
    const revenueGap = potentialEmailRevenue - currentEmailRevenue;

    // Scenari di crescita
    const conservativeGrowth = revenueGap * 0.3;
    const baseGrowth = revenueGap * 0.6;
    const aggressiveGrowth = revenueGap * 0.9;

    return {
      current: {
        fatturato_email_mensile: currentEmailRevenue,
        fatturato_email_annuo: currentEmailRevenue * 12,
        margine_mensile: currentEmailRevenue * (margine / 100),
        margine_annuo: currentEmailRevenue * (margine / 100) * 12
      },
      potential: {
        fatturato_email_mensile: potentialEmailRevenue,
        fatturato_email_annuo: potentialEmailRevenue * 12,
        margine_mensile: potentialEmailRevenue * (margine / 100),
        margine_annuo: potentialEmailRevenue * (margine / 100) * 12
      },
      gap: {
        fatturato_mensile: revenueGap,
        fatturato_annuo: revenueGap * 12,
        margine_mensile: revenueGap * (margine / 100),
        margine_annuo: revenueGap * (margine / 100) * 12
      },
      scenarios: {
        conservativo: {
          incremento_mensile: conservativeGrowth,
          incremento_annuo: conservativeGrowth * 12,
          margine_aggiuntivo_annuo: conservativeGrowth * 12 * (margine / 100)
        },
        base: {
          incremento_mensile: baseGrowth,
          incremento_annuo: baseGrowth * 12,
          margine_aggiuntivo_annuo: baseGrowth * 12 * (margine / 100)
        },
        aggressivo: {
          incremento_mensile: aggressiveGrowth,
          incremento_annuo: aggressiveGrowth * 12,
          margine_aggiuntivo_annuo: aggressiveGrowth * 12 * (margine / 100)
        }
      },
      benchmarks
    };
  };

  const getStrategicRecommendations = () => {
    const openRate = parseFloat(businessData.open_rate) || 0;
    const clickRate = parseFloat(businessData.click_rate) || 0;
    const flussiAttivi = businessData.flussi_attivi;
    
    let priorities = [];
    let quickWins = [];
    let longTerm = [];

    // Analisi flussi mancanti
    const flussiCritici = ['welcome', 'abbandono_carrello', 'post_acquisto', 'winback'];
    const flussiMancanti = flussiCritici.filter(f => !flussiAttivi.includes(f));

    if (flussiMancanti.includes('abbandono_carrello')) {
      priorities.push('🛒 Implementare flusso recupero carrello abbandonato (+15-25% revenue)');
    }
    if (flussiMancanti.includes('welcome')) {
      priorities.push('👋 Creare serie di benvenuto (3-5 email, +20% engagement)');
    }
    if (flussiMancanti.includes('post_acquisto')) {
      priorities.push('📦 Attivare flusso post-acquisto (+10% repeat purchase)');
    }
    if (flussiMancanti.includes('winback')) {
      priorities.push('💎 Implementare campagne win-back (+8% customer recovery)');
    }

    // Analisi performance
    if (openRate < 22) {
      quickWins.push('📧 Ottimizzare subject line e preheader');
      quickWins.push('🕐 Testare orari di invio ottimali');
      quickWins.push('🎯 Migliorare segmentazione lista');
    }

    if (clickRate < 3) {
      quickWins.push('🎨 Ottimizzare design email (CTA, layout)');
      quickWins.push('📱 Migliorare responsive design');
      quickWins.push('🔥 Personalizzare contenuti per segmenti');
    }

    // Strategie long-term
    longTerm.push('🤖 Implementare automazioni avanzate basate su comportamento');
    longTerm.push('📊 Installare tracking avanzato e analytics');
    longTerm.push('🎯 Sviluppare strategia omnichannel');
    longTerm.push('💰 Integrare loyalty program con email marketing');

    return { priorities, quickWins, longTerm };
  };

  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto">
          <ProgressBar currentStep={currentStep} totalSteps={6} />
          <SurveyCard>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-2xl">🏢</span>
                <h2 className="text-2xl font-bold text-foreground">In che settore opera la tua azienda?</h2>
              </div>
            </div>
            
            <div className="space-y-4">
              <SurveyButton
                onClick={() => {
                  updateBusinessData('settore', 'Moda & Abbigliamento');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">👗</span>
                  <span className="text-lg font-medium">Moda & Abbigliamento</span>
                </div>
              </SurveyButton>
              
              <SurveyButton
                onClick={() => {
                  updateBusinessData('settore', 'Bellezza & Cosmetici');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">💄</span>
                  <span className="text-lg font-medium">Bellezza & Cosmetici</span>
                </div>
              </SurveyButton>
              
              <SurveyButton
                onClick={() => {
                  updateBusinessData('settore', 'Casa & Arredamento');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🏠</span>
                  <span className="text-lg font-medium">Casa & Arredamento</span>
                </div>
              </SurveyButton>

              <SurveyButton
                onClick={() => {
                  updateBusinessData('settore', 'Elettronica & Tech');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">📱</span>
                  <span className="text-lg font-medium">Elettronica & Tech</span>
                </div>
              </SurveyButton>

              <SurveyButton
                onClick={() => {
                  updateBusinessData('settore', 'Altro');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🛍️</span>
                  <span className="text-lg font-medium">Altro settore</span>
                </div>
              </SurveyButton>
            </div>
          </SurveyCard>
        </div>
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto">
          <ProgressBar currentStep={currentStep} totalSteps={6} />
          <SurveyCard>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-2xl">💰</span>
                <h2 className="text-2xl font-bold text-foreground">Dati di fatturato e investimenti</h2>
              </div>
              <p className="text-muted-foreground">Inserisci i tuoi dati mensili medi</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  💵 Fatturato mensile medio (€)
                </label>
                <Input
                  type="number"
                  placeholder="es. 50000"
                  value={businessData.fatturato_mensile}
                  onChange={(e) => updateBusinessData('fatturato_mensile', e.target.value)}
                  className="text-lg h-12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  📊 Investimento mensile in ADS (€)
                </label>
                <Input
                  type="number"
                  placeholder="es. 10000"
                  value={businessData.investimento_ads}
                  onChange={(e) => updateBusinessData('investimento_ads', e.target.value)}
                  className="text-lg h-12"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  📧 % fatturato da email marketing
                </label>
                <Input
                  type="number"
                  placeholder="es. 15"
                  value={businessData.percentuale_email}
                  onChange={(e) => updateBusinessData('percentuale_email', e.target.value)}
                  className="text-lg h-12"
                />
              </div>
            </div>

            <SurveyButton
              variant="primary"
              onClick={nextStep}
              disabled={!businessData.fatturato_mensile || !businessData.investimento_ads || !businessData.percentuale_email}
              className="mt-8"
            >
              Continua →
            </SurveyButton>
          </SurveyCard>
        </div>
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto">
          <ProgressBar currentStep={currentStep} totalSteps={6} />
          <SurveyCard>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-2xl">📊</span>
                <h2 className="text-2xl font-bold text-foreground">Performance email attuali</h2>
              </div>
              <p className="text-muted-foreground">Inserisci le metriche delle tue email</p>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    👥 Contatti in lista
                  </label>
                  <Input
                    type="number"
                    placeholder="es. 10000"
                    value={businessData.contatti_lista}
                    onChange={(e) => updateBusinessData('contatti_lista', e.target.value)}
                    className="text-lg h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    📧 Open Rate medio (%)
                  </label>
                  <Input
                    type="number"
                    placeholder="es. 22"
                    value={businessData.open_rate}
                    onChange={(e) => updateBusinessData('open_rate', e.target.value)}
                    className="text-lg h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    🖱️ Click Rate medio (%)
                  </label>
                  <Input
                    type="number"
                    placeholder="es. 2.5"
                    value={businessData.click_rate}
                    onChange={(e) => updateBusinessData('click_rate', e.target.value)}
                    className="text-lg h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    💰 Conversion Rate (%)
                  </label>
                  <Input
                    type="number"
                    placeholder="es. 1.8"
                    value={businessData.conversion_rate}
                    onChange={(e) => updateBusinessData('conversion_rate', e.target.value)}
                    className="text-lg h-12"
                  />
                </div>
              </div>
            </div>

            <SurveyButton
              variant="primary"
              onClick={nextStep}
              disabled={!businessData.contatti_lista || !businessData.open_rate || !businessData.click_rate}
              className="mt-8"
            >
              Continua →
            </SurveyButton>
          </SurveyCard>
        </div>
      </div>
    );
  }

  if (currentStep === 4) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto">
          <ProgressBar currentStep={currentStep} totalSteps={6} />
          <SurveyCard>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-2xl">🛒</span>
                <h2 className="text-2xl font-bold text-foreground">Dati business aggiuntivi</h2>
              </div>
              <p className="text-muted-foreground">Per calcolare il potenziale</p>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    💸 AOV medio (€)
                  </label>
                  <Input
                    type="number"
                    placeholder="es. 75"
                    value={businessData.aov}
                    onChange={(e) => updateBusinessData('aov', e.target.value)}
                    className="text-lg h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    📈 Margine lordo (%)
                  </label>
                  <Input
                    type="number"
                    placeholder="es. 60"
                    value={businessData.margine}
                    onChange={(e) => updateBusinessData('margine', e.target.value)}
                    className="text-lg h-12"
                  />
                </div>
              </div>
            </div>

            <SurveyButton
              variant="primary"
              onClick={nextStep}
              disabled={!businessData.aov || !businessData.margine}
              className="mt-8"
            >
              Continua →
            </SurveyButton>
          </SurveyCard>
        </div>
      </div>
    );
  }

  if (currentStep === 5) {
    const flussiOptions = [
      { id: 'welcome', label: '👋 Welcome Series', description: 'Serie di benvenuto per nuovi iscritti' },
      { id: 'abbandono_carrello', label: '🛒 Abandon Cart', description: 'Recupero carrelli abbandonati' },
      { id: 'post_acquisto', label: '📦 Post Purchase', description: 'Follow-up post acquisto' },
      { id: 'winback', label: '💎 Win-back', description: 'Riattivazione clienti inattivi' },
      { id: 'browse_abandonment', label: '👀 Browse Abandonment', description: 'Abbandono navigazione' },
      { id: 'back_in_stock', label: '📦 Back in Stock', description: 'Notifiche prodotti disponibili' }
    ];

    const toggleFlusso = (flussoId: string) => {
      const current = businessData.flussi_attivi;
      const updated = current.includes(flussoId) 
        ? current.filter(f => f !== flussoId)
        : [...current, flussoId];
      updateBusinessData('flussi_attivi', updated);
    };

    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto">
          <ProgressBar currentStep={currentStep} totalSteps={6} />
          <SurveyCard>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-2xl">🤖</span>
                <h2 className="text-2xl font-bold text-foreground">Flussi email attualmente attivi</h2>
              </div>
              <p className="text-muted-foreground">Seleziona i flussi che hai già implementato</p>
            </div>
            
            <div className="space-y-4">
              {flussiOptions.map((flusso) => (
                <div 
                  key={flusso.id}
                  onClick={() => toggleFlusso(flusso.id)}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200",
                    businessData.flussi_attivi.includes(flusso.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30 hover:bg-secondary/50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{flusso.label}</div>
                      <div className="text-sm text-muted-foreground">{flusso.description}</div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center",
                      businessData.flussi_attivi.includes(flusso.id)
                        ? "border-primary bg-primary text-white"
                        : "border-border"
                    )}>
                      {businessData.flussi_attivi.includes(flusso.id) && "✓"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <SurveyButton
              variant="primary"
              onClick={nextStep}
              className="mt-8"
            >
              Continua →
            </SurveyButton>
          </SurveyCard>
        </div>
      </div>
    );
  }

  if (currentStep === 6) {
    const isFormValid = businessData.name && businessData.email;
    
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto">
          <ProgressBar currentStep={currentStep} totalSteps={6} />
          <SurveyCard>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-2xl">👤</span>
                <h2 className="text-2xl font-bold text-foreground">Ultimo passo! I tuoi contatti</h2>
              </div>
              <p className="text-muted-foreground">Ti invieremo il report completo via email</p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground text-xl">👤</span>
                <Input
                  type="text"
                  placeholder="Il tuo nome completo"
                  value={businessData.name}
                  onChange={(e) => updateBusinessData('name', e.target.value)}
                  className="pl-12 py-4 text-lg h-14"
                  required
                />
              </div>
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground text-xl">📧</span>
                <Input
                  type="email"
                  placeholder="La tua email"
                  value={businessData.email}
                  onChange={(e) => updateBusinessData('email', e.target.value)}
                  className="pl-12 py-4 text-lg h-14"
                  required
                />
              </div>
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground text-xl">📱</span>
                <Input
                  type="tel"
                  placeholder="Il tuo telefono (opzionale)"
                  value={businessData.phone}
                  onChange={(e) => updateBusinessData('phone', e.target.value)}
                  className="pl-12 py-4 text-lg h-14"
                />
              </div>
            </div>

            <SurveyButton
              variant="primary"
              onClick={submitSurvey}
              disabled={!isFormValid || isSubmitting}
              className="mt-6"
            >
              {isSubmitting ? 'Generando il tuo report...' : 'Genera il mio Report 📊'}
            </SurveyButton>
          </SurveyCard>
        </div>
      </div>
    );
  }

  if (currentStep === 7) {
    const analysis = calculatePotentialLost();
    const recommendations = getStrategicRecommendations();
    
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-4xl mx-auto">
          <SurveyCard>
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-foreground mb-2">📊 Report Analitico Email Marketing</h1>
                <p className="text-xl text-muted-foreground">Analisi per {businessData.name} - {businessData.settore}</p>
              </div>

              {/* Situazione Attuale */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
                  <h3 className="text-xl font-bold mb-4 text-blue-800">📈 Situazione Attuale</h3>
                  <div className="space-y-2 text-blue-700">
                    <div>💰 Fatturato Email: <strong>€{analysis.current.fatturato_email_mensile.toLocaleString()}/mese</strong></div>
                    <div>💰 Fatturato Email Annuo: <strong>€{analysis.current.fatturato_email_annuo.toLocaleString()}</strong></div>
                    <div>💵 Margine Mensile: <strong>€{analysis.current.margine_mensile.toLocaleString()}</strong></div>
                    <div>💵 Margine Annuo: <strong>€{analysis.current.margine_annuo.toLocaleString()}</strong></div>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl">
                  <h3 className="text-xl font-bold mb-4 text-green-800">🎯 Potenziale di Settore</h3>
                  <div className="space-y-2 text-green-700">
                    <div>💰 Fatturato Potenziale: <strong>€{analysis.potential.fatturato_email_mensile.toLocaleString()}/mese</strong></div>
                    <div>💰 Fatturato Potenziale Annuo: <strong>€{analysis.potential.fatturato_email_annuo.toLocaleString()}</strong></div>
                    <div>💵 Margine Potenziale: <strong>€{analysis.potential.margine_mensile.toLocaleString()}/mese</strong></div>
                    <div>💵 Margine Potenziale Annuo: <strong>€{analysis.potential.margine_annuo.toLocaleString()}</strong></div>
                  </div>
                </div>
              </div>

              {/* Potenziale Perso */}
              <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl">
                <h3 className="text-xl font-bold mb-4 text-red-800">⚠️ Potenziale Economico Perso</h3>
                <div className="grid md:grid-cols-2 gap-4 text-red-700">
                  <div>
                    <div className="text-2xl font-bold">€{analysis.gap.fatturato_mensile.toLocaleString()}/mese</div>
                    <div className="text-sm">Fatturato perso mensile</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">€{analysis.gap.fatturato_annuo.toLocaleString()}/anno</div>
                    <div className="text-sm">Fatturato perso annuale</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">€{analysis.gap.margine_mensile.toLocaleString()}/mese</div>
                    <div className="text-sm">Margine perso mensile</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">€{analysis.gap.margine_annuo.toLocaleString()}/anno</div>
                    <div className="text-sm">Margine perso annuale</div>
                  </div>
                </div>
              </div>

              {/* Scenari di Recupero */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl">
                  <h4 className="font-bold text-yellow-800 mb-2">🐌 Scenario Conservativo</h4>
                  <div className="text-yellow-700 space-y-1 text-sm">
                    <div>+€{analysis.scenarios.conservativo.incremento_mensile.toLocaleString()}/mese</div>
                    <div>+€{analysis.scenarios.conservativo.incremento_annuo.toLocaleString()}/anno</div>
                    <div>Margine: +€{analysis.scenarios.conservativo.margine_aggiuntivo_annuo.toLocaleString()}</div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
                  <h4 className="font-bold text-blue-800 mb-2">⚡ Scenario Base</h4>
                  <div className="text-blue-700 space-y-1 text-sm">
                    <div>+€{analysis.scenarios.base.incremento_mensile.toLocaleString()}/mese</div>
                    <div>+€{analysis.scenarios.base.incremento_annuo.toLocaleString()}/anno</div>
                    <div>Margine: +€{analysis.scenarios.base.margine_aggiuntivo_annuo.toLocaleString()}</div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl">
                  <h4 className="font-bold text-purple-800 mb-2">🚀 Scenario Aggressivo</h4>
                  <div className="text-purple-700 space-y-1 text-sm">
                    <div>+€{analysis.scenarios.aggressivo.incremento_mensile.toLocaleString()}/mese</div>
                    <div>+€{analysis.scenarios.aggressivo.incremento_annuo.toLocaleString()}/anno</div>
                    <div>Margine: +€{analysis.scenarios.aggressivo.margine_aggiuntivo_annuo.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Strategie di Recupero */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-gradient-to-br from-primary/5 to-primary-glow/10 border border-primary/20 rounded-xl">
                  <h3 className="text-xl font-bold mb-4 text-primary">🎯 Priorità Immediate</h3>
                  <ul className="space-y-2">
                    {recommendations.priorities.map((priority, index) => (
                      <li key={index} className="text-sm text-foreground">{priority}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-xl">
                  <h3 className="text-xl font-bold mb-4 text-accent">⚡ Quick Wins</h3>
                  <ul className="space-y-2">
                    {recommendations.quickWins.map((win, index) => (
                      <li key={index} className="text-sm text-foreground">{win}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 bg-gradient-to-br from-secondary/50 to-secondary/30 border border-border rounded-xl">
                  <h3 className="text-xl font-bold mb-4 text-secondary-foreground">🏗️ Long Term</h3>
                  <ul className="space-y-2">
                    {recommendations.longTerm.map((strategy, index) => (
                      <li key={index} className="text-sm text-secondary-foreground">{strategy}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="text-center p-6 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-2">🎯 Prossimi Passi</h3>
                <p className="text-muted-foreground mb-4">
                  Vuoi trasformare questi dati in risultati concreti? Il report completo è stato inviato a {businessData.email}
                </p>
                <a href="https://mailift.com/calendario" target="_blank" rel="noopener noreferrer">
                  <SurveyButton variant="orange" onClick={() => {}}>
                    Vai al prossimo step
                  </SurveyButton>
                </a>
              </div>
            </div>
          </SurveyCard>
        </div>
      </div>
    );
  }

  return null;
};