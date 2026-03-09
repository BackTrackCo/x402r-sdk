import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'sdk',
    include: ['tests/**/*.test.ts'],
    typecheck: {
      include: ['tests/**/*.test-d.ts'],
    },
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
    },
  },
})
