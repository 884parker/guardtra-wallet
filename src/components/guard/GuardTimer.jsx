import { useState, useEffect } from 'react';
import { Clock, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

function useCountdown(releaseAt) {
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
  const progress = remaining > 0 ? (remaining / 86400000) * 100 : 0;

  return { hours, minutes, seconds, progress, isExpired: remaining === 0 };
}

export default function GuardTimer({ transaction, onRevoke, onStartRecovery }) {
  const { hours, minutes, seconds, progress, isExpired } = useCountdown(transaction.release_at);
  const isUnauthorized = !transaction.is_user_initiated;

  const pad = (n) => String(n).padStart(2, '0');

  const circumference = 2 * Math.PI * 54;
  const strokeDash = circumference * (progress / 100);

  return (
    <div className={`bg-card border rounded-2xl p-5 ${isUnauthorized ? 'border-destructive/40 guard-glow' : 'border-guard/30'}`}>
      {isUnauthorized && (
        <div className="flex items-center gap-2 mb-4 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          <span className="text-xs text-destructive font-medium">Unauthorized transaction detected</span>
        </div>
      )}

      <div className="flex items-center gap-5">
        {/* Circle timer */}
        <div className="relative flex-shrink-0">
          <svg width="120" height="120" className="rotate-[-90deg]">
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={isUnauthorized ? 'hsl(var(--destructive))' : 'hsl(var(--guard))'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - strokeDash}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Clock className={`w-4 h-4 mb-1 ${isUnauthorized ? 'text-destructive' : 'text-guard'}`} />
            <div className={`text-xl font-bold font-mono ${isUnauthorized ? 'text-destructive' : 'text-guard'}`}>
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
          <div className="text-xs text-muted-foreground mb-1">To: <span className="font-mono text-foreground">{transaction.to_address?.slice(0, 8)}...{transaction.to_address?.slice(-6)}</span></div>
          {transaction.destination_label && (
            <div className="text-xs text-muted-foreground mb-1">Label: <span className="text-foreground">{transaction.destination_label}</span></div>
          )}
          <div className="text-xs text-muted-foreground mb-3">Network: {transaction.network}</div>

          {/* Revoke — always available, no time restriction */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onRevoke(transaction.id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-destructive hover:opacity-90 text-destructive-foreground rounded-xl text-xs font-semibold transition-opacity shadow-sm"
            >
              <XCircle className="w-3.5 h-3.5" />
              Revoke Transaction
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
            <p className="text-xs text-muted-foreground mt-2">Auto-releases after 24h if not revoked.</p>
          )}
        </div>
      </div>
    </div>
  );
}