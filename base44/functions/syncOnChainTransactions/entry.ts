import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all wallet addresses to monitor
    const wallets = await base44.entities.WalletProfile.list();
    if (!wallets || wallets.length === 0) {
      return Response.json({ synced: 0, message: 'No wallets found' });
    }

    const apiKey = Deno.env.get('ALCHEMY_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Alchemy API key not configured' }, { status: 500 });
    }

    const rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
    let totalSynced = 0;

    // Check each wallet for recent transfers
    for (const wallet of wallets) {
      if (!wallet.address) continue;

      try {
        // Get token transfers for this address
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'alchemy_getAssetTransfers',
            params: [
              {
                fromAddress: wallet.address,
                category: ['external', 'internal'],
                maxCount: 100,
              },
            ],
            id: 1,
          }),
        });

        const data = await response.json();
        if (!data.result || !data.result.transfers) continue;

        // Process each transfer
        for (const tx of data.result.transfers) {
          // Check if already recorded
          const existing = await base44.entities.Transaction.filter({
            from_wallet: wallet.wallet_type,
            to_address: tx.to,
          }).catch(() => []);

          // Only create if we don't have a record for this combo
          if (existing.length === 0) {
            const amount = parseFloat(tx.value || 0);
            const asset = tx.asset === 'ETH' ? 'ETH' : (tx.asset || 'ETH');

            await base44.entities.Transaction.create({
              amount,
              asset,
              from_wallet: wallet.wallet_type,
              to_address: tx.to,
              network: 'Ethereum (Sepolia)',
              status: 'completed',
              is_user_initiated: true,
              usd_value: asset === 'ETH' ? amount * 2450 : amount,
              timestamp: new Date().toISOString(),
            });

            totalSynced++;
          }
        }
      } catch (err) {
        console.error(`Error syncing wallet ${wallet.address}:`, err.message);
      }
    }

    return Response.json({ synced: totalSynced, message: `Synced ${totalSynced} on-chain transactions` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});