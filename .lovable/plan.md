

## Drop-off v3: includere il completamento esistente nel calcolo

### Diagnosi rivista

Hai ragione: c'è **1 sessione v3 completata** in DB, non zero. Il mio piano precedente partiva dal presupposto sbagliato che fossero tutte ferme su `companyName`. In realtà:

- Sessioni v3 totali: 6 (non 5)
- Almeno 1 ha `completed = true` con dati reali
- Le altre 5 sono visite/abbandoni precoci

Il problema quindi NON è "nessun dato": è che il funnel attuale **mescola visite-fantasma con tentativi reali**, schiacciando le metriche e nascondendo l'unico completamento valido in mezzo al rumore.

### Cosa cambio in `src/components/DropoffAnalytics.tsx`

**1. Distinzione visite vs tentativi reali**  
Aggiungo `form_data` alla query e classifico ogni sessione:
- **Visita-fantasma**: `current_step = 0` AND `form_data` vuoto AND `completed = false`
- **Tentativo reale**: tutto il resto (incluse abbandonate dopo aver digitato e ovviamente le completate)

**2. Nuova mini-stat sopra il funnel**  
Una riga di 3 card piccole:
- **Page loads**: totale sessioni create
- **Tentativi reali**: chi ha interagito davvero
- **Engagement**: % tentativi / page loads

**3. Funnel e tasso completamento ricalcolati sui tentativi reali**  
Così l'unica sessione v3 completata risulta visibile (es. "1 completata su 1 tentativo reale = 100%") invece di sparire (1/6 = 17%). La barra "Brand" del funnel parte dai tentativi reali, non dalle visite.

**4. Timing usa anche la sessione completata esistente**  
Il blocco "⏱ Tempo di completamento" già previsto userà il dato della sessione v3 completata (started_at → updated_at). Con 1 sola sessione mostro solo "Tempo: Xm Ys" invece delle 4 card medio/mediano/min/max (che hanno senso da ≥3 completamenti in su).

**5. Default tab intelligente**  
Se v3 ha <10 tentativi reali, il default torna a v2; il tab v3 resta cliccabile col badge che mostra il conteggio reale di tentativi (non di visite).

### File modificato
- `src/components/DropoffAnalytics.tsx` (unico)

### Cosa NON cambia
- Hook `usePartialTracking`, schema DB, RLS, edge functions, trigger webhook, logica del quiz

