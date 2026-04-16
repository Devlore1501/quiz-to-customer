

## Piano: Aggiornamento Quiz al nuovo design HTML + Dashboard Drop-off

### Cosa cambia

Il nuovo HTML definisce un quiz con **11 domande** (vs 10 attuali), un design completamente diverso (dark theme con accento lime `#C8F135`, font Bebas Neue/Syne/DM Mono), insight cards tra le domande, un gate per i contatti separato dal quiz, e un report inline con radar chart.

### Modifiche principali

**1. Aggiornare `EmailMarketingSurvey.tsx` — Domande e flusso**

Nuove 11 domande in ordine:
1. Fatturato (6 opzioni: <10k, 10-25k, 25-50k, 50-100k, 100-300k, 300k+)
2. Settore (8 opzioni: Beauty, Abbigliamento, Food, Casa, Sport, Vino, Salute, Altro)
3. Piattaforma (Shopify, WooCommerce, Altra) — **NUOVA**
4. Email Tool (Klaviyo, Mailchimp, Nessuno, Non so) — **NUOVA**
5. Revenue Email (Non lo so, 0-10%, 10-20%, 20-30%, 30-40%, 40%+)
6. Automazioni (multi-select, 8 opzioni come prima + "Nessun flusso")
7. Segmentazione (4 opzioni: blast, base, avanzata, no campagne) — **NUOVA**
8. Frequenza (5 opzioni: nessuno, 1-2, 3-4, 5-7, 7+)
9. Lista Email (6 opzioni: <1k, 1-5k, 5-10k, 10-30k, 30-50k, 50k+)
10. Obiettivo/Motivazione (5 opzioni come prima)
11. URL sito web (input testo, con hint "privato")

Cambiamenti chiave:
- Rimuovere `adsInvestment` e `emailSatisfaction` dal FormData
- Aggiungere `platform`, `emailTool`, `segmentation`
- Rimuovere la disqualificazione su ads spend
- Riordinare le domande: fatturato prima del settore
- L'ordine diventa: Fatturato → Settore → Piattaforma → Email Tool → Revenue Email → Automazioni → Segmentazione → Frequenza → Lista → Obiettivo → URL

**2. Aggiornare il design del quiz**

Applicare il nuovo stile dark theme dal CSS fornito:
- Background `#080808`, card `#141414`, accento `#C8F135`
- Font: Bebas Neue per titoli, Syne per body, DM Mono per label
- Progress bar con percentuale e label "DOMANDA X / 11"
- Opzioni con dot radio/checkbox style custom
- Pulsante "Continua" lime con freccia
- Pulsante "Indietro" minimal
- Hero section con badge animato e titolo "Revenue Leak Audit"

**3. Aggiungere Insight Cards**

Creare componente `InsightCard` che appare tra alcune domande con:
- Emoji, tag, titolo, testo, statistica
- Contenuto dinamico basato sulle risposte date
- Inseriti dopo Q0 (fatturato), Q4 (revenue email), Q5 (automazioni), Q6 (segmentazione)

**4. Aggiornare il Gate (lead capture)**

Separare il form contatti dal quiz:
- Mostrare dopo il loading, prima del report
- Mostrare preview blurrata del revenue leak come teaser
- Campi: Nome, Email, WhatsApp + checkbox privacy
- Pulsante "Ricevi il Report"

**5. Aggiornare `reportCalculations.ts`**

- Aggiungere benchmark per nuovi settori (Sport, Vino)
- Aggiungere scoring per `platform`, `emailTool`, `segmentation`
- Score a 5 dimensioni: Email Revenue, Flussi, Segmentazione, Frequenza, Tool
- Profili A/B/C basati su combinazione risposte
- Scenari: conservativo 15%, moderato 35%, aggressivo 60%

**6. Aggiornare `AdvancedReport.tsx` — Report inline**

Adattare il report al nuovo design con:
- Radar chart SVG a 5 dimensioni
- Score cards con barre colorate
- Sezioni "Cosa funziona" e "Dove si trova il blocco"
- Scenari di crescita con card
- Roadmap 3 azioni prioritarie
- Caso studio per settore
- CTA finale con scarcity badge

**7. Dashboard Drop-off Analytics (admin)**

Nuova sezione in `AdminReport.tsx`:
- Query `partial_submissions` per aggregare abbandoni per step
- Grafico funnel con barre per ogni domanda
- Percentuale completamento vs abbandono
- Filtri per periodo (oggi, 7gg, 30gg)

### File coinvolti

| File | Azione |
|------|--------|
| `src/components/EmailMarketingSurvey.tsx` | Refactoring completo |
| `src/lib/reportCalculations.ts` | Aggiornamento calcoli + nuovi settori |
| `src/components/AdvancedReport.tsx` | Aggiornamento design report |
| `src/components/InsightCard.tsx` | **Nuovo** — componente insight |
| `src/components/DropoffAnalytics.tsx` | **Nuovo** — dashboard drop-off |
| `src/pages/AdminReport.tsx` | Aggiunta tab drop-off |
| `index.html` | Aggiungere font Google (Bebas Neue, Syne, DM Mono) |
| `src/index.css` | Variabili CSS per il nuovo tema |
| `src/lib/adminReportGenerator.ts` | Aggiornare per nuovi campi |

### Note importanti
- Tutta la logica backend (Supabase save, webhook, partial tracking, Facebook Pixel) viene **mantenuta identica**
- La tabella `survey_submissions` potrebbe richiedere una migrazione per le nuove colonne (`platform`, `email_tool`, `segmentation`) — oppure si salvano in `report_data` JSON
- Il lavoro è ampio: procederò in fasi partendo dal quiz, poi report, poi analytics

