import { useState, useEffect } from 'react';
import { Flame, TrendingDown, TrendingUp, Minus, RefreshCw } from 'lucide-react';

const SPEED_CONFIG = {
  slow:    { label: 'Slow',    color: 'text-accent',       bg: 'bg-accent/10',       border: 'border-accent/20',       icon: TrendingDown },
  standard:{ label: 'Standard',color: 'text-primary',      bg: 'bg-primary/10',      border: 'border-primary/20',      icon: Minus        },
  fast:    { label: 'Fast',    color: 'text-guard',        bg: 'bg-guard/10',        border: 'border-guard/20',        icon: TrendingUp   },
};

async function fetchGasPrices(alchemyKey) {
  // Use eth_gasPrice and eth_feeHistory via Alchemy
  const rpc = `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`;
  const [feeHistRes, gasRes] = await Promise.all([
    fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_feeHistory', params: ['0x4', 'latest', [25, 50, 75]] }),
    }),
    fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'eth_gasPrice', params: [] }),
    }),
  ]);

  const feeData = await feeHistRes.json();
  const gasData = await gasRes.json();

  const baseFees = feeData.result?.baseFeePerGas || [];
  const latestBase = baseFees.length > 0 ? parseInt(baseFees[baseFees.length - 1], 16) / 1e9 : 0;
  const rewards = feeData.result?.reward || [];
  const avgRewards = rewards.length > 0
    ? rewards.map(r => r.map(x => parseInt(x, 16) / 1e9))
    : [[1, 1.5, 2]];

  const avgP25 = avgRewards.reduce((s, r) => s + r[0], 0) / avgRewards.length;
  const avgP50 = avgRewards.reduce((s, r) => s + r[1], 0) / avgRewards.length;
  const avgP75 = avgRewards.reduce((s, r) => s + r[2], 0) / avgRewards.length;

  return {
    slow:     Math.round((latestBase + avgP25) * 10) / 10,
    standard: Math.round((latestBase + avgP50) * 10) / 10,
    fast:     Math.round((latestBase + avgP75) * 10) / 10,
    baseFee:  Math.round(latestBase * 10) / 10,
    updatedAt: new Date(),
  };
}

export default function GasTracker({ compact = false, onSelectSpeed }) {
  const [gas, setGas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState('standard');

  const load = async () => {
    setLoading(true);
    setError(false);
    // Fallback to public endpoint if no key
    const key = import.meta.env.VITE_ALCHEMY_API_KEY || 'demo';
    try {
      const data = await fetchGasPrices(key);
      setGas(data);
    } catch {
      // Fallback: use ethgasstation-style public API
      try {
        const res = await fetch('https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=YourApiKeyToken');
        const json = await res.json();
        if (json.result?.SafeGasPrice) {
          setGas({
            slow:     parseFloat(json.result.SafeGasPrice),
            standard: parseFloat(json.result.ProposeGasPrice),
            fast:     parseFloat(json.result.FastGasPrice),
            baseFee:  parseFloat(json.result.suggestBaseFee || 0),
            updatedAt: new Date(),
          });
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleSelect = (speed) => {
    setSelected(speed);
    onSelectSpeed?.(speed, gas?.[speed]);
  };

  if (compact) {
    // Inline badge for modals
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Flame className="w-3.5 h-3.5 text-guard flex-shrink-0" />
        <span className="text-xs text-muted-foreground">Gas:</span>
        {loading && <span className="text-xs text-muted-foreground animate-pulse">fetching…</span>}
        {error && <span className="text-xs text-destructive">unavailable</span>}
        {!loading && !error && gas && Object.entries(SPEED_CONFIG).map(([speed, cfg]) => {
          const Icon = cfg.icon;
          const isSelected = selected === speed;
          return (
            <button
              key={speed}
              onClick={() => handleSelect(speed)}
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all ${
                isSelected
                  ? `${cfg.bg} ${cfg.color} ${cfg.border} font-semibold ring-1 ring-current`
                  : `bg-muted border-border text-muted-foreground hover:${cfg.bg} hover:${cfg.color}`
              }`}
            >
              <Icon className="w-3 h-3" />
              {cfg.label} {gas[speed]} Gwei
            </button>
          );
        })}
      </div>
    );
  }

  // Full card for Dashboard
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-guard" />
          <span className="text-sm font-medium text-foreground">Gas Prices</span>
          {gas?.baseFee > 0 && (
            <span className="text-xs text-muted-foreground">· Base {gas.baseFee} Gwei</span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="text-xs text-destructive py-2 text-center">Unable to fetch gas prices</div>
      )}

      {!error && (
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(SPEED_CONFIG).map(([speed, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={speed} className={`${cfg.bg} border ${cfg.border} rounded-xl p-3 text-center`}>
                <div className={`flex items-center justify-center gap-1 mb-1 ${cfg.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{cfg.label}</span>
                </div>
                {loading ? (
                  <div className="h-5 bg-muted rounded animate-pulse mx-2" />
                ) : (
                  <div className={`text-lg font-bold ${cfg.color}`}>{gas?.[speed] ?? '—'}</div>
                )}
                <div className="text-xs text-muted-foreground">Gwei</div>
              </div>
            );
          })}
        </div>
      )}

      {gas?.updatedAt && !error && (
        <div className="text-xs text-muted-foreground mt-2 text-right">
          Updated {gas.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      )}
    </div>
  );
}