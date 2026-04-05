import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Link2, RefreshCw, ExternalLink } from 'lucide-react';

const CHAIN_EXPLORER = {
  ethereum: 'https://etherscan.io/address/',
  arbitrum: 'https://arbiscan.io/address/',
  optimism: 'https://optimistic.etherscan.io/address/',
  polygon:  'https://polygonscan.com/address/',
  base:     'https://basescan.org/address/',
};

const CHAIN_BADGES = {
  ethereum: { label: 'L1', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  arbitrum: { label: 'L2', bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  optimism: { label: 'L2', bg: 'bg-red-500/10 text-red-400 border-red-500/20' },
  polygon:  { label: 'L2', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  base:     { label: 'L2', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
};

function ChainDot({ color }) {
  return <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 inline-block" style={{ backgroundColor: color }} />;
}

export default function CrossChainBalances({ asset, walletProfiles, price }) {
  const [chainData, setChainData] = useState({}); // { walletType: { chains, total } }
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const evmProfiles = walletProfiles.filter(p => p.address && asset !== 'BTC');

  const fetchBalances = async () => {
    if (!evmProfiles.length) return;
    setLoading(true);
    const results = await Promise.all(
      evmProfiles.map(p =>
        base44.functions.invoke('getCrossChainBalances', { address: p.address, asset })
          .then(r => ({ type: p.wallet_type, data: r.data }))
          .catch(() => ({ type: p.wallet_type, data: null }))
      )
    );
    const map = {};
    results.forEach(({ type, data }) => { if (data) map[type] = data; });
    setChainData(map);
    setLastUpdated(new Date());
    setLoading(false);
  };

  useEffect(() => { fetchBalances(); }, [asset, walletProfiles.length]);

  if (asset === 'BTC') {
    return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Cross-Chain Balances</h3>
        </div>
        <p className="text-sm text-muted-foreground">BTC is not available on EVM L2 networks.</p>
      </div>
    );
  }

  // Aggregate totals per chain across all wallets
  const chainTotals = {};
  Object.values(chainData).forEach(({ chains }) => {
    chains?.forEach(c => {
      if (!chainTotals[c.chain]) chainTotals[c.chain] = { ...c, balance: 0 };
      chainTotals[c.chain].balance += c.balance;
    });
  });
  const sortedChains = Object.values(chainTotals).sort((a, b) => b.balance - a.balance);
  const grandTotal = sortedChains.reduce((s, c) => s + c.balance, 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Cross-Chain Balances</h3>
          <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
            {sortedChains.length} networks
          </span>
        </div>
        <button
          onClick={fetchBalances}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-40 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !sortedChains.length ? (
        <div className="flex items-center justify-center h-24">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : sortedChains.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No wallet addresses configured.</p>
      ) : (
        <>
          {/* Chain breakdown */}
          <div className="space-y-2.5">
            {sortedChains.map(chain => {
              const pct = grandTotal > 0 ? (chain.balance / grandTotal) * 100 : 0;
              const badge = CHAIN_BADGES[chain.chain];
              const usd = price > 0 ? chain.balance * price : chain.balance;
              return (
                <div key={chain.chain}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <ChainDot color={chain.color} />
                      <span className="text-sm text-foreground">{chain.name}</span>
                      {badge && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-foreground">
                        {chain.balance.toFixed(4)} {asset}
                      </span>
                      {price > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: chain.color + 'aa' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Per-wallet breakdown */}
          {evmProfiles.length > 1 && Object.keys(chainData).length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Per-wallet breakdown</p>
              <div className="space-y-2">
                {evmProfiles.map(p => {
                  const data = chainData[p.wallet_type];
                  if (!data) return null;
                  return (
                    <div key={p.wallet_type} className="bg-muted/40 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-foreground capitalize">{p.wallet_type}</span>
                        <span className="text-xs font-medium text-foreground">
                          {data.total?.toFixed(4)} {asset}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.chains?.filter(c => c.balance > 0).map(c => (
                          <a
                            key={c.chain}
                            href={CHAIN_EXPLORER[c.chain] + p.address}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChainDot color={c.color} />
                            {c.name}: {c.balance.toFixed(4)}
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        ))}
                        {data.chains?.every(c => c.balance === 0) && (
                          <span className="text-xs text-muted-foreground">No balance on any chain</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Total + timestamp */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">Total cross-chain</span>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground/60 ml-2">
                  · updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-foreground">{grandTotal.toFixed(4)} {asset}</span>
              {price > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  ${(grandTotal * price).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}