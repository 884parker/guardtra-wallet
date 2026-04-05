import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function generateHistory(currentTotal) {
  // Simulate 30-day history ending at currentTotal
  const data = [];
  let value = currentTotal * 0.72;
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 3600 * 1000);
    const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const change = (Math.random() - 0.42) * currentTotal * 0.04;
    value = Math.max(value + change, currentTotal * 0.5);
    data.push({ date: label, value: Math.round(value) });
  }
  // Ensure last point matches current total
  data[data.length - 1].value = Math.round(currentTotal);
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

export default function PortfolioChart({ totalUSD }) {
  const data = useMemo(() => generateHistory(totalUSD || 10000), [totalUSD]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">Portfolio Value</h3>
          <p className="text-xs text-muted-foreground">30-day overview</p>
        </div>
        <span className="text-xs bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full">
          +{totalUSD > 0 ? ((1 - 0.72) / 0.72 * 100).toFixed(1) : '0.0'}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={6}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}