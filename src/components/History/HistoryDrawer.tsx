'use client';

import React, { useState, useEffect } from 'react';
import { X, History, MessageSquare, Trash2, Plus, Clock, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ChatMessage } from '@/types/job';

interface SavedChat {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

interface SavedCV {
  id: string;
  user_id: string;
  title: string;
  text: string;
  score?: number;
  created_at: string;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chat: SavedChat) => void;
  onNewChat: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  onSelectChat,
  onNewChat,
}) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'chats' | 'cvs'>('chats');
  const [chats, setChats] = useState<SavedChat[]>([]);
  const [cvs, setCvs] = useState<SavedCV[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    let isMounted = true;

    Promise.resolve().then(() => {
      if (isMounted) setLoading(true);
    });

    Promise.all([
      fetch('/api/history/chats').then((r) => r.json()),
      fetch('/api/history/resumes').then((r) => r.json()),
    ])
      .then(([chatData, cvData]) => {
        if (!isMounted) return;
        if (chatData?.success && Array.isArray(chatData.chats)) {
          setChats(chatData.chats);
        }
        if (cvData?.success && Array.isArray(cvData.resumes)) {
          setCvs(cvData.resumes);
        }
      })
      .catch((err) => {
        console.error('Error fetching history:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setDeletingId(chatId);
    try {
      const res = await fetch(`/api/history/chats?id=${chatId}`, { method: 'DELETE' });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-black/10 bg-white text-zinc-900 shadow-2xl dark:border-white/[0.08] dark:bg-[#0c0c0c] dark:text-[#f7f8f8]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-zinc-50 px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-black/[0.04] text-zinc-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-[#f7f8f8]">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-[#f7f8f8]">Search & CV History</h3>
              <p className="text-[11px] text-zinc-500 dark:text-[#8a8f98]">Your past career searches and resumes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-black/[0.06] hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:bg-white/[0.06] dark:hover:text-[#f7f8f8] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs & New Chat Action */}
        <div className="flex items-center justify-between border-b border-black/10 bg-zinc-50/50 px-5 py-2 dark:border-white/[0.08] dark:bg-white/[0.01]">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('chats')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                tab === 'chats' ? 'bg-zinc-900 text-white dark:bg-white/[0.1] dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
              }`}
            >
              Chats ({chats.length})
            </button>
            <button
              onClick={() => setTab('cvs')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                tab === 'cvs' ? 'bg-zinc-900 text-white dark:bg-white/[0.1] dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:text-[#8a8f98] dark:hover:text-[#f7f8f8]'
              }`}
            >
              CVs ({cvs.length})
            </button>
          </div>

          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-[#f7f8f8] dark:hover:bg-white/[0.08] transition shadow-xs"
          >
            <Plus className="h-3 w-3" />
            <span>New Search</span>
          </button>
        </div>

        {/* Content List */}
        <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2 text-zinc-500 dark:text-[#8a8f98]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-xs">Loading your history...</p>
            </div>
          ) : !user ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 px-4">
              <History className="h-8 w-8 text-zinc-400 dark:text-[#62666d]" />
              <p className="text-xs text-zinc-600 dark:text-[#8a8f98]">Sign in to automatically save and sync your job search history.</p>
            </div>
          ) : tab === 'chats' ? (
            chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-zinc-500 dark:text-[#8a8f98]">
                <MessageSquare className="h-8 w-8 text-zinc-400 dark:text-[#62666d]" />
                <p className="text-xs">No saved chat sessions yet.</p>
                <p className="text-[11px] text-zinc-400 dark:text-[#62666d]">Your job searches will appear here automatically.</p>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    onSelectChat(chat);
                    onClose();
                  }}
                  role="button"
                  tabIndex={0}
                  className="group relative flex cursor-pointer items-start justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-3 transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.05]"
                >
                  <div className="min-w-0 flex-1 pr-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8]">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-[#8a8f98]" />
                      <span className="truncate">{chat.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-[#62666d]">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(chat.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>{chat.messages.length} messages</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    disabled={deletingId === chat.id}
                    title="Delete chat"
                    className="rounded-lg p-1.5 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-200 hover:text-zinc-900 dark:text-[#62666d] dark:hover:bg-white/[0.08] dark:hover:text-[#f7f8f8]"
                  >
                    {deletingId === chat.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ))
            )
          ) : (
            cvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 text-zinc-500 dark:text-[#8a8f98]">
                <FileText className="h-8 w-8 text-zinc-400 dark:text-[#62666d]" />
                <p className="text-xs">No saved CV rebuilds yet.</p>
                <p className="text-[11px] text-zinc-400 dark:text-[#62666d]">Rebuilt CVs and scores will be stored here.</p>
              </div>
            ) : (
              cvs.map((cv) => (
                <div
                  key={cv.id}
                  className="space-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-[#f7f8f8]">
                      <FileText className="h-3.5 w-3.5 text-zinc-400 dark:text-[#8a8f98]" />
                      <span>{cv.title}</span>
                    </div>
                    {cv.score != null && (
                      <span className="rounded-full border border-black/10 bg-black/[0.04] px-2 py-0.5 text-[10px] font-bold text-zinc-900 dark:border-white/10 dark:bg-white/[0.05] dark:text-white">
                        Score: {cv.score}/100
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-[#62666d]">
                    Saved {new Date(cv.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};
