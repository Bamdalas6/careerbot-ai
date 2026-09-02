'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
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

export default function SettingsPage() {
  const router = useRouter();
  const { user, credits, isLoading, isAuthenticated, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'referrals'>('profile');

  // Profile section states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
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
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [totalReferred, setTotalReferred] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
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
    if (isAuthenticated && activeTab === 'referrals') {
      loadReferrals();
    }
  }, [isAuthenticated, activeTab]);

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
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-center text-white">
        <ShieldCheck className="h-12 w-12 text-zinc-600 mb-4" />
        <h1 className="text-xl font-bold">Sign in required</h1>
        <p className="mt-2 text-sm text-zinc-400 max-w-sm">
          Please log in to your account to view and update your profile settings.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-zinc-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return Home</span>
        </Link>
      </div>
    );
  }

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
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error: metaErr } = await supabase.auth.updateUser({
          data: {
            name: name.trim(),
            username: cleanUsername || null,
          },
        });
        if (metaErr) console.warn('Supabase auth metadata update notice:', metaErr);
      }

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

      updateProfile({
        name: name.trim(),
        username: cleanUsername,
      });

      setProfileSuccess('Profile updated successfully!');
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save profile changes.';
      setProfileError(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      setSecurityError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError('New passwords do not match.');
      return;
    }

    setSecurityLoading(true);
    setSecurityError(null);
    setSecuritySuccess(null);

    try {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        try {
          await supabase.auth.updateUser({ password: newPassword });
        } catch (supErr) {
          console.warn('Supabase password sync notice:', supErr);
        }
      }

      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to change password.');
      }

      setSecuritySuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not change password. Please check your current password.';
      setSecurityError(msg);
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#f7f8f8] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
            <Zap className="h-3.5 w-3.5" />
            <span>{credits} Credits</span>
          </div>
        </div>

        {/* Page Title & Profile Snapshot */}
        <div className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-base font-bold text-black shadow-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{user.name}</h1>
              <p className="text-xs text-zinc-400">
                {user.username ? `@${user.username}` : user.email}
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'profile'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'security'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Security</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('referrals')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                activeTab === 'referrals'
                  ? 'bg-amber-400 text-black shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Gift className="h-3.5 w-3.5" />
              <span>Refer & Earn</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${activeTab === 'referrals' ? 'bg-black/20 text-black' : 'bg-amber-500/10 text-amber-400'}`}>
                +5
              </span>
            </button>
          </div>
        </div>

        {/* Section Content */}
        <div className="mt-4 rounded-3xl border border-white/[0.08] bg-[#0c0c0c] p-6 sm:p-8 shadow-2xl">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-white">Profile Information</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Update your public name and handle across CareerBot AI applications.
                </p>
              </div>

              {profileError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-900/50 bg-rose-950/40 p-3 text-xs text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-900/50 bg-emerald-950/40 p-3 text-xs text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Username
                </label>
                <div className="relative flex items-center">
                  <AtSign className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. babalola"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] py-2.5 pl-10 pr-4 text-sm text-zinc-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-2.5 text-xs font-bold text-black hover:bg-zinc-200 transition disabled:opacity-50"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-white">Security & Password</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Ensure your account is using a long, random password to stay secure.
                </p>
              </div>

              {securityError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-900/50 bg-rose-950/40 p-3 text-xs text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  <span>{securityError}</span>
                </div>
              )}

              {securitySuccess && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-900/50 bg-emerald-950/40 p-3 text-xs text-emerald-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{securitySuccess}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Current Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-zinc-600 focus:border-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 text-zinc-500 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-zinc-600 focus:border-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 text-zinc-500 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-zinc-600 focus:border-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-zinc-500 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={securityLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-2.5 text-xs font-bold text-black hover:bg-zinc-200 transition disabled:opacity-50"
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
              </div>
            </form>
          )}

          {activeTab === 'referrals' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white">Refer Friends & Earn Tokens</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Invite friends, job hunters, and colleagues to CareerBot AI and get 10 free tokens credited to your account for every new registration!
                </p>
              </div>

              {/* Promo Card */}
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                    <Gift className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Earn +10 Free Tokens for Every Referral
                    </h3>
                    <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                      Share your custom referral link below. When your friend registers an account, your balance is instantly rewarded with <b>10 free tokens</b>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Referral Link & 1-Click Copy */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Your Personal Referral Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 px-4 font-mono text-xs text-white select-all focus:border-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && referralLink) {
                        navigator.clipboard.writeText(referralLink);
                        setCopied(true);
                        confetti({ particleCount: 35, spread: 60, origin: { y: 0.6 } });
                        setTimeout(() => setCopied(false), 2000);
                      }
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-xs font-bold text-black hover:bg-zinc-200 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 1-Click Share Socials */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  1-Click Share
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Hey! Check out CareerBot AI for discovering top tech jobs, CV review & ATS tailoring in Nigeria & globally. Sign up with my link to claim your bonus: ${referralLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-3 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
                  >
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `Discover top tech & remote jobs with AI. Join CareerBot AI: ${referralLink}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 py-3 text-xs font-semibold text-sky-400 hover:bg-sky-500/20 transition"
                  >
                    <span>𝕏 (Twitter)</span>
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 py-3 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition"
                  >
                    <span>LinkedIn</span>
                  </a>
                </div>
              </div>

              {/* Referral Statistics */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-zinc-400 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium">Friends Joined</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{totalReferred}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-amber-400 mb-1">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs font-medium">Tokens Earned</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">+{totalEarned}</p>
                </div>
              </div>

              {/* Friends Joined List */}
              {referredFriends.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                    Recent Friends Joined ({referredFriends.length})
                  </h4>
                  <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                    {referredFriends.map((friend, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs"
                      >
                        <span className="font-medium text-white">{friend.name}</span>
                        <span className="text-[11px] text-zinc-500">
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
}
