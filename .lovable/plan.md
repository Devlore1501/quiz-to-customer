

# Riordino domande quiz + contatti in un unico step

## Nuovo ordine delle domande

1. **Hook** (schermata introduttiva esistente)
2. **Settore** (radio)
3. **Sito web** (input con verifica) -- subito dopo il settore, come richiesto
4. **Fatturato mensile** (radio) -- qualifica: sotto 15K = disqualificato
5. **Spesa Ads** (radio) -- qualifica: sotto 3K = disqualificato
6. **% Revenue da email** (radio)
7. **Dimensione lista** (radio)
8. **Frequenza invio** (radio)
9. **Flussi attivi** (checkbox)
10. **Motivazione** (radio)
11. **Contatti** (step unico: nome, telefono, email, accettazione termini)

## Contatti unificati in un unico step

Lo step finale "Contatti" mostrera in un'unica schermata:
- Campo nome completo
- Campo telefono WhatsApp
- Campo email (con validazione)
- Checkbox accettazione termini
- Campo honeypot nascosto (per anti-bot)

Tutte le validazioni esistenti (email con @, telefono minimo 8 cifre, termini obbligatori) restano attive. Il pulsante "Genera Report" si abilita solo quando tutti i campi sono validi.

## Modifiche tecniche

### 1. Nuovo tipo di step `contacts-combined`
Aggiunta di un nuovo tipo di step nell'array `steps` che raggruppa tutti i campi di contatto in una singola schermata con layout verticale.

### 2. Riordino array `steps`
L'array `steps` viene riscritto con il nuovo ordine. Lo step "emailSatisfaction" viene rimosso dal flusso (non era nella tua lista).

### 3. Spostamento logica salvataggio lead
Attualmente il lead viene salvato dopo la verifica del sito web. Con il nuovo ordine, il salvataggio avverra nello step contatti finale, poiche i dati personali arrivano per ultimi.

### 4. Verifica sito web
La funzione `handleWebsiteContinue` continuera a verificare il sito, ma non salvera piu il lead (lo fara lo step contatti). Passera `formData.sector` che ora e gia disponibile essendo lo step precedente.

### 5. Partial tracking
Il tracking parziale continuera a funzionare normalmente con i nuovi indici di step. I dati del form vengono tracciati ad ogni cambiamento, quindi anche senza i contatti salvati nel DB, il sistema `partial_submissions` cattura tutto.

### 6. ConversationalSurvey
Se vuoi, posso applicare lo stesso riordino anche al `ConversationalSurvey`. Per ora modifico solo l'`EmailMarketingSurvey`.

