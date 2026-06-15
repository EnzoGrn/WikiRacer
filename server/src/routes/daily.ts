import { Router } from 'express';
import { completeDailyRoute, getArchives, getDailyRoute } from '../services/dailyService';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const route = await getDailyRoute();

    if (!route) {
      return res.status(404).json({ error: 'No approved route for today' });
    }

    res.json({
      date: route.date,
      source: route.source,
      target: route.target,
      stats: route.stats ? {
        completions: route.stats.completions,
        avgClicks: route.stats.completions > 0
          ? Math.round(route.stats.totalClicks / route.stats.completions)
          : null,
        avgTime: route.stats.completions > 0
          ? Math.round(route.stats.totalTime / route.stats.completions)
          : null,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get daily route' });
  }
});

router.post('/complete', async (req, res) => {
  try {
    const { clicks, time } = req.body as { clicks: number; time: number };
    if (!clicks || !time) return res.status(400).json({ error: 'clicks and time are required' });

    await completeDailyRoute(clicks, time);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete daily route' });
  }
});

router.get('/archive', async (req, res) => {
  try {
    const routes = await getArchives();
    res.json(routes.map(r => ({
      date: r.date,
      source: r.source,
      target: r.target,
      stats: r.stats ? {
        completions: r.stats.completions,
        avgClicks: r.stats.completions > 0
          ? Math.round(r.stats.totalClicks / r.stats.completions)
          : null,
        avgTime: r.stats.completions > 0
          ? Math.round(r.stats.totalTime / r.stats.completions)
          : null,
      } : null,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to get archives' });
  }
});

export default router;