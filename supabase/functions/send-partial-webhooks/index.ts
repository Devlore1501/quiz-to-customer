import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Label resolvers (mirror of frontend labels) ────────────────────────

const sectorOptions = [
  { value: "beauty", label: "Beauty & Personal Care" },
  { value: "fashion", label: "Abbigliamento & Accessori" },
  { value: "food", label: "Food & Beverage" },
  { value: "home", label: "Casa & Arredamento" },
  { value: "sport", label: "Sport & Outdoor" },
  { value: "vino", label: "Vino & Spirits" },
  { value: "health", label: "Salute & Integrazione" },
  { value: "other", label: "Altro settore" },
];
const revenueOptions = [
  { value: "under-10k", label: "Meno di 10.000€/mese" },
  { value: "10-25k", label: "10.000 – 25.000€/mese" },
  { value: "25-50k", label: "25.000 – 50.000€/mese" },
  { value: "50-100k", label: "50.000 – 100.000€/mese" },
  { value: "100-300k", label: "100.000 – 300.000€/mese" },
  { value: "300k+", label: "Oltre 300.000€/mese" },
];
const platformOptions = [
  { value: "shopify", label: "Shopify" },
  { value: "woocommerce", label: "WooCommerce" },
  { value: "other", label: "Altra piattaforma" },
];
const emailToolOptions = [
  { value: "klaviyo", label: "Klaviyo" },
  { value: "mailchimp", label: "Mailchimp o simili" },
  { value: "none", label: "Non uso nessun tool" },
  { value: "dont-know", label: "Non lo so" },
];
const emailRevenueOptions = [
  { value: "dont-know", label: "Non lo so" },
  { value: "0-10", label: "0 – 10%" },
  { value: "10-20", label: "10% – 20%" },
  { value: "20-30", label: "20% – 30%" },
  { value: "30-40", label: "30% – 40%" },
  { value: "over-40", label: "Oltre il 40%" },
];
const automationOptions = [
  { value: "welcome", label: "Benvenuto / Welcome Series" },
  { value: "cart_recovery", label: "Recupero Carrello" },
  { value: "checkout_recovery", label: "Recupero Checkout" },
  { value: "browse_abandonment", label: "Browser Abbandonato" },
  { value: "upsell", label: "Post-acquisto & Upsell" },
  { value: "winback", label: "Winback / Riattivazione" },
  { value: "sunset", label: "Sunset / Pulizia lista" },
  { value: "none", label: "Nessun flusso attivo" },
];
const segmentationOptions = [
  { value: "blast", label: "Mando a tutta la lista senza segmentare" },
  { value: "base", label: "Segmento in modo base (clienti vs non clienti)" },
  { value: "advanced", label: "Segmentazione avanzata per comportamento e LTV" },
  { value: "no-campaigns", label: "Non invio campagne regolari" },
];
const frequencyOptions = [
  { value: "none", label: "Nessun invio" },
  { value: "1-2", label: "1–2 email a settimana" },
  { value: "3-4", label: "3–4 email a settimana" },
  { value: "5-7", label: "5–7 email a settimana" },
  { value: "7+", label: "Più di 7 email a settimana" },
];
const listSizeOptions = [
  { value: "under-1k", label: "Meno di 1.000" },
  { value: "1-5k", label: "1.000 – 5.000" },
  { value: "5-10k", label: "5.000 – 10.000" },
  { value: "10-30k", label: "10.000 – 30.000" },
  { value: "30-50k", label: "30.000 – 50.000" },
  { value: "50k+", label: "Oltre 50.000" },
];
const motivationOptions = [
  { value: "increase_sales", label: "Voglio aumentare le vendite dalle email" },
  { value: "poor_results", label: "Non sto ottenendo risultati dalle campagne" },
  { value: "automation", label: "Voglio automatizzare il mio email marketing" },
  { value: "dont_know", label: "Non so da dove iniziare" },
  { value: "change_agency", label: "Sto valutando di cambiare agenzia/consulente" },
];

const labelFor = (opts: { value: string; label: string }[], v?: string | null) => {
  if (!v) return "";
  return opts.find((o) => o.value === v)?.label || v;
};
const labelsFor = (opts: { value: string; label: string }[], vs?: string[] | null) =>
  (vs || []).map((v) => labelFor(opts, v));

// ─── Payload builder ────────────────────────────────────────────────────

interface PartialRow {
  id: string;
  session_id: string;
  survey_type: string;
  current_step: number | null;
  current_step_name: string | null;
  total_steps: number | null;
  form_data: Record<string, unknown> | null;
  started_at: string;
  updated_at: string;
}

function buildPayload(row: PartialRow) {
  const fd = (row.form_data || {}) as Record<string, unknown>;
  const s = (k: string) => (typeof fd[k] === "string" ? (fd[k] as string) : "");
  const arr = (k: string) => (Array.isArray(fd[k]) ? (fd[k] as string[]) : []);

  const activeFlows = arr("activeFlows");

  return {
    tag: "partial",
    type: "partial_lead",
    source: "email-marketing-quiz",
    timestamp: new Date().toISOString(),
    session_id: row.session_id,
    current_step: row.current_step,
    current_step_name: row.current_step_name,
    total_steps: row.total_steps,
    started_at: row.started_at,
    last_activity_at: row.updated_at,
    quickSummary: {
      leadName: s("fullName") || s("name") || "",
      leadEmail: s("email"),
      leadPhone: s("phone") || null,
      companyName: s("companyName") || "",
      website: s("website") || null,
      sector: labelFor(sectorOptions, s("sector")),
      sectorRaw: s("sector"),
      customSector: s("sector") === "other" ? s("customSector") : null,
      monthlyRevenueLabel: labelFor(revenueOptions, s("monthlyRevenue")),
      monthlyRevenueRaw: s("monthlyRevenue"),
      platform: s("platform"),
      platformLabel: labelFor(platformOptions, s("platform")),
      emailTool: s("emailTool"),
      emailToolLabel: labelFor(emailToolOptions, s("emailTool")),
      emailRevenuePercentage: s("emailRevenuePercentage"),
      emailRevenuePercentageLabel: labelFor(emailRevenueOptions, s("emailRevenuePercentage")),
      activeFlows,
      activeFlowsLabels: labelsFor(automationOptions, activeFlows),
      activeFlowsCount: activeFlows.filter((f) => f !== "none").length,
      segmentation: s("segmentation"),
      segmentationLabel: labelFor(segmentationOptions, s("segmentation")),
      emailFrequency: s("emailFrequency"),
      emailFrequencyLabel: labelFor(frequencyOptions, s("emailFrequency")),
      listSize: s("listSize"),
      listSizeLabel: labelFor(listSizeOptions, s("listSize")),
      motivation: s("motivation"),
      motivationLabel: labelFor(motivationOptions, s("motivation")),
    },
  };
}

async function postJson(url: string, body: unknown): Promise<boolean> {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) console.error(`Webhook ${url} failed:`, r.status);
    return r.ok;
  } catch (e) {
    console.error(`Webhook ${url} error:`, e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const minutesParam = url.searchParams.get("minutes");
    const minutes = Math.max(0, Number.parseInt(minutesParam ?? "30", 10) || 30);

    const makeUrl = Deno.env.get("MAKE_WEBHOOK_URL");
    const ghlUrl = Deno.env.get("GHL_WEBHOOK_URL");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff = new Date(Date.now() - minutes * 60_000).toISOString();

    const { data: rows, error } = await supabase
      .from("partial_submissions")
      .select(
        "id, session_id, survey_type, current_step, current_step_name, total_steps, form_data, started_at, updated_at",
      )
      .eq("completed", false)
      .eq("partial_synced", false)
      .lt("updated_at", cutoff)
      .not("form_data->>email", "is", null)
      .neq("form_data->>email", "")
      .limit(100);

    if (error) {
      console.error("Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const row of (rows || []) as PartialRow[]) {
      const payload = buildPayload(row);
      const results: boolean[] = [];
      if (makeUrl) results.push(await postJson(makeUrl, payload));
      if (ghlUrl) results.push(await postJson(ghlUrl, payload));
      const anyOk = results.some((r) => r);

      if (anyOk) {
        const { error: updErr } = await supabase
          .from("partial_submissions")
          .update({ partial_synced: true, partial_synced_at: new Date().toISOString() })
          .eq("id", row.id);
        if (updErr) console.error("Update sync flag failed:", updErr);
        sent++;
      } else {
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed: rows?.length || 0, sent, failed, minutes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-partial-webhooks error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
