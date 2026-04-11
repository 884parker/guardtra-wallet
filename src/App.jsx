import { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Vault from '@/pages/Vault';
import Guard from '@/pages/Guard';
import Liquidity from '@/pages/Liquidity';
import Settings from '@/pages/Settings';
import Analytics from '@/pages/Analytics';
import AssetDetail from '@/pages/AssetDetail';

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
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
