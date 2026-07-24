// Validazione URL del sito, lato client.
//
// Primo filtro (formato) qui, secondo filtro (raggiungibilità) nella edge function
// `verify-website`, che è anche l'unica a poter fare la fetch senza CORS e con
// protezione SSRF. Lì `isValid = isReachable`: i check ecommerce/settore alimentano
// solo la confidence e NON bloccano, quindi si può gate-are sull'esito senza il
// rischio di respingere store veri.

export interface EsitoFormato {
  isValid: boolean;
  normalized: string;
  error?: string;
}

const TLD_NOTI = [
  'com', 'it', 'eu', 'net', 'org', 'io', 'co', 'shop', 'store',
  'online', 'info', 'biz', 'me', 'app', 'dev', 'tech',
];

export function isValidUrlFormat(url: string): EsitoFormato {
  let normalized = (url || '').trim().toLowerCase();

  if (!normalized) {
    return { isValid: false, normalized, error: 'Inserisci l\'URL del tuo store' };
  }

  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized.replace(/^www\./, '');
  }

  const pattern = /^https?:\/\/([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
  if (!pattern.test(normalized)) {
    return { isValid: false, normalized, error: 'Formato non valido — es. tuostore.com' };
  }

  const dominio = normalized.replace(/^https?:\/\//, '').split('/')[0];
  const tld = dominio.split('.').pop();
  if (!tld || (!TLD_NOTI.includes(tld) && tld.length < 2)) {
    return { isValid: false, normalized, error: 'Dominio non riconosciuto' };
  }

  return { isValid: true, normalized };
}

export function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  attesaMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), attesaMs);
  };
}
