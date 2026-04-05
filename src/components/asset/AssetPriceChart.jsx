import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const SEED_PRICES = { ETH: 2450, BTC: 62000, USDC: 1, MATIC: 0.85 };
const VOLATILITY  = { ETH: 0.035, BTC: 0.04, USDC: 0.001, MATIC: 0.055 };

function buildHistory(asset) {
  const base = SEED_PRICES[asset] || 1;
  const vol  = VOLATILITY[asset]  || 0.03;
  const data = [];
  let price = base * 0.78;
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const date  = new Date(now - i * 24 * 3600 * 1000);
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    price = Math.max(price + (Math.random() - 0.44) * base * vol, base * 0.5);
    data.push({ date: label, price: parseFloat(price.toFixed(asset === 'BTC' ? 0 : 4)) });
  }
  data[data.length - 1].price = base;
  return data;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-primary">${payload[0].value.toLocaleString()}</p>
    </div>
  );
};

export default function AssetPriceChart({ asset }) {
  const data = useMemo(() => buildHistory(asset), [asset]);
  const first = data[0]?.price || 1;
  const last  = data[data.length - 1]?.price || 1;
  const pct   = (((last - first) / first) * 100).toFixed(2);
  const up    = parseFloat(pct) >= 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-foreground">{asset} / USD — 30 Days</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${up ? 'bg-accent/10 text-accent border-accent/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
          {up ? '+' : ''}{pct}%
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground mb-4">${last.toLocaleString()}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="price" stroke={up ? 'hsl(var(--accent))' : 'hsl(var(--destructive))'} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}