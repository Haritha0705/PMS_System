import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Suppress noisy console.error in tests ────────────────────
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    // Suppress React act() warnings and network errors in tests
    if (
      msg.includes('Warning: An update to') ||
      msg.includes('act(') ||
      msg.includes('Network Error')
    ) return;
    originalError(...args);
  };
});
