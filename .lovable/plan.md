
# Fix: Link condivisibile non funzionante

## Diagnosi del problema

Il codice esegue questa operazione in sequenza:
```typescript
const { data: saved, error } = await supabase
  .from('survey_submissions')
  .insert({ ... })
  .select('id')   // ← QUESTO FALLISCE
  .single();
```

**Il flusso esatto del fallimento**:

1. `.insert()` riesce perché esiste una policy RLS `INSERT` che permette inserimenti pubblici (anon + authenticated)
2. `.select('id')` dopo l'insert fallisce perché la policy `SELECT` richiede il ruolo `admin` autenticato — l'admin non è loggato come utente Supabase, usa solo una password locale
3. `saved` ritorna `null` e `setReportId(null)` → il pulsante "Link non disponibile" appare

**Conferma**: zero record con `status = 'admin_report'` nel database (oppure ci sono ma il `select` non li restituisce al client).

---

## Due opzioni di fix — Scelgo la più robusta

### Opzione A — Aggiungere policy SELECT per i propri insert (fix RLS)

Aggiungere una policy che permette a chiunque di leggere le righe inserite con `status = 'admin_report'`:
```sql
CREATE POLICY "Allow reading own admin reports"
ON public.survey_submissions
FOR SELECT
USING (status = 'admin_report');
```
Questo è sufficiente per far funzionare il `.select('id')` dopo l'insert.

**Rischio**: espone tutti i report admin in lettura pubblica — chiunque con un UUID può leggere i dati (ma la funzione `get_report_by_id` già fa questo per design).

### Opzione B — Usare una Supabase Edge Function dedicata per il salvataggio (più sicura)

Creare una edge function `save-admin-report` che esegue l'insert con il service role e restituisce l'ID. Nessuna modifica alle policy RLS necessaria.

**Vantaggio**: il salvataggio bypassa RLS completamente usando la chiave service, garantisce sempre l'ID.

---

## Soluzione scelta: Opzione B (Edge Function) + fix SELECT

L'approccio più robusto combina:

1. **Nuova edge function `save-admin-report`** — accetta il payload del report, lo salva con service role, restituisce `{ id: uuid }`
2. **In `AdminSurvey.tsx`**: sostituire il `supabase.from(...).insert()` con una chiamata `fetch` alla edge function
3. **In alternativa più semplice**: aggiungere una policy RLS che permette SELECT su righe con `status = 'admin_report'` — meno codice, stesso risultato pratico dato che la funzione `get_report_by_id` è già pubblica

Poiché il report è già leggibile pubblicamente via `get_report_by_id` (funzione RPC pubblica), la **Opzione A con policy SELECT** è sufficiente e molto più semplice da implementare.

---

## Modifiche tecniche

### Migrazione DB — Nuova policy RLS SELECT per admin reports

```sql
-- Permette al client (anche anonimo) di leggere l'ID subito dopo l'insert
-- Necessario perché .insert().select('id') richiede accesso SELECT
CREATE POLICY "Public can read admin report rows"
ON public.survey_submissions
FOR SELECT
USING (status = 'admin_report');
```

Questo permette che `.select('id').single()` ritorni l'id appena inserito, senza esporre dati PII ulteriori (la policy `get_report_by_id` già filtrava solo `clientReport`).

### File: `src/components/AdminSurvey.tsx`

Aggiungere logging dell'errore nel catch per debug futuro:

```typescript
if (error) {
  console.error('DB insert error:', error.code, error.message);
}
```

E migliorare il messaggio UI "Link non disponibile" con un bottone di retry + tooltip che spiega il problema.

### Miglioramento UX del pulsante link

Attualmente se `reportId` è null mostra solo un warning statico. Aggiungiamo:
- Un pulsante "Riprova salvataggio" che ritenta il save
- Un testo più chiaro

---

## Riepilogo modifiche

| Azione | Tipo |
|---|---|
| Aggiunta policy RLS `SELECT` per `status = 'admin_report'` | Migrazione DB |
| Log errori DB in `AdminSurvey.tsx` | Codice |
| UX migliorata per il fallback "link non disponibile" con retry | Codice |

**Nessun nuovo file.** La migrazione viene eseguita via tool automaticamente.
