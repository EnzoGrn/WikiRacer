import fetch from 'node-fetch';
import { prisma } from './prisma';

const USER_AGENT = 'WikiRacer/1.0 (contact@wikiracer.app)';

export async function randomWikiPage(lang = 'fr'): Promise<string> {
  const res = await fetch(
    `https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`,
    { headers: { 'Api-User-Agent': USER_AGENT } }
  );

  if (!res.ok) throw new Error('Failed to fetch random page');

  const data = await res.json() as { title: string };
  return data.title;
}

export async function randomPopularWikiPage(): Promise<string> {
  const now = new Date();
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = String(prevMonth).padStart(2, '0');

  const res = await fetch(
    `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/fr.wikipedia/all-access/${prevYear}/${month}/all-days`,
    { headers: { 'Api-User-Agent': USER_AGENT } }
  );


  if (!res.ok) throw new Error('Failed to fetch popular pages');

  const data = await res.json() as { items: [{ articles: { article: string }[] }] };

  const BLACKLIST = ['Accueil', 'Wikipédia', 'Portail', 'Spécial', 'Page principale'];

  const articles = data.items[0].articles
    .slice(0, 1000)
    .map(a => decodeURIComponent(a.article.replace(/_/g, ' ')))
    .filter(a => !a.includes(':'))
    .filter(a => !BLACKLIST.some(b => a.includes(b)));

  const usedRoutes = await prisma.dailyRoute.findMany({
    select: { source: true, target: true }
  });
  const used = new Set([
    ...usedRoutes.map(r => r.source),
    ...usedRoutes.map(r => r.target),
  ]);

  const available = articles.filter(a => !used.has(a));
  if (available.length < 2) throw new Error('Not enough available pages');

  return available[Math.floor(Math.random() * available.length)];
}