'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  AtSign,
  Mail,
  Zap,
  Eye,
  EyeOff,
  Sparkles,
  Gift,
  Copy,
  Check,
  Users,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import confetti from 'canvas-confetti';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, credits, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'referrals'>('profile');

  // Profile section states
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security section states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Referral section states
  const [referralCode, setReferralCode] = useState(user?.referral_code || '');
  const [referralLink, setReferralLink] = useState('');
  const [totalReferred, setTotalReferred] = useState(user?.referral_count || 0);
  const [totalEarned, setTotalEarned] = useState(user?.referral_earnings || 0);
  const [referredFriends, setReferredFriends] = useState<Array<{ name: string; created_at: string }>>([]);
  const [copied, setCopied] = useState(false);
  const [referralsLoading, setReferralsLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch live referral stats
  const loadReferrals = async () => {
    try {
      setReferralsLoading(true);
      const res = await fetch('/api/user/referrals');
      const data = await res.json();
      if (data.success) {
        setReferralCode(data.referralCode);
        setReferralLink(data.referralLink);
        setTotalReferred(data.totalReferred);
        setTotalEarned(data.totalEarned);
        setReferredFriends(data.referredUsers || []);
      }
    } catch {
      /* fallback to local user fields */
    } finally {
      setReferralsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'referrals') {
      loadReferrals();
    }
  }, [isOpen, activeTab]);

  // Pre-fill fields whenever user changes or modal opens
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      if (user.referral_code) setReferralCode(user.referral_code);
      if (typeof window !== 'undefined') {
        const origin = window.location.origin;
        setReferralLink(`${origin}/?ref=${user.referral_code || user.username || user.id}`);
      }
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // 1. Profile Section Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    if (!name.trim()) {
      setProfileError('Name cannot be empty.');
      return;
    }

    setProfileLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error: supErr } = await supabase.auth.updateUser({
          data: {
            name: name.trim(),
            username: cleanUsername,
          },
        });
        if (supErr) {
          console.warn('Supabase updateUser note:', supErr.message);
        }
      }

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: cleanUsername,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile.');
      }

      updateProfile({
        name: name.trim(),
        username: cleanUsername,
      });

      setProfileSuccess('Profile updated successfully!');
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save profile.';
      setProfileError(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  // 2. Security Section Handler (Change Password)
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    if (!currentPassword) {
      setSecurityError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('New passwords do not match.');
      return;
    }

    setSecurityLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error: supErr } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (supErr) {
          console.warn('Supabase updateUser note:', supErr.message);
        }
      }

      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to change password.');
      }

      setSecuritySuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not update password.';
      setSecurityError(msg);
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Click backdrop to dismiss */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white text-slate-900 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
        {/* Header with Account Title and Dark/Light Mode Switcher (No Close Button) */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/70 shadow-2xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Account & Profile</h3>
              <p className="text-[11px] text-slate-400">Manage your profile and security credentials</p>
            </div>
          </div>

          {/* Dark Mode / Light Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer border border-slate-200/90 shadow-2xs"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>

        {/* User Card Overview */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 sm:px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-black text-white shadow-xs">
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user.name || user.email || 'User'}</p>
              <p className="text-[11px] text-slate-400 truncate">
                {user.username ? `@${user.username}` : user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 shadow-2xs shrink-0">
            <span className="text-xs">🪙</span>
            <span>{credits} Coins</span>
          </div>
        </div>

        {/* Section Tabs: Profile, Security, Refer & Earn */}
        <div className="flex border-b border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 py-3 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-b-2 border-[#0080ff] text-[#0080ff]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 py-3 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'border-b-2 border-[#0080ff] text-[#0080ff]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Security</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 py-3 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'referrals'
                ? 'border-b-2 border-[#0080ff] text-[#0080ff]'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Gift className="h-3.5 w-3.5 text-amber-500" />
            <span>Refer & Earn</span>
            <span className="hidden sm:inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-700">
              +5
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* ================= SECTION 1: PROFILE ================= */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-[#0080ff] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Username
                </label>
                <div className="relative flex items-center">
                  <AtSign className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                    placeholder="your_handle"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-[#0080ff] focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Used for unique profile identification and referral recognition.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Registered Email (Read-Only)
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-500 shadow-2xs cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#0080ff] hover:bg-blue-600 text-white font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {profileLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving profile...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= SECTION 2: SECURITY ================= */}
          {activeTab === 'security' && (
            <form onSubmit={handleSavePassword} className="space-y-4">
              {securityError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{securityError}</span>
                </div>
              )}

              {securitySuccess && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{securitySuccess}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Current Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-[#0080ff] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-[#0080ff] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-900 shadow-2xs placeholder:text-slate-400 focus:border-[#0080ff] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={securityLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#0080ff] hover:bg-blue-600 text-white font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {securityLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= SECTION 3: REFER & EARN ================= */}
          {activeTab === 'referrals' && (
            <div className="space-y-4">
              {/* Promo Banner with New Vibrant Gradient */}
              <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-indigo-50/70 to-blue-50/50 p-4 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xs">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Earn 5 Free Coins Per Friend! 🎁
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">
                      Share your personal link with job seekers and teammates. When they sign up, you instantly get <b>5 free coins</b> added to your account!
                    </p>
                  </div>
                </div>
              </div>

              {/* Referral Link & Copy */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  Your Personal Referral Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 font-mono text-xs text-slate-800 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && referralLink) {
                        navigator.clipboard.writeText(referralLink);
                        setCopied(true);
                        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#0080ff] hover:bg-blue-600 text-white px-4 py-2.5 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Share on Socials */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  1-Click Share
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Hey! Check out CareerBot AI for discovering top tech jobs, CV review & ATS tailoring. Sign up with my link to claim free search coins: ${referralLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `Discover top remote and tech jobs with AI. Join CareerBot AI: ${referralLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition"
                  >
                    <span>𝕏 (Twitter)</span>
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <span>LinkedIn</span>
                  </a>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-center shadow-2xs">
                  <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    <span className="text-[11px] font-bold">Friends Joined</span>
                  </div>
                  <p className="text-xl font-black text-slate-900">{totalReferred}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-center shadow-2xs">
                  <div className="flex items-center justify-center gap-1 text-amber-700 mb-1">
                    <Zap className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-[11px] font-bold">Coins Earned</span>
                  </div>
                  <p className="text-xl font-black text-amber-700">+{totalEarned}</p>
                </div>
              </div>

              {/* Recent Friends List */}
              {referredFriends.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Recent Friends Joined ({referredFriends.length})
                  </p>
                  <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1">
                    {referredFriends.map((friend, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                      >
                        <span className="font-semibold text-slate-800">{friend.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(friend.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
