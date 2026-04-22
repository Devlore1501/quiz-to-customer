import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Allowed origins for CORS - prevents phishing/unauthorized embedding
const ALLOWED_ORIGINS = [
  'https://quiz-to-customer.lovable.app',
  'https://id-preview--f5d761d0-cabe-4d00-a441-f6abbada657c.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Check if origin matches allowed list or Lovable domains
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
function validateSubmissionData(data: unknown): { valid: boolean; error?: string; email?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid submission data structure' };
  }
  
  const submission = data as Record<string, unknown>;
  let email: string | undefined;
  
  // Check if this is an admin_report structure
  if (submission.type === 'admin_report') {
    const quickSummary = submission.quickSummary as Record<string, unknown> | undefined;
    if (!quickSummary) {
      return { valid: false, error: 'Missing quickSummary in admin report' };
    }
    
    if (!quickSummary.leadEmail || typeof quickSummary.leadEmail !== 'string') {
      return { valid: false, error: 'Missing or invalid leadEmail in admin report' };
    }
    
    if (!quickSummary.leadName || typeof quickSummary.leadName !== 'string') {
      return { valid: false, error: 'Missing or invalid leadName in admin report' };
    }
    
    email = quickSummary.leadEmail as string;
  } else {
    // Legacy flat structure
    const requiredFields = ['email', 'full_name'];
    for (const field of requiredFields) {
      if (!submission[field] || typeof submission[field] !== 'string') {
        return { valid: false, error: `Missing or invalid field: ${field}` };
      }
    }
    email = submission.email as string;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Check data size (prevent large payloads)
  const dataSize = JSON.stringify(data).length;
  if (dataSize > 100000) { // 100KB max
    return { valid: false, error: 'Payload too large' };
  }
  
  return { valid: true, email };
}

interface WebhookResult {
  name: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  // Get origin for CORS
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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

    const makeWebhookUrl = Deno.env.get('MAKE_WEBHOOK_URL');
    const ghlWebhookUrl = Deno.env.get('GHL_WEBHOOK_URL');
    
    if (!makeWebhookUrl && !ghlWebhookUrl) {
      console.error('No webhook URLs configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Webhooks not configured' }),
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

    // Extract email from validation result
    const submissionEmail = validation.email;
    console.log('Validated submission email:', submissionEmail);

    // If submissionId is provided, verify it exists in the database
    // This ensures the webhook is only called for legitimate submissions
    if (submissionId && submissionEmail) {
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

      // Verify the email matches (using extracted email from validation)
      if (existingSubmission.email !== submissionEmail) {
        console.warn('Email mismatch for submission:', submissionId, 'expected:', existingSubmission.email, 'got:', submissionEmail);
        return new Response(
          JSON.stringify({ success: false, error: 'Data validation failed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Submission verified successfully:', submissionId);
    }

    // Ensure reportUrl is always present in the payload (double safety)
    const PRODUCTION_DOMAIN = 'https://quiz-to-customer.lovable.app';
    const submissionDataObj = submissionData as Record<string, unknown>;
    
    if (!submissionDataObj.reportUrl && submissionId) {
      submissionDataObj.reportUrl = `${PRODUCTION_DOMAIN}/report/${submissionId}`;
      console.log('reportUrl was missing, generated from submissionId:', submissionDataObj.reportUrl);
    } else if (submissionDataObj.reportUrl) {
      console.log('reportUrl already present in payload:', submissionDataObj.reportUrl);
    } else {
      console.warn('reportUrl missing and no submissionId available to generate it');
    }

    // Also inject into quickSummary if it's an admin_report
    if (submissionDataObj.type === 'admin_report') {
      const qs = submissionDataObj.quickSummary as Record<string, unknown> | undefined;
      if (qs && !qs.reportUrl && submissionDataObj.reportUrl) {
        qs.reportUrl = submissionDataObj.reportUrl;
      }
    }

    // Send to both webhooks in parallel
    const webhookPromises: Promise<WebhookResult>[] = [];

    if (makeWebhookUrl) {
      console.log('Sending to Make.com webhook...');
      webhookPromises.push(
        fetch(makeWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData)
        })
          .then(async (response) => {
            if (!response.ok) {
              console.error('Make webhook failed with status:', response.status);
              return { name: 'make', success: false, error: `HTTP ${response.status}` };
            }
            console.log('Make webhook sent successfully');
            return { name: 'make', success: true };
          })
          .catch((error) => {
            console.error('Make webhook error:', error);
            return { name: 'make', success: false, error: error.message };
          })
      );
    }

    if (ghlWebhookUrl) {
      console.log('Sending to GHL webhook...');
      webhookPromises.push(
        fetch(ghlWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData)
        })
          .then(async (response) => {
            if (!response.ok) {
              console.error('GHL webhook failed with status:', response.status);
              return { name: 'ghl', success: false, error: `HTTP ${response.status}` };
            }
            console.log('GHL webhook sent successfully');
            return { name: 'ghl', success: true };
          })
          .catch((error) => {
            console.error('GHL webhook error:', error);
            return { name: 'ghl', success: false, error: error.message };
          })
      );
    }

    // Wait for all webhooks to complete
    const results = await Promise.all(webhookPromises);
    
    const makeResult = results.find(r => r.name === 'make');
    const ghlResult = results.find(r => r.name === 'ghl');
    
    const anySuccess = results.some(r => r.success);
    const allSuccess = results.every(r => r.success);

    console.log('Webhook results:', { makeResult, ghlResult });

    // Persist sync flags so the Postgres trigger doesn't re-fire and admins can see status
    if (submissionId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const updates: Record<string, boolean> = {};
        if (makeResult?.success) updates.make_synced = true;
        if (ghlResult?.success) updates.ghl_synced = true;
        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('survey_submissions')
            .update(updates)
            .eq('id', submissionId);
          if (updateError) {
            console.error('Failed to update sync flags:', updateError);
          } else {
            console.log('Sync flags updated:', updates);
          }
        }
      } catch (e) {
        console.error('Error updating sync flags:', e);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        webhookSent: anySuccess,
        webhooks: {
          make: makeResult || { success: false, error: 'Not configured' },
          ghl: ghlResult || { success: false, error: 'Not configured' }
        },
        allWebhooksSucceeded: allSuccess
      }),
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
