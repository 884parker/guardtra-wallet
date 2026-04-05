import { useState } from 'react';
import { X, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SetPinModal({ isFirstTime, onClose, onSuccess }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (newPin.length < 4) { setError('PIN must be at least 4 characters'); return; }
    if (newPin !== confirmPin) { setError('PINs do not match'); return; }

    setLoading(true);
    const res = await base44.functions.invoke('setSecurityPin', { currentPin, newPin });
    setLoading(false);

    if (res.data?.ok) {
      setDone(true);
      onSuccess?.();
    } else {
      setError(res.data?.error || 'Failed to set PIN');
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">{isFirstTime ? 'Set Security PIN' : 'Change Security PIN'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-accent" />
            </div>
            <h3 className="font-semibold mb-1">PIN {isFirstTime ? 'Set' : 'Updated'}!</h3>
            <p className="text-sm text-muted-foreground mb-4">Your security PIN has been saved. Use it to access seed phrases.</p>
            <button onClick={onClose} className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-medium">Done</button>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2 bg-primary/10 border border-primary/30 rounded-xl p-3 mb-4">
              <Lock className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-primary">{isFirstTime ? 'Create a PIN to protect access to your wallet seed phrases.' : 'Enter your current PIN then choose a new one.'}</p>
            </div>

            <div className="space-y-3">
              {!isFirstTime && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Current PIN</label>
                  <input
                    type={showPins ? 'text' : 'password'}
                    value={currentPin}
                    onChange={e => setCurrentPin(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary tracking-widest"
                    placeholder="••••"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">New PIN</label>
                <div className="relative">
                  <input
                    type={showPins ? 'text' : 'password'}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 pr-10 text-sm text-foreground focus:outline-none focus:border-primary tracking-widest"
                    placeholder="Min 4 characters"
                  />
                  <button onClick={() => setShowPins(!showPins)} className="absolute right-3 top-2.5 text-muted-foreground">
                    {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Confirm New PIN</label>
                <input
                  type={showPins ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary tracking-widest"
                  placeholder="••••"
                />
              </div>
            </div>

            {error && <p className="text-xs text-destructive mt-3">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !newPin || !confirmPin}
              className="w-full mt-4 bg-primary text-primary-foreground rounded-xl py-3 font-medium text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {loading ? 'Saving...' : isFirstTime ? 'Set PIN' : 'Update PIN'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}