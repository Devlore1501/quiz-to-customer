import type { AdvancedReport } from './reportCalculations';

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
}

export interface AdminReport {
  // === DATI LEAD ===
  lead: {
    fullName: string;
    email: string;
    phone: string;
    website: string;
    submittedAt: string;
    source: string;
  };
  
  // === RISPOSTE QUIZ RAW ===
  quizResponses: {
    sector: string;
    sectorLabel: string;
    monthlyRevenue: string;
    monthlyRevenueEstimated: number;
    adsInvestment: string;
    emailRevenuePercentage: string;
    emailRevenuePercentageEstimated: number;
    emailFrequency: string;
    listSize: string;
    listSizeEstimated: number;
    activeFlows: string[];
    activeFlowsLabels: string[];
  };
  
  // === ANALISI FINANZIARIA DETTAGLIATA ===
  financialAnalysis: {
    // Situazione attuale
    currentMonthlyRevenue: number;
    currentEmailRevenue: number;
    currentEmailPercent: number;
    currentRevenuePerSubscriber: number;
    
    // Benchmark
    sectorBenchmark: {
      label: string;
      emailShare: number;
      revenuePerSub: number;
      openRate: number;
      clickRate: number;
    };
    benchmarkEmailRevenue: number;
    benchmarkRevenuePerSubscriber: number;
    
    // Gap Analysis
    monthlyGap: number;
    yearlyGap: number;
    percentageGap: number;
    revenuePerSubGap: number;
    
    // ROI Potenziale (assumendo costo consulenza)
    potentialROI: {
      investmentAssumption: number;
      monthlyReturn: number;
      yearlyReturn: number;
      roiPercentage: number;
      paybackMonths: number;
    };
  };
  
  // === ANALISI AUTOMAZIONI DETTAGLIATA ===
  automationAnalysis: {
    totalFlows: number;
    activeFlowsCount: number;
    coveragePercent: number;
    rating: 'A' | 'B' | 'C' | 'D';
    ratingDescription: string;
    
    activeFlows: Array<{
      key: string;
      label: string;
      estimatedValue: number;
    }>;
    
    missingFlows: Array<{
      key: string;
      label: string;
      description: string;
      priority: number;
      priorityLabel: string;
      impactPercent: number;
      impactValue: number;
      implementationTime: string;
      implementationCost: string;
    }>;
    
    totalMissingFlowsValue: number;
    topPriorityFlows: string[];
  };
  
  // === SCENARI CRESCITA DETTAGLIATI ===
  growthScenarios: {
    conservative: {
      growthPercent: number;
      additionalMonthlyRevenue: number;
      additionalYearlyRevenue: number;
      description: string;
      requiredActions: string[];
      timeToImplement: string;
      difficultyLevel: string;
    };
    moderate: {
      growthPercent: number;
      additionalMonthlyRevenue: number;
      additionalYearlyRevenue: number;
      description: string;
      requiredActions: string[];
      timeToImplement: string;
      difficultyLevel: string;
    };
    aggressive: {
      growthPercent: number;
      additionalMonthlyRevenue: number;
      additionalYearlyRevenue: number;
      description: string;
      requiredActions: string[];
      timeToImplement: string;
      difficultyLevel: string;
    };
  };
  
  // === ROADMAP COMPLETA ===
  roadmap: {
    immediate: Array<{
      action: string;
      impact: string;
      timeframe: string;
      difficulty: string;
      estimatedValue: number;
    }>;
    shortTerm: Array<{
      action: string;
      impact: string;
      timeframe: string;
      difficulty: string;
      estimatedValue: number;
    }>;
    mediumTerm: Array<{
      action: string;
      impact: string;
      timeframe: string;
      difficulty: string;
      estimatedValue: number;
    }>;
  };
  
  // === SCORE E METRICHE ===
  scores: {
    emailHealthScore: number;
    automationScore: number;
    revenueOptimizationScore: number;
    overallScore: number;
    improvementPotential: number;
  };
  
  // === NOTE PER CONSULENZA ===
  consultingNotes: {
    leadQuality: 'Hot' | 'Warm' | 'Cold';
    leadQualityReason: string;
    suggestedApproach: string;
    keyPainPoints: string[];
    upsellOpportunities: string[];
    estimatedContractValue: string;
    priorityLevel: 'Alta' | 'Media' | 'Bassa';
  };
}

const flowLabelsMap: Record<string, string> = {
  welcome: 'Welcome Flow',
  browse_abandonment: 'Browse Abandonment',
  cart_recovery: 'Recupero Carrello',
  checkout_recovery: 'Recupero Checkout',
  upsell: 'Post-Purchase & Upsell',
  winback: 'Winback',
  sunset: 'Sunset Flow'
};

const getRatingDescription = (rating: 'A' | 'B' | 'C' | 'D'): string => {
  switch (rating) {
    case 'A': return 'Eccellente - automazioni ben strutturate, focus su ottimizzazione';
    case 'B': return 'Buono - base solida, opportunità di espansione';
    case 'C': return 'Discreto - mancano flussi importanti, grande potenziale';
    case 'D': return 'Critico - quasi tutto da costruire, opportunità massima';
  }
};

const getImplementationCost = (priority: number): string => {
  switch (priority) {
    case 1: return '€500-1.000';
    case 2: return '€300-600';
    case 3: return '€200-400';
    default: return '€300-500';
  }
};

export const generateAdminReport = (
  formData: FormData,
  report: AdvancedReport
): AdminReport => {
  
  // Calcola lead quality
  const monthlyValue = report.monthlyRevenue;
  let leadQuality: 'Hot' | 'Warm' | 'Cold';
  let leadQualityReason: string;
  
  if (monthlyValue >= 100000 && report.emailHealthScore < 50) {
    leadQuality = 'Hot';
    leadQualityReason = 'Alto fatturato con basso score email = grande opportunità immediata';
  } else if (monthlyValue >= 50000 && report.emailHealthScore < 70) {
    leadQuality = 'Warm';
    leadQualityReason = 'Fatturato medio-alto con margine di miglioramento significativo';
  } else {
    leadQuality = 'Cold';
    leadQualityReason = 'Fatturato basso o già ben ottimizzato';
  }
  
  // Calcola priority
  let priorityLevel: 'Alta' | 'Media' | 'Bassa';
  if (leadQuality === 'Hot') priorityLevel = 'Alta';
  else if (leadQuality === 'Warm') priorityLevel = 'Media';
  else priorityLevel = 'Bassa';
  
  // Estimated contract value
  let estimatedContractValue: string;
  if (monthlyValue >= 100000) {
    estimatedContractValue = '€3.000-5.000/mese';
  } else if (monthlyValue >= 50000) {
    estimatedContractValue = '€1.500-3.000/mese';
  } else {
    estimatedContractValue = '€500-1.500/mese';
  }
  
  // Key pain points
  const keyPainPoints: string[] = [];
  if (report.currentEmailPercent < 15) {
    keyPainPoints.push('Email revenue molto sotto benchmark - non stanno monetizzando la lista');
  }
  if (report.automationCoverage < 50) {
    keyPainPoints.push('Mancano automazioni fondamentali - perdono vendite ogni giorno');
  }
  if (!formData.activeFlows.includes('cart_recovery')) {
    keyPainPoints.push('No recupero carrello - perdita immediata stimata: ' + 
      `€${Math.round(report.benchmarkEmailRevenue * 0.15).toLocaleString()}/mese`);
  }
  if (formData.emailFrequency === 'none' || formData.emailFrequency === '1-2') {
    keyPainPoints.push('Frequenza invio troppo bassa - lista sottoutilizzata');
  }
  
  // Upsell opportunities
  const upsellOpportunities: string[] = [];
  if (monthlyValue >= 50000) {
    upsellOpportunities.push('Setup completo Klaviyo/Mailchimp');
    upsellOpportunities.push('Gestione campagne mensili');
  }
  upsellOpportunities.push('Creazione template email brandizzati');
  upsellOpportunities.push('Strategia segmentazione avanzata');
  if (report.listSize >= 10000) {
    upsellOpportunities.push('Pulizia e ottimizzazione lista');
  }
  
  // Suggested approach
  let suggestedApproach: string;
  if (leadQuality === 'Hot') {
    suggestedApproach = 'Chiamata immediata. Mostrare numeri concreti di perdita giornaliera. ' +
      'Proporre audit gratuito con demo live delle opportunità.';
  } else if (leadQuality === 'Warm') {
    suggestedApproach = 'WhatsApp iniziale + email di follow-up con case study simile. ' +
      'Proporre call conoscitiva di 15 minuti.';
  } else {
    suggestedApproach = 'Email nurturing con contenuti educativi. Ricontattare tra 30-60 giorni.';
  }
  
  // Build roadmap
  const immediate = report.missingFlows
    .filter(f => f.priority === 1)
    .slice(0, 2)
    .map(f => ({
      action: `Implementare ${f.label}`,
      impact: `+${Math.round(f.impactPercent)}% revenue email`,
      timeframe: f.implementationTime,
      difficulty: 'Media',
      estimatedValue: f.impactValue
    }));
    
  const shortTerm = report.missingFlows
    .filter(f => f.priority === 2)
    .slice(0, 2)
    .map(f => ({
      action: `Attivare ${f.label}`,
      impact: `+${Math.round(f.impactPercent)}% revenue email`,
      timeframe: f.implementationTime,
      difficulty: 'Media',
      estimatedValue: f.impactValue
    }));
    
  const mediumTerm = [
    {
      action: 'Implementare segmentazione RFM',
      impact: '+8-12% conversioni',
      timeframe: '2-3 settimane',
      difficulty: 'Alta',
      estimatedValue: report.currentEmailRevenue * 0.1
    },
    {
      action: 'Ottimizzare template per mobile',
      impact: '+5-10% click rate',
      timeframe: '1 settimana',
      difficulty: 'Bassa',
      estimatedValue: report.currentEmailRevenue * 0.05
    }
  ];
  
  // ROI calculation (assuming 2000€ consulting fee)
  const investmentAssumption = 2000;
  const monthlyReturn = report.revenueGap + report.totalFlowGap;
  const roiPercentage = ((monthlyReturn * 12) / investmentAssumption) * 100;
  const paybackMonths = monthlyReturn > 0 ? investmentAssumption / monthlyReturn : 99;
  
  return {
    lead: {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      website: formData.website,
      submittedAt: new Date().toISOString(),
      source: 'Email Marketing Quiz'
    },
    
    quizResponses: {
      sector: formData.sector,
      sectorLabel: report.sectorBenchmark.label,
      monthlyRevenue: formData.monthlyRevenue,
      monthlyRevenueEstimated: report.monthlyRevenue,
      adsInvestment: formData.adsInvestment,
      emailRevenuePercentage: formData.emailRevenuePercentage,
      emailRevenuePercentageEstimated: report.currentEmailPercent,
      emailFrequency: formData.emailFrequency,
      listSize: formData.listSize,
      listSizeEstimated: report.listSize,
      activeFlows: formData.activeFlows,
      activeFlowsLabels: formData.activeFlows.map(f => flowLabelsMap[f] || f)
    },
    
    financialAnalysis: {
      currentMonthlyRevenue: report.monthlyRevenue,
      currentEmailRevenue: report.currentEmailRevenue,
      currentEmailPercent: report.currentEmailPercent,
      currentRevenuePerSubscriber: report.currentRevenuePerSub,
      
      sectorBenchmark: {
        label: report.sectorBenchmark.label,
        emailShare: report.sectorBenchmark.emailShare,
        revenuePerSub: report.sectorBenchmark.revenuePerSub,
        openRate: report.sectorBenchmark.openRate,
        clickRate: report.sectorBenchmark.clickRate
      },
      benchmarkEmailRevenue: report.benchmarkEmailRevenue,
      benchmarkRevenuePerSubscriber: report.benchmarkRevenuePerSub,
      
      monthlyGap: report.revenueGap,
      yearlyGap: report.revenueGap * 12,
      percentageGap: report.revenueGapPercent,
      revenuePerSubGap: report.revenuePerSubGap,
      
      potentialROI: {
        investmentAssumption,
        monthlyReturn,
        yearlyReturn: monthlyReturn * 12,
        roiPercentage: Math.round(roiPercentage),
        paybackMonths: Math.round(paybackMonths * 10) / 10
      }
    },
    
    automationAnalysis: {
      totalFlows: report.totalFlowsCount,
      activeFlowsCount: report.activeFlowsCount,
      coveragePercent: Math.round(report.automationCoverage),
      rating: report.automationRating,
      ratingDescription: getRatingDescription(report.automationRating),
      
      activeFlows: formData.activeFlows
        .filter(f => f !== 'none')
        .map(f => ({
          key: f,
          label: flowLabelsMap[f] || f,
          estimatedValue: report.benchmarkEmailRevenue * 0.05 // stima conservativa
        })),
      
      missingFlows: report.missingFlows.map(f => ({
        key: f.key,
        label: f.label,
        description: f.description,
        priority: f.priority,
        priorityLabel: f.priority === 1 ? 'Alta' : f.priority === 2 ? 'Media' : 'Bassa',
        impactPercent: f.impactPercent,
        impactValue: f.impactValue,
        implementationTime: f.implementationTime,
        implementationCost: getImplementationCost(f.priority)
      })),
      
      totalMissingFlowsValue: report.totalFlowGap,
      topPriorityFlows: report.missingFlows
        .filter(f => f.priority === 1)
        .map(f => f.label)
    },
    
    growthScenarios: {
      conservative: {
        growthPercent: report.scenarios.conservative.growthPercent,
        additionalMonthlyRevenue: report.scenarios.conservative.value,
        additionalYearlyRevenue: report.scenarios.conservative.value * 12,
        description: report.scenarios.conservative.description,
        requiredActions: ['Ottimizzazione subject lines', 'A/B test CTA', 'Pulizia lista'],
        timeToImplement: '2-4 settimane',
        difficultyLevel: 'Bassa'
      },
      moderate: {
        growthPercent: report.scenarios.moderate.growthPercent,
        additionalMonthlyRevenue: report.scenarios.moderate.value,
        additionalYearlyRevenue: report.scenarios.moderate.value * 12,
        description: report.scenarios.moderate.description,
        requiredActions: ['Implementazione flussi mancanti', 'Segmentazione base', 'Calendar campagne'],
        timeToImplement: '1-2 mesi',
        difficultyLevel: 'Media'
      },
      aggressive: {
        growthPercent: report.scenarios.aggressive.growthPercent,
        additionalMonthlyRevenue: report.scenarios.aggressive.value,
        additionalYearlyRevenue: report.scenarios.aggressive.value * 12,
        description: report.scenarios.aggressive.description,
        requiredActions: ['Tutti i flussi', 'Segmentazione RFM', 'Personalizzazione dinamica', 'SMS integration'],
        timeToImplement: '2-3 mesi',
        difficultyLevel: 'Alta'
      }
    },
    
    roadmap: {
      immediate,
      shortTerm,
      mediumTerm
    },
    
    scores: {
      emailHealthScore: report.emailHealthScore,
      automationScore: Math.round(report.automationCoverage),
      revenueOptimizationScore: Math.round(Math.min(100, (report.currentEmailPercent / report.sectorBenchmark.emailShare) * 100)),
      overallScore: report.emailHealthScore,
      improvementPotential: 100 - report.emailHealthScore
    },
    
    consultingNotes: {
      leadQuality,
      leadQualityReason,
      suggestedApproach,
      keyPainPoints,
      upsellOpportunities,
      estimatedContractValue,
      priorityLevel
    }
  };
};
