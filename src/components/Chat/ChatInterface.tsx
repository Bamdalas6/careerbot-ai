'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  User, 
  Bot, 
  Loader2, 
  Search,
  Mic,
  MicOff
} from 'lucide-react';
import { useVoiceSpeech } from '@/hooks/useVoiceSpeech';
import { ChatMessage, JobListing, SavedJob } from '@/types/job';
import { JobCard } from './JobCard';
import { QuickPrompts } from './QuickPrompts';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  savedJobs: SavedJob[];
  onToggleSave: (job: JobListing) => void;
  onOpenTailor: (job: JobListing) => void;
}

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
                  <strong
                    key={pIdx}
                    className={isUser ? 'font-bold underline decoration-white/30' : 'font-bold text-zinc-950 dark:text-white'}
                  >
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
                return (
                  <em key={pIdx} className={isUser ? 'italic opacity-90' : 'italic text-zinc-700 dark:text-zinc-300'}>
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

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  onSendMessage,
  savedJobs,
  onToggleSave,
  onOpenTailor,
}) => {
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

  const handleVoiceToggle = () => {
    if (!isListening) {
      baseInputRef.current = input;
    }
    toggleListening();
  };

  const isJobSaved = (jobId: string) => savedJobs.some((j) => j.id === jobId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    if (isListening) {
      stopListening();
    }
    onSendMessage(input.trim());
    setInput('');
    baseInputRef.current = '';
  };

  const handleSelectQuery = (query: string) => {
    onSendMessage(query);
  };

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 max-w-5xl mx-auto w-full px-3 sm:px-6 py-2 sm:py-3 overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-6 pr-1 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <div className="glass mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-white/[0.045] text-zinc-900 dark:text-[#f7f8f8] border border-black/10 dark:border-white/10 shadow-sm">
              <Bot className="h-8 w-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Where do you want to work next?
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed">
              Describe your ideal role, skills, salary, or target companies. I will source live jobs and give you direct career page links.
            </p>

            <div className="mt-8 w-full">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Try asking something like
              </p>
              <QuickPrompts onSelectPrompt={handleSelectQuery} />
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              } space-y-3`}
            >
              {/* Message Bubble */}
              <div className="flex items-start gap-3 max-w-[85%] sm:max-w-[75%] md:max-w-3xl">
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200 shadow-xs dark:bg-white/[0.08] dark:text-[#f7f8f8] dark:border-white/10">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'btn-primary shadow-sm'
                      : 'panel text-zinc-900 dark:text-[#e6e7ea]'
                  }`}
                >
                  <FormattedMessageText text={msg.content} isUser={msg.role === 'user'} />
                </div>

                {msg.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>

              {/* Attached Job Cards Grid */}
              {msg.jobs && msg.jobs.length > 0 && (() => {
                const isExpanded = !!expandedMessages[msg.id];
                const initialLimit = 8;
                const visibleJobs = isExpanded ? msg.jobs : msg.jobs.slice(0, initialLimit);
                const hasMore = msg.jobs.length > initialLimit;

                return (
                  <div className="w-full pl-0 sm:pl-11 mt-2 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visibleJobs.map((job, idx) => (
                        <JobCard
                          key={`${job.id || 'job'}-${idx}`}
                          job={job}
                          isSaved={isJobSaved(job.id)}
                          onToggleSave={onToggleSave}
                          onOpenTailor={onOpenTailor}
                        />
                      ))}
                    </div>

                    {hasMore && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.02]">
                        <span className="text-xs font-medium text-zinc-600 dark:text-[#8a8f98]">
                          Showing <strong className="text-zinc-900 dark:text-white">{visibleJobs.length}</strong> of{' '}
                          <strong className="text-zinc-900 dark:text-white">{msg.jobs.length}</strong> matching positions
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedMessages((prev) => ({ ...prev, [msg.id]: !isExpanded }))}
                          className="flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-xs hover:border-zinc-900 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f7f8f8] dark:hover:bg-white/10 transition"
                        >
                          {isExpanded ? (
                            <span>Show Fewer (Collapse)</span>
                          ) : (
                            <span>✨ Show All {msg.jobs.length} Roles (+{msg.jobs.length - initialLimit} more)</span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Suggested Follow-up Queries */}
              {msg.suggested_queries && msg.suggested_queries.length > 0 && (
                <div className="w-full pl-0 sm:pl-11 flex flex-wrap gap-2 pt-1">
                  {msg.suggested_queries.map((sq, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectQuery(sq)}
                      className="flex items-center gap-1.5 rounded-full glass-chip px-3 py-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8] transition"
                    >
                      <Sparkles className="h-3 w-3 text-indigo-500 dark:text-[#8a8f98]" />
                      <span>{sq}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-200 dark:bg-white/[0.08] dark:text-[#f7f8f8] dark:border-white/10 shadow-xs animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 panel rounded-2xl px-4 py-3 text-xs text-zinc-600 dark:text-[#8a8f98]">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-600 dark:text-[#8a8f98]" />
              <span>Scanning live career portals and matching roles...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="mt-2 pt-2 border-t border-black/10 dark:border-zinc-800/80">
        {/* Active Speech Recognition Banner */}
        {isListening && (
          <div className="mb-2 flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-in fade-in slide-in-from-bottom-1 duration-150 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <span className="truncate">Listening... Speak what roles or skills you are looking for</span>
            </div>
            <button
              type="button"
              onClick={stopListening}
              className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500 text-white hover:bg-rose-600 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => stopListening()}
              className="text-[10px] font-bold uppercase underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="absolute left-4 text-zinc-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening to your voice..." : "Search roles, skills, companies, salary (e.g. 'Senior React Remote $160k')..."}
            className="field w-full rounded-2xl py-3.5 pl-11 pr-28 sm:pr-32 text-sm sm:text-base min-h-[44px] shadow-xs bg-white dark:bg-white/[0.04] text-zinc-900 dark:text-[#f7f8f8] border border-black/15 dark:border-white/10 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
            disabled={isLoading}
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            {/* Voice Speech Microphone Button (Beside Send Button) */}
            {isSupported && (
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                  isListening
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-105 ring-2 ring-rose-400/50 animate-pulse'
                    : 'border border-black/10 bg-black/[0.04] text-zinc-600 hover:text-zinc-900 hover:bg-black/[0.08] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#8a8f98] dark:hover:text-white dark:hover:bg-white/[0.12]'
                }`}
                title={isListening ? 'Listening... Click to stop' : 'Use voice speech to type'}
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

            {/* Send / Ask Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="btn-primary flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 shadow-xs active:scale-95 transition-all"
            >
              <span>Ask</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
        <p className="mt-2 text-center text-[11px] text-zinc-500">
          CareerBot AI connects directly to verified company career pages & public job feeds.
        </p>
      </div>
    </div>
  );
};
