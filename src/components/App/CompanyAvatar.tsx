'use client';

import React from 'react';
import clsx from 'clsx';
import { companyInitials, companyTheme } from '@/lib/job-display';

interface CompanyAvatarProps {
  company: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'w-9 h-9 rounded-xl text-[11px]',
  md: 'w-11 h-11 rounded-2xl text-sm',
  lg: 'w-14 h-14 rounded-2xl text-base',
};

/** Colourful initials badge; the colour is stable per company so it becomes recognisable. */
export const CompanyAvatar: React.FC<CompanyAvatarProps> = ({ company, size = 'md', className }) => (
  <div
    aria-hidden="true"
    className={clsx(
      'bg-gradient-to-br text-white font-black tracking-tight flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white/70',
      companyTheme(company).avatar,
      SIZES[size],
      className
    )}
  >
    {companyInitials(company)}
  </div>
);
