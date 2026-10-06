'use client';

import { useMemo, useSyncExternalStore } from 'react';

/** Light gamification kept per browser: a streak of consecutive days visiting the feed. */

const KEY = 'careerbot_engagement_v1';
const EVENT = 'careerbot_engagement';

interface StoredEngagement {
  lastVisit?: string;
  streak?: number;
}

export interface Engagement {
  streak: number;
}

function dayKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): StoredEngagement {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoredEngagement;
  } catch {
    return {};
  }
}

function write(next: StoredEngagement) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: the streak simply stays at zero */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Call once per feed visit; extends the streak on consecutive days. */
export function recordVisit() {
  const data = parse(readRaw());
  const today = dayKey();
  if (data.lastVisit === today) return;
  const streak = data.lastVisit === dayKey(-1) ? (data.streak || 0) + 1 : 1;
  write({ ...data, lastVisit: today, streak });
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

export function useEngagement(): Engagement {
  // The raw string is a stable snapshot; the server snapshot is empty so hydration matches.
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => {
    const data = parse(raw);
    const today = dayKey();
    const streakAlive = data.lastVisit === today || data.lastVisit === dayKey(-1);
    return { streak: streakAlive ? data.streak || 0 : 0 };
  }, [raw]);
}
