import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'https://esm.sh/ethers@6.13.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

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
 * Auto-release held transactions whose lock time has expired.
 * Reads Hold wallet mnemonic from the database (per-user) to send on-chain.
 * Should be called on a schedule (e.g., every 5 minutes via cron).
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const now = new Date().toISOString();

    // Find all held transactions past their release time
    const { data: due, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'held')
      .lte('release_at', now);

    if (fetchError) throw fetchError;
    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ message: 'No transactions due', released: 0 }), { headers: corsHeaders });
    }

    const results = [];

    for (const tx of due) {
      try {
        // Get user's network setting
        const { data: netConfig } = await supabase
          .from('app_config')
          .select('value')
          .eq('user_id', tx.user_id)
          .eq('key', 'active_network')
          .single();

        const networkId = netConfig?.value || 'sepolia';
        const apiKey = networkId === 'mainnet'
          ? (Deno.env.get('ALCHEMY_MAINNET_KEY') || Deno.env.get('ALCHEMY_API_KEY'))
          : Deno.env.get('ALCHEMY_API_KEY');
        const rpcPrefix = networkId === 'mainnet' ? 'eth-mainnet' : 'eth-sepolia';
        const rpcUrl = `https://${rpcPrefix}.g.alchemy.com/v2/${apiKey}`;

        let txHash = null;

        if (tx.asset === 'ETH' && tx.to_address) {
          // Get guard mnemonic from database for this user
          let mnemonic: string | null = null;

          const { data: configRow } = await supabase
            .from('app_config')
            .select('value')
            .eq('user_id', tx.user_id)
            .eq('key', 'guard_mnemonic_encrypted')
            .single();

          if (configRow?.value) {
            try {
              mnemonic = await decryptMnemonic(configRow.value, encryptionKey);
            } catch (e) {
              console.error(`Failed to decrypt guard mnemonic for user ${tx.user_id}:`, e.message);
            }
          }

          // Fall back to env var
          if (!mnemonic) {
            mnemonic = Deno.env.get('GUARD_MNEMONIC') || null;
          }

          if (mnemonic) {
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            const wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider);

            // Get actual balance and estimate gas to avoid insufficient funds
            const balance = await provider.getBalance(wallet.address);
            const sendAmount = ethers.parseEther(tx.amount.toString());
            const gasEstimate = await provider.estimateGas({
              from: wallet.address,
              to: tx.to_address,
              value: sendAmount,
            });
            const feeData = await provider.getFeeData();
            const gasCost = gasEstimate * (feeData.gasPrice || ethers.parseUnits('20', 'gwei'));
            // Add 20% buffer for gas price fluctuation
            const gasCostWithBuffer = gasCost + (gasCost / 5n);

            let finalAmount = sendAmount;
            if (balance < sendAmount + gasCostWithBuffer) {
              // Not enough for full amount + gas — send what we can after gas
              finalAmount = balance - gasCostWithBuffer;
              if (finalAmount <= 0n) {
                throw new Error(`Insufficient balance for gas. Balance: ${ethers.formatEther(balance)} ETH, gas needed: ~${ethers.formatEther(gasCostWithBuffer)} ETH`);
              }
              console.log(`Adjusted send amount from ${ethers.formatEther(sendAmount)} to ${ethers.formatEther(finalAmount)} ETH (gas reserve)`);
            }

            const onChainTx = await wallet.sendTransaction({
              to: tx.to_address,
              value: finalAmount,
            });
            txHash = onChainTx.hash;
          }
        }

        await supabase
          .from('transactions')
          .update({ status: 'completed', ...(txHash ? { tx_hash: txHash } : {}) })
          .eq('id', tx.id);

        results.push({ id: tx.id, status: 'released', txHash });
      } catch (err) {
        console.error(`Failed to release tx ${tx.id}:`, err.message);
        results.push({ id: tx.id, status: 'error', error: err.message });
      }
    }

    return new Response(JSON.stringify({
      released: results.filter(r => r.status === 'released').length,
      results,
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
