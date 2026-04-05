import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { ethers } from 'npm:ethers@6.13.0';

/**
 * Scheduled function: runs every 5 minutes.
 * Finds all 'held' transactions whose release_at has passed and executes them on-chain,
 * then marks them as 'completed'.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduled invocation (no user auth) or admin manual trigger
  const isScheduled = req.headers.get('x-base44-scheduled') === 'true';
  if (!isScheduled) {
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const db = base44.asServiceRole;
  const now = new Date();

  // Fetch all held transactions
  const held = await db.entities.Transaction.filter({ status: 'held' });

  // Filter to those whose release_at has passed
  const due = held.filter(tx => tx.release_at && new Date(tx.release_at) <= now);

  if (!due.length) {
    return Response.json({ message: 'No transactions due for release', released: 0 });
  }

  const alchemyKey = Deno.env.get('ALCHEMY_API_KEY');
  const guardMnemonic = Deno.env.get('GUARD_MNEMONIC');
  const rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const guardWallet = ethers.Wallet.fromPhrase(guardMnemonic).connect(provider);

  const results = [];

  for (const tx of due) {
    try {
      let txHash = null;

      // Only send on-chain for ETH on Sepolia
      if (tx.asset === 'ETH' && tx.to_address) {
        const onChainTx = await guardWallet.sendTransaction({
          to: tx.to_address,
          value: ethers.parseEther(tx.amount.toString()),
        });
        txHash = onChainTx.hash;
        // Don't wait for full confirmation — just broadcast and mark complete
      }

      await db.entities.Transaction.update(tx.id, { status: 'completed' });

      results.push({ id: tx.id, asset: tx.asset, amount: tx.amount, txHash, status: 'released' });
    } catch (err) {
      console.error(`Failed to release tx ${tx.id}:`, err.message);
      results.push({ id: tx.id, status: 'error', error: err.message });
    }
  }

  return Response.json({ released: results.filter(r => r.status === 'released').length, results });
});