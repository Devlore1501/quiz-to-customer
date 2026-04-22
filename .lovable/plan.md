

## Obiettivo
Ridurre l'abbandono iniziale del quiz aggiungendo:
1. Una **schermata intro** con CTA grande "Inizia il quiz"
2. Una **nuova prima domanda** sul nome del brand
3. **Riordinare** le prime domande: Brand → Sito → Settore → Fatturato → resto invariato

## Modifiche previste

### 1. Nuova schermata intro (welcome)
Prima ancora di mostrare la prima domanda, l'utente vede una landing page dedicata con:
- Logo Mailift
- Titolo grande e sottotitolo (riprendendo lo stile attuale "Quanto stai perdendo ogni mese?")
- 3 bullet rapidi che spiegano cosa otterrà (es: "report personalizzato", "in 2 minuti", "100% gratuito")
- Pulsante CTA grande arancione **"Inizia il quiz →"**
- Nota in basso "🔒 Dati riservati, nessuno spam"

Solo al click sul pulsante parte la prima domanda. Questo riduce gli abbandoni passivi di chi atterra senza capire cosa sta vedendo.

### 2. Nuova domanda "Brand"
Aggiunta come **prima domanda del quiz** (step 0):
- Categoria: "Brand"
- Titolo: "Come si chiama il tuo brand?"
- Tipo: input testo obbligatorio
- Pulsante "Continua" attivo solo se il campo non è vuoto
- Salvato nel campo `company_name` già esistente nel DB e inviato a Make.com / GoHighLevel come `companyName` nel payload del webhook (oggi viene mandato vuoto)

### 3. Riordino delle prime domande
Nuovo ordine:

| # | Domanda | Prima era |
|---|---|---|
| 1 | **Brand** (nuovo) | — |
| 2 | **Sito web** | era ultima |
| 3 | **Settore** | era 2ª |
| 4 | **Fatturato** | era 1ª |
| 5 | Piattaforma | invariato |
| 6 | Email Tool | invariato |
| 7 | Revenue Email | invariato |
| 8 | Automazioni | invariato |
| 9 | Segmentazione | invariato |
| 10 | Frequenza | invariato |
| 11 | Lista Email | invariato |
| 12 | Obiettivo | invariato |

Totale: 12 domande (oggi sono 11).

### 4. Logica esistente da preservare
- **Squalifica fatturato <10k€**: continua a funzionare, scatta dallo step 4 invece che dallo step 1
- **Insight cards** (oggi mostrate dopo gli step 0, 4, 5): aggiornate ai nuovi indici per mantenere lo stesso punto narrativo del quiz
- **Settore "Altro" + custom input**: invariato
- **Tracking parziale** (`partial_submissions`): continua a funzionare con i nuovi step name
- **Webhook payload Make/GHL**: ora `companyName` non sarà più vuoto

## File coinvolti
- `src/components/EmailMarketingSurvey.tsx` (unico file da modificare)

## Dettagli tecnici

```text
Phase machine attuale: quiz → insight → analyzing → gate → report
Phase machine nuova:   intro → quiz → insight → analyzing → gate → report
                       ↑ nuovo

FormData:
  companyName: string (nuovo campo, obbligatorio)

STEPS array (nuovo ordine):
  [0] Brand        (input,  field: companyName)   ← nuovo
  [1] Sito web     (input,  field: website)       ← spostato
  [2] Settore      (radio,  field: sector)
  [3] Fatturato    (radio,  field: monthlyRevenue) ← squalifica qui
  [4..11] resto invariato

INSIGHT_AFTER_STEPS: aggiornato per allinearsi al nuovo ordine
```

Nessuna modifica a database, RLS, edge function, webhook structure o calcolo report.

