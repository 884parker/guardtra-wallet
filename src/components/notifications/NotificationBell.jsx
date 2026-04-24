import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, AlertTriangle, ShieldAlert, TrendingUp, CheckCircle, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const SEVERITY_CONFIG = {
  critical: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', Icon: ShieldAlert },
  warning:  { color: 'text-guard',       bg: 'bg-guard/10',       border: 'border-guard/30',       Icon: AlertTriangle },
  info:     { color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/20',     Icon: TrendingUp },
};

function useDesktopNotifications() {
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const send = useCallback((title, body, severity = 'warning') => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico', tag: severity });
    }
  }, []);

  return { requestPermission, send };
}

export default function NotificationBell({ guardThresholdETH = 5 }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const prevCriticalCount = useRef(0);
  const navigate = useNavigate();
  const { requestPermission, send } = useDesktopNotifications();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('monitorAlerts', { guardThresholdETH });
      const newAlerts = (res.data?.alerts || []).map((a, i) => ({
        ...a,
        id: a.transaction_id || `${a.type}-${i}`,
        timestamp: new Date(),
      }));

      // Desktop notifications for new critical alerts
      const newCritical = newAlerts.filter(a => a.severity === 'critical' && !dismissed.has(a.id));
      if (newCritical.length > prevCriticalCount.current) {
        newCritical.slice(prevCriticalCount.current).forEach(a => send('🚨 Pause Wallet Alert', a.message, a.severity));
      }
      prevCriticalCount.current = newCritical.length;

      setAlerts(newAlerts);
    } catch (_) {}
    setLoading(false);
  }, [guardThresholdETH, dismissed, send]);

  useEffect(() => {
    requestPermission();
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  const criticalCount = visible.filter(a => a.severity === 'critical').length;
  const totalCount = visible.length;

  const dismiss = (id) => setDismissed(prev => new Set([...prev, id]));
  const dismissAll = () => setDismissed(new Set(alerts.map(a => a.id)));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
      >
        <Bell className={`w-5 h-5 ${criticalCount > 0 ? 'text-destructive' : ''}`} />
        {totalCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full px-1 ${
            criticalCount > 0 ? 'bg-destructive text-white' : 'bg-guard text-guard-foreground'
          }`}>
            {totalCount}
          </span>
        )}
        {criticalCount > 0 && (
          <span className="absolute inset-0 rounded-xl bg-destructive/20 animate-ping pointer-events-none" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-foreground" />
                <span className="text-sm font-semibold text-foreground">Alerts</span>
                {loading && <span className="text-xs text-muted-foreground animate-pulse">checking…</span>}
              </div>
              <div className="flex items-center gap-2">
                {visible.length > 0 && (
                  <button onClick={dismissAll} className="text-xs text-muted-foreground hover:text-foreground">
                    Clear all
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Alerts list */}
            <div className="max-h-96 overflow-y-auto">
              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <CheckCircle className="w-8 h-8 text-accent mb-2" />
                  <p className="text-sm text-foreground font-medium">All clear</p>
                  <p className="text-xs text-muted-foreground mt-1">No suspicious activity detected</p>
                </div>
              ) : (
                visible.map(alert => {
                  const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
                  const { Icon } = cfg;
                  return (
                    <div key={alert.id} className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 ${cfg.bg}`}>
                      <div className={`mt-0.5 flex-shrink-0 ${cfg.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-snug ${cfg.color}`}>
                          {alert.severity === 'critical' ? '🚨 ' : '⚠️ '}
                          {alert.type === 'unauthorized_transaction' ? 'Unauthorized Transaction' :
                           alert.type === 'high_value_transaction'   ? 'High-Value Transfer' :
                           alert.type === 'guard_threshold_exceeded'  ? 'Pause Threshold Exceeded' : 'Alert'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{alert.message}</p>
                        {alert.transaction_id && (
                          <button
                            onClick={() => { navigate('/Pause'); setOpen(false); }}
                            className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Review in Pause
                          </button>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                      <button onClick={() => dismiss(alert.id)} className="flex-shrink-0 p-1 rounded hover:bg-muted/60 text-muted-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer — manual re-check */}
            <div className="px-4 py-2.5 border-t border-border bg-muted/30">
              <button
                onClick={fetchAlerts}
                disabled={loading}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {loading ? 'Scanning…' : '↻ Scan now'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}