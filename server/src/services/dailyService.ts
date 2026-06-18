import { prisma } from './prisma';
import { randomPopularWikiPage } from './wikipedia';

export async function getTodayDate(): Promise<Date> {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function generateCandidates(date: Date, count = 5) {
  const candidates = [];

  for (let i = 0; i < count; i++) {
    let source: string;
    let target: string;
    do {
      [source, target] = await Promise.all([
        randomPopularWikiPage(),
        randomPopularWikiPage(),
      ]);
    } while (source === target);

    const candidate = await prisma.dailyCandidate.create({
      data: { date, source, target },
    });
    candidates.push(candidate);
  }

  return candidates;
}

export async function approveCandidate(candidateId: number, date: Date) {
  const candidate = await prisma.dailyCandidate.findUnique({
    where: { id: candidateId },
  });
  if (!candidate) throw new Error('Candidate not found');

  await prisma.dailyRoute.deleteMany({ where: { date } });

  return prisma.dailyRoute.create({
    data: {
      date,
      source: candidate.source,
      target: candidate.target,
      status: 'approved',
      stats: { create: { completions: 0, totalClicks: 0, totalTime: 0 } },
    },
    include: { stats: true },
  });
}

export async function getUpcomingCandidates() {
  const today = await getTodayDate();
  const in10Days = new Date(today);
  in10Days.setDate(in10Days.getDate() + 10);

  return prisma.dailyCandidate.findMany({
    where: {
      date: { gte: today, lte: in10Days },
    },
    orderBy: { date: 'asc' },
  });
}

export async function getUpcomingRoutes() {
  const today = await getTodayDate();

  return prisma.dailyRoute.findMany({
    where: {
      date: { gte: today },
      status: 'approved',
    },
    orderBy: { date: 'asc' },
  });
}

export async function getDailyRoute() {
  const today = await getTodayDate();

  const existing = await prisma.dailyRoute.findUnique({
    where: { date: today },
    include: { stats: true },
  });

  if (existing?.status === 'approved') return existing;
  return null;
}

export async function generateDailyRoute() {
  const today = await getTodayDate();

  let source: string;
  let target: string;

  do {
    [source, target] = await Promise.all([
      randomPopularWikiPage(),
      randomPopularWikiPage(),
    ]);
  } while (source === target);

  const route = await prisma.dailyRoute.create({
    data: {
      date: today,
      source,
      target,
      status: 'approved',
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

export async function completeDailyRoute(clicks: number, timeSeconds: number, date?: Date) {
  const targetDate = date ?? await getTodayDate();

  await prisma.dailyStats.upsert({
    where: { date: targetDate },
    update: {
      completions: { increment: 1 },
      totalClicks: { increment: clicks },
      totalTime: { increment: timeSeconds },
    },
    create: {
      date: targetDate,
      completions: 1,
      totalClicks: clicks,
      totalTime: timeSeconds,
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