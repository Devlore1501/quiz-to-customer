
# Piano: Sezione Investimento con ROI dinamico nel report Admin

## Le 3 funzionalità richieste

1. **Sezione "💼 Investimento & ROI"** nel report — mostra il costo del servizio e il tempo di payback
2. **Toggle admin per mostrare/nascondere la sezione** al cliente (opzione nel quiz admin)
3. **Struttura prezzi flessibile** — combinazione libera tra: Setup una-tantum + Fisso mensile + Percentuale mensile sul fatturato email; tutte e 3 opzioni sono opzionali e combinabili

---

## Come funziona il calcolo del ROI

### Input raccolti nello step "Impostazioni Investimento" (nuovo step nel quiz admin)

| Campo | Tipo | Esempio |
|---|---|---|
| Setup una-tantum | Numero € (opzionale) | €1.500 |
| Fee fissa mensile | Numero € (opzionale) | €800 |
| Commissione % mensile | Numero % (opzionale, applica su revenue email attuale) | 10% |

### Calcoli automatici nel report

**Fee mensile totale** = fisso + (% × fatturato email mensile)

**Payback del setup** = Setup ÷ (Revenue moderato/mese − Fee mensile)

**ROI annuo** = ((Revenue aggiunto annuo − Costo annuo) / Costo annuo) × 100

Dove:
- Revenue aggiunto annuo = `scenarios.moderate.value × 12` (già calcolato)
- Costo annuo = `(fee mensile × 12) + setup una-tantum`
- Break-even = `setup / (revenue_mese_aggiunto − fee_mensile)` → in mesi

### Cosa viene mostrato nel report

Una sezione con 3 card in alto + una tabella ROI:

**Card in alto:**
- 💰 Investimento Setup: `€1.500` (se presente, altrimenti nascosta)
- 📅 Fee Mensile Totale: `€800 + 10% = €1.180/mese`
- ⏱️ Break-even: `X mesi`

**Tabella ROI:**
| | Anno 1 | Anno 2 | Anno 3 |
|---|---|---|---|
| Revenue aggiunto | €X | €X | €X |
| Costo servizio | €X | €X | €X |
| **ROI netto** | **€X** | **€X** | **€X** |
| **ROI %** | **X%** | **X%** | **X%** |

(Al anno 1 il setup è incluso nel costo, anni 2 e 3 solo fee ricorrenti)

---

## Modifiche tecniche

### File 1: `src/components/AdminSurvey.tsx`

**Aggiornare `AdminFormData`** con 4 nuovi campi:
```typescript
showInvestment: boolean;        // toggle: mostrare sezione investimento?
setupFee: string;               // € una-tantum (opzionale)
monthlyFixed: string;           // € fisso mensile (opzionale)
monthlyPercent: string;         // % del fatturato email mensile (opzionale)
```

**Nuovo step 12 — "💼 Impostazioni Investimento"** inserito tra step 11 (scenari) e il bottone Genera:
- Toggle/Switch ON/OFF "Mostrare sezione investimento nel report?"
- Se ON: appaiono i 3 campi facoltativi (Setup, Fisso mensile, % mensile)
- Preview in tempo reale: mostra fee mensile totale calcolata usando i valori già inseriti
- Ogni campo ha un'etichetta chiara e un placeholder

**Aggiornare `handleRestart`** per resettare i nuovi campi.

**Aggiornare `handleGenerate`** per passare i dati di investimento al componente AdvancedReport via prop.

**Nel render del report** (`if (report) { ... }`): passare `investmentData` come prop a `AdvancedReportComponent`.

---

### File 2: `src/components/AdvancedReport.tsx`

**Aggiungere prop opzionale `investmentData`:**
```typescript
interface InvestmentData {
  show: boolean;
  setupFee: number;
  monthlyFixed: number;
  monthlyPercent: number;       // % da applicare
  monthlyEmailRevenue: number;  // per calcolare la quota %
}
```

**Calcoli derivati** (all'interno del componente):
```typescript
const monthlyPercentFee = investmentData.monthlyEmailRevenue * (investmentData.monthlyPercent / 100);
const totalMonthlyFee = investmentData.monthlyFixed + monthlyPercentFee;
const annualRevAdded = report.yearlyPotential; // scenarios.moderate.value × 12
const annualCostY1 = investmentData.setupFee + (totalMonthlyFee * 12);
const annualCostY2 = totalMonthlyFee * 12;
const netRoiY1 = annualRevAdded - annualCostY1;
const netRoiY2 = annualRevAdded - annualCostY2;
const roiPctY1 = annualCostY1 > 0 ? (netRoiY1 / annualCostY1) * 100 : 0;
const roiPctY2 = annualCostY2 > 0 ? (netRoiY2 / annualCostY2) * 100 : 0;
const breakEvenMonths = (annualRevAdded / 12 - totalMonthlyFee) > 0
  ? Math.ceil(investmentData.setupFee / (annualRevAdded / 12 - totalMonthlyFee))
  : null; // infinito se fee > revenue
```

**Posizione nel report**: dopo "Potenziale Economico Annuo" e prima di "Download PDF", resa condizionale a `investmentData?.show === true`.

**La sezione è visivamente distinta** con bordo e sfondo verde/teal per indicare valore aggiunto.

---

## Posizione step nel quiz admin (aggiornato)

```
Step 0:  Settore
Step 1:  Sito web
Step 2:  Fatturato mensile
Step 3:  Ads investment
Step 4:  % email
Step 5:  Lista
Step 6:  AOV
Step 7:  Frequenza
Step 8:  Automazioni
Step 9:  Obiettivo
Step 10: Nome cliente
Step 11: ⚙️ Scenari (%)
► Step 12: 💼 Investimento & ROI  ← NUOVO
           → [📊 Genera Report]
```

---

## Posizione nel report generato

```
[Email Health Score]
[Analisi Strategica]
[Situazione Attuale vs Benchmark]
[Analisi Automazioni]
[Scenari di Crescita]
[📬 Forecast Lista]
[🎯 Top 3 Azioni]
[💰 Potenziale Annuo Totale]
► [💼 Investimento & ROI]  ← NUOVO (solo se abilitato)
[Download PDF]
[Prenota Consulenza]
```

---

## Ricalcolo dinamico

Poiché i valori dello step Investimento sono inseriti prima di premere "Genera Report", al momento della generazione tutto è già disponibile. Il ricalcolo dinamico si ha già nello **step 12 stesso**: una preview in tempo reale mostra fee mensile e break-even approssimativi man mano che l'utente modifica i campi, usando i valori già inseriti nei passi precedenti.

Questo è completamente **client-side** — nessuna modifica al database richiesta.

---

## File modificati

| File | Modifica |
|---|---|
| `src/components/AdminSurvey.tsx` | Nuovo step 12, 4 nuovi campi formData, reset, prop al report |
| `src/components/AdvancedReport.tsx` | Nuova sezione condizionale "Investimento & ROI", prop `investmentData` |

Nessun nuovo file. Nessuna modifica al database.
