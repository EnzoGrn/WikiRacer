import fetch from 'node-fetch';

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