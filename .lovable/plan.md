

## Aggiornamento Drop-off Analytics: Quiz v3 + tempo di completamento

### 1. Aggiungere Quiz v3 (versione attuale, 12 step)

Il quiz è cambiato di nuovo: ora ha **12 step** e parte da `companyName` (nuovo: chiediamo il brand all'inizio). Aggiungo una nuova entry `v3` nell'array `VERSIONS` di `src/components/DropoffAnalytics.tsx`:

- **id**: `v3`
- **label**: `Quiz v3 (attuale)`
- **detectFn**: `row.total_steps === 12`
- **stepOrder** (12 step nell'ordine reale del codice):
  1. `companyName` → "Brand"
  2. `website` → "Sito Web"
  3. `sector` → "Settore"
  4. `monthlyRevenue` → "Fatturato"
  5. `platform` → "Piattaforma"
  6. `emailTool` → "Email Tool"
  7. `emailRevenuePercentage` → "Revenue Email"
  8. `activeFlows` → "Automazioni"
  9. `segmentation` → "Segmentazione"
  10. `emailFrequency` → "Frequenza"
  11. `listSize` → "Lista Email"
  12. `motivation` → "Obiettivo"

Aggiorno anche `v2 (precedente)` invece di "attuale" nella label, e imposto `v3` come tab di default selezionato.

### 2. Aggiungere metrica "Tempo di completamento"

Sfrutto `started_at` e `updated_at` (già presenti su `partial_submissions`) per calcolare la durata di ogni sessione. Aggiungo alla query: `started_at, updated_at`.

**Nuove statistiche per versione**, calcolate solo sulle sessioni `completed=true`:
- **Tempo medio** (mean)
- **Tempo mediano** (median, più resistente agli outlier)
- **Tempo più veloce** / **più lento** (min/max)

Filtro outlier: ignoro durate < 10 secondi (bot/test) e > 30 minuti (sessioni lasciate aperte).

### 3. UI: nuova card "⏱ Tempo di completamento"

Sotto la card "Sessioni totali / Completate / Tasso completamento", aggiungo una **seconda riga di 4 mini-stat card**:

```
[ ⏱ Medio: 2m 45s ] [ Mediano: 2m 30s ] [ Più veloce: 1m 12s ] [ Più lento: 8m 04s ]
```

Stesso stile delle card esistenti (`bg-slate-800`, `rounded-xl`, etichetta piccola sopra in `text-slate-400 text-xs`, valore grande sotto). Helper `formatDuration(ms)` che restituisce `"2m 45s"` o `"45s"` se < 1 min.

### File modificato
- `src/components/DropoffAnalytics.tsx` (unico file)

### Cosa NON cambia
- Schema DB, hook `usePartialTracking`, RLS, edge functions
- Logica del quiz e ordine domande
- Layout generale del pannello admin (filtri periodo, funnel, tabs versione)

