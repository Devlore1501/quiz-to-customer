

## Aggiungere evento Facebook "ViewContent" al quiz

### Obiettivo
Tracciare l'evento standard `ViewContent` di Facebook Pixel quando l'utente atterra/inizia il quiz, in modo da popolare il funnel pubblicitario tra `PageView` (già attivo) e `CompleteRegistration` (già attivo a fine quiz).

### Quando deve scattare
**Al mount del componente quiz, una sola volta per sessione**, quando l'utente vede effettivamente la prima domanda (Brand/companyName). Questo è il momento equivalente a "ha aperto il contenuto del quiz" — più affidabile del primo click, perché:
- Cattura anche chi legge la domanda senza interagire
- Allinea v3 (12 step) con il momento esatto di apertura del quiz
- Evita doppi invii se l'utente clicca più volte

### Cosa cambio

**1. `src/lib/facebookPixel.ts`** — aggiungo helper dedicato:
```ts
trackViewContent({ content_name: 'Email Marketing Quiz', content_category: 'quiz_start' })
```
Usa l'evento standard `ViewContent` di Facebook (riconosciuto nativamente per ottimizzazione campagne, non un custom event).

**2. `src/components/EmailMarketingSurvey.tsx`** — chiamo `trackViewContent` dentro un `useEffect` con dependency vuota (`[]`) e un `useRef` di guardia per garantire un solo invio anche con re-render/StrictMode.

### Cosa NON cambia
- `index.html` (Pixel base già caricato)
- `CompleteRegistration` e `Lead` esistenti
- Quiz logic, partial tracking, webhook

### File modificati
- `src/lib/facebookPixel.ts`
- `src/components/EmailMarketingSurvey.tsx`

