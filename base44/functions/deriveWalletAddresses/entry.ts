import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { ethers } from 'npm:ethers@6.13.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const mnemonics = {
      vault: Deno.env.get('VAULT_MNEMONIC'),
      guard: Deno.env.get('GUARD_MNEMONIC'),
      liquidity: Deno.env.get('LIQUIDITY_MNEMONIC'),
    };

    const results = {};
    for (const [type, mnemonic] of Object.entries(mnemonics)) {
      if (!mnemonic) {
        results[type] = { error: `No mnemonic set for ${type}` };
        continue;
      }

      const trimmed = mnemonic.trim().replace(/\s+/g, ' ');
      const wallet = ethers.Wallet.fromPhrase(trimmed);
      results[type] = { address: wallet.address };

      const profiles = await base44.asServiceRole.entities.WalletProfile.filter({ wallet_type: type });
      if (profiles.length > 0) {
        await base44.asServiceRole.entities.WalletProfile.update(profiles[0].id, {
          address: wallet.address,
          balance_eth: 0,
          balance_usdc: 0,
          balance_btc: 0,
        });
        results[type].status = 'updated';
      } else {
        await base44.asServiceRole.entities.WalletProfile.create({
          wallet_type: type,
          address: wallet.address,
          label: type.charAt(0).toUpperCase() + type.slice(1) + ' Wallet',
          is_system_managed: true,
          balance_eth: 0,
          balance_usdc: 0,
          balance_btc: 0,
        });
        results[type].status = 'created';
      }
    }

    return Response.json({ success: true, wallets: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});