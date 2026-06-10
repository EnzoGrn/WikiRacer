import { describe, it, expect } from 'vitest';
import { normalizeTitle } from './normalizeTitle';

describe('normalizeTitle', () => {
  it('lowercases the title', () => {
    expect(normalizeTitle('Napoleon')).toBe('napoleon');
  });

  it('replaces underscores with spaces', () => {
    expect(normalizeTitle('États_Unis')).toBe('états unis');
  });

  it('trims whitespace', () => {
    expect(normalizeTitle('  Pizza  ')).toBe('pizza');
  });

  it('decodes encoded characters', () => {
    expect(normalizeTitle('%C3%89tats-Unis')).toBe('états-unis');
  });

  it('matches same title with different formatting', () => {
    expect(normalizeTitle('Pizza')).toBe(normalizeTitle('pizza'));
    expect(normalizeTitle('États_Unis')).toBe(normalizeTitle('États Unis'));
  });
});