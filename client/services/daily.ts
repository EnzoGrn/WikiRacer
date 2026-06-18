import Cookies from 'js-cookie';

export interface DailyState {
  status: 'idle' | 'playing' | 'finished';
  clicks: number;
  path: string[];
  elapsedSeconds: number;
  sessionStart: number | null;
  totalSeconds: number | null;
}

export interface HistoryEntry {
  date: string;
  source: string;
  target: string;
  clicks: number;
  time: number;
  path: string[];
}

export const COOKIE_KEY = 'wikiracer:daily';
export const HISTORY_COOKIE_KEY = 'wikiracer:daily:history';
export const COOKIE_EXPIRES = 180;

export function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function loadDailyState(): DailyState | null {
  try {
    const raw = Cookies.get(COOKIE_KEY);
    if (!raw) return null;
    const { date, state } = JSON.parse(raw);
    if (date !== getTodayKey()) return null;
    return state;
  } catch {
    return null;
  }
}

export function saveDailyState(state: DailyState) {
  Cookies.set(COOKIE_KEY, JSON.stringify({
    date: getTodayKey(),
    state,
  }), { expires: COOKIE_EXPIRES });
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = Cookies.get(HISTORY_COOKIE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(entry: HistoryEntry) {
  const history = loadHistory();
  if (history.find(h => h.date === entry.date)) return;
  history.unshift(entry);
  Cookies.set(HISTORY_COOKIE_KEY, JSON.stringify(history), { expires: COOKIE_EXPIRES });
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}