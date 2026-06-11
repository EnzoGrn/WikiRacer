import { describe, it, expect, vi } from 'vitest';
import { isInternalWikiLink, extractTitleFromHref, normalizeTitle, sanitizeWikiHtml, fetchWikiPage } from './wikipedia';

describe('isInternalWikiLink', () => {
  it('accepts internal ./ links', () => {
    expect(isInternalWikiLink('./Napoleon')).toBe(true);
  });

  it('accepts /wiki/ links', () => {
    expect(isInternalWikiLink('/wiki/Napoleon')).toBe(true);
  });

  it('rejects category links', () => {
    expect(isInternalWikiLink('./Catégorie:Histoire')).toBe(false);
  });

  it('rejects file links', () => {
    expect(isInternalWikiLink('./Fichier:photo.jpg')).toBe(false);
  });

  it('rejects null', () => {
    expect(isInternalWikiLink(null)).toBe(false);
  });

  it('rejects external links', () => {
    expect(isInternalWikiLink('https://google.com')).toBe(false);
  });
});

describe('extractTitleFromHref', () => {
  it('extracts title from ./ link', () => {
    expect(extractTitleFromHref('./Napoleon')).toBe('Napoleon');
  });

  it('extracts title from /wiki/ link', () => {
    expect(extractTitleFromHref('/wiki/Napoleon')).toBe('Napoleon');
  });

  it('strips anchors', () => {
    expect(extractTitleFromHref('./Napoleon#Jeunesse')).toBe('Napoleon');
  });

  it('decodes encoded characters', () => {
    expect(extractTitleFromHref('./États-Unis')).toBe('États-Unis');
  });
});

describe('normalizeTitle', () => {
  it('lowercases', () => {
    expect(normalizeTitle('Napoleon')).toBe('napoleon');
  });

  it('replaces underscores with spaces', () => {
    expect(normalizeTitle('États_Unis')).toBe('états unis');
  });

  it('trims whitespace', () => {
    expect(normalizeTitle('  Pizza  ')).toBe('pizza');
  });

  it('matches encoded and decoded titles', () => {
    expect(normalizeTitle('États-Unis')).toBe(normalizeTitle('États-Unis'));
  });
});

describe('sanitizeWikiHtml', () => {
  it('removes script tags', () => {
    const html = '<div><script>alert("xss")</script><p>Content</p></div>';
    const result = sanitizeWikiHtml(html);
    expect(result).not.toContain('<script>');
    expect(result).toContain('Content');
  });

  it('removes mw-editsection links', () => {
    const html = '<section><p>Text</p><span class="mw-editsection">[edit]</span></section>';
    const result = sanitizeWikiHtml(html);
    expect(result).not.toContain('mw-editsection');
  });

  it('keeps paragraph content', () => {
    const html = '<section><p>Napoleon was an emperor.</p></section>';
    const result = sanitizeWikiHtml(html);
    expect(result).toContain('Napoleon was an emperor.');
  });
});

describe('fetchWikiPage', () => {
  it('throws a specific message on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchWikiPage('UnknownPage')).rejects.toThrow('Page not found: "UnknownPage"');
  });

  it('throws a generic message on other errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(fetchWikiPage('Napoleon')).rejects.toThrow('Failed to load page: "Napoleon" (500)');
  });

  it('returns sanitized html on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<section><p>Napoleon content</p></section>'),
    });

    const html = await fetchWikiPage('Napoleon');
    expect(html).toContain('Napoleon content');
  });
});