import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/integration/**'],
          passWithNoTests: true,
          coverage: {
            provider: 'v8',
            reporter: process.env.CI ? ['lcov'] : ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/**/index.ts', 'src/abis/**', 'src/types/**'],
            thresholds: {
              lines: 80,
              functions: 80,
              branches: 80,
              statements: 80,
            },
          },
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
        },
      },
    ],
  },
})
