const WIKI_API = 'https://fr.wikipedia.org/api/rest_v1/page/html';
const USER_AGENT = 'WikiRacer/1.0 (contact@wikiracer.app)';

export async function fetchWikiPage(title: string): Promise<string> {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(`${WIKI_API}/${encoded}`, {
    headers: { 'Api-User-Agent': USER_AGENT },
  });

  if (res.status === 404) throw new Error(`Page not found: "${title}"`);
  if (!res.ok) throw new Error(`Failed to load page: "${title}" (${res.status})`);

  const html = await res.text();
  return sanitizeWikiHtml(html);
}

export function sanitizeWikiHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const toRemove = [
    '.mw-editsection',
    '.navbox',
    '.sistersitebox',
    '.mw-empty-elt',
    '.ambox',
    '.mbox-small',
    'script',
    'style',
  ];

  toRemove.forEach(selector => {
    doc.querySelectorAll(selector).forEach(el => el.remove());
  });

  const sections = doc.querySelectorAll('section');

  if (sections.length > 0) {
    return Array.from(sections).map(s => s.innerHTML).join('');
  }

  return doc.body.innerHTML;
}

export function isInternalWikiLink(href: string | null): boolean {
  if (!href) return false;
  if (!href.startsWith('./') && !href.startsWith('/wiki/')) return false;
  if (href.includes(':')) return false; // Catégorie:, Fichier:, Special:, etc.
  return true;
}

export function extractTitleFromHref(href: string): string {
  return decodeURIComponent(
    href.replace(/^\.\//, '').replace(/^\/wiki\//, '').split('#')[0]
  );
}

export function normalizeTitle(title: string): string {
  return decodeURIComponent(title)
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
}

export async function validateWikiPage(title: string): Promise<boolean> {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(
    `https://fr.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
    { headers: { 'Api-User-Agent': USER_AGENT } }
  );
  return res.ok;
}

export async function searchWikiPages(query: string): Promise<string[]> {
  if (!query.trim()) return [];

  const encoded = encodeURIComponent(query);
  const res = await fetch(
    `https://fr.wikipedia.org/w/api.php?action=opensearch&search=${encoded}&limit=50&format=json&origin=*`,
    { headers: { 'Api-User-Agent': USER_AGENT } }
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data[1] as string[]; // [query, [suggestions], [descriptions], [urls]]
}