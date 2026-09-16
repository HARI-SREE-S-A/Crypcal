import { describe, it, expect } from 'vitest';
import { generateShortId, isValidShortId, formatShortId } from '@/lib/shortId';

describe('shortId utility', () => {
  it('generates a 6-character short ID matching 3 letters + 3 numbers', () => {
    const id = generateShortId();
    expect(id).toHaveLength(6);
    expect(id).toMatch(/^[A-Z]{3}[0-9]{3}$/);
    expect(isValidShortId(id)).toBe(true);
  });

  it('generates unique random IDs across multiple calls', () => {
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const id = generateShortId();
      expect(isValidShortId(id)).toBe(true);
      set.add(id);
    }
    // High probability of zero collisions in 50 items out of 17.5M
    expect(set.size).toBe(50);
  });

  it('validates correct short ID formats', () => {
    expect(isValidShortId('KPR472')).toBe(true);
    expect(isValidShortId('ABC123')).toBe(true);
    expect(isValidShortId('ZZZ999')).toBe(true);
  });

  it('rejects invalid short ID formats', () => {
    expect(isValidShortId('kpr472')).toBe(false); // lowercase
    expect(isValidShortId('123ABC')).toBe(false); // numbers first
    expect(isValidShortId('KP472')).toBe(false);  // 5 chars
    expect(isValidShortId('KPR4720')).toBe(false); // 7 chars
    expect(isValidShortId('KPR-472')).toBe(false); // dash
    expect(isValidShortId('')).toBe(false);
  });

  it('formats short ID with hyphen for display', () => {
    expect(formatShortId('KPR472')).toBe('KPR-472');
    expect(formatShortId('ABC123')).toBe('ABC-123');
    // If not valid, returns original string
    expect(formatShortId('invalid')).toBe('invalid');
  });
});
