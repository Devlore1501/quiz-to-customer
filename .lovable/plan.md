

## Diagnosi: Login admin resta bloccato sullo spinner

### Problema
Dopo aver inserito le credenziali e cliccato "Accedi", la pagina resta sullo spinner infinito. Il login ha successo (status 200) ma l'app non procede mai alla dashboard admin.

### Causa identificata
La funzione `handleLogin` non ha un blocco `try/catch` globale. Se la chiamata RPC `has_role` fallisce con un'eccezione (invece di restituire un errore nel campo `error`), `setLoading(false)` non viene mai eseguito e lo spinner resta per sempre.

Inoltre c'e una race condition: quando `signInWithPassword` ha successo, `onAuthStateChange` scatta e chiama `checkAdmin`. Contemporaneamente `handleLogin` chiama anche RPC. Le due operazioni possono interferire tra loro.

### Piano di fix

1. **Wrappare `handleLogin` in try/catch globale** per garantire che `setLoading(false)` venga SEMPRE eseguito
2. **Semplificare il flusso**: dopo `signInWithPassword`, lasciare che sia `onAuthStateChange` a gestire la verifica admin, invece di duplicare la logica in `handleLogin`
3. **Aggiungere console.log diagnostici** per capire dove si blocca, nel caso il problema persista

### Dettagli tecnici

Il `handleLogin` (righe 64-94) sarà riscritto così:

```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  try {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Credenziali non valide. Riprova.');
      setLoading(false);
      return;
    }

    // onAuthStateChange gestirà la verifica admin e setAuthenticated/setLoading
    // Aggiungiamo un timeout di sicurezza nel caso onAuthStateChange non risponda
    setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('Admin login: timeout after signIn, forcing loading=false');
          return false;
        }
        return prev;
      });
    }, 8000);
  } catch (err) {
    console.error('Admin login error:', err);
    setError('Errore durante il login. Riprova.');
    setLoading(false);
  }
};
```

Questo elimina la chiamata RPC duplicata da `handleLogin` e lascia che `onAuthStateChange` (che ha gia il try/catch) gestisca tutto. In piu aggiunge un timeout di sicurezza e un try/catch globale.

