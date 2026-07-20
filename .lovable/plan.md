## Implementazione: partial webhooks + nuovi campi + prefill URL

### 1. Migration DB

- `survey_submissions`: aggiungi 4 colonne nullable → `platform`, `email_tool`, `segmentation`, `email_frequency`.
- `partial_submissions`: aggiungi `partial_synced boolean NOT NULL DEFAULT false` + `partial_synced_at timestamptz` + indice parziale `(updated_at) WHERE completed = false AND partial_synced = false`.
- `finalize_submission`: **DROP** della firma vecchia (17 arg), poi **CREATE** identica ma con 4 parametri in coda (`p_platform`, `p_email_tool`, `p_segmentation`, `p_email_frequency`, tutti `DEFAULT NULL`). Inseriti nell'`UPDATE` con `COALESCE`. Mantiene `SECURITY DEFINER`, validazione `session_secret`, collegamento partial. GRANT EXECUTE ad `anon, authenticated` sulla nuova firma.

### 2. Edge Function `send-partial-webhooks`

Nuova function in `supabase/functions/send-partial-webhooks/index.ts`:

- Modellata su `submit-webhook` (stessi CORS + secrets `MAKE_WEBHOOK_URL` / `GHL_WEBHOOK_URL`).
- `?minutes=` in query (default 30).
- Query con service role: `partial_submissions` dove `completed=false AND partial_synced=false AND updated_at < now() - '<minutes> min' AND form_data->>'email' IS NOT NULL AND form_data->>'email' <> ''`.
- Per ogni riga: costruisce payload **flat** con etichette leggibili (replica `labelFor`/`labelsFor` + tutti gli array `sectorOptions`, `platformOptions`, ecc. dentro la function), aggiunge `tag: "partial"`, `session_id`, `current_step`, `current_step_name`, `total_steps`, `started_at`, `updated_at`, `report_url` (`quiz-to-customer.lovable.app/quiz?resume=<session_id>` — informativo).
- POST parallelo a Make + GHL. Se almeno uno OK → `UPDATE partial_synced=true, partial_synced_at=now()`. Se entrambi falliscono → riga intatta (retry al prossimo giro).
- Ritorna `{processed, sent, failed}`.
- Aggiunge blocco `[functions.send-partial-webhooks] verify_jwt = false` in `supabase/config.toml`.

### 3. Cron via `supabase--insert`

Abilita `pg_cron` e `pg_net`, poi:

```sql
select cron.schedule(
  'send-partial-webhooks-every-10min',
  '*/10 * * * *',
  $$ select net.http_post(
       url:='https://vsvffgngmzgpgvzwkdwr.supabase.co/functions/v1/send-partial-webhooks',
       headers:='{"Content-Type":"application/json","apikey":"<anon>"}'::jsonb,
       body:='{}'::jsonb
     ); $$
);
```

### 4. Prefill da URL (anti-PII a Meta)

**`index.html`** — inline script come **PRIMO** child di `<head>`, sopra Hyros/GTAG/Meta Pixel:

```js
(function(){
  try{
    var p=new URLSearchParams(location.search), out={};
    ['email','e','name','n','fullName','phone'].forEach(function(k){
      var v=p.get(k); if(v){ out[k]=v; p.delete(k); }
    });
    if(Object.keys(out).length){
      sessionStorage.setItem('ml_prefill', JSON.stringify(out));
      history.replaceState(null,'', location.pathname+(p.toString()?'?'+p:'')+location.hash);
    }
  }catch(_){}
})();
```

Così quando GTAG/Meta Pixel leggono `location.href` per `PageView`, la query è già pulita → niente PII a Meta, niente ad-account a rischio.

**`EmailMarketingSurvey.tsx`** — estendo il `useEffect` esistente (riga ~666) senza toccare `trackEngagedLead`: legge da URL con fallback a `sessionStorage.ml_prefill`; supporta `email`/`e`, `name`/`n`/`fullName`, `phone`; popola `formData` (email + fullName + phone); mantiene `setEmailValidation` + `trackEngagedLead(email)`.

**`usePartialTracking.ts`** — accetta `initialFormData?: Record<string,unknown>` e lo usa nell'insert iniziale al posto di `{}`, così email/nome sono presenti dal PRIMO record (abbandoni <500ms).

### 5. Nuovi campi in `handleGateSubmit`

- INSERT iniziale `survey_submissions`: aggiungo `platform`, `email_tool`, `segmentation`, `email_frequency`.
- Chiamata a `finalize_submission`: aggiungo i 4 nuovi parametri.
- `AdminSurvey.tsx` + `DropoffAnalytics.tsx`: aggiungo le 4 colonne nella visualizzazione admin.

### 6. Test end-to-end via Playwright + curl edge

1. `/quiz?email=test@test.com&name=Mario%20Rossi` → URL pulito, email prefillata.
2. Verifico primo `partial_submissions` con `form_data.email` già valorizzato.
3. `curl` a `send-partial-webhooks?minutes=0` → controllo payload arrivi + `partial_synced=true`.
4. Rilancio → 0 righe processate.
5. Completo il quiz → webhook normale parte con tag diverso, campi nuovi salvati.

### Note tecniche

- Nessuna modifica a `submit-webhook` (tag "partial" implicito nell'assenza; per completezza si può aggiungere `tag: "completed"` nel payload lato `handleGateSubmit`, opzionale).
- Retrocompatibilità: le 4 nuove colonne sono nullable, le vecchie righe restano valide.
- Sicurezza: solo il cron e chiamate autenticate con anon key possono invocare l'edge; il payload contiene PII, quindi il logging è minimo.
