import { Router } from 'express';
import { approveCandidate, generateCandidates, getUpcomingCandidates, getUpcomingRoutes } from '../services/dailyService';
import { prisma } from '../services/prisma';

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

router.use((req, res, next) => {
  console.log('Auth header:', req.headers['x-admin-password']);
  console.log('Expected:', process.env.ADMIN_PASSWORD);
  const auth = req.headers['x-admin-password'];
  if (auth !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

router.get('/candidates', async (req, res) => {
  try {
    const [candidates, approved] = await Promise.all([
      getUpcomingCandidates(),
      getUpcomingRoutes(),
    ]);

    const approvedDates = new Set(approved.map(r => r.date.toISOString().split('T')[0]));

    res.json({ candidates, approved, approvedDates: [...approvedDates] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get candidates' });
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

router.post('/regenerate', async (req, res) => {
  try {
    const { date } = req.body as { date: string };
    const dateObj = new Date(date);

    await prisma.dailyCandidate.deleteMany({ where: { date: dateObj } });

    const candidates = await generateCandidates(dateObj, 5);
    res.json({ ok: true, candidates });
  } catch (err) {
    console.error('Regenerate error:', (err as Error).message);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;