'use client';

import React from 'react';
import { Sparkles, Upload } from 'lucide-react';

interface WelcomeCollageHeroProps {
  onStart: () => void;
  onOpenResume: () => void;
  jobCount?: number;
}

export const WelcomeCollageHero: React.FC<WelcomeCollageHeroProps> = ({
  onStart,
  onOpenResume,
  jobCount = 200,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-between min-h-[calc(100vh-4.5rem)] px-4 sm:px-6 pt-4 pb-12 max-w-md sm:max-w-xl mx-auto text-center select-none bg-white">
      {/* Soft atmospheric blue glow */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-gradient-to-b from-blue-200/50 to-sky-100/20 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Quick Navigation */}
      <div className="w-full flex items-center justify-between py-1 mb-2 z-10">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            CareerBot
          </span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-600">
            AI
          </span>
        </div>
        <button
          type="button"
          onClick={onStart}
          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
        >
          <span>Explore Jobs</span>
          <span>→</span>
        </button>
      </div>

      {/* Floating Avatar & Brand Collage Canvas matching Screen 1 */}
      <div className="relative w-full h-[320px] sm:h-[380px] flex items-center justify-center my-auto">
        {/* Subtle Ambient Ring */}
        <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-blue-100/70 pointer-events-none" />

        {/* 1. Top Left Avatar (Artistic/B&W) */}
        <div className="absolute top-2 left-6 sm:left-12 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shadow-md border-2 border-white bg-slate-100 transform hover:scale-105 transition-transform duration-300">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
            alt="Candidate"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 2. Top Center Avatar (Business professional) */}
        <div className="absolute top-6 left-[38%] sm:left-[42%] flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-sm border-2 border-white bg-emerald-50">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80"
            alt="Professional"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 3. Top Right Avatar */}
        <div className="absolute top-4 right-14 sm:right-20 flex items-center justify-center w-12 h-12 rounded-full overflow-hidden shadow-xs border border-white/60 opacity-70">
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80"
            alt="Talent"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 4. Top Right Brand Pill (Blue loop badge) */}
        <div className="absolute top-16 right-6 sm:right-10 flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-blue-600 shadow-lg text-white border-2 border-white">
          <div className="w-6 h-6 rounded-full border-3 border-white border-t-transparent animate-spin-slow" />
        </div>

        {/* 5. Mid Left Green Tech Icon (Upwork/Eco leaf badge) */}
        <div className="absolute top-[36%] left-4 sm:left-8 flex items-center justify-center w-15 h-15 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500 shadow-md text-white font-bold text-2xl border-2 border-white">
          <span className="tracking-tighter">e</span>
        </div>

        {/* 6. Mid Left Center Avatar */}
        <div className="absolute top-[28%] left-[22%] sm:left-[26%] flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full overflow-hidden shadow-xs border border-white bg-slate-200">
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80"
            alt="Engineer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 7. Mid Right Silhouette Mascot Pill */}
        <div className="absolute top-[30%] right-[24%] sm:right-[28%] flex items-center justify-center w-14 h-9 sm:w-16 sm:h-10 rounded-2xl bg-slate-800 text-white shadow-md border border-white/20">
          <Sparkles className="w-4 h-4 text-sky-400" />
        </div>

        {/* 8. CENTER HERO PORTRAIT (Smiling woman in blazer) */}
        <div className="absolute top-[46%] left-[34%] sm:left-[37%] flex items-center justify-center w-20 h-20 sm:w-22 sm:h-22 rounded-3xl overflow-hidden shadow-xl border-4 border-white bg-slate-100 z-10 transform hover:scale-105 transition-transform">
          <img
            src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=240&auto=format&fit=crop&q=80"
            alt="Lead Professional"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 9. Mid Right Male Avatar */}
        <div className="absolute top-[44%] right-4 sm:right-8 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-md border-2 border-white bg-slate-100">
          <img
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80"
            alt="Tech Leader"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 10. Bottom Left Avatar Fragment */}
        <div className="absolute bottom-4 left-1 sm:left-4 flex items-center justify-center w-11 h-11 rounded-full overflow-hidden shadow-xs border border-white opacity-80">
          <img
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80"
            alt="Designer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 11. Starburst / Pinwheel Icon matching screenshot */}
        <div className="absolute bottom-6 left-[22%] sm:left-[26%] flex items-center justify-center w-10 h-10 text-slate-900">
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
          </svg>
        </div>

        {/* 12. Metric Pill (+200k) matching screenshot */}
        <div className="absolute bottom-4 right-6 sm:right-12 flex items-center justify-center px-4 py-2 rounded-2xl bg-blue-50 border border-blue-100 shadow-xs">
          <span className="text-blue-600 font-extrabold text-sm sm:text-base tracking-tight">
            +{jobCount}k
          </span>
        </div>
      </div>

      {/* Copy Section */}
      <div className="mt-2 max-w-sm mx-auto space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
          Empowering Your <br /> Job Search
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm font-medium px-4 leading-relaxed">
          Discover your ideal career with our job search app.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-xs mt-6 space-y-2.5">
        <button
          type="button"
          onClick={onStart}
          className="w-full py-3.5 px-6 rounded-full bg-[#0080ff] hover:bg-blue-600 text-white font-extrabold text-sm shadow-[0_8px_20px_-4px_rgba(0,128,255,0.45)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>Lets Start</span>
          <span className="text-base">🚀</span>
        </button>

        <button
          type="button"
          onClick={onOpenResume}
          className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-bold text-xs shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Upload className="w-3.5 h-3.5 text-blue-600" />
          <span>Upload CV to Auto-Match</span>
        </button>
      </div>
    </div>
  );
};
