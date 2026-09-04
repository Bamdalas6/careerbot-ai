'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export const QuickScrollPill: React.FC = () => {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      // Show top button if scrolled down more than 150px
      setShowTop(scrollY > 150);

      // Show bottom button if more than 200px from the bottom
      setShowBottom(scrollHeight - scrollY - clientHeight > 200);
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();

    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <div
      aria-label="Quick Scroll Navigation"
      className="fixed bottom-6 right-4 z-40 flex flex-col gap-1.5 sm:bottom-8 sm:right-6 pointer-events-none animate-in fade-in duration-300"
    >
      {/* Scroll to Top */}
      <button
        type="button"
        onClick={scrollToTop}
        className={`group flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-black/15 bg-white/90 text-zinc-900 dark:border-white/15 dark:bg-black/80 dark:text-[#f7f8f8] shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-black/[0.08] dark:hover:bg-white/[0.15] hover:border-black/30 dark:hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 active:scale-95 ${
          showTop ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        title="Scroll to top"
        aria-label="Scroll to top of page"
      >
        <ArrowUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
      </button>

      {/* Scroll to Bottom */}
      <button
        type="button"
        onClick={scrollToBottom}
        className={`group flex h-10 w-10 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-black/15 bg-white/90 text-zinc-900 dark:border-white/15 dark:bg-black/80 dark:text-[#f7f8f8] shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-black/[0.08] dark:hover:bg-white/[0.15] hover:border-black/30 dark:hover:border-white/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 active:scale-95 ${
          showBottom ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
        title="Scroll to bottom"
        aria-label="Scroll to bottom of page"
      >
        <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
      </button>
    </div>
  );
};
