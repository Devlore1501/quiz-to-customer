
# Fix webhook non inviati + re-invio submission 15-16 febbraio

## Problema identificato

Dopo il riordino del quiz, la funzione `saveLeadToDatabase()` non viene piu chiamata prima di `handleSubmit()`. Risultato:
- `leadId` e sempre `null` al momento del submit
- Il record viene creato via fallback insert, ma il nuovo ID non viene usato per il webhook
- `reportUrl` e `null` (dipende da `currentLeadId`)
- Il webhook parte con dati incompleti o non parte affatto
- 3 submission del 15-16 febbraio risultano `make_synced: false`

## Fix nel codice

### 1. Modificare il click handler del pulsante submit (contacts-combined)

Nel pulsante "Genera il mio Report Gratuito" (riga 1696), cambiare da:

```
onClick={() => handleSubmit()}
```

a una funzione che prima salva il lead, poi fa il submit:

```
onClick={async () => {
  const newLeadId = await saveLeadToDatabase();
  await handleSubmit(newLeadId);
}}
```

Questo garantisce che:
- Il lead viene salvato nel DB con un ID valido
- L'ID viene passato a `handleSubmit` per generare il `reportUrl`
- Il webhook riceve tutti i dati completi, incluso `submissionId`

### 2. Re-invio webhook per le 3 submission bloccate

Creare un invio manuale dei webhook per le 3 submission gia completate:
- `f70a9c47` - Cristina locato (crlov@hotmail.it)
- `1a71c91e` - Lucio (l.carli@mediterranea.it) 
- `5311a887` - Giacomo benedettini (giacomo.benedettini1@gmail.com)

Questo verra fatto chiamando l'edge function `submit-webhook` con i dati `report_data` gia salvati nel DB per ciascuna submission.

## Dettagli tecnici

File modificato: `src/components/EmailMarketingSurvey.tsx`

La modifica e minima (1 riga) ma critica: il flusso diventa:
1. Utente clicca "Genera Report"
2. `saveLeadToDatabase()` crea il record nel DB e restituisce l'ID
3. `handleSubmit(newLeadId)` usa quell'ID per generare `reportUrl` e inviare il webhook con `submissionId`
4. Il webhook nell'edge function valida la submission e invia a Make.com e GHL

Per il re-invio, leggero i `report_data` dal DB e li inviero manualmente tramite l'edge function per ciascuna delle 3 submission.
