import { useState, useEffect } from 'react';
import { Shield, Bell, Lock, ChevronRight, Wifi, Eye, KeyRound, Save, AlertTriangle, Clock, Globe, Loader2 } from 'lucide-react';

const isValidEthAddress = (addr) => /^0x[0-9a-fA-F]{40}$/.test(addr);
import SeedPhraseModal from '@/components/wallet/SeedPhraseModal';
import SetPinModal from '@/components/settings/SetPinModal';
import AlertRulesManager from '@/components/alerts/AlertRulesManager';
import AlertLogViewer from '@/components/alerts/AlertLogViewer';
import { base44 } from '@/api/base44Client';
import { functions } from '@/api/db';

const LOCK_OPTIONS = [
  { value: 6,  label: '6 hours',  desc: 'Faster releases, moderate protection' },
  { value: 12, label: '12 hours', desc: 'Balanced speed and security' },
  { value: 24, label: '24 hours', desc: 'Maximum protection (recommended)' },
];

export default function Settings() {
  // ─── PIN gate: must verify PIN before accessing Settings ───
  const [pinVerified, setPinVerified] = useState(false);
  const [gatePin, setGatePin] = useState('');
  const [gatePinError, setGatePinError] = useState('');
  const [gatePinLoading, setGatePinLoading] = useState(false);
  const [gateAttempts, setGateAttempts] = useState(0);
  const [gateLocked, setGateLocked] = useState(false);
  const [gateLockTimer, setGateLockTimer] = useState(0);
  const GATE_MAX_ATTEMPTS = 5;
  const GATE_LOCKOUT_SECONDS = 60;

  const [seedWallet, setSeedWallet] = useState(null);
  const [pinExists, setPinExists] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [notifications, setNotifications] = useState({ vaultAlert: true, guardRelease: true, email: false });
  const [safeWalletAddress, setsafeWalletAddress] = useState('');
  const [safeWalletConfigId, setsafeWalletConfigId] = useState(null);
  const [safeWalletSaving, setSafeWalletSaving] = useState(false);
  const [safeWalletSaved, setSafeWalletSaved] = useState(false);

  // Guard lock time
  const [lockHours, setLockHours] = useState(24);
  const [lockConfigId, setLockConfigId] = useState(null);
  const [lockSaving, setLockSaving] = useState(false);
  const [lockSaved, setLockSaved] = useState(false);

  // Network
  const [activeNetwork, setActiveNetwork] = useState('sepolia');
  const [networkConfigId, setNetworkConfigId] = useState(null);
  const [networkSaving, setNetworkSaving] = useState(false);
  const [networkSaved, setNetworkSaved] = useState(false);

  useEffect(() => {
    // Check if PIN exists by probing the wallet endpoint
    // If user_wallets has a record, they have a PIN (it's required during Safe wallet creation)
    base44.entities.UserWallet.list('-created_at', 1)
      .then(res => setPinExists(res && res.length > 0 && !!res[0].pin_hash))
      .catch(() => {});
    base44.entities.AppConfig.filter({ key: 'safe_wallet_address' })
      .then(res => {
        if (res[0]) { setsafeWalletAddress(res[0].value); setsafeWalletConfigId(res[0].id); }
      })
      .catch(() => {});
    base44.entities.AppConfig.filter({ key: 'guard_lock_hours' })
      .then(res => {
        if (res[0]) { setLockHours(parseInt(res[0].value) || 24); setLockConfigId(res[0].id); }
      })
      .catch(() => {});
    base44.entities.AppConfig.filter({ key: 'active_network' })
      .then(res => {
        if (res[0]) { setActiveNetwork(res[0].value || 'sepolia'); setNetworkConfigId(res[0].id); }
      })
      .catch(() => {});
  }, []);

  const saveNetwork = async (networkId) => {
    setActiveNetwork(networkId);
    setNetworkSaving(true);
    if (networkConfigId) {
      await base44.entities.AppConfig.update(networkConfigId, { value: networkId });
    } else {
      const rec = await base44.entities.AppConfig.create({ key: 'active_network', value: networkId });
      setNetworkConfigId(rec.id);
    }
    setNetworkSaving(false);
    setNetworkSaved(true);
    setTimeout(() => setNetworkSaved(false), 2000);
  };

  const saveLockHours = async (hours) => {
    setLockHours(hours);
    setLockSaving(true);
    if (lockConfigId) {
      await base44.entities.AppConfig.update(lockConfigId, { value: String(hours) });
    } else {
      const rec = await base44.entities.AppConfig.create({ key: 'guard_lock_hours', value: String(hours) });
      setLockConfigId(rec.id);
    }
    setLockSaving(false);
    setLockSaved(true);
    setTimeout(() => setLockSaved(false), 2000);
  };

  const savesafeWalletAddress = async () => {
    setSafeWalletSaving(true);
    if (safeWalletConfigId) {
      await base44.entities.AppConfig.update(safeWalletConfigId, { value: safeWalletAddress });
    } else {
      const rec = await base44.entities.AppConfig.create({ key: 'safe_wallet_address', value: safeWalletAddress });
      setsafeWalletConfigId(rec.id);
    }
    setSafeWalletSaving(false);
    setSafeWalletSaved(true);
    setTimeout(() => setSafeWalletSaved(false), 2000);
  };

  // Gate lockout countdown
  useEffect(() => {
    if (!gateLocked) return;
    const interval = setInterval(() => {
      setGateLockTimer(prev => {
        if (prev <= 1) { setGateLocked(false); setGateAttempts(0); clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gateLocked]);

  // Auto-submit gate PIN when 6 digits entered
  useEffect(() => {
    if (gatePin.length === 6 && !gatePinLoading && !gateLocked) verifyGatePin(gatePin);
  }, [gatePin]);

  const verifyGatePin = async (enteredPin) => {
    setGatePinLoading(true);
    setGatePinError('');
    try {
      const res = await functions.invoke('wallet', { action: 'verify_pin', pin: enteredPin });
      if (res.data?.valid) {
        setPinVerified(true);
      } else {
        const newAttempts = gateAttempts + 1;
        setGateAttempts(newAttempts);
        setGatePin('');
        if (newAttempts >= GATE_MAX_ATTEMPTS) {
          setGateLocked(true);
          setGateLockTimer(GATE_LOCKOUT_SECONDS);
          setGatePinError(`Too many attempts. Locked for ${GATE_LOCKOUT_SECONDS} seconds.`);
        } else {
          setGatePinError(`Wrong PIN. ${GATE_MAX_ATTEMPTS - newAttempts} attempts remaining.`);
        }
      }
    } catch {
      setGatePin('');
      setGatePinError('Verification failed. Try again.');
    } finally {
      setGatePinLoading(false);
    }
  };

  const toggle = (key) => setNotifications(n => ({ ...n, [key]: !n[key] }));

  // ─── PIN gate screen ───
  if (!pinVerified) {
    const gateDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'];
    return (
      <div className="md:ml-56 flex items-center justify-center min-h-[80vh] px-4">
        <div className="w-full max-w-sm flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Settings Locked</h1>
            <p className="text-sm text-muted-foreground">Enter your PIN to access settings</p>
          </div>

          {/* PIN dots */}
          <div className="flex gap-4 justify-center">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  i < gatePin.length
                    ? gatePinError ? 'bg-destructive border-destructive' : 'bg-primary border-primary'
                    : 'border-muted-foreground/40'
                }`}
              />
            ))}
          </div>

          {gatePinLoading && <Loader2 className="w-5 h-5 text-primary animate-spin" />}

          {gatePinError && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2 w-full">
              <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-xs text-destructive">{gatePinError}</p>
            </div>
          )}

          {gateLocked && (
            <p className="text-sm text-muted-foreground">
              Try again in <span className="font-mono font-bold text-foreground">{gateLockTimer}s</span>
            </p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
            {gateDigits.map((d, i) => {
              if (d === '') return <div key={i} />;
              if (d === 'del') return (
                <button
                  key={i}
                  onClick={() => { if (!gatePinLoading && !gateLocked) setGatePin(prev => prev.slice(0, -1)); }}
                  disabled={gatePinLoading || gateLocked}
                  className="h-14 rounded-xl bg-secondary border border-border text-foreground flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all disabled:opacity-30"
                >
                  ←
                </button>
              );
              return (
                <button
                  key={i}
                  onClick={() => { if (gatePin.length < 6 && !gatePinLoading && !gateLocked) { setGatePin(prev => prev + String(d)); setGatePinError(''); } }}
                  disabled={gatePinLoading || gateLocked}
                  className="h-14 rounded-xl bg-secondary border border-border text-foreground text-xl font-semibold hover:bg-secondary/80 active:scale-95 transition-all disabled:opacity-30"
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="md:ml-56 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your security preferences and wallet settings.</p>
      </div>

      {/* Wallet Setup */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Wallet Setup</h2>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Safe Wallet Address</label>
            <p className="text-xs text-muted-foreground mb-2">Your Safe recovery wallet address. Revoked transactions are automatically routed here for safekeeping.</p>
            <div className="flex gap-2">
              <input
                value={safeWalletAddress}
                onChange={e => { setsafeWalletAddress(e.target.value); setSafeWalletSaved(false); }}
                placeholder="0x..."
                className="flex-1 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={savesafeWalletAddress}
                disabled={!safeWalletAddress || safeWalletSaving || !isValidEthAddress(safeWalletAddress)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                {safeWalletSaving ? 'Saving...' : safeWalletSaved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Guard Lock Time */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Guard Time Lock</h2>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-guard mt-0.5 flex-shrink-0" />
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Lock Duration</label>
              <p className="text-xs text-muted-foreground mb-3">How long Vault transactions are held in Guard before auto-releasing. Longer = more time to catch problems.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LOCK_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => saveLockHours(opt.value)}
                disabled={lockSaving}
                className={`relative p-3 rounded-xl border text-center transition-all ${
                  lockHours === opt.value
                    ? 'border-guard bg-guard/10 text-guard'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-guard/50 hover:bg-guard/5'
                }`}
              >
                <div className="text-lg font-bold">{opt.value}h</div>
                <div className="text-xs mt-0.5">{opt.value === lockHours ? '✓ Active' : opt.label}</div>
              </button>
            ))}
          </div>
          {lockSaved && <p className="text-xs text-accent text-center">Lock time updated!</p>}
          <p className="text-xs text-muted-foreground text-center">
            {lockHours === 6  && 'Faster releases — good for active traders who keep most funds in Liquidity.'}
            {lockHours === 12 && 'Balanced protection — enough time to catch most unauthorized activity.'}
            {lockHours === 24 && 'Maximum protection — the full day gives you the most time to react to threats.'}
          </p>
        </div>
      </div>

      {/* Security */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Security</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <button onClick={() => setShowPinModal(true)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <KeyRound className="w-4 h-4 text-primary" />
              <div className="text-left">
                <div className="text-sm text-foreground">Security PIN</div>
                <div className="text-xs text-muted-foreground">{pinExists ? 'Change your 6-digit unlock PIN' : 'Set a PIN to secure your wallet'}</div>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${pinExists ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}>
              {pinExists ? 'Active' : 'Not set'}
            </span>
          </button>
          {[
            { wallet: 'vault', label: 'Vault Wallet Seed', icon: Shield, color: 'text-vault' },
            { wallet: 'guard', label: 'Pause Wallet Seed', icon: Lock, color: 'text-guard' },
            { wallet: 'liquidity', label: 'Liquidity Wallet Seed', icon: Eye, color: 'text-liquidity' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.wallet}
                onClick={() => setSeedWallet(item.wallet)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Notifications</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {[
            { key: 'vaultAlert', label: 'Vault transaction alerts', desc: 'Instant alert when Vault sends' },
            { key: 'guardRelease', label: 'Pause release reminders', desc: 'Notify before release' },
            { key: 'email', label: 'Email notifications', desc: 'Backup alert via email' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="text-sm text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`w-11 h-6 rounded-full transition-colors relative ${notifications[item.key] ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifications[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Network */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Network</h2>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Active Network</label>
              <p className="text-xs text-muted-foreground mb-3">Choose which Ethereum network your wallets operate on. Use Sepolia for testing, Mainnet for real transactions.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => saveNetwork('sepolia')}
              disabled={networkSaving}
              className={`relative p-3 rounded-xl border text-center transition-all ${
                activeNetwork === 'sepolia'
                  ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-amber-400/50 hover:bg-amber-400/5'
              }`}
            >
              <div className="text-sm font-bold">Sepolia</div>
              <div className="text-xs mt-0.5">{activeNetwork === 'sepolia' ? '✓ Active' : 'Testnet'}</div>
            </button>
            <button
              onClick={() => {
                if (window.confirm('⚠️ Switching to Mainnet means real money. Make sure your wallets are funded on Ethereum Mainnet. Continue?')) {
                  saveNetwork('mainnet');
                }
              }}
              disabled={networkSaving}
              className={`relative p-3 rounded-xl border text-center transition-all ${
                activeNetwork === 'mainnet'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-accent/50 hover:bg-accent/5'
              }`}
            >
              <div className="text-sm font-bold">Mainnet</div>
              <div className="text-xs mt-0.5">{activeNetwork === 'mainnet' ? '✓ Active' : 'Real ETH'}</div>
            </button>
          </div>
          {networkSaved && <p className="text-xs text-accent text-center">Network updated! Reload the app for changes to take full effect.</p>}
          {activeNetwork === 'sepolia' && <p className="text-xs text-amber-400 text-center">🧪 Testnet mode — transactions use test ETH with no real value.</p>}
          {activeNetwork === 'mainnet' && <p className="text-xs text-destructive text-center">⚠️ Mainnet mode — all transactions use REAL ETH.</p>}
        </div>
      </div>

      {/* Alert Rules */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <AlertRulesManager />
      </div>

      {/* Alert Log */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <AlertLogViewer />
      </div>

      {/* About */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">Pause Wallet</span>
        </div>
        <p className="text-xs text-muted-foreground">"A second chance before assets are permanently lost."</p>
        <p className="text-xs text-muted-foreground mt-1">Version 0.1.0 MVP</p>
      </div>

      {seedWallet && <SeedPhraseModal walletType={seedWallet} onClose={() => setSeedWallet(null)} />}
      {showPinModal && <SetPinModal isFirstTime={false} onClose={() => setShowPinModal(false)} onSuccess={() => { setPinExists(true); setShowPinModal(false); }} />}
    </div>
  );
}
