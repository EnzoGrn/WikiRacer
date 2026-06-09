import { describe, it, expect } from 'vitest';
import { generateLobbyCode } from './generateCode';

describe('generateLobbyCode', () => {
  it('generates a code of 6 characters by default', () => {
    const code = generateLobbyCode();
    expect(code).toHaveLength(6);
  });

  it('generates a code of the requested length', () => {
    const code = generateLobbyCode(8);
    expect(code).toHaveLength(8);
  });

  it('contains only valid characters', () => {
    const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const code = generateLobbyCode();
    for (const char of code) {
      expect(CHARSET).toContain(char);
    }
  });

  it('generates different codes', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateLobbyCode()));
    expect(codes.size).toBeGreaterThan(90);
  });
});