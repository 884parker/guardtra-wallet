import { useState, useEffect } from 'react';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function AlertBanner() {
  const [pendingCount, setPendingCount] = useState(0);
  const [unauthCount, setUnauthCount] = useState(0);

  useEffect(() => {
    base44.entities.Transaction.filter({ status: 'held' }).then(txs => {
      setPendingCount(txs.length);
      setUnauthCount(txs.filter(t => !t.is_user_initiated).length);
    });
  }, []);

  if (unauthCount === 0) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span><strong>{unauthCount} unauthorized transaction{unauthCount > 1 ? 's' : ''}</strong> detected — take action immediately</span>
        </div>
        <Link to="/Pause" className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline flex-shrink-0">
          Review <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}