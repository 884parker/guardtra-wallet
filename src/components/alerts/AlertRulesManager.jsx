import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Bell, BellOff, Loader2 } from 'lucide-react';

const WALLET_OPTIONS = ['vault', 'liquidity', 'guard', 'all'];
const ALERT_TYPES = [
  { value: 'large_transaction', label: 'Large Transaction' },
  { value: 'unauthorized', label: 'Unauthorized Activity' },
  { value: 'any_transaction', label: 'Any Transaction' },
];

const DEFAULT_FORM = { wallet_type: 'vault', alert_type: 'large_transaction', threshold_usd: 1000, email: '', is_active: true };

export default function AlertRulesManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    base44.entities.AlertRule.list('-created_at').then(setRules).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!form.email) return;
    setSaving(true);
    const created = await base44.entities.AlertRule.create(form);
    setRules(prev => [created, ...prev]);
    setForm(DEFAULT_FORM);
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.AlertRule.delete(id);
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const handleToggle = async (rule) => {
    const updated = await base44.entities.AlertRule.update(rule.id, { is_active: !rule.is_active });
    setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Alert Rules</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Get emailed when activity matches a rule</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Rule
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Wallet</label>
              <select value={form.wallet_type} onChange={e => setForm(f => ({ ...f, wallet_type: e.target.value }))}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary capitalize">
                {WALLET_OPTIONS.map(w => <option key={w} value={w}>{w === 'all' ? 'All Wallets' : w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Alert Type</label>
              <select value={form.alert_type} onChange={e => setForm(f => ({ ...f, alert_type: e.target.value }))}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary">
                {ALERT_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>

          {form.alert_type === 'large_transaction' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Threshold (USD)</label>
              <input type="number" value={form.threshold_usd} onChange={e => setForm(f => ({ ...f, threshold_usd: parseFloat(e.target.value) }))}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary" placeholder="1000" />
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notification Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary" placeholder="you@example.com" />
          </div>

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 border border-border text-muted-foreground rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !form.email}
              className="flex-[2] bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Rule'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : rules.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">No alert rules yet. Add one above.</div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => {
            const alertLabel = ALERT_TYPES.find(a => a.value === rule.alert_type)?.label ?? rule.alert_type;
            return (
              <div key={rule.id} className={`flex items-center gap-3 bg-card border rounded-xl px-4 py-3 ${rule.is_active ? 'border-border' : 'border-border opacity-50'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${rule.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                  {rule.is_active ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground capitalize">
                    {rule.wallet_type === 'all' ? 'All Wallets' : rule.wallet_type} — {alertLabel}
                    {rule.alert_type === 'large_transaction' && rule.threshold_usd && (
                      <span className="text-muted-foreground font-normal"> ≥ ${rule.threshold_usd.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{rule.email}</div>
                </div>
                <button onClick={() => handleToggle(rule)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground text-xs">
                  {rule.is_active ? 'Pause' : 'Resume'}
                </button>
                <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}