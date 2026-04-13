import { useState, useEffect } from 'react';
import { Clock, XCircle, AlertTriangle, ShieldAlert, CheckCircle2, ExternalLink } from 'lucide-react';
import { useLockHours } from '@/hooks/use-lock-hours';

function useCountdown(releaseAt, lockMs) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(releaseAt) - new Date();
      setRemaining(Math.max(0, diff));
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [releaseAt]);

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const progress = remaining > 0 ? (remaining / lockMs) * 100 : 0;

  return { hours, minutes, seconds, progress: Math.min(progress, 100), isExpired: remaining === 0 };
}

export default function GuardTimer({ transaction, onRevoke, onStartRecovery, onApprove }) {
  const { lockHours, lockMs } = useLockHours();
  const { hours, minutes, seconds, progress, isExpired } = useCountdown(transaction.release_at, lockMs);
  const isUnauthorized = !transaction.is_user_initiated;
  const isApproved = transaction.approved === true;

  const pad = (n) => String(n).padStart(2, '0');

  const circumference = 2 * Math.PI * 54;
  const strokeDash = circumference * (progress / 100);

  // Build explorer URL for the destination address
  const network = transaction.network || 'sepolia';
  const explorerBase = network === 'mainnet' ? 'https://etherscan.io' : 'https://sepolia.etherscan.io';
  const explorerUrl = transaction.to_address ? `${explorerBase}/address/${transaction.to_address}` : null;

  return (
    <div className={`bg-card border rounded-2xl p-5 ${
      isUnauthorized ? 'border-destructive/40 guard-glow' : 
      isApproved ? 'border-emerald-500/40' : 'border-guard/30'
    }`}>
      {isUnauthorized && (
        <div className="flex items-center gap-2 mb-4 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          <span className="text-xs text-destructive font-medium">Unauthorized transaction detected</span>
        </div>
      )}

      {/* Approved badge */}
      {isApproved && !isUnauthorized && (
        <div className="flex items-center gap-2 mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs text-emerald-400 font-medium">Approved — will auto-release on schedule</span>
        </div>
      )}

      <div className="flex items-center gap-5">
        {/* Circle timer */}
        <div className="relative flex-shrink-0">
          <svg width="120" height="120" className="rotate-[-90deg]">
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={isUnauthorized ? 'hsl(var(--destructive))' : isApproved ? '#34d399' : 'hsl(var(--guard))'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - strokeDash}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isApproved && !isExpired ? (
              <CheckCircle2 className="w-4 h-4 mb-1 text-emerald-400" />
            ) : (
              <Clock className={`w-4 h-4 mb-1 ${isUnauthorized ? 'text-destructive' : 'text-guard'}`} />
            )}
            <div className={`text-xl font-bold font-mono ${
              isUnauthorized ? 'text-destructive' : isApproved ? 'text-emerald-400' : 'text-guard'
            }`}>
              {isExpired ? '00:00' : `${pad(hours)}:${pad(minutes)}`}
            </div>
            <div className="text-xs text-muted-foreground">{isExpired ? 'Releasing...' : `${pad(seconds)}s`}</div>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-foreground">{transaction.amount} {transaction.asset}</span>
            <span className="text-sm text-muted-foreground">${transaction.usd_value?.toLocaleString()}</span>
          </div>

          {/* Forward address — full display with explorer link */}
          <div className="bg-muted/50 border border-border rounded-lg p-2 mb-2">
            <div className="text-xs text-muted-foreground mb-0.5">Sending to:</div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-foreground break-all">{transaction.to_address}</span>
              {explorerUrl && (
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="View on Etherscan">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {transaction.destination_label && (
            <div className="text-xs text-muted-foreground mb-1">Label: <span className="text-foreground">{transaction.destination_label}</span></div>
          )}
          <div className="text-xs text-muted-foreground mb-3">Network: {transaction.network}</div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {/* Approve button — only show if not yet approved */}
            {!isApproved && !isUnauthorized && !isExpired && onApprove && (
              <button
                onClick={() => onApprove(transaction.id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve
              </button>
            )}
            <button
              onClick={() => onRevoke(transaction.id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-destructive hover:opacity-90 text-destructive-foreground rounded-xl text-xs font-semibold transition-opacity shadow-sm"
            >
              <XCircle className="w-3.5 h-3.5" />
              Revoke
            </button>
            {isUnauthorized && onStartRecovery && (
              <button
                onClick={onStartRecovery}
                className="flex items-center gap-1.5 px-4 py-2 bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/40 rounded-xl text-xs font-semibold transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Revoke + Recover Vault
              </button>
            )}
          </div>

          {isExpired ? (
            <p className="text-xs text-guard mt-2">⏱ Hold expired — auto-releasing shortly...</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">Auto-releases after {lockHours}h if not revoked.</p>
          )}
        </div>
      </div>
    </div>
  );
}