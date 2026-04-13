import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layers, Zap, Activity, Settings, BarChart2, Shield, ShieldCheck } from 'lucide-react';
import AlertBanner from './AlertBanner';
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton';
import NotificationBell from '@/components/notifications/NotificationBell';

const navItems = [
  { path: '/Dashboard', icon: Layers, label: 'Dashboard' },
  { path: '/Vault', icon: Shield, label: 'Vault' },
  { path: '/Guard', icon: Activity, label: 'Guard' },
  { path: '/Liquidity', icon: Zap, label: 'Liquidity' },
  { path: '/Recovery', icon: ShieldCheck, label: 'Recovery' },
  { path: '/Analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/Settings', icon: Settings, label: 'Settings' },
];

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
            </div>
            <span className="font-semibold text-foreground tracking-tight">Guardtra</span>
          </div>
          <div className="flex items-center gap-2">
            <ConnectWalletButton />
            <NotificationBell guardThresholdETH={5} />
          </div>
        </div>
      </header>

      <AlertBanner />

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0 z-50 md:hidden">
        <div className="flex">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Side nav for desktop */}
      <div className="hidden md:flex fixed left-0 top-16 bottom-0 w-56 border-r border-border bg-card/40 flex-col py-4 px-3 gap-1 z-40">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}