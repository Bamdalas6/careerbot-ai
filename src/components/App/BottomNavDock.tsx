'use client';

import React from 'react';
import { Home, Briefcase, Plus, Send, User } from 'lucide-react';
import { motion } from 'motion/react';

export type AppNavTab = 'home' | 'jobs' | 'request' | 'chat' | 'profile';

interface BottomNavDockProps {
  activeTab: AppNavTab;
  onTabChange: (tab: AppNavTab) => void;
  onCenterPlusClick: () => void;
  unreadCount?: number;
}

export const BottomNavDock: React.FC<BottomNavDockProps> = ({
  activeTab,
  onTabChange,
  onCenterPlusClick,
  unreadCount = 0,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 w-full select-none pointer-events-none px-3 pb-3 sm:pb-4">
      {/* Floating Bubbly Island Dock */}
      <div className="relative max-w-md mx-auto flex items-center justify-between px-3 py-2 bg-white/95 backdrop-blur-2xl rounded-full border border-blue-100/80 shadow-[0_16px_40px_-10px_rgba(0,80,255,0.25),0_0_0_1px_rgba(0,0,0,0.03)] pointer-events-auto">
        
        {/* Tab 1: Home */}
        <motion.button
          type="button"
          onClick={() => onTabChange('home')}
          whileTap={{ scale: 0.84 }}
          whileHover={{ scale: 1.06 }}
          transition={{ type: 'spring', stiffness: 450, damping: 22 }}
          className="relative flex flex-col items-center justify-center w-14 py-1.5 rounded-full z-10 transition-colors"
        >
          {activeTab === 'home' && (
            <motion.div
              layoutId="nav-pill-active"
              className="absolute inset-0 bg-blue-50/90 rounded-full border border-blue-200/60 -z-10 shadow-2xs"
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            />
          )}
          <Home className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'home' ? 'text-[#0080ff] scale-110' : 'text-slate-400'}`} />
          <span className={`text-[10px] mt-0.5 font-bold transition-colors ${activeTab === 'home' ? 'text-[#0080ff]' : 'text-slate-400'}`}>
            Home
          </span>
        </motion.button>

        {/* Tab 2: Jobs */}
        <motion.button
          type="button"
          onClick={() => onTabChange('jobs')}
          whileTap={{ scale: 0.84 }}
          whileHover={{ scale: 1.06 }}
          transition={{ type: 'spring', stiffness: 450, damping: 22 }}
          className="relative flex flex-col items-center justify-center w-14 py-1.5 rounded-full z-10 transition-colors"
        >
          {activeTab === 'jobs' && (
            <motion.div
              layoutId="nav-pill-active"
              className="absolute inset-0 bg-blue-50/90 rounded-full border border-blue-200/60 -z-10 shadow-2xs"
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            />
          )}
          <Briefcase className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'jobs' ? 'text-[#0080ff] scale-110' : 'text-slate-400'}`} />
          <span className={`text-[10px] mt-0.5 font-bold transition-colors ${activeTab === 'jobs' ? 'text-[#0080ff]' : 'text-slate-400'}`}>
            Jobs
          </span>
        </motion.button>

        {/* Center floating bubbly "+" button with pulse halo */}
        <div className="relative -top-5 flex items-center justify-center">
          {/* Animated Glow Aura */}
          <div className="absolute inset-0 rounded-full bg-blue-400/30 blur-md animate-bubble-pulse-ring" />
          
          <motion.button
            type="button"
            onClick={onCenterPlusClick}
            whileHover={{ scale: 1.12, rotate: 90 }}
            whileTap={{ scale: 0.88, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="relative w-13 h-13 rounded-full bg-gradient-to-tr from-[#0080ff] to-[#00d2ff] text-white flex items-center justify-center shadow-[0_8px_25px_rgba(0,128,255,0.5)] border-3 border-white cursor-pointer"
            title="Upload CV / Auto-Match"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </motion.button>
        </div>

        {/* Tab 3: Request */}
        <motion.button
          type="button"
          onClick={() => onTabChange('request')}
          whileTap={{ scale: 0.84 }}
          whileHover={{ scale: 1.06 }}
          transition={{ type: 'spring', stiffness: 450, damping: 22 }}
          className="relative flex flex-col items-center justify-center w-14 py-1.5 rounded-full z-10 transition-colors"
        >
          {activeTab === 'request' && (
            <motion.div
              layoutId="nav-pill-active"
              className="absolute inset-0 bg-blue-50/90 rounded-full border border-blue-200/60 -z-10 shadow-2xs"
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            />
          )}
          <div className="relative">
            <Send className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'request' ? 'text-[#0080ff] scale-110' : 'text-slate-400'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 border-2 border-white rounded-full animate-bounce" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 font-bold transition-colors ${activeTab === 'request' ? 'text-[#0080ff]' : 'text-slate-400'}`}>
            Request
          </span>
        </motion.button>

        {/* Tab 4: Profile */}
        <motion.button
          type="button"
          onClick={() => onTabChange('profile')}
          whileTap={{ scale: 0.84 }}
          whileHover={{ scale: 1.06 }}
          transition={{ type: 'spring', stiffness: 450, damping: 22 }}
          className="relative flex flex-col items-center justify-center w-14 py-1.5 rounded-full z-10 transition-colors"
        >
          {activeTab === 'profile' && (
            <motion.div
              layoutId="nav-pill-active"
              className="absolute inset-0 bg-blue-50/90 rounded-full border border-blue-200/60 -z-10 shadow-2xs"
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            />
          )}
          <User className={`w-5 h-5 transition-transform duration-200 ${activeTab === 'profile' ? 'text-[#0080ff] scale-110' : 'text-slate-400'}`} />
          <span className={`text-[10px] mt-0.5 font-bold transition-colors ${activeTab === 'profile' ? 'text-[#0080ff]' : 'text-slate-400'}`}>
            Profile
          </span>
        </motion.button>
      </div>
    </div>
  );
};
