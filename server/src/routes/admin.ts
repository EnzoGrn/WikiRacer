import { Router } from 'express';
import {
  approveCandidate,
  generateCandidates,
} from '../services/dailyService';
import { prisma } from '../services/prisma';

const router = Router();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

router.use((req, res, next) => {
  const auth = req.headers['x-admin-password'];
  if (auth !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

router.get('/month', async (req, res) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const [routes, candidates] = await Promise.all([
      prisma.dailyRoute.findMany({
        where: { date: { gte: start, lte: end }, status: 'approved' },
        include: { stats: true },
        orderBy: { date: 'asc' },
      }),
      prisma.dailyCandidate.findMany({
        where: { date: { gte: start, lte: end } },
        orderBy: { date: 'asc' },
      }),
    ]);

    res.json({ routes, candidates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get month data' });
  }
});

router.post('/approve', async (req, res) => {
  try {
    const { candidateId, date } = req.body as { candidateId: number; date: string };
    const route = await approveCandidate(candidateId, new Date(date));
    res.json({ ok: true, route });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/approve-manual', async (req, res) => {
  try {
    const { date, source, target } = req.body as { date: string; source: string; target: string };

    const existing = await prisma.dailyRoute.findUnique({ where: { date: new Date(date) } });
    if (existing) {
      await prisma.dailyStats.deleteMany({ where: { date: new Date(date) } });
      await prisma.dailyRoute.delete({ where: { date: new Date(date) } });
    }

    const route = await prisma.dailyRoute.create({
      data: {
        date: new Date(date),
        source,
        target,
        status: 'approved',
        stats: { create: { completions: 0, totalClicks: 0, totalTime: 0 } },
      },
      include: { stats: true },
    });

    res.json({ ok: true, route });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/regenerate', async (req, res) => {
  try {
    const { date } = req.body as { date: string };
    await prisma.dailyCandidate.deleteMany({ where: { date: new Date(date) } });
    const candidates = await generateCandidates(new Date(date), 5);
    res.json({ ok: true, candidates });
  } catch (err) {
    console.error('Regenerate error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;