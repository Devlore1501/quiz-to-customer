
# Piano: Scenari basati su revenueGap + Sezione Popup & Optin

## Due interventi distinti

---

## Intervento 1 — Scenari di crescita basati su revenueGap

### Problema attuale

In `_calculateReport` (righe 316-332 di `reportCalculations.ts`), i 3 scenari usano come base il **fatturato email attuale**:

```typescript
conservative: { value: currentEmailRevenue * (conservPct / 100) }
moderate:     { value: currentEmailRevenue * (moderatePct / 100) }
aggressive:   { value: currentEmailRevenue * (aggressPct / 100) }
```

**Esempio concreto del problema**: cliente con €10.000/mese fatturato, email al 10% = €1.000/mese attuale, benchmark 35% = €3.500/mese. Gap = €2.500/mese.

- Con la logica attuale, scenario moderato al 35%: `€1.000 × 35% = €350/mese` → assurdo
- Con la nuova logica corretta, scenario moderato al 35% del gap: `€2.500 × 35% = €875/mese` di recupero aggiuntivo rispetto all'attuale

**Nuova semantica degli scenari**: le percentuali non sono più "crescita percentuale del fatturato email attuale" ma "**percentuale del gap di fatturato recuperata**".

- Conservativo (15%): recupera il 15% del gap mensile = parte del gap che ci si aspetta di colmare con ottimizzazioni base
- Moderato (35%): recupera il 35% del gap = risultato con flussi chiave + ottimizzazione
- Aggressivo (60%): recupera il 60% del gap = con strategia completa

Questo è perfettamente coerente con `yearlyPotential = revenueGap * 12` già corretto.

### Modifica tecnica

**File: `src/lib/reportCalculations.ts`** — righe 316-332

```typescript
// PRIMA (errato)
value: currentEmailRevenue * (conservPct / 100)

// DOPO (corretto)
value: revenueGap * (conservPct / 100)
```

Stessa logica per tutti e 3 gli scenari.

**Aggiornamento testo descrizione**: le card nel report mostrano `+X%` e il valore mensile. Il `+X%` rimane leggibile perché indica la quota di gap recuperata. Aggiornare le descrizioni in `AdvancedReport.tsx` per chiarire che il valore è il **recupero mensile atteso** (non la crescita totale del fatturato email).

**Aggiornare la preview nello step 11** del quiz admin (righe 568-585 di `AdminSurvey.tsx`), che ora usa la formula sbagliata: `fatturato_email × (scenarioModerate / 100) × 12`. Va aggiornata a: `gap_mensile × (scenarioModerate / 100) × 12`.

---

## Intervento 2 — Nuova sezione Popup & Optin

### Concept

Il popup di raccolta email è uno degli strumenti più impattanti per la crescita della lista. Integrarlo nel report permette di:
1. Analizzare la capacità attuale di acquisire nuovi iscritti via popup
2. Proiettare l'impatto sulla lista nel tempo (crescita iscritti)
3. Integrare la crescita lista nelle metriche predittive del forecast

### Step nel quiz admin: nuovo Step 5b (tra lista e AOV)

Aggiungere **un nuovo step "📊 Popup & Acquisizione Optin"** con questi campi:

| Campo | Tipo | Esempio |
|---|---|---|
| Ha un popup attivo? | Toggle sì/no | Sì |
| Tasso di conversione popup (%) | Input numerico | 3.5% |
| Visitatori mensili sito | Input numerico | 15.000 |
| Tasso crescita lista mensile attuale (%) | Opzione | +2%/mese |

Il tutto opzionale — se saltato, la sezione popup non appare nel report.

### Calcoli derivati dai dati popup

Con i dati inseriti si calcolano:

```
Nuovi iscritti/mese da popup = visitatori × (conversionRate / 100)
Crescita lista a 6 mesi = listSize × (1 + monthlyGrowthRate)^6
Crescita lista a 12 mesi = listSize × (1 + monthlyGrowthRate)^12
Revenue aggiuntiva (12 mesi) = nuovi_iscritti × aov × 0.02 (CR automazioni)
```

### Dove appare nel report

**Nuova sezione "📬 Popup & Crescita Lista"** inserita dopo la sezione "Forecast Lista" e prima di "Top 3 Azioni". Include:

- Card: Nuovi iscritti/mese stimati dal popup
- Card: Crescita lista proiettata a 6 e 12 mesi  
- Card: Revenue aggiuntiva stimata dai nuovi iscritti (12 mesi)
- Nota su come ottimizzare il tasso di conversione popup (benchmark: 3-5%)

### Integrazione nel forecast lista

Nel forecast interattivo, aggiungere una quarta colonna (o riga supplementare) che mostra l'impatto della crescita lista su 12 mesi sulla revenue stimata. Questo collega popup → crescita lista → revenue predittiva in un unico flusso narrativo.

---

## Modifiche tecniche dettagliate

### File 1: `src/lib/reportCalculations.ts`

**Righe 311-332**: aggiornare la formula degli scenari:
```typescript
// Scenari basati su revenueGap (gap mensile tra attuale e benchmark)
const scenarios = {
  conservative: {
    growthPercent: conservPct,
    value: revenueGap * (conservPct / 100),    // ← era currentEmailRevenue
    description: 'Recupero parziale del gap con ottimizzazioni base'
  },
  moderate: {
    growthPercent: moderatePct,
    value: revenueGap * (moderatePct / 100),   // ← era currentEmailRevenue
    description: 'Implementazione flussi chiave + ottimizzazione'
  },
  aggressive: {
    growthPercent: aggressPct,
    value: revenueGap * (aggressPct / 100),    // ← era currentEmailRevenue
    description: 'Recupero significativo con strategia email completa'
  }
};
```

**Aggiungere al tipo `AdvancedReport`** un campo opzionale per i dati popup:
```typescript
popupData?: {
  hasPopup: boolean;
  conversionRate: number;      // %
  monthlyVisitors: number;
  newSubscribersPerMonth: number;
  projectedListSize6m: number;
  projectedListSize12m: number;
  projectedRevenue12m: number;
};
```

**Aggiornare `calculateAdvancedReportFromValues`** con parametri popup opzionali e calcolo del `popupData`.

### File 2: `src/components/AdminSurvey.tsx`

**Aggiungere a `AdminFormData`**:
```typescript
hasPopup: boolean;
popupConversionRate: string;   // %
monthlyVisitors: string;
```

**Nuovo step 6 (inserito dopo lista, prima di AOV)**: "📊 Popup & Acquisizione Optin"
- Toggle "Ha un popup di raccolta email?"
- Se sì: input visitatori mensili e tasso conversione popup
- Preview in tempo reale: "≈ X nuovi iscritti/mese"
- `canProceed: true` (facoltativo)

**Passare i dati popup a `calculateAdvancedReportFromValues`**.

**Aggiornare la preview dello step 11** (Impostazioni Report): usare la formula corretta `gap_mensile × (moderato/100) × 12` invece di `email_attuale × (moderato/100) × 12`.

### File 3: `src/components/AdvancedReport.tsx`

**Nuova sezione "📬 Popup & Crescita Lista"** (condizionale a `report.popupData`), inserita dopo il Forecast lista:
- 3 card: Nuovi iscritti/mese | Lista a 12 mesi | Revenue aggiuntiva/anno
- Tabella proiezione crescita lista: Mese 0, 3, 6, 12
- Nota benchmark popup e-commerce: "Un buon tasso di conversione popup è tra il 3% e il 5%"

**Aggiornare le card scenari** con nuova didascalia: da "% crescita" a "% del gap recuperato" per chiarire la nuova semantica.

**Aggiornare la preview step 11** in `AdminSurvey.tsx`: formula corretta.

---

## Ordine degli step nel quiz (aggiornato)

```
Step 0:  Settore
Step 1:  Sito web
Step 2:  Fatturato mensile
Step 3:  Ads investment
Step 4:  % email
Step 5:  Dimensione lista
► Step 6: 📊 Popup & Optin (NUOVO)
Step 7:  AOV  (era step 6)
Step 8:  Frequenza  (era step 7)
Step 9:  Automazioni  (era step 8)
Step 10: Obiettivo  (era step 9)
Step 11: Nome cliente  (era step 10)
Step 12: ⚙️ Impostazioni Report  (era step 11)
Step 13: 💼 Investimento & ROI  (era step 12)
→ [📊 Genera Report]
```

---

## File modificati

| File | Tipo modifica |
|---|---|
| `src/lib/reportCalculations.ts` | Scenari → `revenueGap × pct`, aggiunta logica popup al tipo e calcolo |
| `src/components/AdminSurvey.tsx` | Nuovo step popup, campi `AdminFormData`, preview step 11 corretta, pass dati popup |
| `src/components/AdvancedReport.tsx` | Nuova sezione popup nel report, aggiornamento etichette scenari |

Nessun nuovo file. Nessuna modifica al database.
