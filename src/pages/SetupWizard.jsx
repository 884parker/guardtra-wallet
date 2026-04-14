import { useState, useEffect } from 'react';
import { Shield, Vault, Zap, ArrowRight, CheckCircle2, Loader2, Copy, Check, AlertTriangle, Eye, EyeOff, ShieldCheck, Delete } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { functions } from '@/api/db';

const isValidEthAddress = (addr) => /^0x[0-9a-fA-F]{40}$/.test(addr);

export default function SetupWizard({ onComplete }) {
  // Steps: welcome → safe-pin → safe-confirm → safe-creating → safe-backup → generating → main-backup → done
  const [step, setStep] = useState('welcome');
  const [error, setError] = useState('');

  // PauseSafe PIN state
  const [safePin, setSafePin] = useState('');
  const [safeConfirmPin, setSafeConfirmPin] = useState('');
  const [safePinError, setSafePinError] = useState('');

  // PauseSafe wallet result
  const [safeAddress, setSafeAddress] = useState('');
  const [safeSeedPhrase, setSafeSeedPhrase] = useState('');

  // Main wallet result
  const [walletData, setWalletData] = useState(null);

  // UI state
  const [copied, setCopied] = useState({});
  const [showSafePhrase, setShowSafePhrase] = useState(false);
  const [showMainPhrases, setShowMainPhrases] = useState(false);
  const [safeBackedUp, setSafeBackedUp] = useState(false);
  const [mainBackedUp, setMainBackedUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if Safe wallet already exists (e.g., user signed up on PauseSafe site previously)
  const [existingSafe, setExistingSafe] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  useEffect(() => {
    // Check for existing Safe wallet in shared Supabase DB
    base44.entities.UserWallet.list('-created_at', 1)
      .then(wallets => {
        if (wallets && wallets.length > 0 && wallets[0].address) {
          setExistingSafe(wallets[0].address);
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

  // ─── PIN Numpad Components ───
  const appendPin = (field, d) => {
    if (field === 'pin' && safePin.length < 6) setSafePin(p => p + d);
    if (field === 'confirm' && safeConfirmPin.length < 6) setSafeConfirmPin(p => p + d);
  };
  const deletePin = (field) => {
    if (field === 'pin') setSafePin(p => p.slice(0, -1));
    if (field === 'confirm') setSafeConfirmPin(p => p.slice(0, -1));
  };

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'];

  const Numpad = ({ field }) => (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mx-auto">
      {digits.map((d, i) => {
        if (d === '') return <div key={i} />;
        if (d === 'del') return (
          <button key={i} onClick={() => deletePin(field)}
            className="h-14 rounded-xl bg-secondary border border-border text-foreground flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all">
            <Delete className="w-5 h-5 text-muted-foreground" />
          </button>
        );
        return (
          <button key={i} onClick={() => appendPin(field, String(d))}
            className="h-14 rounded-xl bg-secondary border border-border text-foreground text-xl font-semibold hover:bg-secondary/80 active:scale-95 transition-all">
            {d}
          </button>
        );
      })}
    </div>
  );

  const PinDots = ({ value }) => (
    <div className="flex gap-4 justify-center">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
          i < value.length ? 'bg-emerald-400 border-emerald-400' : 'border-muted-foreground/40'
        }`} />
      ))}
    </div>
  );

  // ─── Create Safe Wallet ───
  const handleCreateSafe = async () => {
    if (safePin !== safeConfirmPin) {
      setSafePinError('PINs do not match');
      setSafeConfirmPin('');
      setStep('safe-pin');
      return;
    }
    setStep('safe-creating');
    setError('');
    try {
      const res = await functions.invoke('wallet', { action: 'create_wallet', pin: safePin });
      if (res?.data?.error) throw new Error(res.data.error);
      setSafeAddress(res?.data?.address || '');
      // Fetch the seed phrase immediately so user can back it up
      const seedRes = await functions.invoke('wallet', { action: 'get_seed_phrase', pin: safePin });
      setSafeSeedPhrase(seedRes?.data?.seed_phrase || seedRes?.data?.seedPhrase || '');
      setStep('safe-backup');
    } catch (err) {
      console.error('Safe wallet creation failed:', err);
      setError(err.message || 'Failed to create Safe wallet. Please try again.');
      setStep('safe-pin');
    }
  };

  // ─── Generate Main Wallets ───
  const handleGenerateWallets = async () => {
    setLoading(true);
    setError('');
    setStep('generating');

    const addr = existingSafe || safeAddress;

    try {
      // Save the Safe wallet address for the main wallet
      await base44.entities.AppConfig.create({ key: 'safe_wallet_address', value: addr });

      // Generate Vault, Hold, Liquidity wallets
      const res = await base44.functions.invoke('generateWallets', {});
      if (res.data?.error) throw new Error(res.data.error);

      setWalletData(res.data);
      setStep('main-backup');
    } catch (err) {
      setError(err.message || 'Failed to generate wallets');
      setStep('safe-backup');
    } finally {
      setLoading(false);
    }
  };

  // ─── Skip to main wallet generation (existing Safe) ───
  const handleSkipToMain = async () => {
    setLoading(true);
    setError('');
    setStep('generating');

    try {
      await base44.entities.AppConfig.create({ key: 'safe_wallet_address', value: existingSafe });
      const res = await base44.functions.invoke('generateWallets', {});
      if (res.data?.error) throw new Error(res.data.error);
      setWalletData(res.data);
      setStep('main-backup');
    } catch (err) {
      setError(err.message || 'Failed to generate wallets');
      setStep('welcome');
    } finally {
      setLoading(false);
    }
  };

  // ─── Progress indicator ───
  const stepOrder = existingSafe
    ? ['welcome', 'generating', 'main-backup', 'done']
    : ['welcome', 'safe-pin', 'safe-confirm', 'safe-creating', 'safe-backup', 'generating', 'main-backup', 'done'];
  const currentIdx = stepOrder.indexOf(step);
  const progressLabels = existingSafe
    ? ['Welcome', 'Generate', 'Backup', 'Done']
    : ['Welcome', 'PauseSafe', 'PauseSafe', 'PauseSafe', 'Safe Backup', 'Generate', 'Wallet Backup', 'Done'];

  const ProgressBar = () => {
    const stages = existingSafe
      ? [{ label: 'Welcome' }, { label: 'Generate' }, { label: 'Backup' }, { label: 'Done' }]
      : [{ label: 'Account' }, { label: 'PauseSafe' }, { label: 'Wallets' }, { label: 'Done' }];

    let activeStage;
    if (existingSafe) {
      activeStage = step === 'welcome' ? 0 : step === 'generating' ? 1 : step === 'main-backup' ? 2 : 3;
    } else {
      activeStage = step === 'welcome' ? 0
        : ['safe-pin', 'safe-confirm', 'safe-creating', 'safe-backup'].includes(step) ? 1
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
                {existingSafe
                  ? "We found your PauseSafe wallet! Let's generate your main wallets."
                  : "Let's set up your complete four-layer security system. This takes about 3 minutes."}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 w-full space-y-4 text-left">
              <h3 className="text-sm font-semibold text-foreground">Here's what we'll do:</h3>
              <div className="space-y-3">
                {existingSafe ? (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-400">PauseSafe — Already set up!</p>
                        <p className="text-xs text-muted-foreground font-mono">{existingSafe.slice(0, 10)}...{existingSafe.slice(-8)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Generate your wallets</p>
                        <p className="text-xs text-muted-foreground">We'll create your Vault, Hold, and Liquidity wallets.</p>
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
                        <p className="text-sm font-medium text-foreground">Create PauseSafe</p>
                        <p className="text-xs text-muted-foreground">Your emergency recovery wallet — set a PIN and back up the seed phrase.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-primary">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Generate your wallets</p>
                        <p className="text-xs text-muted-foreground">We'll create your Vault, Hold, and Liquidity wallets automatically.</p>
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
                  </>
                )}
              </div>
            </div>

            <button
              onClick={existingSafe ? handleSkipToMain : () => setStep('safe-pin')}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Let's Go <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════
            PAUSESAFE — SET PIN
            ═══════════════════════════════════════ */}
        {step === 'safe-pin' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Create Your PauseSafe Wallet</h1>
              <p className="text-muted-foreground text-sm">
                Choose a 6-digit PIN. You'll need it to access your Safe wallet and send funds from it.
              </p>
            </div>

            {safePinError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive w-full">
                {safePinError}
              </div>
            )}
            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive w-full">
                {error}
              </div>
            )}

            <PinDots value={safePin} />
            <Numpad field="pin" />

            <div className="flex gap-3 w-full">
              <button onClick={() => { setStep('welcome'); setSafePin(''); setSafePinError(''); setError(''); }} className="flex-1 border border-border text-muted-foreground rounded-xl py-3 text-sm hover:bg-secondary">Back</button>
              <button
                onClick={() => { setSafePinError(''); setStep('safe-confirm'); }}
                disabled={safePin.length !== 6}
                className="flex-[2] bg-emerald-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-emerald-700 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            PAUSESAFE — CONFIRM PIN
            ═══════════════════════════════════════ */}
        {step === 'safe-confirm' && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Confirm PIN</h1>
              <p className="text-muted-foreground text-sm">Re-enter your 6-digit PIN to confirm.</p>
            </div>

            {safePinError && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive w-full">
                {safePinError}
              </div>
            )}

            <PinDots value={safeConfirmPin} />
            <Numpad field="confirm" />

            <div className="flex gap-3 w-full">
              <button onClick={() => { setStep('safe-pin'); setSafeConfirmPin(''); setSafePinError(''); }} className="flex-1 border border-border text-muted-foreground rounded-xl py-3 text-sm hover:bg-secondary">Back</button>
              <button
                onClick={handleCreateSafe}
                disabled={safeConfirmPin.length !== 6}
                className="flex-[2] bg-emerald-600 text-white rounded-xl py-3 font-medium text-sm hover:bg-emerald-700 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              >
                Create Safe Wallet <ShieldCheck className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            PAUSESAFE — CREATING
            ═══════════════════════════════════════ */}
        {step === 'safe-creating' && (
          <div className="flex flex-col items-center gap-6 text-center py-12">
            <Loader2 className="w-12 h-12 text-green-400 animate-spin" />
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Creating PauseSafe Wallet</h1>
              <p className="text-muted-foreground text-sm">Generating your emergency recovery wallet...</p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            PAUSESAFE — BACKUP SEED PHRASE
            ═══════════════════════════════════════ */}
        {step === 'safe-backup' && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground mb-2">PauseSafe Created!</h1>
              <p className="text-muted-foreground text-sm">Back up your Safe wallet seed phrase before we continue.</p>
            </div>

            {/* Safe wallet address */}
            <div className="bg-card border border-green-500/30 rounded-xl p-4 w-full">
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">PauseSafe Address</p>
                  <button onClick={() => copy('safe-addr', safeAddress)} className="text-muted-foreground hover:text-foreground p-1">
                    {copied['safe-addr'] ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="font-mono text-xs text-foreground break-all leading-relaxed">{safeAddress}</p>
              </div>
            </div>

            {/* Safe seed phrase */}
            {safeSeedPhrase && (
              <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-4 w-full space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-destructive">PauseSafe Seed Phrase</h3>
                  <button onClick={() => setShowSafePhrase(!showSafePhrase)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    {showSafePhrase ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showSafePhrase ? 'Hide' : 'Reveal'}
                  </button>
                </div>

                {showSafePhrase ? (
                  <div className="bg-secondary/30 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-end mb-1">
                      <button onClick={() => copy('safe-phrase', safeSeedPhrase)} className="text-muted-foreground hover:text-foreground p-1">
                        {copied['safe-phrase'] ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-xs font-mono text-foreground leading-relaxed">{safeSeedPhrase}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">Click "Reveal" to see your seed phrase</p>
                )}

                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-400">
                    <strong>Write this down!</strong> Your PauseSafe seed phrase is your last line of defense.
                    You can also view it later in PauseSafe Settings.
                  </p>
                </div>
              </div>
            )}

            {/* Confirmation */}
            <label className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 w-full cursor-pointer">
              <input
                type="checkbox"
                checked={safeBackedUp}
                onChange={e => setSafeBackedUp(e.target.checked)}
                className="mt-0.5 accent-emerald-500"
              />
              <span className="text-sm text-foreground">I have saved my PauseSafe seed phrase in a secure location.</span>
            </label>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive w-full">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateWallets}
              disabled={!safeBackedUp || loading}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Continue — Generate Main Wallets <ArrowRight className="w-4 h-4" />
            </button>
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
              <p className="text-muted-foreground text-sm">Creating Vault, Hold, and Liquidity wallets...</p>
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

              {/* Show Safe address first */}
              <div className="flex items-center justify-between bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
                <div>
                  <span className="text-xs text-green-400 uppercase font-semibold">PauseSafe ✓</span>
                  <p className="text-xs font-mono text-foreground">{existingSafe || safeAddress}</p>
                </div>
                <button onClick={() => copy('safe', existingSafe || safeAddress)} className="text-muted-foreground hover:text-foreground p-1">
                  {copied['safe'] ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
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
                <h3 className="text-sm font-semibold text-destructive">Vault · Hold · Liquidity Recovery Phrases</h3>
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
                • PauseSafe seed phrase → <strong className="text-green-400">PauseSafe Settings</strong> (at safe.pausewallet.com)<br />
                • Vault, Hold, Liquidity phrases → <strong className="text-primary">Pause Wallet Settings</strong> (this app)
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
              <p className="text-muted-foreground text-sm">Your four-layer security system is active. Loading your dashboard...</p>
            </div>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

      </div>
    </div>
  );
}
