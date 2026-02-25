

## Correzione: Commissione % calcolata sul fatturato email mensile attuale (non sul gap)

### Problema attuale
La commissione percentuale è calcolata su `revenueGap / 1.22` (gap benchmark vs attuale, netto IVA). Il cliente vuole che sia calcolata sul **fatturato email mensile corrente** (`currentEmailRevenue`) netto IVA.

### Nuova logica
Base = `currentEmailRevenue / 1.22` (fatturato email mensile attuale, netto IVA 22%).

### Modifiche tecniche

**File: `src/components/AdvancedReport.tsx`**

1. **Riga 195-196** — Cambiare base di calcolo:
   ```typescript
   // Prima:
   const revenueGapNetVAT = activeReport.revenueGap / 1.22;
   // Dopo:
   const emailRevenueNetVAT = activeReport.currentEmailRevenue / 1.22;
   ```

2. **Riga 200** — Aggiornare calcolo fee:
   ```typescript
   const monthlyPercentFee = emailRevenueNetVAT * (monthlyPercentN / 100);
   ```

3. **Riga 934** — Label: `"📊 Commissione % su fatturato email netto IVA"`

4. **Righe 947-950** — Testo sotto input:
   ```
   = €X/mese su €Y fatturato email netto IVA
   ```

5. **Riga 978** — Riepilogo: `"fisso + X% su fatturato email netto IVA"`

6. Rinominare la variabile `revenueGapNetVAT` → `emailRevenueNetVAT` in tutte le occorrenze nel file.

