
## Refactor completo di `src/pages/AdminReport.tsx`

### Obiettivo
Rendere il login manuale il flusso primario e stabile, eliminando la dipendenza dal listener auth per sbloccare la UI, senza toccare database o backend.

## Implementazione

### 1. Centralizzare tutta la verifica in `verifyAdminAccess(session, source)`
Creare una funzione unica interna al componente che:

- riceve una `session` valida
- incrementa un `lastCheckIdRef` per invalidare risposte vecchie
- imposta `verificationInFlightRef.current = true`
- imposta `loading=true` e `error=''`
- chiama `supabase.auth.getUser()` per confermare l’utente autenticato lato server
- se `getUser()` fallisce o non restituisce `user`:
  - resetta stato auth
  - mostra un errore chiaro tipo `Sessione non valida. Effettua di nuovo l'accesso.`
- chiama la RPC `has_role` con `_user_id` e `_role: 'admin'`
- applica un timeout solo alla RPC, con `Promise.race(...)`
- gestisce questi casi:
  - RPC error: `authenticated=false`, `loading=false`, errore esplicito
  - timeout: `authenticated=false`, `loading=false`, errore `Verifica permessi non riuscita, riprova`
  - admin `true`: `authenticated=true`, `loading=false`, `error=''`
  - admin `false`: esegue `signOut()`, `authenticated=false`, `loading=false`, errore `Non hai i permessi per accedere a questa area`
- restituisce `true | false`
- aggiorna lo stato solo se:
  - il componente è ancora montato
  - il check corrente è ancora l’ultimo valido

### 2. Aggiungere guardie anti-race con `useRef`
Introdurre ref dedicate:

- `isMountedRef` per evitare setState dopo unmount
- `verificationInFlightRef` per bloccare verifiche concorrenti
- `lastCheckIdRef` per scartare risposte fuori ordine
- `manualLoginInFlightRef` per distinguere una verifica partita dal submit manuale da una del listener

Questo evita:
- doppie RPC ravvicinate
- sovrascrittura dello stato da parte di callback vecchi
- loop tra login manuale, `getSession()` e `onAuthStateChange`

### 3. Rendere `handleLogin` il flusso principale
Rifattorizzare `handleLogin` in questo modo:

1. `preventDefault()`
2. `loading=true`, `error=''`, `authenticated=false`
3. `manualLoginInFlightRef.current = true`
4. chiamare `supabase.auth.signInWithPassword({ email, password })`
5. se errore o sessione assente:
   - `loading=false`
   - `authenticated=false`
   - errore `Credenziali non valide`
6. se successo:
   - usare subito la `session` restituita
   - chiamare `await verifyAdminAccess(session, 'manual-login')`
   - non aspettare il listener per sbloccare la UI
7. in `finally`, azzerare `manualLoginInFlightRef`

### 4. Ridurre `onAuthStateChange` a sincronizzazione passiva
Lasciare il listener solo per casi di sync:

- `SIGNED_OUT`:
  - reset completo stato (`authenticated=false`, `loading=false`, `error=''`)
- `SIGNED_IN` e `TOKEN_REFRESHED`:
  - ignorare se è già in corso una verifica
  - ignorare se la verifica arriva dal login manuale appena avviato
  - se c’è una sessione stabile e nessuna verifica in corso, chiamare `verifyAdminAccess(session, 'listener')` in modo controllato
- nessuna logica che rimetta silenziosamente il form login senza errore

### 5. Sistemare il mount iniziale
Nel `useEffect`:

- impostare `isMountedRef.current = true`
- registrare prima `onAuthStateChange`
- poi eseguire `supabase.auth.getSession()`
- se non c’è sessione:
  - `loading=false`
  - `authenticated=false`
- se c’è sessione:
  - chiamare `verifyAdminAccess(session, 'mount')` una sola volta
- al cleanup:
  - `isMountedRef.current = false`
  - unsubscribe del listener

### 6. Eliminare i timeout “ciechi”
Rimuovere la logica attuale che forza `loading=false` dopo 5s/8s senza sapere l’esito.

Sostituirla con:
- timeout locale solo attorno alla RPC `has_role`
- messaggio chiaro in caso di scadenza
- chiusura coerente dello stato in ogni ramo

### 7. Mantenere gli stati del componente coerenti
Per il flusso auth usare in modo rigoroso:

- `loading`
- `authenticated`
- `error`
- `email`
- `password`

Senza lasciare rami con `loading=true`.

Le altre UI state già necessarie al componente possono restare:
- `showPassword`
- `adminTab`

Queste non devono interferire con la logica auth.

### 8. Aggiornare la UX della schermata
Mantenere il layout attuale, ma migliorare i feedback:

- loading screen con spinner e testo `Verifica accesso admin...`
- errore credenziali errate: `Credenziali non valide`
- errore sessione/permessi: messaggi distinti e chiari
- nessun ritorno silenzioso al form
- nessun spinner infinito
- pulsante submit disabilitato durante la verifica

### 9. Preservare il resto del componente
Non cambiare:

- route `/admin/report`
- tab admin (`survey` / `dropoff`)
- contenuto `AdminSurvey` e `DropoffAnalytics`
- RPC esistente `has_role`
- backend, tabelle, migration o policy

## Output da implementare
Produrre il file completo aggiornato `src/pages/AdminReport.tsx`, pronto da usare, con commenti minimi solo nei punti critici della sincronizzazione auth e del timeout RPC.

## Dettagli tecnici
```text
Mount:
  onAuthStateChange(...)
  getSession()
    -> no session => loading false
    -> session => verifyAdminAccess(session, 'mount')

Manual login:
  signInWithPassword()
    -> errore => loading false + errore credenziali
    -> session => verifyAdminAccess(session, 'manual-login')

verifyAdminAccess(session):
  loading true
  getUser()
  rpc has_role con timeout
    -> true => authenticated true
    -> false => signOut + errore permessi
    -> rpc error/timeout => authenticated false + errore chiaro

Auth listener:
  SIGNED_OUT => reset
  SIGNED_IN/TOKEN_REFRESHED => sync controllata solo se nessuna verifica è già in corso
```
