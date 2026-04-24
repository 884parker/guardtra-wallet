import { useState } from 'react';
import { AlertTriangle, Shield, RefreshCw, CheckCircle, ChevronRight, Lock, Copy, Eye, EyeOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STEPS = [
  { id: 1, key: 'freeze',   icon: Lock,          title: 'Scan Paused Transactions',  desc: 'Identify all pending Pause releases to be revoked.' },
  { id: 2, key: 'revoke',   icon: AlertTriangle,  title: 'Revoke All Transactions', desc: 'Cancel every pending/held release from the compromised vault.' },
  { id: 3, key: 'generate', icon: RefreshCw,      title: 'Generate New Vault',      desc: 'Create a fresh Vault wallet with a new seed phrase.' },
  { id: 4, key: 'migrate',  icon: Shield,         title: 'Migrate Remaining Assets',desc: 'Record transfer of all vault assets to the new wallet.' },
  { id: 5, key: 'flag',     icon: AlertTriangle,  title: 'Flag Compromised Wallet', desc: 'Mark the old vault as compromised so it is never reused.' },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handle} className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors">
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function EmergencyFlow({ onClose, onComplete }) {
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [showMnemonic, setShowMnemonic] = useState(false);

  // Recovery data accumulated across steps
  const [recovery, setRecovery] = useState({
    heldCount: 0,
    revoked: 0,
    newVaultAddress: null,
    newMnemonic: null,
    newPrivateKey: null,
    migrated: 0,
    flagged: null,
  });

  const callStep = async (stepKey) => {
    const payload = { step: stepKey };
    if (recovery.newVaultAddress) payload.newVaultAddress = recovery.newVaultAddress;
    const res = await base44.functions.invoke('vaultRecovery', payload);
    return res.data;
  };

  const handleStep = async () => {
    setLoading(true);
    setError(null);
    const step = STEPS[activeStep - 1];

    const data = await callStep(step.key).catch(e => { setError(e.message || 'Step failed'); return null; });
    if (!data) { setLoading(false); return; }

    // Accumulate results
    if (step.key === 'freeze') {
      setRecovery(r => ({ ...r, heldCount: data.count }));
    } else if (step.key === 'revoke') {
      setRecovery(r => ({ ...r, revoked: data.revoked }));
    } else if (step.key === 'generate') {
      setRecovery(r => ({
        ...r,
        newVaultAddress: data.newVaultAddress,
        newMnemonic: data.newMnemonic,
        newPrivateKey: data.newPrivateKey,
      }));
    } else if (step.key === 'migrate') {
      setRecovery(r => ({ ...r, migrated: data.migrated }));
    } else if (step.key === 'flag') {
      setRecovery(r => ({ ...r, flagged: data.flagged }));
    }

    if (activeStep < STEPS.length) {
      setActiveStep(s => s + 1);
    } else {
      setDone(true);
      onComplete?.();
    }
    setLoading(false);
  };

  const stepLabel = () => {
    const s = STEPS[activeStep - 1];
    if (!s) return 'Execute';
    return {
      freeze:   'Scan Now',
      revoke:   `Revoke ${recovery.heldCount > 0 ? recovery.heldCount + ' Tx' : 'All'}`,
      generate: 'Generate New Vault',
      migrate:  'Migrate Assets',
      flag:     'Flag & Finish',
    }[s.key] || `Execute Step ${activeStep}`;
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-destructive/40 rounded-2xl max-w-md w-full p-6 shadow-2xl">

        {done ? (
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">Assets Secured</h2>
              <p className="text-sm text-muted-foreground">
                {recovery.revoked} transaction{recovery.revoked !== 1 ? 's' : ''} revoked · {recovery.migrated} migration{recovery.migrated !== 1 ? 's' : ''} recorded
              </p>
            </div>

            {/* New vault credentials — critical to save */}
            <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Save your new vault credentials NOW — they will not be shown again
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">New Vault Address</p>
                <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                  <span className="text-xs font-mono text-foreground flex-1 truncate">{recovery.newVaultAddress}</span>
                  <CopyButton text={recovery.newVaultAddress} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Recovery Seed Phrase</p>
                  <button onClick={() => setShowMnemonic(v => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    {showMnemonic ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showMnemonic ? 'Hide' : 'Reveal'}
                  </button>
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 relative">
                  {showMnemonic ? (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono text-foreground leading-relaxed flex-1">{recovery.newMnemonic}</span>
                      <CopyButton text={recovery.newMnemonic} />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground blur-sm select-none">
                      {'● '.repeat(12)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button onClick={onClose} className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium hover:opacity-90 transition-opacity">
              Back to Dashboard
            </button>
          </div>

        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Emergency Vault Recovery</h2>
                <p className="text-xs text-muted-foreground">Revoke transactions · Issue new vault · Migrate assets</p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {STEPS.map(step => {
                const Icon = step.icon;
                const isComplete = activeStep > step.id;
                const isCurrent  = activeStep === step.id;
                return (
                  <div key={step.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isCurrent  ? 'bg-destructive/10 border-destructive/30' :
                    isComplete ? 'bg-accent/5 border-accent/20 opacity-70' :
                    'border-border opacity-40'
                  }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isComplete ? 'bg-accent/20' : isCurrent ? 'bg-destructive/20' : 'bg-muted'
                    }`}>
                      {isComplete
                        ? <CheckCircle className="w-3.5 h-3.5 text-accent" />
                        : <Icon className={`w-3.5 h-3.5 ${isCurrent ? 'text-destructive' : 'text-muted-foreground'}`} />}
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</div>
                      {isCurrent && <div className="text-xs text-muted-foreground">{step.desc}</div>}
                      {/* Show result summaries for completed steps */}
                      {isComplete && step.key === 'freeze'   && <div className="text-xs text-accent">{recovery.heldCount} transaction{recovery.heldCount !== 1 ? 's' : ''} found</div>}
                      {isComplete && step.key === 'revoke'   && <div className="text-xs text-accent">{recovery.revoked} revoked</div>}
                      {isComplete && step.key === 'generate' && <div className="text-xs text-accent font-mono truncate">{recovery.newVaultAddress?.slice(0,16)}…</div>}
                      {isComplete && step.key === 'migrate'  && <div className="text-xs text-accent">{recovery.migrated} asset migration{recovery.migrated !== 1 ? 's' : ''} recorded</div>}
                      {isComplete && step.key === 'flag'     && <div className="text-xs text-accent">Old vault flagged</div>}
                    </div>
                    {isCurrent && <ChevronRight className="w-4 h-4 text-destructive ml-auto flex-shrink-0" />}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 mb-3 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 border border-border text-muted-foreground rounded-xl py-3 text-sm hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={handleStep}
                disabled={loading}
                className="flex-[2] bg-destructive text-destructive-foreground rounded-xl py-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? 'Processing…' : stepLabel()}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}