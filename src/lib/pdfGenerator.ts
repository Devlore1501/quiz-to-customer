import jsPDF from 'jspdf';
import type { AdvancedReport } from './reportCalculations';

// Brand colors Mailift
const COLORS = {
  primary: '#1a2744',      // Blu scuro (header/sfondo)
  accent: '#f5a623',       // Arancione/Oro (accenti)
  white: '#ffffff',
  lightGray: '#f8fafc',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cardBg: '#334155',
  darkSlate: '#1e293b'
};

const formatCurrency = (value: number) => `€${Math.round(value).toLocaleString('it-IT')}`;

// Load logo as base64
const loadLogo = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = '/mailift-logo.png';
  });
};

export const generatePdfReport = async (
  report: AdvancedReport,
  userName: string,
  userEmail: string,
  website: string
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 0;
  let currentPage = 1;

  // Load logo
  const logoBase64 = await loadLogo();

  // Helper functions
  const drawRect = (x: number, yPos: number, w: number, h: number, color: string) => {
    pdf.setFillColor(color);
    pdf.rect(x, yPos, w, h, 'F');
  };

  const drawRoundedRect = (x: number, yPos: number, w: number, h: number, r: number, color: string) => {
    pdf.setFillColor(color);
    pdf.roundedRect(x, yPos, w, h, r, r, 'F');
  };

  const wrapText = (text: string, maxWidth: number): string[] => {
    return pdf.splitTextToSize(text, maxWidth);
  };

  const addNewPage = () => {
    pdf.addPage();
    currentPage++;
    y = 25;
    drawPageHeader();
  };

  const checkNewPage = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - 30) {
      addNewPage();
    }
  };

  const drawPageHeader = () => {
    if (currentPage > 1) {
      // Small header line on subsequent pages
      drawRect(0, 0, pageWidth, 3, COLORS.accent);
      
      // Small logo in top right
      if (logoBase64) {
        try {
          pdf.addImage(logoBase64, 'PNG', pageWidth - 55, 5, 40, 12);
        } catch (e) {
          pdf.setTextColor(COLORS.primary);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text('MAILIFT', pageWidth - margin - 15, 12);
        }
      }
      
      pdf.setTextColor(COLORS.textSecondary);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Report Email Marketing', margin, 12);
    }
  };

  const drawPageFooter = () => {
    pdf.setTextColor(COLORS.textMuted);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Pagina ${currentPage} | Report generato il ${new Date().toLocaleDateString('it-IT')}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return COLORS.warning;
    if (score >= 40) return COLORS.accent;
    return COLORS.danger;
  };

  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'A': return COLORS.success;
      case 'B': return COLORS.warning;
      case 'C': return COLORS.accent;
      default: return COLORS.danger;
    }
  };

  // ============================================
  // PAGE 1: COVER PAGE
  // ============================================
  
  // Full page dark background
  drawRect(0, 0, pageWidth, pageHeight, COLORS.primary);
  
  // Accent stripe at top
  drawRect(0, 0, pageWidth, 8, COLORS.accent);
  
  // Logo centered
  if (logoBase64) {
    try {
      pdf.addImage(logoBase64, 'PNG', (pageWidth - 100) / 2, 50, 100, 30);
    } catch (e) {
      pdf.setTextColor(COLORS.white);
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MAILIFT', pageWidth / 2, 70, { align: 'center' });
    }
  } else {
    pdf.setTextColor(COLORS.white);
    pdf.setFontSize(32);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MAILIFT', pageWidth / 2, 70, { align: 'center' });
  }
  
  // Main title
  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text('REPORT', pageWidth / 2, 110, { align: 'center' });
  pdf.text('EMAIL MARKETING', pageWidth / 2, 125, { align: 'center' });
  
  // Subtitle
  pdf.setTextColor(COLORS.accent);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Analisi Personalizzata', pageWidth / 2, 145, { align: 'center' });
  
  // Divider line
  pdf.setDrawColor(COLORS.accent);
  pdf.setLineWidth(0.5);
  pdf.line(pageWidth / 2 - 40, 155, pageWidth / 2 + 40, 155);
  
  // Client info box
  drawRoundedRect(margin + 20, 170, contentWidth - 40, 55, 3, COLORS.darkSlate);
  
  pdf.setTextColor(COLORS.textMuted);
  pdf.setFontSize(10);
  pdf.text('Preparato per:', pageWidth / 2, 182, { align: 'center' });
  
  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(userName || 'Cliente', pageWidth / 2, 195, { align: 'center' });
  
  pdf.setTextColor(COLORS.accent);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(website || '', pageWidth / 2, 208, { align: 'center' });
  
  pdf.setTextColor(COLORS.textMuted);
  pdf.setFontSize(10);
  pdf.text(userEmail || '', pageWidth / 2, 218, { align: 'center' });
  
  // Sector badge
  drawRoundedRect(pageWidth / 2 - 50, 240, 100, 20, 3, COLORS.accent);
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Settore: ${report.sectorBenchmark.label}`, pageWidth / 2, 252, { align: 'center' });
  
  // Date at bottom
  pdf.setTextColor(COLORS.textMuted);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(new Date().toLocaleDateString('it-IT', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }), pageWidth / 2, pageHeight - 25, { align: 'center' });

  // ============================================
  // PAGE 2: EXECUTIVE SUMMARY
  // ============================================
  addNewPage();
  
  // Section title
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EXECUTIVE SUMMARY', margin, y);
  y += 5;
  
  // Orange underline
  drawRect(margin, y, 60, 2, COLORS.accent);
  y += 15;
  
  // Email Health Score Card
  drawRoundedRect(margin, y, contentWidth, 50, 4, COLORS.lightGray);
  
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EMAIL HEALTH SCORE', margin + 10, y + 15);
  
  // Score circle (simulated)
  const scoreColor = getScoreColor(report.emailHealthScore);
  drawRoundedRect(pageWidth - margin - 45, y + 8, 35, 35, 17, scoreColor);
  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${report.emailHealthScore}`, pageWidth - margin - 27, y + 30, { align: 'center' });
  
  // Score interpretation
  pdf.setTextColor(COLORS.textSecondary);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const scoreMessage = report.emailHealthScore >= 80 
    ? "Eccellente! Stai sfruttando bene l'email marketing."
    : report.emailHealthScore >= 60 
    ? "Buono, ma c'e margine di miglioramento significativo."
    : report.emailHealthScore >= 40 
    ? "Discreto. Hai opportunita importanti da cogliere."
    : "Critico. Stai perdendo molto potenziale economico.";
  
  const wrappedScore = wrapText(scoreMessage, contentWidth - 60);
  wrappedScore.forEach((line, i) => {
    pdf.text(line, margin + 10, y + 28 + (i * 5));
  });
  
  y += 60;
  
  // Three metric cards
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('METRICHE CHIAVE', margin, y);
  y += 10;
  
  const cardWidth = (contentWidth - 10) / 3;
  
  // Card 1: Current Revenue
  drawRoundedRect(margin, y, cardWidth, 45, 3, COLORS.primary);
  pdf.setTextColor(COLORS.textMuted);
  pdf.setFontSize(8);
  pdf.text('FATTURATO EMAIL', margin + 5, y + 10);
  pdf.text('ATTUALE', margin + 5, y + 15);
  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(report.currentEmailRevenue), margin + 5, y + 28);
  pdf.setTextColor(COLORS.accent);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('/mese', margin + 5, y + 36);
  pdf.setTextColor(COLORS.textMuted);
  pdf.text(`${report.currentEmailPercent}% del fatturato`, margin + 5, y + 42);
  
  // Card 2: Benchmark
  drawRoundedRect(margin + cardWidth + 5, y, cardWidth, 45, 3, COLORS.accent);
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(8);
  pdf.text('BENCHMARK', margin + cardWidth + 10, y + 10);
  pdf.text('SETTORE', margin + cardWidth + 10, y + 15);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(report.benchmarkEmailRevenue), margin + cardWidth + 10, y + 28);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('/mese', margin + cardWidth + 10, y + 36);
  pdf.text(`${report.sectorBenchmark.emailShare}% del fatturato`, margin + cardWidth + 10, y + 42);
  
  // Card 3: Gap
  drawRoundedRect(margin + (cardWidth + 5) * 2, y, cardWidth, 45, 3, COLORS.danger);
  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(8);
  pdf.text('GAP ECONOMICO', margin + (cardWidth + 5) * 2 + 5, y + 10);
  pdf.text('ANNUALE', margin + (cardWidth + 5) * 2 + 5, y + 15);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(report.revenueGap * 12), margin + (cardWidth + 5) * 2 + 5, y + 28);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('/anno', margin + (cardWidth + 5) * 2 + 5, y + 36);
  pdf.text('potenziale perso', margin + (cardWidth + 5) * 2 + 5, y + 42);
  
  y += 55;
  
  // Summary text
  drawRoundedRect(margin, y, contentWidth, 35, 3, COLORS.lightGray);
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SINTESI', margin + 10, y + 12);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLORS.textSecondary);
  const summaryText = `Il tuo email marketing genera attualmente ${formatCurrency(report.currentEmailRevenue)} al mese, pari al ${report.currentEmailPercent}% del fatturato. Il benchmark di settore indica un potenziale di ${formatCurrency(report.benchmarkEmailRevenue)} mensili. Questo significa un gap di ${formatCurrency(report.revenueGap * 12)} all'anno da recuperare.`;
  const wrappedSummary = wrapText(summaryText, contentWidth - 20);
  wrappedSummary.forEach((line, i) => {
    pdf.text(line, margin + 10, y + 20 + (i * 4));
  });
  
  drawPageFooter();

  // ============================================
  // PAGE 3: STRATEGIC ANALYSIS
  // ============================================
  if (report.strategicAnalysis) {
    addNewPage();
    
    pdf.setTextColor(COLORS.primary);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ANALISI STRATEGICA', margin, y);
    y += 5;
    drawRect(margin, y, 60, 2, COLORS.accent);
    y += 15;
    
    // Situazione Attuale
    drawRoundedRect(margin, y, contentWidth, 55, 4, COLORS.lightGray);
    drawRect(margin, y, 4, 55, COLORS.textSecondary);
    
    pdf.setTextColor(COLORS.primary);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SITUAZIONE ATTUALE', margin + 12, y + 12);
    
    pdf.setTextColor(COLORS.textSecondary);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const wrappedCurrent = wrapText(report.strategicAnalysis.currentSituation, contentWidth - 24);
    wrappedCurrent.slice(0, 6).forEach((line, i) => {
      pdf.text(line, margin + 12, y + 22 + (i * 5));
    });
    
    y += 62;
    
    // Situazione Desiderata
    drawRoundedRect(margin, y, contentWidth, 50, 4, '#dcfce7');
    drawRect(margin, y, 4, 50, COLORS.success);
    
    pdf.setTextColor(COLORS.success);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SITUAZIONE DESIDERATA', margin + 12, y + 12);
    
    pdf.setTextColor(COLORS.primary);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const wrappedDesired = wrapText(report.strategicAnalysis.desiredSituation, contentWidth - 24);
    wrappedDesired.slice(0, 5).forEach((line, i) => {
      pdf.text(line, margin + 12, y + 22 + (i * 5));
    });
    
    y += 57;
    
    // Potenziali Impedimenti
    const obstacleBoxHeight = 15 + (report.strategicAnalysis.potentialObstacles.length * 10);
    drawRoundedRect(margin, y, contentWidth, obstacleBoxHeight, 4, '#fef2f2');
    drawRect(margin, y, 4, obstacleBoxHeight, COLORS.danger);
    
    pdf.setTextColor(COLORS.danger);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('POTENZIALI IMPEDIMENTI', margin + 12, y + 12);
    
    pdf.setTextColor(COLORS.primary);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    report.strategicAnalysis.potentialObstacles.forEach((obstacle, i) => {
      pdf.text(`•  ${obstacle}`, margin + 12, y + 22 + (i * 8));
    });
    
    drawPageFooter();
  }

  // ============================================
  // PAGE 4: AUTOMATION ANALYSIS
  // ============================================
  addNewPage();
  
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ANALISI AUTOMAZIONI', margin, y);
  y += 5;
  drawRect(margin, y, 60, 2, COLORS.accent);
  y += 15;
  
  // Rating and coverage header
  drawRoundedRect(margin, y, contentWidth, 40, 4, COLORS.lightGray);
  
  // Rating badge
  const ratingColor = getRatingColor(report.automationRating);
  drawRoundedRect(margin + 10, y + 10, 25, 20, 3, ratingColor);
  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(report.automationRating, margin + 22, y + 24, { align: 'center' });
  
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(12);
  pdf.text('Rating Automazioni', margin + 45, y + 18);
  
  pdf.setTextColor(COLORS.textSecondary);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${report.activeFlowsCount} di ${report.totalFlowsCount} flussi attivi`, margin + 45, y + 28);
  
  // Coverage progress bar
  const barWidth = 80;
  const barX = pageWidth - margin - barWidth - 10;
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Copertura: ${Math.round(report.automationCoverage)}%`, barX, y + 15);
  
  // Background bar
  drawRoundedRect(barX, y + 18, barWidth, 8, 2, '#e2e8f0');
  // Progress bar
  const progressWidth = (report.automationCoverage / 100) * barWidth;
  if (progressWidth > 0) {
    drawRoundedRect(barX, y + 18, Math.min(progressWidth, barWidth), 8, 2, COLORS.accent);
  }
  
  y += 50;
  
  // Missing flows section
  if (report.missingFlows.length > 0) {
    pdf.setTextColor(COLORS.primary);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FLUSSI MANCANTI', margin, y);
    pdf.setTextColor(COLORS.textSecondary);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('(ordinati per impatto economico)', margin + 50, y);
    y += 8;
    
    // Table header
    drawRoundedRect(margin, y, contentWidth, 10, 2, COLORS.primary);
    pdf.setTextColor(COLORS.white);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FLUSSO', margin + 5, y + 7);
    pdf.text('IMPATTO/MESE', margin + 90, y + 7);
    pdf.text('TEMPO IMPL.', margin + 135, y + 7);
    y += 12;
    
    // Table rows
    report.missingFlows.forEach((flow, index) => {
      checkNewPage(12);
      const rowBg = index % 2 === 0 ? COLORS.lightGray : COLORS.white;
      drawRoundedRect(margin, y, contentWidth, 10, 1, rowBg);
      
      pdf.setTextColor(COLORS.primary);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      
      // Truncate long flow names
      const flowName = flow.label.length > 35 ? flow.label.substring(0, 32) + '...' : flow.label;
      pdf.text(flowName, margin + 5, y + 7);
      
      pdf.setTextColor(COLORS.success);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`+${formatCurrency(flow.impactValue)}`, margin + 90, y + 7);
      
      pdf.setTextColor(COLORS.textSecondary);
      pdf.setFont('helvetica', 'normal');
      pdf.text(flow.implementationTime, margin + 135, y + 7);
      
      y += 11;
    });
    
    y += 5;
  }
  
  // Total flow potential
  drawRoundedRect(margin, y, contentWidth, 25, 4, COLORS.accent);
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Potenziale Totale Flussi Mancanti:', margin + 10, y + 10);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`+${formatCurrency(report.totalFlowGap)}/mese`, margin + 10, y + 20);
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`= ${formatCurrency(report.totalFlowGap * 12)}/anno`, pageWidth - margin - 50, y + 15);
  
  drawPageFooter();

  // ============================================
  // PAGE 5: GROWTH SCENARIOS
  // ============================================
  addNewPage();
  
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SCENARI DI CRESCITA', margin, y);
  y += 5;
  drawRect(margin, y, 60, 2, COLORS.accent);
  y += 12;
  
  pdf.setTextColor(COLORS.textSecondary);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Le percentuali indicano la quota del gap mensile recuperata rispetto al benchmark di settore.', margin, y);
  pdf.text(`Gap mensile attuale: ${formatCurrency(report.revenueGap)} (differenza tra benchmark e fatturato email attuale)`, margin, y + 5);
  y += 16;
  
  const scenariosList = [
    { 
      name: 'CONSERVATIVO', 
      data: report.scenarios.conservative, 
      color: COLORS.success,
      subtitle: `${report.scenarios.conservative.growthPercent}% del gap recuperato — ottimizzazioni base`
    },
    { 
      name: 'MODERATO', 
      data: report.scenarios.moderate, 
      color: COLORS.accent,
      subtitle: `${report.scenarios.moderate.growthPercent}% del gap recuperato — flussi chiave + ottimizzazione`
    },
    { 
      name: 'AGGRESSIVO', 
      data: report.scenarios.aggressive, 
      color: COLORS.purple,
      subtitle: `${report.scenarios.aggressive.growthPercent}% del gap recuperato — strategia email completa`
    }
  ];
  
  scenariosList.forEach((scenario) => {
    checkNewPage(52);
    
    // Scenario card
    drawRoundedRect(margin, y, contentWidth, 48, 4, COLORS.lightGray);
    drawRect(margin, y, 5, 48, scenario.color);
    
    // Name + badge
    pdf.setTextColor(scenario.color);
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text(scenario.name, margin + 15, y + 12);
    
    if (scenario.name === 'MODERATO') {
      drawRoundedRect(margin + 60, y + 5, 22, 10, 2, scenario.color);
      pdf.setTextColor(COLORS.white);
      pdf.setFontSize(6);
      pdf.text('CONSIGLIATO', margin + 71, y + 12, { align: 'center' });
    }
    
    // % del gap
    pdf.setTextColor(COLORS.primary);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`+${scenario.data.growthPercent}%`, pageWidth - margin - 38, y + 14);
    pdf.setTextColor(COLORS.textMuted);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('del gap', pageWidth - margin - 38, y + 20);
    
    // Subtitle
    pdf.setTextColor(COLORS.textMuted);
    pdf.setFontSize(8);
    pdf.text(scenario.subtitle, margin + 15, y + 21);
    
    // Revenue values — recupero mensile aggiuntivo
    pdf.setTextColor(scenario.color);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`+${formatCurrency(scenario.data.value)}/mese`, margin + 15, y + 34);
    pdf.setTextColor(COLORS.textSecondary);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`recupero aggiuntivo atteso`, margin + 15, y + 40);

    // Annual
    pdf.setTextColor(COLORS.primary);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`= +${formatCurrency(scenario.data.value * 12)}/anno`, margin + 90, y + 34);
    
    y += 55;
  });

  // Box spiegazione
  checkNewPage(25);
  drawRoundedRect(margin, y, contentWidth, 22, 3, '#e0f2fe');
  pdf.setTextColor('#0369a1');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Come leggere gli scenari:', margin + 8, y + 8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Il recupero mensile si aggiunge al fatturato email attuale di ${formatCurrency(report.currentEmailRevenue)}/mese.`, margin + 8, y + 14);
  pdf.text(`Scenario moderato: ${formatCurrency(report.currentEmailRevenue)} + ${formatCurrency(report.scenarios.moderate.value)} = ${formatCurrency(report.currentEmailRevenue + report.scenarios.moderate.value)}/mese`, margin + 8, y + 19);
  y += 28;
  
  drawPageFooter();

  // ============================================
  // PAGE 5b: POPUP & CRESCITA LISTA (solo se presenti)
  // ============================================
  if (report.popupData) {
    const pd = report.popupData;
    addNewPage();

    pdf.setTextColor(COLORS.primary);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('POPUP & CRESCITA LISTA', margin, y);
    y += 5;
    drawRect(margin, y, 70, 2, COLORS.accent);
    y += 15;

    if (pd.hasPopup) {
      // Intro
      pdf.setTextColor(COLORS.textSecondary);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Analisi della capacita di acquisizione iscritti tramite popup e proiezione crescita lista.', margin, y);
      y += 12;

      // 3 KPI cards
      const kpiW = (contentWidth - 10) / 3;

      // Card 1: nuovi iscritti/mese
      drawRoundedRect(margin, y, kpiW, 40, 3, COLORS.primary);
      pdf.setTextColor(COLORS.textMuted);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('NUOVI ISCRITTI', margin + 5, y + 9);
      pdf.text('/MESE DA POPUP', margin + 5, y + 14);
      pdf.setTextColor(COLORS.accent);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${Math.round(pd.newSubscribersPerMonth).toLocaleString('it-IT')}`, margin + 5, y + 28);
      pdf.setTextColor(COLORS.textMuted);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Conv. ${pd.conversionRate}% su ${Math.round(pd.monthlyVisitors).toLocaleString('it-IT')} visitatori`, margin + 5, y + 36);

      // Card 2: lista a 12 mesi
      drawRoundedRect(margin + kpiW + 5, y, kpiW, 40, 3, COLORS.darkSlate);
      pdf.setTextColor(COLORS.textMuted);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('LISTA PROIETTATA', margin + kpiW + 10, y + 9);
      pdf.text('A 12 MESI', margin + kpiW + 10, y + 14);
      pdf.setTextColor(COLORS.white);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${Math.round(pd.projectedListSize12m).toLocaleString('it-IT')}`, margin + kpiW + 10, y + 28);
      pdf.setTextColor(COLORS.textMuted);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      const growthPct12 = pd.projectedListSize12m > 0 && report.listSize > 0 
        ? Math.round((pd.projectedListSize12m / report.listSize - 1) * 100) : 0;
      pdf.text(`+${growthPct12}% vs lista attuale`, margin + kpiW + 10, y + 36);

      // Card 3: revenue aggiuntiva/anno
      drawRoundedRect(margin + (kpiW + 5) * 2, y, kpiW, 55, 3, COLORS.success);
      pdf.setTextColor(COLORS.white);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REVENUE AGGIUNTIVA', margin + (kpiW + 5) * 2 + 5, y + 9);
      pdf.text('STIMATA / ANNO', margin + (kpiW + 5) * 2 + 5, y + 14);
      pdf.setFontSize(16);
      pdf.text(formatCurrency(pd.projectedRevenue12m), margin + (kpiW + 5) * 2 + 5, y + 28);
      // Breakdown 3 layer
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor('#d1fae5');
      pdf.text(`Benvenuto (5%): ${formatCurrency(pd.revenueWelcome12m ?? 0)}`, margin + (kpiW + 5) * 2 + 5, y + 36);
      pdf.text(`Recuperi (3%): ${formatCurrency(pd.revenueRecovery12m ?? 0)}`, margin + (kpiW + 5) * 2 + 5, y + 42);
      pdf.text(`Automazioni: ${formatCurrency(pd.revenueAutomation12m ?? 0)}`, margin + (kpiW + 5) * 2 + 5, y + 48);

      y += 65;

      // Tabella proiezione crescita lista
      pdf.setTextColor(COLORS.primary);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROIEZIONE CRESCITA LISTA', margin, y);
      y += 8;

      // Intestazione tabella
      drawRoundedRect(margin, y, contentWidth, 10, 2, COLORS.primary);
      pdf.setTextColor(COLORS.white);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      const colW = contentWidth / 4;
      pdf.text('MESE', margin + 5, y + 7);
      pdf.text('ISCRITTI', margin + colW + 5, y + 7);
      pdf.text('CRESCITA', margin + colW * 2 + 5, y + 7);
      pdf.text('REVENUE STIM.', margin + colW * 3 + 5, y + 7);
      y += 12;

      const growthRate = pd.monthlyListGrowthRate / 100;
      const currentList = report.listSize;
      const tableRows = [
        { month: 'Attuale', list: currentList, growth: 0 },
        { month: '3 mesi', list: currentList * Math.pow(1 + growthRate, 3), growth: 3 },
        { month: '6 mesi', list: pd.projectedListSize6m, growth: 6 },
        { month: '12 mesi', list: pd.projectedListSize12m, growth: 12 },
      ];

      tableRows.forEach((row, idx) => {
        const rowBg = idx % 2 === 0 ? COLORS.lightGray : COLORS.white;
        drawRoundedRect(margin, y, contentWidth, 10, 1, rowBg);
        
        const estRevenue = idx === 0 ? report.currentEmailRevenue : (row.list / currentList) * report.currentEmailRevenue;
        const growthLabel = idx === 0 ? '—' : `+${Math.round((row.list / currentList - 1) * 100)}%`;

        pdf.setTextColor(COLORS.primary);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
        pdf.text(row.month, margin + 5, y + 7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(Math.round(row.list).toLocaleString('it-IT'), margin + colW + 5, y + 7);
        pdf.setTextColor(idx === 0 ? COLORS.textSecondary : COLORS.success);
        pdf.text(growthLabel, margin + colW * 2 + 5, y + 7);
        pdf.setTextColor(COLORS.primary);
        pdf.text(formatCurrency(estRevenue) + '/mese', margin + colW * 3 + 5, y + 7);
        y += 11;
      });

      y += 6;

      // Benchmark note
      drawRoundedRect(margin, y, contentWidth, 20, 3, '#fef3c7');
      pdf.setTextColor('#92400e');
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Benchmark popup e-commerce:', margin + 8, y + 8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Tasso di conversione attuale: ${pd.conversionRate}% — Benchmark ottimale: 3-5%`, margin + 8, y + 14);
      
      if (pd.conversionRate < 3) {
        pdf.setTextColor('#dc2626');
        pdf.text('   Opportunita: ottimizzare il popup puo aumentare significativamente i nuovi iscritti.', margin + 8, y + 19);
        y += 6;
      }
      y += 26;

    } else {
      // Non ha popup
      drawRoundedRect(margin, y, contentWidth, 35, 4, '#fef2f2');
      drawRect(margin, y, 4, 35, COLORS.danger);
      pdf.setTextColor(COLORS.danger);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NESSUN POPUP ATTIVO', margin + 12, y + 12);
      pdf.setTextColor(COLORS.primary);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Il sito non dispone di un popup di raccolta email. Implementarne uno con un', margin + 12, y + 22);
      pdf.text('tasso di conversione del 3-5% puo generare centinaia di nuovi iscritti al mese.', margin + 12, y + 28);
      y += 45;
    }

    drawPageFooter();
  }

  // ============================================
  // PAGE 6: ACTION PLAN & NEXT STEPS
  // ============================================
  addNewPage();
  
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ROADMAP: TOP 3 AZIONI', margin, y);
  y += 5;
  drawRect(margin, y, 60, 2, COLORS.accent);
  y += 15;
  
  pdf.setTextColor(COLORS.textSecondary);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Le azioni prioritarie per massimizzare il ROI del tuo email marketing.', margin, y);
  y += 12;
  
  report.topActions.forEach((action, index) => {
    checkNewPage(40);
    
    // Action card
    drawRoundedRect(margin, y, contentWidth, 35, 4, COLORS.lightGray);
    
    // Number circle
    drawRoundedRect(margin + 8, y + 8, 18, 18, 9, COLORS.accent);
    pdf.setTextColor(COLORS.white);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}`, margin + 17, y + 20, { align: 'center' });
    
    // Action title
    pdf.setTextColor(COLORS.primary);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const actionTitle = action.action.length > 50 ? action.action.substring(0, 47) + '...' : action.action;
    pdf.text(actionTitle, margin + 32, y + 15);
    
    // ROI badge
    drawRoundedRect(pageWidth - margin - 35, y + 8, 30, 12, 2, COLORS.success);
    pdf.setTextColor(COLORS.white);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(action.roi, pageWidth - margin - 20, y + 16, { align: 'center' });
    
    // Details
    pdf.setTextColor(COLORS.textSecondary);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Tempo: ${action.timeframe}`, margin + 32, y + 25);
    pdf.text(`|   Difficolta: ${action.difficulty}`, margin + 80, y + 25);
    
    y += 40;
  });
  
  y += 10;
  
  // Total potential box
  drawRoundedRect(margin, y, contentWidth, 35, 4, COLORS.primary);
  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('POTENZIALE ECONOMICO ANNUO RECUPERABILE', margin + 10, y + 12);
  pdf.setTextColor(COLORS.accent);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(report.yearlyPotential), margin + 10, y + 28);
  pdf.setTextColor(COLORS.white);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('/anno', margin + 85, y + 28);
  
  y += 50;
  
  // Next Steps Section
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PROSSIMI PASSI', margin, y);
  y += 10;
  
  drawRoundedRect(margin, y, contentWidth, 55, 4, COLORS.accent);
  
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Prenota la tua consulenza gratuita', margin + 10, y + 15);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Analizzeremo insieme il tuo business e creeremo una strategia', margin + 10, y + 27);
  pdf.text('personalizzata per raggiungere questi risultati.', margin + 10, y + 35);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Contattaci:', margin + 10, y + 47);
  pdf.setFont('helvetica', 'normal');
  pdf.text('WhatsApp: +39 XXX XXX XXXX   |   Email: info@mailift.it', margin + 45, y + 47);
  
  y += 65;
  
  // Disclaimer
  pdf.setTextColor(COLORS.textMuted);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const disclaimer = 'Disclaimer: Le stime contenute in questo report sono basate su benchmark di settore e dati forniti. I risultati effettivi possono variare in base a molteplici fattori. Questo documento ha scopo informativo e non costituisce una garanzia di risultati.';
  const wrappedDisclaimer = wrapText(disclaimer, contentWidth);
  wrappedDisclaimer.forEach((line, i) => {
    pdf.text(line, margin, y + (i * 3));
  });
  
  drawPageFooter();

  // Download PDF
  const fileName = `Report_Mailift_${userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
