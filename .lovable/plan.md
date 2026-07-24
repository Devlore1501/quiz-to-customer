## Diagnosi (invariata)

L'INSERT iniziale in `survey_submissions` fallisce con `42501` perché la policy INSERT richiede `qualified IS NULL` ma la colonna ha `DEFAULT true` e il client non riesce a forzare NULL sulla riga finale → check clause = false → toast "Errore invio".

## Nuova regola di qualificazione

`qualified = true` solo se il lead è davvero in target, cioè `monthly_revenue` **non è** la fascia `under-10k` (fascia "Meno di 10.000€/mese"). Tutti gli altri casi → `qualified = false`. Al momento dell'INSERT iniziale il lead è ancora "in_progress", quindi non ancora qualificato: parte a `false`.

## Fix — una singola migrazione

### 1. Default colonna e stato iniziale coerente

```sql
ALTER TABLE public.survey_submissions
  ALTER COLUMN qualified SET DEFAULT false;

-- allinea i record "in_progress" senza report a non-qualificato
UPDATE public.survey_submissions
   SET qualified = false
 WHERE status = 'in_progress' AND report_data IS NULL;
```

### 2. Policy INSERT: consente solo lo stato iniziale non-qualificato

```sql
DROP POLICY "Allow public inserts" ON public.survey_submissions;

CREATE POLICY "Allow public inserts"
ON public.survey_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    (status IS NULL OR status = ANY (ARRAY['completed','in_progress','disqualified']))
    AND (qualified IS NULL OR qualified = false)     -- ← al primo insert NON è qualificato
    AND lead_quality IS NULL
    AND report_data IS NULL
    AND email_health_score IS NULL
    AND yearly_potential IS NULL
    AND current_email_revenue IS NULL
    AND benchmark_email_revenue IS NULL
    AND revenue_gap IS NULL
    AND disqualification_reason IS NULL
    AND (make_synced IS NULL OR make_synced = false)
    AND (ghl_synced IS NULL OR ghl_synced = false)
  )
);
```

Ora il `.insert({..., qualified: null})` del client passa (default = false, check = OK).

### 3. `finalize_submission`: calcola `qualified` in base al fatturato

Sostituire la vecchia funzione (stessa firma a 21 parametri) e cambiare la riga fissa `qualified = true` con:

```sql
qualified = (p_monthly_revenue IS NOT NULL AND p_monthly_revenue <> 'under-10k'),
```

Tutto il resto della funzione resta invariato. `GRANT EXECUTE` uguale a quello attuale.

## Frontend

Nessuna modifica funzionale al codice React necessaria:

- `saveLeadToDatabase` continua a mandare `qualified: null` → default `false` → policy OK.
- `handleGateSubmit` chiama `finalize_submission`, che ora imposta `qualified` correttamente.

`AdminSurvey.tsx` legge già `qualified` dal DB, quindi mostrerà lo stato reale (true solo per lead ≥10k).

## Verifica dopo il fix

1. `curl` diretto come anon con il payload del client → 201, riga con `qualified=false, status='in_progress'`.
2. Compilazione end-to-end in preview con `monthly_revenue = "under-10k"` → riga finale `qualified=false`, `status='completed'`.
3. Compilazione con `monthly_revenue ∈ {10-25k, 25-50k, …}` → riga finale `qualified=true`.
4. Webhook trigger (`submit_webhook_on_report_ready`) parte da solo in entrambi i casi; il payload include `qualified` reale per Make/GHL.
5. Admin: filtro "qualificati" mostra solo i ≥10k.
