

## Piano: Drop-off Analytics con tabelle separate per versione quiz

### Concetto
Invece di mescolare i dati, il componente mostrerà **tab separate per ogni versione del quiz**. Ogni versione ha il suo funnel indipendente, permettendo di confrontare le performance tra versioni.

### Come funziona

**Rilevamento versione**: Ogni sessione viene classificata in base al `current_step_name` e `total_steps`:
- **v1** (vecchio quiz): step names contengono `fullName`, `phone`, `adsInvestment`, `acceptTerms` — total_steps tipicamente 10-14
- **v2** (nuovo quiz): step names contengono `monthlyRevenue` come primo step, `platform`, `emailTool`, `segmentation` — total_steps = 11

**UI**: Due tab "Quiz v1 (precedente)" e "Quiz v2 (attuale)" sopra il funnel, con summary stats indipendenti per ciascuno.

### Dettagli tecnici

**File: `src/components/DropoffAnalytics.tsx`**

1. Aggiungere alla query il campo `current_step_name` e `total_steps`
2. Definire due configurazioni versione:

```
V1_STEPS = ['Nome', 'Telefono', 'Settore', 'Sito Web', 'Fatturato', 'Spesa Ads', ...]
V1_STEP_NAMES = ['fullName', 'phone', 'sector', 'website', 'monthlyRevenue', 'adsInvestment', ...]

V2_STEPS = ['Fatturato', 'Settore', 'Piattaforma', 'Email Tool', 'Revenue Email', 'Automazioni', 'Segmentazione', 'Frequenza', 'Lista Email', 'Obiettivo', 'URL Store']
```

3. Classificare ogni riga nella versione corretta basandosi su `current_step_name`
4. Calcolare funnel separato per ogni versione
5. Aggiungere tab switcher con contatore sessioni per versione
6. In futuro, se cambia ancora il quiz, basta aggiungere una V3 alla configurazione

### File coinvolti

| File | Azione |
|------|--------|
| `src/components/DropoffAnalytics.tsx` | Refactoring con tab per versione |

