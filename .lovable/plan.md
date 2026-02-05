

## Problema identificato

La Edge Function `verify-website` **non e mai stata deployata** sul backend. Quando il frontend la chiama, riceve un errore 404 e mostra "Errore di connessione".

Inoltre, la logica attuale di verifica e troppo rigida e inaffidabile:
- Cerca keyword e-commerce nell'HTML grezzo (molti siti usano JavaScript rendering, quindi l'HTML e vuoto)
- Richiede almeno 3 keyword per validare, escludendo siti legittimi
- Il fetch puo fallire per timeout o blocchi server-side

## Soluzione proposta

### 1. Deployare la Edge Function
La funzione esiste nel codice ma non e stata deployata. Va deployata immediatamente.

### 2. Semplificare la logica di verifica
Invece di una verifica "profonda" basata su keyword (che e inaffidabile), rendere la verifica piu pragmatica:

- **Verificare che il sito sia raggiungibile** (HTTP 200 o redirect)
- **Verificare che non sia nella blacklist** (brand protetti)
- **Verificare che non sia un URL interno/privato** (SSRF protection)
- **Se il sito risponde**: considerarlo valido. Non cercare keyword nell'HTML perche e troppo inaffidabile con siti JavaScript-rendered
- **Opzionale**: se ci sono keyword e-commerce, aumentare il punteggio di confidence (ma non bloccare se mancano)

### 3. Cambiamento chiave nella logica

La condizione di validita cambia da:
```text
isValid = isReachable AND (isEcommerce OR sectorKeywordsFound >= 2)
```
a:
```text
isValid = isReachable AND NOT isBlacklisted
```

Le keyword diventano solo un indicatore di confidence, non un requisito bloccante.

## Modifiche tecniche

### File: `supabase/functions/verify-website/index.ts`
- Cambiare la logica `isValid` per accettare qualsiasi sito raggiungibile e non in blacklist
- Le keyword e-commerce e di settore restano come bonus per il punteggio `confidence`
- Migliorare il timeout a 15 secondi
- Aggiungere logging piu dettagliato

### Deploy
- Deployare la funzione `verify-website` dopo le modifiche

