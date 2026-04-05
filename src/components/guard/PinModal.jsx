import { useState } from 'react';
import { X, Lock, ShieldCheck, ExternalLink, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { BrowserProvider, parseEther } from 'ethers';
import { useAppKitProvider, useAppKitAccount } from '@reown/appkit/react';

export default function PinModal({ onClose, onSuccess, transaction }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [done, setDone] = useState(false);

  const { walletProvider } = useAppKitProvider('eip155');
  const { isConnected } = useAppKitAccount();

  const handleSubmit = async () => {
    if (!pin) return;
    setLoading(true);
    setError('');
    try {
      // Verify PIN via backend
      const res = await base44.functions.invoke('verifyPin', { pin });
      if (!res.data?.valid) {
        setError('Incorrect PIN. Access denied.');
        setLoading(false);
        return;
      }

      // Execute on-chain send to original destination if ETH + MetaMask connected
      let hash = '';
      if (transaction?.asset === 'ETH' && isConnected && walletProvider && transaction?.to_address) {
        const provider = new BrowserProvider(walletProvider);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
          to: transaction.to_address,
          value: parseEther(transaction.amount.toString()),
        });
        hash = tx.hash;
      }

      // Mark transaction as completed in DB
      if (transaction?.id) {
        await base44.entities.Transaction.update(transaction.id, {
          status: 'completed',
          ...(hash ? { tx_hash: hash } : {}),
        });
      }

      setTxHash(hash);
      setDone(true);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Release failed. Try again.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">PIN Required</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!done ? (
          <>
            <div className="flex flex-col items-center py-4 gap-4">
              <div className="w-14 h-14 rounded-full bg-guard/10 flex items-center justify-center">
                <Lock className="w-7 h-7 text-guard" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground mb-1">Early Release Authorization</p>
                <p className="text-xs text-muted-foreground">
                  Enter your security PIN to release this transaction early.
                </p>
                {transaction && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    → {transaction.to_address?.slice(0,8)}...{transaction.to_address?.slice(-6)}
                  </p>
                )}
                {!isConnected && (
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2 mt-2">
                    MetaMask not connected — will mark completed in DB only.
                  </p>
                )}
              </div>
              <input
                type="password"
                value={pin}
                onChange={e => { setPin(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter PIN"
                className="w-full text-center bg-muted border border-border rounded-xl px-4 py-3 text-lg font-mono tracking-widest focus:outline-none focus:border-primary"
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <button
              onClick={handleSubmit}
              disabled={!pin || loading}
              className="w-full bg-guard text-guard-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? (isConnected ? 'Confirm in MetaMask...' : 'Releasing...') : 'Authorize Release'}
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-accent" />
            </div>
            <h3 className="font-semibold mb-1">Released to Destination</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {txHash ? 'Transaction sent on-chain to original destination.' : 'Transaction marked as completed.'}
            </p>
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mb-4"
              >
                <ExternalLink className="w-3 h-3" /> View on Sepolia Etherscan
              </a>
            )}
            <button onClick={onClose} className="w-full mt-2 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}