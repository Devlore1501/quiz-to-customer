import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { submissionData } = await req.json();

    if (!submissionData) {
      return new Response(
        JSON.stringify({ success: false, error: 'No submission data provided' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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
