import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import WalletCard from '@/components/wallet/WalletCard';
import { ArrowRight, Activity, Loader2 } from 'lucide-react';
import AddAddressModal from '@/components/wallet/AddAddressModal';
import TransactionLog from '@/components/transaction/TransactionLog';
import OnChainFeed from '@/components/dashboard/OnChainFeed';
import GasTracker from '@/components/gas/GasTracker';
import PortfolioChart from '@/components/dashboard/PortfolioChart';
import AssetAllocationChart from '@/components/dashboard/AssetAllocationChart';
import { useLockHours } from '@/hooks/use-lock-hours';

export default function Dashboard() {
  const navigate = useNavigate();
  const [wallets, setWallets] = useState([]);
  const [balances, setBalances] = useState({});
  const [pendingTxs, setPendingTxs] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [ethPrice, setEthPrice] = useState(0);
  const [addAddressFor, setAddAddressFor] = useState(null);
  const { lockHours } = useLockHours();

  useEffect(() => {
    base44.entities.Transaction.filter({ status: 'held' }).then(setPendingTxs).catch(() => {});
    base44.entities.WalletProfile.list().then(async (profiles) => {
      setWallets(profiles);
      if (!profiles || profiles.length === 0) return;
      setLoadingBalances(true);
      // Fetch ETH price
      const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').catch(() => null);
      const priceData = priceRes ? await priceRes.json().catch(() => null) : null;
      const price = priceData?.ethereum?.usd || 0;
      const safePrice = price > 0 && price < 100000 ? price : 2450;
      setEthPrice(safePrice);
      // Fetch live on-chain balances
      const results = await Promise.all(
        profiles.map(p => p.address
          ? base44.functions.invoke('getWalletBalance', { address: p.address }).catch(() => null)
          : null
        )
      );
      const newBalances = {};
      profiles.forEach((p, i) => {
        const data = results[i]?.data;
        newBalances[p.wallet_type] = data ?? { balance_eth: 0, balance_usdc: 0, balance_btc: 0 };
      });
      setBalances(newBalances);
      setLoadingBalances(false);
    }).catch(() => {});
  }, []);

  const getEth = (type) => balances[type]?.balance_eth ?? 0;
  const getUsdc = (type) => balances[type]?.balance_usdc ?? 0;
  const totalUSD = (getEth('vault') + getEth('guard') + getEth('liquidity')) * ethPrice + getUsdc('vault') + getUsdc('guard') + getUsdc('liquidity');

  return (
    <>
    <div className="md:ml-56 space-y-6">
      {/* Hero */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Portfolio</p>
            <div className="text-4xl font-bold text-foreground">
              {loadingBalances ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : `$${totalUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            </div>
            {ethPrice > 0 && !loadingBalances && (
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <span>ETH: ${ethPrice.toLocaleString()}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Security Status</div>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm font-medium text-accent">Protected</span>
            </div>
          </div>
        </div>

        {/* Flow diagram */}
        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 bg-vault/10 text-vault rounded-lg border border-vault/20">Vault</span>
          <ArrowRight className="w-3 h-3" />
          <span className="px-2 py-1 bg-guard/10 text-guard rounded-lg border border-guard/20">Hold ({lockHours}h hold)</span>
          <ArrowRight className="w-3 h-3" />
          <span className="px-2 py-1 bg-muted rounded-lg">Recipient</span>
        </div>
      </div>

      {/* Wallets grid */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Your Wallets</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {['vault', 'guard', 'liquidity'].map(type => {
            const wallet = wallets.find(w => w.wallet_type === type);
            const bal = balances[type];
            const ethAmt = bal?.balance_eth ?? null;
            const balanceStr = loadingBalances ? '...' : ethAmt !== null ? `${ethAmt.toFixed(4)} ETH` : 'No wallet';
            return (
              <WalletCard
                key={type}
                type={type}
                balance={balanceStr}
                address={wallet?.address || ''}
                pending={type === 'guard' ? pendingTxs.length : undefined}
                onClick={() => wallet?.address ? navigate(`/${type.charAt(0).toUpperCase() + type.slice(1)}`) : setAddAddressFor({ type, id: wallet?.id })}
              />
            );
          })}
        </div>
      </div>

      {/* Pending guard activity */}
      {pendingTxs.length > 0 && (
        <div className="bg-guard/5 border border-guard/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-guard" />
              <span className="text-sm font-medium text-guard">{pendingTxs.length} transaction{pendingTxs.length > 1 ? 's' : ''} in Hold</span>
            </div>
            <button onClick={() => navigate('/Hold')} className="text-xs text-guard hover:underline">Review →</button>
          </div>
          {pendingTxs.slice(0, 2).map(tx => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-t border-guard/10 text-sm">
              <span className="text-muted-foreground">{tx.amount} {tx.asset} → {tx.to_address?.slice(0,8)}...</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${tx.is_user_initiated ? 'bg-guard/10 text-guard' : 'bg-destructive/10 text-destructive'}`}>
                {tx.is_user_initiated ? 'Authorized' : '⚠ Unauthorized'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PortfolioChart totalUSD={totalUSD} />
        <AssetAllocationChart balances={balances} ethPrice={ethPrice} />
      </div>

      {/* Quick asset links */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Assets</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { asset: 'ETH',  price: ethPrice || 2450, change: '', up: true  },
            { asset: 'USDC', price: 1,                change: '',  up: true  },
          ].map(({ asset, price, change, up }) => (
            <button
              key={asset}
              onClick={() => navigate(`/AssetDetail?asset=${asset}`)}
              className="bg-card border border-border hover:border-primary/40 rounded-xl p-4 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">{asset}</span>
                <span className={`text-xs ${up ? 'text-accent' : 'text-destructive'}`}>{change}</span>
              </div>
              <div className="text-lg font-bold text-foreground">${price.toLocaleString()}</div>
              <div className="text-xs text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View detail →</div>
            </button>
          ))}
        </div>
      </div>

      {/* Gas Tracker */}
      <GasTracker />

      {/* On-chain feed */}
      <OnChainFeed wallets={wallets} />

      {/* Recent activity (app DB) */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">App Activity</h2>
        <div className="bg-card border border-border rounded-2xl px-4">
          <TransactionLog limit={5} />
        </div>
      </div>

      {/* Security summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Vault Protected', value: '85%', color: 'text-vault' },
          { label: 'Active Holds', value: pendingTxs.length.toString(), color: 'text-guard' },
          { label: 'Threats Blocked', value: '0', color: 'text-accent' },
        ].map(item => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
          </div>
        ))}
      </div>
    </div>

    {addAddressFor && (
      <AddAddressModal
        walletType={addAddressFor.type}
        existingId={addAddressFor.id}
        onClose={() => setAddAddressFor(null)}
        onSaved={() => window.location.reload()}
      />
    )}
    </>
  );
}