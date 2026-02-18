
# Fix: Revenue Popup — Formula più realistica (5% conversione + recuperi)

## Problema attuale

La formula corrente per la revenue dei nuovi iscritti dal popup usa un CR generico del 2%:

```
projectedRevenue12m = newSubscribersPerMonth × AOV × 0.02 × 12
```

Questo è sbagliato per due motivi:
1. Il 2% è il CR delle automazioni sulla lista esistente, non il comportamento dei nuovi iscritti
2. Ignora la struttura del valore reale: chi si iscrive via popup ha un comportamento diverso — c'è una quota che compra subito (welcome flow), e poi recuperi nel tempo

---

## Nuova logica del calcolo revenue popup

Il valore generato da ogni nuovo iscritto si scompone in tre parti:

| Layer | Logica | CR utilizzato |
|---|---|---|
| Acquisto diretto (welcome) | % di chi compra entro le prime settimane dopo iscrizione | **5%** (come da indicazione) |
| Recuperi carrello + checkout | Chi abbandona dopo aver visitato il sito — già nella pipeline | **3%** (benchmark cart recovery) |
| Automazioni nel tempo (upsell, winback) | Valore residuo generato nel corso dei 12 mesi | **CR dinamico** basato sulle automazioni attive del cliente |

**Formula risultante per i 12 mesi**:
```
Revenue diretta        = newSubscribersPerMonth × AOV × 0.05 × 12  (welcome/primo acquisto)
Revenue recuperi       = newSubscribersPerMonth × AOV × 0.03 × 12  (cart + checkout recovery)
Revenue automazioni    = newSubscribersPerMonth × AOV × automationCR × 12
─────────────────────────────────────────────────────────────────────
projectedRevenue12m    = somma dei tre layer
```

**Esempio concreto** (500 nuovi iscritti/mese, AOV €80, 3 automazioni attive → CR 0.5%):
- Welcome: `500 × €80 × 5% × 12 = €24.000`
- Recuperi: `500 × €80 × 3% × 12 = €14.400`
- Automazioni: `500 × €80 × 0.5% × 12 = €2.400`
- **Totale: €40.800/anno** (vs i ~€9.600 precedenti, che erano sia troppo bassi che basati sulla logica sbagliata)

---

## Dove viene mostrato il valore

1. **Card "💰 Revenue aggiuntiva"** nella sezione Popup & Crescita Lista — mostra `projectedRevenue12m`
2. **Breakdown dettagliato** — aggiungere sotto la card i tre layer separati, così il cliente capisce come si compone il numero
3. **PDF** — si aggiorna automaticamente leggendo `report.popupData.projectedRevenue12m`

---

## Aggiungere anche breakdown visivo nella card Revenue

La card verde "Revenue aggiuntiva" attualmente mostra solo il totale. Aggiungiamo tre righe breakdown sotto il numero:

```
💰 Revenue aggiuntiva    €40.800
                        ─────────────────────────────
                        🎁 Welcome (5% CR):   €24.000
                        🛒 Recuperi (3% CR):  €14.400
                        ⚡ Automazioni:         €2.400
```

Questo rende il numero credibile e spiega la logica al cliente.

---

## Aggiungere al tipo `popupData` i campi breakdown

Aggiungere al tipo `AdvancedReport['popupData']` tre nuovi campi opzionali:
```typescript
popupData?: {
  ...
  revenueWelcome12m: number;      // revenue layer acquisto diretto (5%)
  revenueRecovery12m: number;     // revenue layer recuperi carrello (3%)
  revenueAutomation12m: number;   // revenue layer automazioni (CR dinamico)
}
```

---

## Modifiche tecniche

### File 1: `src/lib/reportCalculations.ts`

**Riga 499-500** — Aggiornare il calcolo `projectedRevenue12m`:

```typescript
// Revenue nuovi iscritti popup — 3 layer:
// 1) Acquisto diretto via welcome flow (5%)
const revenueWelcome12m = Math.round(newSubscribersPerMonth * aov * 0.05 * 12);
// 2) Recuperi carrello + checkout (3%)
const revenueRecovery12m = Math.round(newSubscribersPerMonth * aov * 0.03 * 12);
// 3) Automazioni attive nel tempo (CR dinamico 0–1%)
const currentAutomationCR = getAutomationCR(activeFlowsCount);
const revenueAutomation12m = Math.round(newSubscribersPerMonth * aov * currentAutomationCR * 12);
// Totale
const projectedRevenue12m = revenueWelcome12m + revenueRecovery12m + revenueAutomation12m;
```

**Tipo `popupData`** — Aggiungere i 3 campi breakdown:
```typescript
revenueWelcome12m: number;
revenueRecovery12m: number;
revenueAutomation12m: number;
```

**Importante**: `getAutomationCR` è già definita nella stessa funzione `_calculateReport` — basta richiamarla.

### File 2: `src/components/AdvancedReport.tsx`

**Card "💰 Revenue aggiuntiva"** (righe 523-527) — aggiungere breakdown sotto il valore totale:

```tsx
<div className="...card verde...">
  <p className="text-green-400 text-sm mb-1">💰 Revenue aggiuntiva</p>
  <p className="text-3xl font-bold text-white">{formatCurrency(report.popupData.projectedRevenue12m)}</p>
  <p className="text-green-400/70 text-xs mt-1">dai nuovi iscritti (12 mesi)</p>
  
  {/* Breakdown tre layer */}
  <div className="mt-3 pt-3 border-t border-green-500/20 space-y-1 text-left">
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">🎁 Welcome (5% CR)</span>
      <span className="text-green-300">{formatCurrency(report.popupData.revenueWelcome12m)}</span>
    </div>
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">🛒 Recuperi (3% CR)</span>
      <span className="text-green-300">{formatCurrency(report.popupData.revenueRecovery12m)}</span>
    </div>
    <div className="flex justify-between text-xs">
      <span className="text-slate-400">⚡ Automazioni</span>
      <span className="text-green-300">{formatCurrency(report.popupData.revenueAutomation12m)}</span>
    </div>
  </div>
</div>
```

### File 3: `src/lib/pdfGenerator.ts`

La sezione popup del PDF legge `pd.projectedRevenue12m` — si aggiorna automaticamente. Aggiungere opzionalmente una riga breakdown nella pagina PDF se i tre campi sono presenti.

---

## Riepilogo file modificati

| File | Modifica |
|---|---|
| `src/lib/reportCalculations.ts` | Nuova formula a 3 layer per `projectedRevenue12m`, aggiunta campi `revenueWelcome12m`, `revenueRecovery12m`, `revenueAutomation12m` al tipo e al calcolo |
| `src/components/AdvancedReport.tsx` | Breakdown visivo nella card verde Revenue aggiuntiva |
| `src/lib/pdfGenerator.ts` | Aggiunta riga breakdown nella pagina popup PDF |

Nessun nuovo file. Nessuna modifica al database.
