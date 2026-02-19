
# Due funzionalità: Admin Report History + Pannello "What-if" nel Link Condiviso

## Analisi della richiesta

L'utente vuole due cose distinte:

### 1. Report Salvati → apertura con feature admin complete
Attualmente, cliccando "Apri" in AdminReportHistory, si va su `/report/:id` che è la **vista cliente** (senza barra admin, senza pulsante "Copia link", senza sezione investimento interattiva). L'admin vuole vedere il report con tutto il contesto admin attivo.

### 2. Link condiviso → pannello "What-if" per modificare i dati input
Nel link condivisibile `/report/:id`, aggiungere una **sezione interattiva** (visibile solo a chi conosce l'URL admin) dove si possono modificare i parametri chiave del report (fatturato, % email, lista, ecc.) e vedere in tempo reale come cambierebbero i numeri, senza sovrascrivere il report originale.

---

## Soluzione architetturale

### Problema 1: Aprire i report salvati in modalità admin

Soluzione: nella `AdminReportHistory`, invece di aprire il link esterno `/report/:id`, **navigare internamente** verso una vista admin che carica il report dal DB e lo mostra con `<AdminSurvey>` in modalità "view" con la barra admin attiva.

Questo si fa aggiungendo alla `AdminReportHistory` un callback `onOpenReport(id: string)` che viene gestito da `AdminSurvey` per fetchare il report dal DB e mostrarlo in modalità admin — con lo stesso wrapper che usa dopo `handleGenerate`.

Il flusso diventa:
```
AdminReportHistory → clicca "Apri" → AdminSurvey carica report da DB via get_report_by_id
                                    → mostra AdvancedReportComponent + barra admin (copia link, nuovo report, ecc.)
```

Questo è sicuro perché: `get_report_by_id` è una funzione SECURITY DEFINER che non espone PII. Il report viene caricato dall'interno dell'area admin autenticata.

### Problema 2: Pannello "What-if" nel link condiviso

Soluzione: aggiungere al `Report.tsx` (la pagina del link condiviso) e a `AdvancedReport.tsx` un **pannello collassabile "Simula modifiche"** (drawer/sidebar), nascosto di default, con un pulsante flottante per aprirlo.

Il pannello mostra gli stessi input dell'admin form (fatturato, % email, lista, flussi, popup) e ricalcola il report **in memoria** senza salvare, aggiornando la vista in tempo reale.

Per rendere il pannello accessibile solo a chi sa che esiste (non è la vista cliente standard), il pulsante di attivazione sarà discreto — un piccolo bottone "⚙️ Simula" nell'angolo in basso a destra del report.

---

## Implementazione dettagliata

### File 1: `src/components/AdminReportHistory.tsx`

Modifiche:
- Aggiungere prop `onOpenReport?: (id: string, report: ReportData) => void`
- Il pulsante "Apri" ora chiama `onOpenReport` passando l'id
- Il fetch della card includerà anche `report_data` completo per ricostruire il report
- Se `onOpenReport` non è definito (uso standalone), fallback al comportamento attuale (link esterno)

```
ReportCard:
  [Apri in Admin ↗]  ← chiama onOpenReport(id) → AdminSurvey carica il report
  [Copia link    📋]  ← copia URL come prima
```

### File 2: `src/components/AdminSurvey.tsx`

Aggiungere stato `viewingReportId` e la funzione `handleOpenSavedReport(id)`:

```typescript
const handleOpenSavedReport = async (id: string) => {
  // Fetch del report via get_report_by_id RPC
  const { data } = await supabase.rpc('get_report_by_id', { report_id: id });
  if (data?.clientReport) {
    setReport(data.clientReport);
    setReportId(id);
    // Ripopola formData dal meta se disponibile
    if (data.meta) {
      setFormData(prev => ({
        ...prev,
        clientName: data.meta.clientName || '',
        website: data.meta.website || '',
        showInvestment: data.meta.showInvestment || false,
      }));
    }
  }
};
```

Passare `onOpenReport={handleOpenSavedReport}` alla `AdminReportHistory`.

Nota: il report viene mostrato con la barra admin già attiva (copia link, "Nuovo report"), perché la condizione `if (report)` si attiva.

### File 3: `src/components/AdvancedReport.tsx` + `src/pages/Report.tsx`

Aggiungere un **pannello "What-if" collassabile** che permette di:
- Modificare i dati di input: fatturato mensile, % email, dimensione lista, flussi attivi, AOV, scenari
- Ricalcolare il report in memoria tramite `calculateAdvancedReportFromValues`
- Mostrare il risultato **sostituendo** il report corrente nella vista

Il pannello è un drawer/overlay laterale o una sezione espandibile in fondo al report.

**Struttura del pannello:**

```
┌─────────────────────────────────────────────┐
│  ⚙️  Simula modifiche ai dati               │
│  ─────────────────────────────────────────  │
│  💶 Fatturato mensile:  [_______] €         │
│  📧 % da email:         [_______] %         │
│  👥 Lista iscritti:     [_______]            │
│  📊 Flussi attivi: [✓] Carrello [✓] Welcome │
│  🏷️ AOV personalizzato: [_______] €         │
│  ─────────────────────────────────────────  │
│  Scenario Moderato:   [====] 35%            │
│  ─────────────────────────────────────────  │
│  [Ricalcola report]   [Ripristina originale]│
└─────────────────────────────────────────────┘
```

Il pannello è attivato da un pulsante flottante `⚙️ Simula` in basso a destra.

**Logica di stato in `AdvancedReport.tsx`:**

```typescript
// Dati originali del report (fissi)
const [originalReport] = useState(report);
// Dati modificati (null = usa originale)
const [simulatedReport, setSimulatedReport] = useState<AdvancedReport | null>(null);
const [showSimPanel, setShowSimPanel] = useState(false);

// Dati di input per la simulazione
const [simInputs, setSimInputs] = useState({
  monthlyRevenue: report.monthlyRevenue,
  emailPct: report.currentEmailPercent,
  listSize: report.listSize,
  activeFlows: [], // ricostruire dal report
  scenario: { conservative: 15, moderate: 35, aggressive: 60 }
});

const activeReport = simulatedReport ?? originalReport;
```

Il componente usa `activeReport` invece di `report` per tutti i calcoli e la visualizzazione.

---

## Struttura dello stato nel componente AdvancedReport

Il pannello "Simula" sarà integrato direttamente in `AdvancedReport.tsx` come:
- Props aggiuntive: `isAdminMode?: boolean` (per mostrare il pulsante Simula anche nella vista condivisa)
- Il pulsante ⚙️ è visibile sempre nel link condiviso (il pannello è discreto, non rivela nulla di riservato)

In `Report.tsx`:
```tsx
<AdvancedReportComponent
  report={reportData.clientReport}
  userName={reportData.meta?.clientName || ''}
  website={reportData.meta?.website || ''}
  investmentData={...}
  onRestart={...}
  isAdminMode={true}  // ← sempre true nel link condiviso per abilitare Simula
/>
```

---

## Dati da salvare nel meta per la ricostruzione

Attualmente `meta` salva: `{ showInvestment, clientName, website }`.

Per poter ripopolare i campi del form quando l'admin apre un report salvato, aggiungere al salvataggio DB:

```typescript
meta: {
  showInvestment: fd.showInvestment,
  clientName: fd.clientName || '',
  website: fd.website || '',
  // Nuovi campi per ricostruzione
  sector: fd.sector,
  monthlyRevenue: parseFloat(fd.monthlyRevenue) || 0,
  emailPct: parseFloat(fd.emailRevenuePercentage) || 0,
  listSize: parseFloat(fd.listSize) || 0,
  activeFlows: fd.activeFlows,
  aov: fd.aov ? parseFloat(fd.aov) : undefined,
  emailFrequency: fd.emailFrequency,
  scenarioConservative: parseFloat(fd.scenarioConservative) || 15,
  scenarioModerate: parseFloat(fd.scenarioModerate) || 35,
  scenarioAggressive: parseFloat(fd.scenarioAggressive) || 60,
  hasPopup: fd.hasPopup,
  popupConversionRate: parseFloat(fd.popupConversionRate) || 0,
  monthlyVisitors: parseFloat(fd.monthlyVisitors) || 0,
  monthlyListGrowthRate: parseFloat(fd.monthlyListGrowthRate) || 2,
}
```

Questo meta viene già passato dalla `get_report_by_id` RPC (che include il campo `meta` nel ritorno).

---

## Riepilogo file modificati

| File | Modifica |
|---|---|
| `src/components/AdminReportHistory.tsx` | Aggiunge prop `onOpenReport`, il pulsante "Apri" chiama il callback invece di aprire link esterno |
| `src/components/AdminSurvey.tsx` | Aggiunge `handleOpenSavedReport` con fetch via RPC, popola `report` + `reportId` + `formData` dal meta salvato |
| `src/components/AdminSurvey.tsx` | `saveReportToDb` salva anche i dati di input nel meta per ricostruzione |
| `src/components/AdvancedReport.tsx` | Aggiunge pannello "Simula modifiche" con inputs, ricalcolo in-memory, pulsante flottante |
| `src/pages/Report.tsx` | Passa `isAdminMode={true}` per abilitare il pannello Simula nel link condiviso |

Nessuna migrazione DB. Nessuna modifica RLS. Nessun nuovo endpoint.
