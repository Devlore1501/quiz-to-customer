import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

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
    { id: 'beauty', label: '💄 Beauty & Personal Care', value: 'beauty' },
    { id: 'fashion', label: '👗 Abbigliamento o accessori', value: 'fashion' },
    { id: 'digital', label: '💻 Prodotti digitali', value: 'digital' },
    { id: 'home', label: '🏠 Articoli per la casa', value: 'home' },
    { id: 'jewelry', label: '💎 Gioielli', value: 'jewelry' },
    { id: 'food', label: '🍔 Food & Beverage', value: 'food' },
    { id: 'health', label: '❤️ Salute e integrazione', value: 'health' }
  ];

  const revenueRanges = [
    { id: 'rev1', label: '10K€ -20K€', value: '10-20k' },
    { id: 'rev2', label: '20K€ -50K€', value: '20-50k' },
    { id: 'rev3', label: '50K€-100K€', value: '50-100k' },
    { id: 'rev4', label: '100K€ - 200k€', value: '100-200k' },
    { id: 'rev5', label: '200K€+', value: '200k+' }
  ];

  const adsInvestmentRanges = [
    { id: 'ads1', label: '0 - 5000€', value: '0-5k' },
    { id: 'ads2', label: '5.000€ - 15.000€', value: '5-15k' },
    { id: 'ads3', label: '15.000€ - 30.000€', value: '15-30k' },
    { id: 'ads4', label: '30.000€ - 50.000€', value: '30-50k' }
  ];

  const emailRevenueRanges = [
    { id: 'email1', label: '0 - 10%', value: '0-10' },
    { id: 'email2', label: '10% e 20%', value: '10-20' },
    { id: 'email3', label: '20% e 30%', value: '20-30' },
    { id: 'email4', label: '30% e 40%', value: '30-40' },
    { id: 'email5', label: '40% e 60%', value: '40-60' },
    { id: 'email6', label: 'oltre 60%', value: '60+' }
  ];

  const emailFrequencies = [
    { id: 'freq1', label: 'nessun invio', value: 'none' },
    { id: 'freq2', label: 'da 1 a 2 email a settimana', value: '1-2' },
    { id: 'freq3', label: 'da 3 a 4 email a settimana', value: '3-4' },
    { id: 'freq4', label: 'da 5 a 7 email a settimana', value: '5-7' },
    { id: 'freq5', label: '+ di 7 email a settimana', value: '7+' }
  ];

  const listSizes = [
    { id: 'size1', label: '100 - 1.000', value: '100-1k' },
    { id: 'size2', label: '1.000 - 5.000', value: '1-5k' },
    { id: 'size3', label: '3.000 - 10.000', value: '3-10k' },
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
      title: "Quale è il tuo attuale fatturato mensile?",
      type: "radio" as const,
      field: "monthlyRevenue" as keyof FormData,
      options: revenueRanges,
      subtitle: "Per un risultato più preciso inserisci il fatturato degli ultimi 30 giorni nel campo altro"
    },
    {
      title: "Quanto attualmente spendi in piattaforme pubblicitarie al mese?",
      type: "radio" as const,
      field: "adsInvestment" as keyof FormData,
      options: adsInvestmentRanges
    },
    {
      title: "Quanto è in % il fatturato proveniente dalle email?",
      type: "radio" as const,
      field: "emailRevenuePercentage" as keyof FormData,
      options: emailRevenueRanges
    },
    {
      title: "Quale è la frequenza di invio delle tue email?",
      type: "radio" as const,
      field: "emailFrequency" as keyof FormData,
      options: emailFrequencies
    },
    {
      title: "Quale è la grandezza della tua lista email attuale?",
      type: "radio" as const,
      field: "listSize" as keyof FormData,
      options: listSizes
    },
    {
      title: "Quali flussi automatici sono presenti nel tuo ecommerce?",
      type: "checkbox" as const,
      field: "activeFlows" as keyof FormData,
      options: automationFlows
    },
    {
      title: "Quale è il tuo sito web?",
      type: "input" as const,
      field: "website" as keyof FormData
    },
    {
      title: "Quasi fatto!\nNel frattempo che analizziamo i tuoi dati, dove possiamo mandarti il report personalizzato?",
      type: "contact" as const,
      subtitle: "Riceverai il report su whatsapp, ti contatteremo noi appena è pronto assicurati di inserire il numero corretto"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRadioChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    // Here you would typically send the data to your backend
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Navigation header */}
        <div className="flex bg-orange rounded-t-xl">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`flex-1 py-4 px-6 text-white font-medium rounded-tl-xl ${
              currentStep === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-hover'
            }`}
          >
            ← Precedente
          </button>
          <button
            onClick={isLastStep ? handleSubmit : handleNext}
            disabled={isLastStep && !formData.acceptTerms}
            className={`flex-1 py-4 px-6 text-white font-medium rounded-tr-xl ${
              (isLastStep && !formData.acceptTerms) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-hover'
            }`}
          >
            {isLastStep ? '✓ Invia' : 'Prossima →'}
          </button>
        </div>

        {/* Main content */}
        <div className="bg-slate-800 p-8 rounded-b-xl">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-orange mb-4 leading-tight whitespace-pre-line">
              {currentStepData.title}
            </h1>
            {currentStepData.subtitle && (
              <p className="text-slate-300 text-sm">
                {currentStepData.subtitle}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {currentStepData.type === "radio" && (
              <RadioGroup
                value={formData[currentStepData.field] as string}
                onValueChange={(value) => handleRadioChange(currentStepData.field, value)}
                className="space-y-4"
              >
                {currentStepData.options?.map((option) => (
                  <div key={option.id} className="flex items-center space-x-3">
                    <RadioGroupItem 
                      value={option.value} 
                      id={option.id}
                      className="border-white text-orange data-[state=checked]:bg-orange data-[state=checked]:border-orange"
                    />
                    <Label 
                      htmlFor={option.id} 
                      className="text-white text-lg cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentStepData.type === "checkbox" && (
              <div className="space-y-4">
                {currentStepData.options?.map((option) => (
                  <div key={option.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={option.id}
                      checked={formData.activeFlows.includes(option.value)}
                      onCheckedChange={(checked) => handleCheckboxChange(option.value, checked as boolean)}
                      className="border-white data-[state=checked]:bg-orange data-[state=checked]:border-orange"
                    />
                    <Label 
                      htmlFor={option.id} 
                      className="text-white text-lg cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {currentStepData.type === "input" && (
              <div className="space-y-4">
                <Label htmlFor="website" className="text-white text-lg">
                  Sito web
                </Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="bg-white border-0 text-slate-900 h-12 text-lg"
                />
              </div>
            )}

            {currentStepData.type === "contact" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-white text-lg">
                    Nome completo
                  </Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="bg-white border-0 text-slate-900 h-12 text-lg"
                    placeholder="Full Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-white text-lg">
                    Numero di telefono
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="bg-white border-0 text-slate-900 h-12 text-lg"
                    placeholder="+39"
                  />
                  <p className="text-white text-sm">
                    Inserisci numero di cellulare whatsapp per ricevere il report
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white text-lg">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="bg-white border-0 text-slate-900 h-12 text-lg"
                    placeholder="Email"
                  />
                </div>
                
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => handleInputChange('acceptTerms', checked as boolean)}
                    className="border-white data-[state=checked]:bg-orange data-[state=checked]:border-orange mt-1"
                  />
                  <Label 
                    htmlFor="terms" 
                    className="text-white text-sm cursor-pointer leading-relaxed"
                  >
                    Accetto i termini e le condizioni forniti dall'azienda.Fornendo il mio numero di telefono, accetto di ricevere messaggi di testo dall'azienda per l'accesso al report personalizzato
                  </Label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailMarketingSurvey;