import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// SSRF Protection: Block internal/private network addresses
const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,  // AWS metadata
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,  // IPv6 loopback
  /^\[?fe80:/i,   // IPv6 link-local
  /^\[?fc00:/i,   // IPv6 private
  /^\[?fd00:/i,   // IPv6 private
];

// Check if URL points to internal/private network
function isInternalUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    // Check against blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(hostname)) {
        return true;
      }
    }
    
    // Block metadata endpoints
    if (hostname.includes('metadata.google') || 
        hostname.includes('metadata.aws') ||
        hostname.includes('169.254')) {
      return true;
    }
    
    // Only allow http and https protocols
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return true;
    }
    
    return false;
  } catch {
    return true; // Invalid URL = blocked
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Blacklist di brand famosi che non possono essere registrati
const BLACKLISTED_DOMAINS = [
  // Fashion
  'nike.com', 'nike.it', 'adidas.com', 'adidas.it', 'zara.com', 'zara.it',
  'hm.com', 'zalando.it', 'zalando.com', 'asos.com', 'asos.it',
  'gucci.com', 'prada.com', 'louisvuitton.com', 'chanel.com', 'dior.com',
  'armani.com', 'versace.com', 'burberry.com', 'balenciaga.com',
  'uniqlo.com', 'shein.com', 'boohoo.com', 'prettylittlething.com',
  
  // Tech & Electronics
  'apple.com', 'apple.it', 'samsung.com', 'samsung.it', 'amazon.it', 'amazon.com',
  'microsoft.com', 'google.com', 'sony.com', 'lg.com', 'huawei.com',
  'mediaworld.it', 'unieuro.it', 'euronics.it',
  
  // Beauty
  'sephora.it', 'sephora.com', 'douglas.it', 'mac.com', 'maccosmetics.com',
  'loreal.com', 'esteelauder.com', 'clinique.com', 'nars.com', 'urbandecay.com',
  'kikocosmetics.com', 'kiko.com', 'maybelline.com', 'nyxcosmetics.com',
  
  // Food & Grocery
  'esselunga.it', 'carrefour.it', 'coop.it', 'conad.it', 'lidl.it',
  'eurospin.it', 'aldi.it', 'penny.it', 'pam.it', 'despar.it',
  'deliveroo.it', 'justeat.it', 'glovo.com', 'ubereats.com',
  
  // Marketplaces
  'ebay.it', 'ebay.com', 'aliexpress.com', 'wish.com', 'temu.com',
  'etsy.com', 'subito.it', 'vinted.it', 'depop.com',
  
  // Home & Furniture
  'ikea.com', 'ikea.it', 'maisonsdumonde.com', 'leroy-merlin.it',
  'mondoconvenienza.it', 'westelm.com', 'wayfair.com',
  
  // Sport
  'decathlon.it', 'decathlon.com', 'footlocker.it', 'jdsports.it',
  'cisalfasport.it', 'sportler.com',
  
  // Generic
  'facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com',
  'youtube.com', 'linkedin.com', 'pinterest.com',
];

// Keywords generiche e-commerce
const ECOMMERCE_KEYWORDS = [
  // Italiano
  'carrello', 'acquista', 'compra', 'aggiungi al carrello', 'checkout',
  'prodotto', 'prodotti', 'negozio', 'shop', 'store', 'catalogo',
  'prezzo', 'prezzi', 'sconto', 'sconti', 'offerta', 'offerte', 'promozione',
  'spedizione', 'consegna', 'pagamento', 'ordine', 'ordini',
  'aggiungi alla wishlist', 'lista desideri', 'disponibile', 'esaurito',
  'taglia', 'colore', 'quantità', 'recensioni', 'valutazione',
  
  // Inglese
  'cart', 'add to cart', 'buy now', 'purchase', 'shop now',
  'product', 'products', 'price', 'discount', 'sale', 'offer',
  'shipping', 'delivery', 'payment', 'order', 'wishlist',
  'size', 'color', 'quantity', 'reviews', 'rating', 'in stock', 'out of stock'
];

// Keywords per settore
const SECTOR_KEYWORDS: Record<string, string[]> = {
  'beauty': [
    'makeup', 'skincare', 'cosmetic', 'beauty', 'trucco', 'crema', 'siero',
    'fondotinta', 'rossetto', 'mascara', 'ombretto', 'profumo', 'fragranza',
    'cura della pelle', 'anti-age', 'idratante', 'detergente', 'tonico',
    'nail', 'unghie', 'capelli', 'hair', 'shampoo', 'balsamo',
    'beauty routine', 'glow', 'luminoso', 'naturale', 'bio', 'vegan'
  ],
  'fashion': [
    'abbigliamento', 'moda', 'vestiti', 'clothing', 'fashion', 'style',
    'shoes', 'scarpe', 'borse', 'bags', 'accessori', 'accessories',
    'outfit', 'look', 'collezione', 'collection', 'tendenza', 'trend',
    'donna', 'uomo', 'bambino', 'women', 'men', 'kids',
    'jeans', 'maglietta', 't-shirt', 'giacca', 'cappotto', 'vestito'
  ],
  'food': [
    'cibo', 'alimentari', 'gourmet', 'food', 'ingredienti', 'ricetta',
    'biologico', 'organic', 'km0', 'artigianale', 'handmade',
    'vino', 'wine', 'olio', 'oil', 'pasta', 'dolci', 'sweet',
    'salato', 'savory', 'fresco', 'fresh', 'naturale', 'natural',
    'degustazione', 'tasting', 'tipico', 'tradizionale', 'italiano'
  ],
  'home': [
    'arredamento', 'casa', 'mobili', 'furniture', 'home', 'interior',
    'design', 'decorazione', 'decor', 'living', 'soggiorno', 'camera',
    'cucina', 'kitchen', 'bagno', 'bathroom', 'giardino', 'garden',
    'illuminazione', 'lighting', 'tessile', 'textile', 'tappeto', 'rug'
  ],
  'electronics': [
    'elettronica', 'tech', 'technology', 'smartphone', 'computer', 'laptop',
    'tablet', 'accessori tech', 'gadget', 'audio', 'video', 'tv',
    'cuffie', 'headphones', 'speaker', 'gaming', 'console', 'pc'
  ],
  'sport': [
    'fitness', 'sport', 'palestra', 'gym', 'workout', 'training',
    'running', 'corsa', 'ciclismo', 'cycling', 'yoga', 'pilates',
    'integratori', 'supplements', 'abbigliamento sportivo', 'sportswear',
    'attrezzatura', 'equipment', 'outdoor', 'adventure'
  ],
  'health': [
    'salute', 'health', 'benessere', 'wellness', 'integratori', 'supplements',
    'vitamine', 'vitamins', 'naturale', 'natural', 'bio', 'organic',
    'farmacia', 'pharmacy', 'parafarmacia', 'cura', 'care'
  ],
  'kids': [
    'bambini', 'kids', 'children', 'baby', 'neonato', 'infant',
    'giocattoli', 'toys', 'abbigliamento bambini', 'kids clothing',
    'passeggino', 'stroller', 'seggiolino', 'car seat', 'pannolini', 'diapers'
  ],
  'jewelry': [
    'gioielli', 'jewelry', 'jewellery', 'oro', 'gold', 'argento', 'silver',
    'diamante', 'diamond', 'anello', 'ring', 'collana', 'necklace',
    'bracciale', 'bracelet', 'orecchini', 'earrings', 'orologi', 'watches'
  ],
  'pets': [
    'animali', 'pets', 'cane', 'dog', 'gatto', 'cat', 'pet food',
    'cibo per animali', 'accessori animali', 'pet accessories',
    'veterinario', 'vet', 'cuccia', 'guinzaglio', 'leash'
  ]
};

// Normalizza URL
function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  
  // Rimuove protocollo per confronto
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  normalized = normalized.replace(/\/$/, ''); // Rimuove trailing slash
  
  return normalized;
}

// Controlla se è nella blacklist
function isBlacklisted(url: string): boolean {
  const normalized = normalizeUrl(url);
  
  return BLACKLISTED_DOMAINS.some(domain => {
    const normalizedDomain = normalizeUrl(domain);
    return normalized === normalizedDomain || 
           normalized.endsWith('.' + normalizedDomain) ||
           normalized.startsWith(normalizedDomain + '/');
  });
}

// Conta keywords trovate
function countKeywords(html: string, keywords: string[]): number {
  const lowerHtml = html.toLowerCase();
  return keywords.filter(keyword => lowerHtml.includes(keyword.toLowerCase())).length;
}

// Mappa settore dal survey al nostro formato
function mapSector(surveyAnswer: string): string {
  const sectorMap: Record<string, string> = {
    'beauty': 'beauty',
    'fashion': 'fashion',
    'food': 'food',
    'home': 'home',
    'electronics': 'electronics',
    'sport': 'sport',
    'health': 'health',
    'kids': 'kids',
    'jewelry': 'jewelry',
    'pets': 'pets',
    // Mappature alternative
    'cosmetica': 'beauty',
    'bellezza': 'beauty',
    'moda': 'fashion',
    'abbigliamento': 'fashion',
    'alimentari': 'food',
    'cibo': 'food',
    'arredamento': 'home',
    'casa': 'home',
    'tecnologia': 'electronics',
    'tech': 'electronics',
    'fitness': 'sport',
    'salute': 'health',
    'benessere': 'health',
    'bambini': 'kids',
    'gioielli': 'jewelry',
    'animali': 'pets'
  };
  
  const lowerSector = surveyAnswer.toLowerCase();
  
  for (const [key, value] of Object.entries(sectorMap)) {
    if (lowerSector.includes(key)) {
      return value;
    }
  }
  
  return 'generic';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, sector } = await req.json();
    
    console.log(`Verifying website: ${url} in sector: ${sector}`);

    // Validazione input
    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({
          isValid: false,
          error: 'URL non fornito',
          checks: { isReachable: false, isEcommerce: false, sectorMatch: false, isBlacklisted: false }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalizza URL per le verifiche
    let normalizedUrl = url.trim().toLowerCase();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl.replace(/^www\./, '');
    }

    // 1. Check blacklist
    if (isBlacklisted(normalizedUrl)) {
      console.log(`Blacklisted domain detected: ${normalizedUrl}`);
      return new Response(
        JSON.stringify({
          isValid: false,
          error: 'Questo dominio appartiene a un brand protetto. Inserisci il tuo sito e-commerce.',
          checks: { isReachable: true, isEcommerce: true, sectorMatch: true, isBlacklisted: true },
          confidence: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch del sito
    let html = '';
    let isReachable = false;
    
    // SSRF Check: Validate URL before fetching
    if (isInternalUrl(normalizedUrl)) {
      console.log(`Blocked internal URL: ${normalizedUrl}`);
      return new Response(
        JSON.stringify({
          isValid: false,
          error: 'URL non valido. Inserisci un URL pubblico.',
          checks: { isReachable: false, isEcommerce: false, sectorMatch: false, isBlacklisted: false },
          confidence: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec timeout
      
      const response = await fetch(normalizedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebsiteVerifier/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8'
        },
        signal: controller.signal,
        redirect: 'follow'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        isReachable = true;
        html = await response.text();
        console.log(`Successfully fetched ${normalizedUrl}, HTML length: ${html.length}`);
      } else {
        console.log(`Failed to fetch ${normalizedUrl}: ${response.status}`);
      }
    } catch (fetchError) {
      console.log(`Fetch error for ${normalizedUrl}:`, fetchError.message);
      
      // Se il fetch fallisce, proviamo senza https
      if (normalizedUrl.startsWith('https://')) {
        try {
          const httpUrl = normalizedUrl.replace('https://', 'http://');
          
          // SSRF Check for fallback URL
          if (isInternalUrl(httpUrl)) {
            console.log(`Blocked internal fallback URL: ${httpUrl}`);
            // Don't try fallback for internal URLs
          } else {
            const response = await fetch(httpUrl, {
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; WebsiteVerifier/1.0)',
                'Accept': 'text/html'
              },
              redirect: 'follow'
            });
            
            if (response.ok) {
              isReachable = true;
              html = await response.text();
            }
          }
        } catch {
          // Ignora errore del fallback
        }
      }
    }

    if (!isReachable) {
      return new Response(
        JSON.stringify({
          isValid: false,
          error: 'Il sito non risponde. Verifica che l\'URL sia corretto e che il sito sia online.',
          checks: { isReachable: false, isEcommerce: false, sectorMatch: false, isBlacklisted: false },
          confidence: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Analisi e-commerce
    const ecommerceKeywordsFound = countKeywords(html, ECOMMERCE_KEYWORDS);
    const isEcommerce = ecommerceKeywordsFound >= 3; // Almeno 3 keywords
    
    console.log(`E-commerce keywords found: ${ecommerceKeywordsFound}`);

    // 4. Analisi settore
    const mappedSector = mapSector(sector || '');
    let sectorMatch = false;
    let sectorKeywordsFound = 0;
    
    if (mappedSector !== 'generic' && SECTOR_KEYWORDS[mappedSector]) {
      sectorKeywordsFound = countKeywords(html, SECTOR_KEYWORDS[mappedSector]);
      sectorMatch = sectorKeywordsFound >= 2; // Almeno 2 keywords del settore
    } else {
      // Se settore generico, consideriamo match se è un e-commerce
      sectorMatch = isEcommerce;
    }
    
    console.log(`Sector: ${mappedSector}, keywords found: ${sectorKeywordsFound}`);

    // 5. Calcola confidence
    let confidence = 0;
    if (isReachable) confidence += 30;
    if (isEcommerce) confidence += 40;
    if (sectorMatch) confidence += 30;
    
    // Bonus per molte keywords
    if (ecommerceKeywordsFound >= 10) confidence += 10;
    if (sectorKeywordsFound >= 5) confidence += 10;
    
    // Cap a 100
    confidence = Math.min(confidence, 100);

    // 6. Determina validità
    // Valido se: raggiungibile E (è e-commerce O ha keywords settore)
    const isValid = isReachable && (isEcommerce || sectorKeywordsFound >= 2);
    
    let error: string | null = null;
    if (!isEcommerce && sectorKeywordsFound < 2) {
      error = 'Non sembra essere un e-commerce attivo. Verifica che sia il tuo negozio online.';
    } else if (isEcommerce && !sectorMatch && mappedSector !== 'generic') {
      // Warning ma non blocchiamo
      error = null; // Permettiamo comunque
    }

    console.log(`Verification result: isValid=${isValid}, confidence=${confidence}`);

    return new Response(
      JSON.stringify({
        isValid,
        error,
        checks: {
          isReachable,
          isEcommerce,
          sectorMatch,
          isBlacklisted: false
        },
        confidence,
        details: {
          ecommerceKeywordsFound,
          sectorKeywordsFound,
          mappedSector,
          normalizedUrl
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-website:', error);
    
    return new Response(
      JSON.stringify({
        isValid: false,
        error: 'Errore durante la verifica. Riprova.',
        checks: { isReachable: false, isEcommerce: false, sectorMatch: false, isBlacklisted: false },
        confidence: 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
