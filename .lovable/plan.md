
# Aggiunta sezione "Report Salvati" nell'area admin

## Obiettivo

Aggiungere nella pagina `/admin/report` (dopo il login) una sezione che mostra la lista dei report generati in precedenza, con data, nome cliente/sito, punteggio email health score e potenziale annuo. Ogni report ha un pulsante per riaprirlo o copiare il link.

---

## Struttura attuale

Il flusso attuale è:
- Login con password → `AdminReport.tsx` mostra `<AdminSurvey />`
- `AdminSurvey` ha due viste: il form multi-step OR il report generato

La lista salvati si inserisce nella vista home del form (quando `step = 0` e nessun report è stato ancora generato), come pannello separato sotto/accanto al wizard.

---

## Design della sezione

La sezione "Report Salvati" apparirà **sopra il form wizard** ogni volta che l'admin accede, mostrando gli ultimi report generati in ordine cronologico inverso.

```text
┌────────────────────────────────────────────┐
│ 🔒 Admin Mode                              │
├────────────────────────────────────────────┤
│ 📋 REPORT SALVATI (3)                      │
│ ┌──────────────────────────────────────┐   │
│ │ Perinelli Forniture   18 feb 2026   │   │
│ │ Score: 8/100  •  €693.600/anno      │   │
│ │ [Apri report]  [Copia link]         │   │
│ └──────────────────────────────────────┘   │
│ ┌──────────────────────────────────────┐   │
│ │ Report Admin          18 feb 2026   │   │
│ │ Score: 33/100  •  €90.000/anno      │   │
│ │ [Apri report]  [Copia link]         │   │
│ └──────────────────────────────────────┘   │
├────────────────────────────────────────────┤
│ ➕ Crea nuovo report                       │
│   Step 1 di 8: Settore e-commerce ...     │
└────────────────────────────────────────────┘
```

---

## Dati disponibili nel DB

La query per recuperare i report salvati è:
```sql
SELECT id, full_name, website, email_health_score, yearly_potential, created_at, sector, report_data
FROM survey_submissions
WHERE status = 'admin_report'
ORDER BY created_at DESC
LIMIT 50
```

I campi da mostrare per ogni card:
- **Nome cliente**: `report_data->'meta'->>'clientName'` (se vuoto → `website` → "Report Admin")
- **Sito web**: `report_data->'meta'->>'website'` o `website`
- **Settore**: `sector` (mappato a label human-readable)
- **Data**: `created_at` formattata (es. "18 feb 2026, 15:41")
- **Score**: `email_health_score` con colore (rosso < 40, giallo 40-70, verde > 70)
- **Potenziale annuo**: `yearly_potential` formattato in euro
- **Link**: `/report/:id`

---

## Implementazione tecnica

### Nuovo componente: `src/components/AdminReportHistory.tsx`

Componente dedicato che:
1. Fa fetch dei report al mount con `supabase.from('survey_submissions').select(...)` 
2. Mostra uno skeleton loader durante il caricamento
3. Renderizza la lista di card con i dati
4. Ogni card ha due pulsanti: "Apri report" (link → `/report/:id`) e "Copia link" (copia URL negli appunti)
5. Supporta refresh dopo la generazione di un nuovo report

### Modifiche a `src/components/AdminSurvey.tsx`

Aggiungere il componente `AdminReportHistory` in testa alla vista quiz (quando non c'è ancora un `report` generato), con un `refreshKey` che si aggiorna dopo ogni `handleGenerate` per ricaricare la lista.

### Nota RLS

La RLS esistente (`Public can read admin report rows: status = 'admin_report'`) permette già la lettura pubblica, quindi il fetch funziona senza autenticazione. Nessuna modifica al DB necessaria.

---

## File modificati/creati

| File | Modifica |
|---|---|
| `src/components/AdminReportHistory.tsx` | **Nuovo** — componente lista report salvati con fetch, skeleton, card e azioni |
| `src/components/AdminSurvey.tsx` | Aggiunta `AdminReportHistory` in testa alla vista quiz, con `refreshKey` aggiornato dopo ogni generazione |

Nessuna migrazione DB, nessuna modifica RLS — i dati sono già accessibili.

---

## Dettagli card report

Ogni card mostrerà:
- **Badge settore** (es. "Beauty", "Fashion", "Altro")  
- **Nome display** = clientName dal meta OR website OR "Report Admin"  
- **Data** formattata in italiano (es. "18 feb 2026 · 15:41")  
- **Score** con colore dinamico: rosso (< 40) / arancione (40–69) / verde (≥ 70)  
- **Potenziale annuo** in formato €XX.XXX  
- **Pulsante "Apri report"** → naviga a `/report/:id` in nuova tab  
- **Pulsante "Copia link"** → copia URL negli appunti con feedback visivo
