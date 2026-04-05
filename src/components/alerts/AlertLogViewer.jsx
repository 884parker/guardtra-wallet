import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Bell, ShieldAlert, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  large_transaction: { icon: Bell, color: 'text-guard', bg: 'bg-guard/10', label: 'Large Tx' },
  unauthorized:      { icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Unauthorized' },
  any_transaction:   { icon: Bell, color: 'text-primary', bg: 'bg-primary/10', label: 'Activity' },
};

export default function AlertLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AlertLog.list('-created_date', 20).then(setLogs).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Recent Alerts Sent</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Last 20 notifications dispatched</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No alerts have been sent yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const cfg = TYPE_CONFIG[log.alert_type] || TYPE_CONFIG.any_transaction;
            const Icon = cfg.icon;
            return (
              <div key={log.id} className="flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-muted-foreground capitalize">{log.wallet_type}</span>
                  </div>
                  <p className="text-sm text-foreground mt-1">{log.message}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>→ {log.email_sent_to}</span>
                    {log.created_date && <span>{formatDistanceToNow(new Date(log.created_date), { addSuffix: true })}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}