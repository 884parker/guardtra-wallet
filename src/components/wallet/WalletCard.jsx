import { Shield, Activity, Zap, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const config = {
  vault: {
    label: 'Vault Wallet',
    icon: Shield,
    glowClass: 'vault-glow',
    accentColor: 'text-vault',
    badgeBg: 'bg-vault/10 text-vault border-vault/30',
    borderColor: 'border-vault/20',
    tagline: 'Secure Storage',
  },
  guard: {
    label: 'Pause',
    icon: Activity,
    glowClass: 'guard-glow',
    accentColor: 'text-guard',
    badgeBg: 'bg-guard/10 text-guard border-guard/30',
    borderColor: 'border-guard/20',
    tagline: '24h Security Layer',
  },
  liquidity: {
    label: 'Liquidity Wallet',
    icon: Zap,
    glowClass: 'liquidity-glow',
    accentColor: 'text-liquidity',
    badgeBg: 'bg-liquidity/10 text-liquidity border-liquidity/30',
    borderColor: 'border-liquidity/20',
    tagline: 'Daily Spending',
  },
};

export default function WalletCard({ type, balance, address, pending = 0, isCompromised = false, onClick }) {
  const cfg = config[type];
  const Icon = cfg.icon;
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-card border ${cfg.borderColor} rounded-2xl p-5 hover:${cfg.glowClass} transition-all duration-300 group relative overflow-hidden`}
    >
      {isCompromised && (
        <div className="absolute inset-0 bg-destructive/5 border border-destructive/30 rounded-2xl animate-pulse pointer-events-none" />
      )}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${cfg.badgeBg} border`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-right">
          <span className={`text-xs px-2 py-1 rounded-full border ${cfg.badgeBg}`}>{cfg.tagline}</span>
        </div>
      </div>
      <div className="mb-3">
        <div className={`text-2xl font-bold ${cfg.accentColor}`}>{balance}</div>
        {address ? (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-muted-foreground font-mono">{`${address.slice(0, 6)}...${address.slice(-4)}`}</span>
            <button
              onClick={handleCopy}
              title={address}
              className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        ) : (
          <div className="text-xs text-primary mt-1 underline underline-offset-2 opacity-80">+ Set address</div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{cfg.label}</span>
        {pending > 0 && (
          <span className="text-xs bg-guard/20 text-guard px-2 py-0.5 rounded-full border border-guard/30">
            {pending} pending
          </span>
        )}
        {isCompromised && (
          <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full border border-destructive/30">
            Compromised
          </span>
        )}
      </div>
    </button>
  );
}