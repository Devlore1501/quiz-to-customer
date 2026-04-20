

## Problema: login admin appeso, mai risolto

### Diagnosi (confermata da DB + log)

1. ✅ L'utente `info@mailift.com` esiste e ha ruolo `admin` in `user_roles`
2. ✅ Il login Supabase va a buon fine (`200 OK` su `/token`)
3. ✅ La RPC `has_role` invocata direttamente sul DB ritorna `true`
4. ❌ Lato client, dopo `SIGNED_IN`, la chiamata `supabase.rpc('has_role', ...)` **non risolve mai** → scatta il safety timeout dopo 5s e `authenticated` resta `false` → schermata di login mostrata di nuovo

### Causa tecnica

In `src/pages/AdminReport.tsx` la chiamata `await supabase.rpc(...)` viene fatta **dentro** il callback di `onAuthStateChange`. Questo è un anti-pattern documentato del client Supabase: il callback gira dentro il lock interno di GoTrue, e qualsiasi await su un'altra chiamata Supabase rimane appesa fino al timeout, causando il deadlock che vediamo nei log.

### Fix (1 file, 1 modifica chirurgica)

In `src/pages/AdminReport.tsx`, deferire le chiamate Supabase fatte dentro `onAuthStateChange` con `setTimeout(..., 0)`:

```ts
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (_event, session) => {
    if (!mounted) return;
    if (session) {
      // Defer Supabase calls to avoid deadlock inside the auth callback
      setTimeout(async () => {
        const isAdmin = await checkAdmin(session.user.id);
        if (mounted) {
          setAuthenticated(isAdmin);
          setLoading(false);
          clearTimeout(timeout);
        }
      }, 0);
    } else {
      setAuthenticated(false);
      setLoading(false);
      clearTimeout(timeout);
    }
  }
);
```

Stessa logica resta valida per `getSession().then(...)` che già è fuori dal callback, quindi non ha bisogno di modifiche.

### Risultato atteso

Dopo il fix:
- Login con `info@mailift.com` / `mailift2024`
- `onAuthStateChange` parte → `setTimeout` deferisce → `has_role` risolve in pochi ms → `authenticated = true` → entri nel pannello admin senza più vedere il safety timeout warning nei log.

### Nessun'altra modifica richiesta

- Le RLS e la funzione `has_role` sono corrette
- Il ruolo nel DB è corretto
- Le credenziali sono corrette
- Il bypass token è stato giustamente rimosso nel fix di sicurezza precedente, non va ripristinato

