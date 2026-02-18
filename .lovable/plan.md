
# Piano: AOV reale + Link condivisibile + % Potenziale personalizzabile + Totali dinamici

## Riepilogo delle 4 funzionalità

1. **AOV reale nel quiz admin** — step aggiuntivo per inserire il ticket medio in €
2. **% scenari personalizzabili** — step "Impostazioni Report" con slider per conservativo/moderato/aggressivo
3. **Link report condivisibile** — salvataggio su DB + pulsante "📋 Copia link" nella barra admin
4. **Totali generici dinamici** — quando si cambiano le % degli scenari, si ricalcolano anche `yearlyPotential` e le metriche mostrate nel banner finale

---

## Come funzionano i totali generici legati alle %

Attualmente `yearlyPotential` è calcolato così in `_calculateReport`:
```
yearlyPotential = (revenueGap + totalFlowGap) * 12
```

Questo valore è indipendente dagli scenari. Il collegamento richiesto dall'utente è:

> "al variare delle % di attribuzione del email cambiano anche i totali generici a fine report"

Questo significa che gli scenari non sono solo "aggiuntivi" al reddito attuale, ma rappresentano il **reddito email atteso** dopo l'implementazione. Quindi:
- Il banner "Potenziale Economico Annuo Recuperabile" deve usare lo scenario **moderato** (quello consigliato) come base
- Formula: `yearlyPotential = scenarios.moderate.value * 12` (o un valore calcolato da scenarioOverrides)

Così, se cambio il moderato da 35% a 50%, il banner in fondo cambia da riflettere il nuovo obiettivo. Questo è il comportamento atteso.

---

## Modifiche tecniche

### File 1: `src/lib/reportCalculations.ts`

**Aggiungere parametri opzionali a `calculateAdvancedReportFromValues` e `_calculateReport`:**

```typescript
// Nuovi parametri opzionali
customAOV?: number,
scenarioOverrides?: { conservative: number; moderate: number; aggressive: number }
```

**Nel calcolo `listForecast`**: sostituire `sectorAOV[sector]` con `customAOV ?? sectorAOV[sector]`

**Nel calcolo scenari**: sostituire le costanti hardcodate con i valori degli override se presenti:
```typescript
const conservPct = scenarioOverrides?.conservative ?? 15;
const moderatePct = scenarioOverrides?.moderate ?? 35;
const aggressPct = scenarioOverrides?.aggressive ?? 60;
```

**Nel calcolo `yearlyPotential`**: agganciare allo scenario moderato:
```typescript
// Prima: (revenueGap + totalFlowGap) * 12
// Dopo: scenarios.moderate.value * 12
// (rappresenta il guadagno aggiuntivo atteso con lo scenario consigliato)
```

---

### File 2: `src/components/AdminSurvey.tsx`

**Aggiornare `AdminFormData`:**
```typescript
aov: string;                   // nuovo
scenarioConservative: string;  // default '15'
scenarioModerate: string;      // default '35'
scenarioAggressive: string;    // default '60'
```

**Aggiungere step 6 — AOV** (dopo "Dimensione lista", prima di "Frequenza invio"):
- Input numerico € con placeholder che mostra il benchmark di settore
- Campo opzionale (canProceed: true)
- Mostra il benchmark attuale del settore selezionato come riferimento

**Aggiungere step finale — ⚙️ Impostazioni Report** (prima del bottone Genera Report):
- Tre slider o input numerici (range limitato):
  - Conservativo: 5–30%, default 15%
  - Moderato: 15–60%, default 35%
  - Aggressivo: 30–120%, default 60%
- UI: ogni scenario ha il suo colore (verde/arancione/viola) con il valore in tempo reale

**Aggiornare `handleGenerate`:**
```typescript
const result = calculateAdvancedReportFromValues(
  formData.sector || 'other',
  revenue,
  emailPct,
  list,
  formData.activeFlows,
  formData.sector === 'other' ? formData.customSector : undefined,
  formData.emailFrequency || 'none',
  formData.aov ? parseFloat(formData.aov) : undefined,  // ← customAOV
  {                                                       // ← scenarioOverrides
    conservative: parseFloat(formData.scenarioConservative) || 15,
    moderate: parseFloat(formData.scenarioModerate) || 35,
    aggressive: parseFloat(formData.scenarioAggressive) || 60,
  }
);

// Salva su DB per link condivisibile
const { data: saved } = await supabase
  .from('survey_submissions')
  .insert({
    full_name: formData.clientName || 'Report Admin',
    email: `admin-${Date.now()}@interno.mailift`,
    phone: null,
    sector: formData.sector,
    website: formData.website || null,
    report_data: { clientReport: result },
    email_health_score: result.emailHealthScore,
    yearly_potential: result.yearlyPotential,
    qualified: false,
    status: 'admin_report'
  })
  .select('id')
  .single();

setReportId(saved?.id ?? null);
setReport(result);
```

**Aggiungere stato `reportId` e `copied`:**
```typescript
const [reportId, setReportId] = useState<string | null>(null);
const [copied, setCopied] = useState(false);
```

**Aggiornare la barra admin post-report:**
```tsx
// Pulsante Copia link accanto a "Nuovo report"
<button onClick={handleCopyLink}>
  {copied ? '✅ Link copiato!' : '📋 Copia link'}
</button>
```

---

### File 3: `src/components/AdvancedReport.tsx`

**Card AOV nel listForecast** — aggiungere prop `isCustomAov` e label dinamica:
- Se `customAOV` è stato passato: mostrare "AOV Reale Cliente" (testo bianco)
- Altrimenti: "AOV Stimato Settore" (testo arancione)

Per riconoscere se l'AOV è custom o benchmark, aggiungo un campo opzionale `isCustomAov: boolean` nell'oggetto `listForecast` del tipo `AdvancedReport`.

---

## Flusso admin aggiornato

```text
Step 0:  Settore e-commerce
Step 1:  Sito web (facoltativo)
Step 2:  Fatturato mensile (input libero €)
Step 3:  Investimento Ads
Step 4:  % fatturato da email (input libero %)
Step 5:  Dimensione lista (input libero #)
Step 6:  AOV reale (input libero €) ← NUOVO
Step 7:  Frequenza invio
Step 8:  Automazioni attive
Step 9:  Obiettivo cliente
Step 10: Nome cliente (facoltativo)
Step 11: ⚙️ Impostazioni Report (3 slider %) ← NUOVO
         → [📊 Genera Report]
```

---

## Salvataggio DB per link condivisibile

La tabella `survey_submissions` già accetta INSERT pubblici (RLS policy "Allow public inserts" con `WITH CHECK: true`). Il record viene inserito con:
- `full_name`: nome cliente o "Report Admin"
- `email`: `admin-{timestamp}@interno.mailift` (univoca, non reale)
- `status`: `'admin_report'` (distinguibile dai lead reali)
- `qualified`: `false` (non appare nei lead)
- `report_data`: `{ clientReport: result }`

L'ID generato costruisce il link: `https://quiz-to-customer.lovable.app/report/{id}`

La pagina `/report/:id` già legge `report_data.clientReport` tramite RPC — funziona senza modifiche.

---

## Impatto sui totali a fine report

Con `yearlyPotential = scenarios.moderate.value * 12`:

| Scenario moderato impostato | Banner "Potenziale Annuo" |
|---|---|
| 35% (default) | `currentEmailRevenue × 0.35 × 12` |
| 50% (personalizzato) | `currentEmailRevenue × 0.50 × 12` |
| 20% (conservativo) | `currentEmailRevenue × 0.20 × 12` |

Il banner cambia in modo coerente con le scelte fatte nello step impostazioni.

---

## File modificati

| File | Tipo modifica |
|---|---|
| `src/lib/reportCalculations.ts` | Parametri `customAOV`, `scenarioOverrides`, ricalcolo `yearlyPotential` |
| `src/components/AdminSurvey.tsx` | 2 nuovi step, stato `reportId`, salvataggio DB, pulsante copia link |
| `src/components/AdvancedReport.tsx` | Label AOV dinamica (reale vs stimato) |

Nessun nuovo file. Nessuna modifica al DB (la tabella `survey_submissions` è già compatibile).
