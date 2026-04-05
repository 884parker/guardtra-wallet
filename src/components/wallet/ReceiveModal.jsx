import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function ReceiveModal({ address, walletLabel, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">Receive — {walletLabel}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Share this address to receive crypto into your {walletLabel}.</p>
        <div className="bg-muted border border-border rounded-xl px-3 py-3 text-sm font-mono text-foreground break-all mb-3">
          {address || <span className="text-muted-foreground italic">No address set</span>}
        </div>
        {address && (
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            {copied ? <><Check className="w-4 h-4 text-accent" />Copied!</> : <><Copy className="w-4 h-4" />Copy Address</>}
          </button>
        )}
      </div>
    </div>
  );
}