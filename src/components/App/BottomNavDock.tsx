'use client';

import React from 'react';
import { Home, Briefcase, Plus, Send, MessageSquare, User } from 'lucide-react';

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
    <div className="fixed bottom-0 left-0 right-0 z-40 w-full select-none">
      <div className="relative max-w-md mx-auto flex items-end justify-between px-6 pt-2 pb-3 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={() => onTabChange('home')}
          className="flex flex-col items-center justify-center w-14 py-1 transition-colors"
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'text-[#0080ff]' : 'text-slate-400'}`} />
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'home' ? 'text-[#0080ff] font-bold' : 'text-slate-400'}`}>Home</span>
          {activeTab === 'home' && <span className="w-1 h-1 rounded-full bg-[#0080ff] mt-0.5" />}
        </button>

        {/* Tab 2: Jobs */}
        <button
          type="button"
          onClick={() => onTabChange('jobs')}
          className="flex flex-col items-center justify-center w-14 py-1 transition-colors"
        >
          <Briefcase className={`w-5 h-5 ${activeTab === 'jobs' ? 'text-[#0080ff]' : 'text-slate-400'}`} />
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'jobs' ? 'text-[#0080ff] font-bold' : 'text-slate-400'}`}>Jobs</span>
          {activeTab === 'jobs' && <span className="w-1 h-1 rounded-full bg-[#0080ff] mt-0.5" />}
        </button>

        {/* Center floating "+" button (matching mockup — raised blue circle) */}
        <div className="relative -top-4 flex items-center justify-center">
          <button
            type="button"
            onClick={onCenterPlusClick}
            className="w-14 h-14 rounded-full bg-[#0080ff] hover:bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all border-4 border-white"
            title="Upload CV / Quick Match"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 3: Request (replaced Message per user specification) */}
        <button
          type="button"
          onClick={() => onTabChange('request')}
          className="relative flex flex-col items-center justify-center w-14 py-1 transition-colors"
        >
          <Send className={`w-5 h-5 ${activeTab === 'request' ? 'text-[#0080ff]' : 'text-slate-400'}`} />
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'request' ? 'text-[#0080ff] font-bold' : 'text-slate-400'}`}>Request</span>
          {activeTab === 'request' && <span className="w-1 h-1 rounded-full bg-[#0080ff] mt-0.5" />}
          {unreadCount > 0 && (
            <span className="absolute top-0 right-3 w-2 h-2 bg-[#0080ff] rounded-full" />
          )}
        </button>

        {/* Tab 4: Profile */}
        <button
          type="button"
          onClick={() => onTabChange('profile')}
          className="flex flex-col items-center justify-center w-14 py-1 transition-colors"
        >
          <User className={`w-5 h-5 ${activeTab === 'profile' ? 'text-[#0080ff]' : 'text-slate-400'}`} />
          <span className={`text-[10px] mt-0.5 font-medium ${activeTab === 'profile' ? 'text-[#0080ff] font-bold' : 'text-slate-400'}`}>Profile</span>
          {activeTab === 'profile' && <span className="w-1 h-1 rounded-full bg-[#0080ff] mt-0.5" />}
        </button>
      </div>
    </div>
  );
};
