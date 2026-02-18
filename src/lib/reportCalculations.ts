// Benchmark per settore - dati di riferimento per email marketing e-commerce
export const sectorBenchmarks: Record<string, {
  emailShare: number;      // % benchmark fatturato da email
  revenuePerSub: number;   // €/subscriber benchmark
  openRate: number;        // % open rate medio
  clickRate: number;       // % click rate medio
  label: string;
}> = {
  beauty: { emailShare: 30, revenuePerSub: 2.5, openRate: 22, clickRate: 3.2, label: 'Beauty & Personal Care' },
  fashion: { emailShare: 28, revenuePerSub: 2.0, openRate: 18, clickRate: 2.8, label: 'Abbigliamento' },
  food: { emailShare: 18, revenuePerSub: 1.2, openRate: 20, clickRate: 2.5, label: 'Food & Beverage' },
  digital: { emailShare: 40, revenuePerSub: 5.0, openRate: 25, clickRate: 4.0, label: 'Prodotti Digitali' },
  jewelry: { emailShare: 25, revenuePerSub: 3.0, openRate: 20, clickRate: 2.5, label: 'Gioielli' },
  home: { emailShare: 22, revenuePerSub: 1.8, openRate: 19, clickRate: 2.6, label: 'Articoli Casa' },
  health: { emailShare: 32, revenuePerSub: 2.8, openRate: 24, clickRate: 3.5, label: 'Salute & Integrazione' },
  other: { emailShare: 25, revenuePerSub: 2.0, openRate: 20, clickRate: 2.8, label: 'Altro Settore' }
};

// Impatto dei flussi automatici sul fatturato email
export const flowImpact: Record<string, {
  impactPercent: number;  // % impatto sul fatturato email
  priority: 1 | 2 | 3;    // Priorità implementazione
  label: string;
  description: string;
  implementationTime: string;
}> = {
  welcome: { 
    impactPercent: 8, 
    priority: 1, 
    label: 'Welcome Flow',
    description: 'Primo contatto con nuovi iscritti, fondamentale per engagement',
    implementationTime: '1-2 giorni'
  },
  cart_recovery: { 
    impactPercent: 15, 
    priority: 1, 
    label: 'Recupero Carrello',
    description: 'Recupera vendite perse, ROI immediato e misurabile',
    implementationTime: '2-3 giorni'
  },
  checkout_recovery: { 
    impactPercent: 10, 
    priority: 1, 
    label: 'Recupero Checkout',
    description: 'Utenti vicini all\'acquisto, altissima conversione',
    implementationTime: '2-3 giorni'
  },
  browse_abandonment: { 
    impactPercent: 5, 
    priority: 2, 
    label: 'Browse Abandonment',
    description: 'Riattiva chi ha mostrato interesse ma non ha agito',
    implementationTime: '3-4 giorni'
  },
  upsell: { 
    impactPercent: 7, 
    priority: 2, 
    label: 'Post-Purchase & Upsell',
    description: 'Aumenta LTV con cross-sell e upsell mirati',
    implementationTime: '3-5 giorni'
  },
  winback: { 
    impactPercent: 4, 
    priority: 2, 
    label: 'Winback',
    description: 'Riattiva clienti dormienti prima che si perdano',
    implementationTime: '2-3 giorni'
  },
  sunset: { 
    impactPercent: 2, 
    priority: 3, 
    label: 'Sunset Flow',
    description: 'Pulisce la lista e migliora deliverability',
    implementationTime: '1-2 giorni'
  }
};

// AOV stimato per settore (benchmark)
export const sectorAOV: Record<string, number> = {
  beauty: 55,
  fashion: 80,
  food: 45,
  digital: 35,
  jewelry: 150,
  home: 90,
  health: 50,
  other: 65
};

// Conversione frequenza email → invii per mese
export const parseEmailFrequency = (freq: string): number => {
  const freqMap: Record<string, number> = {
    'none': 0,
    '1-2': 5,
    '3-4': 14,
    '5-7': 24,
    'daily+': 30
  };
  return freqMap[freq] ?? 5;
};

// Parse dei valori dai range
export const parseRevenueRange = (range: string): number => {
  const rangeMap: Record<string, number> = {
    'under-15k': 10000,
    '15-25k': 20000,
    '25-50k': 37500,
    '50-100k': 75000,
    '100-200k': 150000,
    '200k+': 250000
  };
  return rangeMap[range] || 37500;
};

export const parseEmailPercentage = (range: string): number => {
  const rangeMap: Record<string, number> = {
    '0-10': 5,
    '10-20': 15,
    '20-30': 25,
    '30-40': 35,
    '40-60': 50,
    '60+': 65
  };
  return rangeMap[range] || 10;
};

export const parseListSize = (range: string): number => {
  const rangeMap: Record<string, number> = {
    '100-1k': 500,
    '1-5k': 3000,
    '3-10k': 6500,
    '10-30k': 20000,
    '30-50k': 40000,
    '50k+': 75000
  };
  return rangeMap[range] || 3000;
};

export interface AdvancedReport {
  // Situazione attuale
  currentEmailRevenue: number;
  currentEmailPercent: number;
  currentRevenuePerSub: number;
  monthlyRevenue: number;
  listSize: number;
  
  // Benchmark settore
  sectorBenchmark: typeof sectorBenchmarks[string];
  benchmarkEmailRevenue: number;
  benchmarkRevenuePerSub: number;
  
  // Gap Analysis
  revenueGap: number;
  revenueGapPercent: number;
  revenuePerSubGap: number;
  
  // Automation Analysis
  activeFlowsCount: number;
  totalFlowsCount: number;
  automationCoverage: number;
  automationRating: 'A' | 'B' | 'C' | 'D';
  missingFlows: Array<{
    key: string;
    label: string;
    impactPercent: number;
    impactValue: number;
    priority: number;
    description: string;
    implementationTime: string;
  }>;
  totalFlowGap: number;
  
  // Scenari di crescita
  scenarios: {
    conservative: { growthPercent: number; value: number; description: string };
    moderate: { growthPercent: number; value: number; description: string };
    aggressive: { growthPercent: number; value: number; description: string };
  };
  
  // Top 3 azioni prioritarie
  topActions: Array<{
    action: string;
    impact: number;
    difficulty: 'Bassa' | 'Media' | 'Alta';
    timeframe: string;
    roi: string;
  }>;
  
  // Analisi Strategica
  strategicAnalysis: {
    currentSituation: string;
    desiredSituation: string;
    potentialObstacles: string[];
  };
  
  // Score complessivo
  emailHealthScore: number;
  yearlyPotential: number;

  // Forecast basato sulla lista
  listForecast: {
    listSize: number;
    sendsPerMonth: number;
    sectorAOV: number;
    current: { sends: number; newsletterRevenue: number; automationRevenue: number; total: number };
    optimized: { sends: number; newsletterRevenue: number; automationRevenue: number; total: number };
    benchmark: { sends: number; newsletterRevenue: number; automationRevenue: number; total: number };
  };
}

export const calculateAdvancedReport = (
  sector: string,
  monthlyRevenueRange: string,
  emailPercentRange: string,
  listSizeRange: string,
  activeFlows: string[],
  customSectorLabel?: string,
  emailFrequency?: string
): AdvancedReport => {
  // Parse input values
  const monthlyRevenue = parseRevenueRange(monthlyRevenueRange);
  const currentEmailPercent = parseEmailPercentage(emailPercentRange);
  const listSize = parseListSize(listSizeRange);
  
  // Get sector benchmark
  const baseBenchmark = sectorBenchmarks[sector] || sectorBenchmarks.other;
  // Use custom label if provided (for "other" sector)
  const sectorBenchmark = sector === 'other' && customSectorLabel 
    ? { ...baseBenchmark, label: customSectorLabel }
    : baseBenchmark;
  
  // Calcoli situazione attuale
  const currentEmailRevenue = monthlyRevenue * (currentEmailPercent / 100);
  const currentRevenuePerSub = listSize > 0 ? currentEmailRevenue / listSize : 0;
  
  // Calcoli benchmark - fisso al 35% per tutti i settori
  const fixedBenchmarkPercent = 35;
  const benchmarkEmailRevenue = monthlyRevenue * (fixedBenchmarkPercent / 100);
  const benchmarkRevenuePerSub = sectorBenchmark.revenuePerSub;
  
  // Gap Analysis
  const revenueGap = Math.max(0, benchmarkEmailRevenue - currentEmailRevenue);
  const revenueGapPercent = currentEmailRevenue > 0 
    ? ((benchmarkEmailRevenue - currentEmailRevenue) / currentEmailRevenue) * 100 
    : 100;
  const revenuePerSubGap = benchmarkRevenuePerSub - currentRevenuePerSub;
  
  // Automation Analysis
  const allFlows = Object.keys(flowImpact);
  const activeFlowsFiltered = activeFlows.filter(f => f !== 'none' && allFlows.includes(f));
  const activeFlowsCount = activeFlowsFiltered.length;
  const totalFlowsCount = allFlows.length;
  const automationCoverage = (activeFlowsCount / totalFlowsCount) * 100;
  
  let automationRating: 'A' | 'B' | 'C' | 'D';
  if (automationCoverage >= 80) automationRating = 'A';
  else if (automationCoverage >= 60) automationRating = 'B';
  else if (automationCoverage >= 40) automationRating = 'C';
  else automationRating = 'D';
  
  // Missing flows con impatto calcolato
  const missingFlows = allFlows
    .filter(flow => !activeFlowsFiltered.includes(flow))
    .map(key => {
      const flow = flowImpact[key];
      const impactValue = benchmarkEmailRevenue * (flow.impactPercent / 100);
      return {
        key,
        label: flow.label,
        impactPercent: flow.impactPercent,
        impactValue,
        priority: flow.priority,
        description: flow.description,
        implementationTime: flow.implementationTime
      };
    })
    .sort((a, b) => b.impactValue - a.impactValue);
  
  const totalFlowGap = missingFlows.reduce((sum, f) => sum + f.impactValue, 0);
  
  // Scenari di crescita
  const scenarios = {
    conservative: {
      growthPercent: 15,
      value: currentEmailRevenue * 0.15,
      description: 'Ottimizzazione flussi esistenti e campagne'
    },
    moderate: {
      growthPercent: 35,
      value: currentEmailRevenue * 0.35,
      description: 'Implementazione flussi chiave + ottimizzazione'
    },
    aggressive: {
      growthPercent: 60,
      value: currentEmailRevenue * 0.60,
      description: 'Strategia completa email marketing'
    }
  };
  
  // Top 3 azioni prioritarie
  const topActions: AdvancedReport['topActions'] = [];
  
  // Azione 1: Flusso mancante più impattante
  if (missingFlows.length > 0) {
    const topFlow = missingFlows[0];
    topActions.push({
      action: `Implementa ${topFlow.label}`,
      impact: topFlow.impactValue,
      difficulty: topFlow.priority === 1 ? 'Media' : topFlow.priority === 2 ? 'Media' : 'Bassa',
      timeframe: topFlow.implementationTime,
      roi: `+€${Math.round(topFlow.impactValue).toLocaleString()}/mese`
    });
  }
  
  // Azione 2: Secondo flusso o ottimizzazione
  if (missingFlows.length > 1) {
    const secondFlow = missingFlows[1];
    topActions.push({
      action: `Attiva ${secondFlow.label}`,
      impact: secondFlow.impactValue,
      difficulty: 'Media',
      timeframe: secondFlow.implementationTime,
      roi: `+€${Math.round(secondFlow.impactValue).toLocaleString()}/mese`
    });
  } else {
    topActions.push({
      action: 'Ottimizza frequenza invio campagne',
      impact: currentEmailRevenue * 0.1,
      difficulty: 'Bassa',
      timeframe: '1 settimana',
      roi: `+€${Math.round(currentEmailRevenue * 0.1).toLocaleString()}/mese`
    });
  }
  
  // Azione 3: Segmentazione o terzo flusso
  if (missingFlows.length > 2) {
    const thirdFlow = missingFlows[2];
    topActions.push({
      action: `Configura ${thirdFlow.label}`,
      impact: thirdFlow.impactValue,
      difficulty: 'Media',
      timeframe: thirdFlow.implementationTime,
      roi: `+€${Math.round(thirdFlow.impactValue).toLocaleString()}/mese`
    });
  } else {
    topActions.push({
      action: 'Implementa segmentazione RFM avanzata',
      impact: currentEmailRevenue * 0.08,
      difficulty: 'Alta',
      timeframe: '2-3 settimane',
      roi: `+€${Math.round(currentEmailRevenue * 0.08).toLocaleString()}/mese`
    });
  }
  
  // Email Health Score (0-100)
  const percentScore = Math.min(100, (currentEmailPercent / sectorBenchmark.emailShare) * 100);
  const automationScore = automationCoverage;
  const emailHealthScore = Math.round((percentScore * 0.6) + (automationScore * 0.4));
  
  // Potenziale annuo
  const yearlyPotential = (revenueGap + totalFlowGap) * 12;
  
  // Analisi Strategica - Generazione testi dinamici
  const formatCurrencyInternal = (value: number) => `€${Math.round(value).toLocaleString('it-IT')}`;
  
  const performanceLevel = emailHealthScore >= 60 ? 'discreta' : 
                           emailHealthScore >= 40 ? 'sotto le aspettative' : 'critica';
  
  const currentSituation = `Il tuo e-commerce nel settore ${sectorBenchmark.label} mostra una performance email ${performanceLevel}. Attualmente generi il ${currentEmailPercent}% del fatturato mensile dall'email marketing (${formatCurrencyInternal(currentEmailRevenue)}/mese), contro un benchmark di settore del 35%. ${
    automationRating === 'D' || automationRating === 'C'
      ? `Con sole ${activeFlowsCount} automazioni attive su ${totalFlowsCount} disponibili (rating ${automationRating}), stai lasciando sul tavolo opportunità di vendita automatizzate per circa ${formatCurrencyInternal(totalFlowGap)}/mese.` 
      : `Hai una buona base di ${activeFlowsCount} automazioni attive, ma c'è ancora margine per ottimizzare ulteriormente e raggiungere il benchmark di settore.`
  }`;
  
  const desiredSituation = `Allineandoti al benchmark del settore ${sectorBenchmark.label}, potresti generare ${formatCurrencyInternal(benchmarkEmailRevenue)}/mese dall'email marketing, con un incremento di ${formatCurrencyInternal(revenueGap)}/mese rispetto ad oggi. Un sistema completo di automazioni trasformerebbe l'email nel tuo canale più profittevole, con un ROI medio di 35-42x sull'investimento. Questo significa ${formatCurrencyInternal(yearlyPotential)}/anno di fatturato aggiuntivo senza aumentare il budget pubblicitario.`;
  
  const potentialObstacles: string[] = [];
  potentialObstacles.push("Mancanza di tempo e risorse interne dedicate all'email marketing");
  
  if (automationRating === 'C' || automationRating === 'D') {
    potentialObstacles.push("Competenze tecniche limitate per implementare automazioni avanzate");
  }
  
  if (activeFlowsCount < 3) {
    potentialObstacles.push("Assenza di strategia strutturata per le automazioni email");
  }
  
  if (currentEmailPercent < 15) {
    potentialObstacles.push("Lista email sottosviluppata o non adeguatamente segmentata");
  }
  
  potentialObstacles.push("Difficoltà nel misurare e attribuire correttamente il ROI dell'email");
  
  const strategicAnalysis = {
    currentSituation,
    desiredSituation,
    potentialObstacles: potentialObstacles.slice(0, 4)
  };
  
  // Calcolo Forecast Lista
  const aov = sectorAOV[sector] || sectorAOV.other;
  const sendsPerMonth = parseEmailFrequency(emailFrequency || 'none');
  
  // Calcola revenue per uno scenario dato
  const calcScenario = (sends: number) => {
    const newsletterRevenue = aov * (listSize * sends * 0.002); // 0.2% CR
    const automationRevenue = aov * (listSize * 0.02);          // 2% CR
    return {
      sends,
      newsletterRevenue,
      automationRevenue,
      total: newsletterRevenue + automationRevenue
    };
  };

  // Scenari: Attuale (freq dichiarata), Ottimizzato (x2.5), Benchmark (20 invii)
  const optimizedSends = Math.max(12, Math.round(sendsPerMonth * 2.5));
  const benchmarkSends = 20;

  const listForecast = {
    listSize,
    sendsPerMonth,
    sectorAOV: aov,
    current: calcScenario(sendsPerMonth),
    optimized: calcScenario(optimizedSends),
    benchmark: calcScenario(benchmarkSends)
  };

  return {
    currentEmailRevenue,
    currentEmailPercent,
    currentRevenuePerSub,
    monthlyRevenue,
    listSize,
    sectorBenchmark,
    benchmarkEmailRevenue,
    benchmarkRevenuePerSub,
    revenueGap,
    revenueGapPercent,
    revenuePerSubGap,
    activeFlowsCount,
    totalFlowsCount,
    automationCoverage,
    automationRating,
    missingFlows,
    totalFlowGap,
    scenarios,
    topActions,
    strategicAnalysis,
    emailHealthScore,
    yearlyPotential,
    listForecast
  };
};

