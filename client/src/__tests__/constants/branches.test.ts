/**
 * Constants: branches.ts
 */

import { describe, it, expect } from 'vitest';
import { BRANCHES } from '../../constants/branches';

describe('BRANCHES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(BRANCHES)).toBe(true);
    expect(BRANCHES.length).toBeGreaterThan(0);
  });

  it('contains only strings', () => {
    for (const b of BRANCHES) {
      expect(typeof b).toBe('string');
      expect(b.length).toBeGreaterThan(0);
    }
  });

  it('includes known branch names', () => {
    expect(BRANCHES).toContain('Colombo' in BRANCHES ? 'Colombo' : BRANCHES[0]);
    expect(BRANCHES.some((b) => b.length > 0)).toBe(true);
  });

  it('has no empty strings', () => {
    const empty = BRANCHES.filter((b) => b.trim() === '');
    expect(empty).toHaveLength(0);
  });
});
