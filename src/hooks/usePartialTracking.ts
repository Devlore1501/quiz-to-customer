import { useEffect, useRef, useCallback } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface UsePartialTrackingOptions {
  surveyType: 'email_marketing' | 'conversational';
  formData: Record<string, unknown>;
  currentStep: number;
  stepName: string;
  totalSteps: number;
  enabled?: boolean;
}

/**
 * Generate a high-entropy random secret (32 bytes, hex-encoded) used to prove
 * ownership of a partial_submissions row. Only its SHA-256 hash is stored in DB.
 */
function generateSessionSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}

/**
 * Helper: all partial_submissions requests pass `x-session-secret` so the RLS
 * policy can hash it and compare against the stored `session_secret_hash`.
 */
function partialFetch(
  sessionSecret: string,
  method: 'POST' | 'PATCH',
  body: Record<string, unknown>,
  filter?: string,
  keepalive = false,
) {
  const url = `${SUPABASE_URL}/rest/v1/partial_submissions${filter || ''}`;
  return fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=minimal',
      'x-session-secret': sessionSecret,
    },
    body: JSON.stringify(body),
    keepalive,
  });
}

export function usePartialTracking({
  surveyType,
  formData,
  currentStep,
  stepName,
  totalSteps,
  enabled = true,
}: UsePartialTrackingOptions) {
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const sessionSecretRef = useRef<string>(generateSessionSecret());
  const recordCreatedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formDataRef = useRef(formData);

  // Always keep formDataRef fresh
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Create initial record (with hashed secret)
  useEffect(() => {
    if (!enabled || recordCreatedRef.current) return;
    recordCreatedRef.current = true;

    (async () => {
      const secretHash = await sha256Hex(sessionSecretRef.current);
      partialFetch(sessionSecretRef.current, 'POST', {
        session_id: sessionIdRef.current,
        session_secret_hash: secretHash,
        survey_type: surveyType,
        current_step: 0,
        current_step_name: stepName,
        total_steps: totalSteps,
        form_data: {},
      }).catch((err) => console.error('Partial tracking insert error:', err));
    })();
  }, [enabled, surveyType]);

  // Debounced update on step OR formData change
  useEffect(() => {
    if (!enabled || !recordCreatedRef.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      partialFetch(
        sessionSecretRef.current,
        'PATCH',
        {
          current_step: currentStep,
          current_step_name: stepName,
          total_steps: totalSteps,
          form_data: formData,
          updated_at: new Date().toISOString(),
        },
        `?session_id=eq.${sessionIdRef.current}`,
      ).catch((err) => console.error('Partial tracking update error:', err));
    }, 500);
  }, [currentStep, stepName, formData, enabled, totalSteps]);

  // Mark abandoned on beforeunload
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      partialFetch(
        sessionSecretRef.current,
        'PATCH',
        {
          abandoned: true,
          updated_at: new Date().toISOString(),
          form_data: formDataRef.current,
        },
        `?session_id=eq.${sessionIdRef.current}`,
        true, // keepalive
      ).catch(() => {});
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);

  // Mark completed
  const markCompleted = useCallback(async (submissionId?: string) => {
    await partialFetch(
      sessionSecretRef.current,
      'PATCH',
      {
        completed: true,
        abandoned: false,
        submission_id: submissionId || null,
        updated_at: new Date().toISOString(),
        form_data: formDataRef.current,
      },
      `?session_id=eq.${sessionIdRef.current}`,
    );
  }, []);

  return { markCompleted, sessionId: sessionIdRef.current };
}
