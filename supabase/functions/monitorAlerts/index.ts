import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

/**
 * Monitor Alerts — checks for suspicious activity.
 * Currently a stub that returns empty alerts.
 * TODO: implement real alert logic (unauthorized txns, high-value transfers, etc.)
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Stub: return empty alerts array
    // Future: query transactions table for suspicious patterns,
    // check for unauthorized sends, high-value transfers, etc.
    return new Response(JSON.stringify({
      alerts: [],
      checked_at: new Date().toISOString(),
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
