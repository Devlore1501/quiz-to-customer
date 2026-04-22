

## Restyle completo schermata intro — sezione hero + sezioni sottostanti

Estendo il restyle a **tutta la landing intro**, non solo la sezione hero in alto. Mantengo la palette attuale (bianco/slate + arancione Mailift).

### Struttura completa della nuova schermata `intro`

**1. Hero (top)** — già descritto prima
- Avatar Mailift tondo con doppio glow arancione
- Pill `REVENUE LEAK AUDIT`
- H1 grande con `Gratis.` in arancione
- Sottotitolo
- CTA pill arancione "Inizia il quiz →"
- Microcopy `🔒 Dati riservati. Nessuno spam.`

**2. Sezione "Cosa otterrai dal report"** (3 colonne)
Card chiare con icona arancione + titolo + descrizione breve:
- 📊 **Diagnosi completa** — Analisi delle 6 aree chiave del tuo email marketing
- 🎯 **Piano d'azione 90 giorni** — Task prioritizzate per impatto
- 💰 **Stima revenue persa** — Quanto stai lasciando sul tavolo ogni mese

**3. Sezione "Come funziona"** (3 step orizzontali)
Numeri grandi arancione + titolo + descrizione:
1. **Rispondi al quiz** (2 minuti, 12 domande veloci)
2. **Ricevi il report personalizzato** (via email + on-screen)
3. **Prenota una call gratuita** (opzionale, per discutere i risultati)

**4. Sezione "Le 6 aree analizzate"** (grid 2x3 o 3x2)
Tag/badge con icona arancione outline:
- Lista & Segmentazione
- Automazioni & Flow
- Campagne & Newsletter
- Deliverability
- Revenue & ROI
- Strategia & Crescita

**5. Sezione social proof / trust** (riga orizzontale)
- "Già usato da +200 brand e-commerce italiani"
- Mini stats: `200+ audit completati` · `€2.5M+ revenue recuperata` · `2 min di tempo`
- (Niente loghi finti — solo numeri/testimonial testuali per ora)

**6. CTA finale ripetuta**
Stesso bottone pill arancione "Inizia il quiz →" + microcopy `🔒 Gratis · No spam · 2 minuti`

**7. Footer minimale**
`© 2025 Mailift · Email Revenue Audit`

### Stile generale (palette attuale)
- Sfondo: `bg-slate-50` con sottile pattern griglia chiaro
- Card: `bg-white border border-slate-200 rounded-2xl shadow-sm`
- Accent: gradient arancione Mailift (già usato nei CTA del quiz)
- Spacing generoso tra sezioni (py-16/24)
- Mobile-first, max-width 1100px container, hero più stretto (~680px)
- Animazioni leggere fade-in/slide-up al scroll (opzionale, CSS only)

### File modificato
- `src/components/EmailMarketingSurvey.tsx` → solo il componente `IntroScreen` viene riscritto in modo completo (hero + tutte le sezioni sottostanti). Resto del file invariato.

### Cosa NON cambia
- Logica `phase === 'intro'` → `quiz` (il click su qualsiasi CTA fa partire il quiz)
- Domande, ordine, validazione, squalifica
- Report, webhook Make/GHL, Facebook Pixel, partial tracking
- Schermata di gating contatti, calendario GHL, area admin

