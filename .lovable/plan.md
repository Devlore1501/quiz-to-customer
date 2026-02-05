

## Problema
L'URL del report (`reportUrl`) viene gia incluso nel payload del webhook dal frontend, ma viene generato usando `window.location.origin`. Questo significa che:
- Se il quiz viene compilato dall'URL di preview, il `reportUrl` punta al dominio di preview
- Se il quiz viene compilato dall'URL pubblicato, il `reportUrl` punta al dominio corretto

Inoltre, se `currentLeadId` e `null` al momento dell'invio, il `reportUrl` sara `null`.

## Soluzione
Rendere il `reportUrl` piu affidabile in due modi:

### 1. Usare sempre il dominio pubblicato per il report URL
Invece di `window.location.origin`, usare il dominio di produzione hardcoded:

```text
https://quiz-to-customer.lovable.app/report/{leadId}
```

Questo garantisce che l'URL nei webhook sia sempre quello pubblico, indipendentemente da dove viene compilato il quiz.

### 2. Aggiungere il reportUrl anche lato Edge Function (doppia sicurezza)
Nella Edge Function `submit-webhook`, se il `reportUrl` manca dal payload, generarlo automaticamente usando il `submissionId`.

## Modifiche tecniche

### File: `src/components/EmailMarketingSurvey.tsx`
- Cambiare la generazione del `reportUrl` da `window.location.origin` a `https://quiz-to-customer.lovable.app`

### File: `src/components/ConversationalSurvey.tsx`
- Stessa modifica del file sopra

### File: `supabase/functions/submit-webhook/index.ts`
- Aggiungere logica per garantire che `reportUrl` sia sempre presente nel payload
- Se manca, generarlo usando il `submissionId` e il dominio pubblicato
- Loggare il `reportUrl` per debug
