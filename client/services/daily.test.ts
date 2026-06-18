import { describe, it, expect, vi, beforeEach } from 'vitest';
import Cookies from 'js-cookie';
import { getTodayKey, loadDailyState, saveDailyState, loadHistory, saveToHistory, formatTime, type DailyState, type HistoryEntry } from './daily';

vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
  },
}));

const mockGet = Cookies.get as unknown as ReturnType<typeof vi.fn>;

const mockState: DailyState = {
  status: 'playing',
  clicks: 3,
  path: ['Napoleon', 'France'],
  elapsedSeconds: 60,
  sessionStart: null,
  totalSeconds: null,
};

const mockEntry: HistoryEntry = {
  date: '2026-06-15',
  source: 'Napoleon',
  target: 'Pizza',
  clicks: 5,
  time: 120,
  path: ['Napoleon', 'France', 'Pizza'],
};

describe('getTodayKey', () => {
  it('returns date in YYYY-MM-DD format', () => {
    const key = getTodayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('loadDailyState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null if no cookie', () => {
    mockGet.mockReturnValue(undefined);
    expect(loadDailyState()).toBeNull();
  });

  it('returns null if cookie is for another day', () => {
    mockGet.mockReturnValue(JSON.stringify({
      date: '2000-01-01',
      state: mockState,
    }));
    expect(loadDailyState()).toBeNull();
  });

  it('returns state if cookie is for today', () => {
    mockGet.mockReturnValue(JSON.stringify({
      date: getTodayKey(),
      state: mockState,
    }));
    const state = loadDailyState();
    expect(state).not.toBeNull();
    expect(state!.clicks).toBe(3);
  });

  it('returns null if cookie is malformed', () => {
    mockGet.mockReturnValue('invalid json{');
    expect(loadDailyState()).toBeNull();
  });
});

describe('saveDailyState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves state with today key', () => {
    saveDailyState(mockState);
    expect(Cookies.set).toHaveBeenCalledWith(
      'wikiracer:daily',
      expect.stringContaining(getTodayKey()),
      expect.objectContaining({ expires: 180 })
    );
  });
});

describe('loadHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array if no cookie', () => {
    mockGet.mockReturnValue(undefined);
    expect(loadHistory()).toEqual([]);
  });

  it('returns parsed history', () => {
    mockGet.mockReturnValue(JSON.stringify([mockEntry]));
    const history = loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0].source).toBe('Napoleon');
  });

  it('returns empty array on parse error', () => {
    mockGet.mockReturnValue('invalid{');
    expect(loadHistory()).toEqual([]);
  });
});

describe('saveToHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds entry to history', () => {
    mockGet.mockReturnValue(JSON.stringify([]));
    saveToHistory(mockEntry);
    expect(Cookies.set).toHaveBeenCalledOnce();
  });

  it('does not add duplicate entry', () => {
    mockGet.mockReturnValue(JSON.stringify([mockEntry]));
    saveToHistory(mockEntry);
    expect(Cookies.set).not.toHaveBeenCalled();
  });

  it('adds new entry at the beginning', () => {
    const oldEntry = { ...mockEntry, date: '2026-06-14' };
    mockGet.mockReturnValue(JSON.stringify([oldEntry]));

    saveToHistory(mockEntry);

    const saved = JSON.parse(vi.mocked(Cookies.set).mock.calls[0][1] as string);
    expect(saved[0].date).toBe('2026-06-15');
    expect(saved[1].date).toBe('2026-06-14');
  });
});

describe('formatTime', () => {
  it('formats seconds to mm:ss', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(3600)).toBe('60:00');
  });

  it('pads single digits', () => {
    expect(formatTime(9)).toBe('00:09');
    expect(formatTime(61)).toBe('01:01');
  });
});