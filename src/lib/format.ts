import type { Status } from './types';

export const STATUS_LABELS: Record<Status, string> = {
  online: 'Online',
  busy: 'Busy',
  away: 'Away',
  brb: 'Be Right Back',
  phone: 'On the Phone',
  lunch: 'Out to Lunch',
  offline: 'Appear Offline',
};

export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export const uid = (prefix = 'id') => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

/** Both sides of a 1:1 chat compute the same id. */
export const directId = (a: string, b: string) => `dm:${[a, b].sort().join(':')}`;
