/**
 * Utils: format.ts
 * formatCurrency, formatMonth
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency, formatMonth } from '../../utils/format';

describe('formatCurrency', () => {
  it('formats positive integers', () => {
    expect(formatCurrency(50000)).toBe('Rs. 50,000.00');
  });

  it('formats decimal amounts', () => {
    expect(formatCurrency(1234.5)).toBe('Rs. 1,234.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('Rs. 0.00');
  });

  it('formats large amounts with commas', () => {
    expect(formatCurrency(1000000)).toBe('Rs. 1,000,000.00');
  });

  it('formats amounts with two decimal places', () => {
    expect(formatCurrency(99.99)).toBe('Rs. 99.99');
  });

  it('formats amounts with more than two decimals (rounds)', () => {
    const result = formatCurrency(100.555);
    expect(result).toMatch(/Rs\. 100\.(55|56)/);
  });
});

describe('formatMonth', () => {
  it('formats January', () => {
    expect(formatMonth('2026-01')).toBe('January 2026');
  });

  it('formats April', () => {
    expect(formatMonth('2026-04')).toBe('April 2026');
  });

  it('formats December', () => {
    expect(formatMonth('2025-12')).toBe('December 2025');
  });

  it('formats February', () => {
    expect(formatMonth('2024-02')).toBe('February 2024');
  });

  it('formats September', () => {
    expect(formatMonth('2026-09')).toBe('September 2026');
  });

  it('handles year change correctly', () => {
    expect(formatMonth('2027-01')).toBe('January 2027');
  });
});
