import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const NETWORKS = {
  ethereum:  { name: 'Ethereum',  rpc: 'https://eth-mainnet.g.alchemy.com/v2/',      color: '#627EEA', chainId: 1    },
  arbitrum:  { name: 'Arbitrum',  rpc: 'https://arb-mainnet.g.alchemy.com/v2/',      color: '#28A0F0', chainId: 42161 },
  optimism:  { name: 'Optimism',  rpc: 'https://opt-mainnet.g.alchemy.com/v2/',      color: '#FF0420', chainId: 10   },
  polygon:   { name: 'Polygon',   rpc: 'https://polygon-mainnet.g.alchemy.com/v2/',  color: '#8247E5', chainId: 137  },
  base:      { name: 'Base',      rpc: 'https://base-mainnet.g.alchemy.com/v2/',     color: '#0052FF', chainId: 8453 },
};

// USDC contract addresses per chain
const USDC_CONTRACTS = {
  ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  polygon:  '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  base:     '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

const ERC20_BALANCE_OF = '0x70a08231'; // balanceOf(address) selector

async function ethCall(rpc, method, params) {
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  return data.result;
}

async function getETHBalance(rpcUrl, address) {
  const hex = await ethCall(rpcUrl, 'eth_getBalance', [address, 'latest']).catch(() => '0x0');
  return parseInt(hex, 16) / 1e18;
}

async function getUSDCBalance(rpcUrl, address, contractAddress) {
  const paddedAddr = address.slice(2).padStart(64, '0');
  const data = ERC20_BALANCE_OF + paddedAddr;
  const hex = await ethCall(rpcUrl, 'eth_call', [{ to: contractAddress, data }, 'latest']).catch(() => '0x0');
  return parseInt(hex, 16) / 1e6;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { address, asset = 'ETH' } = await req.json().catch(() => ({}));
  if (!address) return Response.json({ error: 'address required' }, { status: 400 });

  const apiKey = Deno.env.get('ALCHEMY_API_KEY') || 'demo';

  const results = await Promise.all(
    Object.entries(NETWORKS).map(async ([chainKey, net]) => {
      const rpc = net.rpc + apiKey;
      let balance = 0;
      if (asset === 'ETH' || asset === 'MATIC') {
        balance = await getETHBalance(rpc, address).catch(() => 0);
      } else if (asset === 'USDC') {
        const contract = USDC_CONTRACTS[chainKey];
        if (contract) balance = await getUSDCBalance(rpc, address, contract).catch(() => 0);
      }
      // BTC is not on EVM chains — return 0
      return { chain: chainKey, name: net.name, color: net.color, chainId: net.chainId, balance };
    })
  );

  const total = results.reduce((s, r) => s + r.balance, 0);
  return Response.json({ chains: results, total, asset, address });
});