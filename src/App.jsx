import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import SetupWizard from '@/pages/SetupWizard';
import Dashboard from '@/pages/Dashboard';
import Vault from '@/pages/Vault';
import Guard from '@/pages/Guard';
import Liquidity from '@/pages/Liquidity';
import Settings from '@/pages/Settings';
import Analytics from '@/pages/Analytics';
import AssetDetail from '@/pages/AssetDetail';
import { base44 } from '@/api/base44Client';

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || isLoadingAuth) return;
    base44.entities.WalletProfile.list().then(profiles => {
      setNeedsSetup(!profiles || profiles.length === 0);
      setCheckingSetup(false);
    }).catch(() => {
      setNeedsSetup(true);
      setCheckingSetup(false);
    });
  }, [isAuthenticated, isLoadingAuth]);

  if (isLoadingAuth || (isAuthenticated && checkingSetup)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Show setup wizard fullscreen (no sidebar/nav)
  if (needsSetup) {
    return <SetupWizard onComplete={() => { window.location.href = '/Dashboard'; }} />;
  }

  return (
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
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthProvider>
          <AuthenticatedApp />
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
