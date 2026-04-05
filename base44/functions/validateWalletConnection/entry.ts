import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Validates that a user-connected wallet address does not match any system-managed wallet.
 * Call this before allowing a user to save a connected wallet to the app.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connectedAddress } = await req.json();

    if (!connectedAddress) {
      return Response.json({ error: 'connectedAddress is required' }, { status: 400 });
    }

    // Fetch system-managed wallets excluding Guard (which has contract interactions)
    const systemWallets = await base44.asServiceRole.entities.WalletProfile.filter({
      is_system_managed: true,
    });

    const blockedWallets = systemWallets.filter(w => ['vault', 'liquidity', 'recovery'].includes(w.wallet_type));
    const blockedAddresses = blockedWallets.map(w => w.address?.toLowerCase());
    const normalizedConnected = connectedAddress.toLowerCase();

    if (blockedAddresses.includes(normalizedConnected)) {
      return Response.json({
        allowed: false,
        reason: 'This wallet address is reserved for system management and cannot be connected directly.',
      });
    }

    return Response.json({ allowed: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});