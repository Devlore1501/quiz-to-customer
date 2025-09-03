import { useState } from 'react';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

interface SurveyData {
  businessChallenge: string;
  businessLevel: string;
  emailApproach: string;
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
  const [surveyData, setSurveyData] = useState<SurveyData>({
    businessChallenge: '',
    businessLevel: '',
    emailApproach: '',
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateSurveyData = (field: keyof SurveyData, value: string) => {
    setSurveyData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const submitSurvey = async () => {
    setIsSubmitting(true);
    
    const dataToSend = {
      ...surveyData,
      timestamp: new Date().toISOString(),
      source: 'email-marketing-survey'
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
      setCurrentStep(5);
      setIsSubmitting(false);
    }, 1500);
  };

  const getPersonalizedPlan = () => {
    const { businessChallenge, businessLevel } = surveyData;
    
    let plan = {
      title: "Your Email Marketing Action Plan 📧",
      strategies: [],
      tactics: [],
      tips: []
    };

    // Customize based on business challenge
    if (businessChallenge === 'low-conversions') {
      plan.title = "Conversion Optimization Strategy 📈";
      plan.strategies = [
        "🎯 Implement personalized product recommendations",
        "🔥 Create urgency-driven email campaigns",
        "💰 Set up abandon cart recovery sequences",
        "📱 Optimize for mobile email experience"
      ];
      plan.tactics = [
        "✨ A/B test subject lines for higher open rates",
        "🎨 Use dynamic content based on purchase history",
        "⏰ Send emails at optimal times for your audience",
        "🏷️ Include exclusive discount codes for subscribers"
      ];
    } else if (businessChallenge === 'cart-abandonment') {
      plan.title = "Cart Recovery Mastery Plan 🛒";
      plan.strategies = [
        "⚡ Set up 3-email abandon cart sequence",
        "🎁 Offer progressive incentives (5%, 10%, 15% off)",
        "📸 Include product images and reviews in emails",
        "⏱️ Send first email within 1 hour of abandonment"
      ];
      plan.tactics = [
        "💌 Personalize with customer's name and cart items",
        "🚨 Create FOMO with limited-time offers",
        "📱 Ensure mobile-optimized cart recovery",
        "🔄 Retarget with social media ads"
      ];
    } else if (businessChallenge === 'customer-retention') {
      plan.title = "Customer Loyalty Builder 💎";
      plan.strategies = [
        "🎪 Launch VIP customer program",
        "🎂 Set up birthday and anniversary campaigns",
        "📊 Create win-back campaigns for inactive customers",
        "🎁 Develop post-purchase email sequences"
      ];
      plan.tactics = [
        "⭐ Send review requests 7 days after purchase",
        "🛍️ Recommend complementary products",
        "📧 Create monthly exclusive member newsletters",
        "🎯 Segment customers by purchase behavior"
      ];
    } else if (businessChallenge === 'email-deliverability') {
      plan.title = "Deliverability Optimization Plan 📬";
      plan.strategies = [
        "🔍 Audit and clean your email list",
        "✅ Implement proper authentication (SPF, DKIM, DMARC)",
        "📈 Monitor sender reputation and engagement metrics",
        "🎯 Use double opt-in for new subscribers"
      ];
      plan.tactics = [
        "🚫 Remove inactive subscribers regularly",
        "📝 Write engaging subject lines (avoid spam words)",
        "⚖️ Maintain healthy text-to-image ratio",
        "📊 Monitor bounce and complaint rates"
      ];
    }

    // Add level-specific tips
    if (businessLevel === 'just-starting') {
      plan.tips = [
        "🚀 Start with a simple welcome email series",
        "📝 Focus on building your email list first",
        "📧 Use free email marketing tools to begin",
        "📚 Learn email marketing fundamentals"
      ];
    } else if (businessLevel === 'growing-business') {
      plan.tips = [
        "🎯 Implement advanced segmentation strategies",
        "🤖 Set up automated email workflows",
        "📊 Track and analyze email performance metrics",
        "💡 Test new email types and frequencies"
      ];
    } else {
      plan.tips = [
        "🧪 Run sophisticated A/B tests",
        "🎨 Invest in premium email design tools",
        "🔮 Use predictive analytics for sending",
        "🏆 Focus on lifetime value optimization"
      ];
    }

    return plan;
  };

  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
          <SurveyCard>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-2xl">🎯</span>
                <h2 className="text-2xl font-bold text-foreground">What's your biggest ecommerce challenge right now?</h2>
              </div>
            </div>
            
            <div className="space-y-4">
              <SurveyButton
                onClick={() => {
                  updateSurveyData('businessChallenge', 'low-conversions');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">📈</span>
                  <span className="text-lg font-medium">Low email conversion rates</span>
                </div>
              </SurveyButton>
              
              <SurveyButton
                onClick={() => {
                  updateSurveyData('businessChallenge', 'cart-abandonment');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🛒</span>
                  <span className="text-lg font-medium">High cart abandonment rates</span>
                </div>
              </SurveyButton>
              
              <SurveyButton
                onClick={() => {
                  updateSurveyData('businessChallenge', 'customer-retention');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">💎</span>
                  <span className="text-lg font-medium">Poor customer retention</span>
                </div>
              </SurveyButton>

              <SurveyButton
                onClick={() => {
                  updateSurveyData('businessChallenge', 'email-deliverability');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">📬</span>
                  <span className="text-lg font-medium">Email deliverability issues</span>
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
          <ProgressBar currentStep={currentStep} totalSteps={4} />
          <SurveyCard>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-2xl">⚡</span>
                <h2 className="text-2xl font-bold text-foreground">What's your current business level?</h2>
              </div>
            </div>
            
            <div className="space-y-4">
              <SurveyButton
                onClick={() => {
                  updateSurveyData('businessLevel', 'just-starting');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🌱</span>
                  <span className="text-lg font-medium">Just starting - New to ecommerce</span>
                </div>
              </SurveyButton>
              
              <SurveyButton
                onClick={() => {
                  updateSurveyData('businessLevel', 'growing-business');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">📈</span>
                  <span className="text-lg font-medium">Growing business - Making consistent sales</span>
                </div>
              </SurveyButton>
              
              <SurveyButton
                onClick={() => {
                  updateSurveyData('businessLevel', 'established-brand');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🏆</span>
                  <span className="text-lg font-medium">Established brand - Scaling operations</span>
                </div>
              </SurveyButton>
            </div>
          </SurveyCard>
        </div>
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
          <SurveyCard>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-2xl">📧</span>
                <h2 className="text-2xl font-bold text-foreground">What's your current email marketing approach?</h2>
              </div>
            </div>
            
            <div className="space-y-4">
              <SurveyButton
                onClick={() => {
                  updateSurveyData('emailApproach', 'no-email-marketing');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">❌</span>
                  <span className="text-lg font-medium">No email marketing yet</span>
                </div>
              </SurveyButton>
              
              <SurveyButton
                onClick={() => {
                  updateSurveyData('emailApproach', 'basic-newsletters');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">📰</span>
                  <span className="text-lg font-medium">Basic newsletters only</span>
                </div>
              </SurveyButton>
              
              <SurveyButton
                onClick={() => {
                  updateSurveyData('emailApproach', 'automated-sequences');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🤖</span>
                  <span className="text-lg font-medium">Some automated email sequences</span>
                </div>
              </SurveyButton>
              
              <SurveyButton
                onClick={() => {
                  updateSurveyData('emailApproach', 'advanced-segmentation');
                  nextStep();
                }}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🎯</span>
                  <span className="text-lg font-medium">Advanced segmentation & personalization</span>
                </div>
              </SurveyButton>
            </div>
          </SurveyCard>
        </div>
      </div>
    );
  }

  if (currentStep === 4) {
    const isFormValid = surveyData.name && surveyData.email;
    
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto">
          <ProgressBar currentStep={currentStep} totalSteps={4} />
          <SurveyCard>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-2xl">👤</span>
                <h2 className="text-2xl font-bold text-foreground">Almost done! Let's get your contact info</h2>
              </div>
              <p className="text-muted-foreground">We'll send your personalized email marketing plan to your inbox!</p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground text-xl">👤</span>
                <Input
                  type="text"
                  placeholder="Your full name"
                  value={surveyData.name}
                  onChange={(e) => updateSurveyData('name', e.target.value)}
                  className="pl-12 py-4 text-lg h-14"
                  required
                />
              </div>
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground text-xl">📧</span>
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={surveyData.email}
                  onChange={(e) => updateSurveyData('email', e.target.value)}
                  className="pl-12 py-4 text-lg h-14"
                  required
                />
              </div>
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground text-xl">📱</span>
                <Input
                  type="tel"
                  placeholder="Your phone number (optional)"
                  value={surveyData.phone}
                  onChange={(e) => updateSurveyData('phone', e.target.value)}
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
              {isSubmitting ? 'Generating Your Plan...' : 'Show Me My Results! 🎉'}
            </SurveyButton>
          </SurveyCard>
        </div>
      </div>
    );
  }

  if (currentStep === 5) {
    const plan = getPersonalizedPlan();
    
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-2xl mx-auto">
          <SurveyCard>
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-foreground mb-2">{plan.title}</h1>
                <p className="text-xl text-muted-foreground">Personalized for {surveyData.name}</p>
              </div>

              <div className="grid gap-6">
                <div className="p-6 bg-gradient-to-br from-primary/5 to-primary-glow/10 border border-primary/20 rounded-xl">
                  <h3 className="text-xl font-bold mb-4 text-primary">📧 Your Email Strategy</h3>
                  <ul className="space-y-2">
                    {plan.strategies.map((strategy, index) => (
                      <li key={index} className="text-foreground">{strategy}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 rounded-xl">
                  <h3 className="text-xl font-bold mb-4 text-accent">🎯 Tactical Implementation</h3>
                  <ul className="space-y-2">
                    {plan.tactics.map((tactic, index) => (
                      <li key={index} className="text-foreground">{tactic}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 bg-gradient-to-br from-secondary/50 to-secondary/30 border border-border rounded-xl">
                  <h3 className="text-xl font-bold mb-4 text-secondary-foreground">💡 Pro Tips</h3>
                  <ul className="space-y-2">
                    {plan.tips.map((tip, index) => (
                      <li key={index} className="text-secondary-foreground">{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="text-center p-6 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border">
                <h3 className="text-lg font-bold text-foreground mb-2">🎯 Next Steps</h3>
                <p className="text-muted-foreground mb-4">
                  Ready to transform your email marketing? Your personalized plan has been sent to {surveyData.email}!
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