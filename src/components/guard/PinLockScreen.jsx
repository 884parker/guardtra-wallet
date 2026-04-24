import { useState, useEffect } from 'react';
import { Shield, Delete, Loader2, LogOut, AlertTriangle } from 'lucide-react';
import { functions, entities } from '@/api/db';
import { useAuth } from '@/lib/AuthContext';
import { notify, requestNotificationPermission } from '@/lib/notifications';

/**
 * Full-screen PIN unlock gate.
 * Shown when the user has a valid Supabase session but hasn't entered their PIN yet.
 * 
 * Uses the unified PIN stored in user_wallets.pin_hash (created during Safe wallet setup).
 * 
 * Props:
 *   onUnlock  — called when correct PIN is entered
 *   onNeedPin — called when user has no PIN set (needs to complete setup)
 */
export default function PinLockScreen({ onUnlock, onNeedPin }) {
  const { logout } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_SECONDS = 60;

  // Request notification permission on mount (for lockout alerts)
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // On mount, check if user has a Safe wallet (which means PIN exists)
  useEffect(() => {
    entities.UserWallet.list('-created_at', 1)
      .then(wallets => {
        if (!wallets || wallets.length === 0) {
          // No Safe wallet = no PIN = needs setup
          onNeedPin?.();
        }
        // Otherwise wallet exists, show PIN unlock screen
      })
      .catch(() => {
        // If query fails, still show PIN screen (safe fallback)
      })
      .finally(() => setChecking(false));
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (!locked) return;
    const interval = setInterval(() => {
      setLockTimer(prev => {
        if (prev <= 1) {
          setLocked(false);
          setAttempts(0);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [locked]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (pin.length === 6 && !loading && !locked) {
      verifyPin(pin);
    }
  }, [pin]);

  const verifyPin = async (enteredPin) => {
    setLoading(true);
    setError('');

    try {
      const res = await functions.invoke('wallet', { action: 'verify_pin', pin: enteredPin });
      if (res.data?.valid) {
        notify({ level: 'success', sound: true, browser: false });
        onUnlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin('');

        if (newAttempts >= MAX_ATTEMPTS) {
          setLocked(true);
          setLockTimer(LOCKOUT_SECONDS);
          setError(`Too many attempts. Locked for ${LOCKOUT_SECONDS} seconds.`);

          // 🚨 Security notification — lockout triggered
          notify({
            title: '🚨 Security Alert — Pause Wallet',
            body: `Your wallet has been locked after ${MAX_ATTEMPTS} failed PIN attempts. If this wasn't you, your wallet is safe — the lockout is active.`,
            level: 'critical',
          });
        } else {
          setError(`Wrong PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);

          // Warning sound on wrong PIN
          notify({
            title: 'Wrong PIN',
            body: `${MAX_ATTEMPTS - newAttempts} attempts remaining before lockout.`,
            level: 'warning',
            browser: false, // Sound only, no browser popup for each wrong attempt
          });
        }
      }
    } catch (err) {
      setPin('');
      setError('Verification failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const appendDigit = (d) => {
    if (pin.length < 6 && !loading && !locked) {
      setPin(prev => prev + d);
      setError('');
    }
  };

  const deleteDigit = () => {
    if (!loading && !locked) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'];

  if (checking) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-[300]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-[300] px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Pause Wallet</h1>
          <p className="text-sm text-muted-foreground">Enter your PIN to unlock</p>
        </div>

        {/* PIN dots */}
        <div className="flex gap-4 justify-center">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < pin.length
                  ? error ? 'bg-destructive border-destructive' : 'bg-primary border-primary'
                  : 'border-muted-foreground/40'
              }`}
            />
          ))}
        </div>

        {/* Loading spinner */}
        {loading && (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2 w-full">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Lockout timer */}
        {locked && (
          <p className="text-sm text-muted-foreground">
            Try again in <span className="font-mono font-bold text-foreground">{lockTimer}s</span>
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {digits.map((d, i) => {
            if (d === '') return <div key={i} />;
            if (d === 'del') return (
              <button
                key={i}
                onClick={deleteDigit}
                disabled={loading || locked}
                className="h-14 rounded-xl bg-secondary border border-border text-foreground flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all disabled:opacity-30"
              >
                <Delete className="w-5 h-5 text-muted-foreground" />
              </button>
            );
            return (
              <button
                key={i}
                onClick={() => appendDigit(String(d))}
                disabled={loading || locked}
                className="h-14 rounded-xl bg-secondary border border-border text-foreground text-xl font-semibold hover:bg-secondary/80 active:scale-95 transition-all disabled:opacity-30"
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Sign out option */}
        <button
          onClick={async () => { await logout(); }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted mt-2"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}
