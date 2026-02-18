
# Piano: 3 fix — URL condivisibile garantito, spiegazione break-even, fee solo nel report

## Riepilogo dei 3 cambiamenti richiesti

1. **URL condivisibile garantito** — il pulsante "Copia link" attualmente appare solo se il salvataggio DB riesce (`if reportId`). Rendiamo il pulsante sempre visibile con l'URL della pagina corrente come fallback
2. **Sezione fee spostata nel report** — rimuovere i campi setup/fee/commissione dallo step 12 del quiz admin, e inserire un form inline direttamente nella sezione Investimento del report generato, così si può inserire la fee dopo aver visto i risultati
3. **Spiegazione logica break-even** — aggiungere una nota esplicativa nella sezione investimento che chiarisca la formula usata

---

## Come funziona il break-even (da chiarire all'utente nel report)

La formula attuale è corretta:

```
Guadagno mensile netto = (Potenziale Annuo Moderato / 12) − Fee Mensile Totale
Break-even (mesi) = Setup una-tantum / Guadagno mensile netto
```

**Esempio**: Setup €1.500, Fee €800/mese, Potenziale annuo €36.000
- Guadagno mensile: €3.000 − €800 = €2.200/mese netto
- Break-even: €1.500 / €2.200 = 0,68 → **1 mese**

Aggiungeremo questa spiegazione come tooltip o nota sotto la card break-even.

---

## Problema 1 — URL condivisibile

**Situazione attuale**: il pulsante "Copia link" dipende da `reportId` che viene settato solo se il DB insert riesce (righe 799-810 di `AdminSurvey.tsx`). Se l'insert fallisce silenziosamente, il pulsante non appare.

**Soluzione**: rendere il pulsante sempre presente dopo la generazione del report, con 2 livelli:
- Se `reportId` è disponibile → copia `https://quiz-to-customer.lovable.app/report/${reportId}`
- Se `reportId` è null (DB fallito) → mostra un avviso "Link non disponibile (errore salvataggio)"

In aggiunta, migliorare la gestione errori nell'insert per mostrare un warning visibile invece di silenzio.

---

## Problema 2 — Fee nel report invece che nel quiz

### Cosa rimuovere dal quiz admin (Step 12)
- Rimuovere tutti i campi: `setupFee`, `monthlyFixed`, `monthlyPercent`
- Mantenere solo il **toggle** `showInvestment` per decidere se mostrare la sezione
- I campi `setupFee`, `monthlyFixed`, `monthlyPercent` vengono rimossi anche da `AdminFormData`

### Cosa aggiungere nel report (AdvancedReport.tsx)
Nella sezione "💼 Investimento & ROI", prima della tabella ROI, aggiungere un **form inline** con:
- 3 input numerici: Setup (€), Fee fissa (€/mese), Commissione (%)
- Tutti con `useState` locale nel componente report
- La tabella ROI e la card break-even si ricalcolano in tempo reale al variare degli input
- Nessun salvataggio necessario: tutto è locale e visivo

```
Struttura sezione Investimento nel report:
┌─────────────────────────────────────┐
│ 💼 Investimento & ROI               │
├─────────────────────────────────────┤
│ [€ Setup]  [€/mese Fisso]  [% Comm] │  ← form inline
├─────────────────────────────────────┤
│ Card: Setup  │ Card: Fee  │ Card: BE │  ← calcolate live
├─────────────────────────────────────┤
│ Nota formula break-even             │
├─────────────────────────────────────┤
│ Tabella ROI 3 anni                  │  ← calcolata live
└─────────────────────────────────────┘
```

### Impatto su AdminFormData
Rimuovere `setupFee`, `monthlyFixed`, `monthlyPercent` — rimane solo `showInvestment: boolean`.

### Impatto su InvestmentData (prop passata al report)
La prop `investmentData` diventa opzionale e si semplifica: porta solo `show: boolean`. I valori economici vengono gestiti con stato locale nel componente.

---

## Modifiche tecniche dettagliate

### File 1: `src/components/AdminSurvey.tsx`

**AdminFormData**: rimuovere `setupFee`, `monthlyFixed`, `monthlyPercent`.

**Step 12 — Investimento & ROI**: semplificare il contenuto — tenere solo il toggle ON/OFF, rimuovere tutti i campi numerici e la preview.

**investmentData** passato al report: solo `{ show: formData.showInvestment }`.

**handleRestart**: rimuovere il reset dei 3 campi rimossi.

**Pulsante "Copia link"**: renderlo sempre visibile dopo la generazione, con logica:
```tsx
// Sempre visibile dopo la generazione
{report && (
  reportId ? (
    <button onClick={handleCopyLink}>...</button>
  ) : (
    <span className="text-red-400 text-xs">Link non disponibile</span>
  )
)}
```

### File 2: `src/components/AdvancedReport.tsx`

**Interfaccia InvestmentData**: semplificare — solo `show: boolean`.

**Nuovi stati locali** nella sezione investimento:
```typescript
const [setupFee, setSetupFee] = useState<string>('');
const [monthlyFixed, setMonthlyFixed] = useState<string>('');
const [monthlyPercent, setMonthlyPercent] = useState<string>('');
```

**Ricalcolo live** basato su `report.currentEmailRevenue` per la commissione %:
```typescript
const setupFeeN = parseFloat(setupFee) || 0;
const monthlyFixedN = parseFloat(monthlyFixed) || 0;
const monthlyPercentN = parseFloat(monthlyPercent) || 0;
const monthlyPercentFee = report.currentEmailRevenue * (monthlyPercentN / 100);
const totalMonthlyFee = monthlyFixedN + monthlyPercentFee;
const monthlyNetGain = report.yearlyPotential / 12 - totalMonthlyFee;
const breakEvenMonths = setupFeeN > 0 && monthlyNetGain > 0
  ? Math.ceil(setupFeeN / monthlyNetGain)
  : null;
```

**Form inline**: 3 input con bordi teal nella sezione, sopra le card riassuntive.

**Nota esplicativa break-even** sotto le card:
> Formula: Setup ÷ (Potenziale Mensile Moderato − Fee Mensile) = mesi per rientrare nell'investimento iniziale

---

## File modificati

| File | Tipo modifica |
|---|---|
| `src/components/AdminSurvey.tsx` | Rimuove campi fee da step 12, semplifica `investmentData`, migliora visibilità pulsante link |
| `src/components/AdvancedReport.tsx` | Aggiunge form inline nella sezione investimento, stati locali fee, ricalcolo live, nota break-even |

Nessun nuovo file. Nessuna modifica al database.
