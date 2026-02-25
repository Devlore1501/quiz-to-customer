

## Diagnosi: Pagina admin bloccata su loading spinner

### Problema identificato
La pagina `/admin/report` resta bloccata sullo spinner di caricamento e non mostra mai il form di login. Ho verificato che:
- L'account admin **esiste** nel database (info@mailift.com con ruolo admin)
- Non ci sono errori JavaScript in console
- Non vengono effettuate chiamate di rete dal componente admin (nessuna richiesta auth o RPC visibile)

### Causa probabile
Il `useEffect` in `AdminReport.tsx` attende che `onAuthStateChange` o `getSession` si risolvano, ma se il client Supabase ha una sessione scaduta in localStorage, potrebbe tentare un refresh del token che non si completa, bloccando l'emissione dell'evento `INITIAL_SESSION`. Se la chiamata RPC `has_role` fallisce con un'eccezione non gestita, `setLoading(false)` non viene mai raggiunto.

### Piano di fix

1. **Aggiungere try/catch** attorno a tutte le chiamate `has_role` RPC nel `useEffect`, assicurando che `setLoading(false)` venga SEMPRE eseguito
2. **Invertire l'ordine**: chiamare `getSession()` prima e usare `onAuthStateChange` solo per aggiornamenti successivi, evitando la race condition attuale
3. **Aggiungere un timeout di sicurezza** (es. 5 secondi) che forza `setLoading(false)` nel caso tutto resti bloccato

### Dettagli tecnici

Il codice attuale in `AdminReport.tsx` (righe 17-43) sarà riscritto in questo modo:

```typescript
useEffect(() => {
  let mounted = true;
  const timeout = setTimeout(() => {
    if (mounted) setLoading(false);
  }, 5000);

  const checkAdmin = async (userId: string) => {
    try {
      const { data } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin' as const,
      });
      return !!data;
    } catch {
      return false;
    }
  };

  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!mounted) return;
    if (session) {
      const isAdmin = await checkAdmin(session.user.id);
      if (mounted) setAuthenticated(isAdmin);
    }
    if (mounted) { setLoading(false); clearTimeout(timeout); }
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      if (!mounted) return;
      if (session) {
        const isAdmin = await checkAdmin(session.user.id);
        if (mounted) setAuthenticated(isAdmin);
      } else {
        if (mounted) setAuthenticated(false);
      }
      if (mounted) { setLoading(false); clearTimeout(timeout); }
    }
  );

  return () => {
    mounted = false;
    clearTimeout(timeout);
    subscription.unsubscribe();
  };
}, []);
```

Questo garantisce che:
- La pagina non resti mai bloccata (timeout di sicurezza)
- Errori RPC non impediscano il rendering
- Lo stato `mounted` previene aggiornamenti su componenti smontati

