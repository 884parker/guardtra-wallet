import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { ethers } from 'npm:ethers@6.13.0';

/**
 * Vault Recovery Function
 * Steps:
 *  1. freeze   — return list of held txs to confirm scope (no writes yet)
 *  2. revoke   — mark all held/pending transactions as revoked
 *  3. generate — create a brand-new Vault wallet (new address only returned, mnemonic shown once in UI)
 *  4. migrate  — create migration Transaction records
 *  5. flag     — mark old Vault WalletProfile as compromised
 *
 * SECURITY: New mnemonic/privateKey are returned ONCE during 'generate' step and never stored in DB.
 * The UI is responsible for showing it to the user once and discarding it.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { step, newVaultAddress } = await req.json().catch(() => ({}));

  if (step === 'freeze') {
    const held = await base44.entities.Transaction.filter({ status: 'held' });
    const pending = await base44.entities.Transaction.filter({ status: 'pending' });
    const txs = [...held, ...pending];
    return Response.json({ ok: true, count: txs.length, transactions: txs });
  }

  if (step === 'revoke') {
    const held = await base44.entities.Transaction.filter({ status: 'held' });
    const pending = await base44.entities.Transaction.filter({ status: 'pending' });
    const all = [...held, ...pending];
    await Promise.all(all.map(tx =>
      base44.entities.Transaction.update(tx.id, { status: 'revoked' })
    ));
    return Response.json({ ok: true, revoked: all.length });
  }

  if (step === 'generate') {
    const newWallet = ethers.Wallet.createRandom();

    const existing = await base44.entities.WalletProfile.filter({ wallet_type: 'vault' });
    const oldAddress = existing[0]?.address || null;
    const oldId = existing[0]?.id || null;

    // Only store the address — never store mnemonic/privateKey in DB
    const newProfile = await base44.entities.WalletProfile.create({
      wallet_type: 'vault',
      address: newWallet.address,
      label: 'Vault Wallet (Recovered)',
      network: existing[0]?.network || 'Ethereum',
      is_compromised: false,
    });

    // Return sensitive data ONCE — UI must show it to user immediately
    return Response.json({
      ok: true,
      newVaultAddress: newWallet.address,
      newMnemonic: newWallet.mnemonic?.phrase,   // shown once, never stored
      newPrivateKey: newWallet.privateKey,         // shown once, never stored
      newProfileId: newProfile.id,
      oldAddress,
      oldProfileId: oldId,
      warning: 'Store your mnemonic securely. It will not be shown again.',
    });
  }

  if (step === 'migrate') {
    if (!newVaultAddress) return Response.json({ error: 'newVaultAddress required' }, { status: 400 });

    const vaultProfiles = await base44.entities.WalletProfile.filter({ wallet_type: 'vault' });
    const oldVault = vaultProfiles.find(p => !p.is_compromised && p.address !== newVaultAddress);

    const migrations = [];
    if (oldVault) {
      const assets = [
        { asset: 'ETH',  balance: oldVault.balance_eth  || 0 },
        { asset: 'BTC',  balance: oldVault.balance_btc  || 0 },
        { asset: 'USDC', balance: oldVault.balance_usdc || 0 },
      ].filter(a => a.balance > 0);

      for (const { asset, balance } of assets) {
        const tx = await base44.entities.Transaction.create({
          amount: balance,
          asset,
          from_wallet: 'vault',
          to_address: newVaultAddress,
          network: oldVault.network || 'Ethereum',
          status: 'pending',
          destination_label: 'Recovery — New Vault',
          is_user_initiated: true,
          release_at: new Date().toISOString(),
          usd_value: 0,
        });
        migrations.push(tx);
      }
    }

    return Response.json({ ok: true, migrated: migrations.length, migrations });
  }

  if (step === 'flag') {
    const vaultProfiles = await base44.entities.WalletProfile.filter({ wallet_type: 'vault' });
    const oldVault = vaultProfiles.find(p => !p.is_compromised && p.address !== newVaultAddress);
    if (oldVault) {
      await base44.entities.WalletProfile.update(oldVault.id, {
        is_compromised: true,
        label: 'Vault Wallet (COMPROMISED)',
      });
    }
    return Response.json({ ok: true, flagged: oldVault?.address || null });
  }

  return Response.json({ error: 'Unknown step' }, { status: 400 });
});