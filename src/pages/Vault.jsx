import { useState, useEffect } from 'react';
import { Shield, Send, Download, Lock, ArrowRight, Loader2, Copy } from 'lucide-react';
import SendModal from '@/components/transaction/SendModal';
import ReceiveModal from '@/components/wallet/ReceiveModal';
import { base44 } from '@/api/base44Client';
import OnChainFeed from '@/components/dashboard/OnChainFeed';
import { useLockHours } from '@/hooks/use-lock-hours';

export default function Vault() {
  const [showSend, setShowSend] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [walletAddress, setWalletAddress] = useState('');
  const [balanceEth, setBalanceEth] = useState(null);
  const [balanceUsdc, setBalanceUsdc] = useState(null);
  const [ethPrice, setEthPrice] = useState(2450);
  const [loading, setLoading] = useState(true);
  const { lockHours } = useLockHours();

  useEffect(() => {
    base44.entities.WalletProfile.filter({ wallet_type: 'vault' }).then(async profiles => {
      const address = profiles[0]?.address;
      if (!address) { setLoading(false); return; }
      setWalletAddress(address);
      // Fetch ETH price
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
  }, [refreshKey]);

  return (
    <div className="md:ml-56 space-y-5">
      {/* Header */}
      <div className="vault-glow bg-card border border-vault/30 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-vault/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-vault" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Vault Wallet</h1>
              <div className="flex items-center gap-1.5">
              <p className="text-xs text-muted-foreground font-mono">{walletAddress ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}` : '—'}</p>
              {walletAddress && (
                <button
                  onClick={() => { navigator.clipboard.writeText(walletAddress); }}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy address"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>
            </div>
          </div>
          <span className="text-xs bg-vault/10 text-vault border border-vault/30 px-3 py-1 rounded-full">Secure Storage</span>
        </div>
        <div className="text-3xl font-bold text-vault mb-1">
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : `$${((balanceEth ?? 0) * ethPrice + (balanceUsdc ?? 0)).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
        </div>
        <p className="text-xs text-muted-foreground">All outgoing transfers include a mandatory {lockHours}-hour security hold.</p>
      </div>

      {/* Security notice */}
      <div className="bg-muted/50 border border-border rounded-xl p-4 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-vault/10 flex items-center justify-center flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-vault" />
        </div>
        <div>
          <div className="text-sm font-medium text-foreground flex items-center gap-2">
            Security Flow
            <span className="text-xs text-muted-foreground font-normal">How Vault transfers work</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className="bg-vault/10 text-vault px-2 py-0.5 rounded">Vault</span>
            <ArrowRight className="w-3 h-3" />
            <span className="bg-guard/10 text-guard px-2 py-0.5 rounded">Hold ({lockHours}h)</span>
            <ArrowRight className="w-3 h-3" />
            <span className="bg-muted px-2 py-0.5 rounded">Recipient</span>
          </div>
        </div>
      </div>

      {/* Assets */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Holdings</h2>
        <div className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-vault/10 flex items-center justify-center text-xs font-bold text-vault">E</div>
                  <div>
                    <div className="text-sm font-medium">ETH</div>
                    <div className="text-xs text-muted-foreground">{(balanceEth ?? 0).toFixed(4)} ETH</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">${((balanceEth ?? 0) * ethPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                  <div className="text-xs text-muted-foreground">@ ${ethPrice.toLocaleString()}</div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-vault/10 flex items-center justify-center text-xs font-bold text-vault">U</div>
                  <div>
                    <div className="text-sm font-medium">USDC</div>
                    <div className="text-xs text-muted-foreground">{(balanceUsdc ?? 0).toFixed(2)} USDC</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">${(balanceUsdc ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                  <div className="text-xs text-muted-foreground">Stablecoin</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setShowSend(true)} className="flex items-center justify-center gap-2 bg-vault/10 hover:bg-vault/20 text-vault border border-vault/30 rounded-xl py-3.5 text-sm font-medium transition-colors">
          <Send className="w-4 h-4" /> Send
        </button>
        <button onClick={() => setShowReceive(true)} className="flex items-center justify-center gap-2 bg-vault/10 hover:bg-vault/20 text-vault border border-vault/30 rounded-xl py-3.5 text-sm font-medium transition-colors">
          <Download className="w-4 h-4" /> Receive
        </button>
      </div>

      {/* On-chain feed */}
      {walletAddress && <OnChainFeed wallets={[{ wallet_type: 'vault', address: walletAddress }]} />}

      {showSend && <SendModal fromWallet="vault" onClose={() => setShowSend(false)} onSent={() => setRefreshKey(k => k + 1)} />}
      {showReceive && <ReceiveModal address={walletAddress} walletLabel="Vault" onClose={() => setShowReceive(false)} />}
    </div>
  );
}