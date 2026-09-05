'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, Search } from 'lucide-react';

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

  // Rotate the placeholder only while the field is empty and unfocused.
  useEffect(() => {
    if (focused || value) return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, [focused, value]);

  // Wake the orb up as the visitor engages with the field.
  useEffect(() => {
    if (!onExcitementChange) return;
    const typed = Math.min(1, value.trim().length / 24);
    onExcitementChange(focused ? 0.45 + 0.55 * typed : typed * 0.3);
  }, [focused, value, onExcitementChange]);

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
    onSearch(trimmed);
    setValue('');
  };

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className={`glass-search group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 ${
          focused ? 'is-focused' : ''
        }`}
      >
        <Search
          className={`h-4 w-4 shrink-0 transition-colors ${
            focused ? 'text-zinc-900 dark:text-[#f7f8f8]' : 'text-zinc-400 dark:text-[#62666d]'
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
            className="w-full bg-transparent text-[15px] font-medium text-zinc-900 dark:text-[#f7f8f8] outline-none placeholder:text-transparent disabled:opacity-60"
          />
          {!value && (
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

        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          aria-label="Find roles"
          className="btn-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
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
