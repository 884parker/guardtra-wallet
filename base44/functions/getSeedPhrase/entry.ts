import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { walletType, pin } = await req.json();

    // Verify PIN from database (AppConfig)
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: 'security_pin' });
    const storedPin = configs[0]?.value;
    if (!storedPin || pin !== storedPin) {
      return Response.json({ error: 'Invalid PIN' }, { status: 403 });
    }

    // Return the mnemonic for the requested wallet type
    let mnemonic;
    if (walletType === 'vault') {
      mnemonic = Deno.env.get('VAULT_MNEMONIC');
    } else if (walletType === 'guard') {
      mnemonic = Deno.env.get('GUARD_MNEMONIC');
    } else if (walletType === 'liquidity') {
      mnemonic = Deno.env.get('LIQUIDITY_MNEMONIC');
    } else {
      return Response.json({ error: 'Invalid walletType' }, { status: 400 });
    }

    if (!mnemonic) {
      return Response.json({ error: `No mnemonic configured for ${walletType}` }, { status: 500 });
    }

    return Response.json({ mnemonic });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});