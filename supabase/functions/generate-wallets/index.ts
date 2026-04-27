import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.13.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function encryptMnemonic(mnemonic: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(secret.padEnd(32, '0').slice(0, 32)), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyMaterial, enc.encode(mnemonic));
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

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

    // Check if user already has wallets
    const { data: existing } = await supabase
      .from('wallet_profiles')
      .select('wallet_type')
      .eq('user_id', user.id);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ error: 'Wallets already exist' }), { status: 400, headers: corsHeaders });
    }

    const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const walletTypes = ['vault', 'guard', 'liquidity'] as const;
    const results: Record<string, string> = {};
    const mnemonics: Record<string, string> = {};

    for (const type of walletTypes) {
      const wallet = ethers.Wallet.createRandom();
      const encryptedMnemonic = await encryptMnemonic(wallet.mnemonic!.phrase, encryptionKey);

      await supabase.from('wallet_profiles').insert({
        user_id: user.id,
        wallet_type: type,
        address: wallet.address,
        label: type === 'guard' ? 'Pause' : type.charAt(0).toUpperCase() + type.slice(1),
        is_system_managed: true,
        network: 'sepolia',
      });

      await supabase.from('app_config').insert({
        user_id: user.id,
        key: `${type}_mnemonic_encrypted`,
        value: encryptedMnemonic,
      });

      results[type] = wallet.address;
      mnemonics[type] = wallet.mnemonic!.phrase;
    }

    return new Response(JSON.stringify({
      success: true,
      wallets: results,
      backup: {
        vault: mnemonics.vault,
        guard: mnemonics.guard,
        liquidity: mnemonics.liquidity,
      },
      message: 'Save your backup phrases! They will not be shown again.',
    }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
