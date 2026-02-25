

## Modifica calcolo scenari di crescita

### Cosa cambia
Attualmente i 3 scenari (Conservativo, Moderato, Aggressivo) sono calcolati come percentuale del **revenueGap** (differenza tra benchmark 35% e attuale). L'utente vuole che siano calcolati come percentuale di **crescita sul fatturato email mensile attuale** (`currentEmailRevenue`).

### Formula attuale
```
valore = revenueGap × (percentuale / 100)
```

### Nuova formula
```
valore = currentEmailRevenue × (percentuale / 100)
```

Esempio: se il fatturato email attuale è €5.000/mese e lo scenario conservativo è 15%, il valore sarà €750/mese di crescita aggiuntiva.

### Modifiche tecniche

**File: `src/lib/reportCalculations.ts`** (righe ~330-350)

Sostituire:
```typescript
value: revenueGap * (conservPct / 100)
// ...
value: revenueGap * (moderatePct / 100)
// ...
value: revenueGap * (aggressPct / 100)
```

Con:
```typescript
value: currentEmailRevenue * (conservPct / 100)
// ...
value: currentEmailRevenue * (moderatePct / 100)
// ...
value: currentEmailRevenue * (aggressPct / 100)
```

Aggiornare anche le descrizioni per riflettere che le percentuali rappresentano crescita sul fatturato attuale e non recupero del gap.

Aggiornare `yearlyPotential` se necessario (attualmente basato su `revenueGap * 12`).

