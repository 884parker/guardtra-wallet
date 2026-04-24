import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6.13.5';

// Encrypt private key with PIN using Web Crypto
async function encryptWithPin(data: string, pin: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin.padEnd(32, '0')), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, keyMaterial, enc.encode(data));
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

async function decryptWithPin(encryptedBase64: string, pin: string): Promise<string> {
  const enc = new TextEncoder();
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin.padEnd(32, '0')), 'AES-GCM', false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, keyMaterial, data);
  return new TextDecoder().decode(decrypted);
}

async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(pin + 'guardtrasafe-vault-salt'));
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
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

    const body = await req.json();
    const { action, pin, toAddress, amount, newPin } = body;

    // Load user's wallet record
    const { data: wallets } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id);
    const walletRecord = wallets?.[0] || null;

    // Get Alchemy URL
    const apiKey = Deno.env.get('ALCHEMY_API_KEY');
    const alchemyUrl = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;

    // === CREATE WALLET ===
    if (action === 'create_wallet') {
      if (walletRecord) return new Response(JSON.stringify({ error: 'Wallet already exists' }), { status: 400, headers: corsHeaders });
      if (!pin || pin.length !== 6) return new Response(JSON.stringify({ error: 'PIN must be 6 digits' }), { status: 400, headers: corsHeaders });

      const wallet = ethers.Wallet.createRandom();
      const encryptedKey = await encryptWithPin(wallet.privateKey, pin);
      const encryptedMnemonic = await encryptWithPin(wallet.mnemonic!.phrase, pin);
      const pinHash = await hashPin(pin);

      await supabase.from('user_wallets').insert({
        user_id: user.id,
        owner_email: user.email,
        address: wallet.address,
        encrypted_private_key: encryptedKey,
        encrypted_mnemonic: encryptedMnemonic,
        pin_hash: pinHash,
        network: 'sepolia',
      });

      return new Response(JSON.stringify({ address: wallet.address }), { headers: corsHeaders });
    }

    // === VERIFY PIN ===
    if (action === 'verify_pin') {
      if (!walletRecord) return new Response(JSON.stringify({ error: 'No wallet found' }), { status: 404, headers: corsHeaders });
      const pinHash = await hashPin(pin);
      const valid = pinHash === walletRecord.pin_hash;
      return new Response(JSON.stringify({ valid, address: valid ? walletRecord.address : null }), { headers: corsHeaders });
    }

    // === GET BALANCE ===
    if (action === 'get_balance') {
      if (!walletRecord) return new Response(JSON.stringify({ error: 'No wallet found' }), { status: 404, headers: corsHeaders });
      const provider = new ethers.JsonRpcProvider(alchemyUrl);
      const balance = await provider.getBalance(walletRecord.address);
      return new Response(JSON.stringify({
        address: walletRecord.address,
        balance: ethers.formatEther(balance),
        network: 'sepolia',
      }), { headers: corsHeaders });
    }

    // === GET SEED PHRASE — DISABLED ===
    if (action === 'get_mnemonic') {
      return new Response(JSON.stringify({ error: 'Seed phrase access is disabled on Safe Wallets' }), { status: 403, headers: corsHeaders });
    }

    // === SEND ETH ===
    if (action === 'send') {
      if (!walletRecord) return new Response(JSON.stringify({ error: 'No wallet found' }), { status: 404, headers: corsHeaders });
      if (!toAddress || !amount || !pin) return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders });

      const pinHash = await hashPin(pin);
      if (pinHash !== walletRecord.pin_hash) return new Response(JSON.stringify({ error: 'Invalid PIN' }), { status: 403, headers: corsHeaders });

      const privateKey = await decryptWithPin(walletRecord.encrypted_private_key, pin);
      const provider = new ethers.JsonRpcProvider(alchemyUrl);
      const wallet = new ethers.Wallet(privateKey, provider);

      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(String(amount)),
      });

      // Log disbursement
      await supabase.from('disbursements').insert({
        user_id: user.id,
        received_fund_id: 'self',
        to_address: toAddress,
        amount: parseFloat(amount),
        asset: 'ETH',
        tx_hash_out: tx.hash,
        sent_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ tx_hash: tx.hash }), { headers: corsHeaders });
    }

    // === CHANGE PIN ===
    if (action === 'change_pin') {
      if (!walletRecord) return new Response(JSON.stringify({ error: 'No wallet found' }), { status: 404, headers: corsHeaders });
      const pinHash = await hashPin(pin);
      if (pinHash !== walletRecord.pin_hash) return new Response(JSON.stringify({ error: 'Invalid PIN' }), { status: 403, headers: corsHeaders });
      if (!newPin || newPin.length !== 6) return new Response(JSON.stringify({ error: 'New PIN must be 6 digits' }), { status: 400, headers: corsHeaders });

      const privateKey = await decryptWithPin(walletRecord.encrypted_private_key, pin);
      const mnemonic = await decryptWithPin(walletRecord.encrypted_mnemonic, pin);
      const newEncryptedKey = await encryptWithPin(privateKey, newPin);
      const newEncryptedMnemonic = await encryptWithPin(mnemonic, newPin);
      const newPinHash = await hashPin(newPin);

      await supabase.from('user_wallets').update({
        encrypted_private_key: newEncryptedKey,
        encrypted_mnemonic: newEncryptedMnemonic,
        pin_hash: newPinHash,
      }).eq('id', walletRecord.id);

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // === SYNC INCOMING TRANSACTIONS ===
    if (action === 'sync_incoming') {
      if (!walletRecord) return new Response(JSON.stringify({ error: 'No wallet found' }), { status: 404, headers: corsHeaders });

      const alchemyRes = await fetch(alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            toAddress: walletRecord.address,
            category: ['external'],
            withMetadata: true,
            maxCount: '0x14',
            order: 'desc',
          }],
        }),
      });
      const alchemyData = await alchemyRes.json();
      const transfers = alchemyData?.result?.transfers || [];

      // Get existing hashes to avoid duplicates
      const { data: existing } = await supabase
        .from('received_funds')
        .select('tx_hash_in')
        .eq('user_id', user.id);
      const existingHashes = new Set((existing || []).map((r: any) => r.tx_hash_in).filter(Boolean));

      let added = 0;
      for (const tx of transfers) {
        if (!tx.hash || existingHashes.has(tx.hash)) continue;
        await supabase.from('received_funds').insert({
          user_id: user.id,
          amount: tx.value || 0,
          asset: 'ETH',
          from_address: tx.from,
          received_at: tx.metadata?.blockTimestamp || new Date().toISOString(),
          status: 'holding',
          tx_hash_in: tx.hash,
        });
        added++;
      }

      return new Response(JSON.stringify({ synced: added }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});

