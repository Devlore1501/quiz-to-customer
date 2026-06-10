Obiettivo: sostituire il font corrente di tutti gli elementi con colore arancione nel progetto con **Playfair Display** (Google Font serif).

## Analisi dello stato attuale
Il progetto usa i seguenti font:
- **Bebas Neue** (display / numeri grandi)
- **Syne** (sans-serif / testi)
- **DM Mono** (monospace / label, tag)

Il colore arancione brand è **#FAB450** ("giallo-arancio") e appare in decine di elementi: numeri del report, label, tag, bottoni, statistiche, titoli di sezione, progress bar, testi di benchmark, ecc.

## Piano di implementazione

### 1. Caricamento font
Aggiungere **Playfair Display** (con i pesi 400, 700, e opzionalmente italic) al caricamento Google Fonts in `index.html`.

### 2. Configurazione CSS / Tailwind
Aggiungere una nuova utility CSS (es. `.font-playfair` o tramite Tailwind config) che punti alla famiglia `"Playfair Display", serif`. Il font verrà applicato in modo selettivo, non come font globale.

### 3. Mappatura degli elementi arancione da aggiornare
Applicare il nuovo font a tutti gli elementi che usano:
- `color: '#FAB450'`
- `text-orange`
- `text-orange-foreground`
- sfondi arancione con testo bianco/nero (`bg-orange`)

I componenti principali coinvolti sono:
- `src/components/AdvancedReport.tsx` (titoli, numeri, label, benchmark, tabelle)
- `src/components/EmailMarketingSurvey.tsx` (testi di introduzione, statistiche)
- `src/components/InsightCard.tsx` (tag, titolo, statistiche)
- `src/components/DropoffAnalytics.tsx` (tab, percentuali)
- `src/pages/AdminReport.tsx` (tab, bottoni, icone)
- `src/lib/pdfGenerator.ts` (accenti nel PDF)

### 4. Metodologia di applicazione
Per garantire coerenza senza duplicare codice:
- Aggiungere una regola CSS globale stile: `[style*="color: '#FAB450'"]` non è affidabile.
- Approccio consigliato: creare una utility Tailwind `font-playfair` e applicarla agli elementi arancione esistenti tramite sostituzione nelle proprietà `className` o `style` dove presenti.
- Per elementi con stili inline (`style={{ color: '#FAB450' }}`), aggiungere `fontFamily: "'Playfair Display', serif"` inline o preferibilmente spostare in una classe condivisa.

### 5. Verifica visiva
Controllare che:
- I numeri grandi (es. "€5M+", benchmark) risultino leggibili in serif.
- Le label maiuscole e i tag piccoli (es. "ANALISI", "GAP ANALYSIS") non perdano leggibilità.
- I bottoni arancione mantengano coerenza tipografica.

## Nota tecnica
Tailwind v3 non supporta selettori CSS basati su valore attributo (`[style*=...]`) out-of-the-box senza plugin custom. L'implementazione procederà tramite utility class applicata esplicitamente a ogni componente che contiene testo arancione.