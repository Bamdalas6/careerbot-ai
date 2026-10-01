'use client';

import React from 'react';
import { Sparkles, Upload, Zap, Star, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';

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
  const handleStartWithPop = (e: React.MouseEvent) => {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.85 },
      colors: ['#0080ff', '#38bdf8', '#34d399', '#fbbf24', '#f472b6'],
    });
    onStart();
  };

  return (
    <div className="relative flex flex-col items-center justify-between min-h-[calc(100vh-4.5rem)] px-4 sm:px-6 pt-4 pb-12 max-w-md sm:max-w-xl mx-auto text-center select-none bg-white overflow-hidden">
      {/* Soft atmospheric gradient glow & playful floating bubbles */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-gradient-to-b from-blue-200/60 via-sky-100/30 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-bubble-pulse-ring" />
      <div className="absolute top-1/4 -left-10 w-44 h-44 bg-purple-200/30 rounded-full blur-2xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-10 w-44 h-44 bg-emerald-200/30 rounded-full blur-2xl pointer-events-none -z-10" />

      {/* Top Quick Navigation */}
      <div className="w-full flex items-center justify-between py-1 mb-2 z-10">
        <motion.div 
          className="flex items-center gap-1.5"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-base font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
            CareerBot
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-600 shadow-2xs">
            AI ✨
          </span>
        </motion.div>
        <motion.button
          type="button"
          onClick={onStart}
          whileHover={{ scale: 1.05, x: 2 }}
          whileTap={{ scale: 0.92 }}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
        >
          <span>Explore Jobs</span>
          <span>→</span>
        </motion.button>
      </div>

      {/* Floating Avatar & Brand Collage Canvas */}
      <div className="relative w-full h-[320px] sm:h-[380px] flex items-center justify-center my-auto">
        {/* Subtle Ambient Rings with soft pulse */}
        <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border-2 border-dashed border-blue-200/60 pointer-events-none animate-spin-very-slow" />
        <div className="absolute w-80 h-80 rounded-full border border-sky-100/80 pointer-events-none" />

        {/* Ambient Decorative Mini Bubbles */}
        <motion.div 
          className="absolute top-12 left-2 w-3.5 h-3.5 rounded-full bg-blue-400/40 blur-[0.5px]"
          animate={{ y: [-4, 4, -4], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div 
          className="absolute bottom-16 right-4 w-4 h-4 rounded-full bg-amber-400/50 blur-[0.5px]"
          animate={{ y: [4, -5, 4], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        <motion.div 
          className="absolute top-24 right-2 w-3 h-3 rounded-full bg-emerald-400/50"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* 1. Top Left Avatar */}
        <motion.div 
          className="absolute top-2 left-6 sm:left-12 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shadow-lg border-2 border-white bg-slate-100 cursor-pointer animate-bubble-float-1"
          whileHover={{ scale: 1.18, rotate: -4 }}
          whileTap={{ scale: 0.9 }}
        >
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
            alt="Candidate"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* 2. Top Center Avatar */}
        <motion.div 
          className="absolute top-6 left-[38%] sm:left-[42%] flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-md border-2 border-white bg-emerald-50 cursor-pointer animate-bubble-float-2"
          whileHover={{ scale: 1.18, rotate: 4 }}
          whileTap={{ scale: 0.9 }}
        >
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80"
            alt="Professional"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* 3. Top Right Avatar */}
        <motion.div 
          className="absolute top-4 right-14 sm:right-20 flex items-center justify-center w-12 h-12 rounded-full overflow-hidden shadow-xs border-2 border-white/80 cursor-pointer animate-bubble-float-3"
          whileHover={{ scale: 1.15, rotate: -3 }}
          whileTap={{ scale: 0.9 }}
        >
          <img
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&auto=format&fit=crop&q=80"
            alt="Talent"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* 4. Top Right Brand Pill (Blue loop badge with glow) */}
        <motion.div 
          className="absolute top-16 right-6 sm:right-10 flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 shadow-xl text-white border-2 border-white cursor-pointer animate-bubble-float-1"
          whileHover={{ scale: 1.2, rotate: 15 }}
          whileTap={{ scale: 0.88 }}
        >
          <div className="w-6 h-6 rounded-full border-3 border-white border-t-transparent animate-spin-slow" />
        </motion.div>

        {/* 5. Mid Left Green Tech Icon */}
        <motion.div 
          className="absolute top-[36%] left-4 sm:left-8 flex items-center justify-center w-15 h-15 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg text-white font-black text-2xl border-2 border-white cursor-pointer animate-bubble-float-2"
          whileHover={{ scale: 1.18, rotate: -8 }}
          whileTap={{ scale: 0.9 }}
        >
          <span className="tracking-tighter">e</span>
        </motion.div>

        {/* 6. Mid Left Center Avatar */}
        <motion.div 
          className="absolute top-[28%] left-[22%] sm:left-[26%] flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-full overflow-hidden shadow-xs border-2 border-white bg-slate-200 cursor-pointer animate-bubble-float-3"
          whileHover={{ scale: 1.15, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
        >
          <img
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80"
            alt="Engineer"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* 7. Mid Right Silhouette Mascot Pill */}
        <motion.div 
          className="absolute top-[30%] right-[24%] sm:right-[28%] flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-slate-900 text-white shadow-lg border border-white/20 cursor-pointer animate-bubble-float-1"
          whileHover={{ scale: 1.15, y: -2 }}
          whileTap={{ scale: 0.92 }}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-[11px] font-bold text-sky-300">AI Boost</span>
        </motion.div>

        {/* 8. CENTER HERO PORTRAIT with Bubbly Pulsing Halo & Badge */}
        <div className="absolute top-[44%] left-[34%] sm:left-[37%] z-20 flex flex-col items-center">
          {/* Animated Pulsing Ring */}
          <div className="absolute -inset-2 rounded-[32px] bg-gradient-to-tr from-blue-500/30 to-sky-400/40 blur-sm animate-bubble-pulse-ring" />
          
          <motion.div 
            className="relative flex items-center justify-center w-22 h-22 sm:w-24 sm:h-24 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100 cursor-pointer animate-bubble-float-3"
            whileHover={{ scale: 1.14, rotate: 2 }}
            whileTap={{ scale: 0.94 }}
          >
            <img
              src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=240&auto=format&fit=crop&q=80"
              alt="Lead Professional"
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Floating Bubbly Match Badge */}
          <motion.div 
            className="absolute -bottom-3 px-2.5 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-700 shadow-md text-[10px] font-extrabold flex items-center gap-1 z-30 whitespace-nowrap"
            animate={{ y: [-2, 2, -2] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>98% Match</span>
          </motion.div>
        </div>

        {/* 9. Mid Right Male Avatar */}
        <motion.div 
          className="absolute top-[44%] right-4 sm:right-8 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shadow-md border-2 border-white bg-slate-100 cursor-pointer animate-bubble-float-2"
          whileHover={{ scale: 1.18, rotate: -4 }}
          whileTap={{ scale: 0.9 }}
        >
          <img
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80"
            alt="Tech Leader"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* 10. Bottom Left Avatar Fragment */}
        <motion.div 
          className="absolute bottom-4 left-1 sm:left-4 flex items-center justify-center w-11 h-11 rounded-full overflow-hidden shadow-xs border-2 border-white opacity-85 cursor-pointer animate-bubble-float-1"
          whileHover={{ scale: 1.15, rotate: 6 }}
          whileTap={{ scale: 0.9 }}
        >
          <img
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80"
            alt="Designer"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* 11. Starburst / Pinwheel Icon */}
        <motion.div 
          className="absolute bottom-6 left-[22%] sm:left-[26%] flex items-center justify-center w-10 h-10 text-slate-800 cursor-pointer"
          whileHover={{ rotate: 180, scale: 1.2 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
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
        </motion.div>

        {/* 12. Metric Pill (+200k) with joyful bobbing */}
        <motion.div 
          className="absolute bottom-4 right-6 sm:right-12 flex items-center justify-center px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 shadow-md cursor-pointer animate-bubble-float-2"
          whileHover={{ scale: 1.15, y: -2 }}
          whileTap={{ scale: 0.92 }}
        >
          <span className="text-blue-600 font-black text-sm sm:text-base tracking-tight flex items-center gap-1">
            <span>+{jobCount}k</span>
            <span className="text-xs">🔥</span>
          </span>
        </motion.div>
      </div>

      {/* Copy Section with Bubbly Energy */}
      <div className="mt-2 max-w-sm mx-auto space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
          Empowering Your <br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
            Job Search
          </span>
          <span className="inline-block ml-1 animate-bounce">✨</span>
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm font-medium px-4 leading-relaxed">
          Discover vetted high-salary roles & apply with 1-click tailored pitches.
        </p>
      </div>

      {/* Action Buttons with Bouncy Feedback & Confetti */}
      <div className="w-full max-w-xs mt-6 space-y-2.5">
        <motion.button
          type="button"
          onClick={handleStartWithPop}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-[#0080ff] to-[#0060e6] hover:from-blue-600 hover:to-indigo-600 text-white font-extrabold text-sm shadow-[0_10px_25px_-4px_rgba(0,128,255,0.5)] flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Lets Start</span>
          <span className="text-base animate-pulse">🚀</span>
        </motion.button>

        <motion.button
          type="button"
          onClick={onOpenResume}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="w-full py-3 px-4 rounded-full bg-slate-50/80 hover:bg-slate-100 text-slate-700 border border-slate-200/90 font-bold text-xs shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-blue-600" />
          <span>Upload CV to Auto-Match</span>
        </motion.button>
      </div>
    </div>
  );
};
