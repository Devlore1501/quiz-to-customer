

## Sezione "Esempi di risultati" nella landing intro

Aggiungo una nuova sezione nella schermata intro che mostra **screenshot demo del report** che l'utente riceverà completando il quiz. Serve a ridurre l'attrito e dare prova visiva del valore.

### Posizione nella landing
Inserita tra la sezione **"Le 6 aree analizzate"** e la sezione **social proof / trust**, così:

```
1. Hero
2. Cosa otterrai
3. Come funziona
4. Le 6 aree analizzate
5. ⭐ NUOVO → "Anteprima del tuo report"
6. Social proof
7. CTA finale
8. Footer
```

### Contenuto della nuova sezione

**Titolo**: "Anteprima del report che riceverai"
**Sottotitolo**: "Ecco un esempio di cosa troverai dentro — dati reali, formule chiare, azioni prioritizzate."

**Layout**: grid responsive con **3 mockup di schermate** del report, presentati come finestre browser stile macOS (titolo bar con pallini rossi/gialli/verdi + screenshot dentro), leggermente inclinati / con shadow morbida.

I 3 screenshot mostrano sezioni reali del report Mailift:
1. **Diagnosi & Score** — punteggio globale + breakdown per area
2. **Stima revenue persa** — numero grande in arancione + breakdown mensile
3. **Piano d'azione 90 giorni** — lista task prioritizzate

**Generazione immagini**: uso il modello Lovable AI `google/gemini-3.1-flash-image-preview` per generare 3 mockup PNG realistici del report (palette bianco/slate + arancione Mailift, font sans, dati finti ma plausibili in italiano: es. "Score: 62/100", "Revenue persa: €18.400/mese", task list con checkbox arancioni).

Le immagini vengono salvate in `src/assets/` come:
- `report-preview-score.png`
- `report-preview-revenue.png`
- `report-preview-actions.png`

E importate nel componente `IntroScreen` come tutti gli altri asset.

**Stile della sezione**
- Sfondo: `bg-white` (per stacco con `bg-slate-50` delle altre sezioni)
- Cornice mockup: bordo `slate-200`, `rounded-xl`, ombra morbida, title bar grigio chiaro con 3 pallini
- Hover: leggero scale + shadow più marcata
- Su mobile: stack verticale, su desktop: grid a 3 colonne
- Sotto i 3 mockup: micro-CTA testuale "↓ Ottieni il tuo report personalizzato in 2 minuti"

### File modificati
- `src/components/EmailMarketingSurvey.tsx` → aggiunta sezione tra le esistenti dentro `IntroScreen`
- `src/assets/report-preview-score.png` (generato)
- `src/assets/report-preview-revenue.png` (generato)
- `src/assets/report-preview-actions.png` (generato)

### Cosa NON cambia
- Hero, sezioni esistenti, logica quiz, webhook, tracking, palette
- Nessuna modifica a database, edge function, report reale

