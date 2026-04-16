

## Piano: Rimuovere blur e aggiungere dicitura invito nel gate

### Cosa cambia

Nel gate (fase contatti dopo l'analisi), attualmente c'è un box rosso con l'importo della revenue leak **sfocato** (`blur-md`). La richiesta è:

1. **Rimuovere il blur** dall'importo — mostrare il numero reale (o un placeholder leggibile)
2. **Cambiare la dicitura** per invitare a lasciare i dati per vedere il **report di analisi completo**, non per "sbloccare il numero"

### Modifica

**File: `src/components/EmailMarketingSurvey.tsx` (righe 609-618)**

Il box blurred preview diventa un messaggio chiaro senza blur:

- Rimuovere `blur-md` dallo span del numero
- Cambiare il testo da "Revenue leak mensile stimata / Sblocca il report per vedere il numero esatto e la roadmap di recupero" a una dicitura tipo:
  - Titolo: **"Il tuo report è pronto"**
  - Testo: **"Lascia i tuoi dati per accedere al report di analisi completo con roadmap personalizzata e scenari di crescita."**
- Cambiare lo stile del box da rosso (revenue leak) a lime/neutro (più invitante, meno allarmante)
- Rimuovere il numero finto `00k€` e sostituire con un'icona documento/report

Un solo file modificato, ~10 righe.

