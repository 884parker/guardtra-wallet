import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Shield, ExternalLink, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import GasTracker from '@/components/gas/GasTracker';
import { useLockHours } from '@/hooks/use-lock-hours';
import { useNetwork } from '@/hooks/use-network';

const ASSETS = ['ETH', 'USDC', 'MATIC'];
const isValidEthAddress = (addr) => /^0x[0-9a-fA-F]{40}$/.test(addr);

export default function SendModal({ fromWallet, onClose, onSent }) {
  const { networkName, txUrl: buildTxUrl, isTestnet } = useNetwork();
  const [step, setStep] = useState('form'); // form | review | sending | sent
  const [form, setForm] = useState({ amount: '', asset: 'ETH', to_address: '', network: '', destination_label: '' });
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [txError, setTxError] = useState('');
  const [guardAddress, setGuardAddress] = useState('');
  const [addressError, setAddressError] = useState('');

  const { lockHours, lockMs } = useLockHours();

  const isVault = fromWallet === 'vault';
  const isLiquidity = fromWallet === 'liquidity';
  const ethPrice = 2450;
  const usdValue = form.asset === 'ETH' ? parseFloat(form.amount || 0) * ethPrice : parseFloat(form.amount || 0);

  useEffect(() => {
    // Set network in form once loaded
    if (networkName && !form.network) setForm(f => ({ ...f, network: networkName }));
  }, [networkName]);

  useEffect(() => {
    // Fetch the Hold wallet address so we know where to route Vault sends
    base44.entities.WalletProfile.filter({ wallet_type: 'guard' })
      .then(profiles => { if (profiles[0]?.address) setGuardAddress(profiles[0].address); })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
   setLoading(true);
   setTxError('');
   setStep('sending');
   let hash = '';

   try {
     const releaseAt = new Date(Date.now() + lockMs).toISOString();

     if (isVault && form.asset === 'ETH' && guardAddress) {
       // Step 1: Send ETH from Vault to Hold wallet on-chain (server-side, using vault mnemonic)
       const res = await base44.functions.invoke('sendTransaction', {
         walletType: 'vault',
         toAddress: guardAddress,
         amountEth: form.amount,
       });
       if (res.data?.error) throw new Error(res.data.error);
       hash = res.data?.txHash || '';
     } else if (form.asset === 'ETH' && (fromWallet === 'liquidity' || fromWallet === 'guard')) {
       // For Liquidity and Hold wallets: send directly to user's intended address
       const res = await base44.functions.invoke('sendTransaction', {
         walletType: fromWallet,
         toAddress: form.to_address,
         amountEth: form.amount,
       });
       if (res.data?.error) throw new Error(res.data.error);
       hash = res.data?.txHash || '';
     }

      // Step 2: Log the transaction in DB — destination is the user's intended address
      // Vault sends are 'held' with a future release_at; Liquidity/Guard sends are 'completed' immediately
      await base44.entities.Transaction.create({
        amount: parseFloat(form.amount),
        asset: form.asset,
        from_wallet: fromWallet,
        to_address: form.to_address,
        network: form.network,
        destination_label: form.destination_label,
        status: isVault ? 'held' : 'completed',
        release_at: isVault ? releaseAt : new Date().toISOString(),
        is_user_initiated: true,
        usd_value: usdValue,
        created_at: new Date().toISOString(),
        ...(hash ? { tx_hash: hash } : {}),
      });

      setTxHash(hash);
      setStep('sent');
      onSent?.();
    } catch (err) {
      setTxError(err.message || 'Transaction failed');
      setStep('review');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">
            Send from {fromWallet === 'vault' ? 'Vault' : fromWallet === 'liquidity' ? 'Liquidity' : 'Hold'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {step === 'form' && (
          <>
            {isVault && (
              <div className="flex items-start gap-2 bg-vault/10 border border-vault/30 rounded-xl p-3 mb-4">
                <Shield className="w-4 h-4 text-vault mt-0.5 flex-shrink-0" />
                <p className="text-xs text-vault">Vault transfers are routed through Hold Wallet with a {lockHours}-hour security hold before reaching the destination.</p>
              </div>
            )}
            {isLiquidity && (
              <div className="flex items-start gap-2 bg-liquidity/10 border border-liquidity/30 rounded-xl p-3 mb-4">
                <Zap className="w-4 h-4 text-liquidity mt-0.5 flex-shrink-0" />
                <p className="text-xs text-liquidity"><strong>Instant send</strong> — Liquidity transactions go directly to the recipient with no time lock. Double-check the address before confirming.</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="0.00" />
                </div>
                <div className="w-28">
                  <label className="text-xs text-muted-foreground mb-1 block">Asset</label>
                  <select value={form.asset} onChange={e => setForm(f => ({...f, asset: e.target.value}))}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary">
                    {ASSETS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Destination Address</label>
                <input value={form.to_address} onChange={e => {
                  const addr = e.target.value;
                  setForm(f => ({...f, to_address: addr}));
                  setAddressError(addr && !isValidEthAddress(addr) ? 'Invalid Ethereum address' : '');
                }}
                  className={`w-full bg-muted border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground font-mono focus:outline-none focus:border-primary ${addressError ? 'border-destructive' : 'border-border'}`} placeholder="0x..." />
                {addressError && <p className="text-xs text-destructive mt-1">{addressError}</p>}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Network</label>
                  <div className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-amber-400' : 'bg-accent'}`} />
                    {networkName}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Label (optional)</label>
                  <input value={form.destination_label} onChange={e => setForm(f => ({...f, destination_label: e.target.value}))}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" placeholder="Coinbase..." />
                </div>
              </div>
              {parseFloat(form.amount) > 0 && (
                <div className="bg-muted rounded-xl px-3 py-2 text-xs text-muted-foreground">≈ ${usdValue.toLocaleString()} USD</div>
              )}
              <div className="bg-muted/50 border border-border rounded-xl px-3 py-2">
                <GasTracker compact onSelectSpeed={(speed, gwei) => setForm(f => ({...f, gasSpeed: speed, gasGwei: gwei}))} />
              </div>
            </div>
            <button
              onClick={() => setStep('review')}
              disabled={!form.amount || !form.to_address || !isValidEthAddress(form.to_address)}
              className="w-full mt-4 bg-primary text-primary-foreground rounded-xl py-3 font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Review Transaction
            </button>
          </>
        )}

        {step === 'review' && (
          <>
            <div className="bg-muted rounded-xl p-4 space-y-3 mb-4">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">From</span><span className="font-mono text-xs capitalize">{fromWallet} Wallet</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-medium">{form.amount} {form.asset}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Value</span><span className="font-medium">${usdValue.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">To</span><span className="font-mono text-xs">{form.to_address.slice(0,10)}...{form.to_address.slice(-8)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Network</span><span>{form.network}</span></div>
              {form.gasGwei && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gas ({form.gasSpeed})</span><span className="text-muted-foreground">{form.gasGwei} Gwei</span></div>}
              {isVault && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Security Hold</span><span className="text-guard">{lockHours} hours via Hold</span></div>}
              {isLiquidity && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Security Hold</span><span className="text-liquidity">None — instant send</span></div>}
            </div>
            {isVault && (
              <div className="flex items-start gap-2 bg-guard/10 border border-guard/30 rounded-xl p-3 mb-4">
                <Shield className="w-4 h-4 text-guard mt-0.5 flex-shrink-0" />
                <p className="text-xs text-guard">Funds will be sent from your Vault to Hold and held for {lockHours} hours — you can revoke anytime.</p>
              </div>
            )}
            {isLiquidity && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-400">This transaction sends <strong>immediately</strong> with no time lock. It cannot be revoked once confirmed. Please verify the address and amount.</p>
              </div>
            )}
            {txError && <p className="text-xs text-destructive mb-3">{txError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep('form')} className="flex-1 border border-border text-muted-foreground rounded-xl py-3 text-sm hover:bg-muted">Back</button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 disabled:opacity-60">
                Confirm Send
              </button>
            </div>
          </>
        )}

        {step === 'sending' && (
          <div className="text-center py-10">
            <Loader2 className={`w-10 h-10 animate-spin mx-auto mb-4 ${isLiquidity ? 'text-liquidity' : 'text-vault'}`} />
            <p className="text-sm font-medium text-foreground">
              {isVault ? 'Sending from Vault to Hold...' : isLiquidity ? 'Sending from Liquidity...' : 'Sending from Hold...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Broadcasting transaction on {networkName}. This may take ~15 seconds.</p>
          </div>
        )}

        {step === 'sent' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-accent" />
            </div>
            <h3 className="font-semibold mb-1">{isVault ? 'Routed to Hold' : isLiquidity ? 'Sent Instantly' : 'Transaction Sent'}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {isVault
                ? `Funds are held in Hold Wallet for ${lockHours} hours. You can revoke from the Hold page.`
                : isLiquidity
                  ? 'Your transaction has been sent directly to the recipient — no hold, no delay.'
                  : 'Transaction submitted to network.'}
            </p>
            {txHash && (
              <a
                href={buildTxUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mb-4"
              >
                <ExternalLink className="w-3 h-3" /> View on Explorer
              </a>
            )}
            <button onClick={onClose} className="w-full mt-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}