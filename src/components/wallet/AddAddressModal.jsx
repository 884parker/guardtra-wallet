import { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const LABELS = { vault: 'Vault', guard: 'Guard', liquidity: 'Liquidity' };

export default function AddAddressModal({ walletType, existingId, onClose, onSaved }) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!address.trim()) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(address.trim())) {
      setError('Invalid Ethereum address');
      return;
    }
    setLoading(true);
    if (existingId) {
      await base44.entities.WalletProfile.update(existingId, { address: address.trim() });
    } else {
      await base44.entities.WalletProfile.create({ wallet_type: walletType, address: address.trim(), label: LABELS[walletType] });
    }
    setLoading(false);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">Set {LABELS[walletType]} Wallet Address</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Ethereum Address</label>
            <input
              value={address}
              onChange={e => { setAddress(e.target.value); setError(''); }}
              placeholder="0x..."
              className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 border border-border text-muted-foreground rounded-xl py-2.5 text-sm hover:bg-muted">Cancel</button>
          <button onClick={handleSave} disabled={loading || !address} className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}