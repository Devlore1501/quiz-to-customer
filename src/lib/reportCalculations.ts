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
    isCustomAov: boolean;
    current: { sends: number; newsletterRevenue: number; automationRevenue: number; total: number };
    optimized: { sends: number; newsletterRevenue: number; automationRevenue: number; total: number };
    benchmark: { sends: number; newsletterRevenue: number; automationRevenue: number; total: number };
  };

  // Dati popup & optin (opzionale — presente solo se forniti dallo step popup)
  popupData?: {
    hasPopup: boolean;
    conversionRate: number;       // %
    monthlyVisitors: number;
    newSubscribersPerMonth: number;
    projectedListSize6m: number;
    projectedListSize12m: number;
    projectedRevenue12m: number;
    monthlyListGrowthRate: number; // % es. 2
    revenueWelcome12m: number;    // layer acquisto diretto welcome flow (5% CR)
    revenueRecovery12m: number;   // layer recuperi carrello + checkout (3% CR)
    revenueAutomation12m: number; // layer automazioni (CR dinamico basato su flussi attivi)
  };
}

// Direct-values version for admin mode (no range parsing needed)
export const calculateAdvancedReportFromValues = (
  sector: string,
  monthlyRevenue: number,
  currentEmailPercent: number,
  listSize: number,
  activeFlows: string[],
  customSectorLabel?: string,
  emailFrequency?: string,
  customAOV?: number,
  scenarioOverrides?: { conservative: number; moderate: number; aggressive: number },
  popupParams?: {
    hasPopup: boolean;
    conversionRate: number;
    monthlyVisitors: number;
    monthlyListGrowthRate: number;
  }
): AdvancedReport => {
  return _calculateReport(sector, monthlyRevenue, currentEmailPercent, listSize, activeFlows, customSectorLabel, emailFrequency, customAOV, scenarioOverrides, popupParams);
};

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
  return _calculateReport(sector, monthlyRevenue, currentEmailPercent, listSize, activeFlows, customSectorLabel, emailFrequency, undefined, undefined, undefined);
};

const _calculateReport = (
  sector: string,
  monthlyRevenue: number,
  currentEmailPercent: number,
  listSize: number,
  activeFlows: string[],
  customSectorLabel?: string,
  emailFrequency?: string,
  customAOV?: number,
  scenarioOverrides?: { conservative: number; moderate: number; aggressive: number },
  popupParams?: {
    hasPopup: boolean;
    conversionRate: number;
    monthlyVisitors: number;
    monthlyListGrowthRate: number;
  }
): AdvancedReport => {
  
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
  
  // Scenari di crescita (con override opzionali dall'admin)
  // Base: revenueGap mensile (differenza tra benchmark e attuale)
  // Le % indicano la quota del gap recuperata, non la crescita sul fatturato attuale
  const conservPct = scenarioOverrides?.conservative ?? 15;
  const moderatePct = scenarioOverrides?.moderate ?? 35;
  const aggressPct = scenarioOverrides?.aggressive ?? 60;

  const scenarios = {
    conservative: {
      growthPercent: conservPct,
      value: currentEmailRevenue * (conservPct / 100),
      description: `Crescita del ${conservPct}% sul fatturato email attuale`
    },
    moderate: {
      growthPercent: moderatePct,
      value: currentEmailRevenue * (moderatePct / 100),
      description: `Crescita del ${moderatePct}% con flussi chiave + ottimizzazione`
    },
    aggressive: {
      growthPercent: aggressPct,
      value: currentEmailRevenue * (aggressPct / 100),
      description: `Crescita del ${aggressPct}% con strategia email completa`
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
  
  // Potenziale annuo — gap tra benchmark e attuale × 12 mesi
  const yearlyPotential = revenueGap * 12;
  
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
  
  // Calcolo Forecast Lista — usa AOV reale se fornito, altrimenti benchmark settore
  const aov = customAOV ?? sectorAOV[sector] ?? sectorAOV.other;
  const sendsPerMonth = parseEmailFrequency(emailFrequency || 'none');
  
  // CR dinamico automazioni in base ai flussi attivi (0.3%–1.0%)
  const getAutomationCR = (activeCount: number): number => {
    if (activeCount === 0) return 0;
    if (activeCount <= 2) return 0.003;
    if (activeCount <= 4) return 0.005;
    if (activeCount <= 6) return 0.007;
    return 0.01;
  };
  const automationCR = getAutomationCR(activeFlowsCount);

  // Calcola revenue per uno scenario dato
  const REACH_RATE = 0.30; // 30% della lista riceve ciascun invio (segmentazione + engagement)

  const calcScenario = (sends: number) => {
    const newsletterRevenue = aov * (listSize * REACH_RATE * sends * 0.002); // 0.2% CR newsletter
    const automationRevenue = aov * (listSize * automationCR);  // CR dinamico automazioni
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
    isCustomAov: customAOV !== undefined,
    current: calcScenario(sendsPerMonth),
    optimized: calcScenario(optimizedSends),
    benchmark: calcScenario(benchmarkSends)
  };

  // Calcolo popupData (opzionale — solo se popup attivo, anche con 0 visitatori)
  let popupData: AdvancedReport['popupData'] = undefined;
  if (popupParams && popupParams.hasPopup) {
    const cr = popupParams.conversionRate / 100;
    const growthRate = popupParams.monthlyListGrowthRate / 100;
    // Nuovi iscritti: da visitatori×CR se CR > 0, altrimenti da listSize×growthRate
    const fromVisitors = Math.round(popupParams.monthlyVisitors * cr);
    const fromGrowthRate = Math.round(listSize * growthRate);
    const newSubscribersPerMonth = cr > 0 ? fromVisitors : fromGrowthRate;
    const projectedListSize6m = Math.round(listSize * Math.pow(1 + growthRate, 6));
    const projectedListSize12m = Math.round(listSize * Math.pow(1 + growthRate, 12));
    // Revenue nuovi iscritti popup — 3 layer:
    // 1) Acquisto diretto via welcome flow (5% CR)
    const revenueWelcome12m = Math.round(newSubscribersPerMonth * aov * 0.05 * 12);
    // 2) Recuperi carrello + checkout (3% CR)
    const revenueRecovery12m = Math.round(newSubscribersPerMonth * aov * 0.03 * 12);
    // 3) Automazioni attive nel tempo (CR dinamico — riusa automationCR già calcolato)
    const revenueAutomation12m = Math.round(newSubscribersPerMonth * aov * automationCR * 12);
    // Totale 3 layer
    const projectedRevenue12m = revenueWelcome12m + revenueRecovery12m + revenueAutomation12m;
    popupData = {
      hasPopup: true,
      conversionRate: popupParams.conversionRate,
      monthlyVisitors: popupParams.monthlyVisitors,
      newSubscribersPerMonth,
      projectedListSize6m,
      projectedListSize12m,
      projectedRevenue12m,
      monthlyListGrowthRate: popupParams.monthlyListGrowthRate,
      revenueWelcome12m,
      revenueRecovery12m,
      revenueAutomation12m,
    };
  } else if (popupParams && !popupParams.hasPopup) {
    popupData = {
      hasPopup: false,
      conversionRate: 0,
      monthlyVisitors: 0,
      newSubscribersPerMonth: 0,
      projectedListSize6m: listSize,
      projectedListSize12m: listSize,
      projectedRevenue12m: 0,
      monthlyListGrowthRate: 0,
      revenueWelcome12m: 0,
      revenueRecovery12m: 0,
      revenueAutomation12m: 0,
    };
  }

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
    listForecast,
    popupData,
  };
};

