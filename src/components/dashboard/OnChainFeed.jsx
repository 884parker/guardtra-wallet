import { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownLeft, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { txUrl, getActiveNetwork } from '@/lib/network-config';
import { formatDistanceToNow } from 'date-fns';

const WALLET_COLORS = {
  vault: 'text-vault',
  guard: 'text-guard',
  liquidity: 'text-liquidity',
  recovery: 'text-accent',
};

function shortAddr(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function TxRow({ tx, walletMap }) {
  const fromLabel = walletMap[tx.from?.toLowerCase()] || shortAddr(tx.from);
  const toLabel = walletMap[tx.to?.toLowerCase()] || shortAddr(tx.to);
  const fromColor = WALLET_COLORS[walletMap[tx.from?.toLowerCase()]] || 'text-muted-foreground';
  const toColor = WALLET_COLORS[walletMap[tx.to?.toLowerCase()]] || 'text-muted-foreground';
  const isOutgoing = Object.keys(walletMap).includes(tx.from?.toLowerCase());
  const value = tx.value != null ? parseFloat(tx.value).toFixed(4) : '?';
  const timeAgo = tx.timestamp ? formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true }) : '';

  return (
    <div className="flex items-center gap-3 py-3 border-t border-border first:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOutgoing ? 'bg-muted' : 'bg-accent/10'}`}>
        {isOutgoing
          ? <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
          : <ArrowDownLeft className="w-4 h-4 text-accent" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground flex items-center gap-1.5 flex-wrap">
          <span className={`font-medium ${fromColor}`}>{fromLabel}</span>
          <span className="text-muted-foreground">→</span>
          <span className={`font-medium ${toColor}`}>{toLabel}</span>
        </div>
        <div className="text-xs text-muted-foreground">{timeAgo}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-sm font-medium ${isOutgoing ? 'text-foreground' : 'text-accent'}`}>
          {isOutgoing ? '-' : '+'}{value} {tx.asset || 'ETH'}
        </div>
        <a
          href={txUrl(tx.hash)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" /> Etherscan
        </a>
      </div>
    </div>
  );
}

export default function OnChainFeed({ wallets }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  // Map lowercase address → wallet type label
  const walletMap = {};
  wallets.forEach(w => {
    if (w.address) walletMap[w.address.toLowerCase()] = w.wallet_type;
  });

  const addresses = wallets.filter(w => w.address).map(w => w.address);

  const fetchTransfers = useCallback(async () => {
    if (!addresses.length) return;
    setLoading(true);
    const res = await base44.functions.invoke('getWalletTransfers', { addresses }).catch(() => null);
    if (res?.data?.transfers) {
      setTransfers(res.data.transfers);
      setLastFetched(new Date());
    }
    setLoading(false);
  }, [addresses.join(',')]);

  useEffect(() => {
    fetchTransfers();
    const interval = setInterval(fetchTransfers, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchTransfers]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-muted-foreground">On-Chain Activity</h2>
        <div className="flex items-center gap-2">
          {lastFetched && (
            <span className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(lastFetched, { addSuffix: true })}
            </span>
          )}
          <button
            onClick={fetchTransfers}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl">
        <div className="px-4">
          {loading && transfers.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">No on-chain transfers found yet.</div>
          ) : (
            transfers.map(tx => <TxRow key={tx.hash} tx={tx} walletMap={walletMap} />)
          )}
        </div>
        {transfers.length > 0 && (
          <div className="border-t border-border px-4 py-3 flex items-center justify-center">
            <a
              href={getActiveNetwork().explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> View all on {getActiveNetwork().explorerName}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}