'use client';

import React from 'react';

interface LogoIconProps {
  className?: string;
}

/**
 * CareerBot AI Primary Iconic Mark:
 * A sleek geometric "C" merged with an ascending 45-degree career trajectory arrow & AI core.
 */
export const LogoIcon: React.FC<LogoIconProps> = ({ className = 'h-5 w-5' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer sweeping C-curve (Career) */}
      <path
        d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.024 20 19.3496 17.034 19.8988 13.15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Upward Career Growth Arrow */}
      <path
        d="M14.5 4H20.5V10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 4L11 13.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Precision AI Core Node */}
      <circle cx="11" cy="13.5" r="1.5" fill="currentColor" />
    </svg>
  );
};

interface LogoBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LogoBadge: React.FC<LogoBadgeProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6 rounded-lg',
    md: 'h-7 w-7 sm:h-8 sm:w-8 rounded-xl',
    lg: 'h-10 w-10 sm:h-11 sm:w-11 rounded-2xl',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4 sm:h-4.5 sm:w-4.5',
    lg: 'h-6 w-6',
  };

  return (
    <div
      className={`flex items-center justify-center bg-zinc-900 text-white dark:bg-white dark:text-black shadow-xs shrink-0 transition-transform ${sizeClasses[size]} ${className}`}
    >
      <LogoIcon className={iconSizes[size]} />
    </div>
  );
};

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm sm:text-[15px]',
    lg: 'text-lg sm:text-xl',
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 ${className}`}>
      <LogoBadge size={size} />
      {showText && (
        <span className={`font-bold tracking-tight text-zinc-900 dark:text-[#f7f8f8] select-none ${textSizes[size]}`}>
          CareerBot
          <span className="font-semibold text-zinc-400 dark:text-zinc-500 ml-1 text-[11px] sm:text-xs uppercase tracking-wider">
            AI
          </span>
        </span>
      )}
    </div>
  );
};

export default Logo;
