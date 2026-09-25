'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles,
  ChevronRight, ChevronLeft, CheckCircle2, UploadCloud,
  Zap, ArrowRight
} from 'lucide-react';

interface OnboardingVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
  onOpenResume?: () => void;
}

interface Scene {
  id: string;
  title: string;
  duration: number; // in seconds
  caption: string;
  badge: string;
}

const SCENES: Scene[] = [
  {
    id: 'welcome',
    title: '1. Autonomous Co-Pilot',
    duration: 10,
    caption: 'CareerBot acts as your 24/7 autonomous career agent — scanning verified employer postings and matching your craft directly.',
    badge: 'Meet CareerBot',
  },
  {
    id: 'deck',
    title: '2. Suggested Works Deck',
    duration: 10,
    caption: 'Swipe through curated, colorful suggested roles tailored to your exact skillset. Tap "View Job" to inspect full role intelligence.',
    badge: 'Smart Discovery',
  },
  {
    id: 'scanner',
    title: '3. CV Laser Scan & ATS',
    duration: 10,
    caption: 'Drop your CV to initiate instant craft extraction. Our AI highlights key strengths, fixes ATS gaps, and scores callback likelihood.',
    badge: 'ATS Intelligence',
  },
  {
    id: 'pitch',
    title: '4. 1-Click Tailored Pitch',
    duration: 10,
    caption: 'No more generic cover letters. CareerBot generates razor-sharp, company-specific pitches and submits your application in 1 tap.',
    badge: '1-Click Apply',
  },
  {
    id: 'success',
    title: '5. Launch Career Move',
    duration: 8,
    caption: 'Accelerate your career search today. Browse vetted jobs, recharge tokens when needed, and let CareerBot advocate for you.',
    badge: 'Ready to Apply',
  },
];

export const OnboardingVideoModal: React.FC<OnboardingVideoModalProps> = ({
  isOpen,
  onClose,
  onGetStarted,
  onOpenResume,
}) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [sceneElapsedTime, setSceneElapsedTime] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [swipedCard, setSwipedCard] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalDuration = SCENES.reduce((acc, s) => acc + s.duration, 0);

  // Synthesizer chime for scene changes
  const playChime = () => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);

        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + i * 0.07 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.07 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.45);
      });
    } catch {
      /* non-critical */
    }
  };

  const playTap = () => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {
      /* non-critical */
    }
  };

  const getCumulativeSeconds = (sceneIdx: number) => {
    let sum = 0;
    for (let i = 0; i < sceneIdx; i++) {
      sum += SCENES[i].duration;
    }
    return sum;
  };

  // Progression loop
  useEffect(() => {
    if (!isOpen || !isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSceneElapsedTime((prev) => {
        const sceneLimit = SCENES[currentSceneIndex].duration;
        if (prev + 0.1 >= sceneLimit) {
          if (currentSceneIndex < SCENES.length - 1) {
            setCurrentSceneIndex((curr) => curr + 1);
            playChime();
            return 0;
          } else {
            setIsPlaying(false);
            return sceneLimit;
          }
        }
        return prev + 0.1;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPlaying, currentSceneIndex, isMuted]);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentSceneIndex(0);
      setSceneElapsedTime(0);
      setIsPlaying(true);
      setSwipedCard(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentScene = SCENES[currentSceneIndex];
  const pastSeconds = getCumulativeSeconds(currentSceneIndex);
  const effectiveSeconds = pastSeconds + sceneElapsedTime;
  const progressPercent = Math.min(100, (effectiveSeconds / totalDuration) * 100);

  const handleNextScene = () => {
    playTap();
    if (currentSceneIndex < SCENES.length - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
      setSceneElapsedTime(0);
      playChime();
    }
  };

  const handlePrevScene = () => {
    playTap();
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex((prev) => prev - 1);
      setSceneElapsedTime(0);
      playChime();
    }
  };

  const handleRestart = () => {
    playTap();
    setCurrentSceneIndex(0);
    setSceneElapsedTime(0);
    setIsPlaying(true);
    setSwipedCard(false);
    playChime();
  };

  const toggleSound = () => {
    setIsMuted(!isMuted);
    if (isMuted) {
      playChime();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 select-none overflow-y-auto">
      {/* Modal Container with signature Growspace Electric Blue Canvas */}
      <div className="relative w-full max-w-3xl rounded-[32px] bg-[#0055ff] border border-blue-400/30 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col items-center">
        
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between px-5 py-3 border-b border-white/15 bg-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-white text-[#0055ff] flex items-center justify-center font-black text-xs shadow-md shadow-black/10">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                CareerBot AI
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-xs">
                  {currentScene.badge}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSound}
              className={`p-1.5 rounded-xl border text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                !isMuted
                  ? 'bg-white text-[#0055ff] border-white font-bold'
                  : 'bg-white/15 text-white border-white/25 hover:bg-white/25'
              }`}
              title={isMuted ? 'Unmute sound effects' : 'Mute sound'}
            >
              {!isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-colors cursor-pointer"
              title="Close tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cinematic Stage: Floating Phone Mockup (Growspace Style) */}
        <div className="w-full py-4 sm:py-6 px-4 flex flex-col items-center justify-center relative overflow-hidden">
          
          {/* Subtle Ambient Radial Light */}
          <div className="absolute w-[450px] h-[450px] rounded-full bg-[#0044cc]/60 blur-[100px] pointer-events-none"></div>

          {/* Centered Phone Mockup */}
          <div className="relative w-[320px] sm:w-[350px] h-[520px] sm:h-[550px] bg-slate-950 rounded-[44px] p-2.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.6)] border-[2.5px] border-slate-800/80 ring-1 ring-white/25 flex flex-col justify-between z-10 transition-transform">
            
            {/* Phone Screen */}
            <div className="relative w-full h-full bg-[#f8fafc] rounded-[36px] overflow-hidden flex flex-col text-slate-900 shadow-inner">
              
              {/* Dynamic Island Capsule & Status Bar */}
              <div className="relative z-30 pt-2 px-5 pb-1 bg-white/90 backdrop-blur-md flex items-center justify-between border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-900 font-mono">9:41</span>
                <div className="w-16 h-3.5 bg-black rounded-full mx-auto flex items-center justify-end px-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
                </div>
                <div className="flex items-center gap-1 text-slate-800">
                  <div className="w-3.5 h-2 rounded-xs border border-slate-800 p-0.5 flex items-center">
                    <div className="w-2 h-full bg-slate-900 rounded-2xs"></div>
                  </div>
                </div>
              </div>

              {/* App In-Screen Header */}
              <div className="relative z-20 px-3.5 py-2 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 text-xs">
                    ☰
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-semibold block leading-none">CareerBot Co-Pilot</span>
                    <span className="text-[11px] font-black text-slate-900 flex items-center gap-1">
                      Discover Roles <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-mono text-[9px] font-bold flex items-center gap-0.5">
                    <span>⚡</span>
                    <span>{currentScene.id === 'pitch' ? '24' : '25'}</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Screen Stage Area */}
              <div className="relative flex-1 p-3 overflow-hidden flex flex-col justify-between bg-gradient-to-b from-white to-slate-50 text-slate-900">
                
                {/* SCENE 1: Welcome & Radar */}
                {currentScene.id === 'welcome' && (
                  <div className="h-full flex flex-col justify-between animate-in fade-in duration-400">
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Good Morning</span>
                          <h3 className="text-xs font-black text-slate-900">Alex Johnson 👋</h3>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                          AJ
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            Talent Radar Active
                          </span>
                          <span className="text-[9px] font-bold text-emerald-600 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                            Live
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Scanned 142 jobs today. <strong>48 verified roles</strong> match your profile.
                        </p>
                        <div className="mt-2.5 grid grid-cols-2 gap-2 text-center">
                          <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-xs font-black text-slate-900">48</span>
                            <span className="text-[8px] text-slate-400 block font-semibold">Matched Roles</span>
                          </div>
                          <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-xs font-black text-emerald-600">94%</span>
                            <span className="text-[8px] text-slate-400 block font-semibold">Top ATS Fit</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100/70 text-slate-700 text-[10px] font-medium">
                          <span className="w-4 h-4 rounded-md bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                          <span>Zero noisy sponsored listings</span>
                        </div>
                        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100/70 text-slate-700 text-[10px] font-medium">
                          <span className="w-4 h-4 rounded-md bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                          <span>Verified recruiters & salaries</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextScene}
                      className="w-full py-2 rounded-xl bg-blue-600 text-white font-extrabold text-[11px] shadow-md shadow-blue-500/25 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Explore Suggested Deck</span> →
                    </button>
                  </div>
                )}

                {/* SCENE 2: Suggested Works Deck */}
                {currentScene.id === 'deck' && (
                  <div className="h-full flex flex-col justify-between animate-in fade-in duration-400">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-black text-slate-900">Special For You</span>
                      <span className="text-[9px] font-bold text-slate-400">Swipe to Browse</span>
                    </div>

                    <div className="relative w-full my-auto">
                      {/* Back Peek Card 3 (Purple) */}
                      <div className="mx-6 h-1.5 rounded-t-xl bg-[#7c3aed]/50 border-t border-white/40"></div>
                      {/* Middle Peek Card 2 (Teal) */}
                      <div className="mx-3 h-1.5 rounded-t-xl bg-[#0d9488]/80 border-t border-white/40 -mt-0.5"></div>

                      {/* Active Top Card */}
                      <div
                        onClick={() => {
                          playTap();
                          setSwipedCard(!swipedCard);
                        }}
                        className={`relative rounded-2xl p-3.5 text-white shadow-xl -mt-0.5 border border-white/20 cursor-pointer transition-all duration-300 ${
                          swipedCard
                            ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 shadow-teal-500/30'
                            : 'bg-gradient-to-br from-[#0066ff] via-[#0055ff] to-[#0044ee] shadow-blue-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#0d2116] border border-white/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                              ✦
                            </div>
                            <div>
                              <span className="text-[9px] text-white/80 font-medium">
                                {swipedCard ? 'LeanSugar Design' : 'SunFi Technologies'}
                              </span>
                              <h4 className="text-xs font-extrabold leading-tight">
                                {swipedCard ? 'Senior Product Designer' : 'Customer Success Analyst'}
                              </h4>
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[8px] font-bold">
                            Top Fit
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 my-2">
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[8px] font-medium">Fintech</span>
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[8px] font-medium">Clean Energy</span>
                          <span className="px-2 py-0.5 rounded-full bg-white/20 text-[8px] font-medium">Remote OK</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/15">
                          <span className="text-[11px] font-black">
                            {swipedCard ? '₦450,000 / mo' : '₦350,000 / mo'}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded-md bg-white/20 text-[9px] font-bold">Pitch ✨</span>
                            <span className="px-2.5 py-0.5 rounded-md bg-white text-slate-900 text-[9px] font-black shadow-xs">
                              View Job ↗
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-100 text-center flex items-center justify-center gap-1">
                      <span className="text-xs">👆</span>
                      <span className="text-[9px] font-bold text-slate-600">Tap card to preview next role & color transition</span>
                    </div>
                  </div>
                )}

                {/* SCENE 3: CV Laser Scanner */}
                {currentScene.id === 'scanner' && (
                  <div className="h-full flex flex-col justify-between animate-in fade-in duration-400">
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs relative overflow-hidden">
                      {/* Laser beam */}
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse pointer-events-none"></div>

                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-xs font-bold">
                            📄
                          </div>
                          <div>
                            <h4 className="text-[10px] font-bold text-slate-900">Alex_Johnson_CV.pdf</h4>
                            <span className="text-[8px] text-emerald-600 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> Extracted 14 craft skills
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-black text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded-md border border-blue-200">
                          ATS: 94%
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Identified Craft</span>
                        <div className="flex flex-wrap gap-1">
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-bold">✓ UI/UX Architecture</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-bold">✓ React / Next.js</span>
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-bold">✓ Fintech Workflows</span>
                        </div>

                        <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-1 mt-1.5">
                          <span className="text-[10px]">💡</span>
                          <p className="text-[8px] text-amber-900 leading-snug">
                            <strong>Aha Tip:</strong> Adding "Fintech Checkout KPIs" increases interview callbacks by <strong>35%</strong>.
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextScene}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-[11px] shadow-md shadow-blue-500/25 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>Lock Skills & Match Roles</span> ⚡
                    </button>
                  </div>
                )}

                {/* SCENE 4: 1-Click Tailored Pitch */}
                {currentScene.id === 'pitch' && (
                  <div className="h-full flex flex-col justify-between animate-in fade-in duration-400">
                    <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <h4 className="text-[11px] font-bold text-slate-900">Custom Pitch Generator</h4>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-[8px] font-bold">
                          SunFi Technologies
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-900 text-slate-100 text-[9px] font-mono leading-relaxed space-y-1 shadow-inner">
                        <p className="text-blue-400 font-bold">Subject: Application — Customer Success Analyst</p>
                        <p className="text-slate-300">
                          "Hi SunFi team, my background in fintech user journeys and customer support scaling directly matches your clean energy mission..."
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5">
                        <span>Cost: <strong className="text-slate-900">1 Coin</strong></span>
                        <span className="text-emerald-600 font-bold">ATS Optimized ⚡</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleNextScene}
                      className="w-full py-2 rounded-xl bg-blue-600 text-white font-black text-[11px] shadow-lg shadow-blue-500/30 flex items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
                    >
                      <span>Send Direct Application</span> 🚀
                    </button>
                  </div>
                )}

                {/* SCENE 5: Launch / Success */}
                {currentScene.id === 'success' && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-2 animate-in fade-in duration-400 relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/30 mb-2">
                      🎉
                    </div>

                    <h3 className="text-xs font-black text-slate-900 tracking-tight">
                      Application Dispatched!
                    </h3>
                    <p className="text-[9px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                      Your pitch is directly in SunFi's hiring queue. Interview odds: 88%.
                    </p>

                    <div className="mt-3.5 w-full space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onGetStarted();
                        }}
                        className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] shadow-md shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Start Exploring Roles</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      {onOpenResume && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenResume();
                          }}
                          className="w-full py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <UploadCloud className="w-3 h-3 text-blue-500" />
                          <span>Upload My CV</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Phone Bottom Nav Dock */}
              <div className="relative z-20 px-3 py-1.5 bg-white border-t border-slate-200/80 flex items-center justify-around text-slate-400 text-[8px]">
                <div className="flex flex-col items-center gap-0.5 text-blue-600 font-bold">
                  <span>🏠</span>
                  <span>Home</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span>💼</span>
                  <span>Jobs</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span>🔖</span>
                  <span>Saved</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <span>👤</span>
                  <span>Profile</span>
                </div>
              </div>

              {/* Home indicator bar */}
              <div className="bg-white pb-1 flex justify-center">
                <div className="w-24 h-1 bg-slate-300 rounded-full"></div>
              </div>

            </div>

          </div>

        </div>

        {/* Dynamic Caption Bar */}
        <div className="w-full px-6 py-2 bg-black/20 text-center">
          <p className="text-xs sm:text-sm font-semibold text-white drop-shadow-sm max-w-xl mx-auto transition-all duration-300">
            {currentScene.caption}
          </p>
        </div>

        {/* Video Scrubber & Playback Controls */}
        <div className="w-full px-5 py-3 bg-white/10 backdrop-blur-md border-t border-white/15 flex flex-col gap-2">
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-white pt-0.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  setIsPlaying(!isPlaying);
                }}
                className="w-7 h-7 rounded-full bg-white text-[#0055ff] flex items-center justify-center hover:bg-blue-50 transition-transform active:scale-95 cursor-pointer shadow-sm"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono text-[11px] text-white/90">
                00:{String(Math.floor(effectiveSeconds)).padStart(2, '0')} / 00:{String(Math.floor(totalDuration)).padStart(2, '0')}
              </span>
            </div>

            {/* Chapter Pill Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevScene}
                disabled={currentSceneIndex === 0}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-[11px] font-semibold text-white transition-colors cursor-pointer"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={handleNextScene}
                disabled={currentSceneIndex === SCENES.length - 1}
                className="px-3 py-1 rounded-lg bg-white text-[#0055ff] hover:bg-blue-50 disabled:opacity-40 text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
