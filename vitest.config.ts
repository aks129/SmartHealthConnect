import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {
      JWT_SECRET: 'test-secret-key-that-is-at-least-32-characters-long-for-testing',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts'],
      exclude: [
        'server/index.ts',
        '**/*.d.ts',
        '**/node_modules/**',
      ],
      // Thresholds intentionally omitted: the codebase only has tests for
      // auth, data-connections-routes, flexpa-client, health-skillz-client,
      // and mcp-guardrails. The rest of server/ is 0% covered, so a global
      // gate would always red CI. Coverage is still reported and uploaded
      // to Codecov — raise a threshold here once aggregate coverage grows.
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
