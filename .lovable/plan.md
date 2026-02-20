
# Fix formula Revenue Newsletter: aggiungere reach rate 30%

## Problema

La formula attuale calcola come se ogni email venisse inviata a TUTTA la lista. In realta, per segmentazione e filtri di engagement, mediamente solo il 30% della lista riceve ciascun invio.

Formula attuale (sbagliata):
```
Revenue = AOV x listSize x sends x 0.2% CR
```

Formula corretta:
```
Revenue = AOV x listSize x 30% reach x sends x 0.2% CR
```

## Modifiche

### File 1: `src/lib/reportCalculations.ts` (riga 480)

Aggiungere un fattore `REACH_RATE = 0.30` alla funzione `calcScenario`:

```typescript
const REACH_RATE = 0.30; // 30% della lista riceve ciascun invio (segmentazione + engagement)

const calcScenario = (sends: number) => {
  const newsletterRevenue = aov * (listSize * REACH_RATE * sends * 0.002);
  const automationRevenue = aov * (listSize * automationCR);
  return { sends, newsletterRevenue, automationRevenue, total: newsletterRevenue + automationRevenue };
};
```

### File 2: `src/components/AdvancedReport.tsx` (riga 187)

Applicare lo stesso fattore al calcolo live dello slider:

```typescript
const REACH_RATE = 0.30;
const liveNewsletterRev = liveAov * (liveListSize * REACH_RATE * customSends * 0.002);
const liveOrders = Math.round(liveListSize * REACH_RATE * customSends * 0.002);
```

### Risultato

Con lista 5.000, AOV 65, 14 invii/mese:
- Prima: 65 x 5000 x 14 x 0.002 = 9.100/mese (gonfiato)
- Dopo:  65 x 5000 x 0.30 x 14 x 0.002 = 2.730/mese (realistico)

Nessuna modifica al database. Solo 2 file toccati, 4 righe cambiate.
