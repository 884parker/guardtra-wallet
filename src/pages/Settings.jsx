import { useState, useEffect } from 'react';
import { Shield, Bell, Lock, ChevronRight, Wifi, Eye, KeyRound, Save, AlertTriangle } from 'lucide-react';

const isValidEthAddress = (addr) => /^0x[0-9a-fA-F]{40}$/.test(addr);
import SeedPhraseModal from '@/components/wallet/SeedPhraseModal';
import SetPinModal from '@/components/settings/SetPinModal';
import AlertRulesManager from '@/components/alerts/AlertRulesManager';
import AlertLogViewer from '@/components/alerts/AlertLogViewer';
import { base44 } from '@/api/base44Client';

export default function Settings() {
  const [seedWallet, setSeedWallet] = useState(null);
  const [pinExists, setPinExists] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [notifications, setNotifications] = useState({ vaultAlert: true, guardRelease: true, email: false });
  const [safeWalletAddress, setsafeWalletAddress] = useState('');
  const [safeWalletConfigId, setsafeWalletConfigId] = useState(null);
  const [safeWalletSaving, setSafeWalletSaving] = useState(false);
  const [safeWalletSaved, setSafeWalletSaved] = useState(false);

  useEffect(() => {
    base44.entities.AppConfig.filter({ key: 'security_pin' })
      .then(res => setPinExists(res.length > 0))
      .catch(() => {});
    base44.entities.AppConfig.filter({ key: 'safe_wallet_address' })
      .then(res => {
        if (res[0]) { setsafeWalletAddress(res[0].value); setsafeWalletConfigId(res[0].id); }
      })
      .catch(() => {});
  }, []);

  const savesafeWalletAddress = async () => {
    setSafeWalletSaving(true);
    if (safeWalletConfigId) {
      await base44.entities.AppConfig.update(safeWalletConfigId, { value: safeWalletAddress });
    } else {
      const rec = await base44.entities.AppConfig.create({ key: 'safe_wallet_address', value: safeWalletAddress });
      setsafeWalletConfigId(rec.id);
    }
    setSafeWalletSaving(false);
    setSafeWalletSaved(true);
    setTimeout(() => setSafeWalletSaved(false), 2000);
  };

  const toggle = (key) => setNotifications(n => ({ ...n, [key]: !n[key] }));

  return (
    <div className="md:ml-56 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your security preferences and wallet settings.</p>
      </div>

      {/* Wallet Setup */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Wallet Setup</h2>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">GuardtraSafe Wallet Address</label>
            <p className="text-xs text-muted-foreground mb-2">Your GuardtraSafe recovery wallet address. Revoked transactions are automatically routed here for safekeeping.</p>
            <div className="flex gap-2">
              <input
                value={safeWalletAddress}
                onChange={e => { setsafeWalletAddress(e.target.value); setSafeWalletSaved(false); }}
                placeholder="0x..."
                className="flex-1 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={savesafeWalletAddress}
                disabled={!safeWalletAddress || safeWalletSaving || !isValidEthAddress(safeWalletAddress)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Save className="w-3.5 h-3.5" />
                {safeWalletSaving ? 'Saving...' : safeWalletSaved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Security</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <button onClick={() => setShowPinModal(true)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <KeyRound className="w-4 h-4 text-primary" />
              <div className="text-left">
                <div className="text-sm text-foreground">Security PIN</div>
                <div className="text-xs text-muted-foreground">{pinExists ? 'Change your PIN' : 'Set a PIN to access seed phrases'}</div>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${pinExists ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}>
              {pinExists ? 'Active' : 'Not set'}
            </span>
          </button>
          {[
            { wallet: 'vault', label: 'Vault Wallet Seed', icon: Shield, color: 'text-vault' },
            { wallet: 'guard', label: 'Guard Wallet Seed', icon: Lock, color: 'text-guard' },
            { wallet: 'liquidity', label: 'Liquidity Wallet Seed', icon: Eye, color: 'text-liquidity' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.wallet}
                onClick={() => setSeedWallet(item.wallet)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Notifications</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {[
            { key: 'vaultAlert', label: 'Vault transaction alerts', desc: 'Instant alert when Vault sends' },
            { key: 'guardRelease', label: 'Guard release reminders', desc: 'Notify before 24h release' },
            { key: 'email', label: 'Email notifications', desc: 'Backup alert via email' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3.5">
              <div>
                <div className="text-sm text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`w-11 h-6 rounded-full transition-colors relative ${notifications[item.key] ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifications[item.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Network */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Network</h2>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Wifi className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">Active Network</span>
            </div>
            <span className="text-sm text-muted-foreground">Ethereum Mainnet (Testnet)</span>
          </div>
        </div>
      </div>

      {/* Alert Rules */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <AlertRulesManager />
      </div>

      {/* Alert Log */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <AlertLogViewer />
      </div>

      {/* About */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">Guardtra</span>
        </div>
        <p className="text-xs text-muted-foreground">"A second chance before assets are permanently lost."</p>
        <p className="text-xs text-muted-foreground mt-1">Version 0.1.0 MVP</p>
      </div>

      {seedWallet && <SeedPhraseModal walletType={seedWallet} onClose={() => setSeedWallet(null)} />}
      {showPinModal && <SetPinModal isFirstTime={!pinExists} onClose={() => setShowPinModal(false)} onSuccess={() => { setPinExists(true); setShowPinModal(false); }} />}
    </div>
  );
}
