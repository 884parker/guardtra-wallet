import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { guardThresholdETH = 5, manualCheck = false } = body;

  const alerts = [];

  // 1. Unauthorized transactions
  const allTxs = await base44.asServiceRole.entities.Transaction.filter({});
  const unauthorized = allTxs.filter(t =>
    !t.is_user_initiated && ['pending', 'held'].includes(t.status)
  );
  for (const tx of unauthorized) {
    alerts.push({
      type: 'unauthorized_transaction',
      severity: 'critical',
      message: `Unauthorized transaction detected: ${tx.amount} ${tx.asset} to ${tx.to_address?.slice(0,10)}…`,
      transaction_id: tx.id,
      asset: tx.asset,
      amount: tx.amount,
      usd_value: tx.usd_value || 0,
    });
  }

  // 2. High-value transactions (>$10k)
  const highValue = allTxs.filter(t =>
    t.is_user_initiated && t.usd_value > 10000 && t.status === 'held'
  );
  for (const tx of highValue) {
    alerts.push({
      type: 'high_value_transaction',
      severity: 'warning',
      message: `High-value transfer held in Guard: $${tx.usd_value?.toLocaleString()} (${tx.amount} ${tx.asset})`,
      transaction_id: tx.id,
      asset: tx.asset,
      amount: tx.amount,
      usd_value: tx.usd_value,
    });
  }

  // 3. Guard wallet balance threshold — uses Sepolia for testing
  const guardProfiles = await base44.asServiceRole.entities.WalletProfile.filter({ wallet_type: 'guard' });
  if (guardProfiles.length > 0 && guardProfiles[0].address) {
    const alchemyKey = Deno.env.get('ALCHEMY_API_KEY') || 'demo';
    const rpc = `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`;
    try {
      const res = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'eth_getBalance',
          params: [guardProfiles[0].address, 'latest']
        }),
      });
      const data = await res.json();
      const balanceETH = parseInt(data.result, 16) / 1e18;
      if (balanceETH > guardThresholdETH) {
        alerts.push({
          type: 'guard_threshold_exceeded',
          severity: 'warning',
          message: `Guard wallet balance ${balanceETH.toFixed(4)} ETH exceeds threshold of ${guardThresholdETH} ETH`,
          balance_eth: balanceETH,
          threshold_eth: guardThresholdETH,
        });
      }
    } catch (_) { /* balance check optional */ }
  }

  // 4. Send email if critical alerts found
  if ((manualCheck || unauthorized.length > 0) && alerts.some(a => a.severity === 'critical')) {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const emailBody = `
<h2 style="color:#dc2626">⚠️ Guardtra Security Alert</h2>
<p>The following critical issues were detected on your account:</p>
<ul>
${criticalAlerts.map(a => `<li><strong>${a.message}</strong></li>`).join('\n')}
</ul>
<p>Please log in immediately to review and take action.</p>
<p style="color:#6b7280;font-size:12px">This alert was generated automatically by Guardtra.</p>
    `.trim();

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      subject: `🚨 Guardtra: ${criticalAlerts.length} Critical Alert${criticalAlerts.length > 1 ? 's' : ''} Detected`,
      body: emailBody,
    });
  }

  return Response.json({ alerts, checked_at: new Date().toISOString() });
});