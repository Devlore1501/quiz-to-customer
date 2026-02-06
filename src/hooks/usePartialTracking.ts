import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsePartialTrackingOptions {
  surveyType: 'email_marketing' | 'conversational';
  formData: Record<string, unknown>;
  currentStep: number;
  stepName: string;
  totalSteps: number;
  enabled?: boolean;
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

    supabase
      .from('partial_submissions' as never)
      .insert({
        session_id: sessionIdRef.current,
        survey_type: surveyType,
        current_step: 0,
        current_step_name: stepName,
        total_steps: totalSteps,
        form_data: {},
      } as never)
      .then(({ error }) => {
        if (error) console.error('Partial tracking insert error:', error);
      });
  }, [enabled, surveyType]);

  // Debounced update on step OR formData change
  useEffect(() => {
    if (!enabled || !recordCreatedRef.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      supabase
        .from('partial_submissions' as never)
        .update({
          current_step: currentStep,
          current_step_name: stepName,
          total_steps: totalSteps,
          form_data: formData,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('session_id' as never, sessionIdRef.current as never)
        .then(({ error }) => {
          if (error) console.error('Partial tracking update error:', error);
        });
    }, 500);
  }, [currentStep, stepName, formData, enabled, totalSteps]);

  // Mark abandoned on beforeunload - use ref for fresh data
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/partial_submissions?session_id=eq.${sessionIdRef.current}`;
      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          abandoned: true,
          updated_at: new Date().toISOString(),
          form_data: formDataRef.current,
        }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled]);

  // Mark completed
  const markCompleted = useCallback(
    async (submissionId?: string) => {
      await supabase
        .from('partial_submissions' as never)
        .update({
          completed: true,
          abandoned: false,
          submission_id: submissionId || null,
          updated_at: new Date().toISOString(),
          form_data: formDataRef.current,
        } as never)
        .eq('session_id' as never, sessionIdRef.current as never);
    },
    []
  );

  return { markCompleted, sessionId: sessionIdRef.current };
}
