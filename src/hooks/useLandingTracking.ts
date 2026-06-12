import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackFacebookEvent } from '@/lib/facebookPixel';

const STORAGE_KEY = 'mailift_landing_session_v1';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

type StoredSession = {
  key: string;
  createdAt: number;
  viewLogged?: boolean;
  ctaLogged?: boolean;
};

const safeStorage = {
  get(): StoredSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredSession;
      if (!parsed?.key || Date.now() - parsed.createdAt > TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  },
  set(s: StoredSession) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* ignore (private mode, iframe restrictions) */
    }
  },
};

const genKey = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
};

const readUtm = () => {
  if (typeof window === 'undefined') return {};
  try {
    const p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get('utm_source') || null,
      utm_medium: p.get('utm_medium') || null,
      utm_campaign: p.get('utm_campaign') || null,
    };
  } catch {
    return {};
  }
};

const getOrCreateSession = (): StoredSession => {
  const existing = safeStorage.get();
  if (existing) return existing;
  const fresh: StoredSession = { key: genKey(), createdAt: Date.now() };
  safeStorage.set(fresh);
  return fresh;
};

async function insertEvent(
  session: StoredSession,
  event_type: 'view' | 'cta_click',
  surveyType: string,
) {
  try {
    const utm = readUtm();
    await supabase.from('landing_events').insert({
      session_key: session.key,
      event_type,
      survey_type: surveyType,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      ...utm,
    });
  } catch (err) {
    // silent — never break UX for tracking
    console.warn('[landing-tracking] insert failed', err);
  }
}

export function useLandingTracking(surveyType: string = 'email_marketing') {
  const sessionRef = useRef<StoredSession | null>(null);

  useEffect(() => {
    const session = getOrCreateSession();
    sessionRef.current = session;

    if (!session.viewLogged) {
      session.viewLogged = true;
      safeStorage.set(session);
      void insertEvent(session, 'view', surveyType);
      trackFacebookEvent('LandingView', { content_name: 'Mailift Landing' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackCtaClick = useCallback(() => {
    const session = sessionRef.current ?? getOrCreateSession();
    sessionRef.current = session;
    if (session.ctaLogged) return;
    session.ctaLogged = true;
    safeStorage.set(session);
    void insertEvent(session, 'cta_click', surveyType);
    trackFacebookEvent('QuizCTAClick', { content_name: 'Mailift Landing CTA' });
  }, [surveyType]);

  return { trackCtaClick };
}
