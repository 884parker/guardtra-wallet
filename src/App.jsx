// WalletConnect/Reown removed — Guardtra uses internal programmatic transactions only
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { queryClientInstance } from '@/lib/query-client';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Vault from '@/pages/Vault';
import Guard from '@/pages/Guard';
import Liquidity from '@/pages/Liquidity';
import Settings from '@/pages/Settings';
import Analytics from '@/pages/Analytics';
import AssetDetail from '@/pages/AssetDetail';

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/Dashboard" replace />} />
            <Route path="/Dashboard" element={<Dashboard />} />
            <Route path="/Vault" element={<Vault />} />
            <Route path="/Guard" element={<Guard />} />
            <Route path="/Liquidity" element={<Liquidity />} />
            <Route path="/Settings" element={<Settings />} />
            <Route path="/Analytics" element={<Analytics />} />
            <Route path="/AssetDetail" element={<AssetDetail />} />
            <Route path="*" element={<Navigate to="/Dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;