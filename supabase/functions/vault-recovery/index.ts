import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.13.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

/**
 * Emergency vault recovery — 5-step process:
 * 1. freeze: Scan held transactions
 * 2. revoke: Cancel all held transactions
 * 3. generate: Create new vault wallet
 * 4. migrate: Record asset migration
 * 5. flag: Mark old vault as compromised
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

    const { step, newVaultAddress } = await req.json();

    // Step 1: Scan held transactions
    if (step === 'freeze') {
      const { data: held } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'held');
      return new Response(JSON.stringify({ count: held?.length || 0 }), { headers: corsHeaders });
    }

    // Step 2: Revoke all held transactions
    if (step === 'revoke') {
      const { data: held } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'held');

      const ids = (held || []).map((t: any) => t.id);
      if (ids.length > 0) {
        await supabase
          .from('transactions')
          .update({ status: 'revoked' })
          .in('id', ids);
      }

      return new Response(JSON.stringify({ revoked: ids.length }), { headers: corsHeaders });
    }

    // Step 3: Generate new vault wallet
    if (step === 'generate') {
      const wallet = ethers.Wallet.createRandom();

      // Create new vault wallet profile
      await supabase.from('wallet_profiles').insert({
        user_id: user.id,
        wallet_type: 'vault',
        address: wallet.address,
        label: 'Vault (Recovery)',
        is_system_managed: true,
        network: 'sepolia',
      });

      return new Response(JSON.stringify({
        newVaultAddress: wallet.address,
        newMnemonic: wallet.mnemonic!.phrase,
        newPrivateKey: wallet.privateKey,
      }), { headers: corsHeaders });
    }

    // Step 4: Record migration
    if (step === 'migrate') {
      // Count existing vault assets for migration record
      const { data: vaultProfiles } = await supabase
        .from('wallet_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('wallet_type', 'vault')
        .eq('is_compromised', false);

      return new Response(JSON.stringify({ migrated: vaultProfiles?.length || 0 }), { headers: corsHeaders });
    }

    // Step 5: Flag old vault as compromised
    if (step === 'flag') {
      const { data: oldVaults } = await supabase
        .from('wallet_profiles')
        .select('id, address')
        .eq('user_id', user.id)
        .eq('wallet_type', 'vault')
        .eq('is_compromised', false);

      // Flag all old vaults except the newest one (the recovery-generated one)
      const toFlag = (oldVaults || []).filter((v: any) => v.address !== newVaultAddress);
      for (const v of toFlag) {
        await supabase
          .from('wallet_profiles')
          .update({ is_compromised: true })
          .eq('id', v.id);
      }

      return new Response(JSON.stringify({ flagged: toFlag.map((v: any) => v.address) }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown step' }), { status: 400, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});

