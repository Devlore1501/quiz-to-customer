import jsPDF from 'jspdf';
import type { AdvancedReport } from './reportCalculations';

const formatCurrency = (value: number) => `€${Math.round(value).toLocaleString('it-IT')}`;

export const generatePdfReport = async (
  report: AdvancedReport,
  userName: string,
  userEmail: string,
  website: string
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  // Helper function for colored rectangles
  const drawRect = (x: number, yPos: number, w: number, h: number, color: string) => {
    pdf.setFillColor(color);
    pdf.rect(x, yPos, w, h, 'F');
  };

  // Helper for adding new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (y + requiredSpace > 270) {
      pdf.addPage();
      y = 20;
    }
  };

  // === HEADER ===
  drawRect(0, 0, pageWidth, 45, '#1e293b');
  pdf.setTextColor('#f97316');
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('📊 Report Email Marketing', pageWidth / 2, 20, { align: 'center' });
  
  pdf.setTextColor('#ffffff');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Analisi personalizzata per ${userName}`, pageWidth / 2, 30, { align: 'center' });
  pdf.text(`Settore: ${report.sectorBenchmark.label}`, pageWidth / 2, 37, { align: 'center' });

  y = 55;

  // === EMAIL HEALTH SCORE ===
  drawRect(margin, y, contentWidth, 30, '#334155');
  pdf.setTextColor('#f97316');
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Email Health Score', margin + 5, y + 12);
  
  // Score circle simulation
  pdf.setFontSize(28);
  pdf.setTextColor(report.emailHealthScore >= 60 ? '#22c55e' : report.emailHealthScore >= 40 ? '#f59e0b' : '#ef4444');
  pdf.text(`${report.emailHealthScore}/100`, pageWidth - margin - 30, y + 18);
  
  pdf.setTextColor('#94a3b8');
  pdf.setFontSize(10);
  const scoreMessage = report.emailHealthScore >= 80 
    ? "Eccellente! Stai sfruttando bene l'email marketing."
    : report.emailHealthScore >= 60 
    ? "Buono, ma c'è margine di miglioramento."
    : report.emailHealthScore >= 40 
    ? "Discreto. Hai opportunità significative da cogliere."
    : "Critico. Stai perdendo molto potenziale economico.";
  pdf.text(scoreMessage, margin + 5, y + 25);

  y += 40;

  // === SITUAZIONE ATTUALE VS BENCHMARK ===
  pdf.setTextColor('#f97316');
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('📈 Situazione Attuale vs Benchmark', margin, y);
  y += 10;

  // Three boxes
  const boxWidth = (contentWidth - 10) / 3;
  
  // Box 1: Fatturato Attuale
  drawRect(margin, y, boxWidth, 35, '#475569');
  pdf.setTextColor('#94a3b8');
  pdf.setFontSize(9);
  pdf.text('Fatturato Email Attuale', margin + 3, y + 8);
  pdf.setTextColor('#ffffff');
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(report.currentEmailRevenue) + '/mese', margin + 3, y + 20);
  pdf.setTextColor('#94a3b8');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${report.currentEmailPercent}% del fatturato`, margin + 3, y + 28);

  // Box 2: Benchmark
  drawRect(margin + boxWidth + 5, y, boxWidth, 35, '#475569');
  pdf.setTextColor('#f97316');
  pdf.setFontSize(9);
  pdf.text('Benchmark Settore', margin + boxWidth + 8, y + 8);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(report.benchmarkEmailRevenue) + '/mese', margin + boxWidth + 8, y + 20);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${report.sectorBenchmark.emailShare}% del fatturato`, margin + boxWidth + 8, y + 28);

  // Box 3: Gap
  drawRect(margin + (boxWidth + 5) * 2, y, boxWidth, 35, '#7f1d1d');
  pdf.setTextColor('#fca5a5');
  pdf.setFontSize(9);
  pdf.text('Gap Economico', margin + (boxWidth + 5) * 2 + 3, y + 8);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(report.revenueGap) + '/mese', margin + (boxWidth + 5) * 2 + 3, y + 20);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(formatCurrency(report.revenueGap * 12) + '/anno persi', margin + (boxWidth + 5) * 2 + 3, y + 28);

  y += 45;

  // === ANALISI AUTOMAZIONI ===
  checkNewPage(60);
  pdf.setTextColor('#f97316');
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('⚙️ Analisi Automazioni', margin, y);
  
  // Rating badge
  const ratingColor = report.automationRating === 'A' ? '#22c55e' : report.automationRating === 'B' ? '#eab308' : report.automationRating === 'C' ? '#f97316' : '#ef4444';
  pdf.setTextColor(ratingColor);
  pdf.text(`Rating: ${report.automationRating}`, pageWidth - margin - 25, y);
  y += 10;

  pdf.setTextColor('#ffffff');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Copertura: ${report.activeFlowsCount}/${report.totalFlowsCount} flussi attivi (${Math.round(report.automationCoverage)}%)`, margin, y);
  y += 8;

  pdf.setTextColor('#f97316');
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Potenziale flussi mancanti: ${formatCurrency(report.totalFlowGap)}/mese`, margin, y);
  y += 12;

  // Missing flows
  if (report.missingFlows.length > 0) {
    pdf.setTextColor('#94a3b8');
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Flussi mancanti (ordinati per impatto):', margin, y);
    y += 6;

    report.missingFlows.slice(0, 4).forEach((flow) => {
      checkNewPage(10);
      pdf.setTextColor('#ffffff');
      pdf.text(`• ${flow.label}: +${formatCurrency(flow.impactValue)}/mese (${flow.implementationTime})`, margin + 5, y);
      y += 5;
    });
  }

  y += 10;

  // === SCENARI DI CRESCITA ===
  checkNewPage(50);
  pdf.setTextColor('#f97316');
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('🚀 Scenari di Crescita', margin, y);
  y += 10;

  const scenarios = [
    { name: 'Conservativo', data: report.scenarios.conservative, color: '#22c55e' },
    { name: 'Moderato (Consigliato)', data: report.scenarios.moderate, color: '#f97316' },
    { name: 'Aggressivo', data: report.scenarios.aggressive, color: '#a855f7' }
  ];

  scenarios.forEach((scenario) => {
    checkNewPage(15);
    pdf.setTextColor(scenario.color);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${scenario.name}: +${scenario.data.growthPercent}% = ${formatCurrency(scenario.data.value)}/mese`, margin, y);
    pdf.setTextColor('#94a3b8');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(scenario.data.description, margin + 5, y + 5);
    y += 12;
  });

  y += 5;

  // === TOP 3 AZIONI ===
  checkNewPage(50);
  pdf.setTextColor('#f97316');
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('🎯 Le 3 Azioni Prioritarie', margin, y);
  y += 10;

  report.topActions.forEach((action, index) => {
    checkNewPage(15);
    pdf.setTextColor('#ffffff');
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}. ${action.action}`, margin, y);
    pdf.setTextColor('#22c55e');
    pdf.text(action.roi, pageWidth - margin - 30, y);
    pdf.setTextColor('#94a3b8');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`⏱️ ${action.timeframe} • Difficoltà: ${action.difficulty}`, margin + 5, y + 5);
    y += 12;
  });

  y += 10;

  // === POTENZIALE TOTALE ===
  checkNewPage(30);
  drawRect(margin, y, contentWidth, 25, '#f97316');
  pdf.setTextColor('#ffffff');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('💰 Potenziale Economico Annuo Recuperabile', pageWidth / 2, y + 10, { align: 'center' });
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(report.yearlyPotential), pageWidth / 2, y + 20, { align: 'center' });

  y += 35;

  // === FOOTER ===
  checkNewPage(20);
  pdf.setTextColor('#64748b');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Report generato il ${new Date().toLocaleDateString('it-IT')} per ${website}`, pageWidth / 2, y + 5, { align: 'center' });
  pdf.text('Per una consulenza personalizzata, contattaci su WhatsApp', pageWidth / 2, y + 10, { align: 'center' });

  // Download PDF
  pdf.save(`Report_Email_Marketing_${userName.replace(/\s+/g, '_')}.pdf`);
};
