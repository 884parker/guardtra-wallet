import { useState, useEffect } from 'react';
import { X, ShieldCheck, AlertTriangle, Loader2, ExternalLink, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useNetwork } from '@/hooks/use-network';

export default function RevokeConfirmModal({ transaction, onClose, onRevoked }) {
  const [step, setStep] = useState('confirm'); // confirm | sending | done
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const { txUrl: buildTxUrl } = useNetwork();
  const [hermitageAddress, setHermitageAddress] = useState('');

  useEffect(() => {
    // Check both keys for backward compatibility (hermitage_address was the old name)
    base44.entities.AppConfig.filter({ key: 'safe_wallet_address' })
      .then(res => {
        if (res[0]?.value) { setHermitageAddress(res[0].value); return; }
        // Fallback to old key name
        return base44.entities.AppConfig.filter({ key: 'hermitage_address' });
      })
      .then(res => { if (res?.[0]?.value) setHermitageAddress(res[0].value); })
      .catch(() => {});
  }, []);

  const handleRevoke = async () => {
    setStep('sending');
    setError('');

    try {
      let hash = '';

      // Send from Pause wallet (server-side) to Safe Wallet
      if (transaction.asset === 'ETH' && hermitageAddress) {
        const res = await base44.functions.invoke('sendTransaction', {
          walletType: 'guard',
          toAddress: hermitageAddress,
          amountEth: transaction.amount.toString(),
        });
        if (res.data?.error) throw new Error(res.data.error);
        hash = res.data?.txHash || '';
      }

      // Mark transaction as revoked in DB
      await base44.entities.Transaction.update(transaction.id, {
        status: 'revoked',
        ...(hash ? { tx_hash: hash } : {}),
      });

      // Log the recovery routing transaction
      if (hash) {
        await base44.entities.Transaction.create({
          amount: transaction.amount,
          asset: transaction.asset,
          from_wallet: 'guard',
          to_address: hermitageAddress,
          network: transaction.network,
          destination_label: 'Safe (Revoke)',
          status: 'completed',
          is_user_initiated: true,
          usd_value: transaction.usd_value,
          created_at: new Date().toISOString(),
        });
      }

      setTxHash(hash);
      setStep('done');
      onRevoked?.();
    } catch (err) {
      setError(err.message || 'Transaction failed');
      setStep('confirm');
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">Revoke Transaction</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {step === 'confirm' && (
          <>
            <div className="bg-muted rounded-xl p-4 space-y-2 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium">{transaction.amount} {transaction.asset}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Original destination</span><span className="font-mono text-xs text-destructive">{transaction.to_address?.slice(0,8)}...{transaction.to_address?.slice(-6)}</span></div>
            </div>

            {hermitageAddress ? (
              <div className="flex items-start gap-2 bg-accent/10 border border-accent/30 rounded-xl p-3 mb-4">
                <ShieldCheck className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-xs text-accent">
                  <p className="font-medium mb-1">Funds routed to Safe</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-muted-foreground">Original dest blocked</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-mono">{hermitageAddress.slice(0,8)}...{hermitageAddress.slice(-6)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-xs text-destructive">No Safe wallet address set. Go to Settings → Wallet Setup to configure it first.</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground bg-muted rounded-xl p-3 mb-4">Funds will be sent from Pause to your Safe wallet via the secure backend.</p>

            {error && <p className="text-xs text-destructive mb-3">{error}</p>}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border border-border text-muted-foreground rounded-xl py-3 text-sm hover:bg-muted">Cancel</button>
              <button onClick={handleRevoke} className="flex-1 bg-destructive text-destructive-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90">
                Revoke & Secure
              </button>
            </div>
          </>
        )}

        {step === 'sending' && (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">Sending from Pause to Safe...</p>
            <p className="text-xs text-muted-foreground mt-1">Broadcasting on-chain via secure backend</p>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7 text-accent" />
            </div>
            <h3 className="font-semibold mb-1">Transaction Revoked</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {txHash ? 'Funds sent to your Safe wallet on-chain.' : 'Transaction marked as revoked.'}
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