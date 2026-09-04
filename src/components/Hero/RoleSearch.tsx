'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, Search, Mic } from 'lucide-react';
import { useVoiceSpeech } from '@/hooks/useVoiceSpeech';

const PLACEHOLDERS = [
  'Senior React developer, remote, $150k+…',
  'Entry-level data analyst, no experience please…',
  'AI/ML engineer at a startup that still has runway…',
  'Product designer, Figma wizard, hybrid Berlin…',
  'Anything that lets me keep my pajamas on…',
  'Backend Go engineer, Series B, good coffee…',
];

const CHIPS = [
  { label: 'Remote React', query: 'Remote React developer roles' },
  { label: 'AI / ML', query: 'AI and machine learning engineer jobs' },
  { label: 'Design', query: 'Product designer and UX roles' },
  { label: 'Internships', query: 'Internships for students and new grads' },
  { label: '$150k+', query: 'Software engineering roles paying over $150,000' },
  { label: 'Zero experience 🙏', query: 'Entry level jobs with no experience required' },
];

interface RoleSearchProps {
  onSearch: (query: string) => void;
  onExcitementChange?: (value: number) => void;
  isLoading?: boolean;
}

export const RoleSearch: React.FC<RoleSearchProps> = ({
  onSearch,
  onExcitementChange,
  isLoading = false,
}) => {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const baseValueRef = useRef('');

  const { isListening, isSupported, errorMessage, toggleListening, stopListening } = useVoiceSpeech({
    onTranscript: (spokenText) => {
      const prefix = baseValueRef.current ? `${baseValueRef.current.trim()} ` : '';
      setValue(`${prefix}${spokenText}`);
    },
  });

  const handleVoiceToggle = () => {
    if (!isListening) {
      baseValueRef.current = value;
    }
    toggleListening();
  };

  // Rotate the placeholder only while the field is empty and unfocused.
  useEffect(() => {
    if (focused || value || isListening) return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, [focused, value, isListening]);

  // Wake the orb up as the visitor engages with the field.
  useEffect(() => {
    if (!onExcitementChange) return;
    const typed = Math.min(1, value.trim().length / 24);
    onExcitementChange(focused || isListening ? 0.45 + 0.55 * typed : typed * 0.3);
  }, [focused, value, isListening, onExcitementChange]);

  // ⌘K / Ctrl+K focuses the field instead of jumping straight to chat.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const submit = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || isLoading) return;
    if (isListening) stopListening();
    onSearch(trimmed);
    setValue('');
    baseValueRef.current = '';
  };

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-3">
      {/* Speech Listening Pill */}
      {isListening && (
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-in fade-in slide-in-from-top-1 duration-150">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <span>Listening... Speak what role you are looking for</span>
          <button
            type="button"
            onClick={stopListening}
            className="text-[10px] uppercase font-bold underline ml-1 cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className={`glass-search group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 ${
          focused || isListening ? 'is-focused ring-1 ring-zinc-400/30' : ''
        }`}
      >
        <Search
          className={`h-4 w-4 shrink-0 transition-colors ${
            focused || isListening ? 'text-zinc-900 dark:text-[#f7f8f8]' : 'text-zinc-400 dark:text-[#62666d]'
          }`}
        />

        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={isLoading}
            aria-label="Search for a role"
            placeholder={isListening ? "Listening to your voice..." : undefined}
            className="w-full bg-transparent text-[15px] font-medium text-zinc-900 dark:text-[#f7f8f8] outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 disabled:opacity-60"
          />
          {!value && !isListening && (
            <span
              key={placeholderIndex}
              aria-hidden="true"
              className="placeholder-fade pointer-events-none absolute inset-0 flex items-center truncate text-[15px] text-zinc-400 dark:text-[#62666d]"
            >
              {PLACEHOLDERS[placeholderIndex]}
            </span>
          )}
        </div>

        <kbd className="hidden shrink-0 rounded border border-black/10 bg-black/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 sm:block dark:border-white/10 dark:bg-white/[0.05] dark:text-[#62666d]">
          ⌘K
        </kbd>

        <div className="flex items-center gap-1.5 shrink-0">
          {isSupported && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                isListening
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-105 ring-2 ring-rose-400/50 animate-pulse'
                  : 'border border-black/10 bg-black/[0.04] text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.08] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#8a8f98] dark:hover:text-white'
              }`}
              title={isListening ? 'Listening... Click to stop' : 'Use voice speech to search'}
              aria-label={isListening ? 'Stop listening' : 'Start voice speech'}
            >
              {isListening ? (
                <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-200 opacity-75" />
                  <Mic className="h-3.5 w-3.5 text-white" />
                </span>
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          )}

          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            aria-label="Find roles"
            className="btn-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30 active:scale-95"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => submit(chip.query)}
            disabled={isLoading}
            className="glass-chip rounded-full px-3 py-1.5 text-[12.5px] font-medium text-zinc-600 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};
