import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'sdk',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      exclude: [
        'src/index.ts',
        'src/types.ts',
        'src/actions/index.ts',
        'tests/**',
        'vitest.config.ts',
      ],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
})
