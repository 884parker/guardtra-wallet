import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG = {
  pending:           { label: 'Pending',   color: 'text-muted-foreground', bg: 'bg-muted', icon: Clock },
  held:              { label: 'Paused', color: 'text-guard',           bg: 'bg-guard/10', icon: ShieldCheck },
  completed:         { label: 'Completed', color: 'text-accent',           bg: 'bg-accent/10', icon: CheckCircle },
  revoked:           { label: 'Revoked',   color: 'text-destructive',      bg: 'bg-destructive/10', icon: XCircle },
  emergency_frozen:  { label: 'Frozen',    color: 'text-destructive',      bg: 'bg-destructive/10', icon: AlertTriangle },
};

function TxRow({ tx }) {
  const isIncoming = !tx.from_wallet; // no from_wallet means it was received
  const status = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-3 py-3 border-t border-border first:border-0">
      {/* Direction icon */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isIncoming ? 'bg-accent/10' : 'bg-muted'}`}>
        {isIncoming
          ? <ArrowDownLeft className="w-4 h-4 text-accent" />
          : <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
        }
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <span>{isIncoming ? 'Received' : 'Sent'}</span>
          <span className="text-muted-foreground font-normal">·</span>
          <span>{tx.amount} {tx.asset}</span>
          {!tx.is_user_initiated && (
            <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">⚠ Unauth</span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {tx.destination_label
            ? tx.destination_label
            : tx.to_address
              ? `${tx.to_address.slice(0, 10)}...${tx.to_address.slice(-6)}`
              : tx.network || '—'}
        </div>
      </div>

      {/* Right side */}
      <div className="text-right flex-shrink-0">
        <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.color}`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}

export default function TransactionLog({ walletType, limit = 10 }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = walletType ? { from_wallet: walletType } : {};
    base44.entities.Transaction.filter(query, '-created_at', limit)
      .then(setTxs)
      .catch(() => {})
      .finally(() => setLoading(false));

    // Subscribe to real-time updates
    const unsub = base44.entities.Transaction.subscribe((event) => {
      if (event.type === 'create') {
        const tx = event.data;
        if (!walletType || tx.from_wallet === walletType) {
          setTxs(prev => [tx, ...prev].slice(0, limit));
        }
      } else if (event.type === 'update') {
        setTxs(prev => prev.map(t => t.id === event.id ? event.data : t));
      } else if (event.type === 'delete') {
        setTxs(prev => prev.filter(t => t.id !== event.id));
      }
    });

    return unsub;
  }, [walletType, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (txs.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No transactions yet</p>
      </div>
    );
  }

  return (
    <div>
      {txs.map(tx => <TxRow key={tx.id} tx={tx} />)}
    </div>
  );
}