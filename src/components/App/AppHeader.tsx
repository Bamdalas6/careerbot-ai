'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Bell, User, LogOut, Settings, Coins } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AppHeaderProps {
  currentLocation?: string;
  onLocationChange?: (loc: string) => void;
  onOpenProfile?: () => void;
  onOpenSaved?: () => void;
  savedCount?: number;
}

const PRESET_LOCATIONS = [
  'All Locations',
  'Lagos, Nigeria',
  'Abuja, Nigeria',
  'Port Harcourt, Nigeria',
  'Remote (Worldwide)',
  'Remote (Africa)',
  'Accra, Ghana',
  'Nairobi, Kenya',
  'London, UK',
  'New York, USA',
];

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentLocation = 'Lagos, Nigeria',
  onLocationChange,
  onOpenProfile,
  onOpenSaved,
  savedCount = 0,
}) => {
  const { user, credits, logout, openAuthModal, openCreditModal } = useAuth();
  const [isLocDropdownOpen, setIsLocDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const locRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (locRef.current && !locRef.current.contains(e.target as Node)) {
        setIsLocDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userInitial = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-gradient-to-b from-sky-200/50 via-sky-100/25 to-white backdrop-blur-md px-4 sm:px-6 pt-3 pb-2 transition-all select-none">
      <div className="max-w-md sm:max-w-2xl mx-auto flex items-center justify-between gap-3">
        {/* Left: User Avatar & Dropdown Menu with Log Out */}
        <div ref={userRef} className="relative flex items-center gap-2">
          {user ? (
            <div>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 text-white font-black text-sm flex items-center justify-center shadow-xs hover:ring-2 hover:ring-blue-400 transition-all"
                title="Account Menu & Log Out"
              >
                <span>{userInitial}</span>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
              </button>

              {/* User Account Menu Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.name || 'CareerBot Member'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        openCreditModal();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span>Balance: {credits ?? 0} Coins</span>
                      </span>
                      <span className="text-[11px] text-blue-600 font-bold">Top Up</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfile?.();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Account Settings</span>
                    </button>
                  </div>

                  {/* PROMINENT LOG OUT BUTTON */}
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-red-600" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-all"
              title="Sign In / Register"
            >
              <User className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Center: My Location Dropdown matching screenshot */}
        <div ref={locRef} className="relative flex flex-col items-center">
          <span className="text-[10px] font-semibold text-slate-400 tracking-wider flex items-center gap-0.5">
            <span>My Location</span>
            <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
          </span>
          <button
            type="button"
            onClick={() => setIsLocDropdownOpen(!isLocDropdownOpen)}
            className="flex items-center gap-1 text-xs sm:text-sm font-black text-slate-900 hover:text-blue-600 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 fill-blue-600" />
            <span className="truncate max-w-[150px] sm:max-w-[200px]">{currentLocation}</span>
          </button>

          {/* Location Dropdown Menu */}
          {isLocDropdownOpen && (
            <div className="absolute top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50">
              <div className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                Select Territory
              </div>
              <div className="space-y-0.5 mt-1 max-h-56 overflow-y-auto">
                {PRESET_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      onLocationChange?.(loc);
                      setIsLocDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-xl font-medium transition-colors flex items-center justify-between ${
                      currentLocation === loc
                        ? 'bg-blue-50 text-blue-600 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{loc}</span>
                    {currentLocation === loc && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Coins Chip & Bell Icon matching screenshot */}
        <div className="flex items-center gap-2">
          {/* Direct Log Out Button if logged in */}
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition-all"
              title="Log Out of your account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          )}

          {/* Coin Balance Chip */}
          <button
            type="button"
            onClick={openCreditModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-2xs hover:border-amber-300 active:scale-95 transition-all text-xs font-bold text-slate-800"
            title="Coins Balance - Click to top up"
          >
            <span className="text-amber-500 text-xs">🪙</span>
            <span>{credits ?? 5}</span>
          </button>

          {/* Circular Bell Icon matching screenshot */}
          <button
            type="button"
            onClick={onOpenSaved}
            className="relative w-10 h-10 rounded-full bg-white border border-slate-200/90 flex items-center justify-center text-slate-700 hover:text-blue-600 transition-colors shadow-2xs"
            title="Saved Opportunities"
          >
            <Bell className="w-4.5 h-4.5" />
            {savedCount > 0 ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {savedCount}
              </span>
            ) : (
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
