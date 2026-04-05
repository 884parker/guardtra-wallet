import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { ethers } from 'npm:ethers@6.13.0';

/**
 * SECURITY NOTE: Private keys are loaded from Deno environment secrets only.
 * The frontend never sends a private key — it sends a walletType instead.
 * Supported walletTypes: 'vault', 'guard', 'recovery', 'liquidity'
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { walletType, toAddress, amountEth, transactionId } = await req.json();

    if (!walletType || !toAddress || !amountEth) {
      return Response.json({ error: 'walletType, toAddress, and amountEth are required' }, { status: 400 });
    }

    // Resolve private key from env secrets — never from request body
    let mnemonic;
    if (walletType === 'vault') {
      mnemonic = Deno.env.get('VAULT_MNEMONIC');
    } else if (walletType === 'guard') {
      mnemonic = Deno.env.get('GUARD_MNEMONIC');
    } else if (walletType === 'recovery') {
      mnemonic = Deno.env.get('RECOVERY_MNEMONIC');
    } else if (walletType === 'liquidity') {
      mnemonic = Deno.env.get('LIQUIDITY_MNEMONIC');
    } else {
      return Response.json({ error: 'Invalid walletType. Must be vault, guard, recovery, or liquidity.' }, { status: 400 });
    }

    if (!mnemonic) {
      return Response.json({ error: `No mnemonic configured for walletType: ${walletType}` }, { status: 500 });
    }

    const apiKey = Deno.env.get('ALCHEMY_API_KEY');
    const rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = ethers.Wallet.fromPhrase(mnemonic).connect(provider);

    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amountEth.toString()),
    });

    // Wait for 1 confirmation
    const receipt = await tx.wait(1);

    return Response.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString(),
      explorerUrl: `https://sepolia.etherscan.io/tx/${tx.hash}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});