
# Tre Miglioramenti al Report e al Flusso Admin

## Richieste dell'utente

1. **Sottotitolo del report**: aggiungere il sito web analizzato
2. **Modalità admin (report senza dati di contatto)**: una route protetta accessibile solo a te, dove puoi compilare il quiz con dati del cliente senza inserire nome/telefono/email e senza salvare nel database né inviare webhook
3. **Campi più liberi**: nei campi testuali della modalità admin, permettere input libero (es. revenue digitata a mano) invece di forzare la scelta da range predefiniti

---

## 1. Sottotitolo con sito web analizzato

### Dove e come

Nel file `src/components/AdvancedReport.tsx`, la riga 62 attuale mostra:

```
Analisi personalizzata per il settore [Settore]
```

La nuova versione mostrerà anche il sito web, con un link cliccabile, solo se il prop `website` è valorizzato:

```
Analisi personalizzata per il settore [Settore]
🌐 quiz-to-customer.lovable.app
```

Il `website` prop **è già passato** al componente da `EmailMarketingSurvey.tsx` (riga 1336). La modifica è minima: aggiungere una riga condizionale sotto il sottotitolo.

Per il **report condiviso** (`/report/:id`), attualmente `website` non viene passato (la pagina `Report.tsx` non ha accesso al sito — il dato non è incluso in `clientReport`). Per supportare questo caso, è necessario che il `website` dell'utente venga incluso nell'oggetto `AdvancedReport` oppure che `get_report_by_id` restituisca anche il `website`. La soluzione più pulita: **aggiungere `website` come campo nel `AdvancedReport`** (già popolato durante il calcolo) passandolo come parametro a `calculateAdvancedReport()`.

---

## 2. Modalità Admin — Report senza dati di contatto

### Idea

Una pagina separata su `/admin/report` protetta da una **password locale** (semplice campo password client-side con valore segreto). Quando accede, tu puoi:
- Compilare tutte le domande del quiz come il cliente
- Il report viene generato e mostrato immediatamente
- **Nessun salvataggio nel database**, **nessun webhook** inviato
- **Nessun step "Inserisci i tuoi dati"** — il quiz termina direttamente alla generazione
- Campo opzionale "Nome cliente" per personalizzare il report

### Struttura tecnica

**Nuovo file**: `src/pages/AdminReport.tsx`
- Contiene un form di login con password (confronto client-side, non backend)
- Se loggato, mostra l'`AdminSurvey` component

**Nuovo file**: `src/components/AdminSurvey.tsx`
- Versione semplificata di `EmailMarketingSurvey.tsx` senza:
  - Step contatti (nome, telefono, email, termini)
  - Verifica sito web con edge function (il sito è facoltativo e non verificato)
  - Salvataggio su Supabase
  - Invio webhook
  - Partial tracking
  - Honeypot
- Con in più:
  - Campo "Nome cliente" (facoltativo, solo per personalizzare il report)
  - Pulsante "Genera Report" al termine delle domande tecniche
  - Il report viene mostrato subito dopo

**Nuova route in `App.tsx`**:
```
/admin/report → AdminReport.tsx
```

---

## 3. Campi più liberi nella modalità admin

Nella modalità admin, invece di scegliere da range predefiniti (es. "15.000€ - 25.000€"), avrai campi di input libero dove puoi digitare i valori esatti del cliente. Questo richiede:

- Per **fatturato mensile**: input numerico libero (€/mese) → `calculateAdvancedReport` riceve il valore diretto
- Per **percentuale email**: input numerico libero (0-100%)
- Per **dimensione lista**: input numerico libero
- Per **sito web**: campo testo semplice, senza verifica con edge function
- Settore, automazioni, frequenza, ads: rimangono a scelta multipla (più comodi)

Per supportare valori numerici diretti (non range), aggiungo overload alla funzione `calculateAdvancedReport` oppure un secondo entry point che accetta i valori già parsati — senza toccare il flusso pubblico.

---

## Dettagli tecnici

### File modificati

| File | Modifica |
|---|---|
| `src/components/AdvancedReport.tsx` | Aggiunta riga website nel sottotitolo header |
| `src/lib/reportCalculations.ts` | Aggiunta funzione `calculateAdvancedReportFromValues()` con input numerici diretti |
| `src/App.tsx` | Aggiunta route `/admin/report` |

### File creati

| File | Contenuto |
|---|---|
| `src/pages/AdminReport.tsx` | Pagina con schermata di login a password + AdminSurvey |
| `src/components/AdminSurvey.tsx` | Quiz admin semplificato con campi liberi e nessun backend |

### Password admin

La password viene definita come costante nel componente `AdminReport.tsx`. Cambiabile in qualsiasi momento modificando quella riga di codice. Non è necessario alcun backend — è una protezione leggera sufficiente per uso interno.

### Flusso admin step-by-step

```text
1. Vai a /admin/report
2. Inserisci password → accesso
3. Compila: Settore → Sito (facoltativo) → Fatturato (input libero) → Ads → % Email (input libero) → Lista (input libero) → Frequenza → Automazioni → Motivazione → (opz.) Nome cliente
4. Clicca "Genera Report"
5. Il report appare immediatamente
6. Puoi scaricarlo come PDF o ricominciare
```

### Nessun impatto sul quiz pubblico

Tutte le modifiche al quiz admin sono **in componenti separati** — il quiz pubblico `EmailMarketingSurvey.tsx` rimane invariato (eccetto la piccola modifica al sottotitolo del report).
