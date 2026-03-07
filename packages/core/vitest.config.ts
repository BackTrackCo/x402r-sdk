import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: process.env.CI ? ['lcov'] : ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/index.ts',
        'src/abis/**',
        'src/types/**',
        'tests/**',
        // Write-only wrappers — thin writeContract forwarding with account guards
        'src/operations/*-writes.ts',
        // Pure readContract passthrough — no mapping logic
        'src/operations/freeze-reads.ts',
        'src/operations/refund-budget-reads.ts',
        // Typed wrappers — each function is a 1-line delegation to factory-helpers.ts (100% covered)
        'src/deploy/factories.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
    projects: [
      {
        test: {
          name: 'core',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/integration/**'],
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: 'core:fork',
          include: ['tests/integration/**/*.fork.test.ts'],
          globalSetup: ['tests/setup/globalSetup.ts'],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          passWithNoTests: true,
          // Fork RPC (Alchemy) can be flaky — retry individual tests instead of restarting the suite
          retry: 3,
        },
      },
    ],
  },
})
