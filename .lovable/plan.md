
# Fix: Sezione Popup & Crescita Lista mancante nel report condivisibile

## Diagnosi completa

Analizzando il database e il codice, ho identificato **due bug distinti** che si combinano:

### Bug 1 — `newSubscribersPerMonth = 0` quando `conversionRate` non è inserito

Nel form admin, l'admin può selezionare solo il `monthlyListGrowthRate` (es. 5%) senza necessariamente inserire `monthlyVisitors` e `popupConversionRate`. In questo caso:

```
newSubscribersPerMonth = Math.round(0 * 0) = 0
```

Quindi tutta la revenue popup è zero, ma il dato salvato nel DB mostra `hasPopup: true` con `conversionRate: 0`. Nel report condivisibile la sezione viene renderizzata (perché `hasPopup: true`), ma con tutti i numeri a zero — completamente inutile.

**Soluzione**: quando `conversionRate = 0` ma `monthlyListGrowthRate > 0`, calcolare i `newSubscribersPerMonth` direttamente dal tasso di crescita sulla lista:
```
newSubscribersPerMonth = Math.round(listSize * (monthlyListGrowthRate / 100))
```

Questo è il comportamento corretto: se il tasso di crescita è 5%, su una lista da 12.000 iscritti → 600 nuovi/mese.

### Bug 2 — Nel link condivisibile, il Forecast Lista mostra dati del vecchio CR 2%

I report salvati nel DB prima del fix del CR dinamico hanno ancora `automationRevenue` calcolato con CR 2% (es. `55.200€/mese` per lista da 12.000 e AOV 230€ → `12.000 × 0.02 × 230 = 55.200€`). Il link condivisibile mostra questi valori salvati, non ricalcola.

Questo non è risolvibile senza rigenerare i report (il calcolo è già stato fixato per i nuovi report generati).

---

## Soluzione: Fix nel calcolo dei `newSubscribersPerMonth`

### File 1: `src/lib/reportCalculations.ts`

**Riga 509** — Aggiornare il calcolo dei `newSubscribersPerMonth`:

```typescript
// Calcola nuovi iscritti da popup:
// - Se conversionRate > 0: da visitatori × CR
// - Se conversionRate = 0 ma growthRate > 0: stima da lista × tasso crescita
const fromVisitors = Math.round(popupParams.monthlyVisitors * cr);
const fromGrowthRate = Math.round(listSize * growthRate);
const newSubscribersPerMonth = cr > 0 ? fromVisitors : fromGrowthRate;
```

Questo garantisce che se l'admin inserisce solo il tasso di crescita (es. 5%) senza i visitatori, il sistema stima comunque i nuovi iscritti in modo realistico.

### File 2: `src/components/AdminSurvey.tsx`

**Preview "nuovi iscritti/mese"** (riga 527-530): aggiornare il calcolo del preview inline per mostrare anche la stima da growth rate quando CR = 0:

```tsx
{formData.monthlyListGrowthRate && (
  <div className="bg-teal-900/20 border border-teal-500/30 rounded-xl p-3">
    <p className="text-teal-400 text-sm font-semibold">
      ≈ {
        formData.monthlyVisitors && formData.popupConversionRate
          ? Math.round(parseFloat(formData.monthlyVisitors) * (parseFloat(formData.popupConversionRate) / 100)).toLocaleString('it-IT')
          : Math.round(parseFloat(formData.listSize || '3000') * (parseFloat(formData.monthlyListGrowthRate) / 100)).toLocaleString('it-IT')
      } nuovi iscritti/mese
    </p>
    <p className="text-teal-400/60 text-xs mt-0.5">
      {!formData.popupConversionRate ? 'stimati da tasso crescita lista' : 'dal popup'}
    </p>
  </div>
)}
```

### File 3: `src/components/AdminSurvey.tsx` — fix condizione preview

Attualmente il preview (riga 527) mostra solo se **entrambi** `monthlyVisitors` e `popupConversionRate` sono inseriti. Cambiare la condizione per mostrarlo anche con solo il growth rate:

```tsx
// Prima:
{formData.monthlyVisitors && formData.popupConversionRate && (

// Dopo:
{(formData.monthlyVisitors && formData.popupConversionRate) || formData.monthlyListGrowthRate ? (
```

---

## Flusso dati corretto dopo il fix

```text
Admin inserisce popup attivo + growth rate 5% (senza visitatori/CR)
       ↓
newSubscribersPerMonth = listSize × 5% = 12.000 × 5% = 600/mese
       ↓
revenueWelcome12m  = 600 × AOV × 5% × 12  = Welcome flow
revenueRecovery12m = 600 × AOV × 3% × 12  = Recuperi carrello
revenueAutomation12m = 600 × AOV × CR_dinamico × 12 = Automazioni
       ↓
Sezione Popup nel link condivisibile mostra numeri reali, non zero
```

---

## File modificati

| File | Modifica |
|---|---|
| `src/lib/reportCalculations.ts` | Fix calcolo `newSubscribersPerMonth`: fallback su `listSize × growthRate` quando `conversionRate = 0` |
| `src/components/AdminSurvey.tsx` | Aggiorna condizione e testo preview "nuovi iscritti" nel form popup |

Nessuna migrazione DB. I nuovi report salvati dopo il fix avranno i dati corretti. I record vecchi con `newSubscribersPerMonth: 0` non vengono toccati (sono già stati generati con i parametri che l'admin aveva inserito).
