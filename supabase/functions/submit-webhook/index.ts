import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting map (in-memory, resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5; // Max 5 calls per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Validate submission data structure
function validateSubmissionData(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid submission data structure' };
  }
  
  const submission = data as Record<string, unknown>;
  
  // Check for required fields
  const requiredFields = ['email', 'full_name', 'company_name'];
  for (const field of requiredFields) {
    if (!submission[field] || typeof submission[field] !== 'string') {
      return { valid: false, error: `Missing or invalid field: ${field}` };
    }
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(submission.email as string)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Check data size (prevent large payloads)
  const dataSize = JSON.stringify(data).length;
  if (dataSize > 100000) { // 100KB max
    return { valid: false, error: 'Payload too large' };
  }
  
  return { valid: true };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = Deno.env.get('MAKE_WEBHOOK_URL');
    
    if (!webhookUrl) {
      console.error('MAKE_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get client IP for rate limiting (fallback to a default if not available)
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';

    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      console.warn(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests. Please try again later.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let body: { submissionData?: unknown; submissionId?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { submissionData, submissionId } = body;

    if (!submissionData) {
      return new Response(
        JSON.stringify({ success: false, error: 'No submission data provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate submission data structure
    const validation = validateSubmissionData(submissionData);
    if (!validation.valid) {
      console.warn('Invalid submission data:', validation.error);
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If submissionId is provided, verify it exists in the database
    // This ensures the webhook is only called for legitimate submissions
    if (submissionId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(submissionId)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid submission ID format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existingSubmission, error: checkError } = await supabase
        .from('survey_submissions')
        .select('id, email')
        .eq('id', submissionId)
        .single();

      if (checkError || !existingSubmission) {
        console.warn('Submission not found:', submissionId);
        return new Response(
          JSON.stringify({ success: false, error: 'Submission not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the email matches (additional validation)
      const submissionEmail = (submissionData as Record<string, unknown>).email;
      if (existingSubmission.email !== submissionEmail) {
        console.warn('Email mismatch for submission:', submissionId);
        return new Response(
          JSON.stringify({ success: false, error: 'Data validation failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Send to Make.com webhook with proper error handling
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submissionData)
    });

    if (!webhookResponse.ok) {
      console.error('Webhook failed with status:', webhookResponse.status);
      // Still return success since we don't want to fail the user flow
      // The data is already saved in the database
      return new Response(
        JSON.stringify({ 
          success: true, 
          webhookSent: false,
          warning: 'Webhook delivery failed but data was saved'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook sent successfully');
    return new Response(
      JSON.stringify({ success: true, webhookSent: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-webhook function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        webhookSent: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
