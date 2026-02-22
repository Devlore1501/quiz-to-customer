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
 * Helper: all partial_submissions requests pass x-session-id header
 * so the RLS policy can restrict access to the caller's own session.
 */
function partialFetch(
  sessionId: string,
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
      'x-session-id': sessionId,
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
  const recordCreatedRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const formDataRef = useRef(formData);

  // Always keep formDataRef fresh
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Create initial record
  useEffect(() => {
    if (!enabled || recordCreatedRef.current) return;
    recordCreatedRef.current = true;

    partialFetch(sessionIdRef.current, 'POST', {
      session_id: sessionIdRef.current,
      survey_type: surveyType,
      current_step: 0,
      current_step_name: stepName,
      total_steps: totalSteps,
      form_data: {},
    }).catch((err) => console.error('Partial tracking insert error:', err));
  }, [enabled, surveyType]);

  // Debounced update on step OR formData change
  useEffect(() => {
    if (!enabled || !recordCreatedRef.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      partialFetch(
        sessionIdRef.current,
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
        sessionIdRef.current,
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
      sessionIdRef.current,
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
