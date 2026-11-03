import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/modules/**/*.ts', 'src/services/**/*.ts'],
      exclude: ['src/__tests__/**'],
    },
    // Run test files serially to avoid shared mock state conflicts
    pool: 'forks',
    singleFork: true,
    testTimeout: 15000,
  },
});