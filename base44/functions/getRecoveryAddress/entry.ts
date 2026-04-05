import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { ethers } from 'npm:ethers@6.13.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mnemonic = Deno.env.get('RECOVERY_MNEMONIC');
    if (!mnemonic) {
      return Response.json({ error: 'Recovery mnemonic not configured' }, { status: 500 });
    }

    // Derive the address from the recovery mnemonic (first account)
    const wallet = ethers.Wallet.fromPhrase(mnemonic);
    const address = wallet.address;

    return Response.json({ address });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});