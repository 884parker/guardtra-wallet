import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.13.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

/**
 * Fetch on-chain ETH and USDC balance for a given address.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { address } = await req.json();
    if (!address) return new Response(JSON.stringify({ error: 'address required' }), { status: 400, headers: corsHeaders });

    // Get user's network setting
    const { data: netConfig } = await supabase
      .from('app_config')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'active_network')
      .single();

    const networkId = netConfig?.value || 'sepolia';
    const apiKey = networkId === 'mainnet'
      ? (Deno.env.get('ALCHEMY_MAINNET_KEY') || Deno.env.get('ALCHEMY_API_KEY'))
      : Deno.env.get('ALCHEMY_API_KEY');
    const rpcPrefix = networkId === 'mainnet' ? 'eth-mainnet' : 'eth-sepolia';

    // USDC contract addresses
    const usdcContracts: Record<string, string> = {
      sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      mainnet: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    };

    const rpcUrl = `https://${rpcPrefix}.g.alchemy.com/v2/${apiKey}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Fetch ETH balance
    const ethBalance = await provider.getBalance(address);
    const balanceEth = parseFloat(ethers.formatEther(ethBalance));

    // Fetch USDC balance
    let balanceUsdc = 0;
    const usdcAddr = usdcContracts[networkId];
    if (usdcAddr) {
      try {
        const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
        const usdcContract = new ethers.Contract(usdcAddr, erc20Abi, provider);
        const usdcRaw = await usdcContract.balanceOf(address);
        balanceUsdc = parseFloat(ethers.formatUnits(usdcRaw, 6));
      } catch {
        // USDC not available on this address
      }
    }

    return new Response(JSON.stringify({
      balance_eth: balanceEth,
      balance_usdc: balanceUsdc,
      network: networkId,
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
