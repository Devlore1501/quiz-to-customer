
# Piano: AOV reale + Link condivisibile + % Potenziale personalizzabile

## Le tre funzionalità

### 1. Campo AOV reale nel quiz admin
Aggiungere uno step nel quiz `AdminSurvey.tsx` dove inserire l'AOV esatto del cliente in €. Questo valore viene passato a `calculateAdvancedReportFromValues()` e usato **al posto** del benchmark di settore nel calcolo del `listForecast`. La card "AOV Stimato Settore" nel report mostrerà il valore reale inserito e non conterrà più la dicitura "Stimato".

### 2. Link report condivisibile (Admin)
Quando si clicca "Genera Report" in modalità admin, il report viene salvato nel database (nella tabella `survey_submissions` esistente, con un record minimale senza dati di contatto) e viene generato un link `/report/:id` condivisibile. Nella barra in cima al report (quella con "🔒 Admin Mode" e "Nuovo report") appare un pulsante "📋 Copia link" che copia l'URL negli appunti.

La pagina `/report/:id` esistente legge già il report dal DB e lo visualizza — quindi funziona già senza modifiche.

**Come viene salvato senza dati personali**: il record viene inserito con campi obbligatori minimi (`full_name = "Admin Report"`, `email = "admin@interno"`, `phone = null`) e il `report_data` contenente il report completo. L'ID generato diventa l'URL condivisibile.

### 3. Impostazione % potenziale personalizzabile
Nell'ultimo step del quiz admin (prima di "Genera Report"), aggiungere uno step **"Impostazioni Report"** con tre slider/input per definire manualmente le percentuali di crescita degli scenari:
- Conservativo: default 15% (range 5-30%)
- Moderato: default 35% (range 15-60%)
- Aggressivo: default 60% (range 30-120%)

Questi valori vengono passati a `_calculateReport()` per sovrascrivere i valori fissi hardcodati.

---

## Modifiche tecniche

### `src/lib/reportCalculations.ts`
- Aggiungere parametro opzionale `customAOV?: number` a `calculateAdvancedReportFromValues()` e `_calculateReport()`
- Se `customAOV` è presente, usarlo al posto di `sectorAOV[sector]` nel calcolo `listForecast`
- Aggiungere parametro opzionale `scenarioOverrides?: { conservative: number; moderate: number; aggressive: number }` a `_calculateReport()`
- Se presenti, sostituire i valori hardcodati 15/35/60 degli scenari di crescita

### `src/components/AdminSurvey.tsx`

**Aggiungere 2 nuovi step:**

**Step 6b — AOV (dopo "Dimensione lista", prima di "Frequenza invio")**:
```
💶 Valore medio ordine (AOV)
Inserisci il ticket medio degli ordini del cliente.
[Input numerico €] → default benchmark settore mostrato come placeholder
```

**Nuovo step finale — ⚙️ Impostazioni Report** (dopo "Nome cliente"):
```
Tre slider o input per % crescita scenari:
• Conservativo: [  15 ]%
• Moderato:     [  35 ]%
• Aggressivo:   [  60 ]%
```

**Aggiornare `AdminFormData`**:
```typescript
aov: string;                   // nuovo
scenarioConservative: string;  // nuovo (default '15')
scenarioModerate: string;      // nuovo (default '35')
scenarioAggressive: string;    // nuovo (default '60')
```

**Aggiornare `handleGenerate()`**:
- Passare `customAOV` a `calculateAdvancedReportFromValues()`
- Passare `scenarioOverrides` a `calculateAdvancedReportFromValues()`
- **Salvare il report su DB** e ottenere l'ID
- Aggiornare `setReport()` + `setReportId()` (nuovo stato)

### `src/components/AdvancedReport.tsx`
- Nella card AOV: se il valore usato è custom (non benchmark), mostrare "AOV Reale Cliente" invece di "AOV Stimato Settore"
- Aggiungere prop opzionale `reportUrl?: string` per il link condivisibile (non serve — il link viene gestito in `AdminSurvey`)

### `src/components/AdminSurvey.tsx` — barra admin post-report
Aggiungere stato `reportId` e pulsante "📋 Copia link" che esegue:
```typescript
const url = `https://quiz-to-customer.lovable.app/report/${reportId}`;
navigator.clipboard.writeText(url);
```
Con feedback visivo (testo che cambia in "✅ Link copiato!" per 2 secondi).

---

## Flusso completo admin aggiornato

```text
0. Settore
1. Sito web (facoltativo)
2. Fatturato mensile (input libero)
3. Investimento Ads
4. % fatturato da email (input libero)
5. Dimensione lista (input libero)
►  6. AOV reale (input libero €)  ← NUOVO
7. Frequenza invio
8. Automazioni attive
9. Obiettivo cliente
10. Nome cliente (facoltativo)
►  11. Impostazioni Report (% scenari) ← NUOVO
    → [Genera Report]
```

---

## Salvataggio su DB per link condivisibile

Il record viene creato con:
```typescript
{
  full_name: formData.clientName || 'Report Admin',
  email: `admin-${Date.now()}@interno.mailift`,  // email univoca non reale
  phone: null,
  sector: formData.sector,
  website: formData.website || null,
  report_data: { clientReport: result, ... },
  email_health_score: result.emailHealthScore,
  yearly_potential: result.yearlyPotential,
  qualified: false,  // non è un lead pubblico
  status: 'admin_report'
}
```

Il `id` generato viene usato per costruire il link `/report/:id`.

La pagina `/report/:id` esistente legge già `report_data.clientReport` dal DB — quindi il report condiviso funzionerà automaticamente senza toccare `Report.tsx`.

---

## File modificati

| File | Tipo modifica |
|---|---|
| `src/lib/reportCalculations.ts` | Parametri `customAOV` e `scenarioOverrides` |
| `src/components/AdminSurvey.tsx` | 2 nuovi step, salvataggio DB, pulsante link |
| `src/components/AdvancedReport.tsx` | Label AOV dinamica (reale vs stimato) |
