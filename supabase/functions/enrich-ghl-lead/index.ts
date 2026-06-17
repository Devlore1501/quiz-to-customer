import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichRequest {
  submissionId: string;
  email: string;
  fullName: string;
  companyName?: string;
  website?: string;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

async function searchWeb(
  query: string,
  serperApiKey: string
): Promise<SearchResult[]> {
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 5, gl: "it", hl: "it" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.organic as Array<Record<string, string>>) || [])
      .slice(0, 5)
      .map((r) => ({
        title: r.title || "",
        link: r.link || "",
        snippet: r.snippet || "",
      }));
  } catch {
    return [];
  }
}

async function synthesizeWithClaude(
  companyName: string,
  fullName: string,
  website: string,
  searchResults: Record<string, SearchResult[]>,
  claudeApiKey: string
): Promise<string> {
  const ctx = Object.entries(searchResults)
    .map(([topic, results]) => {
      if (results.length === 0) return `## ${topic}\nNessuna informazione trovata.`;
      return `## ${topic}\n${results.map((r) => `- **${r.title}**: ${r.snippet} (${r.link})`).join("\n")}`;
    })
    .join("\n\n");

  const prompt = `Sei un assistente esperto in ricerca aziendale per la preparazione di presentazioni di vendita B2B.

Azienda: ${companyName}
Contatto: ${fullName}
Sito web: ${website || "non specificato"}
Data ricerca: ${new Date().toLocaleDateString("it-IT")}

RISULTATI RICERCA ONLINE:
${ctx}

Crea un briefing di vendita strutturato in italiano. Usa solo informazioni trovate nella ricerca — non inventare dati. Se un dato non è disponibile, indicalo con "Non disponibile".

Formato richiesto:

📊 PANORAMICA AZIENDA
[Descrizione generale: settore, prodotti/servizi principali, dimensione stimata, anno fondazione se noto]

🏆 SUCCESSI E RICONOSCIMENTI
[Premi, certificazioni, traguardi raggiunti, menzioni notevoli]

🤝 PARTNERSHIP E COLLABORAZIONI
[Partner chiave, collaborazioni note, clienti rilevanti]

💰 DATI FISCALI E FINANZIARI
[Fatturato stimato o pubblico, crescita, finanziamenti, capitale sociale se noto]

📰 NOTIZIE RECENTI (2024–2025)
[Ultimi aggiornamenti rilevanti per la vendita]

🎯 INSIGHT PER LA VENDITA
[3 punti di leva chiave per il pitch, possibili pain point, opportunità da sfruttare]

💡 APPROCCIO CONSIGLIATO
[Come personalizzare il pitch per questo cliente specifico, tono e angolazione consigliata]`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error: ${err}`);
  }

  const data = await res.json();
  return (data.content[0] as { text: string }).text;
}

// GHL API v2 — find contact by email
async function findGHLContact(
  email: string,
  ghlApiKey: string,
  locationId: string
): Promise<string | null> {
  const url = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&query=${encodeURIComponent(email)}&limit=5`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${ghlApiKey}`,
        Version: "2021-07-28",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const contacts: Array<{ id: string; email: string }> = data.contacts || [];
    const match = contacts.find(
      (c) => c.email?.toLowerCase() === email.toLowerCase()
    );
    return match?.id || null;
  } catch {
    return null;
  }
}

// GHL — add enrichment as a contact note
async function addGHLNote(
  contactId: string,
  note: string,
  ghlApiKey: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/${contactId}/notes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghlApiKey}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: `🔍 LEAD ENRICHMENT REPORT — ${new Date().toLocaleDateString("it-IT")}\n\n${note}`,
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// GHL — add tags to mark contact as researched
async function tagGHLContact(
  contactId: string,
  ghlApiKey: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://services.leadconnectorhq.com/contacts/${contactId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${ghlApiKey}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tags: ["enriched", `researched-${new Date().getFullYear()}`],
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// Retry finding the GHL contact — GHL workflow may need a few seconds to create it
async function findContactWithRetry(
  email: string,
  ghlApiKey: string,
  locationId: string,
  maxAttempts = 4,
  delayMs = 5000
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const id = await findGHLContact(email, ghlApiKey, locationId);
    if (id) return id;
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs * attempt));
    }
  }
  return null;
}

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

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (!serperApiKey || !claudeApiKey || !ghlApiKey || !ghlLocationId) {
    console.error("Missing required env vars for lead enrichment");
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: EnrichRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { submissionId, email, fullName, companyName, website } = body;

  if (!email || !fullName || !submissionId) {
    return new Response(
      JSON.stringify({ error: "submissionId, email, fullName are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Mark enrichment as in-progress
  await supabase
    .from("survey_submissions")
    .update({ enrichment_status: "processing" })
    .eq("id", submissionId);

  try {
    const searchTarget = companyName || fullName;

    // Run 5 parallel web searches
    const [generalResults, awardsResults, newsResults, financialResults, partnerResults] =
      await Promise.all([
        searchWeb(`"${searchTarget}" azienda ecommerce email marketing descrizione`, serperApiKey),
        searchWeb(`"${searchTarget}" premi riconoscimenti award certificazioni`, serperApiKey),
        searchWeb(`"${searchTarget}" news 2024 2025 comunicato`, serperApiKey),
        searchWeb(`"${searchTarget}" fatturato bilancio ricavi finanziamento`, serperApiKey),
        searchWeb(`"${searchTarget}" partner collaborazione clienti`, serperApiKey),
      ]);

    const searchResults: Record<string, SearchResult[]> = {
      "Informazioni Generali": generalResults,
      "Premi e Riconoscimenti": awardsResults,
      "News Recenti": newsResults,
      "Dati Fiscali e Finanziari": financialResults,
      "Partnership e Collaborazioni": partnerResults,
    };

    // Synthesize findings with Claude
    const report = await synthesizeWithClaude(
      searchTarget,
      fullName,
      website || "",
      searchResults,
      claudeApiKey
    );

    // Find GHL contact (retry since GHL workflow may need time to create it)
    const contactId = await findContactWithRetry(email, ghlApiKey, ghlLocationId);

    let ghlNoteAdded = false;
    let ghlTagged = false;

    if (contactId) {
      [ghlNoteAdded, ghlTagged] = await Promise.all([
        addGHLNote(contactId, report, ghlApiKey),
        tagGHLContact(contactId, ghlApiKey),
      ]);
    } else {
      console.warn(`GHL contact not found for email: ${email} after retries`);
    }

    // Update enrichment status in DB
    await supabase
      .from("survey_submissions")
      .update({
        enrichment_status: "completed",
        enrichment_completed_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    return new Response(
      JSON.stringify({
        success: true,
        contactId,
        ghlNoteAdded,
        ghlTagged,
        reportLength: report.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Enrichment failed:", err);

    await supabase
      .from("survey_submissions")
      .update({ enrichment_status: "failed" })
      .eq("id", submissionId);

    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
