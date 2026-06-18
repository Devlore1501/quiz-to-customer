import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Standalone GHL Lead Enrichment Function
//
// Triggered by a GHL Workflow webhook (or any HTTP caller).
// Accepts two input formats:
//
// Format A — GHL native webhook payload:
//   { type, locationId, id (=contactId), firstName, lastName, email,
//     companyName, website, phone, ... }
//
// Format B — simple JSON (from submit-webhook or manual call):
//   { contactId?, email, fullName, companyName?, website?, submissionId? }
// ---------------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
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
// Claude synthesis — Italian sales brief
// ---------------------------------------------------------------------------
async function synthesize(
  companyName: string,
  fullName: string,
  website: string,
  results: Record<string, SearchResult[]>,
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

Azienda target: ${companyName}
Contatto: ${fullName}
Sito: ${website || "non specificato"}
Data: ${new Date().toLocaleDateString("it-IT")}

RISULTATI RICERCA:
${ctx}

Crea un briefing di vendita strutturato in italiano. Usa SOLO i dati trovati, non inventare nulla. Se un dato manca scrivilo esplicitamente.

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
[Tono, angolazione e personalizzazione del pitch]`;

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

async function addNote(contactId: string, note: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-07-28", "Content-Type": "application/json" },
      body: JSON.stringify({
        body: `🔍 LEAD ENRICHMENT — ${new Date().toLocaleDateString("it-IT")}\n\n${note}`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function addTags(contactId: string, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${apiKey}`, Version: "2021-07-28", "Content-Type": "application/json" },
      body: JSON.stringify({ tags: ["enriched", `researched-${new Date().getFullYear()}`] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Payload normalisation — handles both GHL native format and simple JSON
// ---------------------------------------------------------------------------
interface NormalizedPayload {
  contactId?: string;
  email: string;
  fullName: string;
  companyName: string;
  website: string;
  submissionId?: string; // quiz backcompat
}

function normalizePayload(raw: Record<string, unknown>): NormalizedPayload | null {
  // GHL native webhook: has "type" and "id" at root level
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

  // Simple JSON format
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
      JSON.stringify({ error: "Missing required fields: email and fullName (or GHL contact payload)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { email, fullName, companyName, website, submissionId } = payload;
  let { contactId } = payload;

  // Create enrichment log entry
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

  // Also mark quiz submission if applicable
  if (submissionId) {
    await supabase
      .from("survey_submissions")
      .update({ enrichment_status: "processing" })
      .eq("id", submissionId);
  }

  try {
    const searchTarget = companyName || fullName;

    // 5 parallel web searches
    const [generalRes, awardsRes, newsRes, financialRes, partnerRes] = await Promise.all([
      searchWeb(`"${searchTarget}" azienda descrizione settore prodotti`, serperApiKey),
      searchWeb(`"${searchTarget}" premi riconoscimenti award certificazioni`, serperApiKey),
      searchWeb(`"${searchTarget}" news 2024 2025 comunicato stampa`, serperApiKey),
      searchWeb(`"${searchTarget}" fatturato bilancio ricavi finanziamento`, serperApiKey),
      searchWeb(`"${searchTarget}" partner collaborazione clienti casi studio`, serperApiKey),
    ]);

    const report = await synthesize(
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
      claudeApiKey
    );

    // Resolve contact ID if not provided in the payload
    if (!contactId) {
      contactId = (await findContactWithRetry(email, ghlApiKey, ghlLocationId)) || undefined;
    }

    let ghlNoteAdded = false;
    let ghlTagged = false;

    if (contactId) {
      [ghlNoteAdded, ghlTagged] = await Promise.all([
        addNote(contactId, report, ghlApiKey),
        addTags(contactId, ghlApiKey),
      ]);
    } else {
      console.warn(`GHL contact not found for: ${email}`);
    }

    const now = new Date().toISOString();

    // Update enrichment log
    if (logId) {
      await supabase
        .from("lead_enrichments")
        .update({
          ghl_contact_id: contactId || null,
          status: "completed",
          report,
          ghl_note_added: ghlNoteAdded,
          ghl_tagged: ghlTagged,
          completed_at: now,
        })
        .eq("id", logId);
    }

    // Update quiz submission if applicable
    if (submissionId) {
      await supabase
        .from("survey_submissions")
        .update({ enrichment_status: "completed", enrichment_completed_at: now })
        .eq("id", submissionId);
    }

    return new Response(
      JSON.stringify({ success: true, contactId: contactId || null, ghlNoteAdded, ghlTagged }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Enrichment failed:", err);

    if (logId) {
      await supabase
        .from("lead_enrichments")
        .update({ status: "failed", error_message: (err as Error).message })
        .eq("id", logId);
    }

    if (submissionId) {
      await supabase
        .from("survey_submissions")
        .update({ enrichment_status: "failed" })
        .eq("id", submissionId);
    }

    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
