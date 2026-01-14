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
  // PAGE 3: AUTOMATION ANALYSIS
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
  // PAGE 4: GROWTH SCENARIOS
  // ============================================
  addNewPage();
  
  pdf.setTextColor(COLORS.primary);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SCENARI DI CRESCITA', margin, y);
  y += 5;
  drawRect(margin, y, 60, 2, COLORS.accent);
  y += 15;
  
  pdf.setTextColor(COLORS.textSecondary);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Proiezioni basate sui benchmark di settore e sulle best practice di email marketing.', margin, y);
  y += 12;
  
  const scenarios = [
    { 
      name: 'CONSERVATIVO', 
      data: report.scenarios.conservative, 
      color: COLORS.success,
      icon: 'Obiettivo: Ottimizzazione base'
    },
    { 
      name: 'MODERATO', 
      data: report.scenarios.moderate, 
      color: COLORS.accent,
      icon: 'Consigliato - Miglior rapporto costo/beneficio'
    },
    { 
      name: 'AGGRESSIVO', 
      data: report.scenarios.aggressive, 
      color: COLORS.purple,
      icon: 'Obiettivo: Massima crescita'
    }
  ];
  
  scenarios.forEach((scenario) => {
    checkNewPage(50);
    
    // Scenario card
    drawRoundedRect(margin, y, contentWidth, 45, 4, COLORS.lightGray);
    
    // Left color bar
    drawRect(margin, y, 5, 45, scenario.color);
    
    // Scenario name
    pdf.setTextColor(scenario.color);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(scenario.name, margin + 15, y + 12);
    
    // Badge for recommended
    if (scenario.name === 'MODERATO') {
      drawRoundedRect(margin + 55, y + 5, 15, 10, 2, scenario.color);
      pdf.setTextColor(COLORS.white);
      pdf.setFontSize(6);
      pdf.text('TOP', margin + 62, y + 12, { align: 'center' });
    }
    
    // Growth percentage
    pdf.setTextColor(COLORS.primary);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`+${scenario.data.growthPercent}%`, pageWidth - margin - 40, y + 15);
    
    // Subtitle
    pdf.setTextColor(COLORS.textMuted);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(scenario.icon, margin + 15, y + 20);
    
    // Values
    pdf.setTextColor(COLORS.primary);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${formatCurrency(scenario.data.value)}/mese`, margin + 15, y + 32);
    pdf.setTextColor(COLORS.textSecondary);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`= ${formatCurrency(scenario.data.value * 12)}/anno`, margin + 75, y + 32);
    
    // Description
    pdf.setFontSize(9);
    const wrappedDesc = wrapText(scenario.data.description, contentWidth - 30);
    pdf.text(wrappedDesc[0] || '', margin + 15, y + 40);
    
    y += 52;
  });
  
  drawPageFooter();

  // ============================================
  // PAGE 5: ACTION PLAN & NEXT STEPS
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
