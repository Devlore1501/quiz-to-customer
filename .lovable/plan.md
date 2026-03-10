

## Correzione: Commissione % calcolata sul fatturato email generato (benchmark), non sull'attuale

### Comprensione della richiesta
Il cliente spiega chiaramente: "se fattura ecommerce è 100k e dopo il lavoro email genera 30k, noi prendiamo 5% da quei 30k". Quindi la base della commissione è il **fatturato email che verrà generato dopo le implementazioni** — cioè il valore benchmark (`benchmarkEmailRevenue` = 35% del fatturato e-commerce), non il fatturato email attuale pre-lavoro.

### Stato attuale
Riga 196: `const emailRevenueNetVAT = activeReport.currentEmailRevenue / 1.22;` — usa il fatturato email **attuale** (pre-lavoro).

### Nuova logica
Base = `benchmarkEmailRevenue / 1.22` — il fatturato email **dopo** le implementazioni di Mailift, netto IVA.

**Esempio**: fatturato e-commerce = €100.000 → benchmark email 35% = €35.000 → netto IVA = €28.689 → 5% = €1.434/mese

### Modifiche tecniche

**File: `src/components/AdvancedReport.tsx`**

1. **Riga 195-196** — Cambiare base:
   ```typescript
   // Prima:
   const emailRevenueNetVAT = activeReport.currentEmailRevenue / 1.22;
   // Dopo:
   const emailRevenueNetVAT = activeReport.benchmarkEmailRevenue / 1.22;
   ```

2. **Riga 195** — Aggiornare commento:
   ```typescript
   // Base commissione = fatturato email generato post-implementazione (benchmark), netto IVA 22%
   ```

3. **Riga 949** — Aggiornare testo descrittivo sotto l'input:
   ```
   = €X/mese su €Y fatturato email generato netto IVA
   ```

Nessun'altra modifica necessaria — la variabile `emailRevenueNetVAT` è già usata correttamente in tutto il file.

