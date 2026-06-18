import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../services/dailyService', () => ({
  getDailyRoute: vi.fn(),
  completeDailyRoute: vi.fn(),
  getArchives: vi.fn(),
}));

vi.mock('../services/prisma', () => ({
  prisma: {
    dailyRoute: {
      findUnique: vi.fn(),
    },
  },
}));

import { getDailyRoute, completeDailyRoute, getArchives } from '../services/dailyService';
import { prisma } from '../services/prisma';
import dailyRouter from './daily';

const app = express();
app.use(express.json());
app.use('/api/daily', dailyRouter);

const mockRoute = {
  date: new Date('2026-06-15'),
  source: 'Napoleon',
  target: 'Pizza',
  status: 'approved',
  stats: {
    completions: 10,
    totalClicks: 80,
    totalTime: 600,
  },
};

describe('GET /api/daily', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the daily route with stats', async () => {
    vi.mocked(getDailyRoute).mockResolvedValue(mockRoute as any);

    const res = await request(app).get('/api/daily');

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('Napoleon');
    expect(res.body.target).toBe('Pizza');
    expect(res.body.stats.completions).toBe(10);
    expect(res.body.stats.avgClicks).toBe(8);
    expect(res.body.stats.difficulty).toBeDefined();
  });

  it('returns 404 if no route available', async () => {
    vi.mocked(getDailyRoute).mockResolvedValue(null);

    const res = await request(app).get('/api/daily');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/daily/complete', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records a completion', async () => {
    vi.mocked(completeDailyRoute).mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/daily/complete')
      .send({ clicks: 5, timeSeconds: 120 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(completeDailyRoute).toHaveBeenCalledWith(5, 120);
  });

  it('returns 400 if clicks or time missing', async () => {
    const res = await request(app)
      .post('/api/daily/complete')
      .send({ clicks: 5 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/daily/archive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns past routes', async () => {
    vi.mocked(getArchives).mockResolvedValue([mockRoute] as any);

    const res = await request(app).get('/api/daily/archive');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].source).toBe('Napoleon');
  });
});

describe('GET /api/daily/archive/:date', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a specific archive route', async () => {
    vi.mocked(prisma.dailyRoute.findUnique).mockResolvedValue(mockRoute as any);

    const res = await request(app).get('/api/daily/archive/2026-06-15');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('Napoleon');
  });

  it('returns 404 if route not found', async () => {
    vi.mocked(prisma.dailyRoute.findUnique).mockResolvedValue(null);

    const res = await request(app).get('/api/daily/archive/2026-01-01');
    expect(res.status).toBe(404);
  });
});