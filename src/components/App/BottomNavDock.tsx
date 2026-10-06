'use client';

import React from 'react';
import { Home, Briefcase, Plus, Send, User, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

export type AppNavTab = 'home' | 'jobs' | 'request' | 'chat' | 'profile';

interface BottomNavDockProps {
  activeTab: AppNavTab;
  onTabChange: (tab: AppNavTab) => void;
  onCenterPlusClick: () => void;
  unreadCount?: number;
}

const LEFT_TABS: { id: AppNavTab; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
];

const RIGHT_TABS: { id: AppNavTab; label: string; icon: LucideIcon }[] = [
  { id: 'request', label: 'Request', icon: Send },
  { id: 'profile', label: 'Profile', icon: User },
];

function hapticTick() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* unsupported */
  }
}

export const BottomNavDock: React.FC<BottomNavDockProps> = ({
  activeTab,
  onTabChange,
  onCenterPlusClick,
  unreadCount = 0,
}) => {
  const renderTab = ({ id, label, icon: Icon }: { id: AppNavTab; label: string; icon: LucideIcon }) => {
    const isActive = activeTab === id;
    return (
      <motion.button
        key={id}
        type="button"
        onClick={() => {
          hapticTick();
          onTabChange(id);
        }}
        whileTap={{ scale: 0.84 }}
        transition={{ type: 'spring', stiffness: 450, damping: 22 }}
        className="relative flex flex-col items-center justify-center w-14 py-1.5 rounded-full z-10"
        aria-current={isActive ? 'page' : undefined}
      >
        {isActive && (
          <motion.div
            layoutId="nav-pill-active"
            className="absolute inset-0 bg-blue-50 rounded-full border border-blue-200/60 -z-10"
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          />
        )}
        <span className="relative">
          <motion.span
            animate={isActive ? { y: [0, -3, 0] } : { y: 0 }}
            transition={{ duration: 0.35 }}
            className="block"
          >
            <Icon
              className={`w-5 h-5 transition-colors ${isActive ? 'text-[#0080ff]' : 'text-slate-400'}`}
              strokeWidth={isActive ? 2.4 : 2}
            />
          </motion.span>
          {id === 'request' && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 border-2 border-white rounded-full animate-bounce" />
          )}
        </span>
        <span className={`text-[10px] mt-0.5 font-bold transition-colors ${isActive ? 'text-[#0080ff]' : 'text-slate-400'}`}>
          {label}
        </span>
      </motion.button>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 w-full select-none pointer-events-none px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="relative max-w-md mx-auto flex items-center justify-between px-3 py-2 bg-white/90 backdrop-blur-2xl rounded-full border border-blue-100/80 shadow-[0_16px_40px_-10px_rgba(0,80,255,0.25),0_0_0_1px_rgba(0,0,0,0.03)] pointer-events-auto">
        {LEFT_TABS.map(renderTab)}

        {/* Center floating "+" — upload CV / auto-match */}
        <div className="relative -top-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-400/30 blur-md animate-bubble-pulse-ring" />
          <motion.button
            type="button"
            onClick={() => {
              hapticTick();
              onCenterPlusClick();
            }}
            whileHover={{ scale: 1.12, rotate: 90 }}
            whileTap={{ scale: 0.88, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="relative w-13 h-13 rounded-full bg-gradient-to-tr from-[#0080ff] to-[#00d2ff] text-white flex items-center justify-center shadow-[0_8px_25px_rgba(0,128,255,0.5)] border-3 border-white cursor-pointer"
            aria-label="Upload CV / Auto-match"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </motion.button>
        </div>

        {RIGHT_TABS.map(renderTab)}
      </div>
    </nav>
  );
};
