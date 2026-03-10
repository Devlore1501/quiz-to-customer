

## Fix build errors + Verifica completa flusso webhook

### 1. Fix build errors: `NodeJS.Timeout` (5 occorrenze)

Il tipo `NodeJS.Timeout` non esiste in ambiente Vite/browser. Sostituire con `ReturnType<typeof setTimeout>` in:

**`src/components/ConversationalSurvey.tsx`**
- Riga 85: `let timeout: NodeJS.Timeout | null` → `let timeout: ReturnType<typeof setTimeout> | null`
- Riga 153: `let stepTimeout: NodeJS.Timeout` → `let stepTimeout: ReturnType<typeof setTimeout>`

**`src/components/EmailMarketingSurvey.tsx`**
- Riga 194: `let stepTimeout: NodeJS.Timeout` → `let stepTimeout: ReturnType<typeof setTimeout>`
- Riga 418: `let timeout: NodeJS.Timeout | null` → `let timeout: ReturnType<typeof setTimeout> | null`

**`src/hooks/usePartialTracking.ts`**
- Riga 51: `useRef<NodeJS.Timeout | null>` → `useRef<ReturnType<typeof setTimeout> | null>`

### 2. Fix webhook: passare `submissionId` nel body

Problema critico: entrambi i survey chiamano `submit-webhook` **senza** passare `submissionId`. L'edge function usa `submissionId` per:
- Verificare che la submission esista nel DB
- Generare il `reportUrl` se mancante
- Validare che l'email corrisponda

**`src/components/EmailMarketingSurvey.tsx`** (riga 1225-1228):
```typescript
// Prima:
body: { submissionData: dataToSend }
// Dopo:
body: { submissionData: dataToSend, submissionId: currentLeadId }
```

**`src/components/ConversationalSurvey.tsx`** (riga 782):
```typescript
// Prima:
body: { submissionData: dataToSend }
// Dopo:
body: { submissionData: dataToSend, submissionId: leadId }
```

Questo fix garantisce che il webhook riceva il `submissionId`, possa validare la submission nel DB e che il `reportUrl` sia sempre presente nel payload inviato a Make.com e GHL.

### Riepilogo
- 5 fix di tipo TypeScript (build errors)
- 2 fix webhook (submissionId mancante) — questa era probabilmente la causa del problema di Fabio

