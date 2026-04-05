import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { addresses } = await req.json();
    if (!addresses || !addresses.length) return Response.json({ transfers: [] });

    const apiKey = Deno.env.get('ALCHEMY_API_KEY');
    const url = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;

    // Fetch sent + received transfers for all addresses in parallel
    const requests = addresses.flatMap(address => [
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0', toBlock: 'latest',
            fromAddress: address,
            category: ['external', 'erc20'],
            maxCount: '0x14', // 20 per address
            withMetadata: true,
            order: 'desc',
          }]
        })
      }).then(r => r.json()).catch(() => null),
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 2, method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0', toBlock: 'latest',
            toAddress: address,
            category: ['external', 'erc20'],
            maxCount: '0x14',
            withMetadata: true,
            order: 'desc',
          }]
        })
      }).then(r => r.json()).catch(() => null),
    ]);

    const results = await Promise.all(requests);

    // Flatten and deduplicate by hash
    const seen = new Set();
    const transfers = [];
    for (const res of results) {
      const txs = res?.result?.transfers || [];
      for (const tx of txs) {
        if (!seen.has(tx.hash)) {
          seen.add(tx.hash);
          transfers.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            asset: tx.asset,
            category: tx.category,
            timestamp: tx.metadata?.blockTimestamp,
            blockNum: tx.blockNum,
          });
        }
      }
    }

    // Sort by timestamp desc
    transfers.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return Response.json({ transfers: transfers.slice(0, 30) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});