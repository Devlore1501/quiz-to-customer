

L'utente vuole conferma che il webhook Make.com sia configurato correttamente e che riceva i test.

## Analisi

**Webhook URL fornito:** `https://hook.eu1.make.com/xvxim6odwyk6vtcdh14qezglimin8opc`

Questo URL corrisponde esattamente a quello documentato nella memoria `mem://integrations/webhooks` ed è quello configurato nel secret `MAKE_WEBHOOK_URL` lato Lovable Cloud.

## Diagnosi del problema "test non arrivato su Make"

Il webhook è configurato correttamente lato codice (`supabase/functions/submit-webhook/index.ts`). I motivi possibili per cui il test non arriva:

1. **Lo scenario su Make.com non è attivo** (toggle ON in alto a destra). Se il modulo "Custom Webhook" è in stato "Listening for data" ma lo scenario è OFF, i payload vengono ignorati.
2. **Il webhook su Make ha "Determine data structure" attivo** e sta aspettando un payload diverso → in tal caso lo riceve ma non lo mostra nella history finché non clicchi "Redetermine".
3. **Non è ancora stato fatto un submit reale** dal quiz dopo le modifiche al payload (l'unico modo per generare un evento è completare il form).
4. **Cache cold-start dell'edge function**: la prima chiamata dopo deploy può tardare 5-10s.
5. **Errore lato edge function** non visibile lato client (es. timeout, validazione fallita).

## Piano d'azione (quando si esce da plan mode)

1. **Lanciare un test diretto** all'edge function `submit-webhook` con `supabase--curl_edge_functions`, passando un payload di esempio realistico (struttura `admin_report` con `quickSummary` completo come da messaggio precedente). Questo simula esattamente cosa il browser invia, senza dover compilare il quiz.
2. **Leggere i log edge function** con `supabase--edge_function_logs` per il function `submit-webhook`, filtrando sugli ultimi minuti, per vedere:
   - Se la chiamata è arrivata
   - Se la validazione è passata
   - Se `Make webhook sent successfully` o `Make webhook failed with status: XXX`
3. **Riportare il risultato all'utente** con diagnosi precisa:
   - Se Make risponde 200 → il problema è lato Make (scenario OFF / data structure)
   - Se Make risponde 4xx/5xx → il problema è il payload o l'URL
   - Se la edge function fallisce prima di chiamare Make → fix lato codice

Nessuna modifica di file necessaria in questa fase: solo diagnosi via tool. Eventuali fix arrivano dopo aver letto i log.

