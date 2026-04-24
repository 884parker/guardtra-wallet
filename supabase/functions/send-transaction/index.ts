import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.13.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

/**
 * Decrypt a mnemonic that was encrypted by generate-wallets.
 */
async function decryptMnemonic(encryptedBase64: string, secret: string): Promise<string> {
  const raw = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const ciphertext = raw.slice(12);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(secret.padEnd(32, '0').slice(0, 32)), 'AES-GCM', false, ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyMaterial, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/**
 * Send ETH from a managed wallet (vault, hold/guard, liquidity).
 * Resolves mnemonic from the database (encrypted by generate-wallets),
 * falls back to environment secrets for backward compatibility.
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

    const { walletType, toAddress, amountEth } = await req.json();

    if (!walletType || !toAddress || !amountEth) {
      return new Response(JSON.stringify({ error: 'walletType, toAddress, and amountEth are required' }), { status: 400, headers: corsHeaders });
    }

    // Step 1: Try to get mnemonic from database (per-user, encrypted)
    let mnemonic: string | null = null;

    const configKey = `${walletType}_mnemonic_encrypted`;
    const { data: configRow } = await supabase
      .from('app_config')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', configKey)
      .single();

    if (configRow?.value) {
      const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      try {
        mnemonic = await decryptMnemonic(configRow.value, encryptionKey);
      } catch (e) {
        console.error(`Failed to decrypt ${walletType} mnemonic:`, e.message);
      }
    }

    // Step 2: Fall back to environment variable (legacy single-user mode)
    if (!mnemonic) {
      const envMap: Record<string, string> = {
        vault: 'VAULT_MNEMONIC',
        guard: 'GUARD_MNEMONIC',
        liquidity: 'LIQUIDITY_MNEMONIC',
      };
      const envKey = envMap[walletType];
      if (envKey) mnemonic = Deno.env.get(envKey) || null;
    }

    if (!mnemonic) {
      return new Response(JSON.stringify({ error: `No mnemonic found for ${walletType}. Have you run wallet setup?` }), { status: 400, headers: corsHeaders });
    }

    // Determine network from user's app_config
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
    const explorerBase = networkId === 'mainnet' ? 'https://etherscan.io' : 'https://sepolia.etherscan.io';

    const rpcUrl = `https://${rpcPrefix}.g.alchemy.com/v2/${apiKey}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider);

    // Calculate send value, adjusting for gas if sending full balance
    const sendValue = ethers.parseEther(amountEth.toString());
    const balance = await provider.getBalance(wallet.address);

    let finalValue = sendValue;

    // If user is trying to send their full balance (or more than balance minus buffer),
    // estimate gas and deduct it so the transaction doesn't fail
    if (sendValue >= balance) {
      // Estimate gas for a simple ETH transfer
      const feeData = await provider.getFeeData();
      const gasLimit = BigInt(21000); // standard ETH transfer
      const maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('50', 'gwei');
      const estimatedGasCost = gasLimit * maxFeePerGas;
      // Add 20% buffer for gas price fluctuation
      const gasCostWithBuffer = estimatedGasCost + (estimatedGasCost * BigInt(20)) / BigInt(100);

      if (balance <= gasCostWithBuffer) {
        return new Response(JSON.stringify({ 
          error: `Insufficient balance for gas. Balance: ${ethers.formatEther(balance)} ETH, estimated gas: ${ethers.formatEther(gasCostWithBuffer)} ETH` 
        }), { status: 400, headers: corsHeaders });
      }

      finalValue = balance - gasCostWithBuffer;
    }

    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: finalValue,
    });

    const receipt = await tx.wait(1);

    return new Response(JSON.stringify({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString(),
      explorerUrl: `${explorerBase}/tx/${tx.hash}`,
      network: networkId,
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
