import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AssetPriceChart from '@/components/asset/AssetPriceChart';
import AssetWalletHoldings from '@/components/asset/AssetWalletHoldings';
import AssetTransactions from '@/components/asset/AssetTransactions';
import CrossChainBalances from '@/components/asset/CrossChainBalances';

const ASSETS = ['ETH', 'BTC', 'USDC', 'MATIC'];
const PRICES  = { ETH: 2450, BTC: 62000, USDC: 1, MATIC: 0.85 };

export default function AssetDetail() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const assetParam = params.get('asset')?.toUpperCase();
  const [asset, setAsset] = useState(ASSETS.includes(assetParam) ? assetParam : 'ETH');

  const [walletProfiles, setWalletProfiles] = useState([]);
  const [balances, setBalances] = useState({});
  const [loadingBalances, setLoadingBalances] = useState(false);

  useEffect(() => {
    base44.entities.WalletProfile.list().then(async profiles => {
      setWalletProfiles(profiles);
      if (!profiles.length) return;
      setLoadingBalances(true);
      const results = await Promise.all(
        profiles.map(p => p.address
          ? base44.functions.invoke('getWalletBalance', { address: p.address }).catch(() => null)
          : null)
      );
      const newBal = {};
      profiles.forEach((p, i) => { if (results[i]?.data) newBal[p.wallet_type] = results[i].data; });
      setBalances(newBal);
      setLoadingBalances(false);
    }).catch(() => {});
  }, []);

  // Sync asset to URL without full navigation
  const selectAsset = (a) => {
    setAsset(a);
    window.history.replaceState(null, '', `/AssetDetail?asset=${a}`);
  };

  return (
    <div className="md:ml-56 space-y-5 pb-8">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/Dashboard')} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Asset Detail</h1>
      </div>

      {/* Asset selector */}
      <div className="flex gap-2 flex-wrap">
        {ASSETS.map(a => (
          <button
            key={a}
            onClick={() => selectAsset(a)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              asset === a
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:border-primary/40'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Price chart */}
      <AssetPriceChart asset={asset} />

      {/* Holdings */}
      {loadingBalances ? (
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-center h-32">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AssetWalletHoldings
          asset={asset}
          walletProfiles={walletProfiles}
          balances={balances}
          price={PRICES[asset] || 0}
        />
      )}

      {/* Cross-chain balances */}
      <CrossChainBalances
        asset={asset}
        walletProfiles={walletProfiles}
        price={PRICES[asset] || 0}
      />

      {/* Transactions */}
      <AssetTransactions asset={asset} />
    </div>
  );
}