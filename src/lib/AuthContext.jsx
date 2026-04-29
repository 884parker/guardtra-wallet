import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Security: clear any persisted session on fresh page load.
    // Wallet users must always sign in — no auto-resume from localStorage.
    supabase.auth.signOut().then(() => {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 20-minute inactivity auto-logout
  useEffect(() => {
    if (!isAuthenticated) return;

    const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
    let timer = setTimeout(() => logout(), TIMEOUT_MS);

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => logout(), TIMEOUT_MS);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated]);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (session?.user) {
        // Verify the user still exists (token may be stale after DB wipe)
        const { data: { user: validUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !validUser) {
          await supabase.auth.signOut();
          setUser(null);
          setIsAuthenticated(false);
        } else {
          setUser(validUser);
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      console.error('Session check failed:', err);
      setAuthError({ type: 'auth_required', message: err.message });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      logout,
      signIn,
      signUp,
      signInWithGoogle,
      navigateToLogin: () => {}, // Handled by routing now
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
