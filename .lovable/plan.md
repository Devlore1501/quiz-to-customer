
# Nuovo scenario: Forecast basato sulla Lista

## Obiettivo

Aggiungere una nuova sezione nel report che mostra quanto fatturato il lead potrebbe generare sfruttando la propria lista con un piano di invio newsletter regolare, usando i dati già disponibili (dimensione lista + frequenza attuale).

---

## La formula (quella proposta dall'utente)

Il forecast viene calcolato su due componenti:

**Newsletter (campagne manuali):**
`Revenue Newsletter = AOV × (list_size × sends_per_month × 0.2%)`

**Automazioni:**
`Revenue Automazioni = AOV × (list_size × 2%)`

Dove:
- `sends_per_month` viene derivato da `emailFrequency` (già raccolto)
- `AOV` (Average Order Value) viene stimato dai benchmark di settore, senza aggiungere domande al quiz

---

## AOV per settore (benchmark)

Poiché non chiediamo l'AOV direttamente, lo stimiamo per settore:

| Settore | AOV stimato |
|---|---|
| Beauty | €55 |
| Fashion | €80 |
| Food | €45 |
| Digital | €35 |
| Jewelry | €150 |
| Home | €90 |
| Health | €50 |
| Other | €65 |

---

## Conversione frequenza → invii/mese

| Valore quiz | Invii per mese |
|---|---|
| none | 0 |
| 1-2 | 5 (media 1,5/sett × 4) |
| 3-4 | 14 (media 3,5/sett × 4) |
| 5-7 | 24 (media 6/sett × 4) |
| daily+ | 30 |

---

## Cosa viene mostrato nel report

Una nuova sezione **"📬 Forecast: Il Potenziale della Tua Lista"** inserita dopo gli Scenari di Crescita, con:

**Card superiori (3 colonne):**
- Lista attuale: `X iscritti`
- Invii mensili attuali: basati sulla frequenza dichiarata
- AOV stimato del settore: `€XX`

**Tabella forecast (3 scenari):**

| | Attuale | Ottimizzato | Benchmark |
|---|---|---|---|
| **Invii/mese** | 5 | 12 | 20 |
| **CR applicato** | 0.2% | 0.2% | 0.2% |
| **Ordini stimati** | 30 | 72 | 120 |
| **Revenue Newsletter** | €1.650 | €3.960 | €6.600 |
| **Revenue Automazioni** | €3.850 | €3.850 | €3.850 |
| **Totale stimato** | €5.500 | €7.810 | €10.450 |

**Nota esplicativa** sotto la tabella che spiega le assunzioni (CR 0.2% per newsletter, 2% per automazioni, AOV da benchmark settore).

---

## Dettagli tecnici

### File 1: `src/lib/reportCalculations.ts`

Aggiungere:
- Mappa `sectorAOV` con AOV per settore
- Funzione helper `parseEmailFrequency(freq: string): number` → converte il valore in invii/mese
- Nuovo tipo `ListForecast` nell'interfaccia `AdvancedReport`
- Calcolo del forecast in `calculateAdvancedReport()` (aggiunta del parametro `emailFrequency`)

```typescript
// Nuovo campo nell'AdvancedReport
listForecast: {
  listSize: number;
  sendsPerMonth: number;
  sectorAOV: number;
  current: { sends: number; newsletterRevenue: number; automationRevenue: number; total: number };
  optimized: { sends: number; newsletterRevenue: number; automationRevenue: number; total: number };
  benchmark: { sends: number; newsletterRevenue: number; automationRevenue: number; total: number };
}
```

### File 2: `src/components/AdvancedReport.tsx`

Aggiungere la nuova sezione visuale dopo "Scenari di Crescita" (riga ~298).

### File 3: `src/components/EmailMarketingSurvey.tsx` e `ConversationalSurvey.tsx`

Passare `emailFrequency` come parametro aggiuntivo a `calculateAdvancedReport()`.

---

## Posizione nel report

```text
[Email Health Score]
[Analisi Strategica]
[Situazione Attuale vs Benchmark]
[Analisi Automazioni]
[Scenari di Crescita]
► [📬 Forecast: Il Potenziale della Tua Lista]  ← NUOVO
[Roadmap: Top 3 Azioni]
[Potenziale Annuo Totale]
[Download PDF]
[Prenota Consulenza]
```

---

## Note sui valori

- Il forecast è presentato come **stima indicativa** basata su benchmark di settore, non come garanzia
- Il CR 0.2% per newsletter è il benchmark positivo dichiarato dall'utente (conservativo)
- Il CR 2% per automazioni è il benchmark standard per flussi e-commerce ottimizzati
- I 3 scenari (Attuale / Ottimizzato / Benchmark) mostrano progressione naturale basata su frequenza di invio crescente

