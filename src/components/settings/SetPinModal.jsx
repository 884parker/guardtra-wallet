import { useState } from 'react';
import { X, Lock, CheckCircle, Delete, AlertTriangle } from 'lucide-react';
import { functions } from '@/api/db';

/**
 * Unified PIN modal — uses the Safe wallet PIN (user_wallets.pin_hash).
 * For changing an existing PIN: verifies current PIN, then re-encrypts with new PIN.
 */
export default function SetPinModal({ isFirstTime, onClose, onSuccess }) {
  // Steps: 'current' → 'new' → 'confirm' → 'done'
  const [step, setStep] = useState(isFirstTime ? 'new' : 'current');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'];

  const activePin = step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin;
  const setActivePin = step === 'current' ? setCurrentPin : step === 'new' ? setNewPin : setConfirmPin;

  const appendDigit = (d) => {
    if (activePin.length < 6 && !loading) {
      setActivePin(prev => prev + d);
      setError('');
    }
  };

  const deleteDigit = () => {
    if (!loading) setActivePin(prev => prev.slice(0, -1));
  };

  // Auto-advance when 6 digits entered
  const handlePinComplete = async (pin) => {
    if (step === 'current') {
      // Verify current PIN
      setLoading(true);
      try {
        const res = await functions.invoke('wallet', { action: 'verify_pin', pin });
        if (res.data?.valid) {
          setStep('new');
        } else {
          setError('Incorrect PIN. Try again.');
          setCurrentPin('');
        }
      } catch {
        setError('Verification failed. Try again.');
        setCurrentPin('');
      }
      setLoading(false);
    } else if (step === 'new') {
      setStep('confirm');
    } else if (step === 'confirm') {
      if (pin !== newPin) {
        setError('PINs do not match. Try again.');
        setConfirmPin('');
        return;
      }
      // Change PIN
      setLoading(true);
      try {
        const res = await functions.invoke('wallet', {
          action: 'change_pin',
          pin: isFirstTime ? '' : currentPin,
          newPin: newPin,
        });
        if (res.data?.success) {
          setStep('done');
          onSuccess?.();
        } else {
          setError(res.data?.error || 'Failed to change PIN');
          setConfirmPin('');
        }
      } catch (err) {
        setError('Failed to update PIN. Try again.');
        setConfirmPin('');
      }
      setLoading(false);
    }
  };

  // Watch for 6-digit completion
  if (activePin.length === 6 && !loading && step !== 'done') {
    // Use setTimeout to avoid state update during render
    setTimeout(() => handlePinComplete(activePin), 100);
  }

  const PinDots = ({ value }) => (
    <div className="flex gap-4 justify-center">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
          i < value.length
            ? error ? 'bg-destructive border-destructive' : 'bg-primary border-primary'
            : 'border-muted-foreground/40'
        }`} />
      ))}
    </div>
  );

  const Numpad = () => (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mx-auto">
      {digits.map((d, i) => {
        if (d === '') return <div key={i} />;
        if (d === 'del') return (
          <button key={i} onClick={deleteDigit} disabled={loading}
            className="h-12 rounded-xl bg-secondary border border-border text-foreground flex items-center justify-center hover:bg-secondary/80 active:scale-95 transition-all disabled:opacity-30">
            <Delete className="w-5 h-5 text-muted-foreground" />
          </button>
        );
        return (
          <button key={i} onClick={() => appendDigit(String(d))} disabled={loading}
            className="h-12 rounded-xl bg-secondary border border-border text-foreground text-lg font-semibold hover:bg-secondary/80 active:scale-95 transition-all disabled:opacity-30">
            {d}
          </button>
        );
      })}
    </div>
  );

  const titles = {
    current: 'Enter Current PIN',
    new: isFirstTime ? 'Create a 6-Digit PIN' : 'Enter New PIN',
    confirm: 'Confirm New PIN',
    done: 'PIN Updated!',
  };

  const subtitles = {
    current: 'Verify your identity before changing your PIN.',
    new: 'Choose a 6-digit PIN to secure your wallet.',
    confirm: 'Re-enter your new PIN to confirm.',
    done: 'Your security PIN has been updated successfully.',
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">{titles[step]}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'done' ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-accent" />
            </div>
            <h3 className="font-semibold mb-1">All Set!</h3>
            <p className="text-sm text-muted-foreground mb-4">{subtitles.done}</p>
            <button onClick={onClose} className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium">Done</button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5">
            <p className="text-sm text-muted-foreground text-center">{subtitles[step]}</p>

            <PinDots value={activePin} />

            {error && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 w-full">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            <Numpad />

            {step !== 'current' && step !== 'done' && (
              <button
                onClick={() => {
                  if (step === 'confirm') { setConfirmPin(''); setStep('new'); setNewPin(''); }
                  else if (step === 'new' && !isFirstTime) { setNewPin(''); setStep('current'); setCurrentPin(''); }
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ← Back
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
