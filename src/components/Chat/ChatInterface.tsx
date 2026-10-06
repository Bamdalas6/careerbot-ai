'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Sparkles, Mic, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useVoiceSpeech } from '@/hooks/useVoiceSpeech';
import { ChatMessage, JobListing, SavedJob } from '@/types/job';
import { JobCard } from './JobCard';
import { QuickPrompts } from './QuickPrompts';
import { useAuth } from '@/context/AuthContext';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  savedJobs: SavedJob[];
  onToggleSave: (job: JobListing) => void;
  onOpenTailor: (job: JobListing) => void;
  onViewJob?: (job: JobListing) => void;
}

const LOADING_STEPS = [
  'Reading your request…',
  'Scanning live career portals…',
  'Matching roles to your skills…',
  'Ranking the best fits…',
];

const INITIAL_JOB_LIMIT = 6;

function FormattedMessageText({ text, isUser }: { text: string; isUser?: boolean }) {
  if (!text) return null;
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, lIdx) => {
        if (!line.trim()) {
          return <div key={lIdx} className="h-1.5" />;
        }
        const parts = line.split(/(\*\*(?!\s)[^*]+?(?<!\s)\*\*|\*(?!\s)[^*]+?(?<!\s)\*)/g);
        return (
          <p key={lIdx} className="m-0 leading-relaxed">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
                return (
                  <strong key={pIdx} className={isUser ? 'font-bold' : 'font-bold text-slate-950'}>
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
                return (
                  <em key={pIdx} className={isUser ? 'italic opacity-90' : 'italic text-slate-700'}>
                    {part.slice(1, -1)}
                  </em>
                );
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
}

function BotAvatar({ thinking = false }: { thinking?: boolean }) {
  return (
    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0080ff] via-indigo-500 to-violet-500 text-white shadow-[0_4px_12px_-2px_rgba(79,70,229,0.5)]">
      {thinking && <span className="absolute inset-0 rounded-full bg-indigo-400/50 animate-ping" />}
      <Sparkles className="relative h-4 w-4" />
    </div>
  );
}

function ThinkingBubble() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % LOADING_STEPS.length), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-start gap-2.5">
        <BotAvatar thinking />
        <div className="rounded-3xl rounded-tl-md bg-white border border-slate-100 shadow-sm px-4 py-3">
          <div className="flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-indigo-500" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-1.5 text-xs font-semibold text-slate-500"
              role="status"
            >
              {LOADING_STEPS[step]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:pl-10">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-3xl border border-slate-100 bg-white p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-2xl" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-2.5 w-1/3 rounded-full" />
                <div className="skeleton h-3 w-2/3 rounded-full" />
              </div>
            </div>
            <div className="skeleton h-2.5 w-full rounded-full" />
            <div className="skeleton h-2.5 w-4/5 rounded-full" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  onSendMessage,
  savedJobs,
  onToggleSave,
  onOpenTailor,
  onViewJob,
}) => {
  const { user, credits, requireAuth, openCreditModal } = useAuth();
  const [input, setInput] = useState('');
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const baseInputRef = useRef('');

  const { isListening, isSupported, errorMessage, toggleListening, stopListening } = useVoiceSpeech({
    onTranscript: (spokenText) => {
      const prefix = baseInputRef.current ? `${baseInputRef.current.trim()} ` : '';
      setInput(`${prefix}${spokenText}`);
    },
  });

  const guard = () => {
    if (!requireAuth()) return false;
    if (credits <= 0) {
      openCreditModal();
      return false;
    }
    return true;
  };

  const handleVoiceToggle = () => {
    if (!guard()) return;
    if (!isListening) {
      baseInputRef.current = input;
      inputRef.current?.focus();
    }
    toggleListening();
  };

  const isJobSaved = (jobId: string) => savedJobs.some((j) => j.id === jobId);

  useEffect(() => {
    if (messages.length === 0 && !isLoading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    if (!guard()) return;
    if (isListening) {
      stopListening();
    }
    onSendMessage(input.trim());
    setInput('');
    baseInputRef.current = '';
  };

  const handleSelectQuery = (query: string) => {
    if (!guard()) return;
    onSendMessage(query);
  };

  return (
    <div className="flex flex-1 flex-col w-full">
      <div className="flex-1 space-y-6 pb-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-2 pt-6 pb-4">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16 }}
              className="relative mb-5"
            >
              <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-blue-400/30 to-violet-400/30 blur-xl animate-bubble-pulse-ring" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-[#0080ff] via-indigo-500 to-violet-500 text-white shadow-[0_12px_30px_-8px_rgba(79,70,229,0.6)] animate-bubble-float-3">
                <Sparkles className="h-8 w-8" />
              </div>
            </motion.div>
            <h2 className="text-[22px] sm:text-2xl font-black text-slate-900 tracking-tight">
              Where do you want to work next?
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md leading-relaxed">
              Describe a role, skills, salary or company. I&apos;ll scan live job boards and bring back direct apply links.
            </p>

            <div className="mt-7 w-full">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Try one of these</p>
              <QuickPrompts onSelectPrompt={handleSelectQuery} />
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const jobs = msg.jobs || [];
            const isExpanded = !!expandedMessages[msg.id];
            const visibleJobs = isExpanded ? jobs : jobs.slice(0, INITIAL_JOB_LIMIT);
            const hiddenCount = jobs.length - INITIAL_JOB_LIMIT;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-3`}
              >
                <div className={`flex items-end gap-2.5 max-w-[88%] sm:max-w-[75%] ${isUser ? 'flex-row-reverse' : ''}`}>
                  {!isUser && <BotAvatar />}
                  <div
                    className={`px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? 'rounded-3xl rounded-br-md bg-gradient-to-br from-[#0080ff] to-indigo-600 text-white shadow-[0_8px_20px_-8px_rgba(0,128,255,0.6)]'
                        : 'rounded-3xl rounded-bl-md bg-white border border-slate-100 text-slate-800 shadow-sm'
                    }`}
                  >
                    <FormattedMessageText text={msg.content} isUser={isUser} />
                    <span className={`block mt-1 text-[10px] font-medium ${isUser ? 'text-white/60 text-right' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>

                {jobs.length > 0 && (
                  <div className="w-full sm:pl-10 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {visibleJobs.map((job, idx) => (
                        <motion.div
                          key={`${job.id || 'job'}-${idx}`}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx, 6) * 0.05 }}
                        >
                          <JobCard
                            job={job}
                            isSaved={isJobSaved(job.id)}
                            onToggleSave={onToggleSave}
                            onOpenTailor={onOpenTailor}
                            onSearch={handleSelectQuery}
                            onViewJob={onViewJob}
                          />
                        </motion.div>
                      ))}
                    </div>

                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedMessages((prev) => ({ ...prev, [msg.id]: !isExpanded }))}
                        className="w-full flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        {isExpanded ? 'Show fewer' : `Show all ${jobs.length} roles (+${hiddenCount} more)`}
                      </button>
                    )}
                  </div>
                )}

                {msg.suggested_queries && msg.suggested_queries.length > 0 && (
                  <div className="w-full sm:pl-10 flex flex-wrap gap-2 pt-1">
                    {msg.suggested_queries.map((sq) => (
                      <motion.button
                        key={sq}
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleSelectQuery(sq)}
                        className="flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{sq}</span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })
        )}

        {isLoading && <ThinkingBubble />}

        <div ref={messagesEndRef} className="scroll-mb-40" />
      </div>

      {/* Composer: sticks above the floating bottom dock */}
      <div className="sticky bottom-24 z-20 pt-2">
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="mb-2 flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                </span>
                <span className="truncate">Listening… say the role or skills you want</span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500 text-white hover:bg-rose-600 transition cursor-pointer"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {errorMessage && (
          <div className="mb-2 px-3.5 py-1.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2">
            <span>{errorMessage}</span>
            <button type="button" onClick={() => stopListening()} className="text-[10px] font-bold uppercase underline">
              Dismiss
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-xl border border-slate-200 p-1.5 pl-4 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)] focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/15 transition"
        >
          <Sparkles className="h-4 w-4 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onFocus={(e) => {
              if (!guard()) e.target.blur();
            }}
            onChange={(e) => {
              if (!guard()) return;
              setInput(e.target.value);
            }}
            placeholder={
              user && credits <= 0
                ? '0 Tokens — recharge to search live jobs…'
                : isListening
                ? 'Listening to your voice…'
                : 'Ask for a role, skill, salary or company…'
            }
            aria-label="Message CareerBot"
            className="flex-1 min-w-0 bg-transparent py-2 text-sm sm:text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            disabled={isLoading}
          />

          {isSupported && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer active:scale-90 ${
                isListening ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Speak your search'}
            >
              {isListening && <span className="absolute inset-0 rounded-full bg-rose-400/60 animate-ping" />}
              <Mic className="relative h-4 w-4" />
            </button>
          )}

          <motion.button
            type="submit"
            disabled={!input.trim() || isLoading}
            whileTap={{ scale: 0.88 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0080ff] to-indigo-600 text-white shadow-[0_4px_12px_rgba(0,128,255,0.45)] disabled:opacity-35 disabled:shadow-none disabled:cursor-not-allowed transition-opacity"
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4 stroke-[2.5]" />
          </motion.button>
        </form>
      </div>
    </div>
  );
};
