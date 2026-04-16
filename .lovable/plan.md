

## Piano: Redesign completo del Report (AdvancedReport.tsx) con il nuovo tema Mailift

### Problema
Il componente `AdvancedReport.tsx` usa ancora il vecchio design (sfondo `bg-slate-50` chiaro, accento arancione, font di sistema). Non è stato aggiornato nella fase precedente che ha riguardato solo il quiz e il gate.

### Cosa cambia

Il report verrà completamente riscritto per allinearsi al design dell'HTML fornito:

**Tema visivo:**
- Background `#080808`, card `#141414`, bordi `#242424`
- Accento lime `#C8F135` al posto dell'arancione
- Font: Bebas Neue (titoli/numeri), Syne (body), DM Mono (label/tag)
- Rosso `#ff3b3b` per revenue leak, verde `#2ecc71` per positivi

**Struttura report (dal HTML):**

1. **Header profilo** — Tag "Analisi completata", nome utente, settore
2. **Revenue Leak Hero** — Card rossa con revenue leak mensile grande + annuale
3. **Score complessivo** — Numero grande /100 + score cards a 5 dimensioni (Email Revenue, Flussi, Segmentazione, Frequenza, Tool) con barre colorate
4. **Situazione attuale vs benchmark** — Griglia 2×2 (fatturato, email attuale, benchmark, gap) + gauge bar
5. **Cosa funziona** — Lista verde con numerazione delle cose positive
6. **Dove si trova il blocco** — Lista rossa con icone dei problemi
7. **Analisi automazioni** — Flow list con priorità (P1/P2/P3), stato attivo/mancante, importi
8. **Scenari di crescita** — 3 card (conservativo/moderato/aggressivo) con badge "CONSIGLIATO"
9. **Roadmap 3 azioni prioritarie** — Card numerate con timeline e gain stimato
10. **Caso studio** — Card con metriche before/after per settore simile
11. **Potenziale annuale** — Highlight grande con importo annuale
12. **Slider forecast interattivo** — Slider invii/mese con tabella dinamica
13. **Social proof** — Griglia 2×2 con numeri (brand, revenue, ecc.)
14. **CTA finale** — Scarcity badge + pulsante calendario + agenda consulenza

**Funzionalità mantenute:**
- Pannello simulazione (drawer laterale) — restilizzato nel nuovo tema
- Download PDF
- Sezione Investimento & ROI (admin only)
- Proiezione fatturato nel tempo
- Popup & crescita lista (condizionale)

### File coinvolti

| File | Azione |
|------|--------|
| `src/components/AdvancedReport.tsx` | Riscrittura completa del template JSX e stili |

La logica di calcolo (`reportCalculations.ts`) e i dati restano invariati — cambia solo la presentazione visiva.

### Note
- Il file è ~1400 righe, verrà riscritto mantenendo tutta la logica stato/simulazione/ROI
- Le sezioni "Cosa funziona", "Problemi", e "Caso studio" richiedono dati derivati dal report esistente (strategicAnalysis, missingFlows, topActions)
- Lo score a 5 dimensioni verrà calcolato dal report data esistente (emailHealthScore scomposto)

