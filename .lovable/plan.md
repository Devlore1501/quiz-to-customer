

## Piano: Creare account admin per accedere ai report

### Problema
I report admin salvati ci sono tutti nel database, ma non esiste nessun utente con ruolo `admin` nel sistema di autenticazione. Serve creare l'account.

### Cosa farò

1. **Creare un edge function `create-admin`** che:
   - Accetta email e password
   - Crea l'utente in auth usando il service role key
   - Assegna il ruolo `admin` nella tabella `user_roles`
   - È protetta da un secret token per evitare abusi

2. **Chiamare la function** per creare il tuo account admin

### Cosa ti servirà
- Dimmi **email** e **password** che vuoi usare per l'accesso admin

### Risultato
Potrai fare login su `/admin/report` e vedere tutti i report salvati (Gliartigianidelriposo.it, Alessandro Vicaretti, Marco Perinelli, ecc.)

### Dettagli tecnici
- Edge function con `SUPABASE_SERVICE_ROLE_KEY` per creare utenti
- Insert in `user_roles` con ruolo `admin`
- La function verrà eliminata dopo l'uso per sicurezza

