import { useState } from 'react';
import { X, AlertTriangle, Copy, CheckCircle, Lock, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SeedPhraseModal({ walletType, onClose }) {
  const [step, setStep] = useState('pin'); // pin | phrase
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handlePinSubmit = async () => {
    setLoading(true);
    setPinError('');
    try {
      const res = await base44.functions.invoke('getSeedPhrase', { walletType, pin });
      setMnemonic(res.data.mnemonic);
      setStep('phrase');
    } catch (err) {
      setPinError('Incorrect PIN. Please try again.');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const words = mnemonic ? mnemonic.split(' ') : [];
  const label = walletType.charAt(0).toUpperCase() + walletType.slice(1);

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold">Seed Phrase — {label}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'pin' && (
          <>
            <div className="flex flex-col items-center py-4 gap-4">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <Lock className="w-7 h-7 text-destructive" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground mb-1">Security Verification Required</p>
                <p className="text-xs text-muted-foreground">Enter your security PIN to access the seed phrase.</p>
              </div>
              <input
                type="password"
                value={pin}
                onChange={e => { setPin(e.target.value); setPinError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                placeholder="Enter PIN"
                className="w-full text-center bg-muted border border-border rounded-xl px-4 py-3 text-lg font-mono tracking-widest focus:outline-none focus:border-primary"
                autoFocus
              />
              {pinError && <p className="text-xs text-destructive">{pinError}</p>}
            </div>
            <button
              onClick={handlePinSubmit}
              disabled={!pin || loading}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {loading ? 'Verifying...' : 'Verify PIN'}
            </button>
          </>
        )}

        {step === 'phrase' && (
          <>
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">Never share your seed phrase. Anyone with these words can access your wallet. Write them down offline.</p>
            </div>

            {!revealed ? (
              <div className="relative">
                <div className="grid grid-cols-3 gap-2 filter blur-sm select-none">
                  {words.map((w, i) => (
                    <div key={i} className="bg-muted rounded-lg px-2 py-1.5 text-xs flex items-center gap-1">
                      <span className="text-muted-foreground w-4">{i + 1}.</span>
                      <span className="font-mono">{w}</span>
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <button onClick={() => setRevealed(true)} className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                    <Eye className="w-4 h-4" /> Reveal Phrase
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {words.map((w, i) => (
                    <div key={i} className="bg-muted rounded-lg px-2 py-1.5 text-xs flex items-center gap-1">
                      <span className="text-muted-foreground w-4">{i + 1}.</span>
                      <span className="font-mono text-foreground">{w}</span>
                    </div>
                  ))}
                </div>
                <button onClick={handleCopy} className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm mb-4 hover:bg-muted transition-colors text-muted-foreground">
                  {copied ? <><CheckCircle className="w-4 h-4 text-accent" />Copied</> : <><Copy className="w-4 h-4" />Copy to clipboard</>}
                </button>
              </>
            )}

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="rounded" />
              I have written down my seed phrase safely
            </label>
            <button disabled={!confirmed} onClick={onClose} className="w-full mt-3 bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}