

# Fix: Forecast invii mensili modificabile + Scenari/Potenziale annuo zero

## Diagnosi dei due problemi

### Problema 1 — Forecast invii mensili non modificabile

Nel report generato, la card "Invii Mensili Attuali" e la colonna "Attuale" della tabella forecast mostrano il valore `report.listForecast.sendsPerMonth`, che è un numero **immutabile** calcolato al momento della generazione del report. Non c'è alcuna UI interattiva per cambiarlo una volta generato il report.

**Causa root**: lo step 7 "Frequenza invio email" nel quiz admin usa opzioni testuali (`'1-2'`, `'3-4'` ecc.) che vengono mappate in invii/mese dalla funzione `parseEmailFrequency()`. Il valore calcolato è cristallizzato nel report e non è più modificabile. L'utente si aspetta di poter aggiustare gli invii mensili direttamente nel report o nel forecast.

**Soluzione**: aggiungere nella sezione Forecast del report un **slider interattivo** "Invii/mese" che permette di far ricalcolare la colonna "Attuale" in tempo reale senza rigenerare il report. Il resto della pagina (scenari, potenziale annuo) non cambia — solo i dati del forecast vengono ricalcolati localmente.

---

### Problema 2 — Scenari e Potenziale Annuo a zero

`yearlyPotential = scenarios.moderate.value * 12` dove `scenarios.moderate.value = currentEmailRevenue * (moderatePct / 100)`.

Se `currentEmailRevenue = 0` (succede quando `emailRevenuePercentage = 0` o campo vuoto), tutto è zero.

**Causa root identificata**: nello step 4 "% fatturato da email", il campo è un `Input type="number"` con `canProceed: true` — non richiede un valore minimo, quindi l'utente può inserire `0` o lasciare vuoto e procedere. Risultato: `emailPct = 0` → `currentEmailRevenue = 0` → scenari e potenziale a zero.

**Seconda causa**: anche con % corretta, se `monthlyRevenue = 0` (step 2 vuoto) stesso problema.

**Soluzione**: 
1. Aggiungere validazione minima: richiedere che entrambi i campi siano > 0 per poter procedere (rendere `canProceed` condizionale a valore positivo)
2. Aggiungere feedback visivo in tempo reale sotto i due campi che mostra subito il fatturato email mensile calcolato — così l'utente capisce l'effetto immediato
3. Nello step 11 "Impostazioni Report", mostrare un avviso se il potenziale è zero invece di un numero silenziosamente sbagliato

---

## Modifiche tecniche

### File 1: `src/components/AdminSurvey.tsx`

**Step 2 — Fatturato mensile**: cambiare `canProceed: true` in `canProceed: parseFloat(formData.monthlyRevenue) > 0` — il campo è già obbligatorio nel quiz pubblico, lo rendiamo consistente.

**Step 4 — % fatturato da email**: cambiare `canProceed: true` in `canProceed: parseFloat(formData.emailRevenuePercentage) > 0`. Aggiungere un helper sotto il campo che mostra in tempo reale:
```
= €12.500/mese di fatturato email
```

**Step 7 — Frequenza invio email**: aggiungere accanto a ogni opzione il numero di invii mensili corrispondente (es. "1-2 volte a settimana → ~5 invii/mese") così l'utente sa cosa sta scegliendo. Questo risolve la confusione sul forecast.

**Nessun altro cambiamento agli step.**

---

### File 2: `src/components/AdvancedReport.tsx`

**Slider interattivo nel Forecast**: aggiungere uno stato locale `customSends` inizializzato a `report.listForecast.sendsPerMonth`. Quando l'utente muove lo slider, ricalcola i valori della colonna "Attuale" (newsletter revenue e automation revenue) senza toccare le colonne Ottimizzato e Benchmark.

```typescript
const [customSends, setCustomSends] = useState(report.listForecast.sendsPerMonth);

// Ricalcolo colonna Attuale con invii personalizzati
const aov = report.listForecast.sectorAOV;
const listSize = report.listForecast.listSize;
const liveNewsletterRev = aov * (listSize * customSends * 0.002);
const liveAutomationRev = report.listForecast.current.automationRevenue; // invariata
const liveTotal = liveNewsletterRev + liveAutomationRev;
```

**UI dello slider**: sostituire la card "Invii Mensili Attuali" (statica) con una card interattiva contenente uno slider da 0 a 30 invii/mese. Sotto lo slider il valore numerico cambia in tempo reale e la tabella si aggiorna istantaneamente.

La label "Attuale" diventa "📍 Corrente (modificabile)" per chiarire all'utente che può aggiustarlo.

---

## Posizione nel report — invariata

```
[Forecast lista]
  ├── Card: Lista Attuale (statica)
  ├── Card: [Slider Invii/mese] ← MODIFICATA (da statica a interattiva)
  └── Card: AOV (statica)
  
  [Tabella forecast]
    ├── Colonna Attuale → usa customSends (reattiva)
    ├── Colonna Ottimizzato → invariata (×2.5 calcolato al momento della gen.)
    └── Colonna Benchmark → invariata (sempre 20 invii)
```

---

## File modificati

| File | Tipo modifica |
|---|---|
| `src/components/AdminSurvey.tsx` | `canProceed` per step 2 e 4, label descrittive in step 7 |
| `src/components/AdvancedReport.tsx` | Stato `customSends` + slider + ricalcolo colonna Attuale in tempo reale |

Nessun nuovo file. Nessuna modifica al database. Nessuna modifica alle logiche di calcolo del backend.

