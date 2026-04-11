import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG = {
  pending:          { label: 'Pending',   color: 'text-muted-foreground', bg: 'bg-muted',            Icon: Clock        },
  held:             { label: '24h Hold',  color: 'text-guard',            bg: 'bg-guard/10',         Icon: ShieldCheck  },
  completed:        { label: 'Completed', color: 'text-accent',           bg: 'bg-accent/10',        Icon: CheckCircle  },
  revoked:          { label: 'Revoked',   color: 'text-destructive',      bg: 'bg-destructive/10',   Icon: XCircle      },
  emergency_frozen: { label: 'Frozen',    color: 'text-destructive',      bg: 'bg-destructive/10',   Icon: AlertTriangle},
};

export default function AssetTransactions({ asset }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Transaction.filter({ asset }, '-created_at', 50)
      .then(setTxs)
      .finally(() => setLoading(false));
  }, [asset]);

  if (loading) return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (txs.length === 0) return (
    <div className="bg-card border border-border rounded-2xl p-5 text-center">
      <Clock className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">No {asset} transactions yet</p>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">{asset} Transactions</h3>
      <div className="space-y-0 divide-y divide-border">
        {txs.map(tx => {
          const status = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
          const { Icon: StatusIcon } = status;
          return (
            <div key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.is_user_initiated ? 'bg-muted' : 'bg-destructive/10'}`}>
                <ArrowUpRight className={`w-4 h-4 ${tx.is_user_initiated ? 'text-muted-foreground' : 'text-destructive'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <span>{tx.amount} {tx.asset}</span>
                  {!tx.is_user_initiated && <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">⚠ Unauth</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {tx.destination_label || (tx.to_address ? `${tx.to_address.slice(0,10)}…${tx.to_address.slice(-6)}` : tx.network || '—')}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </div>
                {tx.usd_value > 0 && <p className="text-xs text-muted-foreground mt-0.5">${tx.usd_value.toLocaleString()}</p>}
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}