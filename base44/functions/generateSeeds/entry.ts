import { generateMnemonic } from 'npm:bip39@3.1.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const vaultSeed = generateMnemonic(128); // 12 words
    const guardSeed = generateMnemonic(128); // 12 words
    const liquiditySeed = generateMnemonic(128); // 12 words

    return Response.json({
      vault: vaultSeed,
      guard: guardSeed,
      liquidity: liquiditySeed
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});