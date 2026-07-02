import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = [
  'https://quiz-to-customer.lovable.app',
  'https://id-preview--f5d761d0-cabe-4d00-a441-f6abbada657c.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

const USER_AGENT = 'mailift-news-digest/1.0 (news digest for mailift.com)';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_CANDIDATES = 50;
const SNIPPET_MAX = 200;

const REDDIT_URL =
  'https://www.reddit.com/r/emailmarketing+ecommerce+shopify+klaviyo+marketing/top.json?t=day&limit=50';

const GOOGLE_NEWS_QUERIES = [
  '"email marketing"',
  'ecommerce email klaviyo OR mailchimp OR "email automation"',
  'shopify marketing news',
];

const BLOG_FEEDS: { name: string; url: string }[] = [
  { name: 'Klaviyo Blog', url: 'https://www.klaviyo.com/blog/feed' },
  { name: 'Litmus Blog', url: 'https://www.litmus.com/blog/feed' },
  { name: 'Email on Acid', url: 'https://www.emailonacid.com/blog/feed/' },
  { name: 'Practical Ecommerce', url: 'https://www.practicalecommerce.com/feed' },
];

const HN_QUERIES = ['email marketing', 'ecommerce'];

// ---------------------------------------------------------------------------
// CORS + rate limiting (same patterns as submit-webhook)
// ---------------------------------------------------------------------------

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovableproject.com')
  );
  const allowedOrigin = isAllowed ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW = 60_000;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

interface NewsCandidate {
  title: string;
  url: string;
  source: string;
  points?: number;
  num_comments?: number;
  snippet: string;
  published_at?: string;
}

interface SourceResult {
  source: string;
  items: NewsCandidate[];
  error?: string;
}

function cleanText(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

// Minimal RSS/Atom parsing without XML deps: extract <item>/<entry> blocks via regex.
function extractTag(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1] : null;
}

export function parseRssItems(xml: string, sourceName: string): NewsCandidate[] {
  const items: NewsCandidate[] = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const block of blocks) {
    const rawTitle = extractTag(block, 'title');
    if (!rawTitle) continue;
    let url = extractTag(block, 'link') ?? '';
    if (!url.trim()) {
      // Atom-style <link href="..."/>
      const hrefMatch = block.match(/<link[^>]*href="([^"]+)"/i);
      url = hrefMatch ? hrefMatch[1] : '';
    }
    url = cleanText(url);
    const title = cleanText(rawTitle);
    if (!title || !url) continue;
    const description = extractTag(block, 'description') ?? extractTag(block, 'summary') ?? '';
    const pubDate = extractTag(block, 'pubDate') ?? extractTag(block, 'published') ?? extractTag(block, 'updated');
    items.push({
      title,
      url,
      source: sourceName,
      snippet: truncate(cleanText(description), SNIPPET_MAX),
      published_at: pubDate ? cleanText(pubDate) : undefined,
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

async function fetchReddit(): Promise<SourceResult> {
  const res = await fetchWithTimeout(REDDIT_URL);
  if (!res.ok) throw new Error(`Reddit HTTP ${res.status}`);
  const json = await res.json();
  const children: Array<{ data: Record<string, unknown> }> = json?.data?.children ?? [];
  const items: NewsCandidate[] = children
    .map((c) => c.data)
    .filter((d) => d && typeof d.title === 'string')
    .map((d) => ({
      title: d.title as string,
      url: `https://www.reddit.com${d.permalink as string ?? ''}`,
      source: `Reddit r/${d.subreddit as string ?? ''}`,
      points: typeof d.score === 'number' ? d.score : undefined,
      num_comments: typeof d.num_comments === 'number' ? d.num_comments : undefined,
      snippet: truncate(cleanText((d.selftext as string) ?? ''), SNIPPET_MAX),
      published_at: typeof d.created_utc === 'number'
        ? new Date((d.created_utc as number) * 1000).toISOString()
        : undefined,
    }))
    .filter((i) => (i.points ?? 0) >= 5);
  return { source: 'reddit', items };
}

async function fetchGoogleNews(): Promise<SourceResult> {
  const results = await Promise.allSettled(
    GOOGLE_NEWS_QUERIES.map(async (query) => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      return parseRssItems(xml, 'Google News').slice(0, 15);
    }),
  );
  const items: NewsCandidate[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else errors.push(`${GOOGLE_NEWS_QUERIES[i]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
  });
  if (items.length === 0 && errors.length > 0) throw new Error(errors.join('; '));
  return { source: 'google-news', items, error: errors.length ? errors.join('; ') : undefined };
}

async function fetchBlogFeeds(): Promise<SourceResult> {
  const results = await Promise.allSettled(
    BLOG_FEEDS.map(async (feed) => {
      const res = await fetchWithTimeout(feed.url);
      if (!res.ok) throw new Error(`${feed.name} HTTP ${res.status}`);
      const xml = await res.text();
      // Blogs publish rarely: keep only the freshest few per feed
      return parseRssItems(xml, feed.name).slice(0, 5);
    }),
  );
  const items: NewsCandidate[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else errors.push(`${BLOG_FEEDS[i].name}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
  });
  if (items.length === 0 && errors.length > 0) throw new Error(errors.join('; '));
  return { source: 'blogs', items, error: errors.length ? errors.join('; ') : undefined };
}

async function fetchHackerNews(): Promise<SourceResult> {
  const results = await Promise.allSettled(
    HN_QUERIES.map(async (query) => {
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query)}&tags=story&numericFilters=points>10&hitsPerPage=15`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const hits: Array<Record<string, unknown>> = json?.hits ?? [];
      return hits
        .filter((h) => typeof h.title === 'string')
        .map((h) => ({
          title: h.title as string,
          url: (h.url as string) || `https://news.ycombinator.com/item?id=${h.objectID as string}`,
          source: 'Hacker News',
          points: typeof h.points === 'number' ? h.points : undefined,
          num_comments: typeof h.num_comments === 'number' ? h.num_comments : undefined,
          snippet: '',
          published_at: h.created_at as string | undefined,
        }));
    }),
  );
  const items: NewsCandidate[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else errors.push(`${HN_QUERIES[i]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
  });
  if (items.length === 0 && errors.length > 0) throw new Error(errors.join('; '));
  return { source: 'hacker-news', items, error: errors.length ? errors.join('; ') : undefined };
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9à-ù ]/g, '').replace(/\s+/g, ' ').trim();
}

function dedupeCandidates(items: NewsCandidate[], excludeUrls: Set<string>): NewsCandidate[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const out: NewsCandidate[] = [];
  for (const item of items) {
    const nu = normalizeUrl(item.url);
    const nt = normalizeTitle(item.title);
    if (excludeUrls.has(nu) || seenUrls.has(nu) || (nt && seenTitles.has(nt))) continue;
    seenUrls.add(nu);
    if (nt) seenTitles.add(nt);
    out.push(item);
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Claude digest generation
// ---------------------------------------------------------------------------

const ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title', 'url', 'source', 'relevance_score', 'why_it_matters_it',
    'linkedin_hook_it', 'linkedin_post_it', 'reel_script_30_60s_it', 'newsletter_angle_it',
  ],
  properties: {
    title: { type: 'string' },
    url: { type: 'string' },
    source: { type: 'string' },
    relevance_score: { type: 'integer' },
    why_it_matters_it: { type: 'string' },
    linkedin_hook_it: { type: 'string' },
    linkedin_post_it: { type: 'string' },
    reel_script_30_60s_it: { type: 'string' },
    newsletter_angle_it: { type: 'string' },
  },
} as const;

const DIGEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['date', 'intro_it', 'items', 'reproposals'],
  properties: {
    date: { type: 'string' },
    intro_it: { type: 'string' },
    items: { type: 'array', items: ITEM_SCHEMA },
    reproposals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['saved_item_id', 'title', 'new_angle_it', 'linkedin_hook_it', 'reel_script_30_60s_it'],
        properties: {
          saved_item_id: { type: 'string' },
          title: { type: 'string' },
          new_angle_it: { type: 'string' },
          linkedin_hook_it: { type: 'string' },
          reel_script_30_60s_it: { type: 'string' },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `Sei il content strategist di Mailift (mailift.com), agenzia italiana di email marketing per ecommerce. Il tuo pubblico: founder e marketer di ecommerce italiani.

Ogni mattina ricevi una lista di notizie e discussioni fresche dal mondo email marketing / ecommerce. Il tuo compito:
1. Seleziona ESATTAMENTE le 8 notizie più rilevanti e interessanti per il pubblico (novità di piattaforme come Klaviyo/Shopify/Gmail, deliverability, trend ecommerce, case study, discussioni calde). Assegna a ciascuna un relevance_score da 1 a 10. Ignora spam, autopromozione e notizie irrilevanti.
2. Per ogni notizia scelta genera contenuti IN ITALIANO, pensati per dare valore concreto e diventare virali:
   - why_it_matters_it: 1-2 frasi su perché conta per chi fa email marketing/ecommerce.
   - linkedin_hook_it: prima riga forte del post LinkedIn (pattern interrupt, numero, domanda provocatoria — max 120 caratteri).
   - linkedin_post_it: post LinkedIn completo (120-220 parole): hook, insight pratici in elenco, takeaway, CTA leggera. Niente hashtag spam (max 3).
   - reel_script_30_60s_it: script parlato per Reel/TikTok 30-60s: hook nei primi 3 secondi, 2-3 punti di valore, chiusura con CTA. Indica [PAUSA] e [TESTO A SCHERMO] dove utile.
   - newsletter_angle_it: angolo/oggetto per riusare la notizia nella newsletter clienti (1-2 frasi + una proposta di subject line).
3. Se ricevi una lista di "notizie salvate" (archivio evergreen), scegli 0-2 notizie che vale la pena riproporre OGGI con un angolo nuovo e genera per ciascuna: new_angle_it, linkedin_hook_it, reel_script_30_60s_it. Usa il loro saved_item_id esatto. Se nessuna merita, restituisci un array vuoto.
4. intro_it: 2-3 frasi di apertura del digest con il tema del giorno.

Stile: diretto, concreto, zero fuffa, da operatore che conosce i numeri. Tutto il contenuto generato in italiano (i titoli originali restano nella loro lingua).`;

interface SavedItemForPrompt {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  saved_at: string;
  times_reproposed: number;
  notes: string | null;
}

function buildUserPrompt(candidates: NewsCandidate[], saved: SavedItemForPrompt[], dateRome: string): string {
  const lines: string[] = [`Data di oggi: ${dateRome}`, '', `NOTIZIE FRESCHE (${candidates.length} candidate):`];
  candidates.forEach((c, i) => {
    const meta = [
      c.source,
      c.points !== undefined ? `${c.points} punti` : null,
      c.num_comments !== undefined ? `${c.num_comments} commenti` : null,
      c.published_at ?? null,
    ].filter(Boolean).join(' · ');
    lines.push(`${i + 1}. ${c.title}`, `   URL: ${c.url}`, `   [${meta}]`);
    if (c.snippet) lines.push(`   ${c.snippet}`);
  });
  if (saved.length > 0) {
    lines.push('', `NOTIZIE SALVATE IN ARCHIVIO (candidate alla riproposta, 0-2 da scegliere):`);
    saved.forEach((s) => {
      lines.push(
        `- saved_item_id: ${s.id}`,
        `  ${s.title} (${s.source ?? 'fonte sconosciuta'}, salvata il ${s.saved_at.slice(0, 10)}, riproposta ${s.times_reproposed} volte)`,
      );
      if (s.notes) lines.push(`  Note: ${s.notes}`);
    });
  } else {
    lines.push('', 'Nessuna notizia salvata in archivio: restituisci reproposals come array vuoto.');
  }
  return lines.join('\n');
}

interface DigestData {
  date: string;
  intro_it: string;
  items: Array<Record<string, unknown> & { title: string; url: string }>;
  reproposals: Array<{ saved_item_id: string; title: string; new_angle_it: string; linkedin_hook_it: string; reel_script_30_60s_it: string }>;
}

const CLAUDE_MODEL = 'claude-opus-4-8';

async function generateDigest(
  candidates: NewsCandidate[],
  saved: SavedItemForPrompt[],
  dateRome: string,
): Promise<{ digest: DigestData; stopReason: string | null }> {
  const anthropic = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    timeout: 110_000,
    maxRetries: 1,
  });

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: 'json_schema', schema: DIGEST_SCHEMA } },
    messages: [{ role: 'user', content: buildUserPrompt(candidates, saved, dateRome) }],
  });

  const textBlock = response.content.find((b: { type: string }) => b.type === 'text') as { text: string } | undefined;
  if (!textBlock) throw new Error(`No text block in Claude response (stop_reason: ${response.stop_reason})`);
  const digest = JSON.parse(textBlock.text) as DigestData;
  return { digest, stopReason: response.stop_reason };
}

// ---------------------------------------------------------------------------
// Resend email (optional)
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildEmailHtml(digest: DigestData, dateRome: string): string {
  const itemHtml = digest.items.map((item) => `
    <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #e2e8f0;">
      <h3 style="margin:0 0 4px;"><a href="${escapeHtml(item.url)}" style="color:#0f172a;">${escapeHtml(item.title)}</a></h3>
      <p style="margin:0 0 8px;color:#64748b;font-size:13px;">${escapeHtml(String(item.source ?? ''))} · rilevanza ${escapeHtml(String(item.relevance_score ?? ''))}/10</p>
      <p style="margin:0 0 10px;">${escapeHtml(String(item.why_it_matters_it ?? ''))}</p>
      <p style="margin:0 0 6px;"><strong>🎯 Hook LinkedIn:</strong> ${escapeHtml(String(item.linkedin_hook_it ?? ''))}</p>
      <details><summary style="cursor:pointer;color:#ea580c;">Post LinkedIn completo</summary><p style="white-space:pre-wrap;">${escapeHtml(String(item.linkedin_post_it ?? ''))}</p></details>
      <details><summary style="cursor:pointer;color:#ea580c;">Script Reel 30-60s</summary><p style="white-space:pre-wrap;">${escapeHtml(String(item.reel_script_30_60s_it ?? ''))}</p></details>
      <p style="margin:8px 0 0;color:#475569;"><strong>📧 Newsletter:</strong> ${escapeHtml(String(item.newsletter_angle_it ?? ''))}</p>
    </div>`).join('');

  const reproposalHtml = digest.reproposals.length === 0 ? '' : `
    <h2 style="color:#0f172a;">♻️ Da riproporre oggi</h2>
    ${digest.reproposals.map((r) => `
      <div style="margin-bottom:20px;padding:12px;background:#fff7ed;border-radius:8px;">
        <h3 style="margin:0 0 6px;">${escapeHtml(r.title)}</h3>
        <p style="margin:0 0 6px;"><strong>Nuovo angolo:</strong> ${escapeHtml(r.new_angle_it)}</p>
        <p style="margin:0 0 6px;"><strong>🎯 Hook:</strong> ${escapeHtml(r.linkedin_hook_it)}</p>
        <details><summary style="cursor:pointer;color:#ea580c;">Script Reel</summary><p style="white-space:pre-wrap;">${escapeHtml(r.reel_script_30_60s_it)}</p></details>
      </div>`).join('')}`;

  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#1e293b;">
    <h1 style="color:#0f172a;">📬 Mailift News Digest — ${escapeHtml(dateRome)}</h1>
    <p>${escapeHtml(digest.intro_it)}</p>
    ${itemHtml}
    ${reproposalHtml}
    <p style="color:#94a3b8;font-size:12px;">Digest generato automaticamente. Archivio completo su /admin/news.</p>
  </body></html>`;
}

async function sendDigestEmail(digest: DigestData, dateRome: string): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('DIGEST_EMAIL_TO');
  if (!apiKey || !to) {
    console.log('Resend not configured (RESEND_API_KEY / DIGEST_EMAIL_TO missing), skipping email');
    return false;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('DIGEST_EMAIL_FROM') ?? 'Mailift Digest <onboarding@resend.dev>',
        to: [to],
        subject: `📬 News Digest ${dateRome} — email marketing & ecommerce`,
        html: buildEmailHtml(digest, dateRome),
      }),
    });
    if (!res.ok) {
      console.error('Resend error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('Resend send failed:', e instanceof Error ? e.message : e);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return json({ error: 'Server misconfigured' }, 500);
    if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

    const supabase = createClient(supabaseUrl, serviceKey);

    // --- Auth: cron (service key bearer) or admin user JWT ---
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Unauthorized' }, 401);

    let caller = 'cron';
    if (token !== serviceKey) {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) return json({ error: 'Unauthorized' }, 401);
      const { data: isAdmin, error: roleError } = await supabase.rpc('has_role', {
        _user_id: userData.user.id,
        _role: 'admin',
      });
      if (roleError || !isAdmin) return json({ error: 'Forbidden' }, 403);
      caller = `admin:${userData.user.id}`;
    }

    if (!checkRateLimit(caller)) return json({ error: 'Rate limit exceeded' }, 429);

    // Today's date in Europe/Rome (en-CA gives YYYY-MM-DD)
    const dateRome = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
    console.log(`Digest run started for ${dateRome} (caller: ${caller.split(':')[0]})`);

    // --- 1. Fetch all sources in parallel ---
    const fetchers: Array<[string, () => Promise<SourceResult>]> = [
      ['reddit', fetchReddit],
      ['google-news', fetchGoogleNews],
      ['blogs', fetchBlogFeeds],
      ['hacker-news', fetchHackerNews],
    ];
    const settled = await Promise.allSettled(fetchers.map(([, fn]) => fn()));
    const sourcesSummary: Record<string, { count: number; error?: string }> = {};
    const allItems: NewsCandidate[] = [];
    settled.forEach((r, i) => {
      const name = fetchers[i][0];
      if (r.status === 'fulfilled') {
        sourcesSummary[name] = { count: r.value.items.length, error: r.value.error };
        allItems.push(...r.value.items);
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        sourcesSummary[name] = { count: 0, error: msg };
        console.error(`Source ${name} failed:`, msg);
      }
    });

    // --- 2. Exclude URLs already used in the last 7 digests ---
    const { data: recentDigests } = await supabase
      .from('daily_digests')
      .select('digest_data')
      .order('digest_date', { ascending: false })
      .limit(7);
    const excludeUrls = new Set<string>();
    for (const row of recentDigests ?? []) {
      const items = (row.digest_data as { items?: Array<{ url?: string }> } | null)?.items ?? [];
      for (const it of items) if (it.url) excludeUrls.add(normalizeUrl(it.url));
    }

    const candidates = dedupeCandidates(allItems, excludeUrls);
    console.log(`Candidates after dedupe: ${candidates.length}`, JSON.stringify(sourcesSummary));

    if (candidates.length === 0) {
      await supabase.from('daily_digests').upsert({
        digest_date: dateRome,
        status: 'error',
        error: 'No candidates from any source',
        sources_summary: sourcesSummary,
        model: CLAUDE_MODEL,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'digest_date' });
      return json({ error: 'No candidates from any source', sources_summary: sourcesSummary }, 502);
    }

    // --- 3. Load saved items eligible for reproposal ---
    const { data: savedRows } = await supabase
      .from('saved_news_items')
      .select('id, title, url, source, created_at, times_reproposed, notes')
      .eq('status', 'saved')
      .order('last_reproposed_at', { ascending: true, nullsFirst: true })
      .limit(10);
    const savedForPrompt: SavedItemForPrompt[] = (savedRows ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      source: s.source,
      saved_at: s.created_at,
      times_reproposed: s.times_reproposed,
      notes: s.notes,
    }));

    // --- 4. Claude call ---
    const { digest, stopReason } = await generateDigest(candidates, savedForPrompt, dateRome);
    const status = stopReason === 'max_tokens' ? 'partial' : 'success';

    // Keep only reproposals that reference real saved items
    const savedIds = new Set(savedForPrompt.map((s) => s.id));
    digest.reproposals = (digest.reproposals ?? []).filter((r) => savedIds.has(r.saved_item_id));

    // --- 5. Persist digest ---
    const { data: digestRow, error: upsertError } = await supabase
      .from('daily_digests')
      .upsert({
        digest_date: dateRome,
        status,
        digest_data: digest,
        sources_summary: sourcesSummary,
        error: null,
        model: CLAUDE_MODEL,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'digest_date' })
      .select('id')
      .single();
    if (upsertError) throw new Error(`Upsert failed: ${upsertError.message}`);

    // --- 6. Mark reproposed saved items ---
    for (const r of digest.reproposals) {
      const current = savedForPrompt.find((s) => s.id === r.saved_item_id);
      await supabase
        .from('saved_news_items')
        .update({
          times_reproposed: (current?.times_reproposed ?? 0) + 1,
          last_reproposed_at: new Date().toISOString(),
        })
        .eq('id', r.saved_item_id);
    }

    // --- 7. Optional email ---
    const emailSent = await sendDigestEmail(digest, dateRome);
    if (emailSent) {
      await supabase.from('daily_digests').update({ email_sent: true }).eq('id', digestRow.id);
    }

    console.log(`Digest ${dateRome} completed: ${digest.items.length} items, ${digest.reproposals.length} reproposals, email=${emailSent}`);
    return json({
      success: true,
      digest_date: dateRome,
      status,
      items: digest.items.length,
      reproposals: digest.reproposals.length,
      email_sent: emailSent,
      sources_summary: sourcesSummary,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('generate-daily-digest error:', msg);
    // Best-effort error record so the admin page shows the failure
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const dateRome = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
      await supabase.from('daily_digests').upsert({
        digest_date: dateRome,
        status: 'error',
        error: msg,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'digest_date' });
    } catch { /* ignore */ }
    return json({ error: 'Internal error', detail: msg }, 500);
  }
});
