

## Fix: Tracciamento parziale e validazione input

### Problemi identificati

**1. I dati parziali non vengono mai aggiornati nel database**

Il database mostra tutti i record bloccati a `current_step: 0` con `form_data: {}`. Il problema e che l'hook aggiorna solo quando `currentStep` cambia, ma il confronto `currentStep === lastStepRef.current` blocca il primo update perche `lastStepRef` viene inizializzato a `-1` e poi impostato al valore corrente prima che il debounce salvi i dati. Inoltre il `formData` non viene salvato se l'utente resta sullo stesso step.

**Soluzione**: Aggiungere un effetto separato che salva il `form_data` periodicamente (debounced) ogni volta che cambia, indipendentemente dal cambio di step. Questo assicura che i dati vengano catturati anche mentre l'utente compila un campo.

**2. L'abbandono non viene registrato**

Il `beforeunload` usa `fetch` con `keepalive`, ma il `formData` nella closure potrebbe essere stale (non aggiornato). Inoltre la chiusura della closure cattura sempre la versione iniziale dei dati.

**Soluzione**: Usare un `ref` per mantenere sempre la versione piu recente di `formData`, cosi il `beforeunload` handler invia sempre i dati aggiornati.

**3. Email senza @ viene accettata**

La funzione `validateEmail` restituisce `status: 'idle'` (non errore) quando l'email non contiene `@`. Il pulsante "Continua" e abilitato se lo status non e `'invalid'`, quindi `'idle'` passa. 

**Soluzione**: Cambiare la validazione per restituire `'invalid'` quando l'email non contiene `@` o non ha un formato valido, e solo `'idle'` quando il campo e vuoto.

**4. Nessun controllo sul numero di telefono**

Lo step del telefono usa `single-input` che accetta qualsiasi testo non vuoto.

**Soluzione**: Aggiungere validazione per il telefono che richieda almeno 8 cifre e accetti solo numeri, spazi e il prefisso +.

---

### Modifiche tecniche

**`src/hooks/usePartialTracking.ts`**:
- Aggiungere `formDataRef` (useRef) aggiornato ad ogni render per avere sempre i dati freschi nel `beforeunload`
- Aggiungere effetto debounced che salva `form_data` ogni volta che cambia (non solo al cambio di step)
- Usare `formDataRef.current` nel handler `beforeunload` invece della closure stale

**`src/components/EmailMarketingSurvey.tsx`**:
- Modificare `validateEmail`: restituire `'invalid'` per email senza `@` o senza formato corretto, `'idle'` solo se campo vuoto
- Aggiungere validazione telefono nello step `phone`: minimo 8 cifre, solo caratteri validi (+, numeri, spazi)
- Bloccare il pulsante "Continua" sullo step telefono se il numero non supera la validazione

### File modificati
- `src/hooks/usePartialTracking.ts`
- `src/components/EmailMarketingSurvey.tsx`

