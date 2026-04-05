import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow both scheduled (service role) and manual invocation (admin user)
  const isScheduled = req.headers.get('x-base44-scheduled') === 'true';
  if (!isScheduled) {
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const db = base44.asServiceRole;

  // Fetch active alert rules
  const rules = await db.entities.AlertRule.filter({ is_active: true });
  if (!rules.length) return Response.json({ message: 'No active alert rules', alerted: 0 });

  // Fetch recent transactions from the last 10 minutes
  const sinceMs = Date.now() - 10 * 60 * 1000;
  const allTxs = await db.entities.Transaction.list('-created_date', 50);
  const recentTxs = allTxs.filter(tx => new Date(tx.created_date).getTime() > sinceMs);

  if (!recentTxs.length) return Response.json({ message: 'No recent transactions', alerted: 0 });

  // Fetch already-alerted transaction IDs to avoid duplicates
  const existingLogs = await db.entities.AlertLog.list('-created_date', 200);
  const alertedTxIds = new Set(existingLogs.map(l => l.transaction_id).filter(Boolean));

  const newTxs = recentTxs.filter(tx => !alertedTxIds.has(tx.id));
  if (!newTxs.length) return Response.json({ message: 'All recent transactions already alerted', alerted: 0 });

  let alertCount = 0;

  for (const tx of newTxs) {
    for (const rule of rules) {
      const walletMatch = rule.wallet_type === 'all' || rule.wallet_type === tx.from_wallet;
      if (!walletMatch) continue;

      let triggered = false;
      let alertMessage = '';

      if (rule.alert_type === 'unauthorized' && tx.is_user_initiated === false) {
        triggered = true;
        alertMessage = `⚠️ Unauthorized transaction detected in ${tx.from_wallet} wallet: ${tx.amount} ${tx.asset}`;
      } else if (rule.alert_type === 'large_transaction') {
        const usd = tx.usd_value ?? 0;
        const threshold = rule.threshold_usd ?? 1000;
        if (usd >= threshold) {
          triggered = true;
          alertMessage = `🚨 Large transaction detected in ${tx.from_wallet} wallet: ${tx.amount} ${tx.asset} (~$${usd.toLocaleString()})`;
        }
      } else if (rule.alert_type === 'any_transaction') {
        triggered = true;
        alertMessage = `📡 New transaction in ${tx.from_wallet} wallet: ${tx.amount} ${tx.asset}`;
      }

      if (!triggered) continue;

      const toAddr = tx.to_address ? `${tx.to_address.slice(0, 10)}...${tx.to_address.slice(-6)}` : 'unknown';
      const emailBody = `
Guardtra Alert

${alertMessage}

Details:
  • Wallet: ${tx.from_wallet}
  • Amount: ${tx.amount} ${tx.asset}
  • USD Value: $${(tx.usd_value ?? 0).toLocaleString()}
  • Destination: ${toAddr}
  • Network: ${tx.network ?? 'N/A'}
  • Status: ${tx.status}
  • Time: ${new Date(tx.created_date).toUTCString()}

${tx.is_user_initiated === false ? '⚠️ This transaction was NOT user-initiated. Review immediately in the Guard wallet.' : ''}

Log in to Guardtra to review and take action.
      `.trim();

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: rule.email,
        subject: `[Guardtra] ${rule.alert_type === 'unauthorized' ? '🚨 ALERT' : '🔔 Notice'}: ${tx.from_wallet} wallet activity`,
        body: emailBody,
      }).catch(err => console.error('Email send failed:', err.message));

      await db.entities.AlertLog.create({
        transaction_id: tx.id,
        wallet_type: tx.from_wallet,
        alert_type: rule.alert_type,
        message: alertMessage,
        email_sent_to: rule.email,
        amount: tx.amount,
        asset: tx.asset,
        usd_value: tx.usd_value ?? 0,
      });

      alertCount++;
    }
  }

  return Response.json({ message: 'Monitor complete', alerted: alertCount, checked: newTxs.length });
});