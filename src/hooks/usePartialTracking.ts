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
  const lastStepRef = useRef(-1);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Update on step change (debounced)
  useEffect(() => {
    if (!enabled || !recordCreatedRef.current) return;
    if (currentStep === lastStepRef.current) return;
    lastStepRef.current = currentStep;

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

  // Mark abandoned on beforeunload
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      // Use fetch with keepalive for reliability on page unload
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
          form_data: formData,
        }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [enabled, formData]);

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
          form_data: formData,
        } as never)
        .eq('session_id' as never, sessionIdRef.current as never);
    },
    [formData]
  );

  return { markCompleted, sessionId: sessionIdRef.current };
}
