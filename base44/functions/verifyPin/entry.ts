import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const pin = body?.pin;
    
    if (!pin) {
      return Response.json({ error: 'PIN required' }, { status: 400 });
    }

    const storedPin = Deno.env.get('SEED_ACCESS_PIN');
    
    if (!storedPin) {
      return Response.json({ error: 'PIN not configured' }, { status: 500 });
    }

    console.log('Submitted PIN:', String(pin), 'Stored PIN:', String(storedPin), 'Length:', String(storedPin).length);
    
    const valid = String(pin).trim() === String(storedPin).trim();

    return Response.json({ valid });
  } catch (error) {
    console.error('PIN verification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});