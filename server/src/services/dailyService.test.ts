import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('./prisma', () => ({
  prisma: {
    dailyRoute: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    dailyCandidate: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    dailyStats: {
      upsert: vi.fn(),
    },
  },
}));

// Mock wikipedia
vi.mock('./wikipedia', () => ({
  randomPopularWikiPage: vi.fn(),
}));

import { prisma } from './prisma';
import { randomPopularWikiPage } from './wikipedia';
import {
  getTodayDate,
  generateCandidates,
  approveCandidate,
  getDailyRoute,
  completeDailyRoute,
  getArchives,
} from './dailyService';

describe('getTodayDate', () => {
  it('returns a date with time set to midnight', async () => {
    const date = await getTodayDate();
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
  });
});

describe('generateCandidates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generates the requested number of candidates', async () => {
    vi.mocked(randomPopularWikiPage)
      .mockResolvedValueOnce('Napoleon')
      .mockResolvedValueOnce('Pizza')
      .mockResolvedValueOnce('France')
      .mockResolvedValueOnce('Italy')
      .mockResolvedValueOnce('Germany')
      .mockResolvedValueOnce('Spain')
      .mockResolvedValueOnce('Portugal')
      .mockResolvedValueOnce('Brazil')
      .mockResolvedValueOnce('Argentina')
      .mockResolvedValueOnce('Chile');

    vi.mocked(prisma.dailyCandidate.create).mockResolvedValue({
      id: 1, date: new Date(), source: 'Napoleon', target: 'Pizza', createdAt: new Date(),
    });

    const candidates = await generateCandidates(new Date(), 5);
    expect(candidates).toHaveLength(5);
    expect(prisma.dailyCandidate.create).toHaveBeenCalledTimes(5);
  });

  it('retries if source equals target', async () => {
    vi.mocked(randomPopularWikiPage)
      .mockResolvedValueOnce('Napoleon')
      .mockResolvedValueOnce('Napoleon')
      .mockResolvedValueOnce('Napoleon')
      .mockResolvedValueOnce('Pizza');

    vi.mocked(prisma.dailyCandidate.create).mockResolvedValue({
      id: 1, date: new Date(), source: 'Napoleon', target: 'Pizza', createdAt: new Date(),
    });

    const candidates = await generateCandidates(new Date(), 1);
    expect(candidates).toHaveLength(1);
    expect(randomPopularWikiPage).toHaveBeenCalledTimes(4);
  });
});

describe('approveCandidate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a route from a candidate', async () => {
    const mockCandidate = { id: 1, date: new Date(), source: 'Napoleon', target: 'Pizza', createdAt: new Date() };
    vi.mocked(prisma.dailyCandidate.findUnique).mockResolvedValue(mockCandidate);
    vi.mocked(prisma.dailyRoute.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.dailyRoute.create).mockResolvedValue({
      ...mockCandidate, status: 'approved', stats: null,
    } as any);

    const route = await approveCandidate(1, new Date());
    expect(prisma.dailyRoute.create).toHaveBeenCalledOnce();
    expect(route.source).toBe('Napoleon');
    expect(route.target).toBe('Pizza');
  });

  it('throws if candidate not found', async () => {
    vi.mocked(prisma.dailyCandidate.findUnique).mockResolvedValue(null);
    await expect(approveCandidate(999, new Date())).rejects.toThrow('Candidate not found');
  });
});

describe('getDailyRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns approved route for today', async () => {
    vi.mocked(prisma.dailyRoute.findUnique).mockResolvedValue({
      date: new Date(),
      source: 'Napoleon',
      target: 'Pizza',
      status: 'approved',
      stats: null,
      createdAt: new Date(),
    } as any);

    const route = await getDailyRoute();
    expect(route).not.toBeNull();
    expect(route!.source).toBe('Napoleon');
  });

  it('returns null if route is pending', async () => {
    vi.mocked(prisma.dailyRoute.findUnique).mockResolvedValue({
      date: new Date(),
      source: 'Napoleon',
      target: 'Pizza',
      status: 'pending',
      stats: null,
      createdAt: new Date(),
    } as any);

    const route = await getDailyRoute();
    expect(route).toBeNull();
  });

  it('returns null if no route exists', async () => {
    vi.mocked(prisma.dailyRoute.findUnique).mockResolvedValue(null);
    const route = await getDailyRoute();
    expect(route).toBeNull();
  });
});

describe('completeDailyRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts daily stats', async () => {
    vi.mocked(prisma.dailyStats.upsert).mockResolvedValue({} as any);
    await completeDailyRoute(5, 120);
    expect(prisma.dailyStats.upsert).toHaveBeenCalledOnce();
  });
});

describe('getArchives', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns routes before today', async () => {
    vi.mocked(prisma.dailyRoute.findMany).mockResolvedValue([
      { date: new Date('2026-06-01'), source: 'Napoleon', target: 'Pizza', status: 'approved', stats: null, createdAt: new Date() },
    ] as any);

    const archives = await getArchives();
    expect(archives).toHaveLength(1);
    expect(prisma.dailyRoute.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ date: expect.objectContaining({ lt: expect.any(Date) }) }),
      })
    );
  });
});