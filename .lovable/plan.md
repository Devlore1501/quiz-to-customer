## Recupero lead perso + fix del flusso di submit

### 1. Recupero manuale di Giuseppe Tassatone

- Inserire in `survey_submissions` la riga mancante usando i dati salvati nella `partial_submission` di stamattina (14 lug 2026): nome, email `giuseppetassatone2@gmail.com`, telefono `3804944836`, `report_data` ricostruito dal `form_data` del partial, `qualified` calcolato in base alle soglie, `lead_quality` derivato.
- Il trigger `trigger_submit_webhook` scatterà automaticamente all'insert (report_data passa da NULL a valorizzato) e invierà il payload a Make + GHL.
- Collegare la partial esistente valorizzando `submission_id` con l'id della nuova riga.
- Mario Rossi: skip (email chiaramente fake `info@mariotossi.com`).

### 2. Patch al flusso di submit per non perdere più lead

**File:** `src/components/EmailMarketingSurvey.tsx` (`handleGateSubmit` + `saveLeadToDatabase`)

- `saveLeadToDatabase` oggi ritorna `null` in silenzio se la INSERT iniziale fallisce. Modificarla per: (a) fare `.select('id').single()` e propagare l'errore, (b) mostrare toast d'errore all'utente, (c) NON procedere oltre.
- In `handleGateSubmit`, se `newLeadId` è `null` → bloccare il flusso, mostrare errore "Riprova", e NON chiamare `markCompleted`. Rimuovere il ramo fallback che tenta una INSERT completa (viene comunque bloccato dalla RLS `qualified IS NULL AND report_data IS NULL AND lead_quality IS NULL`).
- Sull'UPDATE finale (quella che aggiunge `qualified` + `report_data` + `lead_quality`): controllare `error` esplicitamente e, in caso di fallimento, mostrare toast e NON marcare `completed`.
- Chiamare `markCompleted(submissionId)` solo dopo conferma che sia la UPDATE che il webhook siano andati a buon fine (o almeno la UPDATE, dato che il trigger DB lancia comunque il webhook).

### 3. Policy RLS UPDATE per anon su `survey_submissions`

Oggi la UPDATE finale (aggiunta di `report_data`, `qualified`, `lead_quality`) funziona solo perché la INSERT iniziale ha creato la riga con lo stesso session. Ma non c'è nessuna UPDATE policy per anon → la UPDATE viene bloccata silenziosamente in alcuni percorsi.

- Aggiungere una policy UPDATE per `anon` su `survey_submissions` che consenta la modifica solo della riga con `session_id` corrispondente all'header `x-session-id` verificato dal segreto (stesso pattern RPC già usato per `partial_submissions`).
- In alternativa più semplice: creare una RPC `finalize_submission(session_id, session_secret, report_data, qualified, lead_quality)` con `SECURITY DEFINER` che verifica l'hash del segreto contro la `partial_submission` collegata e fa la UPDATE server-side. Il client chiama l'RPC invece della UPDATE diretta.

Approccio consigliato: **RPC `finalize_submission`** — coerente col pattern `update_partial_submission` già in uso, evita di aprire una policy UPDATE per anon che sarebbe più difficile da vincolare in modo sicuro.

### Ordine di esecuzione

1. Migrazione: creare RPC `finalize_submission` (SECURITY DEFINER, verifica hash segreto).
2. Recovery data: INSERT manuale Giuseppe + UPDATE partial con `submission_id`.
3. Codice: refactor `saveLeadToDatabase` + `handleGateSubmit` per usare l'RPC e gestire gli errori esplicitamente con toast.
4. Verifica end-to-end su `/quiz` in sandbox: compilazione completa → riga in `survey_submissions` + `partial.submission_id` popolato + webhook triggered.

### Note tecniche

- Il trigger `trigger_submit_webhook` scatta su INSERT o UPDATE quando `report_data` passa da NULL a NOT NULL — quindi con la nuova RPC (che fa UPDATE del `report_data`) il webhook parte automaticamente lato DB, rendendo la chiamata client-side a `submit-webhook` ridondante (ma la teniamo come fallback).
- La policy `Allow public inserts` su `survey_submissions` resta invariata: continua a permettere solo INSERT "vuote" (name/email/phone senza report), coerente con la separazione INSERT-iniziale vs UPDATE-finale.
