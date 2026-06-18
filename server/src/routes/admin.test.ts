import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../services/dailyService', () => ({
  approveCandidate: vi.fn(),
  generateCandidates: vi.fn(),
  getUpcomingCandidates: vi.fn(),
  getUpcomingRoutes: vi.fn(),
}));

vi.mock('../services/prisma', () => ({
  prisma: {
    dailyRoute: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    dailyCandidate: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    dailyStats: {
      deleteMany: vi.fn(),
    },
  },
}));

import { approveCandidate, generateCandidates } from '../services/dailyService';
import { prisma } from '../services/prisma';
import adminRouter from './admin';

const ADMIN_PASSWORD = 'changeme';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

const mockRoute = {
  date: new Date('2026-06-15'),
  source: 'Napoleon',
  target: 'Pizza',
  status: 'approved',
  stats: null,
  createdAt: new Date(),
};

const mockCandidate = {
  id: 1,
  date: new Date('2026-06-15'),
  source: 'Napoleon',
  target: 'Pizza',
  createdAt: new Date(),
};

describe('Admin auth middleware', () => {
  it('returns 401 without password', async () => {
    const res = await request(app).get('/api/admin/month');
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .get('/api/admin/month')
      .set('x-admin-password', 'wrongpassword');
    expect(res.status).toBe(401);
  });

  it('passes with correct password', async () => {
    vi.mocked(prisma.dailyRoute.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dailyCandidate.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/admin/month?year=2026&month=6')
      .set('x-admin-password', ADMIN_PASSWORD);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/admin/month', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns routes and candidates for the month', async () => {
    vi.mocked(prisma.dailyRoute.findMany).mockResolvedValue([mockRoute] as any);
    vi.mocked(prisma.dailyCandidate.findMany).mockResolvedValue([mockCandidate] as any);

    const res = await request(app)
      .get('/api/admin/month?year=2026&month=6')
      .set('x-admin-password', ADMIN_PASSWORD);

    expect(res.status).toBe(200);
    expect(res.body.routes).toHaveLength(1);
    expect(res.body.candidates).toHaveLength(1);
  });
});

describe('POST /api/admin/approve', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approves a candidate', async () => {
    vi.mocked(approveCandidate).mockResolvedValue(mockRoute as any);

    const res = await request(app)
      .post('/api/admin/approve')
      .set('x-admin-password', ADMIN_PASSWORD)
      .send({ candidateId: 1, date: '2026-06-15' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(approveCandidate).toHaveBeenCalledWith(1, new Date('2026-06-15'));
  });
});

describe('POST /api/admin/approve-manual', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a manual route', async () => {
    vi.mocked(prisma.dailyRoute.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.dailyRoute.create).mockResolvedValue(mockRoute as any);

    const res = await request(app)
      .post('/api/admin/approve-manual')
      .set('x-admin-password', ADMIN_PASSWORD)
      .send({ date: '2026-06-15', source: 'Napoleon', target: 'Pizza' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(prisma.dailyRoute.create).toHaveBeenCalledOnce();
  });

  it('deletes existing route before creating new one', async () => {
    vi.mocked(prisma.dailyRoute.findUnique).mockResolvedValue(mockRoute as any);
    vi.mocked(prisma.dailyStats.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.dailyRoute.delete).mockResolvedValue(mockRoute as any);
    vi.mocked(prisma.dailyRoute.create).mockResolvedValue(mockRoute as any);

    await request(app)
      .post('/api/admin/approve-manual')
      .set('x-admin-password', ADMIN_PASSWORD)
      .send({ date: '2026-06-15', source: 'Napoleon', target: 'Pizza' });

    expect(prisma.dailyStats.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.dailyRoute.delete).toHaveBeenCalledOnce();
    expect(prisma.dailyRoute.create).toHaveBeenCalledOnce();
  });
});

describe('POST /api/admin/regenerate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes old candidates and generates new ones', async () => {
    vi.mocked(prisma.dailyCandidate.deleteMany).mockResolvedValue({ count: 5 });
    vi.mocked(generateCandidates).mockResolvedValue([mockCandidate] as any);

    const res = await request(app)
      .post('/api/admin/regenerate')
      .set('x-admin-password', ADMIN_PASSWORD)
      .send({ date: '2026-06-15' });

    expect(res.status).toBe(200);
    expect(prisma.dailyCandidate.deleteMany).toHaveBeenCalledOnce();
    expect(generateCandidates).toHaveBeenCalledWith(new Date('2026-06-15'), 5);
  });
});