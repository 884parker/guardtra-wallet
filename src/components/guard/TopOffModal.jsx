import { useState, useEffect } from 'react';
import { X, Fuel, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const FULL_TANK = 0.05; // ETH — enough for ~15+ transactions

// Fetch Pause wallet address
function useGuardAddress() {
  const [addr, setAddr] = useState('');
  useEffect(() => {
    base44.entities.WalletProfile.filter({ wallet_type: 'guard' })
      .then(p => { if (p[0]?.address) setAddr(p[0].address); })
      .catch(() => {});
  }, []);
  return addr;
}

const PRESETS = [
  { label: '$5 worth', emoji: '⛽', desc: 'A splash — gets you a few transactions', factor: null, usd: 5 },
  { label: 'Half tank', emoji: '🔋', desc: 'Good for a week of normal use', factor: 0.5 },
  { label: 'Full tank', emoji: '⛽🔥', desc: 'Topped off and ready to go', factor: 1.0 },
];

export default function TopOffModal({ currentGas, vaultBalance, ethPrice, onClose, onComplete }) {
  const [step, setStep] = useState('choose'); // choose | confirm | sending | done | error
  const [amount, setAmount] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const guardAddress = useGuardAddress();

  const gasNeededForFull = Math.max(0, FULL_TANK - currentGas);
  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum * (ethPrice || 2450);
  const afterTopOff = currentGas + amountNum;
  const fillPercent = Math.min(100, (afterTopOff / FULL_TANK) * 100);

  const selectPreset = (preset) => {
    let eth;
    if (preset.usd) {
      eth = preset.usd / (ethPrice || 2450);
    } else {
      eth = gasNeededForFull * preset.factor;
    }
    // Don't exceed vault balance (leave some for gas on the transfer itself)
    eth = Math.min(eth, Math.max(0, vaultBalance - 0.003));
    eth = Math.max(0, eth);
    setAmount(eth.toFixed(6));
    setCustomMode(false);
  };

  const handleSend = async () => {
    if (amountNum <= 0) return;
    setStep('sending');
    setError('');

    try {
      if (!guardAddress) throw new Error('Pause wallet address not found');

      // Send from Vault directly to Guard — gas top-off, no held transaction record
      const res = await base44.functions.invoke('sendTransaction', {
        walletType: 'vault',
        toAddress: guardAddress,
        amountEth: amount,
      });

      if (res.data?.error) throw new Error(res.data.error);

      setTxHash(res.data?.txHash || '');
      setStep('done');
      onComplete?.();
    } catch (err) {
      setError(err.message || 'Transfer failed');
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-guard" />
            <h2 className="font-semibold text-foreground">Top Off Gas Tank</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'choose' && (
          <>
            {/* Gas station analogy */}
            <div className="bg-guard/5 border border-guard/20 rounded-xl p-4 mb-4">
              <p className="text-sm text-foreground font-medium mb-1">⛽ Think of it like your car</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every transaction needs gas to run on the blockchain. Some people keep a full tank, 
                some put in what they need. Top off your Pause wallet so transactions never stall.
              </p>
            </div>

            {/* Current gauge */}
            <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Current gas reserve</p>
                <p className="text-lg font-bold font-mono text-foreground">{currentGas.toFixed(4)} <span className="text-sm text-muted-foreground">ETH</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Vault balance</p>
                <p className="text-sm font-medium text-vault">{vaultBalance.toFixed(4)} ETH</p>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-2 mb-4">
              {PRESETS.map((preset, i) => {
                let ethAmount;
                if (preset.usd) {
                  ethAmount = preset.usd / (ethPrice || 2450);
                } else {
                  ethAmount = gasNeededForFull * preset.factor;
                }
                ethAmount = Math.min(ethAmount, Math.max(0, vaultBalance - 0.003));
                const disabled = ethAmount <= 0 || vaultBalance < 0.003;

                return (
                  <button
                    key={i}
                    onClick={() => selectPreset(preset)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      disabled 
                        ? 'opacity-40 cursor-not-allowed border-border' 
                        : 'border-border hover:border-guard/40 hover:bg-guard/5'
                    }`}
                  >
                    <span className="text-xl">{preset.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{preset.label}</p>
                      <p className="text-xs text-muted-foreground">{preset.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-guard">{ethAmount.toFixed(4)}</p>
                      <p className="text-xs text-muted-foreground">ETH</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom amount */}
            {customMode ? (
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1 block">Custom amount (ETH)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.01"
                  step="0.001"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-guard"
                />
                {amountNum > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">≈ ${usdValue.toFixed(2)} · Tank will be at {fillPercent.toFixed(0)}%</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setCustomMode(true)}
                className="w-full text-center text-xs text-muted-foreground hover:text-guard mb-4 py-1"
              >
                Or enter a custom amount →
              </button>
            )}

            {/* Confirm */}
            {amountNum > 0 && (
              <button
                onClick={() => setStep('confirm')}
                className="w-full bg-guard text-guard-foreground rounded-xl py-3 font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Top Off — {parseFloat(amount).toFixed(4)} ETH
              </button>
            )}

            {vaultBalance < 0.003 && (
              <p className="text-xs text-destructive text-center mt-3">Vault balance too low to top off gas.</p>
            )}
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="bg-muted rounded-xl p-4 space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">From</span>
                <span className="text-vault font-medium">Vault Wallet</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">To</span>
                <span className="text-guard font-medium">Pause Gas Tank</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono font-medium">{parseFloat(amount).toFixed(4)} ETH</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Value</span>
                <span>≈ ${usdValue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tank after</span>
                <span className={fillPercent >= 50 ? 'text-emerald-400' : fillPercent >= 25 ? 'text-amber-400' : 'text-red-400'}>
                  {fillPercent.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-guard/10 border border-guard/30 rounded-xl p-3 mb-4">
              <Fuel className="w-4 h-4 text-guard mt-0.5 flex-shrink-0" />
              <p className="text-xs text-guard">Gas top-offs transfer directly to Pause — no time lock, no delay. Funds are immediately available for transaction fees.</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('choose')} className="flex-1 border border-border text-muted-foreground rounded-xl py-3 text-sm hover:bg-muted">
                Back
              </button>
              <button onClick={handleSend} className="flex-1 bg-guard text-guard-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90">
                Confirm Top Off
              </button>
            </div>
          </>
        )}

        {step === 'sending' && (
          <div className="text-center py-10">
            <Loader2 className="w-10 h-10 animate-spin text-guard mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground">Filling up the tank...</p>
            <p className="text-xs text-muted-foreground mt-1">Transferring from Vault to Pause. ~15 seconds.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-guard/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-guard" />
            </div>
            <h3 className="font-semibold mb-1">Tank Topped Off! ⛽</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {parseFloat(amount).toFixed(4)} ETH added to your gas reserve. You're good to go.
            </p>
            <button onClick={onClose} className="w-full bg-guard text-guard-foreground rounded-xl py-3 text-sm font-medium">
              Done
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h3 className="font-semibold mb-1">Top Off Failed</h3>
            <p className="text-sm text-destructive mb-4">{error}</p>
            <div className="flex gap-2">
              <button onClick={() => setStep('choose')} className="flex-1 border border-border text-muted-foreground rounded-xl py-3 text-sm hover:bg-muted">
                Try Again
              </button>
              <button onClick={onClose} className="flex-1 bg-muted text-foreground rounded-xl py-3 text-sm">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
