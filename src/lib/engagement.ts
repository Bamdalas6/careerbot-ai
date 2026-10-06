'use client';

import { useMemo, useSyncExternalStore } from 'react';

/**
 * Light gamification kept per browser: a daily visit streak and a daily
 * "review N picks" goal for the suggested-jobs deck.
 */

const KEY = 'careerbot_engagement_v1';
const EVENT = 'careerbot_engagement';
export const DAILY_REVIEW_GOAL = 5;

interface StoredEngagement {
  lastVisit?: string;
  streak?: number;
  reviewDate?: string;
  reviewed?: number;
}

export interface Engagement {
  streak: number;
  reviewedToday: number;
  goalReached: boolean;
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
    /* storage unavailable: the features simply stay at zero */
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

/** Counts one reviewed deck card; returns today's new total. */
export function recordReview(delta: 1 | -1 = 1): number {
  const data = parse(readRaw());
  const today = dayKey();
  const current = data.reviewDate === today ? data.reviewed || 0 : 0;
  const reviewed = Math.max(0, current + delta);
  write({ ...data, reviewDate: today, reviewed });
  return reviewed;
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
    const reviewedToday = data.reviewDate === today ? data.reviewed || 0 : 0;
    return {
      streak: streakAlive ? data.streak || 0 : 0,
      reviewedToday,
      goalReached: reviewedToday >= DAILY_REVIEW_GOAL,
    };
  }, [raw]);
}
