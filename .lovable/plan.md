

## Tracciamento utenti che abbandonano il quiz

### Problema attuale
Il lead viene salvato nel database solo dopo lo step "sito web" (step 5 su 14 in EmailMarketingSurvey). Chi abbandona prima -- ad esempio dopo aver inserito nome o email -- viene perso completamente.

### Soluzione

Creare una tabella `partial_submissions` separata che traccia ogni progresso nel quiz in tempo reale, indipendentemente dal completamento.

### 1. Nuova tabella `partial_submissions`

```text
partial_submissions
- id (uuid, PK)
- session_id (text) -- identificatore univoco della sessione browser
- survey_type (text) -- 'email_marketing' o 'conversational'
- current_step (integer) -- ultimo step raggiunto
- current_step_name (text) -- nome leggibile dello step (es. "fullName", "sector")
- total_steps (integer) -- numero totale di step nel quiz
- form_data (jsonb) -- dati parziali raccolti fino a quel punto
- started_at (timestamp)
- updated_at (timestamp)
- completed (boolean, default false) -- se il quiz e stato completato
- abandoned (boolean, default false) -- se l'utente ha abbandonato
- submission_id (uuid, nullable) -- riferimento al record in survey_submissions se completato
```

### 2. Logica frontend

In entrambi i componenti (EmailMarketingSurvey e ConversationalSurvey):

- **All'avvio del quiz**: generare un `sessionId` univoco e creare un record in `partial_submissions`
- **Ad ogni cambio di step**: aggiornare il record con lo step corrente e i dati del form raccolti fino a quel momento
- **Al completamento**: segnare `completed = true` e collegare il `submission_id`
- **All'abbandono** (beforeunload): segnare `abandoned = true`

I dati sensibili (email, telefono) vengono salvati solo se l'utente li ha gia inseriti volontariamente nel form.

### 3. RLS Policies

La tabella avra policy permissive per INSERT e UPDATE pubblici (dato che gli utenti non sono autenticati), e SELECT limitato agli admin.

### 4. File modificati

- **Migrazione SQL**: creazione tabella `partial_submissions` con indici e RLS
- `src/components/EmailMarketingSurvey.tsx`: aggiunta tracking sessione e aggiornamento ad ogni step
- `src/components/ConversationalSurvey.tsx`: stessa logica di tracking
- `src/hooks/usePartialTracking.ts` (nuovo): hook riutilizzabile per la logica di tracking

### 5. Dettagli tecnici dell'hook

```text
usePartialTracking(surveyType, formData, currentStep, stepName, totalSteps)
```

L'hook:
- Genera un sessionId al mount (usando crypto.randomUUID)
- Crea il record iniziale in partial_submissions
- Aggiorna il record ad ogni cambio di step (debounced per evitare troppe chiamate)
- Ascolta l'evento `beforeunload` per segnare abandoned = true
- Al completamento del quiz, espone una funzione `markCompleted(submissionId)` da chiamare

