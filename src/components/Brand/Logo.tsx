'use client';

import React, { useId } from 'react';

/**
 * CareerBot brand system.
 *
 * BotMark — the mascot: a friendly squircle bot head with a visor face and an
 * amber AI "spark" for an antenna. It is the logo, the favicon and the chat avatar.
 * Wordmark — "Career" in ink + "Bot" in the brand gradient.
 *
 * Static copies of the mark live in `public/logo.svg` and `src/app/icon.svg`;
 * keep them in sync when changing the geometry below.
 */

type BotMood = 'idle' | 'thinking';

interface BotMarkProps {
  className?: string;
  /** Blink and twinkle. Off by default so the mark stays still in dense UI. */
  animated?: boolean;
  mood?: BotMood;
  title?: string;
}

export const BotMark: React.FC<BotMarkProps> = ({
  className = 'h-8 w-8',
  animated = false,
  mood = 'idle',
  title,
}) => {
  const uid = useId().replace(/:/g, '');
  const bodyId = `cb-body-${uid}`;
  const shineId = `cb-shine-${uid}`;
  const thinking = mood === 'thinking';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'bot-animated' : ''} ${thinking ? 'bot-thinking' : ''}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={bodyId} x1="8" y1="12" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1A8CFF" />
          <stop offset="0.55" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id={shineId} x1="32" y1="16" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Antenna + AI spark */}
      <rect x="30.5" y="9" width="3" height="9" rx="1.5" fill="#4F46E5" />
      <path
        className="bot-spark"
        d="M32 0.5C32.9 4.2 34.3 5.6 38 6.5C34.3 7.4 32.9 8.8 32 12.5C31.1 8.8 29.7 7.4 26 6.5C29.7 5.6 31.1 4.2 32 0.5Z"
        fill="#FBBF24"
      />

      {/* Ears */}
      <rect x="3" y="31" width="7" height="14" rx="3.5" fill="#4338CA" />
      <rect x="54" y="31" width="7" height="14" rx="3.5" fill="#6D28D9" />

      {/* Head */}
      <rect x="7" y="16" width="50" height="44" rx="17" fill={`url(#${bodyId})`} />
      <rect x="7" y="16" width="50" height="44" rx="17" fill={`url(#${shineId})`} />

      {/* Visor */}
      <rect x="14" y="26" width="36" height="25" rx="11" fill="#FFFFFF" />

      {/* Eyes */}
      <g className="bot-eyes">
        <rect x="21.5" y="32" width="6" height="8" rx="3" fill="#0F172A" />
        <rect x="36.5" y="32" width="6" height="8" rx="3" fill="#0F172A" />
      </g>

      {/* Smile */}
      <path d="M28 44.5C30.4 46.4 33.6 46.4 36 44.5" stroke="#0F172A" strokeWidth="2.6" strokeLinecap="round" />

      {/* Cheeks */}
      <circle cx="18.5" cy="43" r="2" fill="#F472B6" fillOpacity="0.55" />
      <circle cx="45.5" cy="43" r="2" fill="#F472B6" fillOpacity="0.55" />
    </svg>
  );
};

/** Kept for existing imports; renders the new mark. */
export const LogoIcon: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => (
  <BotMark className={className} />
);

interface LogoBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animated?: boolean;
}

const MARK_SIZES = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8 sm:h-9 sm:w-9',
  lg: 'h-11 w-11 sm:h-12 sm:w-12',
};

export const LogoBadge: React.FC<LogoBadgeProps> = ({ size = 'md', className = '', animated = false }) => (
  <BotMark className={`${MARK_SIZES[size]} shrink-0 drop-shadow-[0_4px_10px_rgba(79,70,229,0.3)] ${className}`} animated={animated} />
);

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showAiTag?: boolean;
}

const WORD_SIZES = {
  sm: 'text-[15px]',
  md: 'text-[17px] sm:text-lg',
  lg: 'text-2xl sm:text-[26px]',
};

export const Wordmark: React.FC<WordmarkProps> = ({ size = 'md', className = '', showAiTag = true }) => (
  <span className={`inline-flex items-center gap-1.5 select-none ${className}`}>
    <span className={`font-black tracking-[-0.04em] leading-none ${WORD_SIZES[size]}`}>
      <span className="text-slate-900 dark:text-white">Career</span>
      <span className="bg-gradient-to-r from-[#1A8CFF] via-[#4F46E5] to-[#8B5CF6] bg-clip-text text-transparent">Bot</span>
    </span>
    {showAiTag && (
      <span className="px-1.5 py-[3px] rounded-md bg-gradient-to-r from-amber-300 to-amber-400 text-[9px] font-black tracking-wider text-amber-950 leading-none">
        AI
      </span>
    )}
  </span>
);

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  animated?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, animated = false, className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <LogoBadge size={size} animated={animated} />
    {showText && <Wordmark size={size} />}
  </div>
);

export default Logo;
