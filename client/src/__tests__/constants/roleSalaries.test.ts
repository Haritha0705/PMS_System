/**
 * Constants: roleSalaries.ts
 * ROLE_SALARIES, ROLES, ROLE_NAME_TO_CODE
 */

import { describe, it, expect } from 'vitest';
import { ROLE_SALARIES, ROLES, ROLE_NAME_TO_CODE, ROLE_ALLOWANCES } from '../../constants/roleSalaries';

describe('ROLE_SALARIES', () => {
  it('is a non-empty object', () => {
    expect(typeof ROLE_SALARIES).toBe('object');
    expect(Object.keys(ROLE_SALARIES).length).toBeGreaterThan(0);
  });

  it('all salary values are positive numbers', () => {
    for (const [, salary] of Object.entries(ROLE_SALARIES)) {
      expect(typeof salary).toBe('number');
      expect(salary).toBeGreaterThan(0);
    }
  });

  it('contains Category A (sales) roles', () => {
    expect(ROLE_SALARIES['Project General Manager']).toBe(700_000);
    expect(ROLE_SALARIES['Project Assistant General Manager']).toBe(625_000);
    expect(ROLE_SALARIES['Project Provincial Head']).toBe(550_000);
    expect(ROLE_SALARIES['Project Regional Manager']).toBe(350_000);
    expect(ROLE_SALARIES['Project Manager']).toBe(150_000);
  });

  it('no longer contains the old sales roles', () => {
    for (const old of ['General Manager', 'Assistant General Manager', 'Provincial Head', 'Deputy Provincial Head',
                       'Senior Regional Manager', 'Regional Manager', 'Branch Manager', 'Business Development Executive']) {
      expect(ROLE_SALARIES).not.toHaveProperty(old);
    }
  });

  it('contains Category B (non-target) roles', () => {
    expect(ROLE_SALARIES['Admin Manager']).toBe(65_000);
    expect(ROLE_SALARIES['Land development 1']).toBe(200_000);
    expect(ROLE_SALARIES['Land development 2']).toBe(150_000);
    expect(ROLE_SALARIES['Micro Finance Unit Head']).toBeUndefined();
    expect(ROLE_SALARIES['supervisor land 1']).toBe(85_000);
    expect(ROLE_SALARIES['supervisor land 2']).toBe(40_000);
    expect(ROLE_SALARIES['watcher land']).toBe(45_000);
    expect(ROLE_SALARIES['Gemologist']).toBe(200_000);
  });

  it('no longer contains removed Category B roles', () => {
    for (const old of ['Manager Admin', 'HR & Finance Head', 'CCI (Collections/Call Center)', 'Legal Officer']) {
      expect(ROLE_SALARIES).not.toHaveProperty(old);
    }
  });

  it('Project General Manager has highest salary', () => {
    const maxSalary = Math.max(...Object.values(ROLE_SALARIES));
    expect(ROLE_SALARIES['Project General Manager']).toBe(maxSalary);
  });
});

describe('ROLES', () => {
  it('is a sorted array of role names', () => {
    expect(Array.isArray(ROLES)).toBe(true);
    expect(ROLES.length).toBe(Object.keys(ROLE_SALARIES).length);
  });

  it('is sorted alphabetically', () => {
    const sorted = [...ROLES].sort();
    expect(ROLES).toEqual(sorted);
  });

  it('contains all keys from ROLE_SALARIES', () => {
    for (const role of Object.keys(ROLE_SALARIES)) {
      expect(ROLES).toContain(role);
    }
  });
});

describe('ROLE_NAME_TO_CODE', () => {
  it('is a non-empty object', () => {
    expect(typeof ROLE_NAME_TO_CODE).toBe('object');
    expect(Object.keys(ROLE_NAME_TO_CODE).length).toBeGreaterThan(0);
  });

  it.each([
    ['Project General Manager', 'PGM'],
    ['Project Assistant General Manager', 'PAGM'],
    ['Project Provincial Head', 'PPH'],
    ['Project Regional Manager', 'PRM'],
    ['Project Manager', 'PM'],
  ])('maps %s → %s', (name, code) => {
    expect(ROLE_NAME_TO_CODE[name]).toBe(code);
  });

  it('maps Admin Manager → ADMIN_MANAGER', () => {
    expect(ROLE_NAME_TO_CODE['Admin Manager']).toBe('ADMIN_MANAGER');
  });

  it('all codes are non-empty strings', () => {
    for (const code of Object.values(ROLE_NAME_TO_CODE)) {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    }
  });
});

describe('Coordinator', () => {
  it('is a non-target role with a 35,000 basic and no allowance', () => {
    expect(ROLE_NAME_TO_CODE['Coordinator']).toBe('COORD');
    expect(ROLE_SALARIES['Coordinator']).toBe(35_000);
    expect(ROLE_ALLOWANCES['Coordinator']).toBe(0);
  });
});

describe('ROLE_ALLOWANCES', () => {
  it('basic + allowance matches the official Category B totals', () => {
    const totals: Record<string, number> = {
      'Senior Executive HR': 57_500, 'Junior Executive HR': 50_000, 'Admin Manager': 80_000,
      'Legal Manager': 75_000, 'Executive Assistant HR': 40_000, 'Executive Assistant Land': 40_000,
      'Executive Gem 1': 40_000, 'Executive Gem 2': 35_000, 'Executive Media': 40_000,
      'Cabana Project Manager': 150_000, 'Network & IT Manager': 100_000, 'Head of Micro Finance': 130_000,
      'Executive Micro Finance 1': 40_000, 'Executive Micro Finance 2': 40_000,
      'Gemologist': 380_000, 'Head Of Sharia Project': 500_000, 'Executive Assistant Finance': 35_000,
      'Coordinator': 35_000, 'Land development 1': 200_000, 'Land development 2': 150_000,
      'supervisor land 1': 85_000, 'supervisor land 2': 40_000, 'watcher land': 45_000,
    };
    expect(Object.keys(ROLE_ALLOWANCES).sort()).toEqual(Object.keys(totals).sort());
    for (const [role, total] of Object.entries(totals)) {
      expect(ROLE_SALARIES[role] + ROLE_ALLOWANCES[role]).toBe(total);
    }
  });

  it('no sales role keeps the old "Prestige" name', () => {
    expect(ROLES.filter((r) => r.startsWith('Prestige'))).toEqual([]);
  });

  it('does not pre-fill allowances for sales roles', () => {
    expect(ROLE_ALLOWANCES).not.toHaveProperty('Project General Manager');
  });
});
