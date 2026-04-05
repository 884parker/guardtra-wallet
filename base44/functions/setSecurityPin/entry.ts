import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPin, newPin } = await req.json();

    if (!newPin || newPin.length < 4) {
      return Response.json({ error: 'PIN must be at least 4 characters' }, { status: 400 });
    }

    // Check if a PIN already exists in DB
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: 'security_pin' });
    const existing = configs[0];

    if (existing) {
      // PIN exists — verify current PIN before allowing change
      if (!currentPin || currentPin !== existing.value) {
        return Response.json({ error: 'Current PIN is incorrect' }, { status: 401 });
      }
      await base44.asServiceRole.entities.AppConfig.update(existing.id, { value: newPin });
    } else {
      // First time setup — create without verification (ignore currentPin)
      await base44.asServiceRole.entities.AppConfig.create({ key: 'security_pin', value: newPin });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});