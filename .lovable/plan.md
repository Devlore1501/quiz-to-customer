

## Piano: Sostituire l'accento lime `#C8F135` con l'arancione del logo `#FAB450`

### Colore identificato

Analizzando il logo Mailift, il colore arancione/ambra dominante è **`#FAB450`** (rgb 250, 180, 80). Verrà usato come nuovo accento brand al posto del lime `#C8F135`.

Hover state: `#fbbf6a` (versione leggermente più chiara, sostituisce `#d4f545`).
Versioni trasparenti: `rgba(250, 180, 80, X)` sostituiscono `rgba(200, 241, 53, X)`.

### File coinvolti

| File | Occorrenze | Note |
|---|---|---|
| `src/components/EmailMarketingSurvey.tsx` | ~120 | Quiz, gate, loading, hero badge, checkbox, bottoni CTA, progress bar, stati selected/hover |
| `src/components/AdvancedReport.tsx` | ~80 | Report — metriche, badge, scenari, bottoni, accenti |
| `src/components/InsightCard.tsx` | ~10 | Card insight nel report |

### Mappa sostituzioni

| Vecchio (lime) | Nuovo (arancione logo) |
|---|---|
| `#C8F135` | `#FAB450` |
| `#d4f545` (hover) | `#fbbf6a` |
| `rgba(200, 241, 53, X)` | `rgba(250, 180, 80, X)` |
| `rgba(200,241,53,X)` (no spaces) | `rgba(250,180,80,X)` |

### Eccezioni / cose da NON toccare

- **`#ff8c42` / `rgba(255,140,66,X)`** — già un arancione, usato per stato "active" (loading step in corso). Va lasciato com'è oppure differenziato. Per evitare conflitto visivo con il nuovo accento `#FAB450`, lo stato "active" può restare `#ff8c42` (più rosso/saturo) per distinguersi dall'accento brand principale, oppure essere rimpiazzato con una versione più scura tipo `#e89638`. **Suggerimento**: mantenere `#ff8c42` perché serve come indicatore distinto di "in corso" vs "completato".
- **Rosso revenue leak** (`#ff3b3b`, `rgba(255,59,59,X)`) — non toccare.
- **Sfondo navy** `#121d2b`, `#1a2942`, `#2a3a52` — non toccare.

### Esecuzione

1. `EmailMarketingSurvey.tsx`: sed-style replace di tutte le 4 mappature sopra
2. `AdvancedReport.tsx`: stesse 4 mappature
3. `InsightCard.tsx`: stesse 4 mappature

Nessuna modifica di logica — solo colori. Il testo dei pulsanti su sfondo arancione resterà `#121d2b` (navy scuro), che ha buon contrasto con `#FAB450`.

### Memoria da aggiornare

Aggiungere a `mem://index.md` Core: l'accento brand è ora arancione `#FAB450` (dal logo Mailift), non più lime.

