import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell, Tooltip as PieTooltip
} from 'recharts';
import { format, subDays } from 'date-fns';

const WALLET_COLORS = {
  vault: 'hsl(265 80% 60%)',
  guard: 'hsl(38 95% 55%)',
  liquidity: 'hsl(172 66% 50%)',
};

const ASSET_COLORS = ['hsl(198 93% 60%)', 'hsl(38 95% 55%)', 'hsl(172 66% 50%)', 'hsl(265 80% 60%)'];

function CustomLineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 text-xs shadow-xl">
      <p className="text-muted-foreground mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize text-foreground">{p.dataKey}:</span>
          <span className="font-semibold text-foreground">${p.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 text-xs shadow-xl">
      <p className="font-semibold text-foreground">{d.name}</p>
      <p className="text-muted-foreground">${d.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
      <p className="text-primary">{d.payload.percent}%</p>
    </div>
  );
}

function generateHistory(currentUSD, days = 30) {
  const data = [];
  let val = currentUSD * 0.85;
  for (let i = days; i >= 0; i--) {
    val = val + (Math.random() - 0.46) * val * 0.03;
    data.push({ date: format(subDays(new Date(), i), 'MMM d'), value: Math.max(0, Math.round(val)) });
  }
  // anchor last point to real value
  data[data.length - 1].value = Math.round(currentUSD);
  return data;
}

export default function Analytics() {
  const [balances, setBalances] = useState({});
  const [ethPrice, setEthPrice] = useState(2450);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [profiles, priceRes] = await Promise.all([
        base44.entities.WalletProfile.list().catch(() => []),
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd').catch(() => null),
      ]);
      const priceData = priceRes ? await priceRes.json().catch(() => null) : null;
      const price = priceData?.ethereum?.usd;
      if (price && price > 0 && price < 100000) setEthPrice(price);

      const results = await Promise.all(
        profiles.map(p => p.address
          ? base44.functions.invoke('getWalletBalance', { address: p.address }).catch(() => null)
          : null
        )
      );
      const b = {};
      profiles.forEach((p, i) => {
        const data = results[i]?.data;
        if (data) b[p.wallet_type] = data;
      });
      setBalances(b);
      setLoading(false);
    }
    load();
  }, []);

  const getUSD = (type) => {
    const b = balances[type];
    if (!b) return 0;
    return (b.balance_eth ?? 0) * ethPrice + (b.balance_usdc ?? 0);
  };

  const vaultUSD = getUSD('vault');
  const guardUSD = getUSD('guard');
  const liquidityUSD = getUSD('liquidity');
  const totalUSD = vaultUSD + guardUSD + liquidityUSD;

  // Line chart — simulated 30-day history per wallet
  const historyData = (() => {
    if (totalUSD === 0) return [];
    const vHist = generateHistory(vaultUSD);
    const gHist = generateHistory(guardUSD);
    const lHist = generateHistory(liquidityUSD);
    return vHist.map((d, i) => ({
      date: d.date,
      vault: vHist[i].value,
      guard: gHist[i].value,
      liquidity: lHist[i].value,
    }));
  })();

  // Pie chart — asset distribution across all wallets
  const ethTotal = ['vault', 'guard', 'liquidity'].reduce((s, t) => s + (balances[t]?.balance_eth ?? 0), 0);
  const usdcTotal = ['vault', 'guard', 'liquidity'].reduce((s, t) => s + (balances[t]?.balance_usdc ?? 0), 0);

  const pieData = [
    { name: 'ETH', value: Math.round(ethTotal * ethPrice) },
    { name: 'USDC', value: Math.round(usdcTotal) },
  ].filter(d => d.value > 0).map((d, _, arr) => {
    const tot = arr.reduce((s, x) => s + x.value, 0);
    return { ...d, percent: tot > 0 ? Math.round((d.value / tot) * 100) : 0 };
  });

  // Wallet allocation pie
  const walletPie = [
    { name: 'Vault', value: Math.round(vaultUSD) },
    { name: 'Guard', value: Math.round(guardUSD) },
    { name: 'Liquidity', value: Math.round(liquidityUSD) },
  ].filter(d => d.value > 0).map((d, _, arr) => {
    const tot = arr.reduce((s, x) => s + x.value, 0);
    return { ...d, percent: tot > 0 ? Math.round((d.value / tot) * 100) : 0 };
  });

  return (
    <div className="md:ml-56 space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h1 className="text-xl font-bold text-foreground mb-1">Analytics</h1>
        <p className="text-sm text-muted-foreground">Portfolio performance and asset distribution across all wallets</p>
        {!loading && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Vault', usd: vaultUSD, color: 'text-vault' },
              { label: 'Guard', usd: guardUSD, color: 'text-guard' },
              { label: 'Liquidity', usd: liquidityUSD, color: 'text-liquidity' },
            ].map(w => (
              <div key={w.label} className="bg-muted/40 rounded-xl p-3 text-center">
                <div className={`text-lg font-bold ${w.color}`}>${w.usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{w.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Balance History Line Chart */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-foreground mb-1">30-Day Balance History</h2>
            <p className="text-xs text-muted-foreground mb-5">Simulated trend based on current on-chain balances</p>
            {totalUSD === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No wallet balances found. Add wallet addresses in Settings.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={historyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 18%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={50} />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Line type="monotone" dataKey="vault" stroke={WALLET_COLORS.vault} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="guard" stroke={WALLET_COLORS.guard} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="liquidity" stroke={WALLET_COLORS.liquidity} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Asset Distribution */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-1">Asset Distribution</h2>
              <p className="text-xs text-muted-foreground mb-4">By token type across all wallets</p>
              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={ASSET_COLORS[i % ASSET_COLORS.length]} />)}
                      </Pie>
                      <PieTooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-2">
                    {pieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: ASSET_COLORS[i % ASSET_COLORS.length] }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold text-foreground">{d.percent}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Wallet Allocation */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-1">Wallet Allocation</h2>
              <p className="text-xs text-muted-foreground mb-4">USD value split across wallets</p>
              {walletPie.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No data</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={walletPie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {walletPie.map((d, i) => (
                          <Cell key={i} fill={WALLET_COLORS[d.name.toLowerCase()] || ASSET_COLORS[i]} />
                        ))}
                      </Pie>
                      <PieTooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-2">
                    {walletPie.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: WALLET_COLORS[d.name.toLowerCase()] }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold text-foreground">{d.percent}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}