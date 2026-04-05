import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { ethers } from 'npm:ethers@6.13.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const walletType = body.walletType;
    const envKey = walletType === 'guard' ? 'GUARD_MNEMONIC' : walletType === 'vault' ? 'VAULT_MNEMONIC' : null;
    if (!envKey) return Response.json({ error: 'Invalid walletType' }, { status: 400 });

    const mnemonic = Deno.env.get(envKey);
    if (!mnemonic) return Response.json({ error: 'Mnemonic not set' }, { status: 500 });

    const trimmed = mnemonic.trim();
    const words = trimmed.split(/\s+/);
    const wordCount = words.length;

    // Try to parse
    let parseError = null;
    let derivedAddress = null;
    try {
      const wallet = ethers.Wallet.fromPhrase(trimmed);
      derivedAddress = wallet.address;
    } catch (e) {
      parseError = e.message;
    }

    // Check for non-ascii or weird chars
    const hasWeirdChars = /[^\x20-\x7E]/.test(trimmed);

    return Response.json({
      wordCount,
      parseError,
      derivedAddress,
      hasWeirdChars,
      firstWord: words[0],
      lastWord: words[words.length - 1],
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});