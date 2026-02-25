

## Correzione: Scenari di crescita basati sul fatturato e-commerce totale

### Problema attuale
Gli scenari (Conservativo 15%, Moderato 35%, Aggressivo 60%) sono calcolati sul **fatturato email mensile** (`currentEmailRevenue`). Se l'email genera solo €550/mese, lo scenario moderato dà €192 — valori troppo bassi e fuorvianti.

### Nuova logica
Calcolare gli scenari come percentuale di crescita sul **fatturato e-commerce mensile totale** (`monthlyRevenue`).

**Esempio**: fatturato e-commerce = €37.500/mese
- Conservativo (15%): +€5.625/mese
- Moderato (35%): +€13.125/mese  
- Aggressivo (60%): +€22.500/mese

### Modifiche tecniche

**File: `src/lib/reportCalculations.ts`**

1. **Righe 345-361** — Scenari di crescita: sostituire `currentEmailRevenue` con `monthlyRevenue` nella formula:
   ```typescript
   value: monthlyRevenue * (conservPct / 100)
   value: monthlyRevenue * (moderatePct / 100)
   value: monthlyRevenue * (aggressPct / 100)
   ```

2. **Aggiornare le descrizioni** per riflettere che le % si applicano al fatturato e-commerce totale.

3. **Riga 424** — `yearlyPotential`: aggiornare a `scenarios.moderate.value * 12` per coerenza con lo scenario moderato (ora basato su fatturato totale).

**File: `src/components/AdvancedReport.tsx`** — Verificare che i testi nella sezione scenari non facciano riferimento a "fatturato email" ma a "fatturato e-commerce".

