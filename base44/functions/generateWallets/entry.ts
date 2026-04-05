import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { ethers } from 'npm:ethers@6.13.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const walletTypes = ['vault', 'guard', 'liquidity', 'recovery'];
    const created = [];

    for (const wallet_type of walletTypes) {
      const existing = await base44.asServiceRole.entities.WalletProfile.filter({ wallet_type });
      if (existing.length > 0 && existing[0].address) {
        created.push({ wallet_type, address: existing[0].address, status: 'already_exists' });
        continue;
      }

      const wallet = ethers.Wallet.createRandom();

      if (existing.length > 0) {
        await base44.asServiceRole.entities.WalletProfile.update(existing[0].id, {
          address: wallet.address,
          label: wallet_type.charAt(0).toUpperCase() + wallet_type.slice(1) + ' Wallet',
          network: 'Ethereum Sepolia',
          is_system_managed: true,
        });
      } else {
        await base44.asServiceRole.entities.WalletProfile.create({
          wallet_type,
          address: wallet.address,
          label: wallet_type.charAt(0).toUpperCase() + wallet_type.slice(1) + ' Wallet',
          network: 'Ethereum Sepolia',
          is_system_managed: true,
        });
      }

      created.push({ wallet_type, address: wallet.address, privateKey: wallet.privateKey, mnemonic: wallet.mnemonic?.phrase, status: 'created' });
    }

    return Response.json({ wallets: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});