'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  credits: number;
  last_free_credit_claim_at?: string;
  referral_code?: string;
  referral_count?: number;
  referral_earnings?: number;
  created_at: string;
}

interface AuthContextType {
  user: AuthUser | null;
  credits: number;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  isCreditModalOpen: boolean;
  authModalMode: 'login' | 'register' | 'forgot-request' | 'forgot-otp' | 'forgot-reset';
  openAuthModal: (mode?: 'login' | 'register' | 'forgot-request' | 'forgot-otp' | 'forgot-reset') => void;
  closeAuthModal: () => void;
  openCreditModal: () => void;
  closeCreditModal: () => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, explicitRefCode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateCredits: (newAmount: number) => void;
  updateProfile: (updatedData: { name?: string; username?: string }) => void;
  refreshUser: () => Promise<void>;
  requireAuth: (callback?: () => void) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hydrate user immediately from localStorage to eliminate blank/logged-out states during navigation
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('careerbot_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) return parsed;
        }
      } catch {
        /* ignore */
      }
    }
    return null;
  });

  const [credits, setCredits] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedCredits = localStorage.getItem('careerbot_credits');
        if (storedCredits !== null) {
          const num = Number(storedCredits);
          if (Number.isFinite(num) && num >= 0) return num;
        }
        const stored = localStorage.getItem('careerbot_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.credits === 'number' && Number.isFinite(parsed.credits) && parsed.credits >= 0) {
            return parsed.credits;
          }
        }
      } catch {
        /* ignore */
      }
    }
    return 0;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return !localStorage.getItem('careerbot_user');
      } catch {
        return true;
      }
    }
    return true;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<
    'login' | 'register' | 'forgot-request' | 'forgot-otp' | 'forgot-reset'
  >('login');

  const refreshUser = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('careerbot_token') : null;
      const headers: Record<string, string> = {};
      if (token && token !== 'undefined' && token !== 'null' && token.trim()) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const res = await fetch('/api/auth/me', { headers });
      const data = await res.json().catch(() => ({ success: false }));
      if (data.success && data.user) {
        setUser(data.user);
        const resolvedCredits =
          typeof data.user.credits === 'number' && Number.isFinite(data.user.credits) && data.user.credits >= 0
            ? data.user.credits
            : typeof data.credits === 'number' && Number.isFinite(data.credits) && data.credits >= 0
            ? data.credits
            : 0;
        setCredits(resolvedCredits);
        if (typeof window !== 'undefined') {
          localStorage.setItem('careerbot_user', JSON.stringify(data.user));
          if (data.token) {
            localStorage.setItem('careerbot_token', data.token);
          }
        }
      } else if (res.status === 401 || (res.ok && !data.user)) {
        setUser(null);
        setCredits(0);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('careerbot_user');
          localStorage.removeItem('careerbot_token');
        }
      }
    } catch {
      // Retain cached user on transient network disconnect
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Immediate hydration from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const storedCredits = localStorage.getItem('careerbot_credits');
        const num = storedCredits !== null ? Number(storedCredits) : NaN;
        const stored = localStorage.getItem('careerbot_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) {
            const initialCredits =
              Number.isFinite(num) && num >= 0
                ? num
                : typeof parsed.credits === 'number' && Number.isFinite(parsed.credits) && parsed.credits >= 0
                ? parsed.credits
                : 0;
            setUser(parsed);
            setCredits(initialCredits);
            setIsLoading(false);
          }
        }
      } catch {
        /* ignore */
      }
    }

    // Verify session with server using Authorization Bearer token and cookies
    const token = typeof window !== 'undefined' ? localStorage.getItem('careerbot_token') : null;
    const headers: Record<string, string> = {};
    if (token && token !== 'undefined' && token !== 'null' && token.trim()) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    fetch('/api/auth/me', { headers })
      .then(async (res) => {
        const data = await res.json().catch(() => ({ success: false }));
        return { ok: res.ok, status: res.status, data };
      })
      .then(({ ok, status, data }) => {
        if (!isMounted) return;
        if (data.success && data.user) {
          setUser(data.user);
          const resolvedCredits =
            typeof data.user.credits === 'number' && Number.isFinite(data.user.credits) && data.user.credits >= 0
              ? data.user.credits
              : typeof data.credits === 'number' && Number.isFinite(data.credits) && data.credits >= 0
              ? data.credits
              : 0;
          setCredits(resolvedCredits);
          if (typeof window !== 'undefined') {
            localStorage.setItem('careerbot_user', JSON.stringify(data.user));
            if (data.token) {
              localStorage.setItem('careerbot_token', data.token);
            }
          }
        } else if (status === 401 || (ok && !data.user)) {
          setUser(null);
          setCredits(0);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('careerbot_user');
            localStorage.removeItem('careerbot_token');
          }
        }
      })
      .catch(() => {
        // Keep cached user if offline / network error
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // Cross-tab synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'careerbot_user') {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            const storageCredits =
              typeof parsed.credits === 'number' && Number.isFinite(parsed.credits) && parsed.credits >= 0
                ? parsed.credits
                : 0;
            setUser(parsed);
            setCredits(storageCredits);
          } catch {
            /* ignore */
          }
        } else {
          setUser(null);
          setCredits(0);
        }
      } else if (e.key === 'careerbot_credits' && e.newValue) {
        const num = Number(e.newValue);
        if (Number.isFinite(num) && num >= 0) {
          setCredits(num);
          setUser((prev) => (prev ? { ...prev, credits: num } : null));
        }
      } else if (e.key === 'careerbot_token' && !e.newValue) {
        // Session token was cleared in another tab (logout)
        setUser(null);
        setCredits(0);
      }
    };

    // Same-window cross-component synchronization
    const handleCreditSync = (e: Event) => {
      const custom = e as CustomEvent<number>;
      if (typeof custom.detail === 'number' && Number.isFinite(custom.detail) && custom.detail >= 0) {
        setCredits(custom.detail);
        setUser((prev) => (prev ? { ...prev, credits: custom.detail } : null));
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('careerbot_credit_sync', handleCreditSync);
    }

    // Listen for Supabase password recovery events from email links
    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/reset-password')) {
              window.location.href = '/auth/reset-password';
            }
          }
        });

        // Cleanup listener on unmount
        return () => {
          isMounted = false;
          if (typeof window !== 'undefined') {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('careerbot_credit_sync', handleCreditSync);
          }
          authListener?.subscription?.unsubscribe();
        };
      }
    } catch {
      /* silent */
    }

    // Check if user landed on page with recovery hash/query or referral code
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        if (!window.location.pathname.startsWith('/auth/reset-password')) {
          window.location.href = '/auth/reset-password' + (hash || search);
        }
      }

      // Capture referral code if present in URL and automatically open registration modal
      const params = new URLSearchParams(search);
      const refParam = params.get('ref');
      if (refParam) {
        let clean = refParam.trim();
        if (clean.includes('ref=')) clean = clean.split('ref=')[1].split('&')[0];
        clean = clean.replace(/^@/, '').replace(/\/$/, '').trim();
        if (clean) {
          localStorage.setItem('careerbot_ref_code', clean);
          document.cookie = `careerbot_ref=${encodeURIComponent(clean)}; path=/; max-age=2592000; SameSite=Lax`;
          setAuthModalMode('register');
          setIsAuthModalOpen(true);
        }
      }
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('careerbot_credit_sync', handleCreditSync);
      }
    };
  }, []);

  const openAuthModal = useCallback(
    (mode: 'login' | 'register' | 'forgot-request' | 'forgot-otp' | 'forgot-reset' = 'login') => {
      setAuthModalMode(mode);
      setIsAuthModalOpen(true);
    },
    []
  );

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const openCreditModal = useCallback(() => {
    setIsCreditModalOpen(true);
  }, []);

  const closeCreditModal = useCallback(() => {
    setIsCreditModalOpen(false);
  }, []);

  const updateCredits = useCallback((newAmount: number) => {
    const safeAmount =
      typeof newAmount === 'number' && Number.isFinite(newAmount) && newAmount >= 0 ? newAmount : 0;
    setCredits(safeAmount);
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, credits: safeAmount };
      if (typeof window !== 'undefined') {
        localStorage.setItem('careerbot_user', JSON.stringify(updated));
        localStorage.setItem('careerbot_credits', String(safeAmount));
      }
      return updated;
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('careerbot_credit_sync', { detail: safeAmount }));
    }
  }, []);

  const updateProfile = useCallback((updatedData: { name?: string; username?: string }) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        name: updatedData.name !== undefined ? updatedData.name : prev.name,
        username: updatedData.username !== undefined ? updatedData.username : prev.username,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('careerbot_user', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to sign in' };
      }

      const resolvedCredits =
        typeof data.user?.credits === 'number' && Number.isFinite(data.user.credits) && data.user.credits >= 0
          ? data.user.credits
          : 0;

      setUser(data.user);
      setCredits(resolvedCredits);
      if (typeof window !== 'undefined') {
        localStorage.setItem('careerbot_user', JSON.stringify(data.user));
        localStorage.setItem('careerbot_credits', String(resolvedCredits));
        window.dispatchEvent(new CustomEvent('careerbot_credit_sync', { detail: resolvedCredits }));
        if (data.token) {
          localStorage.setItem('careerbot_token', data.token);
        }
      }
      setIsAuthModalOpen(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, explicitRefCode?: string) => {
    try {
      const storedRef = typeof window !== 'undefined' ? localStorage.getItem('careerbot_ref_code') : null;
      const refCode = (explicitRefCode && explicitRefCode.trim()) || storedRef;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          ref_code: refCode || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to create account' };
      }

      const resolvedCredits =
        typeof data.user?.credits === 'number' && Number.isFinite(data.user.credits) && data.user.credits >= 0
          ? data.user.credits
          : 25;

      if (typeof window !== 'undefined') {
        localStorage.removeItem('careerbot_ref_code');
        localStorage.setItem('careerbot_user', JSON.stringify(data.user));
        localStorage.setItem('careerbot_credits', String(resolvedCredits));
        window.dispatchEvent(new CustomEvent('careerbot_credit_sync', { detail: resolvedCredits }));
        if (data.token) {
          localStorage.setItem('careerbot_token', data.token);
        }
      }

      setUser(data.user);
      setCredits(resolvedCredits);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('careerbot_token') : null;
      const headers: Record<string, string> = {};
      if (token && token !== 'undefined' && token !== 'null' && token.trim()) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }
      await fetch('/api/auth/logout', { method: 'POST', headers });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setCredits(0);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('careerbot_user');
        localStorage.removeItem('careerbot_token');
      }
    }
  }, []);

  const requireAuth = useCallback(
    (callback?: () => void): boolean => {
      if (!user) {
        openAuthModal('login');
        return false;
      }
      if (callback) callback();
      return true;
    },
    [user, openAuthModal]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        credits,
        isAuthenticated: !!user,
        isLoading,
        isAuthModalOpen,
        isCreditModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        openCreditModal,
        closeCreditModal,
        login,
        register,
        logout,
        updateCredits,
        updateProfile,
        refreshUser,
        requireAuth,
      }}
    >
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
