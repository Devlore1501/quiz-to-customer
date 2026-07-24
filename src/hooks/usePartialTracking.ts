import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface UsePartialTrackingOptions {
  surveyType: 'email_marketing' | 'conversational';
  formData: Record<string, unknown>;
  currentStep: number;
  stepName: string;
  totalSteps: number;
  enabled?: boolean;
  initialFormData?: Record<string, unknown>;
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
 * Insert uses the REST endpoint (RLS INSERT policy checks the with_check clause
 * only, no secret needed). Updates go through the `update_partial_submission`
 * RPC which validates the secret server-side — this bypasses the fact that the
 * Supabase gateway does not reliably forward custom request headers to
 * PostgREST, which used to make every UPDATE silently affect 0 rows.
 */
function insertPartial(body: Record<string, unknown>) {
  return fetch(`${SUPABASE_URL}/rest/v1/partial_submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

async function rpcUpdate(
  sessionId: string,
  sessionSecret: string,
  patch: {
    currentStep?: number;
    stepName?: string;
    totalSteps?: number;
    formData?: Record<string, unknown>;
    abandoned?: boolean;
    completed?: boolean;
    submissionId?: string | null;
  },
  keepalive = false,
) {
  const payload = {
    p_session_id: sessionId,
    p_session_secret: sessionSecret,
    p_current_step: patch.currentStep ?? null,
    p_current_step_name: patch.stepName ?? null,
    p_total_steps: patch.totalSteps ?? null,
    p_form_data: patch.formData ?? null,
    p_abandoned: patch.abandoned ?? null,
    p_completed: patch.completed ?? null,
    p_submission_id: patch.submissionId ?? null,
  };

  // Use raw fetch so we can pass `keepalive` on beforeunload.
  return fetch(`${SUPABASE_URL}/rest/v1/rpc/update_partial_submission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(payload),
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
  initialFormData,
}: UsePartialTrackingOptions) {
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  const sessionSecretRef = useRef<string>(generateSessionSecret());
  const recordCreatedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formDataRef = useRef(formData);
  const initialFormDataRef = useRef(initialFormData);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    initialFormDataRef.current = initialFormData;
  }, [initialFormData]);

  // Create initial record
  useEffect(() => {
    if (!enabled || recordCreatedRef.current) return;
    recordCreatedRef.current = true;

    (async () => {
      const secretHash = await sha256Hex(sessionSecretRef.current);
      insertPartial({
        session_id: sessionIdRef.current,
        session_secret_hash: secretHash,
        survey_type: surveyType,
        current_step: 0,
        current_step_name: stepName,
        total_steps: totalSteps,
        form_data: initialFormDataRef.current ?? {},
      }).catch((err) => console.error('Partial tracking insert error:', err));
    })();
  }, [enabled, surveyType]);

  // Debounced update on step or formData change
  useEffect(() => {
    if (!enabled || !recordCreatedRef.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      rpcUpdate(sessionIdRef.current, sessionSecretRef.current, {
        currentStep,
        stepName,
        totalSteps,
        formData,
      }).catch((err) => console.error('Partial tracking update error:', err));
    }, 500);
  }, [currentStep, stepName, formData, enabled, totalSteps]);

  // Mark abandoned on beforeunload
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      rpcUpdate(
        sessionIdRef.current,
        sessionSecretRef.current,
        { abandoned: true, formData: formDataRef.current },
        true,
      ).catch(() => {});
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);

  const markCompleted = useCallback(async (submissionId?: string) => {
    await rpcUpdate(sessionIdRef.current, sessionSecretRef.current, {
      completed: true,
      abandoned: false,
      submissionId: submissionId || null,
      formData: formDataRef.current,
    });
  }, []);

  // Flush immediato (senza debounce, indipendente da `enabled`) del form_data
  // corrente sul record partial. Serve al gate finale: l'email si inserisce lì,
  // ma il tracking è attivo solo in fase 'quiz', quindi senza questo flush il
  // partial resta senza email e `finalize_submission` fallisce il match email.
  const syncNow = useCallback(async (extra?: Record<string, unknown>) => {
    if (!recordCreatedRef.current) return;
    await rpcUpdate(sessionIdRef.current, sessionSecretRef.current, {
      formData: { ...formDataRef.current, ...(extra || {}) },
    });
  }, []);

  return {
    markCompleted,
    syncNow,
    sessionId: sessionIdRef.current,
    sessionSecret: sessionSecretRef.current,
  };
}
