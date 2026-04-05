import { useState, useEffect } from 'react';
import { Plus, Trash2, ShieldCheck, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Recovery() {
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.RecoveryAddress.list()
      .then(setAddresses)
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!newAddress.trim()) return;
    await base44.entities.RecoveryAddress.create({
      address: newAddress.trim(),
      label: newLabel.trim() || 'Recovery Address',
      is_primary: addresses.length === 0,
    });
    const updated = await base44.entities.RecoveryAddress.list();
    setAddresses(updated);
    setNewAddress('');
    setNewLabel('');
  };

  const handleDelete = async (id) => {
    await base44.entities.RecoveryAddress.delete(id);
    setAddresses(prev => prev.filter(a => a.id !== id));
  };

  const handleSetPrimary = async (id) => {
    await Promise.all(
      addresses.map(a =>
        base44.entities.RecoveryAddress.update(a.id, { is_primary: a.id === id })
      )
    );
    const updated = await base44.entities.RecoveryAddress.list();
    setAddresses(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">Recovery Vault</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            These addresses receive your funds during a revoke or emergency. The primary address is used automatically.
          </p>
        </div>

        {/* Address list */}
        <div className="space-y-3">
          {addresses.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recovery addresses yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Add at least one address below to enable secure revoke routing.</p>
            </div>
          ) : (
            addresses.map(addr => (
              <div
                key={addr.id}
                className={`bg-card border rounded-xl p-4 flex items-start gap-3 transition-all ${
                  addr.is_primary ? 'border-accent/40' : 'border-border'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{addr.label}</span>
                    {addr.is_primary && (
                      <span className="text-xs bg-accent/10 text-accent border border-accent/30 px-2 py-0.5 rounded-full">Primary</span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground break-all">{addr.address}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!addr.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(addr.id)}
                      title="Set as primary"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-accent transition-colors"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add new */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-foreground">Add Recovery Address</h2>
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Cold Storage, Safe Multisig)"
            className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
          />
          <input
            type="text"
            value={newAddress}
            onChange={e => setNewAddress(e.target.value)}
            placeholder="0x..."
            className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleAdd}
            disabled={!newAddress.trim()}
            className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            Add Address
          </button>
        </div>

        {/* Info */}
        <div className="bg-muted/30 border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium mb-2 text-foreground">How Recovery Addresses Work</h3>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span>When you revoke a Guard transaction, funds are rerouted to your primary recovery address</li>
            <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span>During an emergency, all held assets migrate to the primary address</li>
            <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span>Use a hardware wallet, multisig, or air-gapped address for maximum security</li>
            <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span>Star an address to make it primary</li>
          </ul>
        </div>

      </div>
    </div>
  );
}