import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Shield, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Login({ onBack }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setSuccess('Check your email for a confirmation link!');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Guardtra Wallet</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Sign in to your wallet' : 'Create your account'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{ color: '#f0f0f0', backgroundColor: '#1a1a2e' }}
                className="w-full border border-border rounded-xl pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{ color: '#f0f0f0', backgroundColor: '#1a1a2e' }}
                className="w-full border border-border rounded-xl pl-10 pr-10 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-accent/10 border border-accent/30 rounded-xl px-3 py-2 text-xs text-accent">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Google OAuth */}
        <button
          onClick={signInWithGoogle}
          className="w-full border border-border rounded-xl py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        {/* Toggle mode */}
        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }} className="text-primary hover:underline font-medium">Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }} className="text-primary hover:underline font-medium">Sign in</button></>
          )}
        </p>

        {onBack && (
          <p className="text-center">
            <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to home
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
