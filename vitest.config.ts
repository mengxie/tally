import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**', 'apps/*/src/**'],
      exclude: ['apps/api/src/main.ts', 'apps/web/src/main.tsx'],
      reporter: ['text', 'lcov'],
    },
  },
});
