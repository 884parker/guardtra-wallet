import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = [
  'hsl(var(--vault))',
  'hsl(var(--guard))',
  'hsl(var(--liquidity))',
  'hsl(var(--primary))',
];

const WALLET_LABELS = { vault: 'Vault', guard: 'Guard', liquidity: 'Liquidity' };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-0.5">{payload[0].name}</p>
      <p className="text-sm font-semibold text-foreground">${payload[0].value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{payload[0].payload.percent}%</p>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const rad = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * rad);
  const y = cy + r * Math.sin(-midAngle * rad);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function AssetAllocationChart({ balances, ethPrice }) {
  const data = Object.entries(balances)
    .map(([wallet, bal]) => {
      const usd = (bal?.balance_eth || 0) * ethPrice + (bal?.balance_usdc || 0);
      return { name: WALLET_LABELS[wallet] || wallet, value: Math.round(usd) };
    })
    .filter(d => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  const dataWithPercent = data.map(d => ({
    ...d,
    percent: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
  }));

  if (dataWithPercent.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-center h-[220px]">
        <p className="text-sm text-muted-foreground">No balance data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-foreground">Asset Allocation</h3>
        <p className="text-xs text-muted-foreground">By wallet</p>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={dataWithPercent}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
          >
            {dataWithPercent.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 11 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}