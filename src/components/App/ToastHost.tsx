'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export interface ToastOptions {
  message: string;
  emoji?: string;
  tone?: 'default' | 'success' | 'celebrate';
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ActiveToast extends ToastOptions {
  id: number;
}

const EVENT = 'careerbot_toast';

/** Fire-and-forget toast from anywhere on the client; rendered by <ToastHost />. */
export function showToast(options: ToastOptions) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastOptions>(EVENT, { detail: options }));
}

const TONES = {
  default: 'bg-slate-900 text-white',
  success: 'bg-emerald-600 text-white',
  celebrate: 'bg-gradient-to-r from-[#0080ff] via-indigo-600 to-violet-600 text-white',
};

export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastOptions>).detail;
      const id = ++nextId.current;
      // Keep at most two on screen so rapid actions don't pile up.
      setToasts((prev) => [...prev.slice(-1), { ...detail, id }]);
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timers.delete(timer);
      }, detail.durationMs ?? 2600);
      timers.add(timer);
    };
    window.addEventListener(EVENT, onToast);
    return () => {
      window.removeEventListener(EVENT, onToast);
      timers.forEach(clearTimeout);
    };
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div
      aria-live="polite"
      className="fixed inset-x-0 bottom-28 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            className={`pointer-events-auto max-w-sm flex items-center gap-2.5 pl-3.5 pr-2 py-2 rounded-full shadow-[0_12px_30px_-10px_rgba(15,23,42,0.5)] text-[13px] font-semibold ${
              TONES[toast.tone ?? 'default']
            }`}
          >
            {toast.emoji && (
              <motion.span
                initial={{ scale: 0.4, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.05 }}
                className="text-base leading-none"
              >
                {toast.emoji}
              </motion.span>
            )}
            <span className={toast.action ? '' : 'pr-1.5'}>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="ml-1 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
