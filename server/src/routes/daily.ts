import { Router } from 'express';
import { completeDailyRoute, getArchives, getDailyRoute } from '../services/dailyService';
import { prisma } from '../services/prisma';

const router = Router();

function getDifficultyLabel(avgClicks: number | null): { label: string; color: string } {
  if (avgClicks === null) return { label: 'Unknown', color: 'text-gray-400' };
  if (avgClicks <= 5) return { label: 'Easy', color: 'text-green-500' };
  if (avgClicks <= 10) return { label: 'Medium', color: 'text-yellow-500' };
  if (avgClicks <= 20) return { label: 'Hard', color: 'text-orange-500' };
  return { label: 'Expert', color: 'text-red-500' };
}

router.get('/', async (req, res) => {
  try {
    const route = await getDailyRoute();
    if (!route) return res.status(404).json({ error: 'No approved route for today' });

    const avgClicks = route.stats && route.stats.completions > 0
      ? Math.round(route.stats.totalClicks / route.stats.completions)
      : null;

    const difficulty = getDifficultyLabel(avgClicks);

    res.json({
      date: route.date,
      source: route.source,
      target: route.target,
      stats: {
        completions: route.stats?.completions ?? 0,
        avgClicks,
        avgTime: route.stats && route.stats.completions > 0
          ? Math.round(route.stats.totalTime / route.stats.completions)
          : null,
        difficulty,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get daily route' });
  }
});

router.post('/complete', async (req, res) => {
  try {
    const { clicks, timeSeconds } = req.body as { clicks: number; timeSeconds: number };
    if (!clicks || !timeSeconds) return res.status(400).json({ error: 'clicks and timeSeconds are required' });

    await completeDailyRoute(clicks, timeSeconds);
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

router.get('/archive/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const route = await prisma.dailyRoute.findUnique({
      where: { date: new Date(date) },
      include: { stats: true },
    });

    if (!route) return res.status(404).json({ error: 'Route not found' });

    const avgClicks = route.stats && route.stats.completions > 0
      ? Math.round(route.stats.totalClicks / route.stats.completions)
      : null;

    res.json({
      date: route.date,
      source: route.source,
      target: route.target,
      stats: {
        completions: route.stats?.completions ?? 0,
        avgClicks,
        avgTime: route.stats && route.stats.completions > 0
          ? Math.round(route.stats.totalTime / route.stats.completions)
          : null,
        difficulty: getDifficultyLabel(avgClicks),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get archive route' });
  }
});

export default router;