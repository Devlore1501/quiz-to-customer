
# Verifica: Sezioni mancanti nel Report Condivisibile URL

## Problema identificato

Dopo un'analisi completa del codice, ho trovato **due gap distinti** tra il report admin e il report condivisibile via URL.

### Gap 1 — Sezione "Investimento & ROI" non appare mai nel link

Il componente `AdvancedReportComponent` accetta la prop `investmentData` che controlla se mostrare la sezione Investimento & ROI (con tabella ROI 3 anni, break-even, fee input).

- In `AdminSurvey.tsx` (riga 853-860): `investmentData` viene passato correttamente con `show: true/false`
- In `Report.tsx` (riga 110-113): `investmentData` **non viene passato** → la sezione non appare mai

Il dato `showInvestment` però non è nemmeno salvato nel DB — viene salvato solo il risultato dei calcoli (`AdvancedReport`), non le impostazioni del form admin.

### Gap 2 — Nome cliente e sito web non appaiono nel link condivisibile

- `userName` e `website` non vengono passati a `AdvancedReportComponent` in `Report.tsx`
- Tuttavia `website` è già salvato nel DB nella colonna `website` della tabella `survey_submissions`, ma il campo `clientName` non è mai salvato nel DB separatamente (solo come `full_name`)

### Gap 3 — La nota esplicativa CR 2% nella tabella Forecast non è aggiornata

La nota sotto la tabella Forecast (riga 493 in `AdvancedReport.tsx`) dice ancora:
```
"CR 2% per automazioni"
```
Mentre la formula reale aggiornata usa il CR dinamico (0.3%–1.0%). Non è un gap del link, ma un'incoerenza testuale visibile sia nel link che nell'admin.

---

## Soluzione

### Fix 1 — Salvare `showInvestment`, `clientName` e `website` nell'oggetto `report_data`

Attualmente `report_data` nel DB contiene solo `{ clientReport: AdvancedReport }`. Bisogna estenderlo per includere le impostazioni admin:

```typescript
report_data: {
  clientReport: result,
  meta: {
    showInvestment: formData.showInvestment,
    clientName: formData.clientName || '',
    website: formData.website || '',
  }
}
```

Questo modo è retrocompatibile — i record vecchi semplicemente non hanno `meta`, e il link li visualizzerà senza quelle sezioni (comportamento già esistente).

### Fix 2 — Leggere i metadati in `Report.tsx` e passarli al componente

Aggiornare l'interfaccia `ReportData` per includere `meta` (opzionale):

```typescript
interface ReportData {
  clientReport: AdvancedReport;
  meta?: {
    showInvestment?: boolean;
    clientName?: string;
    website?: string;
  };
}
```

E nel render del componente:

```typescript
<AdvancedReportComponent
  report={reportData.clientReport}
  userName={reportData.meta?.clientName || ''}
  website={reportData.meta?.website || ''}
  investmentData={
    reportData.meta?.showInvestment
      ? { show: true, currentEmailRevenue: reportData.clientReport.currentEmailRevenue }
      : undefined
  }
  onRestart={() => window.location.href = '/'}
/>
```

### Fix 3 — Aggiornare la nota CR nella tabella Forecast

Cambiare il testo fisso "CR 2% per automazioni" con il testo corretto che riflette il CR dinamico.

---

## Riepilogo delle sezioni del report e stato attuale

| Sezione | Admin | Link condivisibile | Dopo fix |
|---|---|---|---|
| Email Health Score | ✅ | ✅ | ✅ |
| Analisi Strategica | ✅ | ✅ | ✅ |
| Situazione Attuale vs Benchmark | ✅ | ✅ | ✅ |
| Analisi Automazioni | ✅ | ✅ | ✅ |
| Scenari di Crescita | ✅ | ✅ | ✅ |
| Forecast Lista (tabella) | ✅ | ✅ | ✅ |
| Popup & Crescita Lista | ✅ (se attivo) | ✅ (se attivo) | ✅ |
| Roadmap 3 Azioni Prioritarie | ✅ | ✅ | ✅ |
| Potenziale Annuo (banner) | ✅ | ✅ | ✅ |
| **Investimento & ROI** | ✅ (se attivato) | ❌ manca sempre | ✅ dopo fix |
| **Nome cliente nell'header** | ✅ | ❌ non visualizzato | ✅ dopo fix |
| **Sito web nell'header** | ✅ | ❌ non visualizzato | ✅ dopo fix |
| Download PDF | ✅ | ✅ | ✅ |
| Calendario prenotazione | ✅ | ✅ | ✅ |

---

## File modificati

| File | Modifica |
|---|---|
| `src/components/AdminSurvey.tsx` | Aggiunta `meta` nell'oggetto `report_data` salvato su DB |
| `src/pages/Report.tsx` | Lettura `meta` e passaggio corretto di tutte le props al componente |
| `src/components/AdvancedReport.tsx` | Fix testo nota CR nella tabella Forecast (da "2%" a "CR dinamico") |

Nessuna migrazione DB — l'aggiunta di `meta` è un campo JSON opzionale, retrocompatibile con i record già esistenti.
