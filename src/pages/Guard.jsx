import { useState, useEffect } from 'react';
import { Activity, AlertTriangle, ShieldAlert, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import GuardTimer from '@/components/guard/GuardTimer';
import GasTank from '@/components/guard/GasTank';
import EmergencyFlow from '@/components/guard/EmergencyFlow';
import RevokeConfirmModal from '@/components/guard/RevokeConfirmModal';
import OnChainFeed from '@/components/dashboard/OnChainFeed';
import { useLockHours } from '@/hooks/use-lock-hours';



export default function Guard() {
  const [transactions, setTransactions] = useState([]);
  const [dbTxs, setDbTxs] = useState([]);
  const [showEmergency, setShowEmergency] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [recoveryAddress, setRecoveryAddress] = useState('');
  const [balanceEth, setBalanceEth] = useState(null);
  const [ethPrice, setEthPrice] = useState(2450);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const { lockHours } = useLockHours();

  useEffect(() => {
    base44.entities.Transaction.filter({ status: 'held' }).then(setDbTxs).catch(() => {});
    // Fetch primary recovery address from local DB
    base44.entities.RecoveryAddress.filter({ is_primary: true }).then(addrs => {
      if (addrs[0]?.address) setRecoveryAddress(addrs[0].address);
    }).catch(() => {});
    base44.entities.WalletProfile.filter({ wallet_type: 'guard' }).then(async profiles => {
      const address = profiles[0]?.address;
      if (!address) { setLoadingBalance(false); return; }
      setWalletAddress(address);
      const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').catch(() => null);
      const priceData = priceRes ? await priceRes.json().catch(() => null) : null;
      const price = priceData?.ethereum?.usd;
      if (price && price > 0 && price < 100000) setEthPrice(price);
      // Fetch live on-chain balance
      const res = await base44.functions.invoke('getWalletBalance', { address }).catch(() => null);
      setBalanceEth(res?.data?.balance_eth ?? 0);
      setLoadingBalance(false);
    }).catch(() => setLoadingBalance(false));
  }, []);

  // Deduplicate: DB records take precedence; exclude any local tx whose ID already exists in DB
  const dbIds = new Set(dbTxs.map(t => t.id));
  const allTxs = [...dbTxs, ...transactions.filter(t => !dbIds.has(t.id))];
  const hasUnauthorized = allTxs.some(t => !t.is_user_initiated);

  const handleRevokeClick = (id) => {
    const tx = allTxs.find(t => t.id === id);
    if (tx) setRevokeTarget(tx);
  };

  const handleRevokeConfirmed = () => {
    if (!revokeTarget) return;
    setTransactions(prev => prev.filter(t => t.id !== revokeTarget.id));
    setDbTxs(prev => prev.filter(t => t.id !== revokeTarget.id));
    setRevokeTarget(null);
  };

  const handleApprove = async (id) => {
    try {
      await base44.entities.Transaction.update(id, { approved: true });
      setDbTxs(prev => prev.map(t => t.id === id ? { ...t, approved: true } : t));
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, approved: true } : t));
    } catch (err) {
      console.error('Failed to approve transaction:', err);
    }
  };

  // Calculate total held amount for gas tank
  const heldTotal = allTxs.reduce((sum, tx) => sum + (tx.asset === 'ETH' ? (tx.amount || 0) : 0), 0);

  return (
    <div className="md:ml-56 space-y-5">
      {/* Header */}
      <div className={`guard-glow bg-card border rounded-2xl p-6 ${hasUnauthorized ? 'border-destructive/50' : 'border-guard/30'}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasUnauthorized ? 'bg-destructive/20' : 'bg-guard/20'}`}>
              <Activity className={`w-5 h-5 ${hasUnauthorized ? 'text-destructive' : 'text-guard'}`} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Guard Wallet</h1>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground font-mono">{walletAddress ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : '—'}</p>
                {walletAddress && (
                  <button onClick={() => navigator.clipboard.writeText(walletAddress)} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Copy address">
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnauthorized ? (
              <span className="text-xs bg-destructive/20 text-destructive border border-destructive/30 px-3 py-1 rounded-full animate-pulse">⚠ Alert</span>
            ) : (
              <span className="text-xs bg-guard/10 text-guard border border-guard/30 px-3 py-1 rounded-full">{lockHours}h Security Hold</span>
            )}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold text-guard">{allTxs.length}</div>
            <div className="text-xs text-muted-foreground">pending release{allTxs.length !== 1 ? 's' : ''}</div>
            {allTxs.length > 0 && (
              <div className="text-sm font-medium text-foreground mt-1">
                ≈ ${allTxs.reduce((sum, tx) => {
                  const usd = tx.usd_value ?? (tx.asset === 'ETH' ? (tx.amount ?? 0) * ethPrice : (tx.amount ?? 0));
                  return sum + usd;
                }, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} total held
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-foreground">
              {loadingBalance ? '...' : `${(balanceEth ?? 0).toFixed(4)} ETH`}
            </div>
            <div className="text-xs text-muted-foreground">{loadingBalance ? '' : `≈ $${((balanceEth ?? 0) * ethPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}</div>
          </div>
        </div>

        {/* Held balances per asset */}
        {allTxs.length > 0 && (() => {
          const heldTotals = allTxs.reduce((acc, tx) => {
            acc[tx.asset] = (acc[tx.asset] || 0) + (tx.amount || 0);
            return acc;
          }, {});
          return (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-2">On Hold</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(heldTotals).map(([asset, total]) => (
                  <div key={asset} className="flex items-center gap-1.5 bg-destructive/10 border border-destructive/20 rounded-lg px-2.5 py-1">
                    <span className="text-xs font-mono font-medium text-destructive">{total.toFixed(asset === 'ETH' ? 4 : 2)}</span>
                    <span className="text-xs text-muted-foreground">{asset}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Gas Tank */}
      <GasTank balanceEth={balanceEth ?? 0} heldAmount={heldTotal} />

      {/* Emergency button */}
      {hasUnauthorized && (
        <button
          onClick={() => setShowEmergency(true)}
          className="w-full flex items-center justify-center gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/40 rounded-2xl py-4 font-medium transition-colors"
        >
          <ShieldAlert className="w-5 h-5" />
          Emergency Protection — Secure Assets Now
        </button>
      )}

      {/* Transactions */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          {allTxs.length > 0 ? 'Pending Releases' : 'No Pending Transactions'}
        </h2>
        {allTxs.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No transactions held in Guard right now.</p>
            <p className="text-xs text-muted-foreground mt-1">Vault transfers will appear here with a 24h security timer.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allTxs.map(tx => (
              <GuardTimer
                key={tx.id}
                transaction={tx}
                onRevoke={handleRevokeClick}
                onApprove={handleApprove}
                onStartRecovery={!tx.is_user_initiated ? () => setShowEmergency(true) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-muted/30 border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium mb-2 text-foreground">How Guard Protection Works</h3>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2"><span className="text-guard mt-0.5">•</span>All Vault transfers are held here for {lockHours} hours before release</li>
          <li className="flex items-start gap-2"><span className="text-guard mt-0.5">•</span>You can revoke any transaction during the hold period</li>
          <li className="flex items-start gap-2"><span className="text-guard mt-0.5">•</span>Unauthorized activity triggers an immediate alert</li>
          <li className="flex items-start gap-2"><span className="text-guard mt-0.5">•</span>Emergency flow generates a new Vault and migrates held funds</li>
        </ul>
      </div>

      {/* On-chain feed */}
      {walletAddress && <OnChainFeed wallets={[{ wallet_type: 'guard', address: walletAddress }]} />}

      {showEmergency && <EmergencyFlow onClose={() => setShowEmergency(false)} />}
      {revokeTarget && (
        <RevokeConfirmModal
          transaction={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onRevoked={handleRevokeConfirmed}
        />
      )}

    </div>
  );
}