import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { ethers } from 'npm:ethers@6.13.0';

const USDC_CONTRACT = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Sepolia USDC
const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { address } = await req.json();
    if (!address) return Response.json({ error: 'Address required' }, { status: 400 });

    const apiKey = Deno.env.get('ALCHEMY_API_KEY');
    const rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Fetch ETH balance and USDC balance in parallel
    const usdc = new ethers.Contract(USDC_CONTRACT, ERC20_ABI, provider);
    const [balanceWei, usdcRaw] = await Promise.all([
      provider.getBalance(address),
      usdc.balanceOf(address).catch(() => 0n),
    ]);

    const balanceEth = parseFloat(ethers.formatEther(balanceWei));
    const balanceUsdc = parseFloat(ethers.formatUnits(usdcRaw, 6));

    return Response.json({
      address,
      network: 'Ethereum Sepolia',
      balance_eth: balanceEth,
      balance_usdc: balanceUsdc,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});