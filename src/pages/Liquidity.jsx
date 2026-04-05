import { useState, useEffect } from 'react';
import { Zap, Send, Download, Loader2, Copy } from 'lucide-react';
import SendModal from '@/components/transaction/SendModal';
import ReceiveModal from '@/components/wallet/ReceiveModal';
import { base44 } from '@/api/base44Client';
import OnChainFeed from '@/components/dashboard/OnChainFeed';

export default function Liquidity() {
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [balanceEth, setBalanceEth] = useState(null);
  const [balanceUsdc, setBalanceUsdc] = useState(null);
  const [ethPrice, setEthPrice] = useState(2450);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.WalletProfile.filter({ wallet_type: 'liquidity' }).then(async profiles => {
      const address = profiles[0]?.address;
      if (!address) { setLoading(false); return; }
      setWalletAddress(address);
      const priceRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').catch(() => null);
      const priceData = priceRes ? await priceRes.json().catch(() => null) : null;
      const price = priceData?.ethereum?.usd;
      if (price && price > 0 && price < 100000) setEthPrice(price);
      // Fetch live on-chain balance
      const res = await base44.functions.invoke('getWalletBalance', { address }).catch(() => null);
      setBalanceEth(res?.data?.balance_eth ?? 0);
      setBalanceUsdc(res?.data?.balance_usdc ?? 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="md:ml-56 space-y-5">
      {/* Header */}
      <div className="liquidity-glow bg-card border border-liquidity/30 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-liquidity/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-liquidity" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Liquidity Wallet</h1>
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
          <span className="text-xs bg-liquidity/10 text-liquidity border border-liquidity/30 px-3 py-1 rounded-full">Daily Spending</span>
        </div>
        <div className="text-3xl font-bold text-liquidity mb-1">
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `$${((balanceEth ?? 0) * ethPrice + (balanceUsdc ?? 0)).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span className="bg-liquidity/10 text-liquidity px-2 py-0.5 rounded">No delay on transfers</span>
          <span>— Direct sends enabled</span>
        </div>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-7 h-7 rounded-full bg-liquidity/10 flex items-center justify-center text-xs font-bold text-liquidity mb-2">E</div>
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (
            <>
              <div className="text-lg font-bold text-foreground">{(balanceEth ?? 0).toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">ETH · ${((balanceEth ?? 0) * ethPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            </>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-7 h-7 rounded-full bg-liquidity/10 flex items-center justify-center text-xs font-bold text-liquidity mb-2">U</div>
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (
            <>
              <div className="text-lg font-bold text-foreground">{(balanceUsdc ?? 0).toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">USDC · ${(balanceUsdc ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setShowSend(true)} className="flex items-center justify-center gap-2 bg-liquidity/10 hover:bg-liquidity/20 text-liquidity border border-liquidity/30 rounded-xl py-3.5 text-sm font-medium transition-colors">
          <Send className="w-4 h-4" /> Send
        </button>
        <button onClick={() => setShowReceive(true)} className="flex items-center justify-center gap-2 bg-liquidity/10 hover:bg-liquidity/20 text-liquidity border border-liquidity/30 rounded-xl py-3.5 text-sm font-medium transition-colors">
          <Download className="w-4 h-4" /> Receive
        </button>
      </div>

      {/* On-chain feed */}
      {walletAddress && <OnChainFeed wallets={[{ wallet_type: 'liquidity', address: walletAddress }]} />}

      {showSend && <SendModal fromWallet="liquidity" onClose={() => setShowSend(false)} onSent={() => {}} />}
      {showReceive && <ReceiveModal address={walletAddress} walletLabel="Liquidity" onClose={() => setShowReceive(false)} />}
    </div>
  );
}