

## Modifiche ai range di fatturato e label "ecommerce"

### 1. Nuovi range di fatturato

I range attuali vengono sostituiti con:

| Vecchio | Nuovo |
|---------|-------|
| Meno di 10.000 (solo EmailMarketingSurvey) | Meno di 15.000 |
| 10.000 - 20.000 | 15.000 - 25.000 |
| 20.000 - 50.000 | 25.000 - 50.000 |
| 50.000 - 100.000 | 50.000 - 100.000 (invariato) |
| 100.000 - 200.000 | 100.000 - 200.000 (invariato) |
| 200.000+ | 200.000+ (invariato) |

I valori interni (`value`) cambieranno di conseguenza: `under-15k`, `15-25k`, `25-50k`, `50-100k`, `100-200k`, `200k+`.

### 2. Specificare "ecommerce" nella domanda

La domanda sul fatturato viene aggiornata per specificare che si tratta di fatturato e-commerce:
- **EmailMarketingSurvey**: "Qual e il fatturato mensile del tuo ecommerce?"
- **ConversationalSurvey**: "Qual e il fatturato mensile del tuo ecommerce?"

### 3. Aggiornamento logica di disqualifica

- **EmailMarketingSurvey**: la disqualifica scatta ora per `under-15k` (meno di 15k) invece di `under-10k`
- **ConversationalSurvey**: la condizione di disqualifica attuale (`monthlyRevenue === '10-20k' && adsInvestment === '0-5k'`) viene aggiornata per usare `15-25k` al posto di `10-20k`

### 4. Aggiornamento `parseRevenueRange` in `reportCalculations.ts`

La funzione che converte i range in valori numerici viene aggiornata:

```text
Vecchio                    Nuovo
'10-20k' -> 15000         '15-25k' -> 20000
'20-50k' -> 35000         '25-50k' -> 37500
'50-100k' -> 75000        '50-100k' -> 75000 (invariato)
'100-200k' -> 150000      '100-200k' -> 150000 (invariato)
'200k+' -> 250000         '200k+' -> 250000 (invariato)
```

Si aggiunge anche il mapping per `under-15k` -> 10000 (usato in caso di disqualifica con salvataggio parziale).

### File modificati

- `src/components/EmailMarketingSurvey.tsx` -- range, label domanda, disqualifica
- `src/components/ConversationalSurvey.tsx` -- range, label domanda, disqualifica
- `src/lib/reportCalculations.ts` -- `parseRevenueRange` con nuovi valori

