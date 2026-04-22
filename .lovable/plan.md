

## Fix header schermata intro

Due piccoli fix all'inizio della landing intro:

### 1. Rimuovere il logo in alto a sinistra
Attualmente in `IntroScreen` c'è un `<header>` con il logo Mailift in alto a sinistra + scritta "Email Revenue Audit" a destra. Lo rimuovo completamente. Resta **solo il logo centrale dentro l'avatar tondo dell'hero**.

### 2. Spostare la pill "Revenue Leak Audit" sotto il logo
Oggi visivamente la pill arancione `REVENUE LEAK AUDIT` finisce affiancata al logo (perché l'avatar è `inline-block` e la pill è `inline-flex`). La rendo **block centrata sotto il logo**, in modo che l'ordine verticale sia:

```
       [ Avatar tondo con logo Mailift centrato ]
              [ pill: REVENUE LEAK AUDIT ]
       [ H1 "Scopri quanta revenue... Gratis." ]
                  [ Sottotitolo ]
              [ CTA "Inizia il quiz →" ]
            [ 🔒 Dati riservati. Nessuno spam. ]
```

### Modifiche tecniche
- `src/components/EmailMarketingSurvey.tsx`, dentro `IntroScreen`:
  - Rimuovo l'intero blocco `<header>` (righe ~373-379)
  - Nell'hero: l'avatar diventa un `<div className="flex justify-center">` invece di `inline-block`, così la pill sottostante va naturalmente a capo centrata
  - Aggiungo un piccolo padding-top all'hero per compensare l'header rimosso

### Cosa NON cambia
- Tutte le sezioni sottostanti (Cosa otterrai, Come funziona, 6 aree, Anteprima report, social proof, CTA finale, footer)
- Palette, gradient arancione, tipografia, animazioni
- Logica quiz, webhook, tracking, report

