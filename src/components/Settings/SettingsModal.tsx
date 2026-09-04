'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
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
  Share2,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import confetti from 'canvas-confetti';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, credits, updateProfile } = useAuth();

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
        setReferralLink(`${origin}?ref=${user.referral_code || user.username || user.id.slice(0, 8)}`);
      }
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // 1. Profile Section Handler (Change Name & Username)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileError('Please provide your full name.');
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

    try {
      // Step A: Update Supabase Auth user metadata
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error: metaErr } = await supabase.auth.updateUser({
          data: {
            name: name.trim(),
            username: cleanUsername,
          },
        });
        if (metaErr) {
          console.warn('Supabase metadata update note:', metaErr.message);
        }
      }

      // Step B: Update backend database 'users' table
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
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

      // Step C: Update UI immediately via context
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
      // Step A: Update password using Supabase client for active session
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error: supErr } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (supErr) {
          console.warn('Supabase updateUser note:', supErr.message);
        }
      }

      // Step B: Update password in backend database (verifying current password)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-black/10 bg-white text-zinc-900 shadow-2xl dark:border-white/[0.1] dark:bg-[#0c0c0c] dark:text-[#f7f8f8]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-zinc-50 px-6 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-black/[0.04] text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f7f8f8]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">Account Settings</h3>
              <p className="text-[11px] text-zinc-500 dark:text-[#8a8f98]">Manage your profile and security credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/[0.06] hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:bg-white/[0.06] dark:hover:text-[#f7f8f8] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User Card Overview */}
        <div className="flex items-center justify-between border-b border-black/10 bg-zinc-50/50 px-6 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-bold text-white shadow-xs dark:bg-white dark:text-black">
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-[#f7f8f8]">{user.name || user.email || 'User'}</p>
              <p className="text-[11px] text-zinc-500 dark:text-[#8a8f98]">
                {user.username ? `@${user.username}` : user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <Zap className="h-3.5 w-3.5" />
            <span>{credits} Credits</span>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex border-b border-black/10 bg-zinc-50/30 dark:border-white/[0.08] dark:bg-white/[0.01]">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 py-3 text-xs font-semibold transition ${
              activeTab === 'profile'
                ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-white dark:text-[#f7f8f8]'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 py-3 text-xs font-semibold transition ${
              activeTab === 'security'
                ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-white dark:text-[#f7f8f8]'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Security</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`flex flex-1 items-center justify-center gap-1.5 sm:gap-2 py-3 text-xs font-semibold transition ${
              activeTab === 'referrals'
                ? 'border-b-2 border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
            }`}
          >
            <Gift className="h-3.5 w-3.5 text-amber-500" />
            <span>Refer & Earn</span>
            <span className="hidden sm:inline-block rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              +5
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* ================= SECTION 1: PROFILE ================= */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  Username
                </label>
                <div className="relative flex items-center">
                  <AtSign className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                    placeholder="your_handle"
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                  />
                </div>
                <p className="mt-1 text-[10px] text-zinc-400 dark:text-[#8a8f98]">
                  Used for unique profile identification and cold outreach handles.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  Registered Email (Read-Only)
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-100 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-zinc-500 shadow-xs cursor-not-allowed dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-[#8a8f98]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="btn-primary mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold disabled:opacity-40"
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
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span>{securityError}</span>
                </div>
              )}

              {securitySuccess && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{securitySuccess}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  Current Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-700 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-700 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-zinc-400 dark:text-[#8a8f98]" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-10 text-xs sm:text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:placeholder:text-[#62666d]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-zinc-400 hover:text-zinc-700 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={securityLoading}
                className="btn-primary mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold disabled:opacity-40"
              >
                {securityLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Change Password</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= SECTION 3: REFER & EARN ================= */}
          {activeTab === 'referrals' && (
            <div className="space-y-4">
              {/* Promo Banner */}
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-4 dark:border-amber-500/15">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                      Get 10 Free Tokens Per Friend! 🎁
                    </h4>
                    <p className="mt-1 text-[11px] text-zinc-600 dark:text-[#8a8f98] leading-relaxed">
                      Share your personal referral link with job seekers and colleagues. Whenever someone signs up using your link, you instantly get <b>10 free tokens</b> added to your account!
                    </p>
                  </div>
                </div>
              </div>

              {/* Referral Link & Copy */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  Your Personal Referral Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="w-full rounded-xl border border-zinc-300 bg-zinc-50 py-2.5 px-3.5 font-mono text-xs text-zinc-700 select-all dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8]"
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
                    className="btn-primary flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
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
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98]">
                  1-Click Share
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Hey! Check out CareerBot AI for discovering top tech jobs, CV review & ATS tailoring in Nigeria & globally. Sign up with my link to claim your bonus: ${referralLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/10 transition"
                  >
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `Discover top tech & remote jobs with AI. Join CareerBot AI: ${referralLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-500/5 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-500/10 dark:text-sky-400 dark:hover:bg-sky-500/10 transition"
                  >
                    <span>𝕏 (Twitter)</span>
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/10 transition"
                  >
                    <span>LinkedIn</span>
                  </a>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-black/10 bg-zinc-50/70 p-3 text-center dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <div className="flex items-center justify-center gap-1 text-zinc-500 dark:text-[#8a8f98] mb-1">
                    <Users className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-medium">Friends Joined</span>
                  </div>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">{totalReferred}</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center dark:border-amber-500/10">
                  <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 mb-1">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-medium">Tokens Earned</span>
                  </div>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">+{totalEarned}</p>
                </div>
              </div>

              {/* Recent Friends List */}
              {referredFriends.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-[#8a8f98] mb-2">
                    Recent Friends Joined ({referredFriends.length})
                  </p>
                  <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1">
                    {referredFriends.map((friend, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-black/5 bg-zinc-50/50 px-3 py-1.5 text-xs dark:border-white/[0.05] dark:bg-white/[0.02]"
                      >
                        <span className="font-medium text-zinc-900 dark:text-zinc-200">{friend.name}</span>
                        <span className="text-[10px] text-zinc-400">
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
