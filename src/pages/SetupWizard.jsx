import { useState, useEffect } from 'react';
import { Shield, Vault, Zap, ArrowRight, CheckCircle2, Loader2, Copy, Check, AlertTriangle, Eye, EyeOff, ShieldCheck, Delete, LogOut, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { functions } from '@/api/db';
import { useAuth } from '@/lib/AuthContext';

const isValidEthAddress = (addr) => /^0x[0-9a-fA-F]{40}$/.test(addr);

export default function SetupWizard({ onComplete }) {
  const { logout } = useAuth();
  // Steps: welcome → recovery-address → generating → main-backup → done
  const [step, setStep] = useState('welcome');
  const [error, setError] = useState('');

  // Recovery address (from guardtrasafe.com)
  const [recoveryAddress, setRecoveryAddress] = useState('');
  const [addressError, setAddressError] = useState('');

  // Main wallet result
  const [walletData, setWalletData] = useState(null);

  // UI state
  const [copied, setCopied] = useState({});
  const [showMainPhrases, setShowMainPhrases] = useState(false);
  const [mainBackedUp, setMainBackedUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if Recovery wallet already exists (e.g., user signed up on guardtrasafe.com previously)
  const [existingRecovery, setExistingRecovery] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  useEffect(() => {
    // Check for existing Recovery wallet in shared Supabase DB
    base44.entities.UserWallet.list('-created_at', 1)
      .then(wallets => {
        if (wallets && wallets.length > 0 && wallets[0].address) {
          setExistingRecovery(wallets[0].address);
          setRecoveryAddress(wallets[0].address);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingExisting(false));
  }, []);

  const copy = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2000);
  };

  // ─── Generate Main Wallets ───
  const handleGenerateWallets = async () => {
    // Validate recovery address
    const addr = recoveryAddress.trim();
    if (!isValidEthAddress(addr)) {
      setAddressError('Please enter a valid Ethereum address (0x...)');
      return;
    }

    setLoading(true);
    setError('');
    setAddressError('');
    setStep('generating');

    try {
      // Save the Recovery wallet address for the main wallet
      await base44.entities.AppConfig.create({ key: 'safe_wallet_address', value: addr });

      // Generate Vault, Pause, Liquidity wallets
      const res = await base44.functions.invoke('generateWallets', {});
      if (res.data?.error) throw new Error(res.data.error);

      setWalletData(res.data);
      setStep('main-backup');
    } catch (err) {
      setError(err.message || 'Failed to generate wallets');
      setStep('recovery-address');
    } finally {
      setLoading(false);
    }
  };

  // ─── Progress indicator ───
  const ProgressBar = () => {
    const stages = existingRecovery
      ? [{ label: 'Welcome' }, { label: 'Generate' }, { label: 'Backup' }, { label: 'Done' }]
      : [{ label: 'Welcome' }, { label: 'Recovery' }, { label: 'Generate' }, { label: 'Done' }];

    let activeStage;
    if (existingRecovery) {
      activeStage = step === 'welcome' ? 0 : step === 'generating' ? 1 : step === 'main-backup' ? 2 : 3;
    } else {
      activeStage = step === 'welcome' ? 0
        : step === 'recovery-address' ? 1
        : ['generating', 'main-backup'].includes(step) ? 2
        : 3;
    }

    return (
      <div className="flex items-center gap-1 w-full max-w-md mx-auto mb-6">
        {stages.map((s, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-1.5 w-full rounded-full transition-all ${
              i <= activeStage ? 'bg-primary' : 'bg-border'
            }`} />
            <span className={`text-[0.6rem] font-medium uppercase tracking-wider ${
              i <= activeStage ? 'text-primary' : 'text-muted-foreground'
            }`}>{s.label}</span>
          </div>
        ))}
      </div>
    );
  };

  if (checkingExisting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Checking your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Exit button */}
        {step !== 'done' && step !== 'generating' && (
          <div className="flex justify-end">
            <button
              onClick={async () => { await logout(); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
            >
              <LogOut className="w-3.5 h-3.5" />
              Exit Setup
            </button>
          </div>
        )}
        <ProgressBar />

        {/* ═══════════════════════════════════════
            WELCOME
            ═══════════════════════════════════════ */}
        {step === 'welcome' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to Pause Wallet</h1>
              <p className="text-muted-foreground">
                {existingRecovery
                  ? "We found your Recovery wallet! Let's generate your main wallets."
                  : "Let's set up your three-wallet security system. First, you'll need your Recovery wallet."}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 w-full space-y-4 text-left">
              <h3 className="text-sm font-semibold text-foreground">How Pause Wallet Works:</h3>
              <div className="space-y-3">
                {existingRecovery ? (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-400">Recovery Wallet — Connected!</p>
                        <p className="text-xs text-muted-foreground font-mono">{existingRecovery.slice(0, 10)}...{existingRecovery.slice(-8)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Generate your wallets</p>
                        <p className="text-xs text-muted-foreground">We'll create your Vault, Pause, and Liquidity wallets.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-amber-400">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Back up your recovery phrases</p>
                        <p className="text-xs text-muted-foreground">Save them somewhere safe. They won't be shown again.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-green-400">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Install Recovery Wallet</p>
                        <p className="text-xs text-muted-foreground">
                          Your Recovery wallet is a separate, standalone app. It's your safety net — completely isolated from this app.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Link your Recovery address</p>
                        <p className="text-xs text-muted-foreground">Enter or paste the address from your Recovery wallet so revoked funds route there.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-amber-400">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Generate & back up wallets</p>
                        <p className="text-xs text-muted-foreground">We'll create your Vault, Pause, and Liquidity wallets automatically.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Security explainer */}
            {!existingRecovery && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 w-full">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-foreground font-medium mb-1">Why is Recovery separate?</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      If someone compromises this app, they get your Vault, Pause, and Liquidity wallets — but your Recovery wallet
                      lives in a completely separate app they can't touch. When you revoke a suspicious transaction, funds go to your
                      Recovery wallet where they're safe.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={existingRecovery ? handleGenerateWallets : () => setStep('recovery-address')}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {existingRecovery ? "Generate My Wallets" : "Let's Go"} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════
            RECOVERY ADDRESS INPUT
            ═══════════════════════════════════════ */}
        {step === 'recovery-address' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Link Your Recovery Wallet</h1>
              <p className="text-muted-foreground text-sm">
                Enter the address from your Recovery wallet at guardtrasafe.com. This is where revoked funds will be sent.
              </p>
            </div>

            {/* Link to install Recovery wallet */}
            <a
              href="https://guardtrasafe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 w-full text-sm text-green-400 hover:bg-green-500/20 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="font-medium">Don't have one yet? Install Recovery Wallet</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto" />
            </a>

            {/* Address input */}
            <div className="w-full space-y-2">
              <label className="text-xs text-muted-foreground text-left block">Recovery Wallet Address</label>
              <input
                type="text"
                value={recoveryAddress}
                onChange={e => { setRecoveryAddress(e.target.value); setAddressError(''); }}
                placeholder="0x..."
                className="w-full bg-muted border border-border rounded-lg px-3 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-green-500"
              />
              {addressError && (
                <p className="text-xs text-destructive text-left">{addressError}</p>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive w-full">
                {error}
              </div>
            )}

            {/* Info */}
            <div className="bg-card border border-border rounded-xl p-4 w-full text-left">
              <h3 className="text-xs font-semibold text-foreground mb-2">How to get your Recovery address:</h3>
              <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                <li>Go to <strong className="text-green-400">guardtrasafe.com</strong> and sign up</li>
                <li>Set your PIN and create your Recovery wallet</li>
                <li>Copy the wallet address and paste it here</li>
              </ol>
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={() => { setStep('welcome'); setAddressError(''); setError(''); }} className="flex-1 border border-border text-muted-foreground rounded-xl py-3 text-sm hover:bg-secondary">Back</button>
              <button
                onClick={handleGenerateWallets}
                disabled={!recoveryAddress.trim() || loading}
                className="flex-[2] bg-primary text-primary-foreground rounded-xl py-3 font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            GENERATING MAIN WALLETS
            ═══════════════════════════════════════ */}
        {step === 'generating' && (
          <div className="flex flex-col items-center gap-6 text-center py-12">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Generating Your Wallets</h1>
              <p className="text-muted-foreground text-sm">Creating Vault, Pause, and Liquidity wallets...</p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            MAIN WALLET BACKUP
            ═══════════════════════════════════════ */}
        {step === 'main-backup' && walletData && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground mb-2">Save Your Recovery Phrases</h1>
              <p className="text-muted-foreground text-sm">Write these down or save them somewhere secure. <strong className="text-destructive">They will NOT be shown again.</strong></p>
            </div>

            {/* Wallet addresses */}
            <div className="bg-card border border-border rounded-xl p-4 w-full space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Your Wallet Addresses</h3>

              {/* Show Recovery address first */}
              <div className="flex items-center justify-between bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
                <div>
                  <span className="text-xs text-green-400 uppercase font-semibold">Recovery ✓</span>
                  <p className="text-xs font-mono text-foreground">{recoveryAddress}</p>
                </div>
                <button onClick={() => copy('recovery', recoveryAddress)} className="text-muted-foreground hover:text-foreground p-1">
                  {copied['recovery'] ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

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
                <h3 className="text-sm font-semibold text-destructive">Vault · Pause · Liquidity Recovery Phrases</h3>
                <button onClick={() => setShowMainPhrases(!showMainPhrases)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  {showMainPhrases ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showMainPhrases ? 'Hide' : 'Reveal'}
                </button>
              </div>

              {showMainPhrases ? (
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

            {/* Info box */}
            <div className="bg-card border border-border rounded-xl p-4 w-full">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">💡 Where to find seed phrases later:</strong><br />
                • Recovery wallet seed phrase → <strong className="text-green-400">guardtrasafe.com</strong> (separate app)<br />
                • Vault, Pause, Liquidity phrases → <strong className="text-primary">Settings</strong> (this app)
              </p>
            </div>

            {/* Confirmation checkbox */}
            <label className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 w-full cursor-pointer">
              <input
                type="checkbox"
                checked={mainBackedUp}
                onChange={e => setMainBackedUp(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <span className="text-sm text-foreground">I have saved all my recovery phrases in a secure location. I understand they will not be shown again.</span>
            </label>

            <button
              onClick={() => { setStep('done'); setTimeout(() => onComplete(), 1500); }}
              disabled={!mainBackedUp}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> I'm All Set — Open My Wallet
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════
            DONE
            ═══════════════════════════════════════ */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-6 text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">You're All Set!</h1>
              <p className="text-muted-foreground text-sm">Your three-wallet security system is active. Loading your dashboard...</p>
            </div>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

      </div>
    </div>
  );
}
