import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Standalone GHL Lead Enrichment + Qualification Function
//
// Triggered by a GHL Workflow webhook (or any HTTP caller).
//
// Flow:
//  1. Static qualification checks (no API cost) → hard-reject obvious fakes
//  2. 5 parallel web searches → web-presence signals feed the score
//  3. Final score computation → qualified / suspicious / fake
//  4. GHL update:
//       - Fake    → tag "squalificato", note with reason, skip synthesis
//       - Suspect → tag "da-verificare", partial note, skip synthesis
//       - Real    → tag "enriched" + "qualificato", full sales brief note
//  5. Log in lead_enrichments table
//
// Accepted payload formats:
//  A) GHL native webhook: { type, locationId, id, firstName, lastName, email, companyName, website, … }
//  B) Simple JSON:        { contactId?, email, fullName, companyName?, website?, submissionId? }
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Static qualification data
// ---------------------------------------------------------------------------

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","guerrillamail.info","guerrillamail.biz",
  "guerrillamail.de","guerrillamail.net","guerrillamail.org","sharklasers.com",
  "grr.la","tempmail.com","throwaway.email","yopmail.com","spam4.me",
  "trashmail.com","trashmail.me","trashmail.at","trashmail.io","trashmail.net",
  "dispostable.com","mailnull.com","maildrop.cc","fakeinbox.com","tempinbox.com",
  "mailexpire.com","discard.email","nwytg.net","zzrgg.com","getairmail.com",
  "filzmail.com","weg-werf-email.de","spamhereplease.com","spamgourmet.com",
  "throwam.com","tempail.com","getnada.com","mailnesia.com","tempr.email",
  "crazymailing.com","jetable.fr","jetable.net","spambox.us","mailforspam.com",
]);

// Free providers reduce B2B credibility but are not always fake
const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com","yahoo.com","yahoo.it","yahoo.fr","yahoo.es","yahoo.de",
  "hotmail.com","hotmail.it","hotmail.fr","outlook.com","outlook.it",
  "live.com","live.it","icloud.com","me.com","mac.com",
  "libero.it","tin.it","virgilio.it","alice.it","tiscali.it",
  "email.it","inwind.it","fastwebnet.it","aol.com","protonmail.com",
  "proton.me","tutanota.com","gmx.com","gmx.it","web.de",
]);

// Patterns that strongly suggest test/fake company names
const FAKE_NAME_PATTERNS = [
  /^test\b/i, /^prova\b/i, /\btest\b/i, /^aaa+/i, /^xxx/i,
  /^pippo\b/i, /^pluto\b/i, /^paperino\b/i, /^foo\b/i, /^bar\b/i,
  /^lorem/i, /^asdf/i, /^qwerty/i, /^\d+$/, /^[a-zA-Z]{1,2}$/,
  /^n\/a$/i, /^none$/i, /^null$/i, /^undefined$/i, /^company$/i,
  /^azienda$/i, /^empresa$/i,
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QualificationSignals {
  emailIsDisposable: boolean;
  emailIsFreeProvider: boolean;
  emailDomainMatchesWebsite: boolean;
  companyNameSuspicious: boolean;
  webResultsCount: number;       // total non-empty search buckets (0–5)
  financialDataFound: boolean;
  newsFound: boolean;
  awardsFound: boolean;
}

interface QualificationResult {
  score: number;                  // 0–100
  verdict: "fake" | "suspicious" | "cold" | "warm" | "hot";
  isQualified: boolean;
  disqualificationReason?: string;
  signals: QualificationSignals;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface NormalizedPayload {
  contactId?: string;
  email: string;
  fullName: string;
  companyName: string;
  website: string;
  submissionId?: string;
}

// ---------------------------------------------------------------------------
// Phase 1 — Static checks (no API calls)
// ---------------------------------------------------------------------------

function staticQualify(
  email: string,
  companyName: string,
  website: string
): { hardReject: boolean; reason?: string; signals: Partial<QualificationSignals> } {
  const domain = email.split("@")[1]?.toLowerCase() || "";

  const emailIsDisposable = DISPOSABLE_DOMAINS.has(domain);
  const emailIsFreeProvider = FREE_EMAIL_PROVIDERS.has(domain);

  // Hard reject: disposable email
  if (emailIsDisposable) {
    return {
      hardReject: true,
      reason: `Email usa un dominio temporaneo/usa-e-getta (${domain})`,
      signals: { emailIsDisposable, emailIsFreeProvider: false },
    };
  }

  // Hard reject: clearly fake company name
  const nameToCheck = companyName.trim();
  if (nameToCheck.length > 0) {
    for (const pattern of FAKE_NAME_PATTERNS) {
      if (pattern.test(nameToCheck)) {
        return {
          hardReject: true,
          reason: `Nome azienda chiaramente fittizio: "${companyName}"`,
          signals: { emailIsDisposable: false, companyNameSuspicious: true },
        };
      }
    }
  }

  // Derive email/website domain match
  let emailDomainMatchesWebsite = false;
  if (website) {
    try {
      const websiteDomain = new URL(
        website.startsWith("http") ? website : `https://${website}`
      ).hostname.replace(/^www\./, "");
      emailDomainMatchesWebsite = domain === websiteDomain;
    } catch {
      // ignore malformed website URL
    }
  }

  return {
    hardReject: false,
    signals: {
      emailIsDisposable: false,
      emailIsFreeProvider,
      emailDomainMatchesWebsite,
      companyNameSuspicious: false,
    },
  };
}

// ---------------------------------------------------------------------------
// Phase 2 — Score computation (after web searches)
// ---------------------------------------------------------------------------

function computeScore(signals: QualificationSignals): QualificationResult {
  let score = 50;

  if (signals.emailIsDisposable)        score -= 60; // hard floor
  if (signals.emailIsFreeProvider)      score -= 15;
  if (signals.companyNameSuspicious)    score -= 20;
  if (signals.emailDomainMatchesWebsite) score += 20;
  if (signals.webResultsCount >= 3)     score += 15;
  else if (signals.webResultsCount >= 1) score += 5;
  else                                  score -= 20; // zero web presence
  if (signals.financialDataFound)       score += 10;
  if (signals.newsFound)                score += 8;
  if (signals.awardsFound)              score += 7;

  score = Math.max(0, Math.min(100, score));

  let verdict: QualificationResult["verdict"];
  let isQualified: boolean;
  let disqualificationReason: string | undefined;

  if (score < 30) {
    verdict = "fake";
    isQualified = false;
    disqualificationReason = buildDisqualificationReason(signals, score);
  } else if (score < 50) {
    verdict = "suspicious";
    isQualified = false;
    disqualificationReason = buildDisqualificationReason(signals, score);
  } else if (score < 65) {
    verdict = "cold";
    isQualified = true;
  } else if (score < 80) {
    verdict = "warm";
    isQualified = true;
  } else {
    verdict = "hot";
    isQualified = true;
  }

  return { score, verdict, isQualified, disqualificationReason, signals };
}

function buildDisqualificationReason(signals: QualificationSignals, score: number): string {
  const reasons: string[] = [];
  if (signals.emailIsDisposable) reasons.push("email usa un dominio temporaneo");
  if (signals.emailIsFreeProvider) reasons.push("email su provider gratuito (nessun dominio aziendale)");
  if (signals.companyNameSuspicious) reasons.push("nome azienda sospetto o generico");
  if (signals.webResultsCount === 0) reasons.push("nessuna presenza online trovata per l'azienda");
  if (!signals.emailDomainMatchesWebsite && signals.webResultsCount < 2)
    reasons.push("dominio email non corrisponde al sito web");
  return `Score: ${score}/100. Motivi: ${reasons.length > 0 ? reasons.join("; ") : "punteggio insufficiente"}.`;
}

// ---------------------------------------------------------------------------
// Web search via Serper.dev
// ---------------------------------------------------------------------------

async function searchWeb(query: string, apiKey: string): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 5, gl: "it", hl: "it" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.organic as Array<Record<string, string>>) || [])
      .slice(0, 5)
      .map((r) => ({ title: r.title || "", link: r.link || "", snippet: r.snippet || "" }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Claude synthesis — full sales brief with qualification context
// ---------------------------------------------------------------------------

async function synthesize(
  companyName: string,
  fullName: string,
  website: string,
  results: Record<string, SearchResult[]>,
  qualification: QualificationResult,
  apiKey: string
): Promise<string> {
  const ctx = Object.entries(results)
    .map(([topic, items]) =>
      items.length === 0
        ? `## ${topic}\nNessuna informazione trovata.`
        : `## ${topic}\n${items.map((r) => `- **${r.title}**: ${r.snippet}`).join("\n")}`
    )
    .join("\n\n");

  const prompt = `Sei un assistente esperto in ricerca aziendale per presentazioni di vendita B2B.

Azienda: ${companyName}
Contatto: ${fullName}
Sito: ${website || "non specificato"}
Qualità lead: ${qualification.verdict.toUpperCase()} (score ${qualification.score}/100)
Data ricerca: ${new Date().toLocaleDateString("it-IT")}

RISULTATI RICERCA:
${ctx}

Crea un briefing di vendita strutturato in italiano. Usa SOLO dati trovati — non inventare nulla. Se un dato manca indicalo esplicitamente.

⚡ QUALITÀ LEAD: ${qualification.verdict.toUpperCase()} (${qualification.score}/100)
[Spiega brevemente perché il lead ha questo score e cosa significa per l'approccio commerciale]

📊 PANORAMICA AZIENDA
[Settore, prodotti/servizi, dimensione stimata, anno fondazione]

🏆 SUCCESSI E RICONOSCIMENTI
[Premi, certificazioni, traguardi, menzioni]

🤝 PARTNERSHIP E COLLABORAZIONI
[Partner chiave, clienti rilevanti, collaborazioni note]

💰 DATI FISCALI E FINANZIARI
[Fatturato, crescita, finanziamenti, capitale sociale]

📰 NEWS RECENTI (2024–2025)
[Aggiornamenti rilevanti per la vendita]

🎯 PUNTI DI LEVA PER IL PITCH
[3 opportunità specifiche da sfruttare con questo cliente]

💡 APPROCCIO CONSIGLIATO
[Tono, angolazione e personalizzazione del pitch in base alla qualità del lead]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content[0] as { text: string }).text;
}

// ---------------------------------------------------------------------------
// GHL API helpers
// ---------------------------------------------------------------------------

async function findContact(email: string, apiKey: string, locationId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=${encodeURIComponent(email)}&limit=5`,
      { headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-07-28" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const match = ((data.contacts || []) as Array<{ id: string; email: string }>).find(
      (c) => c.email?.toLowerCase() === email.toLowerCase()
    );
    return match?.id || null;
  } catch {
    return null;
  }
}

async function findContactWithRetry(
  email: string,
  apiKey: string,
  locationId: string
): Promise<string | null> {
  for (let i = 1; i <= 4; i++) {
    const id = await findContact(email, apiKey, locationId);
    if (id) return id;
    if (i < 4) await new Promise((r) => setTimeout(r, 5000 * i));
  }
  return null;
}

async function updateContactTags(
  contactId: string,
  tags: string[],
  apiKey: string
): Promise<boolean> {
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-07-28", "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function addNote(contactId: string, note: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-07-28", "Content-Type": "application/json" },
      body: JSON.stringify({ body: note }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Payload normalisation
// ---------------------------------------------------------------------------

function normalizePayload(raw: Record<string, unknown>): NormalizedPayload | null {
  // GHL native webhook format
  if (raw.type && raw.id && typeof raw.id === "string") {
    const firstName = (raw.firstName as string) || "";
    const lastName = (raw.lastName as string) || "";
    const email = (raw.email as string) || "";
    if (!email) return null;
    return {
      contactId: raw.id as string,
      email,
      fullName: `${firstName} ${lastName}`.trim(),
      companyName: (raw.companyName as string) || "",
      website: (raw.website as string) || "",
    };
  }

  // Simple JSON
  const email = (raw.email as string) || "";
  const fullName = (raw.fullName as string) || "";
  if (!email || !fullName) return null;
  return {
    contactId: (raw.contactId as string) || undefined,
    email,
    fullName,
    companyName: (raw.companyName as string) || "",
    website: (raw.website as string) || "",
    submissionId: (raw.submissionId as string) || undefined,
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const serperApiKey = Deno.env.get("SERPER_API_KEY");
  const claudeApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const ghlApiKey = Deno.env.get("GHL_API_KEY");
  const ghlLocationId = Deno.env.get("GHL_LOCATION_ID");

  if (!serperApiKey || !claudeApiKey || !ghlApiKey || !ghlLocationId) {
    console.error("Missing env vars: SERPER_API_KEY, ANTHROPIC_API_KEY, GHL_API_KEY, GHL_LOCATION_ID");
    return new Response(
      JSON.stringify({ error: "Function not configured — missing environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let rawBody: Record<string, unknown>;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const payload = normalizePayload(rawBody);
  if (!payload) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: email and fullName (or valid GHL contact payload)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { email, fullName, companyName, website, submissionId } = payload;
  let { contactId } = payload;

  // ── Create enrichment log ─────────────────────────────────────────────────
  const { data: logEntry } = await supabase
    .from("lead_enrichments")
    .insert({
      ghl_contact_id: contactId || null,
      email,
      full_name: fullName,
      company_name: companyName || null,
      website: website || null,
      status: "processing",
    })
    .select("id")
    .single();

  const logId = logEntry?.id;

  if (submissionId) {
    await supabase
      .from("survey_submissions")
      .update({ enrichment_status: "processing" })
      .eq("id", submissionId);
  }

  try {
    // ── Phase 1: Static checks (no API cost) ─────────────────────────────────
    const staticCheck = staticQualify(email, companyName, website);

    if (staticCheck.hardReject) {
      // Resolve contact for GHL update if needed
      if (!contactId) {
        contactId = (await findContactWithRetry(email, ghlApiKey, ghlLocationId)) || undefined;
      }

      if (contactId) {
        await Promise.all([
          updateContactTags(contactId, ["squalificato", "fake-lead"], ghlApiKey),
          addNote(
            contactId,
            `❌ LEAD SQUALIFICATO — ${new Date().toLocaleDateString("it-IT")}\n\n` +
            `Motivo: ${staticCheck.reason}\n` +
            `Fase: controllo statico (pre-ricerca)\n` +
            `Email: ${email} | Azienda: ${companyName || "n/d"}`,
            ghlApiKey
          ),
        ]);
      }

      const now = new Date().toISOString();
      if (logId) {
        await supabase.from("lead_enrichments").update({
          ghl_contact_id: contactId || null,
          status: "completed",
          qualification_verdict: "fake",
          qualification_score: 0,
          disqualification_reason: staticCheck.reason,
          ghl_note_added: !!contactId,
          ghl_tagged: !!contactId,
          completed_at: now,
        }).eq("id", logId);
      }
      if (submissionId) {
        await supabase.from("survey_submissions")
          .update({ enrichment_status: "completed", enrichment_completed_at: now })
          .eq("id", submissionId);
      }

      return new Response(
        JSON.stringify({ success: true, qualified: false, verdict: "fake", reason: staticCheck.reason }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Phase 2: Web searches ─────────────────────────────────────────────────
    const searchTarget = companyName || fullName;

    const [generalRes, awardsRes, newsRes, financialRes, partnerRes] = await Promise.all([
      searchWeb(`"${searchTarget}" azienda descrizione settore`, serperApiKey),
      searchWeb(`"${searchTarget}" premi riconoscimenti award certificazioni`, serperApiKey),
      searchWeb(`"${searchTarget}" news 2024 2025 comunicato`, serperApiKey),
      searchWeb(`"${searchTarget}" fatturato bilancio ricavi finanziamento`, serperApiKey),
      searchWeb(`"${searchTarget}" partner collaborazione clienti`, serperApiKey),
    ]);

    const searchBuckets = [generalRes, awardsRes, newsRes, financialRes, partnerRes];
    const webResultsCount = searchBuckets.filter((b) => b.length > 0).length;

    // ── Phase 3: Final score ──────────────────────────────────────────────────
    const signals: QualificationSignals = {
      ...staticCheck.signals as Required<typeof staticCheck.signals>,
      emailIsDisposable: staticCheck.signals.emailIsDisposable ?? false,
      emailIsFreeProvider: staticCheck.signals.emailIsFreeProvider ?? false,
      emailDomainMatchesWebsite: staticCheck.signals.emailDomainMatchesWebsite ?? false,
      companyNameSuspicious: staticCheck.signals.companyNameSuspicious ?? false,
      webResultsCount,
      financialDataFound: financialRes.length > 0,
      newsFound: newsRes.length > 0,
      awardsFound: awardsRes.length > 0,
    };

    const qualification = computeScore(signals);

    // Resolve contact ID
    if (!contactId) {
      contactId = (await findContactWithRetry(email, ghlApiKey, ghlLocationId)) || undefined;
    }

    let ghlNoteAdded = false;
    let ghlTagged = false;
    let report: string | null = null;

    if (!qualification.isQualified) {
      // ── Disqualified lead ───────────────────────────────────────────────────
      if (contactId) {
        const tags = qualification.verdict === "fake"
          ? ["squalificato", "fake-lead"]
          : ["da-verificare", "sospetto"];

        const noteHeader = qualification.verdict === "fake"
          ? "❌ LEAD SQUALIFICATO"
          : "⚠️ LEAD SOSPETTO — REVISIONE MANUALE";

        [ghlNoteAdded, ghlTagged] = await Promise.all([
          addNote(
            contactId,
            `${noteHeader} — ${new Date().toLocaleDateString("it-IT")}\n\n` +
            `Score: ${qualification.score}/100 | Verdict: ${qualification.verdict.toUpperCase()}\n` +
            `${qualification.disqualificationReason || ""}\n\n` +
            `Segnali rilevati:\n` +
            `• Email provider gratuito: ${signals.emailIsFreeProvider ? "Sì" : "No"}\n` +
            `• Dominio email = sito web: ${signals.emailDomainMatchesWebsite ? "Sì" : "No"}\n` +
            `• Presenza online (bucket): ${signals.webResultsCount}/5\n` +
            `• Dati finanziari trovati: ${signals.financialDataFound ? "Sì" : "No"}\n` +
            `• News trovate: ${signals.newsFound ? "Sì" : "No"}`,
            ghlApiKey
          ),
          updateContactTags(contactId, tags, ghlApiKey),
        ]);
      }
    } else {
      // ── Qualified lead → full synthesis ──────────────────────────────────────
      report = await synthesize(
        searchTarget,
        fullName,
        website,
        {
          "Informazioni Generali": generalRes,
          "Premi e Riconoscimenti": awardsRes,
          "News Recenti": newsRes,
          "Dati Fiscali e Finanziari": financialRes,
          "Partnership e Collaborazioni": partnerRes,
        },
        qualification,
        claudeApiKey
      );

      if (contactId) {
        const tags = ["enriched", `researched-${new Date().getFullYear()}`, qualification.verdict];

        [ghlNoteAdded, ghlTagged] = await Promise.all([
          addNote(
            contactId,
            `🔍 LEAD ENRICHMENT — ${new Date().toLocaleDateString("it-IT")}\n` +
            `Score: ${qualification.score}/100 | Qualità: ${qualification.verdict.toUpperCase()}\n\n${report}`,
            ghlApiKey
          ),
          updateContactTags(contactId, tags, ghlApiKey),
        ]);
      }
    }

    const now = new Date().toISOString();

    if (logId) {
      await supabase.from("lead_enrichments").update({
        ghl_contact_id: contactId || null,
        status: "completed",
        qualification_verdict: qualification.verdict,
        qualification_score: qualification.score,
        disqualification_reason: qualification.disqualificationReason || null,
        report: report || null,
        ghl_note_added: ghlNoteAdded,
        ghl_tagged: ghlTagged,
        completed_at: now,
      }).eq("id", logId);
    }

    if (submissionId) {
      await supabase.from("survey_submissions")
        .update({ enrichment_status: "completed", enrichment_completed_at: now })
        .eq("id", submissionId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        qualified: qualification.isQualified,
        verdict: qualification.verdict,
        score: qualification.score,
        contactId: contactId || null,
        ghlNoteAdded,
        ghlTagged,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Enrichment/qualification failed:", err);

    if (logId) {
      await supabase.from("lead_enrichments")
        .update({ status: "failed", error_message: (err as Error).message })
        .eq("id", logId);
    }
    if (submissionId) {
      await supabase.from("survey_submissions")
        .update({ enrichment_status: "failed" })
        .eq("id", submissionId);
    }

    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
