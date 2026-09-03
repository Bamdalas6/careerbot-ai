'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  credits: number;
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
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateCredits: (newAmount: number) => void;
  updateProfile: (updatedData: { name?: string; username?: string }) => void;
  refreshUser: () => Promise<void>;
  requireAuth: (callback?: () => void) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<
    'login' | 'register' | 'forgot-request' | 'forgot-otp' | 'forgot-reset'
  >('login');

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        setCredits(data.user.credits ?? data.credits ?? 0);
      } else {
        setUser(null);
        setCredits(0);
      }
    } catch {
      setUser(null);
      setCredits(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.user) {
          setUser(data.user);
          setCredits(data.user.credits ?? data.credits ?? 0);
        } else {
          setUser(null);
          setCredits(0);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setCredits(0);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

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

      // Capture referral code if present in URL
      const params = new URLSearchParams(search);
      const refParam = params.get('ref');
      if (refParam) {
        localStorage.setItem('careerbot_ref_code', refParam.trim());
      }
    }

    return () => {
      isMounted = false;
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
    setCredits(newAmount);
    setUser((prev) => (prev ? { ...prev, credits: newAmount } : null));
  }, []);

  const updateProfile = useCallback((updatedData: { name?: string; username?: string }) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        name: updatedData.name !== undefined ? updatedData.name : prev.name,
        username: updatedData.username !== undefined ? updatedData.username : prev.username,
      };
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

      setUser(data.user);
      setCredits(data.user.credits ?? 0);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const refCode = typeof window !== 'undefined' ? localStorage.getItem('careerbot_ref_code') : null;
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

      if (typeof window !== 'undefined') {
        localStorage.removeItem('careerbot_ref_code');
      }

      setUser(data.user);
      setCredits(data.user.credits ?? 25);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setCredits(0);
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
