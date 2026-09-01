'use client';

import React, { useState } from 'react';
import { X, SlidersHorizontal, Sparkles } from 'lucide-react';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filterPrompt: string) => void;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
}) => {
  const [role, setRole] = useState('');
  const [isRemote, setIsRemote] = useState<boolean | null>(null);
  const [experience, setExperience] = useState('All');
  const [location, setLocation] = useState('');
  const [minSalary, setMinSalary] = useState('');

  if (!isOpen) return null;

  const handleApply = () => {
    const parts: string[] = [];
    if (role) parts.push(role);
    if (isRemote === true) parts.push('remote only');
    if (experience && experience !== 'All') parts.push(`${experience}-level`);
    if (location) parts.push(`located in or open to ${location}`);
    if (minSalary) parts.push(`with salary at least $${minSalary}k`);

    const query = parts.length > 0 ? `Find ${parts.join(', ')} jobs` : 'Show me top recommended tech jobs';
    onApplyFilters(query);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-black/10 bg-white text-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-black/[0.04] text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f7f8f8]">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base dark:text-white">Search Preferences</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Configure your target job criteria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/[0.06] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Target Role */}
          <div>
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider block mb-2 dark:text-zinc-400">
              Target Role / Keywords
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend Engineer, Product Designer, DevOps"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500 dark:focus:border-white/30"
            />
          </div>

          {/* Work Arrangement */}
          <div>
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider block mb-2 dark:text-zinc-400">
              Work Arrangement
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIsRemote(null)}
                className={`rounded-xl border py-2 text-xs font-semibold transition ${
                  isRemote === null
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white/25 dark:bg-white/10 dark:text-[#f7f8f8]'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                Any
              </button>
              <button
                type="button"
                onClick={() => setIsRemote(true)}
                className={`rounded-xl border py-2 text-xs font-semibold transition ${
                  isRemote === true
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white/25 dark:bg-white/10 dark:text-[#f7f8f8]'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                Remote Only
              </button>
              <button
                type="button"
                onClick={() => setIsRemote(false)}
                className={`rounded-xl border py-2 text-xs font-semibold transition ${
                  isRemote === false
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white/25 dark:bg-white/10 dark:text-[#f7f8f8]'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700'
                }`}
              >
                On-site / Hybrid
              </button>
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider block mb-2 dark:text-zinc-400">
              Experience Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['All', 'Entry', 'Mid', 'Senior', 'Lead'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setExperience(lvl)}
                  className={`rounded-xl border py-2 text-xs font-semibold transition ${
                    experience === lvl
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white/25 dark:bg-white/10 dark:text-[#f7f8f8]'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700'
                  }`}
                >
                  {lvl === 'All' ? 'All Levels' : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Target Location */}
          <div>
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider block mb-2 dark:text-zinc-400">
              Preferred Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, London, Europe, Worldwide"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500 dark:focus:border-white/30"
            />
          </div>

          {/* Minimum Salary */}
          <div>
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider block mb-2 dark:text-zinc-400">
              Min Annual Salary (USD $k)
            </label>
            <input
              type="number"
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
              placeholder="e.g. 120 (for $120,000+)"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500 dark:focus:border-white/30"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-black/10 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
          <button
            onClick={handleApply}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold sm:text-sm"
          >
            <Sparkles className="h-4 w-4" />
            <span>Apply Preferences & Search</span>
          </button>
        </div>
      </div>
    </div>
  );
};
