import { Vault, Shield, Droplets } from 'lucide-react';

const WALLET_CONFIG = {
  vault:     { label: 'Vault',     color: 'text-vault',     bg: 'bg-vault/10',     border: 'border-vault/20',     Icon: Vault    },
  guard:     { label: 'Guard',     color: 'text-guard',     bg: 'bg-guard/10',     border: 'border-guard/20',     Icon: Shield   },
  liquidity: { label: 'Liquidity', color: 'text-liquidity', bg: 'bg-liquidity/10', border: 'border-liquidity/20', Icon: Droplets },
};

const ASSET_BALANCE_KEY = { ETH: 'balance_eth', BTC: 'balance_btc', USDC: 'balance_usdc' };

export default function AssetWalletHoldings({ asset, walletProfiles, balances, price }) {
  const balKey = ASSET_BALANCE_KEY[asset];

  const rows = Object.entries(WALLET_CONFIG).map(([type, cfg]) => {
    const profile = walletProfiles.find(w => w.wallet_type === type);
    const liveAmt = balances[type]?.[balKey];
    const amt = liveAmt ?? profile?.[balKey] ?? 0;
    const usd = price ? amt * price : amt; // USDC is 1:1
    return { type, cfg, amt, usd };
  });

  const total = rows.reduce((s, r) => s + r.amt, 0);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Holdings by Wallet</h3>
      <div className="space-y-3">
        {rows.map(({ type, cfg, amt, usd }) => {
          const pct = total > 0 ? (amt / total) * 100 : 0;
          const { Icon } = cfg;
          return (
            <div key={type}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <span className="text-sm text-foreground">{cfg.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-foreground">{amt.toFixed(asset === 'BTC' ? 6 : 4)} {asset}</span>
                  {price > 0 && <span className="text-xs text-muted-foreground ml-2">${usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>}
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${cfg.bg.replace('/10', '/60')}`} style={{ width: `${pct}%`, backgroundColor: `hsl(var(--${type}))` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-border flex justify-between text-sm">
        <span className="text-muted-foreground">Total</span>
        <span className="font-semibold text-foreground">{total.toFixed(asset === 'BTC' ? 6 : 4)} {asset}</span>
      </div>
    </div>
  );
}