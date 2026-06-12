## Obiettivo
Misurare quante persone vedono la landing e quante poi cliccano "Calcola la mia revenue persa" per avviare il quiz. Vista come **sessione unica per browser** (1 view per visitatore ogni 24h).

## 1. Database: nuova tabella `landing_events`
Migration con grants + RLS:

- Colonne: `id`, `session_key` (text, UUID generato lato client e salvato in `localStorage` con TTL 24h), `event_type` (`'view'` | `'cta_click'`), `survey_type` (default `'email_marketing'`, per futuri quiz), `referrer`, `utm_source/medium/campaign`, `user_agent`, `created_at`.
- Index su `(created_at)` e `(session_key, event_type)` per dedup.
- GRANT `INSERT` ad `anon` + `authenticated` (scrittura pubblica come per `partial_submissions`).
- GRANT `SELECT` solo a `authenticated` + admin policy via `has_role`.
- Policy INSERT: aperta (come tracking).
- Policy SELECT: solo admin.

## 2. Frontend tracking (`EmailMarketingSurvey.tsx`)
- Nuovo hook `useLandingTracking()` che:
  - Genera/legge `landing_session_key` da `localStorage` (scadenza 24h).
  - Su mount della landing, se non già loggato `view` in questa sessione, INSERT `event_type='view'` + marca il flag locale.
  - Espone `trackCtaClick()` che logga `cta_click` una sola volta per sessione.
- Aggancio `trackCtaClick()` ai due `<CtaButton onClick={onStart} />` (riga 429 e 621) prima di chiamare `onStart`.
- Cattura UTM da `window.location.search` e referrer al primo view.

## 3. Facebook Pixel
In `src/lib/facebookPixel.ts` aggiungere:
- `trackLandingView()` → `trackCustom('LandingView', {...})`
- `trackQuizCtaClick()` → `trackCustom('QuizCTAClick', {...})` + standard `InitiateCheckout`-like signal opzionale.
Chiamate dall'hook sopra in parallelo all'insert DB.

## 4. Admin UI: nuova card "Funnel Landing → Quiz"
In `DropoffAnalytics.tsx`, sopra le card esistenti, aggiungere una sezione che legge `landing_events` filtrata sullo stesso `period` (1d/7d/30d/all):
- **Landing views** (count distinto di `session_key` con `event_type='view'`)
- **CTA click** (count distinto di `session_key` con `event_type='cta_click'`)
- **CTR landing → quiz** = click / views in %
- Mini breakdown opzionale per `utm_source` (top 5).

## Dettagli tecnici
- Dedup: il flag `localStorage` evita doppi insert su refresh; lato query usiamo comunque `COUNT(DISTINCT session_key)` per sicurezza.
- Niente PII raccolta (solo session_key anonimo, UA, UTM).
- Nessun blocco se l'insert fallisce (fire-and-forget, try/catch silenzioso) — il quiz parte comunque.
- Compatibile con embed iframe (localStorage funziona; in caso bloccato si fa fallback a sessionStorage in memoria → conta come page load, accettabile).

## File toccati
- `supabase/migrations/<new>.sql` (nuova tabella + policies + grants)
- `src/lib/facebookPixel.ts` (2 nuovi helper)
- `src/hooks/useLandingTracking.ts` (nuovo)
- `src/components/EmailMarketingSurvey.tsx` (mount tracking + onClick wrapper)
- `src/components/DropoffAnalytics.tsx` (nuova sezione funnel in cima)
