

## Modifiche richieste

Rimuovere il campo "Nome Azienda" dal questionario e permettere qualsiasi email (non solo aziendale).

## Cosa cambia

### 1. Database: rendere `company_name` opzionale
Il campo `company_name` nella tabella `survey_submissions` e attualmente `NOT NULL`. Va reso opzionale con una migrazione.

### 2. Frontend: rimuovere lo step "Nome Azienda"
In entrambi i componenti (`EmailMarketingSurvey.tsx` e `ConversationalSurvey.tsx`):
- Rimuovere lo step/domanda "Come si chiama la tua azienda?"
- Aggiornare i riferimenti a `companyName` nei messaggi successivi (es. "Qual e il sito web di {companyName}" diventa generico)

### 3. Frontend: accettare qualsiasi email
In entrambi i componenti:
- Rimuovere la lista `personalDomains` e la logica di blocco email personali
- La funzione `validateBusinessEmail` diventa una semplice validazione formato email
- Cambiare il testo da "email aziendale" a "email"
- Cambiare il placeholder da `nome@tuaazienda.it` a `nome@email.com`

### 4. Edge Function: aggiornare validazione
In `supabase/functions/submit-webhook/index.ts`:
- Rimuovere `company_name` dai campi obbligatori nella validazione legacy

### 5. Riferimenti vari
- Aggiornare i payload webhook e database insert dove `companyName` viene usato (passare stringa vuota o omettere)
- Aggiornare i messaggi nel ConversationalSurvey che fanno riferimento al nome azienda

## Dettagli tecnici

### Migrazione SQL
```sql
ALTER TABLE survey_submissions ALTER COLUMN company_name DROP NOT NULL;
ALTER TABLE survey_submissions ALTER COLUMN company_name SET DEFAULT '';
```

### File modificati
- `src/components/EmailMarketingSurvey.tsx` — rimuovere step companyName, semplificare validazione email
- `src/components/ConversationalSurvey.tsx` — rimuovere step company, semplificare validazione email, aggiornare messaggi
- `supabase/functions/submit-webhook/index.ts` — rimuovere company_name da requiredFields
