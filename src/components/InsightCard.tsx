import React from 'react';

export interface InsightData {
  emoji: string;
  tag: string;
  title: string;
  text: string;
  statIcon?: string;
  statText?: string;
}

interface InsightCardProps {
  data: InsightData;
  onContinue: () => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({ data, onContinue }) => {
  return (
    <div className="animate-[ml-fadeUp_0.4s_ease_forwards]">
      <div className="bg-[#1a1a1a] border border-[#242424] rounded-[14px] overflow-hidden">
        <div className="w-full h-[160px] bg-gradient-to-br from-[#0d1a00] to-[#111] flex items-center justify-center text-[48px]">
          {data.emoji}
        </div>
        <div className="p-[18px_18px_16px]">
          <div className="flex items-center gap-[6px] font-['DM_Mono',monospace] text-[10px] tracking-[2px] uppercase text-[#FAB450] mb-[10px]">
            <div className="w-[18px] h-[18px] bg-[rgba(250,180,80,0.1)] border border-[rgba(250,180,80,0.3)] rounded-full flex items-center justify-center text-[9px]">
              ℹ
            </div>
            {data.tag}
          </div>
          <h3 className="text-[19px] font-bold leading-[1.3] text-[#f0f0eb] mb-2">
            {data.title}
          </h3>
          <div className="w-8 h-[2px] bg-[#FAB450] mb-3 rounded-sm" />
          <p className="text-[14px] text-[#888] leading-[1.65] mb-[14px]">
            {data.text}
          </p>
          {data.statText && (
            <div className="flex items-start gap-[10px] p-[10px_12px] bg-[rgba(250,180,80,0.04)] border border-[rgba(250,180,80,0.1)] rounded-lg text-[13px] text-[#aaa] leading-[1.5]">
              <span className="text-[#FAB450] flex-shrink-0 mt-[1px]">
                {data.statIcon || 'ⓘ'}
              </span>
              <span>{data.statText}</span>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onContinue}
        className="w-full mt-4 py-4 bg-[#FAB450] text-[#080808] border-none rounded-[10px] font-['Syne',sans-serif] text-[15px] font-bold cursor-pointer flex items-center justify-center gap-2 hover:bg-[#fbbf6a] hover:-translate-y-[1px] transition-all"
      >
        Continua
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </button>
    </div>
  );
};

export function getInsightForStep(step: number, formData: Record<string, unknown>): InsightData | null {
  // New quiz order indices: 3=Fatturato, 6=Revenue Email, 7=Automazioni
  switch (step) {
    case 3: {
      const rev = formData.monthlyRevenue as string;
      const revLabel = rev === 'under-10k' ? 'sotto i 10k' : rev === '300k+' ? 'oltre 300k' : rev?.replace('-', '–') + '€';
      return {
        emoji: '📊',
        tag: 'ANALISI',
        title: `Benchmark per la tua fascia di fatturato`,
        text: `Gli eCommerce nella fascia ${revLabel}/mese generano in media il 25-35% del fatturato dall'email marketing. Vediamo come ti posizioni.`,
        statIcon: 'ⓘ',
        statText: `Il benchmark di settore per l'email marketing è del 35% sul fatturato totale.`,
      };
    }
    case 6: {
      const pct = formData.emailRevenuePercentage as string;
      const isLow = pct === 'dont-know' || pct === '0-10' || pct === '10-20';
      return {
        emoji: '💸',
        tag: 'GAP ANALYSIS',
        title: isLow ? 'Hai un gap significativo da colmare' : 'Buon punto di partenza',
        text: isLow
          ? 'La tua percentuale di revenue da email è sotto il benchmark. Questo significa che stai lasciando soldi sul tavolo ogni mese.'
          : 'Stai già generando revenue dalle email. Vediamo se le tue automazioni sono ottimizzate.',
        statIcon: '💡',
        statText: isLow
          ? 'Un setup email ottimizzato può portare il contributo email dal 5% al 35% in 90 giorni.'
          : 'Anche con buone performance, ottimizzare i flussi può aggiungere un +15-20% extra.',
      };
    }
    case 7: {
      const flows = formData.activeFlows as string[];
      const count = flows?.filter(f => f !== 'none').length || 0;
      return {
        emoji: '⚙️',
        tag: 'AUTOMAZIONI',
        title: count <= 2 ? 'Pochi flussi attivi = revenue persa' : count <= 4 ? 'Base solida, ma c\'è margine' : 'Buona copertura automazioni',
        text: count <= 2
          ? `Con solo ${count} automazioni attive, stai perdendo vendite automatiche 24/7. I flussi mancanti sono le leve più potenti per crescere.`
          : `Hai ${count} flussi attivi. Ogni automazione mancante è un\'opportunità di vendita che non stai sfruttando.`,
        statIcon: '📈',
        statText: `Il recupero carrello da solo può generare fino al 15% del fatturato email. Il welcome flow un ulteriore 8%.`,
      };
    }
    default:
      return null;
  }
}
