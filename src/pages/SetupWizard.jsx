import { useState, useEffect } from 'react';
import { Shield, Vault, Zap, ArrowRight, CheckCircle2, Loader2, Copy, Check, AlertTriangle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const isValidEthAddress = (addr) => /^0x[0-9a-fA-F]{40}$/.test(addr);

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState('welcome'); // welcome | safe-address | generating | backup | done
  const [safeAddress, setSafeAddress] = useState('');
  const [addressError, setAddressError] = useState('');
  const [autoDetected, setAutoDetected] = useState(false);
  const [detectingAddress, setDetectingAddress] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState({});
  const [showPhrases, setShowPhrases] = useState(false);
  const [backedUp, setBackedUp] = useState(false);

  // Auto-detect Safe wallet address from shared Supabase database
  useEffect(() => {
    if (step === 'safe-address' && !safeAddress && !autoDetected) {
      setDetectingAddress(true);
      base44.entities.UserWallet.list('-created_at', 1)
        .then(wallets => {
          if (wallets && wallets.length > 0 && wallets[0].address) {
            setSafeAddress(wallets[0].address);
            setAutoDetected(true);
          }
        })
        .catch(() => {})
        .finally(() => setDetectingAddress(false));
    }
  }, [step]);

  const copy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
  };

  const handleGenerateWallets = async () => {
    if (!isValidEthAddress(safeAddress)) {
      setAddressError('Please enter a valid Ethereum address');
      return;
    }

    setLoading(true);
    setError('');
    setStep('generating');

    try {
      // Save the Safe wallet address first
      await base44.entities.AppConfig.create({ key: 'safe_wallet_address', value: safeAddress });

      // Generate wallets
      const res = await base44.functions.invoke('generateWallets', {});
      if (res.data?.error) throw new Error(res.data.error);

      setWalletData(res.data);
      setStep('backup');
    } catch (err) {
      setError(err.message || 'Failed to generate wallets');
      setStep('safe-address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">

        {/* ─── Welcome ─── */}
        {step === 'welcome' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to Guardtra</h1>
              <p className="text-muted-foreground">Let's set up your three-layer security system. This takes about 2 minutes.</p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 w-full space-y-4 text-left">
              <h3 className="text-sm font-semibold text-foreground">Here's what we'll do:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-green-400">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Set up GuardtraSafe first</p>
                    <p className="text-xs text-muted-foreground">Your emergency recovery wallet — set this up at guardtrasafe.com, then paste the address here.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Generate your wallets</p>
                    <p className="text-xs text-muted-foreground">We'll create your Vault, Guard, and Liquidity wallets automatically.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-amber-400">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Back up your recovery phrases</p>
                    <p className="text-xs text-muted-foreground">Save them somewhere safe. They won't be shown again.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('safe-address')}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Let's Go <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── Safe Address ─── */}
        {step === 'safe-address' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Step 1: Enter Your GuardtraSafe Address</h1>
              <p className="text-muted-foreground text-sm">
                Go to <a href="https://guardtrasafe.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">guardtrasafe.com</a>, create your Safe wallet, then paste the address below.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 w-full space-y-4 text-left">
              {autoDetected ? (
                <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <ShieldCheck className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-green-400">
                    <strong>Safe wallet detected!</strong> We found your GuardtraSafe wallet automatically. When you revoke a suspicious transaction, your funds will be routed here instantly.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-400">
                    <strong>Why Safe first?</strong> When you revoke a suspicious transaction, your funds need somewhere safe to go. Without this address, revoked funds have no destination.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1.5">
                  GuardtraSafe Wallet Address
                  {autoDetected && <span className="text-green-400 ml-2 normal-case">✓ Auto-detected</span>}
                </label>
                {detectingAddress ? (
                  <div className="w-full border border-border rounded-xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Checking for your Safe wallet...</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={safeAddress}
                    onChange={e => {
                      setSafeAddress(e.target.value);
                      setAutoDetected(false);
                      setAddressError(e.target.value && !isValidEthAddress(e.target.value) ? 'Invalid Ethereum address' : '');
                    }}
                    placeholder="0x..."
                    style={{ color: '#f0f0f0', backgroundColor: '#1a1a2e' }}
                    className={`w-full border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary ${autoDetected ? 'border-green-500/50' : addressError ? 'border-destructive' : 'border-border'}`}
                  />
                )}
                {addressError && <p className="text-xs text-destructive mt-1">{addressError}</p>}
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive w-full">
                {error}
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button onClick={() => setStep('welcome')} className="flex-1 border border-border text-muted-foreground rounded-xl py-3 text-sm hover:bg-secondary">Back</button>
              <button
                onClick={handleGenerateWallets}
                disabled={!safeAddress || !isValidEthAddress(safeAddress) || loading}
                className="flex-[2] bg-primary text-primary-foreground rounded-xl py-3 font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              >
                Generate My Wallets <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── Generating ─── */}
        {step === 'generating' && (
          <div className="flex flex-col items-center gap-6 text-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Generating Your Wallets</h1>
              <p className="text-muted-foreground text-sm">Creating Vault, Guard, and Liquidity wallets...</p>
            </div>
          </div>
        )}

        {/* ─── Backup ─── */}
        {step === 'backup' && walletData && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground mb-2">Step 2: Save Your Recovery Phrases</h1>
              <p className="text-muted-foreground text-sm">Write these down or save them somewhere secure. <strong className="text-destructive">They will NOT be shown again.</strong></p>
            </div>

            {/* Wallet addresses */}
            <div className="bg-card border border-border rounded-xl p-4 w-full space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Your Wallet Addresses</h3>
              {Object.entries(walletData.wallets).map(([type, address]) => (
                <div key={type} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase">{type}</span>
                    <p className="text-xs font-mono text-foreground">{address}</p>
                  </div>
                  <button onClick={() => copy(type, address)} className="text-muted-foreground hover:text-foreground p-1">
                    {copied[type] ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>

            {/* Recovery phrases */}
            <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-4 w-full space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-destructive">Recovery Phrases</h3>
                <button onClick={() => setShowPhrases(!showPhrases)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  {showPhrases ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPhrases ? 'Hide' : 'Reveal'}
                </button>
              </div>

              {showPhrases ? (
                Object.entries(walletData.backup).map(([type, phrase]) => (
                  <div key={type} className="bg-secondary/30 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground uppercase">{type}</span>
                      <button onClick={() => copy(`phrase-${type}`, phrase)} className="text-muted-foreground hover:text-foreground p-1">
                        {copied[`phrase-${type}`] ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-xs font-mono text-foreground leading-relaxed">{phrase}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Click "Reveal" to see your recovery phrases</p>
              )}
            </div>

            {/* Confirmation checkbox */}
            <label className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 w-full cursor-pointer">
              <input
                type="checkbox"
                checked={backedUp}
                onChange={e => setBackedUp(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-sm text-foreground">I have saved my recovery phrases in a secure location. I understand they will not be shown again.</span>
            </label>

            <button
              onClick={() => { setStep('done'); setTimeout(() => onComplete(), 1500); }}
              disabled={!backedUp}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> I'm All Set — Open My Wallet
            </button>
          </div>
        )}

        {/* ─── Done ─── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-6 text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">You're All Set!</h1>
              <p className="text-muted-foreground text-sm">Your three-layer security system is active. Loading your dashboard...</p>
            </div>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

      </div>
    </div>
  );
}
