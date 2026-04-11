import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

/**
 * Fetch on-chain transfer history for one or more wallet addresses using Alchemy.
 * Accepts { addresses: string[] } or { address: string }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const addresses: string[] = body.addresses || (body.address ? [body.address] : []);
    if (addresses.length === 0) {
      return new Response(JSON.stringify({ error: 'addresses required' }), { status: 400, headers: corsHeaders });
    }

    // Get user's network setting
    const { data: netConfig } = await supabase
      .from('app_config')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'active_network')
      .single();

    const networkId = netConfig?.value || 'sepolia';
    const apiKey = Deno.env.get('ALCHEMY_API_KEY');
    const rpcPrefix = networkId === 'mainnet' ? 'eth-mainnet' : 'eth-sepolia';
    const rpcUrl = `https://${rpcPrefix}.g.alchemy.com/v2/${apiKey}`;

    // Fetch transfers for all addresses using Alchemy's alchemy_getAssetTransfers
    const allTransfers: any[] = [];

    for (const addr of addresses) {
      // Incoming transfers
      const inRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            toAddress: addr,
            category: ['external'],
            order: 'desc',
            maxCount: '0x14', // 20
          }],
        }),
      });
      const inData = await inRes.json();

      // Outgoing transfers
      const outRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            fromAddress: addr,
            category: ['external'],
            order: 'desc',
            maxCount: '0x14', // 20
          }],
        }),
      });
      const outData = await outRes.json();

      const mapTx = (t: any) => ({
        hash: t.hash,
        from: t.from,
        to: t.to,
        value: t.value?.toString() || '0',
        asset: t.asset || 'ETH',
        timestamp: t.metadata?.blockTimestamp || null,
        blockNum: t.blockNum,
      });

      if (inData.result?.transfers) {
        allTransfers.push(...inData.result.transfers.map(mapTx));
      }
      if (outData.result?.transfers) {
        allTransfers.push(...outData.result.transfers.map(mapTx));
      }
    }

    // Deduplicate by hash and sort by timestamp desc
    const seen = new Set();
    const unique = allTransfers.filter(t => {
      const key = `${t.hash}-${t.from}-${t.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    unique.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    return new Response(JSON.stringify({
      transfers: unique.slice(0, 50),
      network: networkId,
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
