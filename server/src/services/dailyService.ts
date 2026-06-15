import { prisma } from './prisma';
import { randomWikiPage } from './wikipedia';

export async function getTodayDate(): Promise<Date> {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getDailyRoute() {
  const today = await getTodayDate();

  const existing = await prisma.dailyRoute.findUnique({
    where: { date: today },
    include: { stats: true },
  });

  if (existing) return existing;

  return generateDailyRoute();
}

export async function generateDailyRoute() {
  const today = await getTodayDate();

  let source: string;
  let target: string;

  do {
    [source, target] = await Promise.all([
      randomWikiPage(),
      randomWikiPage(),
    ]);
  } while (source === target);

  const route = await prisma.dailyRoute.create({
    data: {
      date: today,
      source,
      target,
      stats: {
        create: {
          completions: 0,
          totalClicks: 0,
          totalTime: 0,
        },
      },
    },
    include: { stats: true },
  });

  console.log(`✅ Daily route generated: ${source} → ${target}`);
  return route;
}

export async function completeDailyRoute(clicks: number, time: number) {
  const today = await getTodayDate();

  await prisma.dailyStats.upsert({
    where: { date: today },
    update: {
      completions: { increment: 1 },
      totalClicks: { increment: clicks },
      totalTime: { increment: time },
    },
    create: {
      date: today,
      completions: 1,
      totalClicks: clicks,
      totalTime: time,
    },
  });
}

export async function getArchives(limit = 30) {
  const today = await getTodayDate();

  return prisma.dailyRoute.findMany({
    where: {
      date: { lt: today },
    },
    orderBy: { date: 'desc' },
    take: limit,
    include: { stats: true },
  });
}